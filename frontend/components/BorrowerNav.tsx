'use client';
import Link from 'next/link';
import { useAuth } from '@/lib/useAuth';
import { Sparkles, LogOut } from 'lucide-react';

export default function BorrowerNav() {
  const { user, logout } = useAuth({ redirectTo: '/login' });
  return (
    <header className="border-b border-white/5 bg-navy-950/80 backdrop-blur sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-navy-950" />
          </div>
          <div>
            <div className="text-lg font-semibold text-gradient">Credivo</div>
            <div className="text-[10px] uppercase tracking-widest text-slate-500">Borrower</div>
          </div>
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm">
          <Link href="/dashboard" className="text-slate-300 hover:text-emerald-400">Dashboard</Link>
          <Link href="/loans" className="text-slate-300 hover:text-emerald-400">My Loans</Link>
          <Link href="/apply" className="text-slate-300 hover:text-emerald-400">Apply</Link>
        </nav>
        <div className="flex items-center gap-3">
          {user && (
            <div className="hidden sm:flex items-center gap-2 text-sm">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center text-navy-950 font-semibold">
                {user.email[0].toUpperCase()}
              </div>
              <span className="text-slate-400">{user.email}</span>
            </div>
          )}
          <button onClick={logout} className="text-slate-400 hover:text-rose-400 p-2"><LogOut className="w-4 h-4" /></button>
        </div>
      </div>
    </header>
  );
}
