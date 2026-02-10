import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  ApprovalApprovedEvent,
  ApprovalEvents,
} from '../../approval-flow/events/approval.events';
import { ApprovalEntityType } from '../../../common/constants/approval-status.constant';
import { ProjectsService } from '../projects.service';
import { ProjectStatus } from '../../../common/constants/status.constant';

@Injectable()
export class ProjectApprovalListener {
  private readonly logger = new Logger(ProjectApprovalListener.name);

  constructor(private readonly projectsService: ProjectsService) {}

  @OnEvent(ApprovalEvents.APPROVED)
  async handleProjectApproved(event: ApprovalApprovedEvent) {
    if (event.entityType !== ApprovalEntityType.PROJECT_DELIVERABLE) {
      return;
    }

    this.logger.log(`Handling project approval for entity: ${event.entityId}`);

    try {
      await this.projectsService.updateStatus(
        event.entityId,
        event.tenantId,
        ProjectStatus.COMPLETED,
      );
      this.logger.log(
        `Successfully updated project status to COMPLETED for ${event.entityId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to update project status for ${event.entityId}: ${error.message}`,
      );
    }
  }
}
