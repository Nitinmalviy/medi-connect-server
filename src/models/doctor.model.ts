import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export type KycStatus = 'pending' | 'submitted' | 'approved' | 'rejected';

export interface IClinicAddress {
  street: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

export interface IKyc {
  medicalRegistrationNumber: string;
  medicalCouncil: string;
  registrationCertificateUrl?: string;
  idProofType: 'aadhaar' | 'pan' | 'passport';
  idProofUrl?: string;
  degreeUrl?: string;
  status: KycStatus;
  rejectionReason?: string;
  submittedAt?: Date;
  approvedAt?: Date;
}

export interface IDoctor extends Document {
  name: string;
  mobile: string;
  email: string;
  specializations: string[];
  qualifications: string[];
  experienceYears: number;
  clinicName?: string;
  clinicAddress?: IClinicAddress;
  consultationFee?: number;
  availableDays: string[];
  bio?: string;
  profileImageUrl?: string;
  kyc: IKyc;
  isVerified: boolean;
  isActive: boolean;
  otp?: string;
  otpExpiresAt?: Date;
  refreshToken?: string;
  createdAt: Date;
  updatedAt: Date;
}

const clinicAddressSchema = new Schema<IClinicAddress>(
  {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    country: { type: String, required: true, default: 'India' },
  },
  { _id: false }
);

const kycSchema = new Schema<IKyc>(
  {
    medicalRegistrationNumber: { type: String, required: true },
    medicalCouncil: { type: String, required: true },
    registrationCertificateUrl: { type: String },
    idProofType: {
      type: String,
      enum: ['aadhaar', 'pan', 'passport'],
      required: true,
    },
    idProofUrl: { type: String },
    degreeUrl: { type: String },
    status: {
      type: String,
      enum: ['pending', 'submitted', 'approved', 'rejected'],
      default: 'pending',
    },
    rejectionReason: { type: String },
    submittedAt: { type: Date },
    approvedAt: { type: Date },
  },
  { _id: false }
);

const doctorSchema = new Schema<IDoctor>(
  {
    name: { type: String, required: true, trim: true },
    mobile: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    specializations: [{ type: String, trim: true }],
    qualifications: [{ type: String, trim: true }],
    experienceYears: { type: Number, default: 0, min: 0 },
    clinicName: { type: String, trim: true },
    clinicAddress: { type: clinicAddressSchema },
    consultationFee: { type: Number, min: 0 },
    availableDays: [{ type: String }],
    bio: { type: String, maxlength: 1000 },
    profileImageUrl: { type: String },
    kyc: { type: kycSchema, required: true },
    isVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    otp: { type: String, select: false },
    otpExpiresAt: { type: Date, select: false },
    refreshToken: { type: String, select: false },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        delete ret.otp;
        delete ret.otpExpiresAt;
        delete ret.refreshToken;
        delete ret.__v;
        return ret;
      },
    },
  }
);

doctorSchema.index({ mobile: 1 });
doctorSchema.index({ email: 1 });
doctorSchema.index({ specializations: 1 });
doctorSchema.index({ 'kyc.status': 1 });

export const Doctor: Model<IDoctor> = mongoose.model<IDoctor>('Doctor', doctorSchema);
