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
import { ShareableLinksRepository } from './repositories/shareable-links.repository';
import { UsersRepository } from '../users/repositories/users.repository';
import { EmailService } from '../email/email.service';
import {
  CreateMemberInvitationDto,
  CreateClientInvitationDto,
  AcceptInvitationDto,
  BulkMemberInvitationDto,
  CreateShareableLinkDto,
  AcceptShareableLinkDto,
} from './dto/invitation.dto';
import { InvitationStatus } from '../../common/constants/invitation-status.constant';
import { UserRole } from '../../common/constants/roles.constant';
import type { User } from '../users/schemas/user.schema';

@Injectable()
export class InvitationsService {
  constructor(
    private readonly invitationsRepository: InvitationsRepository,
    private readonly shareableLinksRepository: ShareableLinksRepository,
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

  // Bulk invitation method
  async bulkInviteMembers(
    dto: BulkMemberInvitationDto,
    tenantId: string,
    invitedById: string,
    inviterName: string,
    tenantName: string,
  ) {
    // Validate role for member invitation
    if (dto.role === UserRole.CLIENT) {
      throw new BadRequestException(
        'Use client invitation endpoint for CLIENT role',
      );
    }

    const results = {
      successful: [] as string[],
      failed: [] as { email: string; reason: string }[],
    };

    // Remove duplicates from the array
    const uniqueEmails = [...new Set(dto.emails.map((e) => e.toLowerCase()))];

    for (const email of uniqueEmails) {
      try {
        // Check if user already exists
        const existingUser = await this.usersRepository.findOne({
          email: email,
          tenantId: new Types.ObjectId(tenantId),
        });

        if (existingUser) {
          results.failed.push({
            email,
            reason: 'User already exists in this tenant',
          });
          continue;
        }

        // Check for pending invitation
        const pendingInvitation =
          await this.invitationsRepository.findPendingByEmail(email, tenantId);

        if (pendingInvitation) {
          results.failed.push({
            email,
            reason: 'Invitation already sent to this email',
          });
          continue;
        }

        // Generate token
        const token = crypto.randomBytes(32).toString('hex');
        const hashedToken = await bcrypt.hash(token, 10);

        // Create invitation
        const invitation = await this.invitationsRepository.create({
          tenantId: new Types.ObjectId(tenantId),
          email: email,
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
          email,
          inviterName,
          tenantName,
          inviteUrl,
        );

        results.successful.push(email);
      } catch (error) {
        results.failed.push({
          email,
          reason: error.message || 'Unknown error occurred',
        });
      }
    }

    return {
      message: `Sent ${results.successful.length} invitations, ${results.failed.length} failed`,
      successful: results.successful,
      failed: results.failed,
    };
  }

  // Shareable link methods
  async createShareableLink(
    dto: CreateShareableLinkDto,
    tenantId: string,
    createdById: string,
  ) {
    // Validate role
    if (dto.role === UserRole.CLIENT) {
      throw new BadRequestException(
        'Shareable links are only for team members (OWNER, ADMIN, MEMBER)',
      );
    }

    // Generate unique token
    const token = crypto.randomBytes(32).toString('hex');

    // Calculate expiration
    const expiresInDays = dto.expiresInDays || 7;
    const expiresAt = new Date(
      Date.now() + expiresInDays * 24 * 60 * 60 * 1000,
    );

    // Create shareable link
    const link = await this.shareableLinksRepository.create({
      tenantId: new Types.ObjectId(tenantId),
      role: dto.role,
      createdBy: new Types.ObjectId(createdById),
      token,
      expiresAt,
      isActive: true,
      maxUses: dto.maxUses || null,
      currentUses: 0,
      description: dto.description,
    } as any);

    // Generate URL
    const frontendUrl = this.configService.get<string>('frontendUrl');
    const inviteUrl = `${frontendUrl}/join?link=${token}`;

    return {
      id: link._id,
      token: link.token,
      inviteUrl,
      role: link.role,
      expiresAt: link.expiresAt,
      maxUses: link.maxUses,
      currentUses: link.currentUses,
      isActive: link.isActive,
    };
  }

  async acceptShareableLink(dto: AcceptShareableLinkDto) {
    // Find shareable link
    const link = await this.shareableLinksRepository.findByToken(dto.token);

    if (!link) {
      throw new BadRequestException('Invalid invite link');
    }

    // Validate link
    if (!link.isActive) {
      throw new BadRequestException('This invite link has been deactivated');
    }

    if (link.expiresAt < new Date()) {
      throw new BadRequestException('This invite link has expired');
    }

    if (link.maxUses && link.currentUses >= link.maxUses) {
      throw new BadRequestException(
        'This invite link has reached its maximum usage limit',
      );
    }

    // Check if email is already registered in this tenant
    const existingUser = await this.usersRepository.findOne({
      email: dto.email.toLowerCase(),
      tenantId: link.tenantId,
    });

    if (existingUser) {
      throw new ConflictException(
        'A user with this email already exists in this organization',
      );
    }

    // Check if user exists globally
    const globalUser = await this.usersRepository.findByEmailGlobal(
      dto.email.toLowerCase(),
    );

    if (globalUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Create user
    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = await this.usersRepository.create({
      tenantId: link.tenantId,
      email: dto.email.toLowerCase(),
      passwordHash: hashedPassword,
      role: link.role,
      profile: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
      },
      permissions: [],
    } as any);

    // Increment usage count
    await this.shareableLinksRepository.incrementUses(link._id.toString());

    // Send welcome email
    const frontendUrl = this.configService.get<string>('frontendUrl');
    const loginUrl = `${frontendUrl}/login`;

    await this.emailService.sendWelcomeEmail(
      user.email,
      dto.firstName,
      'ClientPortal Pro',
      loginUrl,
    );

    return {
      message: 'Successfully joined the team',
      userId: user._id,
    };
  }

  async listShareableLinks(tenantId: string) {
    return this.shareableLinksRepository.findByTenant(tenantId);
  }

  async deactivateShareableLink(linkId: string, tenantId: string) {
    const link = await this.shareableLinksRepository.findById(linkId);

    if (!link) {
      throw new NotFoundException('Shareable link not found');
    }

    if (link.tenantId.toString() !== tenantId) {
      throw new BadRequestException('Link does not belong to this tenant');
    }

    await this.shareableLinksRepository.update(linkId, {
      isActive: false,
    } as any);

    return { message: 'Shareable link deactivated successfully' };
  }
}
