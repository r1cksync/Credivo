'use client';
import { useEffect, useState, FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuth } from '@/lib/useAuth';
import { api } from '@/lib/api';
import { inr, inrPrecise, fmtDate, fmtDateTime } from '@/lib/formatters';
import { ChevronLeft, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function CollectionDetail() {
  const params = useParams<{ loanId: string }>();
  const router = useRouter();
  const { user, loading } = useAuth({ redirectTo: '/login', requireRoles: ['collection', 'admin'] });
  const [loan, setLoan] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [utr, setUtr] = useState('');
  const [amount, setAmount] = useState('');
  const [pdate, setPdate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [utrAvailable, setUtrAvailable] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [closedOverlay, setClosedOverlay] = useState(false);

  function reload() {
    api.get(`/api/collection/payments/${params.loanId}`).then((r) => {
      setLoan(r.data.loan);
      setPayments(r.data.payments);
    });
  }
  useEffect(() => { if (user) reload(); }, [user, params.loanId]);

  async function checkUtr() {
    if (!utr) return;
    const r = await api.get(`/api/collection/check-utr/${utr}`);
    setUtrAvailable(r.data.available);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const r = await api.post(`/api/collection/record-payment/${params.loanId}`, {
        utrNumber: utr, amount: Number(amount), paymentDate: pdate, notes,
      });
      toast.success('Payment recorded');
      if (r.data.autoClosed) setClosedOverlay(true);
      setUtr(''); setAmount(''); setNotes(''); setUtrAvailable(null);
      reload();
    } catch (e: any) { toast.error(e.response?.data?.error || 'Failed'); } finally { setSubmitting(false); }
  }

  if (loading || !user) return null;
  if (!loan) return <div className="text-slate-400">Loading…</div>;
  const willClose = Number(amount) > 0 && Math.abs(Number(amount) - loan.outstandingBalance) < 0.01;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <Link href="/ops/collection" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-emerald-400 mb-6"><ChevronLeft className="w-4 h-4" /> Back</Link>

      <div className="card-glass p-6 mb-6">
        <div className="flex justify-between flex-wrap gap-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-slate-400">Loan</div>
            <div className="font-mono text-xl mt-1">{loan.loanId}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-400">Outstanding</div>
            <div className="font-mono text-2xl text-amber-400">{inrPrecise(loan.outstandingBalance)}</div>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
          <div><div className="text-xs text-slate-400">Principal</div><div className="font-mono">{inr(loan.principalAmount)}</div></div>
          <div><div className="text-xs text-slate-400">Total Repayment</div><div className="font-mono">{inrPrecise(loan.totalRepayment)}</div></div>
          <div><div className="text-xs text-slate-400">Paid</div><div className="font-mono text-emerald-400">{inrPrecise(loan.totalAmountPaid)}</div></div>
          <div><div className="text-xs text-slate-400">Status</div><div className="uppercase text-xs font-semibold">{loan.status}</div></div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <form onSubmit={submit} className="card-glass p-6 space-y-4">
          <h3 className="text-lg font-semibold">Record payment</h3>
          <div>
            <label className="text-xs uppercase tracking-wider text-slate-400 mb-1 block">UTR Number</label>
            <input value={utr} onChange={(e) => { setUtr(e.target.value); setUtrAvailable(null); }} onBlur={checkUtr} className="input-base font-mono" required />
            {utrAvailable === true && <div className="text-xs text-emerald-400 mt-1">UTR available</div>}
            {utrAvailable === false && <div className="text-xs text-rose-400 mt-1">UTR already used</div>}
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-slate-400 mb-1 block">Amount (₹)</label>
            <input type="number" step="0.01" max={loan.outstandingBalance} value={amount} onChange={(e) => setAmount(e.target.value)} className="input-base font-mono" required />
            <div className="text-xs text-slate-500 mt-1">Max: ₹{loan.outstandingBalance.toLocaleString('en-IN')}</div>
            {willClose && <div className="text-xs text-amber-400 mt-2 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> This will fully close the loan</div>}
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-slate-400 mb-1 block">Payment Date</label>
            <input type="date" value={pdate} onChange={(e) => setPdate(e.target.value)} className="input-base" required max={new Date().toISOString().split('T')[0]} />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-slate-400 mb-1 block">Notes</label>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} className="input-base" placeholder="Optional" />
          </div>
          <button disabled={submitting || loan.status !== 'disbursed'} className="btn-primary w-full">{submitting ? 'Recording…' : 'Record payment'}</button>
        </form>

        <div className="card-glass p-6">
          <h3 className="text-lg font-semibold mb-4">Payment history</h3>
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {payments.length === 0 && <div className="text-slate-400 text-sm">No payments yet.</div>}
            {payments.map((p) => (
              <div key={p._id} className="p-3 bg-white/[0.02] rounded-xl">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-mono text-xs text-slate-400">{p.utrNumber}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{fmtDate(p.paymentDate)}</div>
                    {p.notes && <div className="text-xs text-slate-400 mt-1 italic">{p.notes}</div>}
                  </div>
                  <div className="font-mono text-emerald-400">{inrPrecise(p.amount)}</div>
                </div>
              </div>
            ))}
            {payments.length > 0 && (
              <div className="pt-3 border-t border-white/5 flex justify-between text-sm">
                <span className="text-slate-400">Total</span>
                <span className="font-mono text-emerald-400">{inrPrecise(payments.reduce((s, p) => s + p.amount, 0))}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {closedOverlay && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="card-glass max-w-md w-full p-8 text-center">
            <div className="w-20 h-20 mx-auto rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-semibold mb-2">Loan fully repaid! 🎉</h2>
            <p className="text-slate-400 mb-1 font-mono">{loan.loanId}</p>
            <p className="text-sm text-slate-500 mb-6">has been automatically closed.</p>
            <button onClick={() => { setClosedOverlay(false); router.push('/ops/collection'); }} className="btn-primary w-full">Back to active loans</button>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
}
