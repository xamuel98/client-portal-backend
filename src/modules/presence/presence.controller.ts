import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PresenceService } from './presence.service';
import {
  UpdatePresenceStatusDto,
  PresenceResponseDto,
  BulkPresenceResponseDto,
} from './dto/presence.dto';
import type { RequestWithUser } from '../../common/interfaces/request-with-user.interface';

@ApiTags('presence')
@ApiBearerAuth()
@Controller('presence')
@UseGuards(JwtAuthGuard)
export class PresenceController {
  constructor(private readonly presenceService: PresenceService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get own presence status' })
  async getMyPresence(
    @Request() req: RequestWithUser,
  ): Promise<PresenceResponseDto | null> {
    return this.presenceService.getUserPresence(req.user._id.toString());
  }

  @Get('user/:id')
  @ApiOperation({ summary: 'Get specific user presence status' })
  async getUserPresence(
    @Param('id') userId: string,
  ): Promise<PresenceResponseDto | null> {
    return this.presenceService.getUserPresence(userId);
  }

  @Get('team')
  @ApiOperation({ summary: 'Get presence for all team members' })
  async getTeamPresence(
    @Request() req: RequestWithUser,
  ): Promise<BulkPresenceResponseDto> {
    const presences = await this.presenceService.getTenantPresence(
      req.user.tenantId.toString(),
    );
    return { presences };
  }

  @Patch('status')
  @ApiOperation({ summary: 'Update own presence status' })
  async updateStatus(
    @Body() dto: UpdatePresenceStatusDto,
    @Request() req: RequestWithUser,
  ): Promise<PresenceResponseDto> {
    return this.presenceService.updateStatus(req.user._id.toString(), dto);
  }
}
