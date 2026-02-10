import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { Types } from 'mongoose';
import { NotificationsRepository } from './repositories/notifications.repository';
import { NotificationsGateway } from './notifications.gateway';
import {
  CreateNotificationDto,
  QueryNotificationsDto,
} from './dto/notification.dto';
import { EmailService } from '../email/email.service';
import { UsersRepository } from '../users/repositories/users.repository';
import { ConfigService } from '@nestjs/config';
import { NotificationChannel } from '../../common/constants/notification-type.constant';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly notificationsRepository: NotificationsRepository,
    @Inject(forwardRef(() => NotificationsGateway))
    private readonly notificationsGateway: NotificationsGateway,
    private readonly emailService: EmailService,
    private readonly usersRepository: UsersRepository,
    private readonly configService: ConfigService,
  ) {}

  async create(dto: CreateNotificationDto, userId: string, tenantId: string) {
    const notification = await this.notificationsRepository.create({
      tenantId: new Types.ObjectId(tenantId),
      userId: new Types.ObjectId(userId),
      type: dto.type,
      title: dto.title,
      message: dto.message,
      metadata: dto.metadata,
      channels: dto.channels,
      read: false,
    } as any);

    // Emit real-time notification via WebSocket
    if (dto.channels?.includes(NotificationChannel.IN_APP)) {
      this.notificationsGateway.sendNotificationToUser(
        userId,
        tenantId,
        notification,
      );
    }

    // Send email notification if requested
    if (dto.channels?.includes(NotificationChannel.EMAIL)) {
      try {
        // Fetch user to get email and preferences
        const user = await this.usersRepository.findById(userId);

        if (!user) {
          console.warn(`User ${userId} not found for email notification`);
          return notification;
        }

        // Check if user has email notifications enabled
        const emailEnabled = user.preferences?.notifications?.email ?? true;

        if (!emailEnabled) {
          console.log(`Email notifications disabled for user ${userId}`);
          return notification;
        }

        // Generate action URL based on notification type
        const actionUrl = this.generateActionUrl(dto.type, dto.metadata);

        // Send email notification
        await this.emailService.sendNotificationEmail(
          user.email,
          dto.title,
          dto.message,
          dto.metadata,
          actionUrl,
          this.getActionText(dto.type),
        );
      } catch (error) {
        // Log error but don't fail the notification creation
        console.error('Failed to send email notification:', error);
      }
    }

    return notification;
  }

  private generateActionUrl(
    type: string,
    metadata?: Record<string, any>,
  ): string | undefined {
    const frontendUrl = this.configService.get<string>('frontendUrl');

    if (!frontendUrl || !metadata) return undefined;

    // Generate URLs based on notification type
    switch (type) {
      case 'task_assigned':
      case 'task_completed':
      case 'task_updated':
        return metadata.taskId
          ? `${frontendUrl}/tasks/${metadata.taskId}`
          : undefined;

      case 'message_received':
        return metadata.conversationId
          ? `${frontendUrl}/messages/${metadata.conversationId}`
          : undefined;

      case 'invoice_sent':
      case 'invoice_paid':
      case 'invoice_overdue':
        return metadata.invoiceId
          ? `${frontendUrl}/invoices/${metadata.invoiceId}`
          : undefined;

      case 'project_created':
      case 'project_updated':
      case 'project_completed':
        return metadata.projectId
          ? `${frontendUrl}/projects/${metadata.projectId}`
          : undefined;

      case 'invitation_received':
        return metadata.invitationToken
          ? `${frontendUrl}/accept-invite?token=${metadata.invitationToken}`
          : undefined;

      case 'file_uploaded':
      case 'file_shared':
        return metadata.fileId
          ? `${frontendUrl}/files/${metadata.fileId}`
          : undefined;

      default:
        return `${frontendUrl}/notifications`;
    }
  }

  private getActionText(type: string): string {
    switch (type) {
      case 'task_assigned':
        return 'View Task';
      case 'message_received':
        return 'View Message';
      case 'invoice_sent':
      case 'invoice_paid':
        return 'View Invoice';
      case 'project_updated':
        return 'View Project';
      case 'invitation_received':
        return 'Accept Invitation';
      case 'file_uploaded':
        return 'View File';
      default:
        return 'View Details';
    }
  }

  async getNotifications(
    userId: string,
    tenantId: string,
    query: QueryNotificationsDto,
  ) {
    if (query.unreadOnly) {
      return this.notificationsRepository.findUnread(userId, tenantId);
    }

    if (query.type) {
      return this.notificationsRepository.find({
        userId: new Types.ObjectId(userId),
        tenantId: new Types.ObjectId(tenantId),
        type: query.type,
      });
    }

    return this.notificationsRepository.findByUser(
      userId,
      tenantId,
      query.limit,
    );
  }

  async getUnreadCount(userId: string, tenantId: string) {
    const count = await this.notificationsRepository.getUnreadCount(
      userId,
      tenantId,
    );
    return { count };
  }

  async markAsRead(id: string, userId: string, tenantId: string) {
    const notification = await this.notificationsRepository.findById(id);

    if (!notification) {
      throw new Error('Notification not found');
    }

    if (
      notification.userId.toString() !== userId ||
      notification.tenantId.toString() !== tenantId
    ) {
      throw new Error('Unauthorized');
    }

    const updated = await this.notificationsRepository.markAsRead(id);

    // Emit read event via WebSocket
    this.notificationsGateway.emitNotificationRead(userId, tenantId, id);

    return updated;
  }

  async markAllAsRead(userId: string, tenantId: string) {
    const result = await this.notificationsRepository.markAllAsRead(
      userId,
      tenantId,
    );

    // Emit read all event via WebSocket
    this.notificationsGateway.emitAllNotificationsRead(userId);

    return result;
  }

  async deleteNotification(id: string, userId: string, tenantId: string) {
    const notification = await this.notificationsRepository.findById(id);

    if (!notification) {
      throw new Error('Notification not found');
    }

    if (
      notification.userId.toString() !== userId ||
      notification.tenantId.toString() !== tenantId
    ) {
      throw new Error('Unauthorized');
    }

    await this.notificationsRepository.delete(id);
    return { message: 'Notification deleted successfully' };
  }
}
