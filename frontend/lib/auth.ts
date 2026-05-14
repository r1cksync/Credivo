import Cookies from 'js-cookie';

export type UserRole = 'borrower' | 'sales' | 'sanction' | 'disbursement' | 'collection' | 'admin';
export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  profile?: any;
}

export function setAuth(token: string, user: AuthUser) {
  Cookies.set('credivo_token', token, { expires: 7, sameSite: 'lax' });
  if (typeof window !== 'undefined') localStorage.setItem('credivo_user', JSON.stringify(user));
}

export function getUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('credivo_user');
  return raw ? JSON.parse(raw) : null;
}

export function clearAuth() {
  Cookies.remove('credivo_token');
  if (typeof window !== 'undefined') localStorage.removeItem('credivo_user');
}

export function getToken() {
  return Cookies.get('credivo_token');
}

export function roleHome(role: UserRole) {
  if (role === 'borrower') return '/dashboard';
  return `/ops/${role}`;
}
