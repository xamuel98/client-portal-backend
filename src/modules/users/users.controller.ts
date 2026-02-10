import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import {
  UpdateProfileDto,
  UpdatePreferencesDto,
  UpdateUserAccessDto,
} from './dto/update-user.dto';
import { Param } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { UserRole } from '../../common/constants/roles.constant';
import type { RequestWithUser } from '../../common/interfaces/request-with-user.interface';
import {
  Cacheable,
  CacheInvalidate,
} from '../cache/decorators/cache.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @Cacheable(60)
  async getMe(@Request() req: RequestWithUser) {
    return this.usersService.getMe(req.user._id.toString());
  }

  @Get()
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @RequirePermissions('users:read')
  @ApiOperation({ summary: 'List all users in the tenant' })
  async findAll(@Request() req: RequestWithUser) {
    return this.usersService.findAll(req.user.tenantId.toString());
  }

  @Patch(':id/access')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @RequirePermissions('users:manage')
  @ApiOperation({ summary: 'Update user roles and permissions' })
  async updateAccess(
    @Param('id') userId: string,
    @Body() dto: UpdateUserAccessDto,
    @Request() req: RequestWithUser,
  ) {
    return this.usersService.updateAccess(
      userId,
      req.user.tenantId.toString(),
      dto,
    );
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update current user profile' })
  @CacheInvalidate('cache::tenantId:*')
  async updateProfile(
    @Request() req: RequestWithUser,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(req.user._id.toString(), dto);
  }

  @Patch('preferences')
  @ApiOperation({ summary: 'Update user preferences' })
  @CacheInvalidate('cache::tenantId:*')
  async updatePreferences(
    @Request() req: RequestWithUser,
    @Body() dto: UpdatePreferencesDto,
  ) {
    return this.usersService.updatePreferences(req.user._id.toString(), dto);
  }

  @Patch('avatar')
  @ApiOperation({ summary: 'Update user avatar' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        avatar: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('avatar'))
  @CacheInvalidate('cache::tenantId:*')
  async updateAvatar(
    @Request() req: RequestWithUser,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: '.(png|jpeg|jpg)' }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.usersService.updateAvatar(
      req.user._id.toString(),
      file,
      req.user.tenantId.toString(),
    );
  }
}
