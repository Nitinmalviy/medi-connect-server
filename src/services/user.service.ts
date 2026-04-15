import { User } from '../models/user.model';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { generateOtp, otpExpiresAt, isOtpExpired, sendEmailOtp, sendOtp } from '../utils/otp';
import { BadRequestError, NotFoundError, UnauthorizedError } from '../utils/AppError';
import { env } from '../config/env';

export const sendLoginOtp = async (params: { mobile?: string; email?: string }) => {
  const mobile = params.mobile?.trim();
  const email = params.email?.trim().toLowerCase();
  if (!mobile && !email) throw new BadRequestError('Mobile or email is required');

  let user = await User.findOne({ ...(mobile ? { mobile } : {}), ...(email ? { email } : {}) });

  if (!user) {
    if (!mobile) throw new BadRequestError('Mobile required for first login');
    user = await User.create({ mobile, ...(email ? { email } : {}) });
  }

  const otp = generateOtp();
  user.otp = otp;
  user.otpExpiresAt = otpExpiresAt();
  await user.save();

  if (mobile) await sendOtp(mobile, otp);
  if (email) await sendEmailOtp(email, otp);
  return { message: 'OTP sent successfully', ...(env.NODE_ENV === 'development' ? { otp } : {}) };
};

export const verifyOtp = async (params: { mobile?: string; email?: string; otp: string }) => {
  const mobile = params.mobile?.trim();
  const email = params.email?.trim().toLowerCase();
  const otp = params.otp.trim();
  if (!mobile && !email) throw new BadRequestError('Mobile or email is required');

  const user = await User.findOne({ ...(mobile ? { mobile } : {}), ...(email ? { email } : {}) }).select(
    '+otp +otpExpiresAt'
  );
  if (!user) throw new NotFoundError('User');
  if (!user.otp || !user.otpExpiresAt) throw new BadRequestError('OTP not requested');
  if (isOtpExpired(user.otpExpiresAt)) throw new BadRequestError('OTP expired');
  if (user.otp !== otp) throw new BadRequestError('Invalid OTP');

  user.otp = undefined;
  user.otpExpiresAt = undefined;
  user.isVerified = true;
  await user.save();

  const accessToken = signAccessToken({ id: user._id.toString(), role: 'user' });
  const refreshToken = signRefreshToken({ id: user._id.toString(), role: 'user' });

  return { user, accessToken, refreshToken };
};

export const refreshTokens = async (token: string) => {
  const payload = verifyRefreshToken(token);
  const user = await User.findById(payload.id);
  if (!user) throw new UnauthorizedError();

  const accessToken = signAccessToken({ id: user._id.toString(), role: 'user' });
  const refreshToken = signRefreshToken({ id: user._id.toString(), role: 'user' });
  return { accessToken, refreshToken };
};

export const getProfile = async (userId: string) => {
  const user = await User.findById(userId);
  if (!user) throw new NotFoundError('User');
  return user;
};

export const updateProfile = async (userId: string, data: { name?: string }) => {
  const user = await User.findByIdAndUpdate(userId, data, { new: true, runValidators: true });
  if (!user) throw new NotFoundError('User');
  return user;
};
