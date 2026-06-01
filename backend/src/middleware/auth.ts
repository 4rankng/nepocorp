import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { Role } from '@nepocorp/shared';
import { isTokenBlacklisted } from '../lib/redis';

export interface AuthUser {
  userId: number;
  username: string | null;
  email: string | null;
  /** Human-readable Vietnamese name. Used as the actor label in audit logs. */
  fullName: string | null;
  role: Role;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  let token = req.headers.authorization?.replace('Bearer ', '');
  if (!token && typeof req.query.token === 'string') {
    token = req.query.token;
  }
  if (!token) return res.status(401).json({ error: 'Token không hợp lệ' });
  try {
    const payload = jwt.verify(token, config.jwtSecret) as AuthUser & { jti?: string };
    if (payload.jti && await isTokenBlacklisted(payload.jti)) {
      return res.status(401).json({ error: 'Token đã bị thu hồi' });
    }
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Token hết hạn hoặc không hợp lệ' });
  }
}
