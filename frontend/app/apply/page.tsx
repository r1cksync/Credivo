'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ApplyIndex() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/apply/personal-details');
  }, []);
  return null;
}
