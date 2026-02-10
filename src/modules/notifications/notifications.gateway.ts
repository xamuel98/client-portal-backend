import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

// Configure CORS dynamically based on environment
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'http://localhost:3000',
  'http://localhost:3001',
];

@WebSocketGateway({
  namespace: '/notifications',
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private userSockets: Map<string, Set<string>> = new Map(); // userId -> Set of socketIds

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      // Extract token from handshake
      const token =
        client.handshake.auth?.token || client.handshake.headers.authorization;

      if (!token) {
        client.disconnect();
        return;
      }

      // Verify JWT token
      const payload: { sub: string; tenantId: string } =
        await this.jwtService.verifyAsync(token.replace('Bearer ', ''), {
          secret: this.configService.getOrThrow<string>('jwt.secret'),
        });

      // Store user-socket mapping
      const userId = payload.sub;
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(client.id);

      // Store user info in socket data
      client.data.userId = userId;
      client.data.tenantId = payload.tenantId;

      console.log(`Client connected: ${client.id} (User: ${userId})`);
    } catch (error) {
      console.error('WebSocket authentication failed:', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId && this.userSockets.has(userId)) {
      this.userSockets.get(userId)!.delete(client.id);
      if (this.userSockets.get(userId)!.size === 0) {
        this.userSockets.delete(userId);
      }
    }
    console.log(`Client disconnected: ${client.id}`);
  }

  sendNotificationToUser(userId: string, tenantId: string, notification: any) {
    const socketIds = this.userSockets.get(userId);
    if (socketIds) {
      socketIds.forEach((socketId) => {
        this.server.to(socketId).emit('notification:new', notification);
      });
    }
  }

  emitNotificationRead(
    userId: string,
    tenantId: string,
    notificationId: string,
  ) {
    const socketIds = this.userSockets.get(userId);
    if (socketIds) {
      socketIds.forEach((socketId) => {
        this.server.to(socketId).emit('notification:read', { notificationId });
      });
    }
  }

  emitAllNotificationsRead(userId: string) {
    const socketIds = this.userSockets.get(userId);
    if (socketIds) {
      socketIds.forEach((socketId) => {
        this.server.to(socketId).emit('notification:read-all');
      });
    }
  }

  @SubscribeMessage('ping')
  handlePing() {
    return { event: 'pong', data: { timestamp: Date.now() } };
  }
}
