import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bullmq';
import { InvoicesService } from './invoices.service';
import { InvoicesController } from './invoices.controller';
import { Invoice, InvoiceSchema } from './schemas/invoice.schema';
import { InvoicesRepository } from './repositories/invoices.repository';
import { TenantsModule } from '../tenants/tenants.module';
import { InvoiceApprovalListener } from './listeners/invoice-approval.listener';
import { IntegrationsModule } from '../integrations/integrations.module';
import { FilesModule } from '../files/files.module';
import { UsersModule } from '../users/users.module';
import { PDFProcessor } from './processors/pdf.processor';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Invoice.name, schema: InvoiceSchema }]),
    TenantsModule,
    IntegrationsModule,
    FilesModule,
    UsersModule,
    BullModule.registerQueue({
      name: 'invoices',
    }),
  ],
  controllers: [InvoicesController],
  providers: [
    InvoicesService,
    InvoicesRepository,
    InvoiceApprovalListener,
    PDFProcessor,
  ],
  exports: [InvoicesService],
})
export class InvoicesModule {}
