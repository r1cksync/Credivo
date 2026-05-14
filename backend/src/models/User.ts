import mongoose, { Schema, Document as MDoc } from 'mongoose';

export type UserRole = 'borrower' | 'sales' | 'sanction' | 'disbursement' | 'collection' | 'admin';

export interface IUserProfile {
  fullName: string;
  pan: string;
  dateOfBirth: Date;
  monthlySalary: number;
  employmentMode: 'salaried' | 'self-employed' | 'unemployed';
  breStatus: 'pending' | 'passed' | 'rejected';
  breRejectionReasons: string[];
  breCheckedAt: Date;
}

export interface IUser extends MDoc {
  email: string;
  passwordHash: string;
  role: UserRole;
  profile?: IUserProfile;
  createdAt: Date;
  updatedAt: Date;
}

const ProfileSchema = new Schema<IUserProfile>(
  {
    fullName: String,
    pan: String,
    dateOfBirth: Date,
    monthlySalary: Number,
    employmentMode: { type: String, enum: ['salaried', 'self-employed', 'unemployed'] },
    breStatus: { type: String, enum: ['pending', 'passed', 'rejected'], default: 'pending' },
    breRejectionReasons: { type: [String], default: [] },
    breCheckedAt: Date,
  },
  { _id: false }
);

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ['borrower', 'sales', 'sanction', 'disbursement', 'collection', 'admin'],
      default: 'borrower',
    },
    profile: { type: ProfileSchema, required: false },
  },
  { timestamps: true }
);

export const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
