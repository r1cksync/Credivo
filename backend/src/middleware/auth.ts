import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';

export interface AuthedRequest extends Request {
  user?: any;
}

export const authenticate = async (req: AuthedRequest, res: Response, next: NextFunction) => {
  try {
    let token: string | undefined;
    const header = req.headers.authorization;
    if (header && header.startsWith('Bearer ')) token = header.substring(7);
    if (!token && (req as any).cookies?.credivo_token) token = (req as any).cookies.credivo_token;
    if (!token) return res.status(401).json({ error: 'Unauthorized', message: 'No token provided' });

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET as string);
    const user = await User.findById(decoded.id).lean();
    if (!user) return res.status(401).json({ error: 'Unauthorized', message: 'User not found' });
    req.user = user;
    next();
  } catch (err: any) {
    return res.status(403).json({ error: 'Forbidden', message: err.message || 'Invalid token' });
  }
};
