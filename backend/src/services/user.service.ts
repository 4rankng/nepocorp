/**
 * User service — CRUD operations for user management.
 * Extracted from routes/auth.ts to separate user lifecycle from auth flow.
 */
import bcrypt from 'bcryptjs';
import { db } from '../db';
import { users, drivers } from '../db/schema';
import { eq, isNull, sql } from 'drizzle-orm';
import { ApiError } from '../errors';

export const USER_FIELDS = {
  id: users.id, username: users.username, email: users.email, phone: users.phone,
  role: users.role, status: users.status, fullName: users.fullName, createdAt: users.createdAt,
};

/** Verify a user's current password. Throws on failure. */
export async function verifyPassword(userId: number, password: string): Promise<void> {
  const [user] = await db.select({ passwordHash: users.passwordHash })
    .from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw new ApiError(404, 'Không tìm thấy người dùng');
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new ApiError(401, 'Mật khẩu hiện tại không đúng');
}

/** List all active users. */
export async function listUsers() {
  const items = await db.select(USER_FIELDS).from(users).where(isNull(users.deletedAt));
  return { items, total: items.length };
}

/** Create a new user with hashed password. */
export async function createUser(data: {
  username?: string;
  email?: string;
  phone?: string;
  password: string;
  role: string;
  status?: string;
}) {
  const passwordHash = await bcrypt.hash(data.password, 10);
  const [created] = await db.insert(users).values({
    username: data.username || null,
    email: data.email || null,
    phone: data.phone || null,
    passwordHash,
    role: data.role as any,
    status: data.status ?? 'ACTIVE',
  }).returning(USER_FIELDS);
  return created;
}

/** Update user fields (role, status, password). */
export async function updateUser(id: number, data: {
  role?: string;
  status?: string;
  password?: string;
}) {
  const updates: Record<string, unknown> = { updatedAt: sql`now()` };
  if (data.role !== undefined) updates.role = data.role as any;
  if (data.status !== undefined) updates.status = data.status;
  if (data.password) updates.passwordHash = await bcrypt.hash(data.password, 10);
  const [updated] = await db.update(users).set(updates)
    .where(eq(users.id, id)).returning(USER_FIELDS);
  if (!updated) throw new ApiError(404, 'Không tìm thấy người dùng');
  return updated;
}

/** Soft-delete a user. */
export async function deleteUser(id: number, currentUserId: number) {
  if (id === currentUserId) throw new ApiError(400, 'Không thể xóa tài khoản đang đăng nhập');
  await db.update(users).set({ deletedAt: sql`now()`, status: 'INACTIVE' }).where(eq(users.id, id));
}

/** Get current user profile (including driver profile if DRIVER role). */
export async function getUserProfile(userId: number) {
  const [user] = await db.select(USER_FIELDS).from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw new ApiError(404, 'Không tìm thấy người dùng');

  if (user.role === 'DRIVER') {
    const [driver] = await db.select().from(drivers)
      .where(eq(drivers.userId, user.id)).limit(1);
    return { ...user, driver: driver || null };
  }
  return user;
}

/** Update current user's profile (username, fullName, email, phone). */
export async function updateProfile(
  userId: number,
  data: { username?: string; fullName?: string; email?: string; phone?: string },
) {
  const updates: Record<string, unknown> = { updatedAt: sql`now()` };

  if (data.username !== undefined) updates.username = data.username;

  if (data.fullName !== undefined) updates.fullName = data.fullName || null;
  if (data.email !== undefined) updates.email = data.email || null;
  if (data.phone !== undefined) updates.phone = data.phone || null;

  const [updated] = await db.update(users).set(updates)
    .where(eq(users.id, userId))
    .returning(USER_FIELDS);

  if (!updated) throw new ApiError(404, 'Không tìm thấy người dùng');
  return updated;
}

/** Change password for current user. */
export async function changePassword(userId: number, currentPassword: string, newPassword: string) {
  await verifyPassword(userId, currentPassword);
  const passwordHash = await bcrypt.hash(newPassword, 10);
  await db.update(users).set({ passwordHash, updatedAt: sql`now()` })
    .where(eq(users.id, userId));
}

/** Resolve display name for a user (prefers driver name for DRIVER role). */
export async function resolveDisplayName(user: { id: number; role: string; fullName: string | null; username: string | null }): Promise<string> {
  let displayName = user.fullName;
  if (user.role === 'DRIVER') {
    const [d] = await db.select({ name: drivers.name }).from(drivers).where(eq(drivers.userId, user.id)).limit(1);
    if (d?.name) displayName = d.name;
  }
  return displayName || user.username || 'Người dùng';
}
