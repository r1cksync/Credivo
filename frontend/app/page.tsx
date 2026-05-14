'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { getToken, getUser, roleHome } from '@/lib/auth';
import { Sparkles, ArrowRight, CheckCircle2, Shield, Zap, TrendingUp } from 'lucide-react';

export default function Landing() {
  const router = useRouter();
  useEffect(() => {
    const token = getToken();
    const user = getUser();
    if (token && user) router.replace(roleHome(user.role));
  }, []);

  return (
    <main className="min-h-screen flex flex-col">
      <header className="px-6 py-5 flex items-center justify-between max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-navy-950" />
          </div>
          <span className="text-xl font-semibold text-gradient">Credivo</span>
        </div>
        <div className="flex gap-3">
          <Link href="/login" className="btn-secondary text-sm">Sign in</Link>
          <Link href="/register" className="btn-primary text-sm">Get started</Link>
        </div>
      </header>

      <section className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="max-w-5xl text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 mb-6">
            <Zap className="w-3 h-3" /> AI-powered loan management
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-5xl md:text-7xl font-semibold leading-tight">
            Credit that moves
            <br />
            <span className="text-gradient">at the speed of trust.</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-6 text-lg text-slate-400 max-w-2xl mx-auto">
            India&apos;s next-generation lending operations platform. From application to closure — automated KYC, AI risk scoring, and real-time disbursement in one premium console.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mt-10 flex gap-3 justify-center flex-wrap">
            <Link href="/register" className="btn-primary inline-flex items-center gap-2">Apply for a loan <ArrowRight className="w-4 h-4" /></Link>
            <Link href="/login" className="btn-secondary">Operator sign-in</Link>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mt-16 grid md:grid-cols-3 gap-4">
            {[
              { icon: Shield, title: 'Server-side BRE', desc: 'Tamper-proof business rules engine with PAN, age, salary, employment validation.' },
              { icon: TrendingUp, title: 'AI Risk Analysis', desc: 'AWS Bedrock generates risk summaries for every sanction decision.' },
              { icon: CheckCircle2, title: 'Auto Close', desc: 'Loans automatically close on full repayment with unique UTR tracking.' },
            ].map((f, i) => (
              <div key={i} className="card-glass p-6 text-left">
                <f.icon className="w-6 h-6 text-emerald-400 mb-3" />
                <div className="font-medium">{f.title}</div>
                <div className="text-sm text-slate-400 mt-1">{f.desc}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      <footer className="px-6 py-6 text-center text-xs text-slate-500 border-t border-white/5">
        © 2026 Credivo. Built for the credit economy.
      </footer>
    </main>
  );
}
