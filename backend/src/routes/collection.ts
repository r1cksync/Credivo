import { Router } from 'express';
import { Loan } from '../models/Loan';
import { User } from '../models/User';
import { Payment } from '../models/Payment';
import { authenticate, AuthedRequest } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { generateCollectionInsight } from '../services/bedrock';

const router = Router();
router.use(authenticate, requireRole('collection', 'admin'));

router.get('/active-loans', async (_req, res) => {
  const loans = await Loan.find({ status: 'disbursed' }).sort({ disbursedAt: -1 }).lean();
  const enriched = await Promise.all(
    loans.map(async (l: any) => {
      const borrower: any = await User.findById(l.borrowerId).select('email profile').lean();
      const paymentsCount = await Payment.countDocuments({ loanId: l._id });
      const daysSinceDisbursement = l.disbursedAt
        ? Math.floor((Date.now() - new Date(l.disbursedAt).getTime()) / (1000 * 60 * 60 * 24))
        : 0;
      let aiInsight: string | undefined;
      try {
        aiInsight = await generateCollectionInsight({
          loanId: l.loanId,
          totalRepayment: l.totalRepayment,
          amountPaid: l.totalAmountPaid,
          daysSinceDisbursement,
          paymentsCount,
          tenureDays: l.tenureDays,
        });
      } catch {}
      return { ...l, borrower, paymentsCount, daysSinceDisbursement, aiInsight };
    })
  );
  return res.json({ loans: enriched });
});

router.get('/check-utr/:utr', async (req, res) => {
  const exists = await Payment.findOne({ utrNumber: req.params.utr }).lean();
  return res.json({ available: !exists });
});

router.post('/record-payment/:loanId', async (req: AuthedRequest, res) => {
  try {
    const { utrNumber, amount, paymentDate, notes } = req.body;
    if (!utrNumber || !amount || !paymentDate)
      return res.status(400).json({ error: 'utrNumber, amount, paymentDate required' });

    const loan = await Loan.findOne({ loanId: req.params.loanId });
    if (!loan) return res.status(404).json({ error: 'Loan not found' });
    if (loan.status !== 'disbursed')
      return res.status(400).json({ error: `Cannot record payment for status: ${loan.status}` });

    const amt = Number(amount);
    if (amt <= 0) return res.status(400).json({ error: 'Amount must be positive' });
    if (amt > loan.outstandingBalance + 0.01)
      return res.status(400).json({ error: `Amount exceeds outstanding balance of ₹${loan.outstandingBalance}` });

    const pd = new Date(paymentDate);
    if (pd.getTime() > Date.now()) return res.status(400).json({ error: 'Payment date cannot be in the future' });

    const existing = await Payment.findOne({ utrNumber });
    if (existing) return res.status(409).json({ error: 'UTR number already exists' });

    const payment = await Payment.create({
      loanId: loan._id,
      borrowerId: loan.borrowerId,
      recordedBy: req.user._id,
      utrNumber,
      amount: amt,
      paymentDate: pd,
      notes,
      status: 'verified',
    });

    loan.totalAmountPaid += amt;
    loan.outstandingBalance = Math.round((loan.totalRepayment - loan.totalAmountPaid) * 100) / 100;
    let autoClosed = false;
    if (loan.outstandingBalance <= 0.01) {
      loan.status = 'closed';
      loan.closedAt = new Date();
      loan.autoClosedByPayment = true;
      loan.outstandingBalance = 0;
      autoClosed = true;
      loan.activityLog.push({
        at: new Date(),
        actor: req.user._id,
        action: 'AUTO_CLOSED',
        fromStatus: 'disbursed',
        toStatus: 'closed',
        notes: 'Loan fully repaid',
      });
    }
    loan.activityLog.push({
      at: new Date(),
      actor: req.user._id,
      action: 'PAYMENT_RECORDED',
      notes: `UTR ${utrNumber}, amount ₹${amt}`,
    });
    await loan.save();

    return res.json({ payment, loan, autoClosed });
  } catch (err: any) {
    if (err.code === 11000) return res.status(409).json({ error: 'UTR number already exists' });
    return res.status(500).json({ error: err.message });
  }
});

