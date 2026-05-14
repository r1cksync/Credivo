'use client';
import { motion } from 'framer-motion';
import { cn } from '@/lib/formatters';

const steps = ['Personal', 'Document', 'Loan Config', 'Review'];

export default function Stepper({ active }: { active: number }) {
  return (
    <div className="flex items-center justify-between mb-10">
      {steps.map((s, i) => {
        const done = i < active;
        const current = i === active;
        return (
          <div key={s} className="flex-1 flex items-center">
            <motion.div
              initial={false}
              animate={{ scale: current ? 1.05 : 1 }}
              className={cn(
                'flex items-center gap-2',
                current ? 'text-emerald-400' : done ? 'text-slate-300' : 'text-slate-500'
              )}
            >
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2',
                  done
                    ? 'bg-emerald-500 border-emerald-500 text-navy-950'
                    : current
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-white/10'
                )}
              >
                {done ? '✓' : i + 1}
              </div>
              <span className="text-sm hidden sm:inline">{s}</span>
            </motion.div>
            {i < steps.length - 1 && (
              <div className={cn('flex-1 h-0.5 mx-3', done ? 'bg-emerald-500' : 'bg-white/10')} />
            )}
          </div>
        );
      })}
    </div>
  );
}
