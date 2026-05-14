'use client';
import { motion } from 'framer-motion';
import { ReactNode } from 'react';

export default function StatCard({
  label,
  value,
  icon,
  delta,
  prefix = '',
  suffix = '',
}: {
  label: string;
  value: number | string;
  icon?: ReactNode;
  delta?: string;
  prefix?: string;
  suffix?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-glass p-5 flex flex-col gap-2"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-slate-400">{label}</span>
        {icon && <div className="text-emerald-400">{icon}</div>}
      </div>
      <div className="text-2xl font-semibold font-mono">
        {prefix}
        {typeof value === 'number' ? value.toLocaleString('en-IN') : value}
        {suffix}
      </div>
      {delta && <div className="text-xs text-slate-500">{delta}</div>}
    </motion.div>
  );
}
