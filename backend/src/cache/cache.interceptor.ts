import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { CallHandler, ExecutionContext, Inject, Injectable, NestInterceptor } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import type { Cache } from "cache-manager";
import { Observable, from, of } from "rxjs";
import { switchMap, tap } from "rxjs/operators";
import { CACHEABLE_KEY, type CacheableOptions } from "./cacheable.decorator";

// Sprint 3.11 — Performance Foundation. Applies @Cacheable()'d GET
// endpoints only (never mutating requests); cache key includes the full
// URL (path + query string) so different filter/sort/page combinations
// don't collide.
@Injectable()
export class HttpCacheInterceptor implements NestInterceptor {
  constructor(
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const options = this.reflector.get<CacheableOptions | undefined>(CACHEABLE_KEY, context.getHandler());
    const request = context.switchToHttp().getRequest<Request>();

    if (!options || request.method !== "GET") {
      return next.handle();
    }

    const cacheKey = `${options.keyPrefix}:${request.originalUrl}`;

    return from(this.cache.get(cacheKey)).pipe(
      switchMap((cached) => {
        if (cached !== undefined && cached !== null) {
          return of(cached);
        }
        return next.handle().pipe(
          tap((response) => {
            void this.cache.set(cacheKey, response, options.ttlSeconds * 1000);
          }),
        );
      }),
    );
  }
}
