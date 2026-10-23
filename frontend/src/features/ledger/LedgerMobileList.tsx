import React, { useState } from 'react';
import { X } from 'lucide-react';
import { TRIP_STATUS_LABELS, TripStatus, type LedgerRow } from '@tingting/shared';
import { formatCurrency, formatDatePadded } from '../../lib/format';
import { StatusPill } from '../../components/UI';
import { ContainerStatusDot, LedgerCell } from './LedgerEditableCell';
import type { LedgerCellContext, LedgerCellPatch } from './ledgerColumns';
import { containerReconStatus } from './ledgerColumns';

const STATUS_PILL_VARIANT: Record<TripStatus, 'success' | 'warn' | 'danger' | 'info' | 'neutral'> = {
  [TripStatus.CREATED]: 'neutral',
  [TripStatus.IN_TRANSIT]: 'info',
  [TripStatus.COMPLETED]: 'success',
  [TripStatus.LOCKED]: 'warn',
  [TripStatus.CANCELED]: 'danger',
};

function money(v: string | null | undefined): string {
  if (v == null || v === '') return '—';
  const n = Number(v);
  return Number.isFinite(n) ? formatCurrency(n) : '—';
}

function orDash(v: string | null | undefined): string {
  return v != null && v.trim() !== '' ? v : '—';
}

/** Mobile field line: full-width, 44px touch target, reuses the desktop
 *  commit path (LedgerCell) so edit guard + group permissions behave the same. */
function MobileField(props: {
  row: LedgerRow;
  colId: string;
  ctx: LedgerCellContext;
  label: string;
  editable: boolean;
  editType?: 'text' | 'number' | 'date';
  rawValue?: string;
  value: string;
  buildPatch?: (row: LedgerRow, draft: string) => LedgerCellPatch | null;
  title?: string;
}) {
  const { row, colId, ctx, label, editable, editType = 'text', rawValue = '', value, buildPatch, title } = props;
  return (
    <div className="ledger-m-field">
      <span className="ledger-m-field__label">{label}</span>
      <span className="ledger-m-field__value">
        <LedgerCell
          row={row}
          colId={colId}
          ctx={ctx}
          editable={editable}
          editType={editType}
          rawValue={rawValue}
          display={value}
          buildPatch={buildPatch}
          title={title}
        />
      </span>
    </div>
  );
}

function MobileSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="ledger-m-section">
      <h4 className="ledger-m-section__title">{title}</h4>
      {children}
    </section>
  );
}

/** Full-screen sheet: toàn bộ thông tin 1 lệnh trong một cuộn liên tục —
 *  đối chiếu theo container nằm ngay trong sheet (nguyên tắc "1 bảng"). */
