import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { formatDate } from '../lib/format';
import type { Customer } from '@nepocorp/shared';
import { Users, Search, ChevronRight } from 'lucide-react';

export default function DebtListPage() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await api.get<Customer[]>('/customers');
        setCustomers(data);
      } catch (e: any) {
        setError(e.message || 'Khong the tai danh sach khách hàng');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return customers;
    const q = search.toLowerCase().trim();
    return customers.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.contact_info && c.contact_info.toLowerCase().includes(q))
    );
  }, [customers, search]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Công nợ</h1>
          <p>Theo dõi công nợ khách hàng</p>
        </div>
      </div>

      {/* Search */}
      <div className="section-gap" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div className="input-icon" style={{ width: 320 }}>
          <Search />
          <input
            className="input"
            placeholder="Tìm khách hàng..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <span style={{ fontSize: 12, color: 'var(--fg-3)', marginLeft: 'auto' }}>
          {filtered.length} khách hàng
        </span>
      </div>

      {error && (
        <div className="card-shell" style={{ padding: 16, color: 'var(--danger)', marginBottom: 16 }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ padding: 32, textAlign: 'center', color: 'var(--fg-3)' }}>
          Đang tải dữ liệu...
        </div>
      ) : (
        <div className="card-shell fade-up">
          <div className="card-header">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Users size={15} style={{ color: 'var(--fg-3)' }} />
              Danh sach khách hàng
            </h3>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="tt-table">
              <thead>
                <tr>
                  <th style={{ width: 60 }}>#</th>
                  <th>Ten khách hàng</th>
                  <th>Liên hệ</th>
                  <th>Ngày tạo</th>
                  <th style={{ width: 48 }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => (
                  <tr key={c.id} onClick={() => navigate(`/debt/${c.id}`)}>
                    <td style={{ color: 'var(--fg-3)', fontSize: 12 }}>{i + 1}</td>
                    <td style={{ fontWeight: 600, color: 'var(--fg-1)' }}>{c.name}</td>
                    <td>{c.contact_info || '—'}</td>
                    <td>{formatDate(c.created_at)}</td>
                    <td>
                      <ChevronRight size={14} style={{ color: 'var(--fg-3)' }} />
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--fg-3)' }}>
                      {search ? 'Khong tim thay khách hàng' : 'Chua co khách hàng'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
