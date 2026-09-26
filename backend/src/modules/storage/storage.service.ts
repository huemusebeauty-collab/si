import { BadGatewayException, BadRequestException, Injectable, InternalServerErrorException, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand, ListObjectsV2Command, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import { mkdtemp, readFile, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { spawn } from "child_process";
import ffmpegPath from "ffmpeg-static";
import sharp from "sharp";
import { SettingsService } from "@/admin/settings/settings.service";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ProductEntity } from "@/modules/products/entities/product.entity";

const SIGNED_URL_TTL_SECONDS = 15 * 60;
const MAX_IMAGE_INPUT_BYTES = 20 * 1024 * 1024;
const MAX_VIDEO_INPUT_BYTES = 25 * 1024 * 1024;
const MAX_IMAGE_DIMENSION_PX = 2400;
const MAX_VIDEO_OUTPUT_BYTES = 20 * 1024 * 1024;
const MAX_VIDEO_WIDTH_PX = 1080;

function runFfmpeg(input: string, output: string): Promise<void> {
  const executable = ffmpegPath;
  if (!executable) throw new Error("FFmpeg binary is unavailable.");

  return new Promise((resolve, reject) => {
    const child = spawn(executable, [
      "-hide_banner", "-loglevel", "error", "-y", "-i", input,
      "-map", "0:v:0", "-map", "0:a:0?", "-c:v", "libx264",
      "-preset", "veryfast", "-crf", "28", "-vf", "scale='min(1080,iw)':-2",
      "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart",
      "-pix_fmt", "yuv420p", output,
    ], { stdio: ["ignore", "ignore", "pipe"] });

    let stderr = "";
    child.stderr.on("data", (chunk: Buffer) => { stderr += chunk.toString(); });
    child.once("error", (error: Error) => reject(error));
    child.once("close", (code: number | null) => {
      if (code === 0) resolve();
      else reject(new Error(stderr.trim() || "FFmpeg exited with code " + (code ?? "unknown")));
    });
  });
}

function sniffMediaContentType(body: Buffer): string | undefined {
  if (body.length >= 3 && body[0] === 0xff && body[1] === 0xd8 && body[2] === 0xff) return "image/jpeg";
  if (body.length >= 8 && body[0] === 0x89 && body[1] === 0x50 && body[2] === 0x4e && body[3] === 0x47 && body[4] === 0x0d && body[5] === 0x0a && body[6] === 0x1a && body[7] === 0x0a) return "image/png";
  if (body.length >= 6 && body.subarray(0, 6).toString("ascii") === "GIF89a") return "image/gif";
  if (body.length >= 6 && body.subarray(0, 6).toString("ascii") === "GIF87a") return "image/gif";
  if (body.length >= 12 && body.subarray(0, 4).toString("ascii") === "RIFF" && body.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  if (body.length >= 12 && body.subarray(4, 8).toString("ascii") === "ftyp") {
    const brand = body.subarray(8, 12).toString("ascii");
    if (brand === "avif" || brand === "avis") return "image/avif";
    return "video/mp4";
  }
  if (body.length >= 4 && body.subarray(0, 4).toString("hex") === "1a45dfa3") return "video/webm";
  if (body.length >= 4 && body.subarray(0, 4).toString("ascii") === "OggS") return "video/ogg";
  return undefined;
}

export type UploadCategory = "product-media" | "cms-assets" | "review-media";

@Injectable()
export class StorageService {
  private readonly client: S3Client;
  private readonly logger = new Logger(StorageService.name);
  private readonly bucket: string;
  private readonly publicBaseUrl?: string;

  constructor(
    private readonly config: ConfigService,
    private readonly settings: SettingsService,
    @InjectRepository(ProductEntity) private readonly productRepository: Repository<ProductEntity>,
  ) {
    this.bucket = this.config.get<string>("storage.bucket")!;
    this.publicBaseUrl = this.config.get<string>("storage.publicBaseUrl");
    this.client = new S3Client({
      endpoint: this.config.get<string>("storage.endpoint"),
      region: "us-east-1",
      forcePathStyle: true,
      credentials: {
        accessKeyId: this.config.get<string>("storage.accessKey")!,
        secretAccessKey: this.config.get<string>("storage.secretKey")!,
      },
    });
  }

  async validate(file: { mimetype: string; size: number }): Promise<void> {
    const { allowedMimeTypes, maxUploadSizeBytes } = await this.settings.getMediaSettings();
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(`Unsupported file type: ${file.mimetype}. Allowed: ${allowedMimeTypes.join(", ")}`);
    }
    const isVideo = file.mimetype.startsWith("video/");
    const effectiveLimit = isVideo ? Math.min(maxUploadSizeBytes, MAX_VIDEO_INPUT_BYTES) : Math.min(maxUploadSizeBytes, MAX_IMAGE_INPUT_BYTES);
    if (file.size > effectiveLimit) {
      throw new BadRequestException(`${isVideo ? "Video" : "Image"} exceeds the ${Math.round(effectiveLimit / 1024 / 1024)}MB upload limit.`);
    }
  }

  async upload(
    file: { buffer: Buffer; mimetype: string; size: number; originalname: string },
    category: UploadCategory = "product-media",
  ): Promise<{ key: string; url: string; originalName: string; contentType: string; originalSize: number; storedSize: number; savedBytes: number; savedPercent: number }> {
    await this.validate(file);

    let body = file.buffer;
    let contentType = file.mimetype;
    let originalName = file.originalname;

    if (file.mimetype.startsWith("image/")) {
      const metadata = await sharp(file.buffer, { failOn: "error" }).metadata();
      if (!metadata.width || !metadata.height) throw new BadRequestException("Image dimensions could not be detected.");
      if (metadata.width < 400 || metadata.height < 400) throw new BadRequestException("Image must be at least 400x400 pixels.");
      const optimizedImage = await sharp(file.buffer, { failOn: "error" })
        .rotate()
        .resize({ width: MAX_IMAGE_DIMENSION_PX, height: MAX_IMAGE_DIMENSION_PX, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 82, effort: 4 })
        .toBuffer();

      // Never make an upload larger just because it was converted to WebP.
      // If WebP is not smaller, preserve the original bytes and MIME type.
      if (optimizedImage.length < file.buffer.length) {
        body = optimizedImage;
        contentType = "image/webp";
        originalName = file.originalname.replace(/\.(jpe?g|png|webp|gif|avif)$/i, "") + ".webp";
      }
    } else if (file.mimetype === "video/mp4") {
      if (file.buffer.length < 12 || file.buffer.subarray(4, 8).toString("ascii") !== "ftyp") {
        throw new BadRequestException("Invalid MP4 file.");
      }

      const workDir = await mkdtemp(join(tmpdir(), "silku-media-"));
      const inputPath = join(workDir, "input.mp4");
      const outputPath = join(workDir, "optimized.mp4");
      try {
        // Small/already-compressed MP4s do not need a lossy transcode.
        // Keeping them byte-for-byte avoids unnecessary enlargement and
        // preserves the original quality when there is little to gain.
        if (file.buffer.length <= 2 * 1024 * 1024) {
          body = file.buffer;
        } else {
          await writeFile(inputPath, file.buffer);
          await runFfmpeg(inputPath, outputPath);
          const optimizedBody = await readFile(outputPath);

          if (!optimizedBody.length) {
            throw new BadRequestException("MP4 optimization produced an empty file.");
          }

          // Only replace the source when the optimized delivery file is
          // strictly smaller. Otherwise retain the valid original.
          if (optimizedBody.length <= MAX_VIDEO_OUTPUT_BYTES && optimizedBody.length < file.buffer.length) {
            body = optimizedBody;
          } else if (file.buffer.length <= MAX_VIDEO_OUTPUT_BYTES) {
            body = file.buffer;
          } else {
            throw new BadRequestException("MP4 exceeds the 20MB delivery limit after optimization.");
          }
        }

        contentType = "video/mp4";
        originalName = file.originalname.replace(/\.mp4$/i, "") + ".mp4";
      } catch (error) {
        if (error instanceof BadRequestException) throw error;
        this.logger.error({ error: error instanceof Error ? error.message : "UnknownError" }, "MP4 optimization failed");
        throw new BadRequestException("MP4 optimization failed. Please upload a compatible MP4.");
      } finally {
        await rm(workDir, { recursive: true, force: true });
      }
    }

    const key = category + "/" + randomUUID();
    const originalSize = file.buffer.length;
    const storedSize = body.length;
    const savedBytes = Math.max(0, originalSize - storedSize);
    const savedPercent = originalSize > 0 ? Math.round((savedBytes / originalSize) * 1000) / 10 : 0;

    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      ContentLength: body.length,
      Metadata: { originalName: file.originalname.slice(0, 512), originalSize: String(originalSize), optimized: file.mimetype.startsWith("image/") || file.mimetype === "video/mp4" ? "true" : "false" },
    }));

    if (this.publicBaseUrl) {
      const baseUrl = this.publicBaseUrl.replace(/\/+$/, "");
      return { key, url: baseUrl + "/" + key, originalName, contentType, originalSize, storedSize, savedBytes, savedPercent };
    }

    if (this.config.get<string>("env") === "production") {
      throw new InternalServerErrorException("Storage public base URL is not configured.");
    }

    return {
      key,
      url: this.config.get<string>("storage.endpoint") + "/" + this.bucket + "/" + key,
      originalName,
      contentType,
      originalSize,
      storedSize,
      savedBytes,
      savedPercent,
    };
  }

  async listMedia(category: UploadCategory = "product-media"): Promise<Array<{
    key: string;
    urlKey: string;
    type: "image" | "video";
    contentType: string;
    size: number;
    lastModified: string | null;
    originalSize: number | null;
    savedBytes: number | null;
    savedPercent: number | null;
  }>> {
    const prefix = `${category}/`;
    const listed: Array<{ key: string; size: number; lastModified: Date | undefined }> = [];
    let continuationToken: string | undefined;

    do {
      const result = await this.client.send(new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
        MaxKeys: 100,
        ContinuationToken: continuationToken,
      }));
      for (const item of result.Contents ?? []) {
        if (!item.Key || item.Key === prefix) continue;
        listed.push({ key: item.Key, size: item.Size ?? 0, lastModified: item.LastModified });
      }
      continuationToken = result.IsTruncated ? result.NextContinuationToken : undefined;
    } while (continuationToken);

    const media = await Promise.all(listed.map(async (item) => {
      try {
        const head = await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: item.key }));
        const contentType = head.ContentType ?? "application/octet-stream";
        const type = contentType.startsWith("video/") ? "video" as const : "image" as const;
        const originalSizeValue = Number(head.Metadata?.originalsize ?? NaN);
        const originalSize = Number.isFinite(originalSizeValue) && originalSizeValue >= 0 ? originalSizeValue : null;
        const storedSize = head.ContentLength ?? item.size;
        const savedBytes = originalSize === null ? null : Math.max(0, originalSize - storedSize);
        const savedPercent = originalSize === null || originalSize === 0 ? (originalSize === 0 ? 0 : null) : Math.round((savedBytes! / originalSize) * 1000) / 10;
        return {
          key: item.key,
          urlKey: item.key.slice(prefix.length),
          type,
          contentType,
          size: storedSize,
          lastModified: (head.LastModified ?? item.lastModified)?.toISOString() ?? null,
          originalSize,
          savedBytes,
          savedPercent,
        };
      } catch (error) {
        const name = error instanceof Error ? error.name : "UnknownError";
        this.logger.warn({ key: item.key, errorName: name }, "Unable to read media metadata");
        return null;
      }
    }));

    return media.filter((item): item is NonNullable<typeof item> => item !== null).sort((a, b) => (b.lastModified ?? "").localeCompare(a.lastModified ?? ""));
  }

  async getObject(key: string, range?: string): Promise<{
    body: Buffer;
    contentType: string;
    contentLength?: number;
    contentRange?: string;
    statusCode: number;
  }> {
    try {
      const result = await this.client.send(new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ...(range ? { Range: range } : {}),
      }));
      if (!result.Body) throw new NotFoundException("Media object not found.");
      const bytes = await result.Body.transformToByteArray();
      const body = Buffer.from(bytes);
      const detectedContentType = sniffMediaContentType(body);
      const contentType = detectedContentType ?? result.ContentType ?? "application/octet-stream";
      this.logger.log({
        key,
        requestedRange: range ?? null,
        responseContentType: contentType,
        providerContentType: result.ContentType ?? null,
        bodyLength: body.length,
        contentRange: result.ContentRange ?? null,
      }, "Storage media response prepared");
      return {
        body,
        contentType,
        contentLength: body.length,
        contentRange: result.ContentRange,
        statusCode: range ? 206 : 200,
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      const status = (error as { $metadata?: { httpStatusCode?: number } })?.$metadata?.httpStatusCode;
      const name = error instanceof Error ? error.name : "UnknownError";
      this.logger.error({ key, range: Boolean(range), errorName: name, status }, "Storage media read failed");
      if (status === 404 || name === "NoSuchKey" || name === "NotFound") throw new NotFoundException("Media object not found.");
      if (status === 416) throw new BadRequestException("Requested media range is not satisfiable.");
      throw new BadGatewayException("Media storage is unavailable.");
    }
  }

  async reoptimizeMedia(category: UploadCategory = "product-media"): Promise<{
    category: UploadCategory;
    scanned: number;
    optimized: number;
    unchanged: number;
    failed: number;
    savedBytes: number;
    results: Array<{ key: string; type: "image" | "video"; beforeBytes: number; afterBytes: number; savedBytes: number; savedPercent: number; action: "optimized" | "unchanged" | "failed"; error?: string }>;
  }> {
    const prefix = category + "/";
    const listed: Array<{ key: string; size: number }> = [];
    let continuationToken: string | undefined;

    do {
      const result = await this.client.send(new ListObjectsV2Command({ Bucket: this.bucket, Prefix: prefix, MaxKeys: 100, ContinuationToken: continuationToken }));
      for (const item of result.Contents ?? []) {
        if (item.Key && item.Key !== prefix) listed.push({ key: item.Key, size: item.Size ?? 0 });
      }
      continuationToken = result.IsTruncated ? result.NextContinuationToken : undefined;
    } while (continuationToken);

    const results: Array<{ key: string; type: "image" | "video"; beforeBytes: number; afterBytes: number; savedBytes: number; savedPercent: number; action: "optimized" | "unchanged" | "failed"; error?: string }> = [];

    for (const item of listed) {
      try {
        const head = await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: item.key }));
        const contentType = head.ContentType ?? "application/octet-stream";
        const type = contentType.startsWith("video/") ? "video" as const : "image" as const;
        if (!contentType.startsWith("image/") && contentType !== "video/mp4") {
          results.push({ key: item.key, type, beforeBytes: item.size, afterBytes: item.size, savedBytes: 0, savedPercent: 0, action: "unchanged" });
          continue;
        }
        const object = await this.getObject(item.key);
        const beforeBytes = object.body.length;
        let optimizedBody = object.body;
        let optimizedType = contentType;

        if (contentType.startsWith("image/")) {
          const metadata = await sharp(object.body, { failOn: "error" }).metadata();
          if (!metadata.width || !metadata.height || metadata.width < 400 || metadata.height < 400) {
            results.push({ key: item.key, type, beforeBytes, afterBytes: beforeBytes, savedBytes: 0, savedPercent: 0, action: "unchanged" });
            continue;
          }
          optimizedBody = await sharp(object.body, { failOn: "error" }).rotate().resize({ width: MAX_IMAGE_DIMENSION_PX, height: MAX_IMAGE_DIMENSION_PX, fit: "inside", withoutEnlargement: true }).webp({ quality: 82, effort: 4 }).toBuffer();
          optimizedType = "image/webp";
        } else {
          if (beforeBytes <= 2 * 1024 * 1024) {
            results.push({ key: item.key, type, beforeBytes, afterBytes: beforeBytes, savedBytes: 0, savedPercent: 0, action: "unchanged" });
            continue;
          }
          const workDir = await mkdtemp(join(tmpdir(), "silku-media-reopt-"));
          const inputPath = join(workDir, "input.mp4");
          const outputPath = join(workDir, "optimized.mp4");
          try {
            await writeFile(inputPath, object.body);
            await runFfmpeg(inputPath, outputPath);
            optimizedBody = await readFile(outputPath);
          } finally {
            await rm(workDir, { recursive: true, force: true });
          }
          if (!optimizedBody.length || optimizedBody.length >= beforeBytes || optimizedBody.length > MAX_VIDEO_OUTPUT_BYTES) {
            results.push({ key: item.key, type, beforeBytes, afterBytes: beforeBytes, savedBytes: 0, savedPercent: 0, action: "unchanged" });
            continue;
          }
          optimizedType = "video/mp4";
        }

        if (optimizedBody.length >= beforeBytes) {
          results.push({ key: item.key, type, beforeBytes, afterBytes: beforeBytes, savedBytes: 0, savedPercent: 0, action: "unchanged" });
          continue;
        }
        const savedBytes = beforeBytes - optimizedBody.length;
        const savedPercent = Math.round((savedBytes / beforeBytes) * 1000) / 10;
        const previousOriginalSize = Number(head.Metadata?.originalsize ?? NaN);
        const originalSize = Number.isFinite(previousOriginalSize) && previousOriginalSize >= beforeBytes ? previousOriginalSize : beforeBytes;
        await this.client.send(new PutObjectCommand({
          Bucket: this.bucket, Key: item.key, Body: optimizedBody, ContentType: optimizedType, ContentLength: optimizedBody.length,
          Metadata: { ...(head.Metadata?.originalname ? { originalName: head.Metadata.originalname } : {}), originalSize: String(originalSize), optimized: "true" },
        }));
        results.push({ key: item.key, type, beforeBytes, afterBytes: optimizedBody.length, savedBytes, savedPercent, action: "optimized" });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        this.logger.error({ key: item.key, error: message }, "Media re-optimization failed");
        results.push({ key: item.key, type: "image", beforeBytes: item.size, afterBytes: item.size, savedBytes: 0, savedPercent: 0, action: "failed", error: "Optimization failed." });
      }
    }

    const optimized = results.filter((item) => item.action === "optimized");
    const unchanged = results.filter((item) => item.action === "unchanged");
    const failed = results.filter((item) => item.action === "failed");
    return { category, scanned: results.length, optimized: optimized.length, unchanged: unchanged.length, failed: failed.length, savedBytes: optimized.reduce((total, item) => total + item.savedBytes, 0), results };
  }
  async getSignedReadUrl(key: string): Promise<{ url: string; expiresAt: string }> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    const url = await getSignedUrl(this.client, command, { expiresIn: SIGNED_URL_TTL_SECONDS });
    return { url, expiresAt: new Date(Date.now() + SIGNED_URL_TTL_SECONDS * 1000).toISOString() };
  }

  async getMediaReferences(key: string): Promise<{ used: boolean; products: Array<{ id: string; name: string; slug: string }> }> {
    const objectId = key.split("/").pop() ?? key;
    const normalizedId = objectId.replace(/\.[a-z0-9]{1,12}$/i, "");
    const rows = await this.productRepository
      .createQueryBuilder("product")
      .select("product.id", "id")
      .addSelect("product.name", "name")
      .addSelect("product.slug", "slug")
      .addSelect('product."mediaUrls"', "mediaUrls")
      .where('product."mediaUrls"::text ILIKE :needle', { needle: `%${normalizedId}%` })
      .getRawMany<{ id: string; name: string; slug: string; mediaUrls: unknown }>();

    const products = rows
      .filter((product) => Array.isArray(product.mediaUrls) && product.mediaUrls.some((value) => String(value).includes(normalizedId)))
      .map((product) => ({ id: product.id, name: product.name, slug: product.slug }));

    return { used: products.length > 0, products };
  }

  async deleteMedia(key: string): Promise<{ deleted: true; key: string }> {
    if (!/^product-media\/[0-9a-f-]{36}(?:\.[a-z0-9]{1,12})?$/i.test(key)) {
      throw new BadRequestException("Invalid media reference.");
    }
    const references = await this.getMediaReferences(key);
    if (references.used) {
      throw new BadRequestException("Media is still used by a product and cannot be deleted.");
    }
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
    return { deleted: true, key };
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}