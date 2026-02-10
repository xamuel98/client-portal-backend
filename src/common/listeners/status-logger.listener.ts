import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  InvoiceEvents,
  InvoiceStatusUpdatedEvent,
} from '../../modules/invoices/events/invoice-status-updated.event';
import {
  ProjectEvents,
  ProjectStatusUpdatedEvent,
} from '../../modules/projects/events/project-status-updated.event';
import {
  TaskEvents,
  TaskStatusUpdatedEvent,
} from '../../modules/tasks/events/task-status-updated.event';

@Injectable()
export class StatusLoggerListener {
  private readonly logger = new Logger(StatusLoggerListener.name);

  @OnEvent(InvoiceEvents.STATUS_UPDATED)
  handleInvoiceStatusUpdated(event: InvoiceStatusUpdatedEvent) {
    this.logger.log(
      `[EVENT] Invoice ${event.invoiceId} status changed from ${event.oldStatus} to ${event.newStatus}`,
    );
  }

  @OnEvent(ProjectEvents.STATUS_UPDATED)
  handleProjectStatusUpdated(event: ProjectStatusUpdatedEvent) {
    this.logger.log(
      `[EVENT] Project ${event.projectId} status changed from ${event.oldStatus} to ${event.newStatus}`,
    );
  }

  @OnEvent(TaskEvents.STATUS_UPDATED)
  handleTaskStatusUpdated(event: TaskStatusUpdatedEvent) {
    this.logger.log(
      `[EVENT] Task ${event.taskId} status changed from ${event.oldStatus} to ${event.newStatus}`,
    );
  }
}
