import {
  Controller,
  Post,
  Patch,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApprovalFlowService } from './approval-flow.service';
import {
  CreateApprovalRequestDto,
  UpdateApprovalStatusDto,
} from './dto/approval-request.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import type { RequestWithUser } from '../../common/interfaces/request-with-user.interface';

@ApiTags('approval-flow')
@ApiBearerAuth()
@Controller('approval-requests')
@UseGuards(JwtAuthGuard)
export class ApprovalFlowController {
  constructor(private readonly approvalFlowService: ApprovalFlowService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new approval request' })
  async createRequest(
    @Body() dto: CreateApprovalRequestDto,
    @Request() req: RequestWithUser,
  ) {
    return this.approvalFlowService.createRequest(
      req.user._id.toString(),
      req.user.tenantId.toString(),
      dto,
    );
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update approval request status (approve/reject)' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateApprovalStatusDto,
    @Request() req: RequestWithUser,
  ) {
    return this.approvalFlowService.updateStatus(
      req.user._id.toString(),
      req.user.tenantId.toString(),
      id,
      dto,
    );
  }

  @Get('me')
  @ApiOperation({
    summary: 'Get approval requests related to the current user',
  })
  async getMyRequests(@Request() req: RequestWithUser) {
    return this.approvalFlowService.getMyRequests(
      req.user._id.toString(),
      req.user.tenantId.toString(),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get approval request details' })
  async getRequestById(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ) {
    return this.approvalFlowService.getRequestById(
      id,
      req.user.tenantId.toString(),
    );
  }
}
