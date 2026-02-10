import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MessageDocument = Message &
  Document & { createdAt: Date; updatedAt: Date };

@Schema({ timestamps: true })
export class Message {
  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ required: true })
  content: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  senderId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Project' })
  projectId?: Types.ObjectId; // Optional context: Project

  @Prop({ type: Types.ObjectId, ref: 'Task' })
  taskId?: Types.ObjectId; // Optional context: Task

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  readBy: Types.ObjectId[];

  @Prop({ type: [String], default: [] })
  attachments: string[]; // URLs or File IDs

  @Prop({ type: Types.ObjectId, ref: 'Message', index: true })
  parentId?: Types.ObjectId; // If this is a reply

  @Prop({ type: Types.ObjectId, ref: 'Message', index: true })
  threadId?: Types.ObjectId; // The root message ID

  @Prop({ default: 0 })
  replyCount: number;
}

export const MessageSchema = SchemaFactory.createForClass(Message);

MessageSchema.index({ tenantId: 1, projectId: 1, createdAt: -1 });
MessageSchema.index({ tenantId: 1, taskId: 1, createdAt: -1 });
MessageSchema.index({ tenantId: 1, threadId: 1, createdAt: 1 }); // For fetching threads in order
