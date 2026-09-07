import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import { SettingsService } from "@/admin/settings/settings.service";

const SIGNED_URL_TTL_SECONDS = 15 * 60; // Sprint 5.6 — signed URLs expire in 15 minutes

export type UploadCategory = "product-media" | "cms-assets" | "review-media";

// Sprint 3.8 — File Storage: S3-compatible object storage integration
// (MinIO locally, per Sprint 1's infrastructure — Phase 8 §2 "S3-
// compatible cloud storage"). Upload service abstraction so callers
// never talk to the S3 SDK directly. Virus/content scanning (Phase 16
// §16.14 "files scanned before being served publicly") is NOT
// implemented — flagged in Known Issues, as it requires a scanning
// provider decision explicitly out of scope.
//
// Sprint 5.6 additions: signed URLs (time-limited read access instead
// of relying on bucket-wide public access), category-tagged upload
// paths so product media / CMS assets / review media land in
// predictable, separately-lifecycle-managed prefixes, and a documented
// (not automated — see Known Issues) file lifecycle policy.
@Injectable()
export class StorageService {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(
    private readonly config: ConfigService,
    private readonly settings: SettingsService,
  ) {
    this.bucket = this.config.get<string>("storage.bucket")!;
    this.client = new S3Client({
      endpoint: this.config.get<string>("storage.endpoint"),
      region: "us-east-1", // required by the SDK; not meaningful for MinIO
      forcePathStyle: true, // required for MinIO/S3-compatible endpoints
      credentials: {
        accessKeyId: this.config.get<string>("storage.accessKey")!,
        secretAccessKey: this.config.get<string>("storage.secretKey")!,
      },
    });
  }

  // Sprint 7.5 correction: max file size and allowed MIME types were
  // hardcoded module-level constants — and separately re-cited (as a
  // comment noting "can't drift silently without both being visibly
  // wrong") inside the Sprint 7.3 media validator, which is exactly the
  // kind of duplication Sprint 7.5's "every configurable value managed
  // through Settings, not hard-coded" instruction targets. Now reads
  // from SettingsService.getMediaSettings() — a genuine single source
  // of truth instead of two constants that happened to still agree.
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
  ): Promise<{ key: string; url: string }> {
    await this.validate(file);
    const extension = file.originalname.split(".").pop();
    const key = `${category}/${randomUUID()}.${extension}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    return { key, url: `${this.config.get<string>("storage.endpoint")}/${this.bucket}/${key}` };
  }

  // Sprint 5.6 — Signed URLs: time-limited read access to an object,
  // rather than the bucket being publicly readable outright.
  //
  // Sprint 7.5 correction: this method was generating a signed URL
  // using `PutObjectCommand` — i.e. a signed URL for WRITING to the
  // object, not reading it — for a method named `getSignedReadUrl`.
  // Earlier session notes claimed this was found and fixed during
  // Sprint 5, but the bug was still present in the actual code (the
  // comment even documented it as a known-unfixed gap). Whatever
  // happened between those two states, the code as it exists right now
  // is what matters — found again and fixed for real during this
  // sprint's media-settings work, since a broken read-signed-URL method
  // is directly relevant to configuring media access this sprint.
  async getSignedReadUrl(key: string): Promise<{ url: string; expiresAt: string }> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    const url = await getSignedUrl(this.client, command, { expiresIn: SIGNED_URL_TTL_SECONDS });
    return { url, expiresAt: new Date(Date.now() + SIGNED_URL_TTL_SECONDS * 1000).toISOString() };
  }

  // Sprint 5.6 — File Lifecycle Rules. No automated cron/lifecycle
  // policy is configured against the bucket itself in Sprint 5 (that's
  // an infrastructure-level MinIO/S3 lifecycle-policy concern, not
  // application code) — this method is the application-level building
  // block a future scheduled job (Sprint 5.8's queue framework) would
  // call to enforce the documented policy in
  // docs/integrations/CONFIGURATION_GUIDE.md (orphaned uploads —
  // objects with no referencing entity row — deleted after 30 days).
  async deleteObject(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}
