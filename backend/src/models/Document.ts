import mongoose, { Schema, Document as MDoc, Types } from 'mongoose';

export interface IDocument extends MDoc {
  ownerId: Types.ObjectId;
  loanId?: Types.ObjectId;
  type: 'salary_slip' | 'id_proof';
  s3Key: string;
  s3Url: string;
  originalFilename: string;
  mimeType: string;
  fileSizeBytes: number;
  textractJobId?: string;
  textractStatus: 'pending' | 'processing' | 'completed' | 'failed';
  extractedText?: string;
  detectedSalary?: number;
  textractConfidence?: number;
  uploadedAt: Date;
}

const DocumentSchema = new Schema<IDocument>(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    loanId: { type: Schema.Types.ObjectId, ref: 'Loan' },
    type: { type: String, enum: ['salary_slip', 'id_proof'], required: true },
    s3Key: { type: String, required: true },
    s3Url: { type: String, required: true },
    originalFilename: { type: String, required: true },
    mimeType: { type: String, required: true },
    fileSizeBytes: { type: Number, required: true },
    textractJobId: String,
    textractStatus: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
    },
    extractedText: String,
    detectedSalary: Number,
    textractConfidence: Number,
    uploadedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const DocumentModel =
  mongoose.models.Document || mongoose.model<IDocument>('Document', DocumentSchema);
