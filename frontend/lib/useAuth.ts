'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from './api';
import { AuthUser, clearAuth, getUser, setAuth, getToken } from './auth';

export function useAuth(opts?: { redirectTo?: string; requireRoles?: string[] }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      if (opts?.redirectTo) router.replace(opts.redirectTo);
      setLoading(false);
      return;
    }
    api
      .get('/api/auth/me')
      .then((res) => {
        const u: AuthUser = { id: res.data.user.id, email: res.data.user.email, role: res.data.user.role, profile: res.data.user.profile };
        setAuth(token, u);
        setUser(u);
        if (opts?.requireRoles && !opts.requireRoles.includes(u.role)) {
          router.replace('/login');
        }
      })
      .catch(() => {
        clearAuth();
        if (opts?.redirectTo) router.replace(opts.redirectTo);
      })
      .finally(() => setLoading(false));
  }, []);

  function logout() {
    api.post('/api/auth/logout').catch(() => {});
    clearAuth();
    router.replace('/login');
  }

  return { user, loading, logout };
}
