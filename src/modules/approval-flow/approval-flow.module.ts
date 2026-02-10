import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ApprovalFlowService } from './approval-flow.service';
import { ApprovalFlowController } from './approval-flow.controller';
import {
  ApprovalRequest,
  ApprovalRequestSchema,
} from './schemas/approval-request.schema';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ApprovalRequest.name, schema: ApprovalRequestSchema },
    ]),
    ActivityLogsModule,
  ],
  controllers: [ApprovalFlowController],
  providers: [ApprovalFlowService],
  exports: [ApprovalFlowService],
})
export class ApprovalFlowModule {}
