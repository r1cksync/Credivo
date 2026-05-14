'use client';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import BorrowerNav from '@/components/BorrowerNav';
import { CheckCircle2 } from 'lucide-react';

function SuccessContent() {
  const params = useSearchParams();
  const loanId = params.get('loanId') || '';
  return (
    <main className="max-w-3xl mx-auto px-6 py-20 text-center">
        <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 200 }} className="w-20 h-20 mx-auto rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mb-6">
          <CheckCircle2 className="w-10 h-10 text-emerald-400" />
        </motion.div>
        <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-4xl font-semibold mb-3">
          Application submitted
        </motion.h1>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="card-glass inline-block px-5 py-3 mb-4">
          <div className="text-xs uppercase tracking-wider text-slate-400">Loan ID</div>
          <div className="font-mono text-2xl text-emerald-400 mt-1">{loanId}</div>
        </motion.div>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="text-slate-400 mb-8">
          Your application is in review. The sanction team will get back to you within 24 hours.
        </motion.p>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="flex gap-3 justify-center">
          <Link href="/dashboard" className="btn-primary">Go to dashboard</Link>
          <Link href="/loans" className="btn-secondary">View all loans</Link>
        </motion.div>
      </main>
  );
}

export default function SuccessPage() {
  return (
    <>
      <BorrowerNav />
      <Suspense fallback={<main className="min-h-screen flex items-center justify-center text-slate-400">Loading…</main>}>
        <SuccessContent />
      </Suspense>
    </>
  );
}
