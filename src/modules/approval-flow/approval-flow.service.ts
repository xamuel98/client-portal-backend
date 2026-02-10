import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Types, Connection } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ApprovalRequest,
  ApprovalRequestDocument,
} from './schemas/approval-request.schema';
import {
  CreateApprovalRequestDto,
  UpdateApprovalStatusDto,
} from './dto/approval-request.dto';
import { ApprovalStatus } from '../../common/constants/approval-status.constant';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import {
  ActivityAction,
  ActivityEntity,
} from '../../common/constants/activity-action.constant';
import {
  ApprovalApprovedEvent,
  ApprovalRejectedEvent,
  ApprovalEvents,
} from './events/approval.events';

@Injectable()
export class ApprovalFlowService {
  constructor(
    @InjectModel(ApprovalRequest.name)
    private readonly approvalRequestModel: Model<ApprovalRequestDocument>,
    @InjectConnection() private readonly connection: Connection,
    private readonly activityLogsService: ActivityLogsService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createRequest(
    userId: string,
    tenantId: string,
    dto: CreateApprovalRequestDto,
  ): Promise<ApprovalRequest> {
    const request = new this.approvalRequestModel({
      ...dto,
      requestedBy: new Types.ObjectId(userId),
      tenantId: new Types.ObjectId(tenantId),
      approverId: new Types.ObjectId(dto.approverId),
      entityId: new Types.ObjectId(dto.entityId),
      status: ApprovalStatus.PENDING,
    });

    const savedRequest = await request.save();

    await this.activityLogsService.log(
      {
        action: ActivityAction.APPROVAL_REQUESTED,
        entity: ActivityEntity.APPROVAL_REQUEST,
        entityId: savedRequest._id.toString(),
        metadata: { entityType: dto.entityType, entityId: dto.entityId },
      },
      tenantId,
      userId,
    );

    return savedRequest;
  }

  async updateStatus(
    userId: string,
    tenantId: string,
    requestId: string,
    dto: UpdateApprovalStatusDto,
  ): Promise<ApprovalRequest> {
    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      const request = await this.approvalRequestModel
        .findOne({
          _id: new Types.ObjectId(requestId),
          tenantId: new Types.ObjectId(tenantId),
        })
        .session(session);

      if (!request) {
        throw new NotFoundException('Approval request not found');
      }

      if (request.approverId.toString() !== userId) {
        throw new BadRequestException(
          'Only the assigned approver can update the status',
        );
      }

      if (request.status !== ApprovalStatus.PENDING) {
        throw new BadRequestException('Only pending requests can be updated');
      }

      request.status = dto.status;
      request.comments = dto.comments || request.comments;

      if (dto.status === ApprovalStatus.APPROVED) {
        request.approvedAt = new Date();
        // Emit Approval Approved Event
        this.eventEmitter.emit(
          ApprovalEvents.APPROVED,
          new ApprovalApprovedEvent(
            request._id.toString(),
            request.tenantId.toString(),
            request.entityType,
            request.entityId.toString(),
            userId,
            dto.comments,
          ),
        );
      } else if (dto.status === ApprovalStatus.REJECTED) {
        request.rejectedAt = new Date();
        request.rejectionReason = dto.rejectionReason;
        // Emit Approval Rejected Event
        this.eventEmitter.emit(
          ApprovalEvents.REJECTED,
          new ApprovalRejectedEvent(
            request._id.toString(),
            request.tenantId.toString(),
            request.entityType,
            request.entityId.toString(),
            userId,
            dto.rejectionReason,
            dto.comments,
          ),
        );
      }

      const updatedRequest = await request.save({ session });

      await this.activityLogsService.log(
        {
          action:
            dto.status === ApprovalStatus.APPROVED
              ? ActivityAction.APPROVAL_APPROVED
              : ActivityAction.APPROVAL_REJECTED,
          entity: ActivityEntity.APPROVAL_REQUEST,
          entityId: updatedRequest._id.toString(),
          metadata: {
            entityType: updatedRequest.entityType,
            entityId: updatedRequest.entityId,
            comments: dto.comments,
          },
        },
        tenantId,
        userId,
      );

      await session.commitTransaction();
      return updatedRequest;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async getMyRequests(userId: string, tenantId: string) {
    return this.approvalRequestModel
      .find({
        $or: [
          { requestedBy: new Types.ObjectId(userId) },
          { approverId: new Types.ObjectId(userId) },
        ],
        tenantId: new Types.ObjectId(tenantId),
      })
      .sort({ createdAt: -1 });
  }

  async getRequestById(id: string, tenantId: string) {
    const request = await this.approvalRequestModel.findOne({
      _id: new Types.ObjectId(id),
      tenantId: new Types.ObjectId(tenantId),
    });

    if (!request) {
      throw new NotFoundException('Approval request not found');
    }

    return request;
  }
}
