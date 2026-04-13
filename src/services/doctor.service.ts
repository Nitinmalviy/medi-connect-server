import { Doctor, IClinicAddress } from '../models/doctor.model';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { generateOtp, otpExpiresAt, isOtpExpired, sendOtp } from '../utils/otp';
import { BadRequestError, NotFoundError, UnauthorizedError, ConflictError } from '../utils/AppError';

export const register = async (data: {
  name: string;
  mobile: string;
  email: string;
  specializations: string[];
  qualifications: string[];
  experienceYears: number;
  kyc: {
    medicalRegistrationNumber: string;
    medicalCouncil: string;
    idProofType: 'aadhaar' | 'pan' | 'passport';
  };
}) => {
  const existing = await Doctor.findOne({ $or: [{ mobile: data.mobile }, { email: data.email }] });
  if (existing) throw new ConflictError('Mobile or email already registered');

  const doctor = await Doctor.create({
    ...data,
    kyc: { ...data.kyc, status: 'pending' },
  });

  return doctor;
};

export const sendLoginOtp = async (mobile: string) => {
  const doctor = await Doctor.findOne({ mobile });
  if (!doctor) throw new NotFoundError('Doctor');

  const otp = generateOtp();
  doctor.otp = otp;
  doctor.otpExpiresAt = otpExpiresAt();
  await doctor.save();

  await sendOtp(mobile, otp);
  return { message: 'OTP sent successfully' };
};

export const verifyOtp = async (mobile: string, otp: string) => {
  const doctor = await Doctor.findOne({ mobile }).select('+otp +otpExpiresAt');
  if (!doctor) throw new NotFoundError('Doctor');
  if (!doctor.otp || !doctor.otpExpiresAt) throw new BadRequestError('OTP not requested');
  if (isOtpExpired(doctor.otpExpiresAt)) throw new BadRequestError('OTP expired');
  if (doctor.otp !== otp) throw new BadRequestError('Invalid OTP');

  doctor.otp = undefined;
  doctor.otpExpiresAt = undefined;
  await doctor.save();

  const accessToken = signAccessToken({ id: doctor._id.toString(), role: 'doctor' });
  const refreshToken = signRefreshToken({ id: doctor._id.toString(), role: 'doctor' });

  return { doctor, accessToken, refreshToken };
};

export const refreshTokens = async (token: string) => {
  const payload = verifyRefreshToken(token);
  const doctor = await Doctor.findById(payload.id);
  if (!doctor) throw new UnauthorizedError();

  const accessToken = signAccessToken({ id: doctor._id.toString(), role: 'doctor' });
  const refreshToken = signRefreshToken({ id: doctor._id.toString(), role: 'doctor' });
  return { accessToken, refreshToken };
};

export const getProfile = async (doctorId: string) => {
  const doctor = await Doctor.findById(doctorId);
  if (!doctor) throw new NotFoundError('Doctor');
  return doctor;
};

export const submitKyc = async (
  doctorId: string,
  files: {
    registrationCertificateUrl?: string;
    idProofUrl?: string;
    degreeUrl?: string;
  }
) => {
  const doctor = await Doctor.findById(doctorId);
  if (!doctor) throw new NotFoundError('Doctor');
  if (doctor.kyc.status === 'approved') throw new BadRequestError('KYC already approved');

  doctor.kyc.registrationCertificateUrl = files.registrationCertificateUrl;
  doctor.kyc.idProofUrl = files.idProofUrl;
  doctor.kyc.degreeUrl = files.degreeUrl;
  doctor.kyc.status = 'submitted';
  doctor.kyc.submittedAt = new Date();
  await doctor.save();

  return doctor;
};

export const updateClinic = async (
  doctorId: string,
  data: {
    clinicName?: string;
    clinicAddress?: IClinicAddress;
    consultationFee?: number;
    availableDays?: string[];
    specializations?: string[];
    bio?: string;
  }
) => {
  const doctor = await Doctor.findByIdAndUpdate(doctorId, data, { new: true, runValidators: true });
  if (!doctor) throw new NotFoundError('Doctor');
  return doctor;
};

export const getAll = async (page: number, limit: number, specialization?: string) => {
  const filter = {
    isVerified: true,
    isActive: true,
    ...(specialization && { specializations: specialization }),
  };
  const skip = (page - 1) * limit;
  const [data, total] = await Promise.all([
    Doctor.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }),
    Doctor.countDocuments(filter),
  ]);
  return { data, total };
};
