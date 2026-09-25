import { BadGatewayException, BadRequestException, Injectable, InternalServerErrorException, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import { SettingsService } from "@/admin/settings/settings.service";

const SIGNED_URL_TTL_SECONDS = 15 * 60; // Sprint 5.6 — signed URLs expire in 15 minutes

function sniffMediaContentType(body: Buffer): string | undefined {
  if (body.length >= 3 && body[0] === 0xff && body[1] === 0xd8 && body[2] === 0xff) return "image/jpeg";
  if (
    body.length >= 8 &&
    body[0] === 0x89 && body[1] === 0x50 && body[2] === 0x4e && body[3] === 0x47 &&
    body[4] === 0x0d && body[5] === 0x0a && body[6] === 0x1a && body[7] === 0x0a
  ) return "image/png";
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

// Sprint 3.8 — File Storage: S3-compatible object storage integration.
// Product media is served through the application storage proxy so the
// browser never depends on bucket-public configuration or expiring URLs.
@Injectable()
export class StorageService {
  private readonly client: S3Client;
  private readonly logger = new Logger(StorageService.name);
  private readonly bucket: string;
  private readonly publicBaseUrl?: string;

  constructor(
    private readonly config: ConfigService,
    private readonly settings: SettingsService,
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
    if (file.size > maxUploadSizeBytes) {
      throw new BadRequestException(`File exceeds the ${Math.round(maxUploadSizeBytes / 1024 / 1024)}MB limit.`);
    }
  }

  async upload(
    file: { buffer: Buffer; mimetype: string; size: number; originalname: string },
    category: UploadCategory = "product-media",
  ): Promise<{ key: string; url: string; originalName: string; contentType: string }> {
    await this.validate(file);
    const key = `${category}/${randomUUID()}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    if (this.publicBaseUrl) {
      const baseUrl = this.publicBaseUrl.replace(/\/+$/, "");
      return { key, url: baseUrl + "/" + key, originalName: file.originalname, contentType: file.mimetype };
    }

    if (this.config.get<string>("env") === "production") {
      throw new InternalServerErrorException("Storage public base URL is not configured.");
    }

    return {
      key,
      url: this.config.get<string>("storage.endpoint") + "/" + this.bucket + "/" + key,
      originalName: file.originalname,
      contentType: file.mimetype,
    };
  }

  async getObject(key: string, range?: string): Promise<{
    body: Buffer;
    contentType: string;
    contentLength?: number;
    contentRange?: string;
    statusCode: number;
  }> {
    try {
      const result = await this.client.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: key,
          ...(range ? { Range: range } : {}),
        }),
      );
      if (!result.Body) throw new NotFoundException("Media object not found.");
      const bytes = await result.Body.transformToByteArray();
      const body = Buffer.from(bytes);
      // Existing objects can have generic/incorrect storage MIME metadata.
      // Prefer the media type proven by the bytes; provider metadata remains
      // the fallback when a partial range cannot be identified.
      const detectedContentType = sniffMediaContentType(body);
      const contentType = detectedContentType ?? result.ContentType ?? "application/octet-stream";
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
      if (status === 404 || name === "NoSuchKey" || name === "NotFound") {
        throw new NotFoundException("Media object not found.");
      }
      if (status === 416) {
        throw new BadRequestException("Requested media range is not satisfiable.");
      }
      throw new BadGatewayException("Media storage is unavailable.");
    }
  }

  async getSignedReadUrl(key: string): Promise<{ url: string; expiresAt: string }> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    const url = await getSignedUrl(this.client, command, { expiresIn: SIGNED_URL_TTL_SECONDS });
    return { url, expiresAt: new Date(Date.now() + SIGNED_URL_TTL_SECONDS * 1000).toISOString() };
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}
