import { Injectable, NotFoundException } from '@nestjs/common';
import { ProjectsRepository } from './repositories/projects.repository';
import { CreateProjectDto, UpdateProjectDto } from './dto/project.dto';
import { ProjectQueryDto } from './dto/project-query.dto';
import { Project } from './schemas/project.schema';
import { Types } from 'mongoose';
import { PaginatedResponse } from '../../common/interfaces/paginated-response.interface';
import { ProjectStatus } from '../../common/constants/status.constant';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ProjectEvents,
  ProjectStatusUpdatedEvent,
} from './events/project-status-updated.event';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly projectsRepository: ProjectsRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(
    createProjectDto: CreateProjectDto,
    tenantId: string,
  ): Promise<Project> {
    const project = await this.projectsRepository.create({
      ...createProjectDto,
      tenantId: new Types.ObjectId(tenantId),
    } as any);
    return project;
  }

  async findAll(
    tenantId: string,
    query: ProjectQueryDto,
  ): Promise<PaginatedResponse<Project>> {
    const filter: any = {};
    if (query.status) {
      filter.status = query.status;
    }
    if (query.search) {
      const searchRegex = { $regex: query.search, $options: 'i' };
      filter.$or = [
        { name: searchRegex },
        { clientName: searchRegex },
        { description: searchRegex },
      ];
    }

    const { data, total } = await this.projectsRepository.findPaginatedByTenant(
      tenantId,
      filter,
      query.page ?? 1,
      query.limit ?? 10,
      { sort: { createdAt: -1 } },
    );

    const result = {
      data,
      meta: {
        total,
        page: query.page ?? 1,
        limit: query.limit ?? 10,
        totalPages: Math.ceil(total / (query.limit ?? 10)),
      },
    };

    return result;
  }

  async findOne(id: string, tenantId: string): Promise<Project> {
    const project = await this.projectsRepository.findOneByTenant(tenantId, {
      _id: id,
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }
    return project;
  }

  async update(
    id: string,
    updateProjectDto: UpdateProjectDto,
    tenantId: string,
  ): Promise<Project> {
    // Ensure project belongs to tenant
    await this.findOne(id, tenantId);

    const updatedProject = await this.projectsRepository.update(
      id,
      updateProjectDto,
    );
    if (!updatedProject) {
      // Should not happen if findOne passed, but graceful fallback
      throw new NotFoundException('Project not found during update');
    }
    return updatedProject;
  }

  async remove(id: string, tenantId: string): Promise<void> {
    // Ensure project belongs to tenant
    await this.findOne(id, tenantId);
    await this.projectsRepository.delete(id);
  }

  async updateStatus(
    id: string,
    tenantId: string,
    status: ProjectStatus,
  ): Promise<Project> {
    const project = await this.findOne(id, tenantId);
    const oldStatus = project.status;

    const updatedProject = await this.projectsRepository.update(id, { status });
    if (!updatedProject) {
      throw new NotFoundException('Project not found during status update');
    }

    this.eventEmitter.emit(
      ProjectEvents.STATUS_UPDATED,
      new ProjectStatusUpdatedEvent(id, tenantId, oldStatus, status),
    );

    return updatedProject;
  }
}
