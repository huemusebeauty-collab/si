import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Inject, Injectable } from "@nestjs/common";
import type { Cache } from "cache-manager";

@Injectable()
export class CacheInvalidationService {
  constructor(@Inject(CACHE_MANAGER) private readonly cache: Cache) {}

  async invalidatePrefix(keyPrefix: string): Promise<void> {
    const stores = this.cache.stores ?? [];
    for (const store of stores) {
      const keys = await this.collectKeys(store, keyPrefix);
      await Promise.all(keys.map((key) => this.cache.del(key)));
    }
  }

  private async collectKeys(store: Cache["stores"][number], keyPrefix: string): Promise<string[]> {
    const keys: string[] = [];
    if (!store.iterator) return keys;
    for await (const key of store.iterator()) {
      if (typeof key === "string" && key.startsWith(keyPrefix + ":")) keys.push(key);
    }
    return keys;
  }
}
