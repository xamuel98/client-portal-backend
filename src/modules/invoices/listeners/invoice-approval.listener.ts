import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  ApprovalApprovedEvent,
  ApprovalEvents,
} from '../../approval-flow/events/approval.events';
import { ApprovalEntityType } from '../../../common/constants/approval-status.constant';
import { InvoicesService } from '../invoices.service';
import { InvoiceStatus } from '../../../common/constants/invoice-status.constant';

@Injectable()
export class InvoiceApprovalListener {
  private readonly logger = new Logger(InvoiceApprovalListener.name);

  constructor(private readonly invoicesService: InvoicesService) {}

  @OnEvent(ApprovalEvents.APPROVED)
  async handleInvoiceApproved(event: ApprovalApprovedEvent) {
    if (event.entityType !== ApprovalEntityType.INVOICE) {
      return;
    }

    this.logger.log(`Handling invoice approval for entity: ${event.entityId}`);

    try {
      await this.invoicesService.updateStatus(
        event.entityId,
        event.tenantId,
        InvoiceStatus.SENT,
      );
      this.logger.log(
        `Successfully updated invoice status to SENT for ${event.entityId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to update invoice status for ${event.entityId}: ${error.message}`,
      );
    }
  }
}
