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
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto, UpdateInvoiceDto } from './dto/invoice.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import {
  Cacheable,
  CacheInvalidate,
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
import { IntegrationsService } from '../integrations/integrations.service';

@ApiTags('invoices')
@ApiBearerAuth()
@Controller('invoices')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard, SubscriptionGuard)
export class InvoicesController {
  constructor(
    private readonly invoicesService: InvoicesService,
    private readonly integrationsService: IntegrationsService,
  ) {}

  @Post('export')
  @ApiOperation({ summary: 'Export invoices to Google Sheets' })
  @RequirePermissions('invoices:read')
  async export(@Request() req: RequestWithUser) {
    const invoices = await this.invoicesService.findAll(
      req.user.tenantId.toString(),
    );
    const url = await this.integrationsService.exportInvoicesToSheet(
      req.user.tenantId.toString(),
      invoices,
      req.user._id.toString(),
    );
    return { url };
  }

  @Post()
  @ApiOperation({ summary: 'Create a new invoice' })
  @RequirePermissions('invoices:create')
  @RequiresSubscription(SubscriptionPlan.STARTER)
  @CacheInvalidate('cache::tenantId:*')
  create(
    @Body() createInvoiceDto: CreateInvoiceDto,
    @Request() req: RequestWithUser,
  ) {
    return this.invoicesService.create(
      createInvoiceDto,
      req.user.tenantId.toString(),
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get all invoices for a client or tenant' })
  @RequirePermissions('invoices:read')
  @Cacheable(300)
  findAll(
    @Request() req: RequestWithUser,
    @Query('clientId') clientId?: string,
  ) {
    return this.invoicesService.findAll(req.user.tenantId.toString(), clientId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get invoice details by ID' })
  @Cacheable(300)
  findOne(
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @Request() req: RequestWithUser,
  ) {
    return this.invoicesService.findOne(
      id.toString(),
      req.user.tenantId.toString(),
    );
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update invoice' })
  @CacheInvalidate('cache::tenantId:*')
  update(
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @Body() updateInvoiceDto: UpdateInvoiceDto,
    @Request() req: RequestWithUser,
  ) {
    return this.invoicesService.update(
      id.toString(),
      updateInvoiceDto,
      req.user.tenantId.toString(),
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete/Void an invoice' })
  @RequirePermissions('invoices:delete')
  @CacheInvalidate('cache::tenantId:*')
  remove(
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @Request() req: RequestWithUser,
  ) {
    return this.invoicesService.remove(
      id.toString(),
      req.user.tenantId.toString(),
    );
  }
}
