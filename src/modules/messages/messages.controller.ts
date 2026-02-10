import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  Query,
  Param,
} from '@nestjs/common';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/message.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import {
  Cacheable,
  CacheInvalidate,
  CacheScope,
} from '../cache/decorators/cache.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import type { RequestWithUser } from '../../common/interfaces/request-with-user.interface';

@ApiTags('messages')
@ApiBearerAuth()
@Controller('messages')
@UseGuards(JwtAuthGuard, TenantGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  @ApiOperation({ summary: 'Send a new message' })
  @CacheInvalidate('cache::tenantId:*')
  create(
    @Body() createMessageDto: CreateMessageDto,
    @Request() req: RequestWithUser,
  ) {
    return this.messagesService.create(
      createMessageDto,
      req.user.tenantId.toString(),
      req.user._id.toString(),
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get messages by projectId or taskId' })
  @Cacheable(300, CacheScope.TENANT)
  findAll(
    @Request() req: RequestWithUser,
    @Query('projectId') projectId?: string,
    @Query('taskId') taskId?: string,
  ) {
    return this.messagesService.findByContext(
      req.user.tenantId.toString(),
      projectId,
      taskId,
    );
  }

  @Get(':id/thread')
  @ApiOperation({ summary: 'Get a message thread' })
  getThread(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.messagesService.getThread(id, req.user.tenantId.toString());
  }
}
