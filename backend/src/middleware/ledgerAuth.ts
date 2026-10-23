import type { Request, Response, NextFunction } from 'express';
import { LedgerColumnGroup, LEDGER_GROUP_ROLES, type Role } from '@tingting/shared';

const GROUP_LABELS: Record<LedgerColumnGroup, string> = {
  [LedgerColumnGroup.PLAN]: 'kế hoạch',
  [LedgerColumnGroup.MONEY]: 'thu chi',
  [LedgerColumnGroup.RESULT]: 'kết quả',
};

/**
 * Sổ cái column-group authorization — the "per hạng mục" sharing model of the
 * master Google Sheet. Each group-scoped /ledger route calls this before its
 * handler so a role that cannot write a section gets 403 at the API, not just
 * a disabled cell in the UI. RESULT is computed and writable by nobody.
 */
export function requireGroupRole(group: LedgerColumnGroup) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Chưa đăng nhập' });
    }
    const allowed = LEDGER_GROUP_ROLES[group];
    if (!allowed.includes(req.user.role as Role)) {
      return res.status(403).json({
        error: `Không có quyền sửa cột ${GROUP_LABELS[group]} trong Sổ chuyến đi`,
      });
    }
    next();
  };
}
