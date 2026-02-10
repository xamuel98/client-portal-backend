import { Injectable, Inject } from '@nestjs/common';
import { Redis } from 'ioredis';

@Injectable()
export class CacheService {
  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  async flush(): Promise<void> {
    try {
      await this.redis.flushall();
      console.log('[CacheService] Cache flushed completely');
    } catch (error) {
      console.error('Cache flush error:', error);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      if (!value) return null;
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const stringValue = JSON.stringify(value);
      if (ttl) await this.redis.set(key, stringValue, 'EX', ttl);
      else await this.redis.set(key, stringValue);
    } catch (err) {
      console.error('Cache set error:', err);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch {}
  }

  async delByPattern(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) await this.redis.del(...keys);
    } catch {}
  }

  generateKey(parts: (string | object)[]): string {
    const processedParts = parts
      .filter((p) => p !== undefined && p !== null)
      .map((part) => {
        if (typeof part === 'object') {
          const sorted = Object.keys(part)
            .sort()
            .reduce((acc, key) => {
              acc[key] = (part as any)[key];
              return acc;
            }, {} as any);
          return JSON.stringify(sorted);
        }
        return String(part);
      });
    return processedParts.filter(Boolean).join(':');
  }
}
