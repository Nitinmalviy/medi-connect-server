import mongoose, { Schema, Document, Model } from 'mongoose';

export type ChatOwnerType = 'user' | 'guest';

export interface IChatConversation extends Document {
  ownerType: ChatOwnerType;
  ownerId: string;
  title?: string;
  createdAt: Date;
  updatedAt: Date;
}

const chatConversationSchema = new Schema<IChatConversation>(
  {
    ownerType: { type: String, enum: ['user', 'guest'], required: true, index: true },
    ownerId: { type: String, required: true, index: true },
    title: { type: String, trim: true },
  },
  { timestamps: true }
);

chatConversationSchema.index({ ownerType: 1, ownerId: 1, createdAt: -1 });

export const ChatConversation: Model<IChatConversation> = mongoose.model<IChatConversation>(
  'ChatConversation',
  chatConversationSchema
);

