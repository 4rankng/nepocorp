import { useState, useEffect } from 'react';
import { Search, User } from 'lucide-react';
import { api } from '../lib/api';
import { formatDate } from '../lib/format';
import { PageHeader, Panel } from '../components/UI';

interface AuditEntry {
  id: number;
  userId: number;
  userEmail: string;
  action: string;
  method: string;
  path: string;
  message: string;
  timestamp: string;
}

export default function AuditLogPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const limit = 50;

  useEffect(() => {
    fetchLogs();
  }, [page]);

  async function fetchLogs() {
    setLoading(true);
    try {
      const res = await api.get<{ items: AuditEntry[]; total: number }>(`/audit-logs?page=${page}&limit=${limit}`);
      setEntries(res.items);
      setTotal(res.total);
    } catch {
      // Audit logs endpoint may not be fully implemented
    } finally {
      setLoading(false);
    }
  }

  const filtered = search
    ? entries.filter(e =>
        e.message?.toLowerCase().includes(search.toLowerCase()) ||
        e.userEmail?.toLowerCase().includes(search.toLowerCase()) ||
        e.path?.toLowerCase().includes(search.toLowerCase())
      )
    : entries;

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <PageHeader
        title="Nhật ký hệ thống"
        description="Lịch sử thao tác của người dùng"
      />

      <Panel flush>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-2)', display: 'flex', gap: 12, alignItems: 'center' }}>
          <div className="toolbar__search" style={{ flex: 1 }}>
            <Search size={14} />
            <input
              type="text"
              placeholder="Tìm theo nội dung, email, đường dẫn..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <span style={{ color: 'var(--fg-3)', fontSize: 13 }}>{total} bản ghi</span>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--fg-3)' }}>Đang tải...</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state" style={{ border: 'none', margin: 0, padding: '48px 24px' }}>
            <img src="/assets/illustrations/empty-search.svg" alt="No logs" style={{ width: 110, marginBottom: 12 }} />
            <h3 className="empty-state-title">Chưa có bản ghi nào</h3>
            <p className="empty-state-desc" style={{ fontSize: 12, marginBottom: 0 }}>
              Không tìm thấy dữ liệu nhật ký hệ thống nào khớp với tìm kiếm hiện tại.
            </p>
          </div>
        ) : (
          <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th style={{ width: 140 }}>Thời gian</th>
                <th style={{ width: 180 }}>Người dùng</th>
                <th style={{ width: 70 }}>Phương thức</th>
                <th>Đường dẫn</th>
                <th>Nội dung</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(entry => (
                <tr key={entry.id}>
                  <td style={{ fontSize: 13, color: 'var(--fg-2)', whiteSpace: 'nowrap' }}>
                    {formatDate(entry.timestamp)}
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--bg-2)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                        <User size={12} />
                      </span>
                      <span style={{ fontSize: 13 }}>{entry.userEmail}</span>
                    </div>
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 600,
                      fontFamily: 'var(--font-mono)',
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: entry.method === 'POST' ? 'var(--emerald-50)' : entry.method === 'PUT' ? 'var(--amber-50)' : entry.method === 'DELETE' ? '#fef2f2' : 'var(--bg-2)',
                      color: entry.method === 'POST' ? 'var(--emerald-600)' : entry.method === 'PUT' ? '#b45309' : entry.method === 'DELETE' ? '#dc2626' : 'var(--fg-2)',
                    }}>
                      {entry.method}
                    </span>
                  </td>
                  <td style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--fg-2)', whiteSpace: 'nowrap' }}>
                    {entry.path}
                  </td>
                  <td style={{ fontSize: 13 }}>{entry.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}

        {totalPages > 1 && (
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              className="btn btn--secondary btn--sm"
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
            >
              Trước
            </button>
            <span style={{ fontSize: 13, color: 'var(--fg-3)' }}>
              Trang {page} / {totalPages}
            </span>
            <button
              className="btn btn--secondary btn--sm"
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              Tiếp
            </button>
          </div>
        )}
      </Panel>
    </div>
  );
}
