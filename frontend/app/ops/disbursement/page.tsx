'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuth } from '@/lib/useAuth';
import { api } from '@/lib/api';
import { inr, fmtDate, daysAgo } from '@/lib/formatters';
import StatCard from '@/components/StatCard';
import { ChartCard, BarSeries, DonutChart, toPie } from '@/components/Charts';
import { Banknote, Clock, TrendingUp, Download, Send } from 'lucide-react';

const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function DisbursementPage() {
  const { user, loading } = useAuth({ redirectTo: '/login', requireRoles: ['disbursement', 'admin'] });
  const [tab, setTab] = useState<'queue' | 'history'>('queue');
  const [loans, setLoans] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [confirming, setConfirming] = useState<any>(null);
  const [reference, setReference] = useState('');

  function reload() {
    if (tab === 'queue') api.get('/api/disbursement/queue').then((r) => setLoans(r.data.loans));
    else api.get('/api/disbursement/history').then((r) => setLoans(r.data.loans));
    api.get('/api/disbursement/stats').then((r) => setStats(r.data));
  }

  useEffect(() => { if (user) reload(); }, [user, tab]);
  if (loading || !user) return null;

  async function disburse() {
    try {
      await api.post(`/api/disbursement/disburse/${confirming.loanId}`, { disbursementReference: reference || undefined });
      toast.success(`Disbursed ${confirming.loanId}`);
      setConfirming(null);
      setReference('');
      reload();
    } catch (e: any) { toast.error(e.response?.data?.error || 'Failed'); }
  }

  async function downloadLetter(loanId: string) {
    try {
      const Cookies = (await import('js-cookie')).default;
      const token = Cookies.get('credivo_token');
      const res = await fetch(`${apiBase}/api/disbursement/sanction-letter/${loanId}`, { headers: { Authorization: `Bearer ${token}` } });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `sanction-${loanId}.pdf`; a.click(); URL.revokeObjectURL(url);
    } catch { toast.error('Could not download'); }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div className="mb-8">
        <div className="text-xs uppercase tracking-wider text-slate-400">Disbursement</div>
        <h1 className="text-3xl font-semibold mt-1">Fund Release</h1>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard label="Pending Queue" value={stats.pendingDisbursement} icon={<Clock className="w-4 h-4" />} />
          <StatCard label="Disbursed Today" value={stats.disbursedToday} icon={<Banknote className="w-4 h-4" />} />
          <StatCard label="Amount Today" value={inr(stats.totalAmountDisbursedToday)} icon={<TrendingUp className="w-4 h-4" />} />
          <StatCard label="Avg TAT" value={`${stats.avgDisbursementTAT || 0}h`} icon={<Send className="w-4 h-4" />} />
        </div>
      )}

      {stats && (
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <ChartCard title="Daily Disbursements (14d)" subtitle={`Lifetime ${stats.lifetimeDisbursedCount || 0} loans · ${inr(stats.lifetimeDisbursedAmount || 0)}`}>
            <BarSeries data={stats.daily || []} bars={[{ key: 'count', name: 'Loans', color: '#10b981' }]} />
          </ChartCard>
          <ChartCard title="Daily Amount (14d)">
            <BarSeries data={stats.daily || []} bars={[{ key: 'amount', name: 'INR', color: '#3b82f6' }]} />
          </ChartCard>
          <ChartCard title="Queue Aging">
            <DonutChart data={toPie(stats.queueAging)} />
          </ChartCard>
          <ChartCard title="Pending Principal Distribution">
            <BarSeries data={Object.entries(stats.principalBuckets || {}).map(([k, v]) => ({ bucket: k, count: v }))} xKey="bucket" bars={[{ key: 'count', name: 'Loans', color: '#a78bfa' }]} />
          </ChartCard>
        </div>
      )}

      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab('queue')} className={'px-4 py-2 rounded-lg text-sm ' + (tab === 'queue' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-white/5 text-slate-400 border border-white/10')}>Queue</button>
        <button onClick={() => setTab('history')} className={'px-4 py-2 rounded-lg text-sm ' + (tab === 'history' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-white/5 text-slate-400 border border-white/10')}>History</button>
      </div>

      <div className="card-glass p-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs uppercase text-slate-400 border-b border-white/5">
            <th className="py-3 pr-4">Loan ID</th><th className="pr-4">Borrower</th><th className="pr-4">Amount</th>
            <th className="pr-4">{tab === 'queue' ? 'Sanctioned' : 'Disbursed'}</th>
            {tab === 'queue' && <th className="pr-4">Waiting</th>}
            {tab === 'history' && <th className="pr-4">Reference</th>}
            <th></th>
          </tr></thead>
          <tbody>
            {loans.map((l) => (
              <tr key={l._id} className="border-b border-white/5">
                <td className="py-3 pr-4 font-mono text-xs">{l.loanId}</td>
                <td className="pr-4">{l.borrower?.profile?.fullName || l.borrower?.email}</td>
                <td className="pr-4 font-mono">{inr(l.principalAmount)}</td>
                <td className="pr-4 text-slate-400 text-xs">{fmtDate(tab === 'queue' ? l.sanctionedAt : l.disbursedAt)}</td>
                {tab === 'queue' && <td className="pr-4 text-slate-400 text-xs">{daysAgo(l.sanctionedAt)} days</td>}
                {tab === 'history' && <td className="pr-4 font-mono text-xs">{l.disbursementReference}</td>}
                <td className="space-x-3">
                  {tab === 'queue' && (
                    <button onClick={() => { setConfirming(l); setReference(`DISB-${Date.now()}`); }} className="inline-flex items-center gap-1 text-emerald-400 hover:underline text-xs"><Send className="w-3 h-3" /> Disburse</button>
                  )}
                  <button onClick={() => downloadLetter(l.loanId)} className="inline-flex items-center gap-1 text-slate-400 hover:text-emerald-400 text-xs"><Download className="w-3 h-3" /> Letter</button>
                </td>
              </tr>
            ))}
            {loans.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-slate-500">Nothing to show</td></tr>}
          </tbody>
        </table>
      </div>

      {confirming && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="card-glass max-w-md w-full p-6">
            <h2 className="text-lg font-semibold mb-1">Confirm disbursement</h2>
            <p className="text-sm text-slate-400 mb-4">This action will mark the loan as disbursed.</p>
            <div className="card-glass p-3 mb-4 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-slate-400">Loan</span><span className="font-mono">{confirming.loanId}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Amount</span><span className="font-mono text-emerald-400">{inr(confirming.principalAmount)}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Borrower</span><span>{confirming.borrower?.profile?.fullName}</span></div>
            </div>
            <label className="text-xs text-slate-400 mb-1 block">Reference</label>
            <input value={reference} onChange={(e) => setReference(e.target.value)} className="input-base font-mono text-sm" />
            <div className="flex gap-2 mt-4">
              <button onClick={() => setConfirming(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={disburse} className="btn-primary flex-1">Confirm</button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
