import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/message.dto';
import { Types } from 'mongoose';
import { TenantsRepository } from '../tenants/repositories/tenants.repository';

describe('MessagesController', () => {
  let controller: MessagesController;
  let service: MessagesService;

  const mockTenantId = new Types.ObjectId();
  const mockUserId = new Types.ObjectId();
  const mockRequest = {
    user: {
      tenantId: mockTenantId,
      _id: mockUserId,
    },
  };

  const mockMessagesService = {
    create: jest.fn(),
    findByContext: jest.fn(),
  };

  const mockTenantsRepository = {
    findById: jest.fn().mockResolvedValue({ isActive: true }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MessagesController],
      providers: [
        {
          provide: MessagesService,
          useValue: mockMessagesService,
        },
        {
          provide: TenantsRepository,
          useValue: mockTenantsRepository,
        },
      ],
    }).compile();

    controller = module.get<MessagesController>(MessagesController);
    service = module.get<MessagesService>(MessagesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call service.create with correct data', async () => {
      const dto: CreateMessageDto = {
        content: 'Hello',
        projectId: new Types.ObjectId().toString(),
      };
      mockMessagesService.create.mockResolvedValue({ id: '1', ...dto });

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
    it('should call service.findByContext with correct filters', async () => {
      const projectId = 'proj1';
      const taskId = 'task1';
      mockMessagesService.findByContext.mockResolvedValue([]);

      const result = await controller.findAll(
        mockRequest as any,
        projectId,
        taskId,
      );

      expect(service.findByContext).toHaveBeenCalledWith(
        mockTenantId.toString(),
        projectId,
        taskId,
      );
      expect(result).toEqual([]);
    });
  });
});
