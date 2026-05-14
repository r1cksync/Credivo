'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/useAuth';
import { api } from '@/lib/api';
import { inr, fmtDate, daysAgo } from '@/lib/formatters';
import StatCard from '@/components/StatCard';
import { ChartCard, LineSeries, BarSeries, DonutChart, toPie } from '@/components/Charts';
import { FileCheck2, Clock, CheckCircle2, XCircle } from 'lucide-react';

function riskFromSummary(s?: string) {
  if (!s) return 'PENDING';
  const m = s.match(/risk level:\s*(low|medium|high)/i);
  return m ? m[1].toUpperCase() : 'PENDING';
}

const riskClass: Record<string, string> = {
  LOW: 'bg-emerald-500/15 text-emerald-400',
  MEDIUM: 'bg-amber-500/15 text-amber-400',
  HIGH: 'bg-rose-500/15 text-rose-400',
  PENDING: 'bg-slate-500/15 text-slate-400',
};

export default function SanctionPage() {
  const { user, loading } = useAuth({ redirectTo: '/login', requireRoles: ['sanction', 'admin'] });
  const [loans, setLoans] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoadingData(true);
    api.get('/api/sanction/queue').then((r) => setLoans(r.data.loans)).finally(() => setLoadingData(false));
    api.get('/api/sanction/stats').then((r) => setStats(r.data));
  }, [user]);

  if (loading || !user) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div className="mb-8">
        <div className="text-xs uppercase tracking-wider text-slate-400">Sanction</div>
        <h1 className="text-3xl font-semibold mt-1">Pending Approvals</h1>
      </div>
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard label="Pending" value={stats.pendingCount} icon={<Clock className="w-4 h-4" />} />
          <StatCard label="Approved Today" value={stats.approvedToday} icon={<CheckCircle2 className="w-4 h-4" />} />
          <StatCard label="Rejected Today" value={stats.rejectedToday} icon={<XCircle className="w-4 h-4" />} />
          <StatCard label="Avg Processing" value={`${stats.avgProcessingHours}h`} icon={<FileCheck2 className="w-4 h-4" />} />
        </div>
      )}

      {stats && (
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <ChartCard title="Daily Decisions (14d)" subtitle={`Overall approval rate ${stats.approvalRate || 0}%`}>
            <LineSeries data={stats.daily || []} lines={[{ key: 'approved', name: 'Approved', color: '#10b981' }, { key: 'rejected', name: 'Rejected', color: '#ef4444' }]} />
          </ChartCard>
          <ChartCard title="Risk Mix (Pending Queue)">
            <DonutChart data={toPie(stats.riskMix)} />
          </ChartCard>
          <ChartCard title="Queue Aging">
            <BarSeries data={Object.entries(stats.queueAging || {}).map(([k, v]) => ({ bucket: k, count: v }))} xKey="bucket" bars={[{ key: 'count', name: 'Pending', color: '#f59e0b' }]} />
          </ChartCard>
          <ChartCard title="Principal Distribution">
            <BarSeries data={Object.entries(stats.principalBuckets || {}).map(([k, v]) => ({ bucket: k, count: v }))} xKey="bucket" bars={[{ key: 'count', name: 'Loans', color: '#3b82f6' }]} />
          </ChartCard>
        </div>
      )}

      <div className="card-glass p-6">
        {loadingData && <div className="text-slate-400">Loading queue (running AI risk analysis)…</div>}
        {!loadingData && loans.length === 0 && <div className="text-slate-400">No applications pending.</div>}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs uppercase text-slate-400 border-b border-white/5">
              <th className="py-3 pr-4">Loan ID</th><th className="pr-4">Borrower</th><th className="pr-4">Amount</th>
              <th className="pr-4">Tenure</th><th className="pr-4">Applied</th><th className="pr-4">Risk</th><th></th>
            </tr></thead>
            <tbody>
              {loans.map((l) => {
                const risk = riskFromSummary(l.aiRiskSummary);
                return (
                  <tr key={l._id} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="py-3 pr-4 font-mono text-xs">{l.loanId}</td>
                    <td className="pr-4">{l.borrower?.profile?.fullName || l.borrower?.email}</td>
                    <td className="pr-4 font-mono">{inr(l.principalAmount)}</td>
                    <td className="pr-4">{l.tenureDays} days</td>
                    <td className="pr-4 text-slate-400 text-xs">{fmtDate(l.appliedAt)}</td>
                    <td className="pr-4"><span className={'badge ' + riskClass[risk]}>{risk}</span></td>
                    <td><Link href={`/ops/sanction/${l.loanId}`} className="text-emerald-400 hover:underline text-xs">Review →</Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
