import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { UsersRepository } from './repositories/users.repository';
import {
  UpdateProfileDto,
  UpdatePreferencesDto,
  UpdateUserAccessDto,
} from './dto/update-user.dto';
import { FilesService } from '../files/files.service';
import { UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly filesService: FilesService,
  ) {}

  async create(data: any): Promise<UserDocument> {
    return this.usersRepository.create(data);
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.usersRepository.findByEmailGlobal(email);
  }

  async findAll(tenantId: string): Promise<UserDocument[]> {
    return this.usersRepository.find({ tenantId });
  }

  async findOne(userId: string, tenantId: string): Promise<UserDocument> {
    const user = await this.usersRepository.findOne({ _id: userId, tenantId });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async updateAccess(
    userId: string,
    tenantId: string,
    dto: UpdateUserAccessDto,
  ): Promise<UserDocument> {
    const user = await this.findOne(userId, tenantId);

    if (dto.role) {
      user.role = dto.role;
    }

    if (dto.permissions) {
      user.permissions = dto.permissions;
    }

    return user.save();
  }

  async getMe(userId: string): Promise<UserDocument> {
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<UserDocument> {
    const user = await this.getMe(userId);

    // Merge profile updates
    if (user.profile) {
      Object.assign(user.profile, dto);
    } else {
      user.profile = dto as any;
    }

    return user.save();
  }

  async updateAvatar(
    userId: string,
    file: Express.Multer.File,
    tenantId: string,
  ): Promise<UserDocument> {
    const user = await this.getMe(userId);

    // Delete old avatar if it exists
    await this.filesService.deleteByEntity(tenantId, 'avatar', userId);

    const uploadedFile = await this.filesService.uploadFile(
      file,
      tenantId,
      userId,
      'avatar',
      userId,
    );

    user.profile.avatar = uploadedFile.url;
    return user.save();
  }

  async updatePreferences(
    userId: string,
    dto: UpdatePreferencesDto,
  ): Promise<UserDocument> {
    const user = await this.getMe(userId);

    // Merge preferences
    if (dto.notifications) {
      user.preferences.notifications = {
        ...user.preferences.notifications,
        ...dto.notifications,
      } as any;
    }

    if (dto.theme) {
      user.preferences.theme = dto.theme;
    }

    return user.save();
  }
}
