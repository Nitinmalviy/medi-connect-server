import { User } from '../models/user.model';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { generateOtp, otpExpiresAt, isOtpExpired, sendOtp } from '../utils/otp';
import { BadRequestError, NotFoundError, UnauthorizedError } from '../utils/AppError';

export const sendLoginOtp = async (mobile: string) => {
  let user = await User.findOne({ mobile });

  if (!user) {
    user = await User.create({ mobile });
  }

  const otp = generateOtp();
  user.otp = otp;
  user.otpExpiresAt = otpExpiresAt();
  await user.save();

  await sendOtp(mobile, otp);
  return { message: 'OTP sent successfully' };
};

export const verifyOtp = async (mobile: string, otp: string) => {
  const user = await User.findOne({ mobile }).select('+otp +otpExpiresAt');
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
