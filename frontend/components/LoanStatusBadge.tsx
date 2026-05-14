'use client';
import { cn } from '@/lib/formatters';

const statusStyles: Record<string, string> = {
  applied: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  sanctioned: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  disbursed: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  closed: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  rejected: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
};

export default function LoanStatusBadge({ status, large = false }: { status: string; large?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-medium uppercase tracking-wider',
        statusStyles[status] || 'bg-slate-500/15 text-slate-300 border-slate-500/30',
        large ? 'px-4 py-1.5 text-sm' : 'px-2.5 py-1 text-xs'
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-2" />
      {status}
    </span>
  );
}
