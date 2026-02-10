import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../users/schemas/user.schema';
import {
  PresenceStatus,
  PresenceResponseDto,
  UpdatePresenceStatusDto,
} from './dto/presence.dto';

@Injectable()
export class PresenceService {
  private readonly logger = new Logger(PresenceService.name);

  // In-memory cache for active users (userId -> presence data)
  private presenceCache: Map<string, PresenceResponseDto> = new Map();

  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  /**
   * Mark user as online (called on WebSocket connection)
   */
  async setUserOnline(userId: string): Promise<void> {
    const now = new Date();

    await this.userModel
      .findByIdAndUpdate(userId, {
        $set: {
          'presence.status': PresenceStatus.ONLINE,
          'presence.lastSeen': now,
          'presence.lastHeartbeat': now,
        },
        $inc: { 'presence.activeConnections': 1 },
      })
      .exec();

    // Update cache
    await this.updatePresenceCache(userId);

    this.logger.log(`User ${userId} is now online`);
  }

  /**
   * Mark user as offline (called on WebSocket disconnection)
   */
  async setUserOffline(userId: string): Promise<void> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) return;

    const newConnectionCount = Math.max(
      0,
      (user.presence?.activeConnections || 1) - 1,
    );

    // Only set offline if no more active connections
    if (newConnectionCount === 0) {
      await this.userModel
        .findByIdAndUpdate(userId, {
          $set: {
            'presence.status': PresenceStatus.OFFLINE,
            'presence.lastSeen': new Date(),
            'presence.activeConnections': 0,
          },
        })
        .exec();

      this.logger.log(`User ${userId} is now offline`);
    } else {
      await this.userModel
        .findByIdAndUpdate(userId, {
          $set: {
            'presence.activeConnections': newConnectionCount,
          },
        })
        .exec();
    }

    // Update cache
    await this.updatePresenceCache(userId);
  }

  /**
   * Update heartbeat timestamp
   */
  async updateHeartbeat(userId: string): Promise<void> {
    const now = new Date();

    await this.userModel
      .findByIdAndUpdate(userId, {
        $set: {
          'presence.lastHeartbeat': now,
          'presence.lastSeen': now,
          'presence.status': PresenceStatus.ONLINE, // Reset to online on activity
        },
      })
      .exec();

    // Update cache
    await this.updatePresenceCache(userId);
  }

  /**
   * Manually update user status
   */
  async updateStatus(
    userId: string,
    dto: UpdatePresenceStatusDto,
  ): Promise<PresenceResponseDto> {
    await this.userModel
      .findByIdAndUpdate(userId, {
        $set: {
          'presence.status': dto.status,
          'presence.customStatus': dto.customStatus || null,
          'presence.lastSeen': new Date(),
        },
      })
      .exec();

    const presence = await this.updatePresenceCache(userId);
    // If presence is null, throw error or return a default
    if (!presence) {
      throw new Error('Failed to update presence');
    }
    return presence;
  }

  /**
   * Get user's current presence
   */
  async getUserPresence(userId: string): Promise<PresenceResponseDto | null> {
    // Try cache first
    if (this.presenceCache.has(userId)) {
      return this.presenceCache.get(userId)!;
    }

    // Fetch from database
    return this.updatePresenceCache(userId);
  }

  /**
   * Get presence for all users in a tenant
   */
  async getTenantPresence(tenantId: string): Promise<PresenceResponseDto[]> {
    const users = await this.userModel
      .find({
        tenantId: new Types.ObjectId(tenantId),
        isActive: true,
      })
      .select('_id presence')
      .lean();

    return users.map((user) => this.mapToPresenceDto(user));
  }

  /**
   * Auto-detect away users (no heartbeat for 60 seconds)
   */
  async detectAwayUsers(): Promise<void> {
    const sixtySecondsAgo = new Date(Date.now() - 60 * 1000);

    const result = await this.userModel
      .updateMany(
        {
          'presence.status': PresenceStatus.ONLINE,
          'presence.lastHeartbeat': { $lt: sixtySecondsAgo },
          'presence.activeConnections': { $gt: 0 },
        },
        {
          $set: {
            'presence.status': PresenceStatus.AWAY,
          },
        },
      )
      .exec();

    if (result.modifiedCount > 0) {
      this.logger.log(`Set ${result.modifiedCount} users to away status`);
    }
  }

  /**
   * Clean up stale connections (no heartbeat for 2 minutes)
   */
  async cleanupStaleConnections(): Promise<void> {
    const twoMinutesAgo = new Date(Date.now() - 120 * 1000);

    const result = await this.userModel
      .updateMany(
        {
          'presence.lastHeartbeat': { $lt: twoMinutesAgo },
          'presence.activeConnections': { $gt: 0 },
        },
        {
          $set: {
            'presence.status': PresenceStatus.OFFLINE,
            'presence.activeConnections': 0,
          },
        },
      )
      .exec();

    if (result.modifiedCount > 0) {
      this.logger.log(`Cleaned up ${result.modifiedCount} stale connections`);
    }
  }

  /**
   * Update presence cache for a user and return the data
   */
  private async updatePresenceCache(
    userId: string,
  ): Promise<PresenceResponseDto | null> {
    const user = await this.userModel
      .findById(userId)
      .select('_id presence')
      .lean()
      .exec();

    if (!user) {
      this.presenceCache.delete(userId);
      return null;
    }

    const presence = this.mapToPresenceDto(user);
    this.presenceCache.set(userId, presence);

    return presence;
  }

  /**
   * Map user document to presence DTO
   */
  private mapToPresenceDto(user: any): PresenceResponseDto {
    return {
      userId: user._id.toString(),
      status: user.presence?.status || PresenceStatus.OFFLINE,
      lastSeen: user.presence?.lastSeen,
      customStatus: user.presence?.customStatus,
      activeConnections: user.presence?.activeConnections || 0,
    };
  }

  /**
   * Clear presence cache (useful for testing)
   */
  clearCache(): void {
    this.presenceCache.clear();
  }
}
