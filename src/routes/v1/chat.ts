import { Router } from 'express';
import { z } from 'zod';
import { ok } from '../../utils/response';
import { authenticate } from '../../middleware/auth';
import { sendChatMessage } from '../../services/chat.service';
import { AuthRequest } from '../../types';
import { BadRequestError } from '../../utils/AppError';

const router = Router();

const bodySchema = z.object({
  conversationId: z.string().optional(),
  message: z.string().min(1),
});

router.post('/message', async (req: AuthRequest, res) => {
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) throw new BadRequestError('Invalid request');

  const guestId = (req.header('x-guest-id') || '').trim();
  const authHeader = req.headers.authorization;
  const hasBearer = !!authHeader?.startsWith('Bearer ');

  let owner: { ownerType: 'user' | 'guest'; ownerId: string; requiresLoginOnLimit: boolean };

  if (hasBearer) {
    await new Promise<void>((resolve, reject) =>
      authenticate(req, res, (err?: unknown) => (err ? reject(err) : resolve()))
    );
    if (!req.user?.id) throw new BadRequestError('Invalid token');
    owner = { ownerType: 'user', ownerId: req.user.id, requiresLoginOnLimit: false };
  } else {
    if (!guestId) throw new BadRequestError('Missing guest id');
    owner = { ownerType: 'guest', ownerId: guestId, requiresLoginOnLimit: true };
  }

  const data = await sendChatMessage({
    owner,
    conversationId: parsed.data.conversationId,
    message: parsed.data.message,
  });

  return ok(res, data, 'Success');
});

export default router;

