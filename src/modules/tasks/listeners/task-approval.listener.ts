import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  ApprovalApprovedEvent,
  ApprovalEvents,
} from '../../approval-flow/events/approval.events';
import { ApprovalEntityType } from '../../../common/constants/approval-status.constant';
import { TasksService } from '../tasks.service';
import { TaskStatus } from '../../../common/constants/status.constant';

@Injectable()
export class TaskApprovalListener {
  private readonly logger = new Logger(TaskApprovalListener.name);

  constructor(private readonly tasksService: TasksService) {}

  @OnEvent(ApprovalEvents.APPROVED)
  async handleTaskApproved(event: ApprovalApprovedEvent) {
    if (event.entityType !== ApprovalEntityType.TASK) {
      return;
    }

    this.logger.log(`Handling task approval for entity: ${event.entityId}`);

    try {
      await this.tasksService.updateStatus(
        event.entityId,
        event.tenantId,
        TaskStatus.DONE,
      );
      this.logger.log(
        `Successfully updated task status to DONE for ${event.entityId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to update task status for ${event.entityId}: ${error.message}`,
      );
    }
  }
}
