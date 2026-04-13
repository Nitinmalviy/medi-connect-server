import { Admin } from '../models/admin.model';
import { Doctor } from '../models/doctor.model';
import { signAccessToken } from '../utils/jwt';
import { UnauthorizedError, NotFoundError, BadRequestError } from '../utils/AppError';

export const login = async (email: string, password: string) => {
  const admin = await Admin.findOne({ email }).select('+password');
  if (!admin) throw new UnauthorizedError('Invalid credentials');

  const valid = await admin.comparePassword(password);
  if (!valid) throw new UnauthorizedError('Invalid credentials');

  const token = signAccessToken({ id: admin._id.toString(), role: 'admin' });
  return { admin, token };
};

export const approveKyc = async (doctorId: string) => {
  const doctor = await Doctor.findById(doctorId);
  if (!doctor) throw new NotFoundError('Doctor');
  if (doctor.kyc.status !== 'submitted') throw new BadRequestError('KYC not submitted yet');

  doctor.kyc.status = 'approved';
  doctor.kyc.approvedAt = new Date();
  doctor.isVerified = true;
  await doctor.save();
  return doctor;
};

export const rejectKyc = async (doctorId: string, reason: string) => {
  const doctor = await Doctor.findById(doctorId);
  if (!doctor) throw new NotFoundError('Doctor');

  doctor.kyc.status = 'rejected';
  doctor.kyc.rejectionReason = reason;
  await doctor.save();
  return doctor;
};

export const getPendingKyc = async (page: number, limit: number) => {
  const skip = (page - 1) * limit;
  const [data, total] = await Promise.all([
    Doctor.find({ 'kyc.status': 'submitted' }).skip(skip).limit(limit).sort({ createdAt: -1 }),
    Doctor.countDocuments({ 'kyc.status': 'submitted' }),
  ]);
  return { data, total };
};

export const getAllDoctors = async (page: number, limit: number) => {
  const skip = (page - 1) * limit;
  const [data, total] = await Promise.all([
    Doctor.find().skip(skip).limit(limit).sort({ createdAt: -1 }),
    Doctor.countDocuments(),
  ]);
  return { data, total };
};

export const getAllUsers = async (page: number, limit: number) => {
  const { User } = await import('../models/user.model');
  const skip = (page - 1) * limit;
  const [data, total] = await Promise.all([
    User.find().skip(skip).limit(limit).sort({ createdAt: -1 }),
    User.countDocuments(),
  ]);
  return { data, total };
};
