import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { authenticate, AuthedRequest } from '../middleware/auth';

const router = Router();

function signToken(userId: string, role: string) {
  const expiresIn = ((process.env.JWT_EXPIRES_IN || '7d').trim()) as any;
  return jwt.sign({ id: userId, role }, process.env.JWT_SECRET as string, {
    expiresIn,
  });
}

function cookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? ('none' as const) : ('lax' as const),
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  };
}

router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ email: email.toLowerCase(), passwordHash, role: 'borrower' });
    const token = signToken(user._id.toString(), user.role);

    res.cookie('credivo_token', token, cookieOptions());
    return res.status(201).json({
      token,
      user: { id: user._id, email: user.email, role: user.role },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = signToken(user._id.toString(), user.role);
    res.cookie('credivo_token', token, cookieOptions());
    return res.json({
      token,
      user: { id: user._id, email: user.email, role: user.role, profile: user.profile },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/logout', (_req, res) => {
  res.clearCookie('credivo_token', { path: '/' });
  res.json({ ok: true });
});

router.get('/me', authenticate, async (req: AuthedRequest, res) => {
  const user = await User.findById(req.user._id).lean();
  if (!user) return res.status(404).json({ error: 'Not found' });
  return res.json({
    user: { id: user._id, email: user.email, role: user.role, profile: user.profile },
  });
});

export default router;
