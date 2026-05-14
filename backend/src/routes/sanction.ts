import { Router } from 'express';
import { Loan } from '../models/Loan';
import { User } from '../models/User';
import { DocumentModel } from '../models/Document';
import { authenticate, AuthedRequest } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { getPresignedUrl } from '../services/s3';
import { generateLoanRiskSummary } from '../services/bedrock';
import { calculateAge } from '../services/bre';

const router = Router();
router.use(authenticate, requireRole('sanction', 'admin'));

async function enrichLoanWithBorrower(loan: any) {
  const borrower = await User.findById(loan.borrowerId).lean();
  const doc = loan.salarySlipDocId ? await DocumentModel.findById(loan.salarySlipDocId).lean() : null;
  const presignedUrl = doc ? await getPresignedUrl(doc.s3Key, 3600).catch(() => doc.s3Url) : null;
  return { ...loan, borrower, salarySlipDocument: doc ? { ...doc, presignedUrl } : null };
}

router.get('/queue', async (req, res) => {
  const { sortBy = 'appliedAt' } = req.query;
  const sortField = sortBy === 'amount' ? 'principalAmount' : 'appliedAt';
  const loans = await Loan.find({ status: 'applied' }).sort({ [sortField]: -1 }).lean();
  const enriched = await Promise.all(loans.map(enrichLoanWithBorrower));

  // Generate AI summaries if missing
  for (const loan of enriched) {
    if (!loan.aiRiskSummary && loan.borrower?.profile) {
      try {
        const summary = await generateLoanRiskSummary({
          borrowerName: loan.borrower.profile.fullName,
          age: calculateAge(new Date(loan.borrower.profile.dateOfBirth)),
          monthlySalary: loan.borrower.profile.monthlySalary,
          employmentMode: loan.borrower.profile.employmentMode,
          principalAmount: loan.principalAmount,
          tenureDays: loan.tenureDays,
          totalRepayment: loan.totalRepayment,
          salaryTextractData: loan.extractedSalaryData?.rawText,
        });
        await Loan.findByIdAndUpdate(loan._id, { aiRiskSummary: summary });
        loan.aiRiskSummary = summary;
      } catch (err) {
        console.error('[sanction/queue] bedrock failed', err);
      }
    }
  }

  return res.json({ loans: enriched });
});

router.get('/queue/:loanId', async (req, res) => {
  const loan = await Loan.findOne({ loanId: req.params.loanId }).lean();
  if (!loan) return res.status(404).json({ error: 'Not found' });
  const enriched = await enrichLoanWithBorrower(loan);

  if (!enriched.aiRiskSummary && enriched.borrower?.profile) {
    try {
      const summary = await generateLoanRiskSummary({
        borrowerName: enriched.borrower.profile.fullName,
        age: calculateAge(new Date(enriched.borrower.profile.dateOfBirth)),
        monthlySalary: enriched.borrower.profile.monthlySalary,
        employmentMode: enriched.borrower.profile.employmentMode,
        principalAmount: enriched.principalAmount,
        tenureDays: enriched.tenureDays,
        totalRepayment: enriched.totalRepayment,
        salaryTextractData: enriched.extractedSalaryData?.rawText,
      });
      await Loan.findByIdAndUpdate(enriched._id, { aiRiskSummary: summary });
      enriched.aiRiskSummary = summary;
    } catch {}
  }

  return res.json({ loan: enriched });
});

router.post('/regenerate-ai/:loanId', async (req, res) => {
  const loan: any = await Loan.findOne({ loanId: req.params.loanId }).lean();
  if (!loan) return res.status(404).json({ error: 'Not found' });
  const borrower: any = await User.findById(loan.borrowerId).lean();
  if (!borrower?.profile) return res.status(400).json({ error: 'No borrower profile' });

  const summary = await generateLoanRiskSummary({
    borrowerName: borrower.profile.fullName,
    age: calculateAge(new Date(borrower.profile.dateOfBirth)),
    monthlySalary: borrower.profile.monthlySalary,
    employmentMode: borrower.profile.employmentMode,
    principalAmount: loan.principalAmount,
    tenureDays: loan.tenureDays,
    totalRepayment: loan.totalRepayment,
    salaryTextractData: loan.extractedSalaryData?.rawText,
  });
  await Loan.findByIdAndUpdate(loan._id, { aiRiskSummary: summary });
  return res.json({ aiRiskSummary: summary });
});

router.post('/approve/:loanId', async (req: AuthedRequest, res) => {
  const loan = await Loan.findOne({ loanId: req.params.loanId });
  if (!loan) return res.status(404).json({ error: 'Not found' });
  if (loan.status !== 'applied')
    return res.status(400).json({ error: `Cannot approve loan in status: ${loan.status}` });

  loan.status = 'sanctioned';
  loan.sanctionedAt = new Date();
  loan.sanctionedBy = req.user._id;
  loan.activityLog.push({
    at: new Date(),
    actor: req.user._id,
    action: 'SANCTIONED',
    fromStatus: 'applied',
    toStatus: 'sanctioned',
    notes: req.body.notes,
  });
  await loan.save();
  return res.json({ loan });
});

