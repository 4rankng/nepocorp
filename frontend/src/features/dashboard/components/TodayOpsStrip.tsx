import { useNavigate } from 'react-router-dom';
import type { OpsToday } from '@tingting/shared';
import { formatNumber } from '../../../lib/format';

/**
 * NEPO-63 — dải vận hành hôm nay (4 khối):
 *   Chuyến xe hôm nay · Lô sắp cắt máng · Lô thiếu chứng từ · Công nợ quá hạn.
 * Mỗi khối bấm được, dẫn thẳng tới danh sách tương ứng. Tất cả số liệu đến từ
 * DashboardStats.opsToday (backend tính, cache 30s theo kỳ).
 */
export function TodayOpsStrip({ ops, loading }: { ops?: OpsToday; loading: boolean }) {
  const navigate = useNavigate();

  const blocks = [
    {
      key: 'trips-today',
      label: 'Chuyến xe hôm nay',
      value: ops ? String(ops.tripsToday) : '—',
      hint: 'Xuất phát trong hôm nay',
      route: '/trips?status=IN_TRANSIT',
      tone: 'default' as const,
    },
    {
      key: 'cutoff',
      label: 'Lô sắp cắt máng',
      value: ops ? String(ops.shipmentsNearingCutoff.length) : '—',
      hint: ops && ops.shipmentsNearingCutoff.length > 0
        ? ops.shipmentsNearingCutoff
          .slice(0, 2)
          .map((a) => `${a.shipmentCode} (${a.daysUntilCutoff != null && a.daysUntilCutoff < 0 ? 'quá hạn' : `còn ${a.daysUntilCutoff} ngày`})`)
          .join(' · ')
        : 'Không có lô nào sắp đến hạn',
      route: '/shipments',
      tone: ops && ops.shipmentsNearingCutoff.length > 0 ? ('warning' as const) : ('ok' as const),
    },
    {
      key: 'missing-docs',
      label: 'Lô thiếu chứng từ',
      value: ops ? String(ops.shipmentsMissingDocs.length) : '—',
      hint: ops && ops.shipmentsMissingDocs.length > 0
        ? ops.shipmentsMissingDocs.slice(0, 2).map((a) => a.shipmentCode).join(' · ') + ' chưa có chứng từ'
        : 'Tất cả lô đã có chứng từ',
      route: '/shipments',
      tone: ops && ops.shipmentsMissingDocs.length > 0 ? ('warning' as const) : ('ok' as const),
    },
    {
      key: 'overdue-debt',
      label: 'Công nợ quá hạn',
      value: ops ? `${formatNumber(ops.overdueDebt.amount)} ₫` : '—',
      hint: ops && ops.overdueDebt.customers > 0 ? `${ops.overdueDebt.customers} khách còn nợ quá hạn` : 'Không có nợ quá hạn',
      route: '/debt?filter=31-60',
      tone: ops && ops.overdueDebt.amount > 0 ? ('danger' as const) : ('ok' as const),
    },
  ];

  return (
    <div className="dash-ops" data-testid="ops-today-strip" aria-busy={loading}>
      {blocks.map((b) => (
        <button
          key={b.key}
          type="button"
          className={`dash-ops__card dash-ops__card--${b.tone}`}
          onClick={() => navigate(b.route)}
          title={b.hint}
        >
          <span className="dash-ops__label">{b.label}</span>
          <span className="dash-ops__value">{loading ? '…' : b.value}</span>
          <span className="dash-ops__hint">{loading ? '' : b.hint}</span>
        </button>
      ))}
    </div>
  );
}
