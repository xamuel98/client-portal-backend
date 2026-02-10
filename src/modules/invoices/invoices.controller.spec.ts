import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto, UpdateInvoiceDto } from './dto/invoice.dto';
import { Types } from 'mongoose';
import { TenantsRepository } from '../tenants/repositories/tenants.repository';
import { TenantsService } from '../tenants/tenants.service';

describe('InvoicesController', () => {
  let controller: InvoicesController;
  let service: InvoicesService;

  const mockTenantId = new Types.ObjectId();
  const mockRequest = {
    user: {
      tenantId: mockTenantId,
    },
  };

  const mockInvoicesService = {
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
      controllers: [InvoicesController],
      providers: [
        {
          provide: InvoicesService,
          useValue: mockInvoicesService,
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

    controller = module.get<InvoicesController>(InvoicesController);
    service = module.get<InvoicesService>(InvoicesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call service.create with correct data', async () => {
      const dto: CreateInvoiceDto = {
        clientId: new Types.ObjectId().toString(),
        invoiceNumber: 'INV001',
        issueDate: new Date(),
        dueDate: new Date(),
        items: [{ description: 'Test', quantity: 1, unitPrice: 100 }],
        currency: 'USD',
      };
      mockInvoicesService.create.mockResolvedValue({ id: '1', ...dto });

      const result = await controller.create(dto, mockRequest as any);

      expect(service.create).toHaveBeenCalledWith(dto, mockTenantId.toString());
      expect(result).toEqual({ id: '1', ...dto });
    });
  });

  describe('findAll', () => {
    it('should call service.findAll with correct filters', async () => {
      const clientId = 'client123';
      mockInvoicesService.findAll.mockResolvedValue([]);

      const result = await controller.findAll(mockRequest as any, clientId);

      expect(service.findAll).toHaveBeenCalledWith(
        mockTenantId.toString(),
        clientId,
      );
      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a single invoice', async () => {
      const id = new Types.ObjectId();
      mockInvoicesService.findOne.mockResolvedValue({
        _id: id,
        invoiceNumber: 'INV001',
      });

      const result = await controller.findOne(id, mockRequest as any);

      expect(service.findOne).toHaveBeenCalledWith(
        id.toString(),
        mockTenantId.toString(),
      );
      expect(result).toEqual({ _id: id, invoiceNumber: 'INV001' });
    });
  });

  describe('update', () => {
    it('should update an invoice', async () => {
      const id = new Types.ObjectId();
      const dto: UpdateInvoiceDto = { notes: 'Some notes' };
      mockInvoicesService.update.mockResolvedValue({ _id: id, ...dto });

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
    it('should remove an invoice', async () => {
      const id = new Types.ObjectId();
      mockInvoicesService.remove.mockResolvedValue(undefined);

      await controller.remove(id, mockRequest as any);

      expect(service.remove).toHaveBeenCalledWith(
        id.toString(),
        mockTenantId.toString(),
      );
    });
  });
});
