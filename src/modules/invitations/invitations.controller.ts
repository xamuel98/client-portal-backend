import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { InvitationsService } from './invitations.service';
import {
  CreateMemberInvitationDto,
  CreateClientInvitationDto,
  AcceptInvitationDto,
  BulkMemberInvitationDto,
  CreateShareableLinkDto,
  AcceptShareableLinkDto,
} from './dto/invitation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../common/constants/roles.constant';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import type { RequestWithUser } from '../../common/interfaces/request-with-user.interface';
import { ConfigService } from '@nestjs/config';

@ApiTags('invitations')
@ApiBearerAuth()
@Controller('invitations')
export class InvitationsController {
  private appName: string;

  constructor(
    private readonly invitationsService: InvitationsService,
    private readonly configService: ConfigService,
  ) {
    this.appName =
      this.configService.get<string>('appName') || 'ClientPortal Pro';
  }

  @Post('member')
  @ApiOperation({ summary: 'Invite a new team member' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async inviteMember(
    @Body() dto: CreateMemberInvitationDto,
    @Request() req: RequestWithUser,
  ) {
    return this.invitationsService.inviteMember(
      dto,
      req.user.tenantId.toString(),
      req.user._id.toString(),
      `${req.user.profile.firstName} ${req.user.profile.lastName}`,
      req.tenant?.name || this.appName,
    );
  }

  @Post('client')
  @ApiOperation({ summary: 'Invite a new client user' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MEMBER)
  async inviteClient(
    @Body() dto: CreateClientInvitationDto,
    @Request() req: RequestWithUser,
  ) {
    return this.invitationsService.inviteClient(
      dto,
      req.user.tenantId.toString(),
      req.user._id.toString(),
      `${req.user.profile.firstName} ${req.user.profile.lastName}`,
      req.tenant?.name || this.appName,
    );
  }

  @Post('accept')
  @ApiOperation({ summary: 'Accept an invitation' })
  @HttpCode(HttpStatus.OK)
  async acceptInvitation(@Body() dto: AcceptInvitationDto) {
    return this.invitationsService.acceptInvitation(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all invitations for the tenant' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async listInvitations(@Request() req: RequestWithUser) {
    return this.invitationsService.listInvitations(
      req.user.tenantId.toString(),
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Revoke/Delete an invitation' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async revokeInvitation(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ) {
    return this.invitationsService.revokeInvitation(
      id,
      req.user.tenantId.toString(),
    );
  }

  @Post('member/bulk')
  @ApiOperation({ summary: 'Bulk invite team members' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async bulkInviteMembers(
    @Body() dto: BulkMemberInvitationDto,
    @Request() req: RequestWithUser,
  ) {
    return this.invitationsService.bulkInviteMembers(
      dto,
      req.user.tenantId.toString(),
      req.user._id.toString(),
      `${req.user.profile.firstName} ${req.user.profile.lastName}`,
      req.tenant?.name || this.appName,
    );
  }

  @Post('shareable-link')
  @ApiOperation({ summary: 'Create a shareable invite link' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async createShareableLink(
    @Body() dto: CreateShareableLinkDto,
    @Request() req: RequestWithUser,
  ) {
    return this.invitationsService.createShareableLink(
      dto,
      req.user.tenantId.toString(),
      req.user._id.toString(),
    );
  }

  @Get('shareable-links')
  @ApiOperation({ summary: 'List all shareable links for the tenant' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async listShareableLinks(@Request() req: RequestWithUser) {
    return this.invitationsService.listShareableLinks(
      req.user.tenantId.toString(),
    );
  }

  @Post('shareable-link/accept')
  @ApiOperation({ summary: 'Accept a shareable link invitation' })
  @HttpCode(HttpStatus.OK)
  async acceptShareableLink(@Body() dto: AcceptShareableLinkDto) {
    return this.invitationsService.acceptShareableLink(dto);
  }

  @Delete('shareable-link/:id')
  @ApiOperation({ summary: 'Deactivate a shareable link' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async deactivateShareableLink(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ) {
    return this.invitationsService.deactivateShareableLink(
      id,
      req.user.tenantId.toString(),
    );
  }
}
