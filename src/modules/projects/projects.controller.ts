import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto, UpdateProjectDto } from './dto/project.dto';
import { ProjectQueryDto } from './dto/project-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import {
  Cacheable,
  CacheInvalidate,
  CacheScope,
} from '../cache/decorators/cache.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import type { RequestWithUser } from '../../common/interfaces/request-with-user.interface';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import { Types } from 'mongoose';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { SubscriptionGuard } from '../../common/guards/subscription.guard';
import { RequiresSubscription } from '../../common/decorators/subscription.decorator';
import { SubscriptionPlan } from '../../common/constants/subscription-plans.constant';

@ApiTags('projects')
@ApiBearerAuth()
@Controller('projects')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard, SubscriptionGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new project' })
  @RequirePermissions('projects:create')
  @RequiresSubscription(SubscriptionPlan.STARTER)
  @CacheInvalidate('cache::tenantId:*')
  create(
    @Body() createProjectDto: CreateProjectDto,
    @Request() req: RequestWithUser,
  ) {
    return this.projectsService.create(
      createProjectDto,
      req.user.tenantId.toString(),
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get all projects for the current tenant' })
  @RequirePermissions('projects:read')
  @Cacheable(300, CacheScope.TENANT)
  findAll(@Request() req: RequestWithUser, @Query() query: ProjectQueryDto) {
    return this.projectsService.findAll(req.user.tenantId.toString(), query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get project by ID' })
  @Cacheable(300)
  findOne(
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @Request() req: RequestWithUser,
  ) {
    return this.projectsService.findOne(
      id.toString(),
      req.user.tenantId.toString(),
    );
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update project' })
  @CacheInvalidate('cache::tenantId:*')
  update(
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @Body() updateProjectDto: UpdateProjectDto,
    @Request() req: RequestWithUser,
  ) {
    return this.projectsService.update(
      id.toString(),
      updateProjectDto,
      req.user.tenantId.toString(),
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete project' })
  @RequirePermissions('projects:delete')
  @CacheInvalidate('cache::tenantId:*')
  remove(
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @Request() req: RequestWithUser,
  ) {
    return this.projectsService.remove(
      id.toString(),
      req.user.tenantId.toString(),
    );
  }
}
