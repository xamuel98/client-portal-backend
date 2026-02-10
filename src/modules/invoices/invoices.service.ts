import { Injectable, NotFoundException } from '@nestjs/common';
import { InvoicesRepository } from './repositories/invoices.repository';
import {
  CreateInvoiceDto,
  UpdateInvoiceDto,
  InvoiceItemDto,
} from './dto/invoice.dto';
import { Invoice, InvoiceItem } from './schemas/invoice.schema';
import { Types } from 'mongoose';
import { InvoiceStatus } from '../../common/constants/invoice-status.constant';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  InvoiceEvents,
  InvoiceStatusUpdatedEvent,
} from './events/invoice-status-updated.event';
import { TenantsService } from '../tenants/tenants.service';

@Injectable()
export class InvoicesService {
  constructor(
    private readonly invoicesRepository: InvoicesRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly tenantsService: TenantsService,
    @InjectQueue('invoices') private readonly invoicesQueue: Queue,
  ) {}

  private calculateTotals(items: InvoiceItemDto[]) {
    let subtotal = 0;
    const mappedItems: InvoiceItem[] = items.map((item) => {
      const amount = item.quantity * item.unitPrice;
      subtotal += amount;
      return { ...item, amount };
    });

    // Simple tax calculation (e.g., 0 for now, can be parameterized later)
    const taxTotal = 0;
    const totalAmount = subtotal + taxTotal;

    return { items: mappedItems, subtotal, taxTotal, totalAmount };
  }

  async create(
    createInvoiceDto: CreateInvoiceDto,
    tenantId: string,
  ): Promise<Invoice> {
    const { items: dtoItems, ...rest } = createInvoiceDto;
    const { items, subtotal, taxTotal, totalAmount } =
      this.calculateTotals(dtoItems);

    let currency = createInvoiceDto.currency;
    if (!currency) {
      const tenant = await this.tenantsService.findOne(tenantId);
      currency = tenant.settings?.currency || 'USD';
    }

    const invoice = await this.invoicesRepository.create({
      ...rest,
      tenantId: new Types.ObjectId(tenantId),
      clientId: new Types.ObjectId(createInvoiceDto.clientId),
      projectId: createInvoiceDto.projectId
        ? new Types.ObjectId(createInvoiceDto.projectId)
        : undefined,
      items,
      subtotal,
      taxTotal,
      totalAmount,
      currency,
    } as Partial<Invoice>);

    await this.invoicesQueue.add('generate-pdf', {
      invoiceId: invoice._id.toString(),
      tenantId: tenantId,
    });

    return invoice;
  }

  async findAll(tenantId: string, clientId?: string): Promise<Invoice[]> {
    const filter: Record<string, any> = {};
    if (clientId) {
      filter.clientId = new Types.ObjectId(clientId);
    }
    return this.invoicesRepository.findByTenant(tenantId, filter);
  }

  async findOne(id: string, tenantId: string): Promise<Invoice> {
    const invoice = await this.invoicesRepository.findOneByTenant(tenantId, {
      _id: id,
    });
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }
    return invoice;
  }

  async update(
    id: string,
    updateInvoiceDto: UpdateInvoiceDto,
    tenantId: string,
  ): Promise<Invoice> {
    await this.findOne(id, tenantId);

    // Convert dates if present
    const updateData: Partial<Invoice> = { ...updateInvoiceDto } as any;

    const updatedInvoice = await this.invoicesRepository.update(id, updateData);
    if (!updatedInvoice) {
      throw new NotFoundException('Invoice not found during update');
    }
    return updatedInvoice;
  }

  async remove(id: string, tenantId: string): Promise<void> {
    await this.findOne(id, tenantId);
    await this.invoicesRepository.delete(id);
  }

  async updateStatus(
    id: string,
    tenantId: string,
    status: InvoiceStatus,
  ): Promise<Invoice> {
    const invoice = await this.findOne(id, tenantId);
    const oldStatus = invoice.status;

    const updatedInvoice = await this.invoicesRepository.update(id, { status });
    if (!updatedInvoice) {
      throw new NotFoundException('Invoice not found during status update');
    }

    this.eventEmitter.emit(
      InvoiceEvents.STATUS_UPDATED,
      new InvoiceStatusUpdatedEvent(id, tenantId, oldStatus, status),
    );

    if (status === InvoiceStatus.SENT) {
      await this.invoicesQueue.add('generate-pdf', {
        invoiceId: id,
        tenantId: tenantId,
      });
    }

    return updatedInvoice;
  }
}
