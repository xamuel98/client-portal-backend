import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { APP_FILTER, APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './database/redis.module';
import { UsersModule } from './modules/users/users.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { AuthModule } from './modules/auth/auth.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { FilesModule } from './modules/files/files.module';
import { MessagesModule } from './modules/messages/messages.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { InvitationsModule } from './modules/invitations/invitations.module';
import { ActivityLogsModule } from './modules/activity-logs/activity-logs.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { CacheModule } from './modules/cache/cache.module';
import { CacheInterceptor } from './modules/cache/cache.interceptor';
import { ApprovalFlowModule } from './modules/approval-flow/approval-flow.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import configuration from './config/configuration';
import { validationSchema } from './config/validation.schema';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { ActivityLoggingInterceptor } from './common/interceptors/activity-logging.interceptor';
import { StatusLoggerListener } from './common/listeners/status-logger.listener';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: validationSchema,
    }),
    DatabaseModule,
    RedisModule,
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const uri = configService.get<string>('redis.uri');
        if (uri) {
          const url = new URL(uri);
          return {
            connection: {
              host: url.hostname,
              port: Number(url.port),
              password: url.password,
              username: url.username,
              family: 4,
            },
          };
        }
        return {
          connection: {
            host: configService.get<string>('bullmq.host'),
            port: configService.get<number>('bullmq.port'),
            password: configService.get<string>('bullmq.password'),
            family: 4,
          },
        };
      },
    }),
    EventEmitterModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { colorize: true } }
            : undefined,
      },
    }),
    UsersModule,
    TenantsModule,
    AuthModule,
    ProjectsModule,
    TasksModule,
    FilesModule,
    MessagesModule,
    InvoicesModule,
    InvitationsModule,
    ActivityLogsModule,
    NotificationsModule,
    AnalyticsModule,
    CacheModule,
    ApprovalFlowModule,
    IntegrationsModule,
    WebhooksModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ActivityLoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: CacheInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    StatusLoggerListener,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {}
}
