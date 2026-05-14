'use client';
import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { setAuth } from '@/lib/auth';
import { Sparkles, ArrowRight } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/api/auth/register', { email, password });
      setAuth(res.data.token, res.data.user);
      toast.success('Account created!');
      router.replace('/apply/personal-details');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen grid md:grid-cols-2">
      <div className="hidden md:flex relative overflow-hidden bg-navy-900 flex-col justify-between p-12">
        <div className="absolute inset-0 opacity-30" style={{ background: 'radial-gradient(circle at 30% 20%, #10b98144 0, transparent 50%), radial-gradient(circle at 70% 80%, #3b82f644 0, transparent 50%)' }} />
        <div className="relative">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-navy-950" />
            </div>
            <span className="text-xl font-semibold text-gradient">Credivo</span>
          </Link>
        </div>
        <div className="relative space-y-6">
          <h2 className="text-4xl font-semibold leading-tight">
            Your first loan, <span className="text-gradient">approved in minutes.</span>
          </h2>
          <ul className="text-slate-400 text-sm space-y-2">
            <li>• Instant eligibility check via business rules engine</li>
            <li>• AI-powered salary slip verification</li>
            <li>• Loans up to ₹5,00,000 at 12% p.a.</li>
            <li>• Track every rupee from disbursement to closure</li>
          </ul>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} className="flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md">
          <h1 className="text-3xl font-semibold mb-2">Create your account</h1>
          <p className="text-slate-400 mb-8">Begin your Credivo journey in two clicks.</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs uppercase tracking-wider text-slate-400 mb-2 block">Email</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input-base" placeholder="you@email.com" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-slate-400 mb-2 block">Password</label>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="input-base" placeholder="Min 6 characters" />
            </div>
            <button disabled={loading} className="btn-primary w-full inline-flex items-center justify-center gap-2">
              {loading ? 'Creating…' : (<>Create account <ArrowRight className="w-4 h-4" /></>)}
            </button>
          </form>
          <p className="mt-6 text-sm text-slate-400 text-center">
            Already registered? <Link href="/login" className="text-emerald-400 hover:underline">Sign in</Link>
          </p>
        </div>
      </motion.div>
    </main>
  );
}
