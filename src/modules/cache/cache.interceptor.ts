import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CacheService } from './cache.service';
import { Reflector } from '@nestjs/core';
import {
  CACHE_METADATA_KEY,
  CACHE_TTL_METADATA_KEY,
  CACHE_SCOPE_METADATA_KEY,
  CACHE_INVALIDATE_METADATA_KEY,
  CacheScope,
} from './decorators/cache.decorator';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(
    private readonly cacheService: CacheService,
    private readonly reflector: Reflector,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const handler = context.getHandler();
    const isCacheable = this.reflector.get<boolean>(
      CACHE_METADATA_KEY,
      handler,
    );
    const invalidatePattern = this.reflector.get<string>(
      CACHE_INVALIDATE_METADATA_KEY,
      handler,
    );

    const scope =
      this.reflector.get<CacheScope>(CACHE_SCOPE_METADATA_KEY, handler) ||
      CacheScope.USER;

    if (!isCacheable && !invalidatePattern) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const { user, query } = request;
    const path = request.path; // Use path instead of full url to avoid double query strings
    const tenantId = user?.tenantId?.toString() || 'public';
    const userId = user?.sub || user?._id?.toString() || 'anonymous';

    // Handle invalidation for mutations (non-GET)
    if (invalidatePattern && request.method !== 'GET') {
      return next.handle().pipe(
        tap(async () => {
          // Resolve dynamic pattern (e.g., replace :tenantId with actual ID)
          const resolvedPattern = invalidatePattern.replace(
            /:tenantId/g,
            tenantId,
          );
          console.log(
            `[CacheInterceptor] Invalidating pattern: ${resolvedPattern} for tenant: ${tenantId}`,
          );
          await this.cacheService.delByPattern(resolvedPattern);
        }),
      );
    }

    // Handle caching for GET requests
    if (isCacheable && request.method === 'GET') {
      // Generate cache key parts
      const keyParts: (string | object)[] = ['cache', tenantId];

      if (scope === CacheScope.USER) {
        keyParts.push(userId);
      }

      keyParts.push(path);
      keyParts.push(query);

      const cacheKey = this.cacheService.generateKey(keyParts);

      const cachedResponse = await this.cacheService.get(cacheKey);
      if (cachedResponse) {
        console.log(`[CacheInterceptor] Cache HIT: ${cacheKey}`);
        return of(cachedResponse);
      }

      console.log(`[CacheInterceptor] Cache MISS: ${cacheKey}`);

      const ttl =
        this.reflector.get<number>(CACHE_TTL_METADATA_KEY, handler) || 300; // Default 5 mins

      return next.handle().pipe(
        tap(async (response) => {
          if (response) {
            await this.cacheService.set(cacheKey, response, ttl);
          }
        }),
      );
    }

    return next.handle();
  }
}
