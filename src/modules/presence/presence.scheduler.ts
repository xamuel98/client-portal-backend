import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PresenceService } from './presence.service';

@Injectable()
export class PresenceScheduler {
  private readonly logger = new Logger(PresenceScheduler.name);

  constructor(private readonly presenceService: PresenceService) {}

  /**
   * Run every minute to detect away users
   * Users with no heartbeat for 60s are marked as away
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async handleAwayDetection() {
    this.logger.debug('Running away detection...');
    await this.presenceService.detectAwayUsers();
  }

  /**
   * Run every minute to clean up stale connections
   * Users with no heartbeat for 2 minutes are marked offline
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async handleStaleConnectionCleanup() {
    this.logger.debug('Running stale connection cleanup...');
    await this.presenceService.cleanupStaleConnections();
  }
}
