import { Role, ROLE_LABELS } from '@nepocorp/shared';

export interface UserRow {
  id: number;
  username: string | null;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  role: Role;
  status: string;
  createdAt: string;
}

export interface EditData {
  fullName: string;
  username: string;
  email: string;
  phone: string;
  role: Role;
  status: string;
  password: string;
}

export interface CreateData {
  username: string;
  email: string;
  phone: string;
  fullName: string;
  role: Role;
  password: string;
}

export const ROLE_PILL: Record<Role, { cls: string; label: string }> = {
  [Role.ADMIN]:      { cls: 'pill pill--danger',  label: 'Quản trị' },
  [Role.MANAGER]:    { cls: 'pill pill--warn',    label: 'Quản lý' },
  [Role.ACCOUNTANT]: { cls: 'pill pill--neutral', label: 'Kế toán' },
  [Role.DRIVER]:     { cls: 'pill pill--success', label: 'Tài xế' },
};

export const AVATAR_COLORS: Record<Role, { bg: string; color: string }> = {
  [Role.ADMIN]:      { bg: 'var(--danger-soft)',  color: 'var(--danger)' },
  [Role.MANAGER]:    { bg: 'var(--warning-soft)', color: 'var(--warning)' },
  [Role.ACCOUNTANT]: { bg: 'var(--warning-soft)', color: 'var(--warning)' },
  [Role.DRIVER]:     { bg: 'var(--success-soft)', color: 'var(--success)' },
};

export type FilterKey = 'all' | Role;

export { Role, ROLE_LABELS };
