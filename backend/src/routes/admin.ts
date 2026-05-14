import { Router } from 'express';
import { User } from '../models/User';
import { Loan } from '../models/Loan';
import { Payment } from '../models/Payment';
import { authenticate, AuthedRequest } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';

const router = Router();
router.use(authenticate, requireRole('admin'));

router.get('/dashboard', async (_req, res) => {
  const [totalUsers, totalBorrowers, loans, payments] = await Promise.all([
    User.countDocuments({}),
    User.countDocuments({ role: 'borrower' }),
    Loan.find({}).lean(),
    Payment.find({}).lean(),
  ]);

  const loansByStatus = {
    applied: 0,
    sanctioned: 0,
    disbursed: 0,
    closed: 0,
    rejected: 0,
  };
  let totalDisbursedAmount = 0;
  let totalRepaidAmount = 0;
  let totalOutstanding = 0;
  loans.forEach((l: any) => {
    loansByStatus[l.status as keyof typeof loansByStatus]++;
    if (l.status === 'disbursed' || l.status === 'closed') totalDisbursedAmount += l.principalAmount;
    totalRepaidAmount += l.totalAmountPaid;
    if (l.status === 'disbursed') totalOutstanding += l.outstandingBalance;
  });

  // Recent activity from loans
  const recentLoans = await Loan.find({}).sort({ updatedAt: -1 }).limit(10).lean();
  const recentActivity = recentLoans.map((l: any) => ({
    loanId: l.loanId,
    status: l.status,
    updatedAt: l.updatedAt,
    lastActivity: l.activityLog?.[l.activityLog.length - 1] || null,
  }));

  // Monthly chart data (last 6 months)
  const now = new Date();
  const monthly: { month: string; applied: number; closed: number; disbursedAmount: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const monthLoans = loans.filter((l: any) => {
      const a = new Date(l.appliedAt);
      return a >= start && a < end;
    });
    const closedThisMonth = loans.filter((l: any) => l.closedAt && new Date(l.closedAt) >= start && new Date(l.closedAt) < end);
    const disbursedThisMonth = loans.filter((l: any) => l.disbursedAt && new Date(l.disbursedAt) >= start && new Date(l.disbursedAt) < end);
    monthly.push({
      month: start.toLocaleString('en-IN', { month: 'short' }),
      applied: monthLoans.length,
      closed: closedThisMonth.length,
      disbursedAmount: disbursedThisMonth.reduce((s, l: any) => s + l.principalAmount, 0),
    });
  }

  return res.json({
    totalUsers,
    totalBorrowers,
    totalLoans: loans.length,
    totalPayments: payments.length,
    loansByStatus,
    totalDisbursedAmount: Math.round(totalDisbursedAmount * 100) / 100,
    totalRepaidAmount: Math.round(totalRepaidAmount * 100) / 100,
    totalOutstanding: Math.round(totalOutstanding * 100) / 100,
    recentActivity,
    monthly,
  });
});

router.get('/users', async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const filter: any = {};
  if (req.query.role) filter.role = req.query.role;
  const [users, total] = await Promise.all([
    User.find(filter)
      .select('-passwordHash')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);
  return res.json({ users, total, page, limit });
});

router.get('/loans', async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const filter: any = {};
  if (req.query.status) filter.status = req.query.status;
  const [loans, total] = await Promise.all([
    Loan.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Loan.countDocuments(filter),
  ]);
  const enriched = await Promise.all(
    loans.map(async (l: any) => {
      const b: any = await User.findById(l.borrowerId).select('email profile').lean();
      return { ...l, borrower: b };
    })
  );
  return res.json({ loans: enriched, total, page, limit });
});

router.patch('/loans/:loanId/status', async (req: AuthedRequest, res) => {
  const { status, notes } = req.body;
  if (!['applied', 'sanctioned', 'rejected', 'disbursed', 'closed'].includes(status))
    return res.status(400).json({ error: 'Invalid status' });
  const loan = await Loan.findOne({ loanId: req.params.loanId });
  if (!loan) return res.status(404).json({ error: 'Not found' });
  const from = loan.status;
  loan.status = status;
  loan.activityLog.push({
    at: new Date(),
    actor: req.user._id,
    action: `ADMIN_OVERRIDE_${status.toUpperCase()}`,
    fromStatus: from,
    toStatus: status,
    notes,
  });
  if (status === 'sanctioned' && !loan.sanctionedAt) {
    loan.sanctionedAt = new Date();
    loan.sanctionedBy = req.user._id;
  }
  if (status === 'disbursed' && !loan.disbursedAt) {
    loan.disbursedAt = new Date();
    loan.disbursedBy = req.user._id;
    loan.disbursementReference = loan.disbursementReference || `DISB-${Date.now()}`;
  }
  if (status === 'closed' && !loan.closedAt) {
    loan.closedAt = new Date();
  }
  if (status === 'rejected' && !loan.rejectedAt) {
    loan.rejectedAt = new Date();
    loan.rejectedBy = req.user._id;
    loan.rejectionReason = notes || 'Admin override';
  }
  await loan.save();
  return res.json({ loan });
});

export default router;
