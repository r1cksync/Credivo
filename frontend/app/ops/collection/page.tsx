'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/useAuth';
import { api } from '@/lib/api';
import { inr, inrPrecise } from '@/lib/formatters';
import StatCard from '@/components/StatCard';
import { ChartCard, BarSeries, DonutChart, toPie } from '@/components/Charts';
import { Wallet, Receipt, CheckCircle2, Activity } from 'lucide-react';

export default function CollectionPage() {
  const { user, loading } = useAuth({ redirectTo: '/login', requireRoles: ['collection', 'admin'] });
  const [loans, setLoans] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    api.get('/api/collection/active-loans').then((r) => setLoans(r.data.loans));
    api.get('/api/collection/stats').then((r) => setStats(r.data));
  }, [user]);

  if (loading || !user) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div className="mb-8">
        <div className="text-xs uppercase tracking-wider text-slate-400">Collection</div>
        <h1 className="text-3xl font-semibold mt-1">Active Loans</h1>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard label="Active Loans" value={stats.activeLoansCount} icon={<Activity className="w-4 h-4" />} />
          <StatCard label="Outstanding" value={inr(stats.totalOutstanding)} icon={<Wallet className="w-4 h-4" />} />
          <StatCard label="Payments Today" value={stats.paymentsRecordedToday} icon={<Receipt className="w-4 h-4" />} />
          <StatCard label="Closed Today" value={stats.loansClosedToday} icon={<CheckCircle2 className="w-4 h-4" />} />
        </div>
      )}

      {stats && (
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <ChartCard title="Daily Collections (14d)" subtitle={`Efficiency ${stats.collectionEfficiency || 0}% · Avg close ${stats.avgDaysToClose || 0}d`}>
            <BarSeries data={stats.daily || []} bars={[{ key: 'amount', name: 'INR', color: '#10b981' }]} />
          </ChartCard>
          <ChartCard title="Loan Aging">
            <DonutChart data={toPie(stats.aging)} />
          </ChartCard>
          <ChartCard title="Repayment Progress Distribution">
            <BarSeries data={Object.entries(stats.progress || {}).map(([k, v]) => ({ bucket: k, count: v }))} xKey="bucket" bars={[{ key: 'count', name: 'Loans', color: '#3b82f6' }]} />
          </ChartCard>
          <ChartCard title="Daily Payment Count (14d)">
            <BarSeries data={stats.daily || []} bars={[{ key: 'count', name: 'Payments', color: '#a78bfa' }]} />
          </ChartCard>
        </div>
      )}

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loans.map((l) => {
          const pct = (l.totalAmountPaid / l.totalRepayment) * 100;
          return (
            <Link key={l._id} href={`/ops/collection/${l.loanId}`} className="card-glass p-5 hover:border-emerald-500/30">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="font-mono text-xs text-slate-400">{l.loanId}</div>
                  <div className="font-semibold mt-1">{l.borrower?.profile?.fullName || l.borrower?.email}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs mb-4">
                <div><div className="text-slate-400">Principal</div><div className="font-mono">{inr(l.principalAmount)}</div></div>
                <div><div className="text-slate-400">Total Due</div><div className="font-mono text-emerald-400">{inrPrecise(l.totalRepayment)}</div></div>
              </div>
              <div className="mb-2 flex justify-between text-xs"><span>Progress</span><span className="font-mono text-emerald-400">{pct.toFixed(1)}%</span></div>
              <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6 }} className="h-full bg-gradient-to-r from-emerald-500 to-blue-500" />
              </div>
              <div className="mt-2 flex justify-between text-xs">
                <span className="text-slate-400">Paid <span className="font-mono text-slate-300">{inr(l.totalAmountPaid)}</span></span>
                <span className="text-slate-400">Due <span className="font-mono text-amber-400">{inr(l.outstandingBalance)}</span></span>
              </div>
              <div className="text-xs text-slate-500 mt-3">{l.daysSinceDisbursement} days since disbursement · {l.paymentsCount} payments</div>
              {l.aiInsight && (
                <div className="mt-3 text-xs italic text-slate-400 border-l-2 border-emerald-500/40 pl-3 line-clamp-3">{l.aiInsight}</div>
              )}
            </Link>
          );
        })}
        {loans.length === 0 && <div className="text-slate-400 col-span-full">No active loans.</div>}
      </div>
    </motion.div>
  );
}