router.get('/payments/:loanId', async (req, res) => {
  const loan = await Loan.findOne({ loanId: req.params.loanId });
  if (!loan) return res.status(404).json({ error: 'Not found' });
  const payments = await Payment.find({ loanId: loan._id }).sort({ paymentDate: -1 }).lean();
  return res.json({ payments, loan });
});

router.get('/stats', async (_req, res) => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const dayMs = 86400000;

  const [activeLoans, paymentsToday, loansClosedToday, recentPayments, closedLoans] = await Promise.all([
    Loan.find({ status: 'disbursed' }).select('outstandingBalance totalRepayment totalAmountPaid disbursedAt tenureDays principalAmount borrowerId').lean(),
    Payment.countDocuments({ createdAt: { $gte: startOfDay } }),
    Loan.countDocuments({ status: 'closed', closedAt: { $gte: startOfDay } }),
    Payment.find({ paymentDate: { $gte: new Date(Date.now() - 14 * dayMs) } }).select('paymentDate amount').lean(),
    Loan.find({ status: 'closed' }).select('disbursedAt closedAt principalAmount totalRepayment').lean(),
  ]);

  const totalOutstanding = activeLoans.reduce((s, l: any) => s + l.outstandingBalance, 0);
  const totalCollectedActive = activeLoans.reduce((s, l: any) => s + l.totalAmountPaid, 0);

  // Daily collection trend
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const daily: { date: string; count: number; amount: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const start = new Date(now.getTime() - i * dayMs);
    const end = new Date(start.getTime() + dayMs);
    const dayPays = recentPayments.filter((p: any) => new Date(p.paymentDate) >= start && new Date(p.paymentDate) < end);
    daily.push({
      date: `${start.getDate()}/${start.getMonth() + 1}`,
      count: dayPays.length,
      amount: dayPays.reduce((s: number, p: any) => s + p.amount, 0),
    });
  }

  // Aging buckets — days since disbursement
  const aging = { 'Current (<30d)': 0, '30-60d': 0, '60-90d': 0, '90d+': 0 };
  activeLoans.forEach((l: any) => {
    const days = (Date.now() - new Date(l.disbursedAt).getTime()) / dayMs;
    if (days < 30) aging['Current (<30d)']++;
    else if (days < 60) aging['30-60d']++;
    else if (days < 90) aging['60-90d']++;
    else aging['90d+']++;
  });

  // Repayment progress distribution
  const progress = { '0-25%': 0, '25-50%': 0, '50-75%': 0, '75-100%': 0 };
  activeLoans.forEach((l: any) => {
    const p = (l.totalAmountPaid / l.totalRepayment) * 100;
    if (p < 25) progress['0-25%']++;
    else if (p < 50) progress['25-50%']++;
    else if (p < 75) progress['50-75%']++;
    else progress['75-100%']++;
  });

  // Avg time to close
  const closeDurations = closedLoans
    .filter((l: any) => l.disbursedAt && l.closedAt)
    .map((l: any) => (new Date(l.closedAt).getTime() - new Date(l.disbursedAt).getTime()) / dayMs);
  const avgDaysToClose = closeDurations.length ? closeDurations.reduce((a, b) => a + b, 0) / closeDurations.length : 0;

  // Collection efficiency
  const totalDisbursedPrincipal = activeLoans.reduce((s, l: any) => s + l.principalAmount, 0) + closedLoans.reduce((s, l: any) => s + l.principalAmount, 0);
  const totalCollectedAll = totalCollectedActive + closedLoans.reduce((s, l: any) => s + l.totalRepayment, 0);
  const collectionEfficiency = totalDisbursedPrincipal ? Math.round((totalCollectedAll / totalDisbursedPrincipal) * 1000) / 10 : 0;

  return res.json({
    activeLoansCount: activeLoans.length,
    totalOutstanding: Math.round(totalOutstanding * 100) / 100,
    totalCollectedActive: Math.round(totalCollectedActive * 100) / 100,
    paymentsRecordedToday: paymentsToday,
    loansClosedToday,
    avgDaysToClose: Math.round(avgDaysToClose * 10) / 10,
    collectionEfficiency,
    daily,
    aging,
    progress,
  });
});

export default router;
