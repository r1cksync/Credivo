import { Router } from 'express';
import { Loan } from '../models/Loan';
import { User } from '../models/User';
import { authenticate, AuthedRequest } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { generateSanctionLetterPdf } from '../services/pdf';
import { calculateAge } from '../services/bre';

const router = Router();
router.use(authenticate, requireRole('disbursement', 'admin'));

router.get('/queue', async (_req, res) => {
  const loans = await Loan.find({ status: 'sanctioned' }).sort({ sanctionedAt: 1 }).lean();
  const enriched = await Promise.all(
    loans.map(async (l: any) => {
      const borrower: any = await User.findById(l.borrowerId).lean();
      return { ...l, borrower };
    })
  );
  return res.json({ loans: enriched });
});

router.post('/disburse/:loanId', async (req: AuthedRequest, res) => {
  const loan = await Loan.findOne({ loanId: req.params.loanId });
  if (!loan) return res.status(404).json({ error: 'Not found' });
  if (loan.status !== 'sanctioned')
    return res.status(400).json({ error: `Cannot disburse loan in status: ${loan.status}` });

  const ref = req.body.disbursementReference || `DISB-${Date.now()}`;
  loan.status = 'disbursed';
  loan.disbursedAt = new Date();
  loan.disbursedBy = req.user._id;
  loan.disbursementReference = ref;
  loan.activityLog.push({
    at: new Date(),
    actor: req.user._id,
    action: 'DISBURSED',
    fromStatus: 'sanctioned',
    toStatus: 'disbursed',
    notes: `Reference: ${ref}`,
  });
  await loan.save();
  return res.json({ loan });
});

router.get('/history', async (req, res) => {
  const { from, to } = req.query;
  const filter: any = { status: { $in: ['disbursed', 'closed'] } };
  if (from || to) {
    filter.disbursedAt = {};
    if (from) filter.disbursedAt.$gte = new Date(String(from));
    if (to) filter.disbursedAt.$lte = new Date(String(to));
  }
  const loans = await Loan.find(filter).sort({ disbursedAt: -1 }).lean();
  const enriched = await Promise.all(
    loans.map(async (l: any) => {
      const borrower: any = await User.findById(l.borrowerId).select('email profile').lean();
      return { ...l, borrower };
    })
  );
  return res.json({ loans: enriched });
});

router.get('/stats', async (_req, res) => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const dayMs = 86400000;

  const [pending, disbursedToday, disbursedRecent, allDisbursed] = await Promise.all([
    Loan.find({ status: 'sanctioned' }).select('sanctionedAt principalAmount').lean(),
    Loan.find({ disbursedAt: { $gte: startOfDay } }).select('principalAmount').lean(),
    Loan.find({ disbursedAt: { $gte: new Date(Date.now() - 14 * dayMs) } }).select('disbursedAt principalAmount').lean(),
    Loan.find({ status: { $in: ['disbursed', 'closed'] } }).select('sanctionedAt disbursedAt principalAmount').lean(),
  ]);

  const totalAmountDisbursedToday = disbursedToday.reduce((s, l: any) => s + l.principalAmount, 0);

  // Queue aging
  const queueAging = { '<24h': 0, '24-72h': 0, '>72h': 0 };
  pending.forEach((l: any) => {
    const hrs = (Date.now() - new Date(l.sanctionedAt).getTime()) / 36e5;
    if (hrs < 24) queueAging['<24h']++;
    else if (hrs < 72) queueAging['24-72h']++;
    else queueAging['>72h']++;
  });

  // Daily disbursement
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const daily: { date: string; count: number; amount: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const start = new Date(now.getTime() - i * dayMs);
    const end = new Date(start.getTime() + dayMs);
    const dayLoans = disbursedRecent.filter((l: any) => new Date(l.disbursedAt) >= start && new Date(l.disbursedAt) < end);
    daily.push({
      date: `${start.getDate()}/${start.getMonth() + 1}`,
      count: dayLoans.length,
      amount: dayLoans.reduce((s: number, l: any) => s + l.principalAmount, 0),
    });
  }

  // Average TAT (sanction -> disbursement)
  const tats = allDisbursed
    .filter((l: any) => l.sanctionedAt && l.disbursedAt)
    .map((l: any) => (new Date(l.disbursedAt).getTime() - new Date(l.sanctionedAt).getTime()) / 36e5);
  const avgDisbursementTAT = tats.length ? tats.reduce((a, b) => a + b, 0) / tats.length : 0;

  // Lifetime totals
  const lifetimeDisbursedAmount = allDisbursed.reduce((s, l: any) => s + l.principalAmount, 0);

  // Principal buckets in queue
  const principalBuckets = { '<1L': 0, '1-3L': 0, '3-5L': 0, '5L+': 0 };
  pending.forEach((l: any) => {
    const p = l.principalAmount;
    if (p < 100000) principalBuckets['<1L']++;
    else if (p < 300000) principalBuckets['1-3L']++;
    else if (p < 500000) principalBuckets['3-5L']++;
    else principalBuckets['5L+']++;
  });

  return res.json({
    pendingDisbursement: pending.length,
    pendingAmount: pending.reduce((s, l: any) => s + l.principalAmount, 0),
    disbursedToday: disbursedToday.length,
    totalAmountDisbursedToday,
    lifetimeDisbursedCount: allDisbursed.length,
    lifetimeDisbursedAmount,
    avgDisbursementTAT: Math.round(avgDisbursementTAT * 10) / 10,
    queueAging,
    principalBuckets,
    daily,
  });
});

router.get('/sanction-letter/:loanId', async (req, res) => {
  const loan: any = await Loan.findOne({ loanId: req.params.loanId }).lean();
  if (!loan) return res.status(404).json({ error: 'Not found' });
  if (!['sanctioned', 'disbursed', 'closed'].includes(loan.status))
    return res.status(400).json({ error: 'Loan must be sanctioned to generate letter' });

  const borrower: any = await User.findById(loan.borrowerId).lean();
  const pdf = await generateSanctionLetterPdf({
    loanId: loan.loanId,
    borrowerName: borrower?.profile?.fullName || borrower?.email || 'Borrower',
    pan: borrower?.profile?.pan || 'N/A',
    principalAmount: loan.principalAmount,
    tenureDays: loan.tenureDays,
    interestRate: loan.interestRate,
    simpleInterest: loan.simpleInterest,
    totalRepayment: loan.totalRepayment,
    sanctionedAt: new Date(loan.sanctionedAt || loan.appliedAt),
    disbursementReference: loan.disbursementReference,
  });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="sanction-${loan.loanId}.pdf"`);
  res.send(pdf);
});

export default router;
