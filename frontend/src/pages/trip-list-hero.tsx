import { Download, Pencil, Plus, X } from 'lucide-react';
import { TripStatus } from '@tingting/shared';
import { formatMoney, type StatusCounts } from '../features/trips';
import type { tripClient } from '../api/tripClient';

type Summary = Awaited<ReturnType<typeof tripClient.getTripsSummary>>;
interface TripListHeroProps { todayLabel: string; statusCounts: StatusCounts; summary?: Summary; quickEdit: boolean; toggleQuickEdit: () => void; handleExport: () => void; onAdd: () => void; breakdownPct: { chot: number; htth: number; dang: number; moi: number; huy: number }; warnThreshold: number; month: number }

/* Header + metric strip gọn (audit Gemini 23/10): hero card 340px cũ chiếm
   ~40% viewport đầu; giờ 1 hàng tiêu đề 48px + 1 strip chỉ số ~56px, không
   bar/legend (trùng tabs trạng thái bên dưới). breakdownPct giữ trong props
   cho tương thích caller nhưng không còn vẽ. */
export function TripListHero({ todayLabel, statusCounts, summary, quickEdit, toggleQuickEdit, handleExport, onAdd, warnThreshold, month }: TripListHeroProps) {
 return (
        <section className="trip-hero-compact">
          <div className="thc-top">
            <h1 className="thc-title">
              Sổ chuyến đi
              <span className="thc-period">· {todayLabel}</span>
            </h1>
            <div className="thc-sub">
              <span>{statusCounts.all} chuyến</span>
              {statusCounts[TripStatus.COMPLETED] > 0 && (
                <span title="Chờ khóa: chuyến đã hoàn thành, chờ kế toán xác nhận khóa sổ kế toán">· {statusCounts[TripStatus.COMPLETED]} chờ khóa</span>
              )}
              {(summary?.missingFuel ?? 0) > 0 && <span>· {summary?.missingFuel} chưa khai báo dầu</span>}
            </div>
            <div className="hero-actions">
              <button type="button" className={`btn hero-action--quick ${quickEdit ? 'btn--primary' : 'btn--secondary'}`} onClick={toggleQuickEdit} aria-label={quickEdit ? 'Thoát chế độ sửa nhanh' : 'Bật chế độ sửa nhanh'}>
                {quickEdit ? <X size={15} /> : <Pencil size={15} />}
                <span className="hero-action-label">{quickEdit ? 'Thoát sửa nhanh' : 'Sửa nhanh'}</span>
              </button>
              <button type="button" className="btn btn--secondary hero-action--export" onClick={handleExport} aria-label="Xuất danh sách chuyến ra Excel">
                <Download size={15} />
                <span className="hero-action-label">Xuất Excel</span>
              </button>
              <button type="button" className="btn btn--primary hero-action--add" onClick={onAdd}>
                <Plus size={15} strokeWidth={2.4} />
                Thêm chuyến
              </button>
            </div>
          </div>

          <div className="thc-strip">
            <div className="thc-metric">
              <span className="thc-metric-label">Tổng chuyến</span>
              <span className="thc-metric-value d-mono">{statusCounts.all}</span>
              <span className="thc-metric-hint">{statusCounts[TripStatus.IN_TRANSIT]} đang chạy · {statusCounts[TripStatus.CREATED]} mới tạo</span>
            </div>
            <div className="thc-metric">
              <span className="thc-metric-label">Tổng KM</span>
              <span className="thc-metric-value d-mono">{(summary?.totalKm ?? 0).toLocaleString('vi-VN')}<i>km</i></span>
            </div>
            <div className="thc-metric">
              <span className="thc-metric-label">Tổng dầu</span>
              <span className="thc-metric-value d-mono">{(summary?.totalFuel ?? 0).toLocaleString('vi-VN', { maximumFractionDigits: 0 })}<i>L</i></span>
              <span className={`thc-metric-hint${(summary?.totalKm ?? 0) > 0 && (summary?.avgPer100 ?? 0) > warnThreshold ? ' thc-hint-warn' : ''}`}>
                {(summary?.totalKm ?? 0) > 0 ? <>TB {(summary?.avgPer100 ?? 0).toFixed(1).replace('.', ',')} L/100km · ngưỡng {warnThreshold.toFixed(1).replace('.', ',')}</> : 'TB không khả dụng'}
              </span>
            </div>
            <div className="thc-metric">
              <span className="thc-metric-label">Tiền đi đường</span>
              <span className="thc-metric-value d-mono">{formatMoney(summary?.totalRoad ?? 0)}<i>₫</i></span>
              <span className="thc-metric-hint">
                {(summary?.missingFuel ?? 0) > 0 ? `${summary?.missingFuel} chuyến chưa cập nhật` : 'Đã cập nhật đầy đủ'}
              </span>
            </div>
            <div className="thc-metric">
              <span className="thc-metric-label">Tổng giá trị lệnh</span>
              <span className="thc-metric-value d-mono">{formatMoney(summary?.totalRevenue ?? 0)}<i>₫</i></span>
              <span className="thc-metric-hint">Tháng {month} · mọi trạng thái</span>
            </div>
          </div>
        </section>
 );
}
