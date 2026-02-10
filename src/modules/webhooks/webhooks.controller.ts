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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WebhooksService } from './webhooks.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import type { RequestWithUser } from '../../common/interfaces/request-with-user.interface';

@ApiTags('Webhooks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post()
  @ApiOperation({ summary: 'Register a new webhook subscription' })
  create(@Request() req: RequestWithUser, @Body() data: any) {
    return this.webhooksService.create(req.user.tenantId.toString(), data);
  }

  @Get()
  @ApiOperation({ summary: 'List all webhook subscriptions for the tenant' })
  findAll(@Request() req: RequestWithUser) {
    return this.webhooksService.findAll(req.user.tenantId.toString());
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a webhook subscription by ID' })
  findOne(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.webhooksService.findOne(id, req.user.tenantId.toString());
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a webhook subscription' })
  update(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
    @Body() data: any,
  ) {
    return this.webhooksService.update(id, req.user.tenantId.toString(), data);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove a webhook subscription' })
  remove(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.webhooksService.remove(id, req.user.tenantId.toString());
  }
}
