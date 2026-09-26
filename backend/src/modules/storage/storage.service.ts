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
      else reject(new Error(stderr.trim() || `FFmpeg exited with code ${code ?? "unknown"}`));
    });
  });
}

function sniffMediaContentType(body: Buffer): string | undefined {
  if (body.length >= 3 && body[0] === 0xff && body[1] === 0xd8 && body[2] === 0xff) return "image/jpeg";
  if (body.length >= 8 && body[0] === 0x89 && body[1] === 0x50 && body[2] === 0x4e && body[3] === 0x47 && body[4] === 0x0d && body[5] === 0x0a && body[6] === 0x1a && body[7] === 0x0a) return "image/png";
  if (body.length >= 6 && (body.subarray(0, 6).toString("ascii") === "GIF89a" || body.subarray(0, 6).toString("ascii") === "GIF87a")) return "image/gif";
  if (body.length >= 12 && body.subarray(0, 4).toString("ascii") === "RIFF" && body.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  if (body.length >= 12 && body.subarray(4, 8).toString("ascii") === "ftyp") {
    const brand = body.subarray(8, 12).toString("ascii");
    if (brand === "avif" || brand === "avis") return "image/avif";
    return "video/mp4";
  }
  if (body.length >= 4 && body.subarray(0, 4).toString("ascii") === "OggS") return "audio/ogg";
  return undefined;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly publicBaseUrl: string;

  constructor(private readonly config: ConfigService, private readonly settings: SettingsService) {
    this.bucket = this.config.getOrThrow<string>("STORAGE_BUCKET");
    this.publicBaseUrl = this.config.getOrThrow<string>("STORAGE_PUBLIC_BASE_URL");
    this.s3 = new S3Client({ region: this.config.get<string>("STORAGE_REGION") || "auto", endpoint: this.config.getOrThrow<string>("STORAGE_ENDPOINT"), credentials: { accessKeyId: this.config.getOrThrow<string>("STORAGE_ACCESS_KEY"), secretAccessKey: this.config.getOrThrow<string>("STORAGE_SECRET_KEY") } });
  }

  async uploadFile(file: Express.Multer.File, category: string) {
    if (!file?.buffer?.length) throw new BadRequestException("Empty media file.");
    if (!["product-media", "cms-assets", "review-media"].includes(category)) throw new BadRequestException("Invalid media category.");

    const isVideo = file.mimetype === "video/mp4";
    const maxInput = isVideo ? Math.min(await this.settings.getStorageMaxUploadBytes(), MAX_VIDEO_INPUT_BYTES) : Math.min(await this.settings.getStorageMaxUploadBytes(), MAX_IMAGE_INPUT_BYTES);
    if (file.size > maxInput) throw new BadRequestException(`File exceeds the ${Math.floor(maxInput / 1024 / 1024)}MB upload limit.`);

    let body = file.buffer;
    let contentType = file.mimetype;
    let extension = file.originalname.includes(".") ? file.originalname.split(".").pop()!.toLowerCase() : "bin";
    let optimized = false;

    if (isVideo) {
      if (file.buffer.length < 12 || file.buffer.subarray(4, 8).toString("ascii") !== "ftyp") throw new BadRequestException("Invalid MP4 file.");
      const workDir = await mkdtemp(join(tmpdir(), "silku-media-"));
      const inputPath = join(workDir, "input.mp4");
      const outputPath = join(workDir, "optimized.mp4");
      try {
        await writeFile(inputPath, file.buffer);
        await runFfmpeg(inputPath, outputPath);
        const optimizedBody = await readFile(outputPath);
        if (!optimizedBody.length) throw new Error("FFmpeg produced an empty output.");
        if (optimizedBody.length >= file.buffer.length) throw new Error("Optimized MP4 is not smaller than the original.");
        if (optimizedBody.length > MAX_VIDEO_OUTPUT_BYTES) throw new Error("Optimized MP4 exceeds the 20MB delivery limit.");
        body = optimizedBody;
        contentType = "video/mp4";
        extension = "mp4";
        optimized = true;
      } catch (error) {
        this.logger.error(`MP4 optimization failed: ${error instanceof Error ? error.message : String(error)}`);
        throw new BadRequestException("MP4 optimization failed. Please upload a compatible MP4 file.");
      } finally {
        await rm(workDir, { recursive: true, force: true });
      }
    } else if (file.mimetype.startsWith("image/")) {
      const metadata = await sharp(file.buffer).metadata();
      if (!metadata.width || !metadata.height) throw new BadRequestException("Image dimensions could not be detected.");
      if (metadata.width < 400 || metadata.height < 400) throw new BadRequestException("Image must be at least 400x400px.");
      body = await sharp(file.buffer).rotate().resize(MAX_IMAGE_DIMENSION_PX, MAX_IMAGE_DIMENSION_PX, { fit: "inside", withoutEnlargement: true }).webp({ quality: 82, effort: 4 }).toBuffer();
      contentType = "image/webp";
      extension = "webp";
      optimized = true;
    }

    const key = `${category}/${randomUUID()}.${extension}`;
    await this.s3.send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentLength: body.length, ContentType: contentType, Metadata: { originalName: file.originalname, optimized: String(optimized) } }));
    return { key, url: `${this.publicBaseUrl}/v1/storage/media/${category}/${key.split("/").pop()}` , size: body.length, contentType, optimized };
  }

  async listMedia(category: string) {
    if (!["product-media", "cms-assets", "review-media"].includes(category)) throw new BadRequestException("Invalid media category.");
    const listed = await this.s3.send(new ListObjectsV2Command({ Bucket: this.bucket, Prefix: `${category}/` }));
    return Promise.all((listed.Contents || []).filter((item) => item.Key).map(async (item) => {
      const key = item.Key!;
      const head = await this.s3.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return { key, size: head.ContentLength || item.Size || 0, contentType: head.ContentType || "application/octet-stream", lastModified: head.LastModified || item.LastModified || null };
    }));
  }
}
