import mongoose, { Schema, Document as MDoc, Types } from 'mongoose';

export interface IPayment extends MDoc {
  loanId: Types.ObjectId;
  borrowerId: Types.ObjectId;
  recordedBy: Types.ObjectId;
  utrNumber: string;
  amount: number;
  paymentDate: Date;
  notes?: string;
  status: 'recorded' | 'verified';
  createdAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    loanId: { type: Schema.Types.ObjectId, ref: 'Loan', required: true, index: true },
    borrowerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    recordedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    utrNumber: { type: String, required: true, unique: true, index: true },
    amount: { type: Number, required: true },
    paymentDate: { type: Date, required: true },
    notes: String,
    status: { type: String, enum: ['recorded', 'verified'], default: 'verified' },
  },
  { timestamps: true }
);

export const Payment = mongoose.models.Payment || mongoose.model<IPayment>('Payment', PaymentSchema);