function LedgerMobileSheet({ row, ctx, canPlan, canMoney, onClose }: {
  row: LedgerRow;
  ctx: LedgerCellContext;
  canPlan: boolean;
  canMoney: boolean;
  onClose: () => void;
}) {
  return (
    <div className="ledger-m-sheet" role="dialog" aria-label={`Chi tiết ${row.tripCode ?? row.id}`}>
      <header className="ledger-m-sheet__head">
        <div>
          <span className="ledger-m-sheet__code">{row.tripCode ?? `#${row.id}`}</span>
          <StatusPill variant={STATUS_PILL_VARIANT[row.status] ?? 'neutral'}>
            {TRIP_STATUS_LABELS[row.status] ?? row.status}
          </StatusPill>
        </div>
        <button type="button" className="ledger-m-sheet__close" aria-label="Đóng" onClick={onClose}>
          <X size={18} />
        </button>
      </header>

      <div className="ledger-m-sheet__body">
        <MobileSection title="Kế hoạch">
          <MobileField row={row} colId="departureDate" ctx={ctx} label="Ngày KH" editable={canPlan} editType="date" rawValue={row.departureDate} value={formatDatePadded(row.departureDate)} buildPatch={(_r, draft) => (draft ? { kind: 'plan', body: { departureDate: draft } } : null)} />
          <MobileField row={row} colId="notes" ctx={ctx} label="Nội dung" editable={canPlan} rawValue={row.notes ?? ''} value={orDash(row.notes)} buildPatch={(_r, draft) => ({ kind: 'plan', body: { notes: draft } })} />
          <div className="ledger-m-field">
            <span className="ledger-m-field__label">Khách hàng</span>
            <span className="ledger-m-field__value">{orDash(row.customerName)}</span>
          </div>
          <div className="ledger-m-field">
            <span className="ledger-m-field__label">Số lượng</span>
            <span className="ledger-m-field__value">
              {row.containerTypeCodes.length === 0 ? '—' : `${row.containerCount ?? row.containerTypeCodes.length}x${row.containerTypeCodes.join('/')}`}
            </span>
          </div>
          {row.legs.map((leg) => (
            <div key={leg.id} className="ledger-m-field">
              <span className="ledger-m-field__label">#{leg.sequence} {leg.loadingType === 'HANG' ? 'Hàng' : 'Vỏ'}</span>
              <span className="ledger-m-field__value">{leg.origin} → {leg.destination} · {leg.km} km</span>
            </div>
          ))}
          <div className="ledger-m-field">
            <span className="ledger-m-field__label">Tên hàng</span>
            <span className="ledger-m-field__value">{orDash(row.cargoTypeName)}</span>
          </div>
          <MobileField row={row} colId="customerReference" ctx={ctx} label="Số BKG" editable={canPlan} rawValue={row.customerReference ?? ''} value={orDash(row.customerReference)} buildPatch={(_r, draft) => ({ kind: 'plan', body: { customerReference: draft } })} />
        </MobileSection>

        <MobileSection title="Doanh thu & Tạm ứng">
          <MobileField row={row} colId="revenue" ctx={ctx} label="Cước VC" editable={canMoney} editType="number" rawValue={row.revenue ?? ''} value={money(row.revenue)} buildPatch={(_r, draft) => ({ kind: 'money', body: { revenue: draft === '' ? 0 : Number(draft) } })} />
          {row.expenseRollup.filter(e => Number(e.sellTotal) !== 0).map(e => (
            <div key={e.expenseType} className="ledger-m-field">
              <span className="ledger-m-field__label">{e.expenseType}</span>
              <span className="ledger-m-field__value">{money(e.sellTotal)}</span>
            </div>
          ))}
          <MobileField row={row} colId="driverSalary" ctx={ctx} label="Tiền lương" editable={canMoney} editType="number" rawValue={row.driverSalary ?? ''} value={money(row.driverSalary)} buildPatch={(_r, draft) => ({ kind: 'money', body: { driverSalary: draft === '' ? 0 : Number(draft) } })} />
          <div className="ledger-m-field">
            <span className="ledger-m-field__label">Tạm ứng</span>
            <span className="ledger-m-field__value">{Number(row.advanceTotal) !== 0 ? money(row.advanceTotal) : '—'}</span>
          </div>
          {row.settlements.map(st => (
            <div key={st.id} className="ledger-m-field">
              <span className="ledger-m-field__label">{st.code}</span>
              <span className="ledger-m-field__value">{money(st.totalExpenseAmount)}</span>
            </div>
          ))}
        </MobileSection>

        <MobileSection title="Đối chiếu theo container">
          {row.containers.length === 0 && <p className="ledger-m-none">Chưa có container</p>}
          {row.containers.map(c => (
            <div key={c.id} className="ledger-m-cont">
              <div className="ledger-m-cont__head">
                <ContainerStatusDot status={containerReconStatus(c)} />
                <span className="ledger-m-cont__no">{c.containerNumber ?? 'Chưa có số cont'}</span>
                {c.seals.length > 0 && <span className="ledger-m-cont__seal">Seal {c.seals.join(', ')}</span>}
              </div>
              {c.declarationNumbers.length > 0 && (
                <div className="ledger-m-cont__line">Tờ khai: {c.declarationNumbers.join(', ')}</div>
              )}
              {c.expenses.map(e => (
                <div key={e.id} className="ledger-m-cont__fee">
                  <span>{e.expenseType}</span>
                  <span className="num">{Number(e.buyAmount) !== 0 ? `${Number(e.buyAmount).toLocaleString('vi-VN')} ₫` : '—'}</span>
                </div>
              ))}
              {c.expenses.length === 0 && <div className="ledger-m-cont__line">Chưa có phí</div>}
            </div>
          ))}
        </MobileSection>

        <MobileSection title="Chi phí & Kết quả">
          <MobileField row={row} colId="fuelLiters" ctx={ctx} label="Petro (l)" editable={canMoney} editType="number" rawValue={row.fuelLiters ?? ''} value={money(row.fuelLiters)} buildPatch={(_r, draft) => ({ kind: 'money', body: { fuelLitersOverride: draft === '' ? null : Number(draft) } })} />
          <MobileField row={row} colId="fuelUnitPrice" ctx={ctx} label="Đơn giá" editable={canMoney} editType="number" rawValue={row.fuelUnitPrice ?? ''} value={money(row.fuelUnitPrice)} buildPatch={(_r, draft) => ({ kind: 'money', body: { fuelActualUnitPrice: draft === '' ? null : Number(draft) } })} />
          <div className="ledger-m-field">
            <span className="ledger-m-field__label">Thành tiền dầu</span>
            <span className="ledger-m-field__value">{money(row.totalFuelCost)}</span>
          </div>
          <div className="ledger-m-field">
            <span className="ledger-m-field__label">Vé cầu đường</span>
            <span className="ledger-m-field__value">{money(row.tollCost)}</span>
          </div>
          <div className="ledger-m-field">
            <span className="ledger-m-field__label">Tổng chi phí</span>
            <span className="ledger-m-field__value">{money(row.totalCost)}</span>
          </div>
          <div className="ledger-m-field">
            <span className="ledger-m-field__label">Lợi nhuận</span>
            <span className="ledger-m-field__value">{money(row.grossProfit)}</span>
          </div>
        </MobileSection>
      </div>
    </div>
  );
}

