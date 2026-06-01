import type { UserRow } from '../utils';

export function UserStatusBadge({ status }: { status: UserRow['status'] }) {
  if (status === 'ACTIVE') {
    return <span className="pill pill--success"><span className="dot" />Hoạt động</span>;
  }
  return <span className="pill pill--danger"><span className="dot" />Bị khoá</span>;
}
