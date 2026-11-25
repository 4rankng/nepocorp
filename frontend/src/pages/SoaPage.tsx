/**
 * Bảng Tổng hợp Công nợ Tháng (SOA) theo khách hàng — NEPO-62.
 * Per-month opening / charges (phát sinh) / payments (thanh toán) / closing
 * (tồn cuối) for every customer across the picked window; XLSX export mirrors
 * the on-screen grid. Money is integer VND end to end.
 */
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download } from 'lucide-react';
import { financialClient } from '../api/financialClient';
import { api } from '../lib/api';
import { downloadBlob } from '../lib/download';
import { formatCurrency } from '../lib/format';
import { PageHeader } from '../components/UI';
import { Breadcrumbs } from '../components/shared/Breadcrumbs';
import { useToast } from '../components/shared/Toast';
import type { CustomerMonthlySoa } from '@tingting/shared';
import './SoaPage.css';

function defaultFrom(): string {
  const now = new Date();
  return `${now.getFullYear()}-01-01`;
}

function defaultTo(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export default function SoaPage() {
  const { toast: showToast } = useToast();
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [data, setData] = useState<CustomerMonthlySoa | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await financialClient.getCustomerSoa(from, to));
    } catch (err) {
      setError((err as Error).message || 'Không tải được bảng công nợ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); /* initial load */ }, []);

  const months = useMemo(() => data?.rows[0]?.months.map((cell) => cell.month) ?? [], [data]);

  const exportXlsx = async () => {
    try {
      // api.getBlob owns the /api prefix + auth header — a raw fetch here
      // produced /ledger/... and hit the SPA's index.html instead.
      const blob = await api.getBlob(financialClient.getCustomerSoaExportUrl(from, to));
      downloadBlob(blob, `SOA_cong_no_${from}_${to}.xlsx`);
    } catch (err) {
      showToast({ kind: 'error', message: (err as Error).message });
    }
  };

  return (
    <div className="soa-page">
      <Breadcrumbs
        items={[
          { label: 'Tổng quan', to: '/dashboard' },
          { label: 'Công nợ', to: '/debt' },
          { label: 'Công nợ tháng (SOA)' },
        ]}
        renderLink={(to, children) => <Link to={to}>{children}</Link>}
      />
      <PageHeader
        title="Bảng Tổng hợp Công nợ Tháng"
        iconName="receivables"
        description="Số dư đầu kỳ · phát sinh · thanh toán · số dư cuối kỳ theo từng khách hàng"
        action={
          <div className="page-actions" style={{ display: 'flex', gap: 8 }}>
            <input
              type="date"
              className="input"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              aria-label="Từ ngày"
            />
            <input
              type="date"
              className="input"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              aria-label="Đến ngày"
            />
            <button className="btn btn--secondary btn--sm" onClick={() => void load()} disabled={loading}>
              Xem
            </button>
            <button className="btn btn--primary btn--sm" onClick={() => void exportXlsx()} disabled={!data || data.rows.length === 0}>
              <Download size={14} style={{ marginRight: 4 }} aria-hidden="true" /> Xuất Excel
            </button>
          </div>
        }
      />

      {error && <div className="soa-page__error">{error}</div>}
      {loading && <div className="soa-page__loading">Đang tổng hợp công nợ…</div>}

      {data && (
        <div className="soa-page__table-wrap">
          <table className="soa-table">
            <thead>
              <tr>
                <th rowSpan={2}>Khách hàng</th>
                {months.map((month) => (
                  <th key={month} colSpan={4}>Tháng {month}</th>
                ))}
                <th rowSpan={2}>Tồn cuối</th>
              </tr>
              <tr>
                {months.flatMap((month) => [
                  <th key={`${month}-o`}>Đầu kỳ</th>,
                  <th key={`${month}-c`}>Phát sinh</th>,
                  <th key={`${month}-p`}>Thanh toán</th>,
                  <th key={`${month}-cl`}>Cuối kỳ</th>,
                ])}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => (
                <tr key={row.customerId}>
                  <td>
                    <Link to={`/customers/${row.customerId}`}>{row.customerName}</Link>
                  </td>
                  {row.months.flatMap((cell) => [
                    <td key={`${cell.month}-o`} className="is-money">{formatCurrency(cell.opening)}</td>,
                    <td key={`${cell.month}-c`} className="is-money is-charge">{formatCurrency(cell.charges)}</td>,
                    <td key={`${cell.month}-p`} className="is-money is-pay">{formatCurrency(cell.payments)}</td>,
                    <td key={`${cell.month}-cl`} className="is-money">{formatCurrency(cell.closing)}</td>,
                  ])}
                  <td className="is-money is-strong">{formatCurrency(row.closing)}</td>
                </tr>
              ))}
              {data.rows.length === 0 && (
                <tr><td colSpan={2 + months.length * 4} className="soa-page__empty">Không có dữ liệu công nợ trong khoảng ngày.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
