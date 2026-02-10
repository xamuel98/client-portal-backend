import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { Types } from 'mongoose';
import { TenantsRepository } from '../tenants/repositories/tenants.repository';

describe('FilesController', () => {
  let controller: FilesController;
  let service: FilesService;

  const mockTenantId = new Types.ObjectId();
  const mockUserId = new Types.ObjectId();
  const mockRequest = {
    user: {
      tenantId: mockTenantId,
      _id: mockUserId,
    },
  };

  const mockFilesService = {
    uploadFile: jest.fn(),
    findOne: jest.fn(),
    deleteFile: jest.fn(),
  };

  const mockTenantsRepository = {
    findById: jest.fn().mockResolvedValue({ isActive: true }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FilesController],
      providers: [
        {
          provide: FilesService,
          useValue: mockFilesService,
        },
        {
          provide: TenantsRepository,
          useValue: mockTenantsRepository,
        },
      ],
    }).compile();

    controller = module.get<FilesController>(FilesController);
    service = module.get<FilesService>(FilesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('uploadFile', () => {
    it('should upload a file', async () => {
      const mockFile = { buffer: Buffer.from('test') } as Express.Multer.File;
      const relatedEntity = 'Project';
      const relatedEntityId = '123';
      const expectedResult = { id: '1', url: 'http://cdn.com/test' };
      mockFilesService.uploadFile.mockResolvedValue(expectedResult);

      const result = await controller.uploadFile(
        mockFile,
        mockRequest as any,
        relatedEntity,
        relatedEntityId,
      );

      expect(service.uploadFile).toHaveBeenCalledWith(
        mockFile,
        mockTenantId.toString(),
        mockUserId.toString(),
        relatedEntity,
        relatedEntityId,
      );
      expect(result).toBe(expectedResult);
    });
  });

  describe('findOne', () => {
    it('should return a file metadata', async () => {
      const id = '1';
      const file = { _id: id, filename: 'test.jpg' };
      mockFilesService.findOne.mockResolvedValue(file);

      const result = await controller.findOne(id, mockRequest as any);

      expect(service.findOne).toHaveBeenCalledWith(id, mockTenantId.toString());
      expect(result).toBe(file);
    });
  });

  describe('delete', () => {
    it('should delete a file', async () => {
      const id = '1';
      mockFilesService.deleteFile.mockResolvedValue(undefined);

      await controller.delete(id, mockRequest as any);

      expect(service.deleteFile).toHaveBeenCalledWith(
        id,
        mockTenantId.toString(),
      );
    });
  });
});
