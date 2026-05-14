'use client';
import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { setAuth, roleHome } from '@/lib/auth';
import { Sparkles, Eye, EyeOff, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/api/auth/login', { email, password });
      setAuth(res.data.token, res.data.user);
      toast.success(`Welcome back, ${email}`);
      router.replace(roleHome(res.data.user.role));
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  function quickFill(e: string, p: string) {
    setEmail(e);
    setPassword(p);
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
            The operations console for <span className="text-gradient">modern lenders.</span>
          </h2>
          <p className="text-slate-400">From application to closure — server-side BRE, AWS Textract document parsing, Bedrock AI risk summaries.</p>
          <div className="card-glass p-4">
            <div className="text-xs uppercase text-slate-500 mb-2">Demo accounts</div>
            <div className="text-xs font-mono space-y-1">
              <button type="button" onClick={() => quickFill('admin@credivo.com', 'Admin@123')} className="block text-left text-emerald-400 hover:underline">admin@credivo.com / Admin@123</button>
              <button type="button" onClick={() => quickFill('sanction@credivo.com', 'Sanction@123')} className="block text-left text-emerald-400 hover:underline">sanction@credivo.com / Sanction@123</button>
              <button type="button" onClick={() => quickFill('rahul.sharma@email.com', 'Borrower@123')} className="block text-left text-emerald-400 hover:underline">rahul.sharma@email.com / Borrower@123</button>
            </div>
          </div>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} className="flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md">
          <div className="md:hidden mb-8 flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-navy-950" />
            </div>
            <span className="text-xl font-semibold text-gradient">Credivo</span>
          </div>
          <h1 className="text-3xl font-semibold mb-2">Welcome back</h1>
          <p className="text-slate-400 mb-8">Sign in to continue to your dashboard.</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs uppercase tracking-wider text-slate-400 mb-2 block">Email</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input-base" placeholder="you@credivo.com" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-slate-400 mb-2 block">Password</label>
              <div className="relative">
                <input type={show ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)} className="input-base pr-12" placeholder="••••••••" />
                <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button disabled={loading} className="btn-primary w-full inline-flex items-center justify-center gap-2">
              {loading ? 'Signing in…' : (<>Sign in <ArrowRight className="w-4 h-4" /></>)}
            </button>
          </form>
          <p className="mt-6 text-sm text-slate-400 text-center">
            New to Credivo? <Link href="/register" className="text-emerald-400 hover:underline">Create an account</Link>
          </p>
        </div>
      </motion.div>
    </main>
  );
}