router.post('/reject/:loanId', async (req: AuthedRequest, res) => {
  const { rejectionReason } = req.body;
  if (!rejectionReason) return res.status(400).json({ error: 'rejectionReason required' });

  const loan = await Loan.findOne({ loanId: req.params.loanId });
  if (!loan) return res.status(404).json({ error: 'Not found' });
  if (loan.status !== 'applied')
    return res.status(400).json({ error: `Cannot reject loan in status: ${loan.status}` });

  loan.status = 'rejected';
  loan.rejectedAt = new Date();
  loan.rejectedBy = req.user._id;
  loan.rejectionReason = rejectionReason;
  loan.activityLog.push({
    at: new Date(),
    actor: req.user._id,
    action: 'REJECTED',
    fromStatus: 'applied',
    toStatus: 'rejected',
    notes: rejectionReason,
  });
  await loan.save();
  return res.json({ loan });
});

router.get('/stats', async (_req, res) => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [pendingCount, approvedToday, rejectedToday, processed, pending] = await Promise.all([
    Loan.countDocuments({ status: 'applied' }),
    Loan.countDocuments({ status: 'sanctioned', sanctionedAt: { $gte: startOfDay } }),
    Loan.countDocuments({ status: 'rejected', rejectedAt: { $gte: startOfDay } }),
    Loan.find({ sanctionedAt: { $exists: true } }).select('appliedAt sanctionedAt principalAmount').lean(),
    Loan.find({ status: 'applied' }).select('aiRiskSummary principalAmount appliedAt').lean(),
  ]);

  const avgProcessingHours =
    processed.length > 0
      ? processed.reduce((s, l: any) => s + (new Date(l.sanctionedAt).getTime() - new Date(l.appliedAt).getTime()), 0) /
        processed.length /
        (1000 * 60 * 60)
      : 0;

  // Daily decisions (last 14 days)
  const dayMs = 86400000;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const allDecisions = await Loan.find({
    $or: [{ sanctionedAt: { $gte: new Date(now.getTime() - 13 * dayMs) } }, { rejectedAt: { $gte: new Date(now.getTime() - 13 * dayMs) } }],
  })
    .select('sanctionedAt rejectedAt status')
    .lean();
  const daily: { date: string; approved: number; rejected: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const start = new Date(now.getTime() - i * dayMs);
    const end = new Date(start.getTime() + dayMs);
    daily.push({
      date: `${start.getDate()}/${start.getMonth() + 1}`,
      approved: allDecisions.filter((l: any) => l.sanctionedAt && new Date(l.sanctionedAt) >= start && new Date(l.sanctionedAt) < end).length,
      rejected: allDecisions.filter((l: any) => l.rejectedAt && new Date(l.rejectedAt) >= start && new Date(l.rejectedAt) < end).length,
    });
  }

  // Risk mix from pending queue
  const riskMix = { LOW: 0, MEDIUM: 0, HIGH: 0, PENDING: 0 };
  pending.forEach((l: any) => {
    const m = (l.aiRiskSummary || '').match(/risk level:\s*(low|medium|high)/i);
    const lvl = m ? m[1].toUpperCase() : 'PENDING';
    (riskMix as any)[lvl]++;
  });

  // Queue aging
  const queueAging = { '<24h': 0, '24-72h': 0, '>72h': 0 };
  pending.forEach((l: any) => {
    const hrs = (Date.now() - new Date(l.appliedAt).getTime()) / 36e5;
    if (hrs < 24) queueAging['<24h']++;
    else if (hrs < 72) queueAging['24-72h']++;
    else queueAging['>72h']++;
  });

  // Principal buckets
  const principalBuckets = { '<1L': 0, '1-3L': 0, '3-5L': 0, '5L+': 0 };
  pending.forEach((l: any) => {
    const p = l.principalAmount;
    if (p < 100000) principalBuckets['<1L']++;
    else if (p < 300000) principalBuckets['1-3L']++;
    else if (p < 500000) principalBuckets['3-5L']++;
    else principalBuckets['5L+']++;
  });

  // Overall approval rate
  const totalDecided = await Loan.countDocuments({ status: { $in: ['sanctioned', 'disbursed', 'closed', 'rejected'] } });
  const totalApproved = await Loan.countDocuments({ status: { $in: ['sanctioned', 'disbursed', 'closed'] } });
  const approvalRate = totalDecided ? Math.round((totalApproved / totalDecided) * 1000) / 10 : 0;

  return res.json({
    pendingCount,
    approvedToday,
    rejectedToday,
    avgProcessingHours: Math.round(avgProcessingHours * 10) / 10,
    approvalRate,
    daily,
    riskMix,
    queueAging,
    principalBuckets,
  });
});

export default router;
