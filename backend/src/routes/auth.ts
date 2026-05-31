import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { users, drivers } from '../db/schema';
import { eq, isNull, or, sql } from 'drizzle-orm';
import { config } from '../config';
import { loginSchema, createUserSchema, updateUserSchema, updateProfileSchema, changePasswordSchema } from '@nepocorp/shared';
import { authMiddleware } from '../middleware/auth';
import { casbinAuthz } from '../middleware/casbin';
import type { Request, Response } from 'express';

const router = Router();

/** Verify a user's current password. Throws with { status } on failure. */
async function verifyPassword(userId: number, password: string): Promise<void> {
  const [user] = await db.select({ passwordHash: users.passwordHash })
    .from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw Object.assign(new Error('Không tìm thấy người dùng'), { status: 404 });
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw Object.assign(new Error('Mật khẩu hiện tại không đúng'), { status: 401 });
}

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

    // For drivers, prefer the drivers.name as a more accurate display label
    // than users.full_name when both exist (drivers.name is the canonical
    // payroll/contract name).
    let displayName = user.fullName;
    if (user.role === 'DRIVER') {
      const [d] = await db.select({ name: drivers.name }).from(drivers).where(eq(drivers.userId, user.id)).limit(1);
      if (d?.name) displayName = d.name;
    }
    displayName = displayName || user.username || 'Người dùng';

    const token = jwt.sign(
      { userId: user.id, username: user.username, email: user.email, fullName: displayName, role: user.role },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn as any }
    );

    const { passwordHash, deletedAt, ...userPublic } = user;
    res.json({ token, user: { ...userPublic, fullName: displayName } });
    // Login success/failure audit is handled by auditLogMiddleware
    // (reads user data from the JSON response body on login paths).
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: 'Lỗi máy chủ' });
  }
});

router.get('/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    const [user] = await db.select(USER_FIELDS).from(users).where(eq(users.id, req.user!.userId)).limit(1);

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

const USER_FIELDS = {
  id: users.id, username: users.username, email: users.email, phone: users.phone,
  role: users.role, status: users.status, fullName: users.fullName, createdAt: users.createdAt,
};

router.get('/users', authMiddleware, casbinAuthz('users'), async (_req: Request, res: Response) => {
  try {
    const items = await db.select(USER_FIELDS).from(users).where(isNull(users.deletedAt));
    res.json({ items, total: items.length });
  } catch {
    res.status(500).json({ error: 'Lỗi máy chủ' });
  }
});

router.post('/users', authMiddleware, casbinAuthz('users'), async (req: Request, res: Response) => {
  try {
    const data = createUserSchema.parse(req.body);
    const passwordHash = await bcrypt.hash(data.password, 10);
    const [created] = await db.insert(users).values({
      username: data.username,
      email: data.email,
      phone: data.phone,
      passwordHash,
      role: data.role,
      status: data.status ?? 'ACTIVE',
    }).returning(USER_FIELDS);
    res.status(201).json(created);
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    if (err.code === '23505') return res.status(409).json({ error: 'Username, email hoặc số điện thoại đã tồn tại' });
    res.status(500).json({ error: 'Lỗi máy chủ' });
  }
});

router.patch('/users/:id', authMiddleware, casbinAuthz('users'), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const data = updateUserSchema.parse(req.body);
    const updates: Record<string, unknown> = { updatedAt: sql`now()` };
    if (data.role !== undefined) updates.role = data.role;
    if (data.status !== undefined) updates.status = data.status;
    if (data.password) updates.passwordHash = await bcrypt.hash(data.password, 10);
    const [updated] = await db.update(users).set(updates).where(eq(users.id, id)).returning(USER_FIELDS);
    if (!updated) return res.status(404).json({ error: 'Không tìm thấy người dùng' });
    res.json(updated);
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: 'Lỗi máy chủ' });
  }
});

router.delete('/users/:id', authMiddleware, casbinAuthz('users'), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (id === req.user!.userId) return res.status(400).json({ error: 'Không thể xóa tài khoản đang đăng nhập' });
    await db.update(users).set({ deletedAt: sql`now()`, status: 'INACTIVE' }).where(eq(users.id, id));
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Lỗi máy chủ' });
  }
});

router.patch('/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const data = updateProfileSchema.parse(req.body);
    const updates: Record<string, unknown> = { updatedAt: sql`now()` };

    // Username is a login credential — require password confirmation to change it
    if (data.username !== undefined) {
      if (!data.currentPassword) {
        return res.status(400).json({ error: 'Cần xác nhận mật khẩu hiện tại để thay đổi tên đăng nhập' });
      }
      try {
        await verifyPassword(userId, data.currentPassword);
      } catch (err: any) {
        return res.status(err.status || 401).json({ error: err.message });
      }
      updates.username = data.username;
    }

    if (data.email !== undefined) updates.email = data.email || null;
    if (data.phone !== undefined) updates.phone = data.phone || null;

    const [updated] = await db.update(users).set(updates)
      .where(eq(users.id, userId))
      .returning(USER_FIELDS);

    if (!updated) return res.status(404).json({ error: 'Không tìm thấy người dùng' });
    res.json(updated);
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    if (err.code === '23505') return res.status(409).json({ error: 'Username, email hoặc số điện thoại đã tồn tại' });
    res.status(500).json({ error: 'Lỗi máy chủ' });
  }
});

router.post('/change-password', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);

    await verifyPassword(userId, currentPassword);

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db.update(users).set({ passwordHash, updatedAt: sql`now()` })
      .where(eq(users.id, userId));

    res.json({ success: true });
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: 'Lỗi máy chủ' });
  }
});

export default router;
