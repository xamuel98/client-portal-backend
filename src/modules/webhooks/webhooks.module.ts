import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bullmq';
import { TenantsModule } from '../tenants/tenants.module';
import { WebhooksService } from './webhooks.service';
import { WebhooksController } from './webhooks.controller';
import { WebhooksListener } from './listeners/webhooks.listener';
import { WebhookProcessor } from './processors/webhook.processor';
import {
  WebhookSubscription,
  WebhookSubscriptionSchema,
} from './schemas/webhook-subscription.schema';

@Module({
  imports: [
    TenantsModule,
    MongooseModule.forFeature([
      { name: WebhookSubscription.name, schema: WebhookSubscriptionSchema },
    ]),
    BullModule.registerQueue({
      name: 'webhooks',
    }),
  ],
  controllers: [WebhooksController],
  providers: [WebhooksService, WebhooksListener, WebhookProcessor],
  exports: [WebhooksService],
})
export class WebhooksModule {}
