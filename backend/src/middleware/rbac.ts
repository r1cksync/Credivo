import { Response, NextFunction } from 'express';
import { AuthedRequest } from './auth';

export const requireRole = (...roles: string[]) => {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `This action requires one of these roles: ${roles.join(', ')}`,
        yourRole: req.user.role,
      });
    }
    next();
  };
};
