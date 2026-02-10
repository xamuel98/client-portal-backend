import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantsRepository } from './repositories/tenants.repository';
import { Tenant } from './schemas/tenant.schema';

@Injectable()
export class TenantsService {
  constructor(private readonly tenantsRepository: TenantsRepository) {}

  async findAll(): Promise<Tenant[]> {
    return this.tenantsRepository.find({});
  }

  async findOne(id: string): Promise<Tenant> {
    const tenant = await this.tenantsRepository.findById(id);
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }
    return tenant;
  }

  async create(data: Partial<Tenant>): Promise<Tenant> {
    return this.tenantsRepository.create(data);
  }

  async update(id: string, data: Partial<Tenant>): Promise<Tenant> {
    const tenant = await this.tenantsRepository.update(id, data);
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }
    return tenant;
  }
}
