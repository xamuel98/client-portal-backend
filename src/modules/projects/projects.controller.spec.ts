import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { CreateProjectDto, UpdateProjectDto } from './dto/project.dto';
import { ProjectQueryDto } from './dto/project-query.dto';
import { Types } from 'mongoose';
import { TenantsRepository } from '../tenants/repositories/tenants.repository';
import { TenantsService } from '../tenants/tenants.service';

describe('ProjectsController', () => {
  let controller: ProjectsController;
  let service: ProjectsService;

  const mockTenantId = new Types.ObjectId();
  const mockRequest = {
    user: {
      tenantId: mockTenantId,
    },
  };

  const mockProjectsService = {
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
      controllers: [ProjectsController],
      providers: [
        {
          provide: ProjectsService,
          useValue: mockProjectsService,
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

    controller = module.get<ProjectsController>(ProjectsController);
    service = module.get<ProjectsService>(ProjectsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call service.create with correct data', async () => {
      const dto: CreateProjectDto = { name: 'Test Project' };
      mockProjectsService.create.mockResolvedValue({ id: '1', ...dto });

      const result = await controller.create(dto, mockRequest as any);

      expect(service.create).toHaveBeenCalledWith(dto, mockTenantId.toString());
      expect(result).toEqual({ id: '1', ...dto });
    });
  });

  describe('findAll', () => {
    it('should call service.findAll with correct query and tenantId', async () => {
      const query: ProjectQueryDto = { page: 1, limit: 10 };
      const expectedResult = {
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      };
      mockProjectsService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll(mockRequest as any, query);

      expect(service.findAll).toHaveBeenCalledWith(
        mockTenantId.toString(),
        query,
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe('findOne', () => {
    it('should return a single project', async () => {
      const id = new Types.ObjectId();
      const project = { _id: id, name: 'Project 1' };
      mockProjectsService.findOne.mockResolvedValue(project);

      const result = await controller.findOne(id, mockRequest as any);

      expect(service.findOne).toHaveBeenCalledWith(
        id.toString(),
        mockTenantId.toString(),
      );
      expect(result).toEqual(project);
    });
  });

  describe('update', () => {
    it('should update a project', async () => {
      const id = new Types.ObjectId();
      const dto: UpdateProjectDto = { name: 'Updated' };
      mockProjectsService.update.mockResolvedValue({ _id: id, ...dto });

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
    it('should remove a project', async () => {
      const id = new Types.ObjectId();
      mockProjectsService.remove.mockResolvedValue(undefined);

      await controller.remove(id, mockRequest as any);

      expect(service.remove).toHaveBeenCalledWith(
        id.toString(),
        mockTenantId.toString(),
      );
    });
  });
});
