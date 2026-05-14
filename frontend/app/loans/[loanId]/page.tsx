'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import BorrowerNav from '@/components/BorrowerNav';
import LoanStatusBadge from '@/components/LoanStatusBadge';
import { useAuth } from '@/lib/useAuth';
import { api } from '@/lib/api';
import { inr, inrPrecise, fmtDateTime, fmtDate } from '@/lib/formatters';
import { ChevronLeft } from 'lucide-react';

export default function LoanDetail() {
  const params = useParams<{ loanId: string }>();
  const { user, loading } = useAuth({ redirectTo: '/login', requireRoles: ['borrower'] });
  const [loan, setLoan] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      api.get(`/api/borrower/loans/${params.loanId}`).then((r) => {
        setLoan(r.data.loan);
        setPayments(r.data.payments);
      });
    }
  }, [user, params.loanId]);

  if (loading || !user) return null;
  if (!loan) return <main className="min-h-screen flex items-center justify-center text-slate-400">Loading…</main>;
  const pct = loan.totalRepayment ? (loan.totalAmountPaid / loan.totalRepayment) * 100 : 0;

  return (
    <>
      <BorrowerNav />
      <main className="max-w-5xl mx-auto px-6 py-10">
        <Link href="/loans" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-emerald-400 mb-6"><ChevronLeft className="w-4 h-4" /> All loans</Link>
        <div className="card-glass p-8 mb-6">
          <div className="flex justify-between flex-wrap gap-4 items-start mb-6">
            <div>
              <div className="text-xs uppercase text-slate-400">Loan ID</div>
              <div className="font-mono text-xl mt-1">{loan.loanId}</div>
            </div>
            <LoanStatusBadge status={loan.status} large />
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div><div className="text-xs text-slate-400">Principal</div><div className="font-mono text-lg mt-1">{inr(loan.principalAmount)}</div></div>
            <div><div className="text-xs text-slate-400">Tenure</div><div className="font-mono text-lg mt-1">{loan.tenureDays} days</div></div>
            <div><div className="text-xs text-slate-400">Interest</div><div className="font-mono text-lg mt-1">{inrPrecise(loan.simpleInterest)}</div></div>
            <div><div className="text-xs text-slate-400">Total</div><div className="font-mono text-lg mt-1 text-emerald-400">{inrPrecise(loan.totalRepayment)}</div></div>
          </div>

          {(loan.status === 'disbursed' || loan.status === 'closed') && (
            <>
              <div className="flex justify-between mb-2"><span className="text-sm text-slate-400">Repayment</span><span className="font-mono text-emerald-400">{pct.toFixed(1)}%</span></div>
              <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                <div style={{ width: `${pct}%` }} className="h-full bg-gradient-to-r from-emerald-500 to-blue-500" />
              </div>
              <div className="mt-3 flex justify-between text-sm">
                <span className="text-slate-400">Paid: <span className="font-mono text-emerald-400">{inrPrecise(loan.totalAmountPaid)}</span></span>
                <span className="text-slate-400">Outstanding: <span className="font-mono text-amber-400">{inrPrecise(loan.outstandingBalance)}</span></span>
              </div>
            </>
          )}

          {loan.rejectionReason && (
            <div className="mt-6 card-glass p-4 border-rose-500/20 bg-rose-500/5">
              <div className="text-xs uppercase text-rose-400 mb-1">Rejection reason</div>
              <div className="text-sm">{loan.rejectionReason}</div>
            </div>
          )}
        </div>

        <div className="card-glass p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Timeline</h3>
          <div className="space-y-3 text-sm">
            <Row k="Applied" v={fmtDateTime(loan.appliedAt)} />
            {loan.sanctionedAt && <Row k="Sanctioned" v={fmtDateTime(loan.sanctionedAt)} />}
            {loan.disbursedAt && <Row k="Disbursed" v={fmtDateTime(loan.disbursedAt)} />}
            {loan.disbursementReference && <Row k="Disbursement Ref" v={loan.disbursementReference} mono />}
            {loan.closedAt && <Row k="Closed" v={fmtDateTime(loan.closedAt)} />}
          </div>
        </div>

        {payments.length > 0 && (
          <div className="card-glass p-6">
            <h3 className="text-lg font-semibold mb-4">Payments</h3>
            <div className="space-y-2">
              {payments.map((p) => (
                <div key={p._id} className="flex justify-between items-center p-3 bg-white/[0.02] rounded-xl">
                  <div>
                    <div className="font-mono text-xs text-slate-400">{p.utrNumber}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{fmtDate(p.paymentDate)} · {p.notes || 'No notes'}</div>
                  </div>
                  <div className="font-mono text-emerald-400">{inrPrecise(p.amount)}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </>
  );
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-400">{k}</span>
      <span className={mono ? 'font-mono' : ''}>{v}</span>
    </div>
  );
}
