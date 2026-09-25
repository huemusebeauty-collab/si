import { BadGatewayException, BadRequestException, Injectable, InternalServerErrorException, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import type { Readable } from "node:stream";
import { SettingsService } from "@/admin/settings/settings.service";

const SIGNED_URL_TTL_SECONDS = 15 * 60; // Sprint 5.6 — signed URLs expire in 15 minutes

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

    // Storage keys are independent of the original filename. This keeps
    // spaces, capitals, brackets, Unicode and other filename characters
    // completely out of the object key while preserving the original name
    // in the API response for display/audit purposes.
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
    body: Readable;
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
      return {
        body: result.Body as Readable,
        contentType: result.ContentType ?? "application/octet-stream",
        contentLength: result.ContentLength,
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
