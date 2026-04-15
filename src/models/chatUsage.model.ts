import mongoose, { Schema, Document, Model } from 'mongoose';

export type UsageOwnerType = 'user' | 'guest';

export interface IChatUsage extends Document {
  ownerType: UsageOwnerType;
  ownerId: string;
  dateKey: string;
  messageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const chatUsageSchema = new Schema<IChatUsage>(
  {
    ownerType: { type: String, enum: ['user', 'guest'], required: true },
    ownerId: { type: String, required: true },
    dateKey: { type: String, required: true },
    messageCount: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
);

chatUsageSchema.index({ ownerType: 1, ownerId: 1, dateKey: 1 }, { unique: true });

export const ChatUsage: Model<IChatUsage> = mongoose.model<IChatUsage>('ChatUsage', chatUsageSchema);

