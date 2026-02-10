import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../../../common/repositories/base.repository';
import { Tenant, TenantDocument } from '../schemas/tenant.schema';

@Injectable()
export class TenantsRepository extends BaseRepository<TenantDocument> {
  constructor(
    @InjectModel(Tenant.name)
    private readonly tenantModel: Model<TenantDocument>,
  ) {
    super(tenantModel);
  }

  async findBySlug(slug: string): Promise<TenantDocument | null> {
    return this.findOne({ slug });
  }

  async findByDomain(domain: string): Promise<TenantDocument | null> {
    return this.findOne({ domain });
  }
}
