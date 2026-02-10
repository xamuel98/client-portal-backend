import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ActivityLogsService } from '../../modules/activity-logs/activity-logs.service';
import {
  ActivityAction,
  ActivityEntity,
} from '../constants/activity-action.constant';

@Injectable()
export class ActivityLoggingInterceptor implements NestInterceptor {
  constructor(private readonly activityLogsService: ActivityLogsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, user, ip, headers } = request;

    // Skip logging for GET requests and health checks
    if (method === 'GET' || url.includes('/health')) {
      return next.handle();
    }

    // Extract action and entity from URL
    const { action, entity, entityId } = this.extractActivityInfo(method, url);

    if (!action || !entity || !user) {
      return next.handle();
    }

    return next.handle().pipe(
      tap({
        next: () => {
          // Log successful operation
          this.activityLogsService
            .log(
              {
                action,
                entity,
                entityId,
                metadata: { method, url },
              },
              user.tenantId?.toString(),
              user._id?.toString(),
              ip,
              headers['user-agent'],
            )
            .catch((err) => console.error('Failed to log activity:', err));
        },
        error: (error) => {
          // Optionally log failed operations
          this.activityLogsService
            .log(
              {
                action,
                entity,
                entityId,
                metadata: { method, url, error: error.message },
              },
              user.tenantId?.toString(),
              user._id?.toString(),
              ip,
              headers['user-agent'],
            )
            .catch((err) => console.error('Failed to log activity:', err));
        },
      }),
    );
  }

  private extractActivityInfo(
    method: string,
    url: string,
  ): { action?: ActivityAction; entity?: ActivityEntity; entityId?: string } {
    // Map HTTP methods to actions
    const actionMap: Record<string, ActivityAction> = {
      POST: ActivityAction.CREATE,
      PUT: ActivityAction.UPDATE,
      PATCH: ActivityAction.UPDATE,
      DELETE: ActivityAction.DELETE,
    };

    // Extract entity from URL
    const urlParts = url
      .split('/')
      .filter((part) => part && !part.includes('?'));

    // Map URL segments to entities
    const entityMap: Record<string, ActivityEntity> = {
      users: ActivityEntity.USER,
      projects: ActivityEntity.PROJECT,
      tasks: ActivityEntity.TASK,
      files: ActivityEntity.FILE,
      messages: ActivityEntity.MESSAGE,
      invoices: ActivityEntity.INVOICE,
      invitations: ActivityEntity.INVITATION,
    };

    let entity: ActivityEntity | undefined;
    let entityId: string | undefined;

    // Find entity in URL
    for (let i = 0; i < urlParts.length; i++) {
      if (entityMap[urlParts[i]]) {
        entity = entityMap[urlParts[i]];
        // Check if next part is an ID
        if (
          i + 1 < urlParts.length &&
          urlParts[i + 1].match(/^[a-f\d]{24}$/i)
        ) {
          entityId = urlParts[i + 1];
        }
        break;
      }
    }

    // Special cases
    if (url.includes('/auth/login')) {
      return { action: ActivityAction.LOGIN, entity: ActivityEntity.USER };
    }
    if (url.includes('/auth/register')) {
      return { action: ActivityAction.REGISTER, entity: ActivityEntity.USER };
    }
    if (url.includes('/invitations/accept')) {
      return {
        action: ActivityAction.ACCEPT_INVITE,
        entity: ActivityEntity.INVITATION,
      };
    }
    if (url.includes('/invitations') && method === 'POST') {
      return {
        action: ActivityAction.INVITE,
        entity: ActivityEntity.INVITATION,
      };
    }

    return {
      action: actionMap[method],
      entity,
      entityId,
    };
  }
}
