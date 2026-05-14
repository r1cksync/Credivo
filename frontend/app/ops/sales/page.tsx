'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/useAuth';
import { api } from '@/lib/api';
import { fmtDate } from '@/lib/formatters';
import StatCard from '@/components/StatCard';
import { ChartCard, LineSeries, BarSeries, DonutChart, toPie } from '@/components/Charts';
import { Users, CheckCircle2, XCircle, TrendingUp, Search } from 'lucide-react';

export default function SalesPage() {
  const { user, loading } = useAuth({ redirectTo: '/login', requireRoles: ['sales', 'admin'] });
  const [leads, setLeads] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [filter, setFilter] = useState<'all' | 'passed' | 'rejected' | 'pending'>('all');
  const [q, setQ] = useState('');
  const [selectedLead, setSelectedLead] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    const params = filter === 'all' ? '' : `?breStatus=${filter}`;
    api.get(`/api/sales/leads${params}`).then((r) => setLeads(r.data.leads));
    api.get('/api/sales/stats').then((r) => setStats(r.data));
  }, [user, filter]);

  if (loading || !user) return null;
  const filtered = q ? leads.filter((l) => (l.fullName || '').toLowerCase().includes(q.toLowerCase()) || l.email.toLowerCase().includes(q.toLowerCase())) : leads;

  function viewDetail(id: string) {
    api.get(`/api/sales/leads/${id}`).then((r) => setSelectedLead(r.data));
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div className="mb-8">
        <div className="text-xs uppercase tracking-wider text-slate-400">Sales</div>
        <h1 className="text-3xl font-semibold mt-1">Lead Management</h1>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard label="Total Leads" value={stats.totalLeads} icon={<Users className="w-4 h-4" />} />
          <StatCard label="BRE Passed" value={stats.brePassedCount} icon={<CheckCircle2 className="w-4 h-4" />} />
          <StatCard label="BRE Rejected" value={stats.breRejectedCount} icon={<XCircle className="w-4 h-4" />} />
          <StatCard label="Converted" value={stats.convertedToLoanCount} icon={<TrendingUp className="w-4 h-4" />} />
        </div>
      )}

      {stats && (
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <ChartCard title="Lead Activity (14d)" subtitle={`Conversion ${stats.conversionRate || 0}% · BRE approval ${stats.breApprovalRate || 0}%`}>
            <LineSeries data={stats.daily || []} lines={[{ key: 'registrations', name: 'Registrations', color: '#10b981' }, { key: 'brePassed', name: 'BRE Passed', color: '#3b82f6' }]} />
          </ChartCard>
          <ChartCard title="Acquisition Funnel">
            <BarSeries data={stats.funnel || []} xKey="stage" bars={[{ key: 'count', name: 'Leads', color: '#10b981' }]} />
          </ChartCard>
          <ChartCard title="Employment Mix">
            <DonutChart data={toPie(stats.employmentMix)} />
          </ChartCard>
          <ChartCard title="Age Distribution">
            <BarSeries data={Object.entries(stats.ageBuckets || {}).map(([k, v]) => ({ bucket: k, count: v }))} xKey="bucket" bars={[{ key: 'count', name: 'Leads', color: '#a78bfa' }]} />
          </ChartCard>
          {stats.topRejectionReasons?.length > 0 && (
            <div className="card-glass p-5 md:col-span-2">
              <div className="text-sm font-medium text-slate-200 mb-3">Top BRE Rejection Reasons</div>
              <div className="space-y-2">
                {stats.topRejectionReasons.map((r: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 truncate pr-3">{r.reason}</span>
                    <span className="text-rose-400 font-medium tabular-nums">{r.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="card-glass p-6">
        <div className="flex flex-wrap gap-3 mb-4 justify-between">
          <div className="flex gap-2 flex-wrap">
            {(['all', 'passed', 'rejected', 'pending'] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={'px-3 py-1.5 rounded-lg text-xs capitalize ' + (filter === f ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-white/5 text-slate-400 border border-white/10')}>
                {f === 'all' ? 'All' : `BRE ${f}`}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or email" className="input-base pl-9 py-2 text-sm" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-slate-400 border-b border-white/5">
                <th className="py-3 pr-4">Name</th>
                <th className="pr-4">Email</th>
                <th className="pr-4">Registered</th>
                <th className="pr-4">BRE</th>
                <th className="pr-4">Profile</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <tr key={l._id} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500/30 to-blue-500/30 flex items-center justify-center text-xs">{(l.fullName || l.email)[0].toUpperCase()}</div>
                      <span>{l.fullName || '—'}</span>
                    </div>
                  </td>
                  <td className="pr-4 text-slate-400">{l.email}</td>
                  <td className="pr-4 text-slate-400 text-xs">{fmtDate(l.createdAt)}</td>
                  <td className="pr-4">
                    <span className={'badge ' + (l.breStatus === 'passed' ? 'bg-emerald-500/15 text-emerald-400' : l.breStatus === 'rejected' ? 'bg-rose-500/15 text-rose-400' : 'bg-slate-500/15 text-slate-400')}>
                      {l.breStatus}
                    </span>
                  </td>
                  <td className="pr-4">
                    <div className="w-20 h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div style={{ width: l.profileComplete ? '100%' : '0%' }} className="h-full bg-emerald-500" />
                    </div>
                  </td>
                  <td><button onClick={() => viewDetail(l._id)} className="text-emerald-400 hover:underline text-xs">View</button></td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="py-8 text-center text-slate-500">No leads found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedLead && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedLead(null)}>
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} onClick={(e) => e.stopPropagation()} className="card-glass max-w-2xl w-full p-8 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-1">{selectedLead.user.profile?.fullName || selectedLead.user.email}</h2>
            <p className="text-sm text-slate-400 mb-6">{selectedLead.user.email}</p>
            {selectedLead.user.profile && (
              <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                <div><div className="text-xs text-slate-400">PAN</div><div className="font-mono">{selectedLead.user.profile.pan}</div></div>
                <div><div className="text-xs text-slate-400">DOB</div><div>{fmtDate(selectedLead.user.profile.dateOfBirth)}</div></div>
                <div><div className="text-xs text-slate-400">Salary</div><div className="font-mono">₹{selectedLead.user.profile.monthlySalary}</div></div>
                <div><div className="text-xs text-slate-400">Employment</div><div>{selectedLead.user.profile.employmentMode}</div></div>
              </div>
            )}
            {selectedLead.user.profile?.breRejectionReasons?.length > 0 && (
              <div className="card-glass p-4 mb-4 border-rose-500/20 bg-rose-500/5">
                <div className="text-xs uppercase text-rose-400 mb-2">BRE Failures</div>
                <ul className="text-sm space-y-1">{selectedLead.user.profile.breRejectionReasons.map((r: string, i: number) => <li key={i}>• {r}</li>)}</ul>
              </div>
            )}
            {selectedLead.documents?.map((d: any) => (
              <a key={d._id} href={d.presignedUrl} target="_blank" rel="noopener" className="block card-glass p-3 mb-2 text-sm hover:border-emerald-500/30">
                📄 {d.originalFilename} <span className="text-xs text-slate-500 ml-2">{d.type}</span>
              </a>
            ))}
            <h3 className="text-sm uppercase text-slate-400 mt-6 mb-2">Loans</h3>
            <div className="space-y-2">
              {selectedLead.loans.length === 0 && <div className="text-sm text-slate-500">No loans yet.</div>}
              {selectedLead.loans.map((l: any) => (
                <div key={l._id} className="card-glass p-3 text-sm flex justify-between">
                  <span className="font-mono">{l.loanId}</span>
                  <span className="uppercase text-xs text-emerald-400">{l.status}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setSelectedLead(null)} className="btn-secondary mt-6 w-full">Close</button>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
