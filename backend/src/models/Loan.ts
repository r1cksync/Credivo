import mongoose, { Schema, Document as MDoc, Types } from 'mongoose';

export type LoanStatus = 'applied' | 'sanctioned' | 'rejected' | 'disbursed' | 'closed';

export interface IActivityLog {
  at: Date;
  actor: Types.ObjectId;
  action: string;
  fromStatus?: string;
  toStatus?: string;
  notes?: string;
}

export interface ILoan extends MDoc {
  loanId: string;
  borrowerId: Types.ObjectId;
  principalAmount: number;
  tenureDays: number;
  interestRate: number;
  simpleInterest: number;
  totalRepayment: number;
  outstandingBalance: number;
  totalAmountPaid: number;
  status: LoanStatus;
  appliedAt: Date;
  appliedBy: Types.ObjectId;
  sanctionedAt?: Date;
  sanctionedBy?: Types.ObjectId;
  rejectedAt?: Date;
  rejectedBy?: Types.ObjectId;
  rejectionReason?: string;
  disbursedAt?: Date;
  disbursedBy?: Types.ObjectId;
  disbursementReference?: string;
  closedAt?: Date;
  autoClosedByPayment?: boolean;
  salarySlipDocId?: Types.ObjectId;
  extractedSalaryData?: {
    rawText: string;
    detectedSalary?: number;
    confidence: number;
    verifiedAt: Date;
  };
  aiRiskSummary?: string;
  activityLog: IActivityLog[];
  createdAt: Date;
  updatedAt: Date;
}

const ActivityLogSchema = new Schema<IActivityLog>(
  {
    at: { type: Date, default: Date.now },
    actor: { type: Schema.Types.ObjectId, ref: 'User' },
    action: String,
    fromStatus: String,
    toStatus: String,
    notes: String,
  },
  { _id: false }
);

const LoanSchema = new Schema<ILoan>(
  {
    loanId: { type: String, required: true, unique: true, index: true },
    borrowerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    principalAmount: { type: Number, required: true },
    tenureDays: { type: Number, required: true },
    interestRate: { type: Number, default: 12 },
    simpleInterest: { type: Number, required: true },
    totalRepayment: { type: Number, required: true },
    outstandingBalance: { type: Number, required: true },
    totalAmountPaid: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['applied', 'sanctioned', 'rejected', 'disbursed', 'closed'],
      default: 'applied',
      index: true,
    },
    appliedAt: { type: Date, default: Date.now },
    appliedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    sanctionedAt: Date,
    sanctionedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    rejectedAt: Date,
    rejectedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    rejectionReason: String,
    disbursedAt: Date,
    disbursedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    disbursementReference: String,
    closedAt: Date,
    autoClosedByPayment: Boolean,
    salarySlipDocId: { type: Schema.Types.ObjectId, ref: 'Document' },
    extractedSalaryData: {
      rawText: String,
      detectedSalary: Number,
      confidence: Number,
      verifiedAt: Date,
    },
    aiRiskSummary: String,
    activityLog: { type: [ActivityLogSchema], default: [] },
  },
  { timestamps: true }
);

export const Loan = mongoose.models.Loan || mongoose.model<ILoan>('Loan', LoanSchema);
