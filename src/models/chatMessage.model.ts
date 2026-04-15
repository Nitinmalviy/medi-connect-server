import mongoose, { Schema, Document, Model } from 'mongoose';

export type ChatRole = 'user' | 'assistant' | 'system';

export interface IChatMessage extends Document {
  conversationId: mongoose.Types.ObjectId;
  role: ChatRole;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

const chatMessageSchema = new Schema<IChatMessage>(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: 'ChatConversation', required: true, index: true },
    role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
    content: { type: String, required: true },
  },
  { timestamps: true }
);

chatMessageSchema.index({ conversationId: 1, createdAt: 1 });

export const ChatMessage: Model<IChatMessage> = mongoose.model<IChatMessage>('ChatMessage', chatMessageSchema);

