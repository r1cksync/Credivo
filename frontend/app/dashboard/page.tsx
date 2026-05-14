'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import BorrowerNav from '@/components/BorrowerNav';
import LoanStatusBadge from '@/components/LoanStatusBadge';
import { useAuth } from '@/lib/useAuth';
import { api } from '@/lib/api';
import { inr, inrPrecise, fmtDate, daysAgo } from '@/lib/formatters';
import { Sparkles, FileText, Upload, Coins, ArrowRight, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function BorrowerDashboard() {
  const { user, loading } = useAuth({ redirectTo: '/login', requireRoles: ['borrower'] });
  const [loans, setLoans] = useState<any[]>([]);
  const [fetched, setFetched] = useState(false);

  useEffect(() => {
    if (!user) return;
    api.get('/api/borrower/loans').then((r) => setLoans(r.data.loans)).finally(() => setFetched(true));
  }, [user]);

  if (loading || !user) return <main className="min-h-screen flex items-center justify-center text-slate-400">Loading…</main>;
  const activeLoan = loans.find((l) => ['applied', 'sanctioned', 'disbursed'].includes(l.status)) || loans[0];

  return (
    <>
      <BorrowerNav />
      <main className="max-w-6xl mx-auto px-6 py-10">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="text-sm text-slate-400">Welcome back,</div>
          <h1 className="text-3xl font-semibold mt-1">{user.profile?.fullName || user.email.split('@')[0]}</h1>
        </motion.div>

        {!user.profile?.fullName && (
          <div className="card-glass p-8 mb-6 flex items-center gap-6 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <div className="text-xs uppercase tracking-wider text-amber-400 mb-1">Profile incomplete</div>
              <h3 className="text-xl font-semibold">Complete your profile to apply</h3>
              <p className="text-slate-400 text-sm mt-1">We need a few details to verify your eligibility.</p>
            </div>
            <Link href="/apply/personal-details" className="btn-primary inline-flex items-center gap-2">
              Start application <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {fetched && loans.length === 0 && user.profile?.fullName && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card-glass p-8 mb-6">
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              {[
                { icon: FileText, title: '1. Personal Details', desc: 'PAN, salary & employment' },
                { icon: Upload, title: '2. Upload Salary Slip', desc: 'AI-verified by Textract' },
                { icon: Coins, title: '3. Configure Loan', desc: 'Choose amount & tenure' },
              ].map((s, i) => (
                <div key={i} className="card-glass p-4">
                  <s.icon className="w-5 h-5 text-emerald-400 mb-2" />
                  <div className="font-medium">{s.title}</div>
                  <div className="text-xs text-slate-400">{s.desc}</div>
                </div>
              ))}
            </div>
            <Link href="/apply" className="btn-primary inline-flex items-center gap-2">
              Apply for a loan <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        )}

        {activeLoan && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card-glass p-8 mb-6">
            <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
              <div>
                <div className="text-xs uppercase tracking-wider text-slate-400">Loan ID</div>
                <div className="font-mono text-lg mt-1">{activeLoan.loanId}</div>
              </div>
              <LoanStatusBadge status={activeLoan.status} large />
            </div>

            <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div>
                <div className="text-xs text-slate-400">Principal</div>
                <div className="text-xl font-semibold font-mono mt-1">{inr(activeLoan.principalAmount)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Tenure</div>
                <div className="text-xl font-semibold font-mono mt-1">{activeLoan.tenureDays} days</div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Total Repayment</div>
                <div className="text-xl font-semibold font-mono mt-1 text-emerald-400">{inrPrecise(activeLoan.totalRepayment)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Interest</div>
                <div className="text-xl font-semibold font-mono mt-1">{inrPrecise(activeLoan.simpleInterest)}</div>
              </div>
            </div>

            {activeLoan.status === 'disbursed' && (
              <div className="card-glass p-5 mb-4">
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-slate-400">Repayment progress</span>
                  <span className="text-sm font-mono text-emerald-400">
                    {((activeLoan.totalAmountPaid / activeLoan.totalRepayment) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(activeLoan.totalAmountPaid / activeLoan.totalRepayment) * 100}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="h-full bg-gradient-to-r from-emerald-500 to-blue-500"
                  />
                </div>
                <div className="mt-3 flex justify-between text-sm">
                  <span className="text-slate-400">Paid: <span className="text-emerald-400 font-mono">{inrPrecise(activeLoan.totalAmountPaid)}</span></span>
                  <span className="text-slate-400">Outstanding: <span className="text-amber-400 font-mono">{inrPrecise(activeLoan.outstandingBalance)}</span></span>
                </div>
              </div>
            )}

            {activeLoan.status === 'rejected' && (
              <div className="card-glass p-5 border-rose-500/20 bg-rose-500/5">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium text-rose-400">Application rejected</div>
                    <div className="text-sm text-slate-300 mt-1">{activeLoan.rejectionReason}</div>
                  </div>
                </div>
              </div>
            )}

            {activeLoan.status === 'closed' && (
              <div className="card-glass p-5 border-emerald-500/20 bg-emerald-500/5">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium text-emerald-400">Loan fully repaid 🎉</div>
                    <div className="text-sm text-slate-300 mt-1">Closed on {fmtDate(activeLoan.closedAt)} · Thank you for choosing Credivo.</div>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 flex gap-3 flex-wrap">
              <Link href={`/loans/${activeLoan.loanId}`} className="btn-primary text-sm">View details</Link>
              <Link href="/loans" className="btn-secondary text-sm">All loans</Link>
            </div>
          </motion.div>
        )}

        {user.profile?.breStatus === 'rejected' && (
          <div className="card-glass p-6 border-rose-500/20 bg-rose-500/5">
            <div className="flex items-center gap-2 text-rose-400 font-medium mb-3">
              <AlertTriangle className="w-5 h-5" /> Your eligibility check did not pass
            </div>
            <ul className="space-y-1 text-sm text-slate-300">
              {(user.profile.breRejectionReasons || []).map((r: string, i: number) => (
                <li key={i}>• {r}</li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </>
  );
}
