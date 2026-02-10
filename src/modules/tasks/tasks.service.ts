import { Injectable, NotFoundException } from '@nestjs/common';
import { TasksRepository } from './repositories/tasks.repository';
import { CreateTaskDto, UpdateTaskDto } from './dto/task.dto';
import { Task } from './schemas/task.schema';
import { Types } from 'mongoose';
import { TaskStatus } from '../../common/constants/status.constant';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  TaskEvents,
  TaskStatusUpdatedEvent,
} from './events/task-status-updated.event';
import { IntegrationsService } from '../integrations/integrations.service';

@Injectable()
export class TasksService {
  constructor(
    private readonly tasksRepository: TasksRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly integrationsService: IntegrationsService,
  ) {}

  async create(
    createTaskDto: CreateTaskDto,
    tenantId: string,
    reporterId: string,
  ): Promise<Task> {
    const task = await this.tasksRepository.create({
      ...createTaskDto,
      tenantId: new Types.ObjectId(tenantId),
      projectId: new Types.ObjectId(createTaskDto.projectId),
      reporterId: new Types.ObjectId(reporterId),
      assigneeId: createTaskDto.assigneeId
        ? new Types.ObjectId(createTaskDto.assigneeId)
        : undefined,
    } as any);

    // Sync to Calendar if integrated
    await this.integrationsService.syncTaskToCalendar(
      tenantId,
      task,
      reporterId,
    );
    if (task.isModified('metadata')) {
      await task.save();
    }

    return task;
  }

  async findAll(tenantId: string, projectId?: string): Promise<Task[]> {
    const filter: any = {};
    if (projectId) {
      filter.projectId = new Types.ObjectId(projectId);
    }
    return this.tasksRepository.findByTenant(tenantId, filter);
  }

  async findOne(id: string, tenantId: string): Promise<Task> {
    const task = await this.tasksRepository.findOneByTenant(tenantId, {
      _id: id,
    });
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    return task;
  }

  async update(
    id: string,
    updateTaskDto: UpdateTaskDto,
    tenantId: string,
  ): Promise<Task> {
    await this.findOne(id, tenantId);

    // Convert string IDs to ObjectIds if present
    const updateData: any = { ...updateTaskDto };
    if (updateTaskDto.assigneeId) {
      updateData.assigneeId = new Types.ObjectId(updateTaskDto.assigneeId);
    }

    const updatedTask = await this.tasksRepository.update(id, updateData);
    if (!updatedTask) {
      throw new NotFoundException('Task not found during update');
    }

    // Sync to Calendar if integrated
    await this.integrationsService.syncTaskToCalendar(tenantId, updatedTask);
    if (updatedTask.isModified('metadata')) {
      await updatedTask.save();
    }

    return updatedTask;
  }

  async remove(id: string, tenantId: string): Promise<void> {
    await this.findOne(id, tenantId);
    await this.tasksRepository.delete(id);
  }

  async updateStatus(
    id: string,
    tenantId: string,
    status: TaskStatus,
  ): Promise<Task> {
    const task = await this.findOne(id, tenantId);
    const oldStatus = task.status;

    const updatedTask = await this.tasksRepository.update(id, { status });
    if (!updatedTask) {
      throw new NotFoundException('Task not found during status update');
    }

    this.eventEmitter.emit(
      TaskEvents.STATUS_UPDATED,
      new TaskStatusUpdatedEvent(id, tenantId, oldStatus, status),
    );

    return updatedTask;
  }
}
