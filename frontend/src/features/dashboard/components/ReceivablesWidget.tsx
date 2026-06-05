import React from 'react';
import { Panel } from '../../../components/UI';
import { formatCurrency, formatCompact } from '../../../lib/format';
import type { TripDetail, RenewalReminder } from '@tingting/shared';
import { styles } from '../utils';
import type { FuelWarning, ReceivablesSummary } from '../hooks/useDashboardData';

const PendingDispatchAlert = React.memo(function PendingDispatchAlert({
  createdTrips,
  createdTripsCount,
  navigate,
}: {
  createdTrips: TripDetail[];
  createdTripsCount: number;
  navigate: (path: string) => void;
}) {
  const pendingCustomers = createdTrips
    .map((t: TripDetail) => t.customer?.name || '—')
    .filter((n: string): n is string => !!n);
  const counts = new Map<string, number>();
  pendingCustomers.forEach((n: string) => counts.set(n, (counts.get(n) || 0) + 1));
  const previewParts: string[] = [];
  for (const [name, count] of counts) {
    previewParts.push(count > 1 ? `${name} (×${count})` : name);
    if (previewParts.length >= 5) break;
  }
  return (
    <div className="todo" onClick={() => navigate('/dispatch')}>
      <div className="todo__icon todo__icon--warn">
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" rx="2"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
      </div>
      <div className="todo__body">
        <div className="todo__title">{createdTripsCount} đơn hàng đang chờ phân xe</div>
        {previewParts.length > 0 && (
          <div className="todo__meta"><span>{previewParts.join(' · ')}</span></div>
        )}
      </div>
      <button className="btn btn--secondary btn--sm" onClick={(e) => { e.stopPropagation(); navigate('/dispatch'); }}>Phân xe</button>
    </div>
  );
});

interface ReceivablesWidgetProps {
  topOverdueCustomer: { name: string; balance: number; days: number } | null | undefined;
  topShareholder: { name: string; percentage: number } | null | undefined;
  receivablesSummary: ReceivablesSummary | null | undefined;
  createdTrips: TripDetail[];
  createdTripsCount: number;
  fuelWarnings: FuelWarning[];
  renewalReminders: RenewalReminder[];
  netProfit: number;
  currentMonth: number;
  currentYear: number;
  navigate: (path: string) => void;
}

