import axios from 'axios';
import Cookies from 'js-cookie';

const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const api = axios.create({
  baseURL,
  withCredentials: true,
});

api.interceptors.request.use((cfg) => {
  const token = typeof window !== 'undefined' ? Cookies.get('credivo_token') : undefined;
  if (token && cfg.headers) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (typeof window !== 'undefined') {
      if (err.response?.status === 401) {
        Cookies.remove('credivo_token');
        if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/register') && window.location.pathname !== '/') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(err);
  }
);
