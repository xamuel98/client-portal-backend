import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  ShareableLink,
  ShareableLinkDocument,
} from '../schemas/shareable-link.schema';

@Injectable()
export class ShareableLinksRepository {
  constructor(
    @InjectModel(ShareableLink.name)
    private shareableLinkModel: Model<ShareableLinkDocument>,
  ) {}

  async create(data: Partial<ShareableLink>): Promise<ShareableLinkDocument> {
    const link = new this.shareableLinkModel(data);
    return link.save();
  }

  async findById(id: string): Promise<ShareableLinkDocument | null> {
    return this.shareableLinkModel.findById(id).exec();
  }

  async findByToken(token: string): Promise<ShareableLinkDocument | null> {
    return this.shareableLinkModel.findOne({ token }).exec();
  }

  async findByTenant(
    tenantId: string,
    activeOnly = false,
  ): Promise<ShareableLinkDocument[]> {
    const query: any = { tenantId: new Types.ObjectId(tenantId) };
    if (activeOnly) {
      query.isActive = true;
      query.expiresAt = { $gt: new Date() };
    }
    return this.shareableLinkModel.find(query).sort({ createdAt: -1 }).exec();
  }

  async update(
    id: string,
    data: Partial<ShareableLink>,
  ): Promise<ShareableLinkDocument | null> {
    return this.shareableLinkModel
      .findByIdAndUpdate(id, data, { new: true })
      .exec();
  }

  async incrementUses(id: string): Promise<ShareableLinkDocument | null> {
    return this.shareableLinkModel
      .findByIdAndUpdate(id, { $inc: { currentUses: 1 } }, { new: true })
      .exec();
  }

  async delete(id: string): Promise<void> {
    await this.shareableLinkModel.findByIdAndDelete(id).exec();
  }
}
