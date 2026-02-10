import { Module, Global } from '@nestjs/common';
import { CacheService } from './cache.service';
import { CacheInterceptor } from './cache.interceptor';
import { RedisModule } from '../../database/redis.module';

@Global()
@Module({
  imports: [RedisModule],
  providers: [CacheService, CacheInterceptor],
  exports: [CacheService, CacheInterceptor],
})
export class CacheModule {}
