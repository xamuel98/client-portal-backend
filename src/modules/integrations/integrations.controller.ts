import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Request,
  Redirect,
  Delete,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IntegrationsService } from './integrations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { RequestWithUser } from '../../common/interfaces/request-with-user.interface';

@ApiTags('integrations')
@ApiBearerAuth()
@Controller('integrations')
@UseGuards(JwtAuthGuard)
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @Get('auth-url')
  @ApiOperation({ summary: 'Generate OAuth2 auth URL for a service' })
  getAuthUrl(@Query('service') service: string, @Request() req: any) {
    const userReq = req as RequestWithUser;
    return {
      url: this.integrationsService.generateAuthUrl(
        service,
        userReq.user.tenantId.toString(),
        userReq.user._id.toString(),
      ),
    };
  }

  @Get('callback')
  @ApiOperation({ summary: 'Handle OAuth2 callback' })
  async handleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
  ) {
    await this.integrationsService.handleCallback(code, state);
    return { success: true, message: 'Integration successful' };
  }
}
