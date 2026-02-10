import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { WebhooksService } from '../webhooks.service';
import {
  InvoiceEvents,
  InvoiceStatusUpdatedEvent,
} from '../../invoices/events/invoice-status-updated.event';

@Injectable()
export class WebhooksListener {
  private readonly logger = new Logger(WebhooksListener.name);

  constructor(
    private readonly webhooksService: WebhooksService,
    @InjectQueue('webhooks') private readonly webhooksQueue: Queue,
  ) {}

  @OnEvent(InvoiceEvents.STATUS_UPDATED)
  async handleInvoiceStatusUpdated(event: InvoiceStatusUpdatedEvent) {
    const { invoiceId, tenantId, newStatus } = event;

    // Map system event to webhook event name
    const webhookEvent = `invoice.${newStatus.toLowerCase()}`;

    this.logger.log(`Event detected: ${webhookEvent} for tenant: ${tenantId}`);

    const subscriptions = await this.webhooksService.findByEvent(
      tenantId,
      webhookEvent,
    );

    for (const sub of subscriptions as any[]) {
      this.logger.log(`Queueing webhook delivery to ${sub.url}`);
      await this.webhooksQueue.add('deliver', {
        subscriptionId: sub._id.toString(),
        url: sub.url,
        event: webhookEvent,
        payload: {
          invoiceId,
          tenantId,
          status: newStatus,
          timestamp: new Date().toISOString(),
        },
        secret: sub.secret,
      });
    }
  }
}
