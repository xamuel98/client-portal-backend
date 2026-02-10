import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../../../common/repositories/base.repository';
import {
  Integration,
  IntegrationDocument,
} from '../schemas/integration.schema';

@Injectable()
export class IntegrationsRepository extends BaseRepository<IntegrationDocument> {
  constructor(
    @InjectModel(Integration.name)
    private readonly integrationModel: Model<IntegrationDocument>,
  ) {
    super(integrationModel);
  }

  async findByService(
    tenantId: string,
    service: string,
    userId?: string,
  ): Promise<IntegrationDocument | null> {
    const query: any = { tenantId, service };
    if (userId) query.userId = userId;
    return this.findOne(query);
  }
}
