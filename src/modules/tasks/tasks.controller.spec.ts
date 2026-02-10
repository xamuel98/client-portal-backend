import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { CreateTaskDto, UpdateTaskDto } from './dto/task.dto';
import { Types } from 'mongoose';
import { TenantsRepository } from '../tenants/repositories/tenants.repository';
import { TenantsService } from '../tenants/tenants.service';

describe('TasksController', () => {
  let controller: TasksController;
  let service: TasksService;

  const mockTenantId = new Types.ObjectId();
  const mockUserId = new Types.ObjectId();
  const mockRequest = {
    user: {
      tenantId: mockTenantId,
      _id: mockUserId,
    },
  };

  const mockTasksService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockTenantsService = {
    findOne: jest.fn().mockResolvedValue({
      subscription: { plan: 'trial', status: 'active' },
    }),
  };

  const mockTenantsRepository = {
    findById: jest.fn().mockResolvedValue({ isActive: true }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TasksController],
      providers: [
        {
          provide: TasksService,
          useValue: mockTasksService,
        },
        {
          provide: TenantsService,
          useValue: mockTenantsService,
        },
        {
          provide: TenantsRepository,
          useValue: mockTenantsRepository,
        },
      ],
    }).compile();

    controller = module.get<TasksController>(TasksController);
    service = module.get<TasksService>(TasksService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call service.create with correct data', async () => {
      const dto: CreateTaskDto = {
        title: 'Test Task',
        projectId: new Types.ObjectId().toString(),
      };
      mockTasksService.create.mockResolvedValue({ id: '1', ...dto });

      const result = await controller.create(dto, mockRequest as any);

      expect(service.create).toHaveBeenCalledWith(
        dto,
        mockTenantId.toString(),
        mockUserId.toString(),
      );
      expect(result).toEqual({ id: '1', ...dto });
    });
  });

  describe('findAll', () => {
    it('should call service.findAll with correct projectId and tenantId', async () => {
      const projectId = 'proj1';
      mockTasksService.findAll.mockResolvedValue([]);

      const result = await controller.findAll(mockRequest as any, projectId);

      expect(service.findAll).toHaveBeenCalledWith(
        mockTenantId.toString(),
        projectId,
      );
      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a single task', async () => {
      const id = new Types.ObjectId();
      mockTasksService.findOne.mockResolvedValue({ _id: id, title: 'Task 1' });

      const result = await controller.findOne(id, mockRequest as any);

      expect(service.findOne).toHaveBeenCalledWith(
        id.toString(),
        mockTenantId.toString(),
      );
      expect(result).toEqual({ _id: id, title: 'Task 1' });
    });
  });

  describe('update', () => {
    it('should update a task', async () => {
      const id = new Types.ObjectId();
      const dto: UpdateTaskDto = { title: 'Updated Task' };
      mockTasksService.update.mockResolvedValue({ _id: id, ...dto });

      const result = await controller.update(id, dto, mockRequest as any);

      expect(service.update).toHaveBeenCalledWith(
        id.toString(),
        dto,
        mockTenantId.toString(),
      );
      expect(result).toEqual({ _id: id, ...dto });
    });
  });

  describe('remove', () => {
    it('should remove a task', async () => {
      const id = new Types.ObjectId();
      mockTasksService.remove.mockResolvedValue(undefined);

      await controller.remove(id, mockRequest as any);

      expect(service.remove).toHaveBeenCalledWith(
        id.toString(),
        mockTenantId.toString(),
      );
    });
  });
});