export function ReceivablesWidget({
  topOverdueCustomer,
  topShareholder,
  receivablesSummary,
  createdTrips,
  createdTripsCount,
  fuelWarnings,
  renewalReminders,
  netProfit,
  currentMonth,
  currentYear,
  navigate,
}: ReceivablesWidgetProps) {
  return (
    <Panel
      title="Cần chú ý"
      subtitle="Vấn đề cần quyết định của giám đốc"
      flush
    >
      {topOverdueCustomer ? (
        <div className="todo" onClick={() => navigate('/debt')}>
          <div className={`todo__icon ${topOverdueCustomer.days >= 60 ? 'todo__icon--danger' : 'todo__icon--warn'}`}>
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <div className="todo__body">
            <div className="todo__title">
              <strong>{topOverdueCustomer.name}</strong> nợ {formatCurrency(topOverdueCustomer.balance)}
              {topOverdueCustomer.days > 0 && <> — quá hạn {topOverdueCustomer.days} ngày</>}
            </div>
            <div className="todo__meta">
              <span>
                {topOverdueCustomer.days >= 90 ? 'Đề xuất KT: chuyển công ty thu hồi nợ' : topOverdueCustomer.days >= 30 ? 'Cảnh báo công nợ quá hạn' : 'Theo dõi công nợ'}
              </span>
            </div>
          </div>
          <button className="btn btn--secondary btn--sm" onClick={(e) => { e.stopPropagation(); navigate('/debt'); }}>Quyết định</button>
        </div>
      ) : (
        <div className="todo" onClick={() => navigate('/debt')}>
          <div className="todo__icon todo__icon--info">
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="8 12 11 15 16 9"/></svg>
          </div>
          <div className="todo__body">
            <div className="todo__title">Không có công nợ quá hạn</div>
            <div className="todo__meta"><span>Toàn bộ khách hàng đã thanh toán đúng hạn</span></div>
          </div>
        </div>
      )}

      {receivablesSummary && receivablesSummary.overdueCustomers > 0 && (
        <div className="todo" onClick={() => navigate('/debt?filter=overdue')}>
          <div className="todo__icon todo__icon--danger">
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </div>
          <div className="todo__body">
            <div className="todo__title">
              <strong>{receivablesSummary.overdueCustomers} khách hàng</strong> quá hạn — tổng {formatCurrency(receivablesSummary.totalOutstanding)}
            </div>
            <div className="todo__meta">
              <span>
                {receivablesSummary.buckets
                  .filter(b => b.count > 0 && b.range !== '0-30')
                  .map(b => `${b.count} KH ${b.label} (${formatCompact(b.amount)} ₫)`)
                  .join(' · ')}
              </span>
            </div>
          </div>
          <button className="btn btn--secondary btn--sm" onClick={(e) => { e.stopPropagation(); navigate('/debt?filter=overdue'); }}>Xem công nợ</button>
        </div>
      )}

      {createdTripsCount > 0 ? (
        <PendingDispatchAlert createdTrips={createdTrips} createdTripsCount={createdTripsCount} navigate={navigate} />
      ) : (
        <div className="todo" onClick={() => navigate('/dispatch')}>
          <div className="todo__icon todo__icon--info">
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="8 12 11 15 16 9"/></svg>
          </div>
          <div className="todo__body">
            <div className="todo__title">Không có đơn hàng chờ phân xe</div>
            <div className="todo__meta"><span>Tất cả đơn hàng đã được phân xe</span></div>
          </div>
        </div>
      )}

      {fuelWarnings.length > 0 && (
        <div className="todo" onClick={() => navigate('/trips')}>
          <div className={`todo__icon ${fuelWarnings.some(w => w.critical) ? 'todo__icon--danger' : 'todo__icon--warn'}`}>
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
          </div>
          <div className="todo__body">
            <div className="todo__title">
              <strong>{fuelWarnings.length} chuyến</strong> vượt ngưỡng tiêu hao nhiên liệu
            </div>
            <div className="todo__meta">
              <span>
                {fuelWarnings.map(w =>
                  `${w.code} (${w.driver}: ${w.ttbq.toFixed(1).replace('.', ',')} L/100km${w.critical ? ' 🔴' : ' ⚠️'})`
                ).join(' · ')}
              </span>
            </div>
          </div>
          <button className="btn btn--secondary btn--sm" onClick={(e) => { e.stopPropagation(); navigate('/trips'); }}>Xem chuyến</button>
        </div>
      )}

      {renewalReminders.length > 0 ? (
        <div className="todo" onClick={() => navigate('/expenses')}>
          <div className={`todo__icon ${renewalReminders.some(r => r.daysRemaining < 0) ? 'todo__icon--danger' : 'todo__icon--warn'}`}>
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          </div>
          <div className="todo__body">
            <div className="todo__title">
              <strong>{renewalReminders.length} hạng mục</strong> sắp hoặc đã quá hạn gia hạn
            </div>
            <div className="todo__meta">
              <span>
                {renewalReminders.slice(0, 3).map(r =>
                  `${r.truckPlate || 'Công ty'} · ${r.categoryName}: ${r.daysRemaining < 0 ? `Quá hạn ${Math.abs(r.daysRemaining)} ngày` : `Còn ${r.daysRemaining} ngày`}`
                ).join(' · ')}
                {renewalReminders.length > 3 && ` · +${renewalReminders.length - 3} khác`}
              </span>
            </div>
          </div>
          <button className="btn btn--secondary btn--sm" onClick={(e) => { e.stopPropagation(); navigate('/expenses'); }}>Xem chi phí</button>
        </div>
      ) : (
        <div className="todo" onClick={() => navigate('/expenses')}>
          <div className="todo__icon todo__icon--info">
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          </div>
          <div className="todo__body">
            <div className="todo__title">Không có hạng mục cần gia hạn</div>
            <div className="todo__meta"><span>Bảo hiểm, đăng kiểm, phí đường bộ</span></div>
          </div>
          <button className="btn btn--secondary btn--sm" onClick={(e) => { e.stopPropagation(); navigate('/expenses'); }}>Xem chi phí</button>
        </div>
      )}

      <div className="todo" onClick={() => navigate('/profit')}>
        <div className="todo__icon todo__icon--info">
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
        </div>
        <div className="todo__body">
          <div className="todo__title">
            Báo cáo lợi nhuận {String(currentMonth).padStart(2, '0')}/{currentYear} sẵn sàng
            {topShareholder ? (
              <> — phần của <strong>{topShareholder.name}</strong> ({topShareholder.percentage.toFixed(2)}%) là <strong>{formatCurrency(Math.round(netProfit * topShareholder.percentage / 100))}</strong></>
            ) : (
              <> — Tổng lợi nhuận ròng <strong>{formatCurrency(netProfit)}</strong></>
            )}
          </div>
          <div className="todo__meta"><span>Xác nhận để chốt sổ tháng</span></div>
        </div>
        <button className="btn btn--primary btn--sm" onClick={(e) => { e.stopPropagation(); navigate('/profit'); }}>Xem & xác nhận</button>
      </div>
    </Panel>
  );
}
