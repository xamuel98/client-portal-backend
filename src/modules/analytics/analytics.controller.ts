import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import {
  DateRangeDto,
  RevenueAnalyticsQueryDto,
  ProjectAnalyticsQueryDto,
} from './dto/analytics.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../common/constants/roles.constant';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Cacheable, CacheScope } from '../cache/decorators/cache.decorator';
import type { RequestWithUser } from '../../common/interfaces/request-with-user.interface';

@ApiTags('analytics')
@ApiBearerAuth()
@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get overall dashboard metrics' })
  @Cacheable(900, CacheScope.TENANT)
  async getDashboardMetrics(@Request() req: RequestWithUser) {
    return this.analyticsService.getDashboardMetrics(
      req.user.tenantId.toString(),
    );
  }

  @Get('projects')
  @ApiOperation({ summary: 'Get project-specific analytics' })
  @Cacheable(900, CacheScope.TENANT)
  async getProjectAnalytics(
    @Query() query: ProjectAnalyticsQueryDto,
    @Request() req: RequestWithUser,
  ) {
    return this.analyticsService.getProjectAnalytics(
      req.user.tenantId.toString(),
      query,
    );
  }

  @Get('projects/:id')
  @ApiOperation({ summary: 'Get detailed analytics for a single project' })
  @Cacheable(300)
  async getProjectById(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ) {
    return this.analyticsService.getProjectById(
      id,
      req.user.tenantId.toString(),
    );
  }

  @Get('users')
  @ApiOperation({ summary: 'Get user participation and activity analytics' })
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Cacheable(900)
  async getUserActivityAnalytics(
    @Query() query: DateRangeDto,
    @Request() req: RequestWithUser,
  ) {
    return this.analyticsService.getUserActivityAnalytics(
      req.user.tenantId.toString(),
      query,
    );
  }

  @Get('revenue')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get revenue and invoice analytics' })
  @Cacheable(900, CacheScope.TENANT)
  async getRevenueAnalytics(
    @Query() query: RevenueAnalyticsQueryDto,
    @Request() req: RequestWithUser,
  ) {
    return this.analyticsService.getRevenueAnalytics(
      req.user.tenantId.toString(),
      query,
    );
  }
}
