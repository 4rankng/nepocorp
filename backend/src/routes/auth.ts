import { Router } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { db } from '../db';
import { users } from '../db/schema';
import { eq, or } from 'drizzle-orm';
import { config } from '../config';
import { Role, loginSchema, createUserSchema, updateUserSchema, updateProfileSchema, changePasswordSchema } from '@nepocorp/shared';
import { authMiddleware } from '../middleware/auth';
import { casbinAuthz } from '../middleware/casbin';
import { blacklistToken } from '../lib/redis';
import * as userService from '../services/user.service';
import { registerAuditEvent } from '../services/audit-registry';
import { AuditEvent } from '../services/audit-types';
import { asyncHandler } from '../middleware/asyncHandler';
import { ApiError } from '../errors';
import type { Request, Response } from 'express';

// Audit event registrations
registerAuditEvent('POST', '/api/auth/login', AuditEvent.USER_LOGIN);
registerAuditEvent('POST', '/api/auth/logout', AuditEvent.USER_LOGOUT);

const router = Router();

async function blacklistCurrentToken(req: Request) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) throw new ApiError(401, 'Token không hợp lệ');
  const payload = jwt.decode(token) as { jti?: string; exp?: number } | null;
  if (payload?.jti && payload?.exp) {
    const ttl = payload.exp - Math.floor(Date.now() / 1000);
    if (ttl > 0) await blacklistToken(payload.jti, ttl);
  }
}

// ─── Login ───────────────────────────────────────────────────────────────────

router.post('/login', asyncHandler(async (req: Request, res: Response) => {
  const { identifier, password } = loginSchema.parse(req.body);

  const [user] = await db.select().from(users).where(
    or(eq(users.username, identifier), eq(users.email, identifier), eq(users.phone, identifier))
  ).limit(1);

  if (!user || user.deletedAt || user.status !== 'ACTIVE') {
    throw new ApiError(401, 'Thông tin đăng nhập không hợp lệ');
  }

  // Import bcrypt locally to keep this as the only auth route that needs it.
  const bcryptMod = await import('bcryptjs');
  const bcrypt = (bcryptMod as any).default ?? bcryptMod;
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new ApiError(401, 'Thông tin đăng nhập không hợp lệ');
  }

  const displayName = await userService.resolveDisplayName(user);

  const token = jwt.sign(
    { userId: user.id, username: user.username, email: user.email, fullName: displayName, role: user.role, jti: crypto.randomUUID() },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn as any }
  );

  const { passwordHash, deletedAt, ...userPublic } = user;
  const capabilities = await userService.getCapabilities(user.role);
  res.json({ token, user: { ...userPublic, fullName: displayName, capabilities } });
}));

// ─── Current user ────────────────────────────────────────────────────────────

router.get('/me', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const profile = await userService.getUserProfile(req.user!.userId);
  if (req.user!.role !== profile.role) {
    throw new ApiError(401, 'Vai trò đã thay đổi, vui lòng đăng nhập lại');
  }
  const capabilities = await userService.getCapabilities(profile.role);
  res.json({ ...profile, capabilities });
}));

router.post('/logout', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  await blacklistCurrentToken(req);
  res.json({ success: true });
}));

router.patch('/me', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const updated = await userService.updateProfile(req.user!.userId, updateProfileSchema.parse(req.body));
  res.json(updated);
}));

router.post('/change-password', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
  await userService.changePassword(req.user!.userId, currentPassword, newPassword);
  await blacklistCurrentToken(req);
  res.json({ success: true });
}));

// ─── User management (admin) ─────────────────────────────────────────────────

router.get('/users', authMiddleware, casbinAuthz('users'), asyncHandler(async (req: Request, res: Response) => {
  res.json(await userService.listUsers(req.user?.role));
}));

router.post('/users', authMiddleware, casbinAuthz('users'), asyncHandler(async (req: Request, res: Response) => {
  const data = createUserSchema.parse(req.body);
  if (req.user?.role !== Role.ADMIN && data.role === Role.ADMIN) {
    throw new ApiError(403, 'Chỉ quản trị viên mới có thể gán vai trò ADMIN');
  }
  const created = await userService.createUser({
    username: data.username,
    email: data.email,
    phone: data.phone,
    fullName: data.fullName,
    password: data.password,
    role: data.role,
    status: data.status,
  });
  res.status(201).json(created);
}));

router.patch('/users/:id', authMiddleware, casbinAuthz('users'), asyncHandler(async (req: Request, res: Response) => {
  const data = updateUserSchema.parse(req.body);
  if (req.user?.role !== Role.ADMIN && data.role === Role.ADMIN) {
    throw new ApiError(403, 'Chỉ quản trị viên mới có thể gán vai trò ADMIN');
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
}));

router.delete('/users/:id', authMiddleware, casbinAuthz('users'), asyncHandler(async (req: Request, res: Response) => {
  await userService.deleteUser(Number(req.params.id), req.user!.userId);
  res.json({ success: true });
}));

export default router;
