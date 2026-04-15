import { Router } from 'express';
import { z } from 'zod';
import { ok } from '../../utils/response';
import { BadRequestError } from '../../utils/AppError';
import * as userService from '../../services/user.service';
import * as doctorService from '../../services/doctor.service';

const router = Router();

const sendSchema = z.object({
  mobile: z.string().trim().optional(),
  email: z.string().trim().email().optional(),
});

const verifySchema = z.object({
  mobile: z.string().trim().optional(),
  email: z.string().trim().email().optional(),
  otp: z.string().trim().min(4),
});

router.post('/user/send-otp', async (req, res) => {
  const parsed = sendSchema.safeParse(req.body);
  if (!parsed.success) throw new BadRequestError('Invalid request');
  const data = await userService.sendLoginOtp(parsed.data);
  return ok(res, data, 'Success');
});

router.post('/user/verify-otp', async (req, res) => {
  const parsed = verifySchema.safeParse(req.body);
  if (!parsed.success) throw new BadRequestError('Invalid request');
  const data = await userService.verifyOtp(parsed.data);
  return ok(res, data, 'Success');
});

router.post('/doctor/send-otp', async (req, res) => {
  const parsed = sendSchema.safeParse(req.body);
  if (!parsed.success) throw new BadRequestError('Invalid request');
  if (!parsed.data.mobile && !parsed.data.email) throw new BadRequestError('Mobile or email is required');
  const data = parsed.data.mobile
    ? await doctorService.sendLoginOtp(parsed.data.mobile)
    : await doctorService.sendLoginOtpByEmail(parsed.data.email!);
  return ok(res, data, 'Success');
});

router.post('/doctor/verify-otp', async (req, res) => {
  const parsed = verifySchema.safeParse(req.body);
  if (!parsed.success) throw new BadRequestError('Invalid request');
  if (!parsed.data.mobile && !parsed.data.email) throw new BadRequestError('Mobile or email is required');
  const data = parsed.data.mobile
    ? await doctorService.verifyOtp(parsed.data.mobile, parsed.data.otp)
    : await doctorService.verifyOtpByEmail(parsed.data.email!, parsed.data.otp);
  return ok(res, data, 'Success');
});

export default router;

