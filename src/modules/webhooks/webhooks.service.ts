import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  WebhookSubscription,
  WebhookSubscriptionDocument,
} from './schemas/webhook-subscription.schema';
import * as crypto from 'crypto';

@Injectable()
export class WebhooksService {
  constructor(
    @InjectModel(WebhookSubscription.name)
    private readonly webhookModel: Model<WebhookSubscriptionDocument>,
  ) {}

  async create(tenantId: string, data: any): Promise<WebhookSubscription> {
    const secret = crypto.randomBytes(32).toString('hex');
    const newWebhook = new this.webhookModel({
      ...data,
      tenantId: new Types.ObjectId(tenantId),
      secret,
    });
    return newWebhook.save();
  }

  async findAll(tenantId: string): Promise<WebhookSubscription[]> {
    return this.webhookModel
      .find({ tenantId: new Types.ObjectId(tenantId) })
      .exec();
  }

  async findOne(id: string, tenantId: string): Promise<WebhookSubscription> {
    const webhook = await this.webhookModel.findOne({
      _id: id,
      tenantId: new Types.ObjectId(tenantId),
    });
    if (!webhook) {
      throw new NotFoundException('Webhook subscription not found');
    }
    return webhook;
  }

  async update(
    id: string,
    tenantId: string,
    data: any,
  ): Promise<WebhookSubscription> {
    const webhook = await this.webhookModel.findOneAndUpdate(
      { _id: id, tenantId: new Types.ObjectId(tenantId) },
      { $set: data },
      { new: true },
    );
    if (!webhook) {
      throw new NotFoundException('Webhook subscription not found');
    }
    return webhook;
  }

  async remove(id: string, tenantId: string): Promise<void> {
    const result = await this.webhookModel.deleteOne({
      _id: id,
      tenantId: new Types.ObjectId(tenantId),
    });
    if (result.deletedCount === 0) {
      throw new NotFoundException('Webhook subscription not found');
    }
  }

  async findByEvent(
    tenantId: string,
    event: string,
  ): Promise<WebhookSubscription[]> {
    return this.webhookModel
      .find({
        tenantId: new Types.ObjectId(tenantId),
        events: event,
        isActive: true,
      })
      .exec();
  }
}
