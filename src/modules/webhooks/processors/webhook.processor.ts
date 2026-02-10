import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import axios from 'axios';
import * as crypto from 'crypto';

export interface WebhookDeliverData {
  subscriptionId: string;
  url: string;
  event: string;
  payload: any;
  secret: string;
}

@Processor('webhooks')
export class WebhookProcessor extends WorkerHost {
  private readonly logger = new Logger(WebhookProcessor.name);

  async process(job: Job<WebhookDeliverData>): Promise<any> {
    const { url, event, payload, secret } = job.data;

    const timestamp = Math.floor(Date.now() / 1000);
    const signaturePayload = `${timestamp}.${JSON.stringify(payload)}`;
    const signature = crypto
      .createHmac('sha256', secret)
      .update(signaturePayload)
      .digest('hex');

    this.logger.log(`Delivering webhook ${event} to ${url}`);

    try {
      const response = await axios.post(url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Event': event,
          'X-Webhook-Timestamp': timestamp.toString(),
          'X-Webhook-Signature': signature,
        },
        timeout: 10000, // 10 seconds timeout
      });

      this.logger.log(
        `Webhook delivered successfully to ${url}. Status: ${response.status}`,
      );
      return { success: true, status: response.status };
    } catch (error) {
      this.logger.error(`Webhook delivery failed to ${url}: ${error.message}`);
      // BullMQ will handle retries if configured in the queue
      throw error;
    }
  }
}
