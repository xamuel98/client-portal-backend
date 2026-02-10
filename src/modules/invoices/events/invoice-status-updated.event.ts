import { InvoiceStatus } from '../../../common/constants/invoice-status.constant';

export class InvoiceStatusUpdatedEvent {
  constructor(
    public readonly invoiceId: string,
    public readonly tenantId: string,
    public readonly oldStatus: InvoiceStatus | undefined,
    public readonly newStatus: InvoiceStatus,
  ) {}
}

export const InvoiceEvents = {
  STATUS_UPDATED: 'invoice.status.updated',
};
