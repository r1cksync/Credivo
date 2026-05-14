'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';
import { LayoutDashboard, Users, FileCheck2, Banknote, Receipt, ShieldCheck, LogOut, Sparkles } from 'lucide-react';
import { cn } from '@/lib/formatters';

const navByRole: Record<string, { href: string; label: string; icon: any }[]> = {
  admin: [
    { href: '/ops/admin', label: 'Overview', icon: LayoutDashboard },
    { href: '/ops/sales', label: 'Sales Leads', icon: Users },
    { href: '/ops/sanction', label: 'Sanction', icon: FileCheck2 },
    { href: '/ops/disbursement', label: 'Disbursement', icon: Banknote },
    { href: '/ops/collection', label: 'Collection', icon: Receipt },
  ],
  sales: [{ href: '/ops/sales', label: 'Sales Leads', icon: Users }],
  sanction: [{ href: '/ops/sanction', label: 'Sanction Queue', icon: FileCheck2 }],
  disbursement: [{ href: '/ops/disbursement', label: 'Disbursement', icon: Banknote }],
  collection: [{ href: '/ops/collection', label: 'Collection', icon: Receipt }],
};

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth({ redirectTo: '/login' });
  if (!user) return null;
  const items = navByRole[user.role] || [];

  return (
    <aside className="w-64 shrink-0 bg-navy-900/80 border-r border-white/5 flex flex-col h-screen sticky top-0">
      <div className="p-5 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-navy-950" />
          </div>
          <div>
            <div className="text-lg font-semibold text-gradient">Credivo</div>
            <div className="text-[10px] uppercase tracking-widest text-slate-500">Operations</div>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {items.map((it) => {
          const Active = pathname === it.href || pathname.startsWith(it.href + '/');
          const Icon = it.icon;
          return (
            <Link
              key={it.href}
              href={it.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all',
                Active ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'text-slate-300 hover:bg-white/5'
              )}
            >
              <Icon className="w-4 h-4" />
              {it.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-white/5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center text-navy-950 font-semibold">
            {user.email[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-slate-400 truncate">{user.email}</div>
            <div className="text-[10px] uppercase tracking-wider text-emerald-400 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              {user.role}
            </div>
          </div>
        </div>
        <button onClick={logout} className="w-full flex items-center justify-center gap-2 text-xs text-slate-400 hover:text-rose-400 transition-colors py-2">
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      </div>
    </aside>
  );
}
