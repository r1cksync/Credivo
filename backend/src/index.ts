import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';

import { connectDB } from './config/db';

import authRoutes from './routes/auth';
import borrowerRoutes from './routes/borrower';
import salesRoutes from './routes/sales';
import sanctionRoutes from './routes/sanction';
import disbursementRoutes from './routes/disbursement';
import collectionRoutes from './routes/collection';
import adminRoutes from './routes/admin';

const app = express();

// CORS: allow configured frontend, all vercel preview URLs, and localhost
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000').split(',').map((s) => s.trim());
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      if (/\.vercel\.app$/.test(new URL(origin).hostname)) return cb(null, true);
      if (/localhost/.test(origin)) return cb(null, true);
      return cb(null, true); // permissive for cross-origin demo
    },
    credentials: true,
  })
);
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
app.use(morgan('dev'));

app.get('/', (_req, res) => res.json({ name: 'Credivo API', status: 'ok', time: new Date().toISOString() }));
app.get('/api/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// Ensure DB is connected before handling any API request (serverless-safe)
app.use('/api', async (_req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (e: any) {
    console.error('[db-mw] connection failed', e?.message);
    res.status(503).json({ error: 'Database unavailable. Try again in a moment.' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/borrower', borrowerRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/sanction', sanctionRoutes);
app.use('/api/disbursement', disbursementRoutes);
app.use('/api/collection', collectionRoutes);
app.use('/api/admin', adminRoutes);

app.use((err: any, _req: any, res: any, _next: any) => {
  console.error('[error]', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// Connect DB on import (works for Vercel serverless and standalone)
connectDB().catch((e) => console.error('[db] connection error', e?.message || e));

const PORT = Number(process.env.PORT) || 3001;
if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => console.log(`[credivo-api] running on http://localhost:${PORT}`));
}

export default app;
