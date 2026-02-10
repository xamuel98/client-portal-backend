import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { QueryNotificationsDto } from './dto/notification.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  Cacheable,
  CacheInvalidate,
} from '../cache/decorators/cache.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import type { RequestWithUser } from '../../common/interfaces/request-with-user.interface';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all notifications for the current user' })
  @Cacheable(60)
  async getNotifications(
    @Query() query: QueryNotificationsDto,
    @Request() req: RequestWithUser,
  ) {
    return this.notificationsService.getNotifications(
      req.user._id.toString(),
      req.user.tenantId.toString(),
      query,
    );
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get count of unread notifications' })
  async getUnreadCount(@Request() req: RequestWithUser) {
    return this.notificationsService.getUnreadCount(
      req.user._id.toString(),
      req.user.tenantId.toString(),
    );
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  @HttpCode(HttpStatus.OK)
  @CacheInvalidate('cache::tenantId:*')
  async markAsRead(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.notificationsService.markAsRead(
      id,
      req.user._id.toString(),
      req.user.tenantId.toString(),
    );
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @HttpCode(HttpStatus.OK)
  @CacheInvalidate('cache::tenantId:*')
  async markAllAsRead(@Request() req: RequestWithUser) {
    return this.notificationsService.markAllAsRead(
      req.user._id.toString(),
      req.user.tenantId.toString(),
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a notification' })
  @CacheInvalidate('cache::tenantId:*')
  async deleteNotification(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ) {
    return this.notificationsService.deleteNotification(
      id,
      req.user._id.toString(),
      req.user.tenantId.toString(),
    );
  }
}
