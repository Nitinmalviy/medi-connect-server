import { GoogleGenerativeAI } from '@google/generative-ai';
import mongoose from 'mongoose';
import { env } from '../config/env';
import { ChatConversation } from '../models/chatConversation.model';
import { ChatMessage } from '../models/chatMessage.model';
import { ChatUsage } from '../models/chatUsage.model';
import { BadRequestError, ForbiddenError, NotFoundError, UnauthorizedError, ServiceUnavailableError } from '../utils/AppError';
import { RateLimitError } from '../utils/RateLimitError';
import { logger } from '../utils/logger';

type Owner = { ownerType: 'user' | 'guest'; ownerId: string; requiresLoginOnLimit: boolean };

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);

function dateKeyUTC(d = new Date()) {
  const y = d.getUTCFullYear();
  const m = `${d.getUTCMonth() + 1}`.padStart(2, '0');
  const day = `${d.getUTCDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
}

async function enforceDailyLimit(owner: Owner) {
  const key = dateKeyUTC();
  const limit = owner.ownerType === 'guest' ? 10 : 100;

  const usage = await ChatUsage.findOneAndUpdate(
    { ownerType: owner.ownerType, ownerId: owner.ownerId, dateKey: key },
    { $inc: { messageCount: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  if (usage.messageCount > limit) {
    await ChatUsage.updateOne(
      { ownerType: owner.ownerType, ownerId: owner.ownerId, dateKey: key },
      { $inc: { messageCount: -1 } }
    );
    throw new RateLimitError(owner.requiresLoginOnLimit ? 'Please login' : 'Daily limit reached');
  }

  return { remaining: Math.max(0, limit - usage.messageCount), limit };
}

function buildSystemInstruction() {
  return [
    'You are Vidhya, a helpful health assistant for patients and doctors.',
    'Be concise, calm, and practical.',
    'Ask clarifying questions when needed (age, sex, duration, severity, meds, conditions).',
    'If there are red-flag symptoms, advise urgent in-person care or emergency services.',
    'Do not claim you are a doctor. Do not provide diagnosis certainty.',
    'Avoid unsafe advice. Prefer general guidance and when to see a clinician.',
  ].join('\n');
}

export async function sendChatMessage(params: {
  owner: Owner;
  conversationId?: string;
  message: string;
}) {
  const { owner, conversationId, message } = params;
  const text = message.trim();
  if (!text) throw new BadRequestError('Message is required');

  const { remaining, limit } = await enforceDailyLimit(owner);

  let convoId: mongoose.Types.ObjectId;
  if (conversationId) {
    if (!mongoose.isValidObjectId(conversationId)) throw new BadRequestError('Invalid conversationId');
    const convo = await ChatConversation.findById(conversationId);
    if (!convo) throw new NotFoundError('Conversation');
    if (convo.ownerType !== owner.ownerType || convo.ownerId !== owner.ownerId) throw new ForbiddenError();
    convoId = convo._id;
  } else {
    const convo = await ChatConversation.create({ ownerType: owner.ownerType, ownerId: owner.ownerId });
    convoId = convo._id;
  }

  await ChatMessage.create({ conversationId: convoId, role: 'user', content: text });

  const history = await ChatMessage.find({ conversationId: convoId })
    .sort({ createdAt: 1 })
    .limit(24)
    .lean();

  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    systemInstruction: buildSystemInstruction(),
  });

  const formatted = history
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));

  let reply = '';
  try {
    const chat = model.startChat({ history: formatted });
    const result = await chat.sendMessage(text);
    reply = result.response.text().trim();
  } catch (err) {
    logger.error({ err, ownerType: owner.ownerType }, 'Gemini request failed');
    throw new ServiceUnavailableError('AI is temporarily unavailable. Please try again.');
  }

  if (!reply) throw new UnauthorizedError('Failed to generate response');

  await ChatMessage.create({ conversationId: convoId, role: 'assistant', content: reply });

  return { conversationId: convoId.toString(), reply, remaining, limit };
}

