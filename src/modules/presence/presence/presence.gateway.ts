import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PresenceService } from '../presence.service';
import { PresenceStatus, UpdatePresenceStatusDto } from '../dto/presence.dto';

// Configure CORS dynamically based on environment
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'http://localhost:3000',
  'http://localhost:3001',
];

@WebSocketGateway({
  namespace: '/presence',
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
})
export class PresenceGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(PresenceGateway.name);
  private userSockets: Map<string, Set<string>> = new Map(); // userId -> Set of socketIds
  private tenantUsers: Map<string, Set<string>> = new Map(); // tenantId -> Set of userIds

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly presenceService: PresenceService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      // Extract token from handshake
      const token =
        client.handshake.auth?.token || client.handshake.headers.authorization;

      if (!token) {
        this.logger.warn('Connection rejected: No token provided');
        client.disconnect();
        return;
      }

      // Verify JWT token
      const payload: { sub: string; tenantId: string } =
        await this.jwtService.verifyAsync(token.replace('Bearer ', ''), {
          secret: this.configService.getOrThrow<string>('jwt.secret'),
        });

      const userId = payload.sub;
      const tenantId = payload.tenantId;

      // Store user-socket mapping
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(client.id);

      // Store tenant-user mapping
      if (!this.tenantUsers.has(tenantId)) {
        this.tenantUsers.set(tenantId, new Set());
      }
      this.tenantUsers.get(tenantId)!.add(userId);

      // Store user info in socket data
      client.data.userId = userId;
      client.data.tenantId = tenantId;

      // Mark user as online
      await this.presenceService.setUserOnline(userId);

      // Get user's current presence
      const presence = await this.presenceService.getUserPresence(userId);

      // Notify user of their current presence
      client.emit('presence:init', presence);

      // Broadcast to tenant that user is online
      await this.broadcastPresenceChange(userId, tenantId);

      // Send bulk presence to newly connected user
      const tenantPresences =
        await this.presenceService.getTenantPresence(tenantId);
      client.emit('presence:bulk', { presences: tenantPresences });

      this.logger.log(`User ${userId} connected to presence`);
    } catch (error) {
      this.logger.error('WebSocket authentication failed:', error);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    const tenantId = client.data.tenantId;

    if (userId && this.userSockets.has(userId)) {
      this.userSockets.get(userId)!.delete(client.id);

      // If no more sockets for this user, mark as offline
      if (this.userSockets.get(userId)!.size === 0) {
        this.userSockets.delete(userId);
        await this.presenceService.setUserOffline(userId);

        // Broadcast offline status
        if (tenantId) {
          await this.broadcastPresenceChange(userId, tenantId);
        }

        this.logger.log(`User ${userId} disconnected from presence`);
      }
    }
  }

  @SubscribeMessage('presence:heartbeat')
  async handleHeartbeat(@ConnectedSocket() client: Socket) {
    const userId = client.data.userId;
    const tenantId = client.data.tenantId;

    if (!userId) return;

    await this.presenceService.updateHeartbeat(userId);

    // Optionally broadcast if status changed from away to online
    const presence = await this.presenceService.getUserPresence(userId);
    if (presence?.status === PresenceStatus.ONLINE) {
      await this.broadcastPresenceChange(userId, tenantId);
    }

    return { success: true, timestamp: Date.now() };
  }

  @SubscribeMessage('presence:status-change')
  async handleStatusChange(
    @MessageBody() dto: UpdatePresenceStatusDto,
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.userId;
    const tenantId = client.data.tenantId;

    if (!userId) return { success: false, error: 'Not authenticated' };

    const presence = await this.presenceService.updateStatus(userId, dto);

    // Broadcast to tenant
    await this.broadcastPresenceChange(userId, tenantId);

    return { success: true, presence };
  }

  /**
   * Broadcast presence change to all users in the same tenant
   */
  private async broadcastPresenceChange(
    userId: string,
    tenantId: string,
  ): Promise<void> {
    const presence = await this.presenceService.getUserPresence(userId);

    if (!presence || !tenantId) return;

    // Get all users in tenant
    const tenantUserIds = this.tenantUsers.get(tenantId);
    if (!tenantUserIds) return;

    // Broadcast to all connected users in tenant (except the user themselves)
    for (const tenantUserId of tenantUserIds) {
      if (tenantUserId === userId) continue; // Don't send to self

      const socketIds = this.userSockets.get(tenantUserId);
      if (socketIds) {
        for (const socketId of socketIds) {
          this.server.to(socketId).emit('presence:changed', presence);
        }
      }
    }
  }

  /**
   * Public method to broadcast presence change (called from service/scheduler)
   */
  async broadcastPresenceUpdate(
    userId: string,
    tenantId: string,
  ): Promise<void> {
    await this.broadcastPresenceChange(userId, tenantId);
  }
}
