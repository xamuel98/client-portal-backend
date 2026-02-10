import { TaskStatus } from '../../../common/constants/status.constant';

export class TaskStatusUpdatedEvent {
  constructor(
    public readonly taskId: string,
    public readonly tenantId: string,
    public readonly oldStatus: TaskStatus | undefined,
    public readonly newStatus: TaskStatus,
  ) {}
}

export const TaskEvents = {
  STATUS_UPDATED: 'task.status.updated',
};
