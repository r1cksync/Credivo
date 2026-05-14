'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';

export default function OpsIndex() {
  const router = useRouter();
  const { user, loading } = useAuth({ redirectTo: '/login' });
  useEffect(() => {
    if (user) {
      if (user.role === 'borrower') router.replace('/dashboard');
      else router.replace(`/ops/${user.role}`);
    }
  }, [user]);
  if (loading) return <div className="text-slate-400">Loading…</div>;
  return null;
}
