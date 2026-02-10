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
import { TasksService } from './tasks.service';
import { CreateTaskDto, UpdateTaskDto } from './dto/task.dto';
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

@ApiTags('tasks')
@ApiBearerAuth()
@Controller('tasks')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard, SubscriptionGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new task' })
  @RequirePermissions('tasks:create')
  @RequiresSubscription(SubscriptionPlan.STARTER)
  @CacheInvalidate('cache::tenantId:*')
  create(
    @Body() createTaskDto: CreateTaskDto,
    @Request() req: RequestWithUser,
  ) {
    return this.tasksService.create(
      createTaskDto,
      req.user.tenantId.toString(),
      req.user._id.toString(),
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get all tasks for a project or tenant' })
  @RequirePermissions('tasks:read')
  @Cacheable(300, CacheScope.TENANT)
  findAll(
    @Request() req: RequestWithUser,
    @Query('projectId') projectId?: string,
  ) {
    return this.tasksService.findAll(req.user.tenantId.toString(), projectId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get task by ID' })
  @Cacheable(300)
  findOne(
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @Request() req: RequestWithUser,
  ) {
    return this.tasksService.findOne(
      id.toString(),
      req.user.tenantId.toString(),
    );
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update task' })
  @CacheInvalidate('cache::tenantId:*')
  update(
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @Body() updateTaskDto: UpdateTaskDto,
    @Request() req: RequestWithUser,
  ) {
    return this.tasksService.update(
      id.toString(),
      updateTaskDto,
      req.user.tenantId.toString(),
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete task' })
  @RequirePermissions('tasks:delete')
  @CacheInvalidate('cache::tenantId:*')
  remove(
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @Request() req: RequestWithUser,
  ) {
    return this.tasksService.remove(
      id.toString(),
      req.user.tenantId.toString(),
    );
  }
}
