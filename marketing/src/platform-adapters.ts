export type MarketingPlatform = "instagram" | "facebook" | "youtube" | "pinterest" | "x" | "whatsapp";

export type PublishFormat = "post" | "story" | "reel" | "short" | "carousel" | "video" | "message";

export interface PublishRequest {
  contentId: string;
  platform: MarketingPlatform;
  format: PublishFormat;
  text?: string;
  mediaUrls?: string[];
  scheduledAt?: string;
}

export interface PublishResult {
  contentId: string;
  platform: MarketingPlatform;
  status: "queued" | "published" | "failed";
  externalId?: string;
  error?: string;
  publishedAt?: string;
}

export interface PlatformAdapter {
  readonly platform: MarketingPlatform;
  supports(format: PublishFormat): boolean;
  publish(request: PublishRequest): Promise<PublishResult>;
}

/**
 * Safe adapter contract: platform integrations are intentionally not implemented here.
 * Real API calls must be added behind credentials, rate limits, approval gates and retries.
 */
export class PlatformAdapterRegistry {
  private readonly adapters = new Map<MarketingPlatform, PlatformAdapter>();

  register(adapter: PlatformAdapter): void {
    this.adapters.set(adapter.platform, adapter);
  }

  get(platform: MarketingPlatform): PlatformAdapter | undefined {
    return this.adapters.get(platform);
  }

  list(): MarketingPlatform[] {
    return [...this.adapters.keys()];
  }

  async publish(request: PublishRequest): Promise<PublishResult> {
    const adapter = this.get(request.platform);
    if (!adapter) {
      return { contentId: request.contentId, platform: request.platform, status: "failed", error: "No platform adapter is registered." };
    }
    if (!adapter.supports(request.format)) {
      return { contentId: request.contentId, platform: request.platform, status: "failed", error: `Format '${request.format}' is not supported by ${request.platform}.` };
    }
    return adapter.publish(request);
  }
}
