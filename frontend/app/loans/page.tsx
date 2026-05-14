'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import BorrowerNav from '@/components/BorrowerNav';
import LoanStatusBadge from '@/components/LoanStatusBadge';
import { useAuth } from '@/lib/useAuth';
import { api } from '@/lib/api';
import { inr, inrPrecise, fmtDate } from '@/lib/formatters';

export default function MyLoans() {
  const { user, loading } = useAuth({ redirectTo: '/login', requireRoles: ['borrower'] });
  const [loans, setLoans] = useState<any[]>([]);
  useEffect(() => {
    if (user) api.get('/api/borrower/loans').then((r) => setLoans(r.data.loans));
  }, [user]);
  if (loading || !user) return null;
  return (
    <>
      <BorrowerNav />
      <main className="max-w-6xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-semibold mb-6">My Loans</h1>
        {loans.length === 0 && <div className="card-glass p-6 text-slate-400">No loans yet. <Link href="/apply" className="text-emerald-400 hover:underline">Apply now →</Link></div>}
        <div className="grid md:grid-cols-2 gap-4">
          {loans.map((l) => (
            <Link key={l._id} href={`/loans/${l.loanId}`} className="card-glass p-6 hover:border-emerald-500/30 transition-colors">
              <div className="flex justify-between items-start mb-4">
                <div className="font-mono text-sm">{l.loanId}</div>
                <LoanStatusBadge status={l.status} />
              </div>
              <div className="text-3xl font-semibold font-mono mb-2">{inr(l.principalAmount)}</div>
              <div className="text-xs text-slate-400 mb-3">Total repayment: <span className="font-mono">{inrPrecise(l.totalRepayment)}</span></div>
              <div className="text-xs text-slate-500">Applied {fmtDate(l.appliedAt)}</div>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
