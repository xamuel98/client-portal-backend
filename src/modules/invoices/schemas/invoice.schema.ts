import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { InvoiceStatus } from '../../../common/constants/invoice-status.constant';

export type InvoiceDocument = Invoice & Document;

@Schema()
export class InvoiceItem {
  @Prop({ required: true })
  description: string;

  @Prop({ required: true, default: 0 })
  quantity: number;

  @Prop({ required: true, default: 0 })
  unitPrice: number; // In cents

  @Prop({ required: true, default: 0 })
  amount: number; // quantity * unitPrice
}

export const InvoiceItemSchema = SchemaFactory.createForClass(InvoiceItem);

@Schema({ timestamps: true })
export class Invoice {
  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Project', index: true })
  projectId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  clientId: Types.ObjectId; // User with CLIENT role

  @Prop({ required: true, unique: true })
  invoiceNumber: string;

  @Prop({
    type: String,
    enum: InvoiceStatus,
    default: InvoiceStatus.DRAFT,
    index: true,
  })
  status: InvoiceStatus;

  @Prop({ required: true })
  issueDate: Date;

  @Prop({ required: true })
  dueDate: Date;

  @Prop({ type: [InvoiceItemSchema], default: [] })
  items: InvoiceItem[];

  @Prop({ required: true, default: 0 })
  subtotal: number;

  @Prop({ required: true, default: 0 })
  taxTotal: number;

  @Prop({ required: true, default: 0 })
  totalAmount: number;

  @Prop()
  notes?: string;

  @Prop()
  currency: string; // e.g., 'USD', 'EUR'

  @Prop()
  pdfUrl?: string;
}

export const InvoiceSchema = SchemaFactory.createForClass(Invoice);

InvoiceSchema.index({ tenantId: 1, invoiceNumber: 1 }, { unique: true });
