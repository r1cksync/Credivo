import { Router } from 'express';
import { User } from '../models/User';
import { Loan } from '../models/Loan';
import { DocumentModel } from '../models/Document';
import { Payment } from '../models/Payment';
import { authenticate, AuthedRequest } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { upload } from '../middleware/upload';
import { runBRE } from '../services/bre';
import { calculateLoan, generateLoanId } from '../services/loanCalculator';
import { uploadDocument, s3PublicUrl, getPresignedUrl } from '../services/s3';
import { extractTextFromDocument } from '../services/textract';

const router = Router();
router.use(authenticate, requireRole('borrower'));

router.post('/profile', async (req: AuthedRequest, res) => {
  try {
    const { fullName, pan, dateOfBirth, monthlySalary, employmentMode } = req.body;
    if (!fullName || !pan || !dateOfBirth || monthlySalary == null || !employmentMode) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const bre = runBRE({
      pan: String(pan).toUpperCase(),
      dateOfBirth,
      monthlySalary: Number(monthlySalary),
      employmentMode,
    });

    const profile = {
      fullName,
      pan: String(pan).toUpperCase(),
      dateOfBirth: new Date(dateOfBirth),
      monthlySalary: Number(monthlySalary),
      employmentMode,
      breStatus: bre.passed ? 'passed' : 'rejected',
      breRejectionReasons: bre.rejectionReasons,
      breCheckedAt: new Date(),
    };

    await User.findByIdAndUpdate(req.user._id, { profile });

    if (!bre.passed) {
      return res.status(422).json({
        error: 'BRE check failed',
        rejectionReasons: bre.rejectionReasons,
        profile,
      });
    }
    return res.json({ ok: true, profile });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/profile', async (req: AuthedRequest, res) => {
  const user = await User.findById(req.user._id).lean();
  return res.json({ profile: user?.profile || null });
});

router.post('/upload-salary-slip', upload.single('file'), async (req: AuthedRequest, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const user = await User.findById(req.user._id);
    if (!user?.profile || user.profile.breStatus !== 'passed') {
      return res.status(403).json({ error: 'BRE check must be passed before uploading documents' });
    }

    const timestamp = Date.now();
    const safeName = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const s3Key = `salary-slips/${req.user._id}/${timestamp}-${safeName}`;

    await uploadDocument(req.file.buffer, s3Key, req.file.mimetype);

    const doc = await DocumentModel.create({
      ownerId: req.user._id,
      type: 'salary_slip',
      s3Key,
      s3Url: s3PublicUrl(s3Key),
      originalFilename: req.file.originalname,
      mimeType: req.file.mimetype,
      fileSizeBytes: req.file.size,
      textractStatus: 'processing',
      uploadedAt: new Date(),
    });

    // Run Textract synchronously (acceptable for single-page docs)
    extractTextFromDocument(s3Key)
      .then(async (result) => {
        await DocumentModel.findByIdAndUpdate(doc._id, {
          textractStatus: 'completed',
          extractedText: result.rawText,
          detectedSalary: result.detectedSalary,
          textractConfidence: result.confidence,
        });
      })
      .catch(async () => {
        await DocumentModel.findByIdAndUpdate(doc._id, { textractStatus: 'failed' });
      });

    const presignedUrl = await getPresignedUrl(s3Key, 3600).catch(() => doc.s3Url);
    return res.json({ documentId: doc._id, s3Url: presignedUrl, document: doc });
  } catch (err: any) {
    console.error('[upload-salary-slip]', err);
    return res.status(500).json({ error: err.message });
  }
});

router.get('/latest-document', async (req: AuthedRequest, res) => {
  const doc = await DocumentModel.findOne({ ownerId: req.user._id, type: 'salary_slip' })
    .sort({ createdAt: -1 })
    .lean();
  if (!doc) return res.json({ document: null });
  const presignedUrl = await getPresignedUrl(doc.s3Key, 3600).catch(() => doc.s3Url);
  return res.json({ document: { ...doc, presignedUrl } });
});

router.post('/apply', async (req: AuthedRequest, res) => {
  try {
    const { principalAmount, tenureDays } = req.body;
    const p = Number(principalAmount);
    const t = Number(tenureDays);
    if (!p || !t) return res.status(400).json({ error: 'principalAmount and tenureDays required' });
    if (p < 50000 || p > 500000) return res.status(400).json({ error: 'Principal must be between 50,000 and 5,00,000' });
    if (t < 30 || t > 365) return res.status(400).json({ error: 'Tenure must be between 30 and 365 days' });

    const user = await User.findById(req.user._id);
    if (!user?.profile || user.profile.breStatus !== 'passed') {
      return res.status(403).json({ error: 'BRE must pass before applying' });
    }

    const doc = await DocumentModel.findOne({ ownerId: req.user._id, type: 'salary_slip' }).sort({ createdAt: -1 });
    if (!doc) return res.status(403).json({ error: 'Salary slip must be uploaded before applying' });

    const activeLoan = await Loan.findOne({
      borrowerId: req.user._id,
      status: { $in: ['applied', 'sanctioned', 'disbursed'] },
    });
    if (activeLoan) return res.status(409).json({ error: 'You already have an active loan application' });

    const calc = calculateLoan(p, t);
    let loanId = generateLoanId();
    while (await Loan.findOne({ loanId })) loanId = generateLoanId();

    const loan = await Loan.create({
      loanId,
      borrowerId: req.user._id,
      principalAmount: calc.principal,
      tenureDays: calc.tenureDays,
      interestRate: calc.annualRate,
      simpleInterest: calc.simpleInterest,
      totalRepayment: calc.totalRepayment,
      outstandingBalance: calc.totalRepayment,
      totalAmountPaid: 0,
      status: 'applied',
      appliedAt: new Date(),
      appliedBy: req.user._id,
      salarySlipDocId: doc._id,
      extractedSalaryData: doc.extractedText
        ? {
            rawText: doc.extractedText,
            detectedSalary: doc.detectedSalary,
            confidence: doc.textractConfidence || 0,
            verifiedAt: new Date(),
          }
        : undefined,
      activityLog: [{ at: new Date(), actor: req.user._id, action: 'APPLIED', toStatus: 'applied' }],
    });

    await DocumentModel.findByIdAndUpdate(doc._id, { loanId: loan._id });

    return res.json({ loan });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/loans', async (req: AuthedRequest, res) => {
  const loans = await Loan.find({ borrowerId: req.user._id }).sort({ createdAt: -1 }).lean();
  return res.json({ loans });
});

router.get('/loans/:loanId', async (req: AuthedRequest, res) => {
  const loan = await Loan.findOne({ loanId: req.params.loanId, borrowerId: req.user._id }).lean();
  if (!loan) return res.status(404).json({ error: 'Loan not found' });
  const payments = await Payment.find({ loanId: loan._id }).sort({ paymentDate: -1 }).lean();
  return res.json({ loan, payments });
});

export default router;