/** Mobile thay thế bảng ngang: card gập gọn + full-screen sheet khi chạm.
 *  Vẫn là "1 bảng" theo nguyên tắc nepoUI — mọi số liệu của 1 lệnh nằm
 *  trong 1 cuộn liên tục, đối chiếu container ngay bên trong. */
export function LedgerMobileList({ rows, ctx, canPlan, canMoney }: {
  rows: LedgerRow[];
  ctx: LedgerCellContext;
  canPlan: boolean;
  canMoney: boolean;
}) {
  const [sheetId, setSheetId] = useState<number | null>(null);
  const sheetRow = rows.find(r => r.id === sheetId) ?? null;
  const sum = (field: 'revenue' | 'totalCost' | 'grossProfit'): number =>
    rows.reduce((acc, r) => acc + Number(r[field] ?? 0) || 0, 0);

  return (
    <div className="ledger-mobile">
      <div className="ledger-mobile__list">
        {rows.map((row) => (
          <button
            key={row.id}
            type="button"
            className="ledger-m-card"
            onClick={() => setSheetId(row.id)}
          >
            <div className="ledger-m-card__head">
              <span className="ledger-m-card__code">{row.tripCode ?? `#${row.id}`}</span>
              <StatusPill variant={STATUS_PILL_VARIANT[row.status] ?? 'neutral'}>
                {TRIP_STATUS_LABELS[row.status] ?? row.status}
              </StatusPill>
            </div>
            <div className="ledger-m-card__customer">{orDash(row.customerName)} · {formatDatePadded(row.departureDate)}</div>
            <div className="ledger-m-card__cont">
              {(row.containers.length ? row.containers : []).slice(0, 2).map(c => (
                <span key={c.id} className="ledger-m-card__cont-item">
                  <ContainerStatusDot status={containerReconStatus(c)} />
                  {c.containerNumber ?? '—'}
                </span>
              ))}
              {row.containers.length === 0 && <span className="ledger-m-card__cont-item">Chưa có cont</span>}
            </div>
            <div className="ledger-m-card__money">
              <span><i>Cước</i>{money(row.revenue)}</span>
              <span><i>Chi</i>{money(row.totalCost)}</span>
              <span><i>LN</i>{money(row.grossProfit)}</span>
            </div>
          </button>
        ))}
      </div>

      {sheetRow && (
        <LedgerMobileSheet
          row={sheetRow}
          ctx={ctx}
          canPlan={canPlan}
          canMoney={canMoney}
          onClose={() => setSheetId(null)}
        />
      )}

      {rows.length > 0 && (
        <div className="ledger-m-totalbar" aria-live="polite">
          <span><i>Tổng {rows.length} lệnh</i></span>
          <span>Cước <b>{formatCurrency(sum('revenue'))}</b></span>
          <span>Chi <b>{formatCurrency(sum('totalCost'))}</b></span>
          <span>LN <b>{formatCurrency(sum('grossProfit'))}</b></span>
        </div>
      )}
    </div>
  );
}
