import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { users, drivers } from '../db/schema';
import { eq, isNull, or } from 'drizzle-orm';
import { config } from '../config';
import { loginSchema } from '@nepocorp/shared';
import { authMiddleware, requireRoles } from '../middleware/auth';
import { Role } from '@nepocorp/shared';
import type { Request, Response } from 'express';

const router = Router();

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { identifier, password } = loginSchema.parse(req.body);

    const [user] = await db.select().from(users).where(
      or(eq(users.username, identifier), eq(users.email, identifier), eq(users.phone, identifier))
    ).limit(1);

    if (!user || user.deletedAt || user.status !== 'ACTIVE') {
      return res.status(401).json({ error: 'Thông tin đăng nhập không hợp lệ' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Thông tin đăng nhập không hợp lệ' });
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username, email: user.email, role: user.role },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn as any }
    );

    const { passwordHash, deletedAt, ...userPublic } = user;
    res.json({ token, user: userPublic });
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: 'Lỗi máy chủ' });
  }
});

router.get('/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    const [user] = await db.select({
      id: users.id, username: users.username, email: users.email, phone: users.phone, role: users.role, status: users.status,
      createdAt: users.createdAt,
    }).from(users).where(eq(users.id, req.user!.userId)).limit(1);

    if (!user) return res.status(404).json({ error: 'Không tìm thấy người dùng' });

    // If driver, include driver profile
    if (user.role === 'DRIVER') {
      const [driver] = await db.select().from(drivers)
        .where(eq(drivers.userId, user.id)).limit(1);
      return res.json({ ...user, driver: driver || null });
    }

    res.json(user);
  } catch {
    res.status(500).json({ error: 'Lỗi máy chủ' });
  }
});

router.get('/users', authMiddleware, requireRoles(Role.ADMIN), async (_req: Request, res: Response) => {
  try {
    const items = await db.select({
      id: users.id, username: users.username, email: users.email, phone: users.phone, role: users.role, status: users.status,
      createdAt: users.createdAt,
    }).from(users).where(isNull(users.deletedAt));
    res.json({ items, total: items.length });
  } catch {
    res.status(500).json({ error: 'Lỗi máy chủ' });
  }
});

export default router;
