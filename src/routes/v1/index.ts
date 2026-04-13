import { Router } from 'express';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ success: true, message: 'v1 healthy', version: 'v1' });
});

export default router;
