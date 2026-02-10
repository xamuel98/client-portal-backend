import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Types } from 'mongoose';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { InvitationsRepository } from './repositories/invitations.repository';
import { UsersRepository } from '../users/repositories/users.repository';
import { EmailService } from '../email/email.service';
import {
  CreateMemberInvitationDto,
  CreateClientInvitationDto,
  AcceptInvitationDto,
} from './dto/invitation.dto';
import { InvitationStatus } from '../../common/constants/invitation-status.constant';
import { UserRole } from '../../common/constants/roles.constant';
import type { User } from '../users/schemas/user.schema';

@Injectable()
export class InvitationsService {
  constructor(
    private readonly invitationsRepository: InvitationsRepository,
    private readonly usersRepository: UsersRepository,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  async inviteMember(
    dto: CreateMemberInvitationDto,
    tenantId: string,
    invitedById: string,
    inviterName: string,
    tenantName: string,
  ) {
    // Check if user already exists
    const existingUser = await this.usersRepository.findOne({
      email: dto.email.toLowerCase(),
      tenantId: new Types.ObjectId(tenantId),
    });

    if (existingUser) {
      throw new ConflictException('User already exists in this tenant');
    }

    // Check for pending invitation
    const pendingInvitation =
      await this.invitationsRepository.findPendingByEmail(dto.email, tenantId);

    if (pendingInvitation) {
      throw new ConflictException('Invitation already sent to this email');
    }

    // Validate role for member invitation
    if (dto.role === UserRole.CLIENT) {
      throw new BadRequestException(
        'Use client invitation endpoint for CLIENT role',
      );
    }

    // Generate token
    const token = crypto.randomBytes(32).toString('hex');
    const hashedToken = await bcrypt.hash(token, 10);

    // Create invitation
    const invitation = await this.invitationsRepository.create({
      tenantId: new Types.ObjectId(tenantId),
      email: dto.email.toLowerCase(),
      role: dto.role,
      invitedBy: new Types.ObjectId(invitedById),
      token: hashedToken,
      status: InvitationStatus.PENDING,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    } as any);

    // Send invitation email
    const frontendUrl = this.configService.get<string>('frontendUrl');
    const inviteUrl = `${frontendUrl}/accept-invite?token=${token}`;

    await this.emailService.sendMemberInvitation(
      dto.email,
      inviterName,
      tenantName,
      inviteUrl,
    );

    return {
      id: invitation._id,
      email: invitation.email,
      role: invitation.role,
      expiresAt: invitation.expiresAt,
    };
  }

  async inviteClient(
    dto: CreateClientInvitationDto,
    tenantId: string,
    invitedById: string,
    inviterName: string,
    tenantName: string,
  ) {
    // Check if user already exists
    const existingUser = await this.usersRepository.findOne({
      email: dto.email.toLowerCase(),
      tenantId: new Types.ObjectId(tenantId),
    });

    if (existingUser) {
      throw new ConflictException('User already exists in this tenant');
    }

    // Check for pending invitation
    const pendingInvitation =
      await this.invitationsRepository.findPendingByEmail(dto.email, tenantId);

    if (pendingInvitation) {
      throw new ConflictException('Invitation already sent to this email');
    }

    // Generate token
    const token = crypto.randomBytes(32).toString('hex');
    const hashedToken = await bcrypt.hash(token, 10);

    // Create invitation
    const projectIds = dto.projectIds
      ? dto.projectIds.map((id) => new Types.ObjectId(id))
      : [];

    const invitation = await this.invitationsRepository.create({
      tenantId: new Types.ObjectId(tenantId),
      email: dto.email.toLowerCase(),
      role: UserRole.CLIENT,
      invitedBy: new Types.ObjectId(invitedById),
      token: hashedToken,
      status: InvitationStatus.PENDING,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      projectIds,
    } as any);

    // Send invitation email
    const frontendUrl = this.configService.get<string>('frontendUrl');
    const inviteUrl = `${frontendUrl}/accept-invite?token=${token}`;

    await this.emailService.sendClientInvitation(
      dto.email,
      inviterName,
      tenantName,
      inviteUrl,
    );

    return {
      id: invitation._id,
      email: invitation.email,
      role: invitation.role,
      expiresAt: invitation.expiresAt,
    };
  }

  async acceptInvitation(dto: AcceptInvitationDto) {
    // Find invitation by raw token
    const invitations = await this.invitationsRepository.find({
      status: InvitationStatus.PENDING,
      expiresAt: { $gt: new Date() },
    });

    let invitation = null;
    for (const inv of invitations) {
      const isMatch = await bcrypt.compare(dto.token, inv.token);
      if (isMatch) {
        invitation = inv;
        break;
      }
    }

    if (!invitation) {
      throw new BadRequestException('Invalid or expired invitation');
    }

    // Check if user already exists globally
    const existingUser = await this.usersRepository.findByEmailGlobal(
      invitation.email,
    );

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Create user
    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = await this.usersRepository.create({
      tenantId: invitation.tenantId,
      email: invitation.email,
      passwordHash: hashedPassword,
      role: invitation.role,
      profile: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
      },
      permissions: [],
    } as any);

    // Mark invitation as accepted
    await this.invitationsRepository.update(invitation._id.toString(), {
      status: InvitationStatus.ACCEPTED,
      acceptedAt: new Date(),
    } as any);

    // Send welcome email
    const frontendUrl = this.configService.get<string>('frontendUrl');
    const loginUrl = `${frontendUrl}/login`;

    // Get tenant name for welcome email
    const tenant = await this.usersRepository.findById(
      invitation.tenantId.toString(),
    );

    await this.emailService.sendWelcomeEmail(
      user.email,
      dto.firstName,
      'ClientPortal Pro', // You might want to fetch actual tenant name
      loginUrl,
    );

    return {
      message: 'Invitation accepted successfully',
      userId: user._id,
    };
  }

  async listInvitations(tenantId: string) {
    return this.invitationsRepository.findByTenant(tenantId);
  }

  async revokeInvitation(invitationId: string, tenantId: string) {
    const invitation = await this.invitationsRepository.findById(invitationId);

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.tenantId.toString() !== tenantId) {
      throw new BadRequestException(
        'Invitation does not belong to this tenant',
      );
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException('Only pending invitations can be revoked');
    }

    await this.invitationsRepository.update(invitationId, {
      status: InvitationStatus.REVOKED,
    } as any);

    return { message: 'Invitation revoked successfully' };
  }
}
