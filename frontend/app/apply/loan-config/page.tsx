'use client';
import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import BorrowerNav from '@/components/BorrowerNav';
import Stepper from '@/components/Stepper';
import { useAuth } from '@/lib/useAuth';
import { api } from '@/lib/api';
import { inr, inrPrecise } from '@/lib/formatters';
import { Lock, Sparkles, Zap } from 'lucide-react';

function calc(p: number, t: number) {
  const si = (p * 12 * t) / (365 * 100);
  const total = p + si;
  return {
    principal: p,
    tenureDays: t,
    simpleInterest: Math.round(si * 100) / 100,
    totalRepayment: Math.round(total * 100) / 100,
    monthlyEquivalent: Math.round((total / (t / 30)) * 100) / 100,
    dailyCost: Math.round((total / t) * 100) / 100,
  };
}

export default function LoanConfig() {
  const router = useRouter();
  const { user, loading } = useAuth({ redirectTo: '/login', requireRoles: ['borrower'] });
  const [principal, setPrincipal] = useState(200000);
  const [tenure, setTenure] = useState(180);
  const [submitting, setSubmitting] = useState(false);

  const c = useMemo(() => calc(principal, tenure), [principal, tenure]);

  async function apply() {
    setSubmitting(true);
    try {
      const res = await api.post('/api/borrower/apply', { principalAmount: principal, tenureDays: tenure });
      toast.success('Application submitted!');
      router.push(`/apply/success?loanId=${res.data.loan.loanId}`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Could not submit');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !user) return null;

  return (
    <>
      <BorrowerNav />
      <main className="max-w-6xl mx-auto px-6 py-10">
        <Stepper active={2} />
        <div className="grid lg:grid-cols-2 gap-6">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card-glass p-8 space-y-8">
            <h2 className="text-2xl font-semibold">Configure your loan</h2>

            <div>
              <div className="flex justify-between mb-3">
                <label className="text-sm text-slate-400">Principal amount</label>
                <span className="font-mono text-2xl text-emerald-400">{inr(principal)}</span>
              </div>
              <input type="range" min={50000} max={500000} step={10000} value={principal} onChange={(e) => setPrincipal(Number(e.target.value))} className="w-full accent-emerald-500" />
              <div className="flex justify-between mt-2 text-xs text-slate-500"><span>₹50,000</span><span>₹5,00,000</span></div>
            </div>

            <div>
              <div className="flex justify-between mb-3">
                <label className="text-sm text-slate-400">Tenure</label>
                <span className="font-mono text-2xl text-emerald-400">{tenure} <span className="text-sm text-slate-400">days · ~{Math.round(tenure / 30)} mo</span></span>
              </div>
              <input type="range" min={30} max={365} step={5} value={tenure} onChange={(e) => setTenure(Number(e.target.value))} className="w-full accent-emerald-500" />
              <div className="flex justify-between mt-2 text-xs text-slate-500"><span>30 days</span><span>365 days</span></div>
            </div>

            <div className="card-glass p-4 flex items-center gap-3 bg-blue-500/5">
              <Lock className="w-4 h-4 text-blue-400" />
              <div className="text-sm">Interest rate locked at <span className="font-mono text-blue-400">12% p.a.</span> (simple interest)</div>
            </div>

            <button onClick={apply} disabled={submitting} className="btn-primary w-full inline-flex items-center justify-center gap-2">
              <Zap className="w-4 h-4" /> {submitting ? 'Submitting…' : 'Apply for loan'}
            </button>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} className="card-glass p-8 h-fit">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-400 mb-4">
              <Sparkles className="w-4 h-4 text-emerald-400" /> Live calculation
            </div>
            <h3 className="text-lg font-semibold mb-6">Loan Summary</h3>
            <div className="space-y-3">
              {[
                ['Principal', inr(c.principal)],
                ['Tenure', `${c.tenureDays} days`],
                ['Interest Rate', '12% p.a.'],
                ['Simple Interest', inrPrecise(c.simpleInterest)],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between text-sm">
                  <span className="text-slate-400">{k}</span>
                  <span className="font-mono">{v}</span>
                </div>
              ))}
            </div>
            <hr className="my-5 border-white/5" />
            <div className="text-xs uppercase text-slate-400 mb-2">Total repayment</div>
            <motion.div key={c.totalRepayment} initial={{ scale: 0.95, opacity: 0.6 }} animate={{ scale: 1, opacity: 1 }} className="text-4xl font-semibold text-gradient font-mono">
              {inrPrecise(c.totalRepayment)}
            </motion.div>
            <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
              <div className="card-glass p-3">
                <div className="text-xs text-slate-400">Monthly equivalent</div>
                <div className="font-mono mt-1">{inr(c.monthlyEquivalent)}</div>
              </div>
              <div className="card-glass p-3">
                <div className="text-xs text-slate-400">Daily cost</div>
                <div className="font-mono mt-1">{inr(c.dailyCost)}</div>
              </div>
            </div>
          </motion.div>
        </div>
      </main>
    </>
  );
}
