import { SetMetadata, applyDecorators, UseInterceptors } from '@nestjs/common';

export const CACHE_METADATA_KEY = 'cacheable';
export const CACHE_TTL_METADATA_KEY = 'cache_ttl';
export const CACHE_SCOPE_METADATA_KEY = 'cache_scope';

export enum CacheScope {
  USER = 'user',
  TENANT = 'tenant',
}

/**
 * Decorator to mark an endpoint as cacheable.
 * @param ttl Time to live in seconds (default: 300s / 5min)
 * @param scope Cache scope (USER or TENANT)
 */
export const Cacheable = (
  ttl: number = 300,
  scope: CacheScope = CacheScope.USER,
) => {
  return applyDecorators(
    SetMetadata(CACHE_METADATA_KEY, true),
    SetMetadata(CACHE_TTL_METADATA_KEY, ttl),
    SetMetadata(CACHE_SCOPE_METADATA_KEY, scope),
  );
};

export const CACHE_INVALIDATE_METADATA_KEY = 'cache_invalidate';

/**
 * Decorator to invalidate cache patterns on success.
 * @param pattern key pattern to invalidate (e.g., 'cache:tenantId:*')
 */
export const CacheInvalidate = (pattern: string) => {
  return SetMetadata(CACHE_INVALIDATE_METADATA_KEY, pattern);
};
