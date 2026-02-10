import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UpdateProfileDto, UpdatePreferencesDto } from './dto/update-user.dto';
import { Types } from 'mongoose';

describe('UsersController', () => {
  let controller: UsersController;
  let service: UsersService;

  const mockUserId = new Types.ObjectId();
  const mockTenantId = new Types.ObjectId();
  const mockRequest = {
    user: {
      _id: mockUserId,
      tenantId: mockTenantId,
    },
  };

  const mockUsersService = {
    getMe: jest.fn(),
    updateProfile: jest.fn(),
    updatePreferences: jest.fn(),
    updateAvatar: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getMe', () => {
    it('should return current user profile', async () => {
      const profile = { _id: mockUserId.toString(), email: 'test@example.com' };
      mockUsersService.getMe.mockResolvedValue(profile);

      const result = await controller.getMe(mockRequest as any);

      expect(service.getMe).toHaveBeenCalledWith(mockUserId.toString());
      expect(result).toBe(profile);
    });
  });

  describe('updateProfile', () => {
    it('should update user profile', async () => {
      const dto: UpdateProfileDto = { firstName: 'Jane' };
      mockUsersService.updateProfile.mockResolvedValue({
        _id: mockUserId.toString(),
        ...dto,
      });

      const result = await controller.updateProfile(mockRequest as any, dto);

      expect(service.updateProfile).toHaveBeenCalledWith(
        mockUserId.toString(),
        dto,
      );
      expect(result).toEqual({ _id: mockUserId.toString(), ...dto });
    });
  });

  describe('updatePreferences', () => {
    it('should update user preferences', async () => {
      const dto: UpdatePreferencesDto = { theme: 'dark' };
      mockUsersService.updatePreferences.mockResolvedValue({
        _id: mockUserId.toString(),
        preferences: dto,
      });

      const result = await controller.updatePreferences(
        mockRequest as any,
        dto,
      );

      expect(service.updatePreferences).toHaveBeenCalledWith(
        mockUserId.toString(),
        dto,
      );
      expect(result).toEqual({ _id: mockUserId.toString(), preferences: dto });
    });
  });

  describe('updateAvatar', () => {
    it('should update user avatar', async () => {
      const mockFile = { buffer: Buffer.from('test') } as Express.Multer.File;
      const expectedResult = { avatarUrl: 'http://image.com' };
      mockUsersService.updateAvatar.mockResolvedValue(expectedResult);

      const result = await controller.updateAvatar(
        mockRequest as any,
        mockFile,
      );

      expect(service.updateAvatar).toHaveBeenCalledWith(
        mockUserId.toString(),
        mockFile,
        mockTenantId.toString(),
      );
      expect(result).toBe(expectedResult);
    });
  });
});
