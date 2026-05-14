import { Router } from 'express';
import { User } from '../models/User';
import { Loan } from '../models/Loan';
import { DocumentModel } from '../models/Document';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { getPresignedUrl } from '../services/s3';

const router = Router();
router.use(authenticate, requireRole('sales', 'admin'));

router.get('/leads', async (req, res) => {
  const { breStatus, sortBy = 'createdAt' } = req.query;
  const filter: any = { role: 'borrower' };
  if (breStatus === 'passed') filter['profile.breStatus'] = 'passed';
  else if (breStatus === 'rejected') filter['profile.breStatus'] = 'rejected';
  else if (breStatus === 'pending') filter.$or = [{ profile: { $exists: false } }, { 'profile.breStatus': 'pending' }];

  const sortField = sortBy === 'name' ? 'profile.fullName' : 'createdAt';
  const borrowers = await User.find(filter).sort({ [sortField]: -1 }).lean();

  const loans = await Loan.find({ borrowerId: { $in: borrowers.map((b) => b._id) } })
    .select('borrowerId status')
    .lean();
  const borrowerLoanMap: Record<string, string[]> = {};
  loans.forEach((l) => {
    const id = l.borrowerId.toString();
    if (!borrowerLoanMap[id]) borrowerLoanMap[id] = [];
    borrowerLoanMap[id].push(l.status);
  });

  const leads = borrowers.map((b) => ({
    _id: b._id,
    email: b.email,
    createdAt: b.createdAt,
    profile: b.profile,
    breStatus: b.profile?.breStatus || 'pending',
    profileComplete: !!b.profile,
    fullName: b.profile?.fullName,
    loanStatuses: borrowerLoanMap[b._id.toString()] || [],
    hasLoan: !!borrowerLoanMap[b._id.toString()]?.length,
  }));

  return res.json({ leads, total: leads.length });
});

router.get('/leads/:userId', async (req, res) => {
  const user = await User.findById(req.params.userId).lean();
  if (!user) return res.status(404).json({ error: 'Not found' });
  const loans = await Loan.find({ borrowerId: user._id }).sort({ createdAt: -1 }).lean();
  const documents = await DocumentModel.find({ ownerId: user._id }).lean();

  const docsWithUrls = await Promise.all(
    documents.map(async (d) => ({ ...d, presignedUrl: await getPresignedUrl(d.s3Key, 3600).catch(() => d.s3Url) }))
  );

  return res.json({ user, loans, documents: docsWithUrls });
});

router.get('/stats', async (_req, res) => {
  const all = await User.find({ role: 'borrower' }).lean();
  const totalLeads = all.length;
  const brePassedCount = all.filter((u) => u.profile?.breStatus === 'passed').length;
  const breRejectedCount = all.filter((u) => u.profile?.breStatus === 'rejected').length;
  const pendingBRECount = totalLeads - brePassedCount - breRejectedCount;
  const borrowerIds = all.map((u) => u._id);
  const convertedBorrowerIds = await Loan.distinct('borrowerId', { borrowerId: { $in: borrowerIds } });
  const convertedToLoanCount = convertedBorrowerIds.length;

  // Daily registrations (last 14 days)
  const dayMs = 86400000;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const daily: { date: string; registrations: number; brePassed: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const start = new Date(now.getTime() - i * dayMs);
    const end = new Date(start.getTime() + dayMs);
    const label = `${start.getDate()}/${start.getMonth() + 1}`;
    const dayUsers = all.filter((u: any) => {
      const c = new Date(u.createdAt);
      return c >= start && c < end;
    });
    daily.push({
      date: label,
      registrations: dayUsers.length,
      brePassed: dayUsers.filter((u: any) => u.profile?.breStatus === 'passed').length,
    });
  }

  // Employment mode mix
  const employmentMix: Record<string, number> = { salaried: 0, 'self-employed': 0, unemployed: 0, unknown: 0 };
  all.forEach((u: any) => {
    const m = u.profile?.employmentMode || 'unknown';
    employmentMix[m] = (employmentMix[m] || 0) + 1;
  });

  // Age distribution
  const ageBuckets = { '18-25': 0, '26-35': 0, '36-45': 0, '46-55': 0, '55+': 0 };
  all.forEach((u: any) => {
    if (!u.profile?.dateOfBirth) return;
    const dob = new Date(u.profile.dateOfBirth);
    const age = new Date().getFullYear() - dob.getFullYear();
    if (age <= 25) ageBuckets['18-25']++;
    else if (age <= 35) ageBuckets['26-35']++;
    else if (age <= 45) ageBuckets['36-45']++;
    else if (age <= 55) ageBuckets['46-55']++;
    else ageBuckets['55+']++;
  });

  // Top rejection reasons
  const reasonCount: Record<string, number> = {};
  all.forEach((u: any) => {
    (u.profile?.breRejectionReasons || []).forEach((r: string) => {
      const key = r.split('.')[0].slice(0, 60);
      reasonCount[key] = (reasonCount[key] || 0) + 1;
    });
  });
  const topRejectionReasons = Object.entries(reasonCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([reason, count]) => ({ reason, count }));

  // Funnel
  const profileFilled = all.filter((u: any) => !!u.profile).length;
  const funnel = [
    { stage: 'Registered', count: totalLeads },
    { stage: 'Profile Filled', count: profileFilled },
    { stage: 'BRE Passed', count: brePassedCount },
    { stage: 'Applied for Loan', count: convertedToLoanCount },
  ];

  // Conversion rate
  const conversionRate = totalLeads ? Math.round((convertedToLoanCount / totalLeads) * 1000) / 10 : 0;
  const breApprovalRate = totalLeads ? Math.round((brePassedCount / totalLeads) * 1000) / 10 : 0;

  return res.json({
    totalLeads,
    brePassedCount,
    breRejectedCount,
    pendingBRECount,
    convertedToLoanCount,
    conversionRate,
    breApprovalRate,
    daily,
    employmentMix,
    ageBuckets,
    topRejectionReasons,
    funnel,
  });
});

export default router;
