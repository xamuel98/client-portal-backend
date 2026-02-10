import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ActivityLogsService } from './activity-logs.service';
import { QueryActivityLogsDto } from './dto/activity-log.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../common/constants/roles.constant';
import { ActivityEntity } from '../../common/constants/activity-action.constant';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Cacheable } from '../cache/decorators/cache.decorator';
import type { RequestWithUser } from '../../common/interfaces/request-with-user.interface';

@ApiTags('activity-logs')
@ApiBearerAuth()
@Controller('activity-logs')
@UseGuards(JwtAuthGuard)
export class ActivityLogsController {
  constructor(private readonly activityLogsService: ActivityLogsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all activity logs for the tenant' })
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Cacheable(300)
  async getActivityLogs(
    @Query() query: QueryActivityLogsDto,
    @Request() req: RequestWithUser,
  ) {
    return this.activityLogsService.getActivityLogs(
      req.user.tenantId.toString(),
      query,
    );
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user activity logs' })
  @Cacheable(60)
  async getMyActivity(@Request() req: RequestWithUser) {
    return this.activityLogsService.getUserActivity(
      req.user._id.toString(),
      req.user.tenantId.toString(),
    );
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get activity logs for a specific user' })
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async getUserActivity(
    @Param('userId') userId: string,
    @Request() req: RequestWithUser,
  ) {
    return this.activityLogsService.getUserActivity(
      userId,
      req.user.tenantId.toString(),
    );
  }

  @Get('entity/:entity/:id')
  @ApiOperation({ summary: 'Get activity history for a specific entity' })
  @Cacheable(300)
  async getEntityHistory(
    @Param('entity') entity: ActivityEntity,
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ) {
    return this.activityLogsService.getEntityHistory(
      entity,
      id,
      req.user.tenantId.toString(),
    );
  }

  @Get('recent')
  @ApiOperation({ summary: 'Get recent activities for the tenant dashboard' })
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Cacheable(60)
  async getRecentActivity(@Request() req: RequestWithUser) {
    return this.activityLogsService.getRecentActivity(
      req.user.tenantId.toString(),
    );
  }
}
