import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Tenant, TenantSchema } from './schemas/tenant.schema';
import { TenantsRepository } from './repositories/tenants.repository';
import { TenantsService } from './tenants.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Tenant.name, schema: TenantSchema }]),
  ],
  providers: [TenantsRepository, TenantsService],
  exports: [MongooseModule, TenantsRepository, TenantsService],
})
export class TenantsModule {}
