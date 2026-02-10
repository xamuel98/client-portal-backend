import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type FileDocument = File & Document;

@Schema({ timestamps: true })
export class File {
  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  publicId: string; // Cloudinary Public ID

  @Prop({ required: true })
  url: string; // Cloudinary URL

  @Prop()
  mimeType: string;

  @Prop()
  size: number;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  uploadedBy: Types.ObjectId;

  @Prop({ required: true, default: 'general' })
  relatedEntity: string; // e.g., 'project', 'task', 'user_avatar'

  @Prop({ type: Types.ObjectId })
  relatedEntityId?: Types.ObjectId;
}

export const FileSchema = SchemaFactory.createForClass(File);
