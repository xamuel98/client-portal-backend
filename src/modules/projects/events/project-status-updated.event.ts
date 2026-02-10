import { ProjectStatus } from '../../../common/constants/status.constant';

export class ProjectStatusUpdatedEvent {
  constructor(
    public readonly projectId: string,
    public readonly tenantId: string,
    public readonly oldStatus: ProjectStatus | undefined,
    public readonly newStatus: ProjectStatus,
  ) {}
}

export const ProjectEvents = {
  STATUS_UPDATED: 'project.status.updated',
};
