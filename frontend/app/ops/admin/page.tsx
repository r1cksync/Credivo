'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, CartesianGrid } from 'recharts';
import { useAuth } from '@/lib/useAuth';
import { api } from '@/lib/api';
import { inr } from '@/lib/formatters';
import StatCard from '@/components/StatCard';
import LoanStatusBadge from '@/components/LoanStatusBadge';
import { Users, FileText, Banknote, Wallet, Activity, CircleDollarSign } from 'lucide-react';

const COLORS: Record<string, string> = { applied: '#fbbf24', sanctioned: '#3b82f6', disbursed: '#10b981', closed: '#64748b', rejected: '#f43f5e' };

export default function AdminPage() {
  const { user, loading } = useAuth({ redirectTo: '/login', requireRoles: ['admin'] });
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    if (user) api.get('/api/admin/dashboard').then((r) => setData(r.data));
  }, [user]);
  if (loading || !user) return null;
  if (!data) return <div className="text-slate-400">Loading dashboard…</div>;

  const pieData = Object.entries(data.loansByStatus).map(([k, v]) => ({ name: k, value: v as number, fill: COLORS[k] }));

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div className="mb-8">
        <div className="text-xs uppercase tracking-wider text-slate-400">Operations</div>
        <h1 className="text-3xl font-semibold mt-1">Admin Overview</h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <StatCard label="Total Loans" value={data.totalLoans} icon={<FileText className="w-4 h-4" />} />
        <StatCard label="Applied" value={data.loansByStatus.applied} />
        <StatCard label="Sanctioned" value={data.loansByStatus.sanctioned} />
        <StatCard label="Disbursed" value={data.loansByStatus.disbursed} />
        <StatCard label="Closed" value={data.loansByStatus.closed} />
        <StatCard label="Rejected" value={data.loansByStatus.rejected} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard label="Total Disbursed" value={inr(data.totalDisbursedAmount)} icon={<Banknote className="w-4 h-4" />} />
        <StatCard label="Total Repaid" value={inr(data.totalRepaidAmount)} icon={<CircleDollarSign className="w-4 h-4" />} />
        <StatCard label="Outstanding" value={inr(data.totalOutstanding)} icon={<Wallet className="w-4 h-4" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="card-glass p-6">
          <h3 className="text-sm uppercase tracking-wider text-slate-400 mb-4">Loan Status Distribution</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={4}>
                {pieData.map((entry, idx) => (
                  <Cell key={idx} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: '#0a1628', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-2 mt-2 justify-center">
            {pieData.map((d) => (
              <div key={d.name} className="text-xs flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: d.fill }} />
                <span className="text-slate-400 capitalize">{d.name}</span>
                <span className="font-mono">{d.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card-glass p-6">
          <h3 className="text-sm uppercase tracking-wider text-slate-400 mb-4">Monthly Activity</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={data.monthly}>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} />
              <Tooltip contentStyle={{ background: '#0a1628', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
              <Line type="monotone" dataKey="applied" stroke="#fbbf24" strokeWidth={2} />
              <Line type="monotone" dataKey="closed" stroke="#10b981" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card-glass p-6">
          <h3 className="text-sm uppercase tracking-wider text-slate-400 mb-4">Disbursed (₹) by Month</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.monthly}>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} />
              <Tooltip contentStyle={{ background: '#0a1628', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
              <Bar dataKey="disbursedAmount" fill="#10b981" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card-glass p-6">
        <h3 className="text-sm uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
          <Activity className="w-4 h-4" /> Recent Activity
        </h3>
        <div className="space-y-2">
          {data.recentActivity.map((r: any, i: number) => (
            <div key={i} className="flex justify-between items-center p-3 bg-white/[0.02] rounded-xl">
              <div className="flex items-center gap-3">
                <LoanStatusBadge status={r.status} />
                <span className="font-mono text-sm">{r.loanId}</span>
              </div>
              <span className="text-xs text-slate-500">{new Date(r.updatedAt).toLocaleString('en-IN')}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
