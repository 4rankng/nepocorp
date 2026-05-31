import { Router } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { db } from '../db';
import { users } from '../db/schema';
import { eq, or } from 'drizzle-orm';
import { config } from '../config';
import { loginSchema, createUserSchema, updateUserSchema, updateProfileSchema, changePasswordSchema } from '@nepocorp/shared';
import { authMiddleware } from '../middleware/auth';
import { casbinAuthz } from '../middleware/casbin';
import { blacklistToken } from '../lib/redis';
import * as userService from '../services/user.service';
import { registerAuditEvent } from '../services/audit-registry';
import { AuditEvent } from '../services/audit-types';
import type { Request, Response } from 'express';

// Audit event registrations
registerAuditEvent('POST', '/api/auth/login', AuditEvent.USER_LOGIN);
registerAuditEvent('POST', '/api/auth/logout', AuditEvent.USER_LOGOUT);

const router = Router();

function blacklistCurrentToken(req: Request) {
  const payload = req.user as any;
  if (payload.jti && payload.exp) {
    const ttlSeconds = Math.max(1, payload.exp - Math.floor(Date.now() / 1000));
    blacklistToken(payload.jti, ttlSeconds).catch(() => {});
  }
}

// ─── Login ───────────────────────────────────────────────────────────────────

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { identifier, password } = loginSchema.parse(req.body);

    const [user] = await db.select().from(users).where(
      or(eq(users.username, identifier), eq(users.email, identifier), eq(users.phone, identifier))
    ).limit(1);

    if (!user || user.deletedAt || user.status !== 'ACTIVE') {
      return res.status(401).json({ error: 'Thông tin đăng nhập không hợp lệ' });
    }

    // Import bcrypt locally to keep this as the only auth route that needs it.
    // bcryptjs uses CommonJS interop — under ESM, the namespace object's
    // default export is the actual API (compare, hash, etc.). Reach through
    // .default so `compare` is a real function, not undefined.
    const bcryptMod = await import('bcryptjs');
    const bcrypt = (bcryptMod as any).default ?? bcryptMod;
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Thông tin đăng nhập không hợp lệ' });
    }

    const displayName = await userService.resolveDisplayName(user);

    const token = jwt.sign(
      { userId: user.id, username: user.username, email: user.email, fullName: displayName, role: user.role, jti: crypto.randomUUID() },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn as any }
    );

    const { passwordHash, deletedAt, ...userPublic } = user;
    res.json({ token, user: { ...userPublic, fullName: displayName } });
  } catch (err: any) {
    if (err?.name === 'ZodError') return res.status(400).json({ error: err.errors });
    // Log the actual error so we can debug login failures instead of a blind 500.
    console.error('[auth/login] unexpected error:', err?.message, err?.stack);
    // In dev, surface the error so QA can see what's wrong without tailing logs.
    const isProd = config.nodeEnv === 'production';
    res.status(500).json({
      error: 'Lỗi máy chủ',
      ...(isProd ? {} : { detail: err?.message, where: err?.stack?.split('\n').slice(0, 4) }),
    });
  }
});

// ─── Current user ────────────────────────────────────────────────────────────

router.get('/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    res.json(await userService.getUserProfile(req.user!.userId));
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

router.post('/logout', authMiddleware, async (req: Request, res: Response) => {
  try {
    blacklistCurrentToken(req);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Lỗi máy chủ' });
  }
});

router.patch('/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    const updated = await userService.updateProfile(req.user!.userId, updateProfileSchema.parse(req.body));
    res.json(updated);
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    if (err.code === '23505') return res.status(409).json({ error: 'Username, email hoặc số điện thoại đã tồn tại' });
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

router.post('/change-password', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
    await userService.changePassword(req.user!.userId, currentPassword, newPassword);
    blacklistCurrentToken(req);
    res.json({ success: true });
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

// ─── User management (admin) ─────────────────────────────────────────────────

router.get('/users', authMiddleware, casbinAuthz('users'), async (_req: Request, res: Response) => {
  try {
    res.json(await userService.listUsers());
  } catch {
    res.status(500).json({ error: 'Lỗi máy chủ' });
  }
});

router.post('/users', authMiddleware, casbinAuthz('users'), async (req: Request, res: Response) => {
  try {
    const data = createUserSchema.parse(req.body);
    if (req.user?.role !== 'ADMIN' && data.role === 'ADMIN') {
      return res.status(403).json({ error: 'Chỉ quản trị viên mới có thể gán vai trò ADMIN' });
    }
    const created = await userService.createUser({
      username: data.username,
      email: data.email,
      phone: data.phone,
      password: data.password,
      role: data.role,
      status: data.status,
    });
    res.status(201).json(created);
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    if (err.code === '23505') return res.status(409).json({ error: 'Username, email hoặc số điện thoại đã tồn tại' });
    res.status(500).json({ error: 'Lỗi máy chủ' });
  }
});

router.patch('/users/:id', authMiddleware, casbinAuthz('users'), async (req: Request, res: Response) => {
  try {
    const data = updateUserSchema.parse(req.body);
    if (req.user?.role !== 'ADMIN' && data.role === 'ADMIN') {
      return res.status(403).json({ error: 'Chỉ quản trị viên mới có thể gán vai trò ADMIN' });
    }
    const updated = await userService.updateUser(Number(req.params.id), {
      role: data.role,
      status: data.status,
      password: data.password,
      username: data.username,
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
    });
    res.json(updated);
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

router.delete('/users/:id', authMiddleware, casbinAuthz('users'), async (req: Request, res: Response) => {
  try {
    await userService.deleteUser(Number(req.params.id), req.user!.userId);
    res.json({ success: true });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

export default router;
