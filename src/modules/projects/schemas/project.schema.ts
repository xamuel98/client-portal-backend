import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ProjectStatus } from '../../../common/constants/status.constant';

export type ProjectDocument = Project & Document;

@Schema({ timestamps: true })
export class Project {
  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop({
    type: String,
    enum: ProjectStatus,
    default: ProjectStatus.PLANNING,
    index: true,
  })
  status: ProjectStatus;

  @Prop()
  clientName?: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  managerId?: Types.ObjectId;

  @Prop()
  startDate?: Date;

  @Prop()
  endDate?: Date;

  @Prop({ default: 0 })
  budget?: number; // In cents/lowest currency unit

  @Prop({ type: [String], default: [] })
  tags: string[];

  // For soft deletes if needed via repository, but naming explicit field here
  @Prop()
  deletedAt?: Date;
}

export const ProjectSchema = SchemaFactory.createForClass(Project);

ProjectSchema.index({ tenantId: 1, name: 1 });
