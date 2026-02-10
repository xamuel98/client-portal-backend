import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsService } from './projects.service';
import { ProjectsRepository } from './repositories/projects.repository';
import { Types } from 'mongoose';
import { ProjectQueryDto } from './dto/project-query.dto';
import { ProjectStatus } from '../../common/constants/status.constant';

describe('ProjectsService', () => {
  let service: ProjectsService;
  let repository: ProjectsRepository;

  const mockTenantId = new Types.ObjectId().toString();
  const mockProjectsRepository = {
    findPaginatedByTenant: jest.fn(),
    findOneByTenant: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    count: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        {
          provide: ProjectsRepository,
          useValue: mockProjectsRepository,
        },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
    repository = module.get<ProjectsRepository>(ProjectsRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should call repository.findPaginatedByTenant with correct filters', async () => {
      const query: ProjectQueryDto = {
        page: 2,
        limit: 5,
        status: ProjectStatus.ACTIVE,
        search: 'test',
      };

      mockProjectsRepository.findPaginatedByTenant.mockResolvedValue({
        data: [],
        total: 0,
      });

      const result = await service.findAll(mockTenantId, query);

      expect(repository.findPaginatedByTenant).toHaveBeenCalledWith(
        mockTenantId,
        expect.objectContaining({
          status: ProjectStatus.ACTIVE,
          $or: expect.any(Array),
        }),
        2,
        5,
        { sort: { createdAt: -1 } },
      );

      expect(result.meta).toEqual({
        total: 0,
        page: 2,
        limit: 5,
        totalPages: 0,
      });
    });
  });

  describe('findOne', () => {
    it('should return a project if found', async () => {
      const id = new Types.ObjectId().toString();
      const project = { _id: id, name: 'Test Project' };
      mockProjectsRepository.findOneByTenant.mockResolvedValue(project);

      const result = await service.findOne(id, mockTenantId);

      expect(repository.findOneByTenant).toHaveBeenCalledWith(mockTenantId, {
        _id: id,
      });
      expect(result).toEqual(project);
    });

    it('should throw NotFoundException when project not found', async () => {
      mockProjectsRepository.findOneByTenant.mockResolvedValue(null);

      await expect(service.findOne('anyid', mockTenantId)).rejects.toThrow(
        'Project not found',
      );
    });
  });
});
