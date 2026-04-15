import { Router } from 'express';
import chatRouter from './chat';
import authRouter from './auth';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ success: true, message: 'v1 healthy', version: 'v1' });
});

router.use('/chat', chatRouter);
router.use('/auth', authRouter);

export default router;
