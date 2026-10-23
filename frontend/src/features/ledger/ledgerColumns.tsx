import type { ColumnDef } from '@tanstack/react-table';
import type { ReactNode } from 'react';
import { ContainerStatusDot, LedgerCell } from './LedgerEditableCell';
import {
  ANCILLARY_EXPENSE_TYPES,
  LoadingType,
  TRIP_STATUS_LABELS,
  TripStatus,
  type LedgerRow,
} from '@tingting/shared';
import { formatCurrency, formatDatePadded, formatNumber, shortCompanyName } from '../../lib/format';
import { StatusPill } from '../../components/UI';

// ─── Cell patch descriptors ──────────────────────────────────────────────────
// Every editable column describes which group endpoint its save goes through;
// the page executes the PATCH and repaints the row from the response.

export type LedgerCellPatch =
  | { kind: 'plan'; body: Record<string, unknown> }
  | { kind: 'money'; body: Record<string, unknown> }
  | { kind: 'expense'; expenseId: number; body: Record<string, unknown> };

export interface LedgerCellContext {
  canPlan: boolean;
  canMoney: boolean;
  /** Catalog options for select-type cells (khách hàng). */
  customerOptions: Array<{ value: string; label: string }>;
  /** Currently-editing cell (rowId:colId) with its draft value. */
  editing: { key: string; draft: string } | null;
  savingKey: string | null;
  /** Expand/collapse the per-container cross-check panel of a row. */
  onToggleExpand(rowId: number): void;
  onStartEdit(rowId: number, colId: string, initial: string): void;
  onDraftChange(draft: string): void;
  /** Commit; returns an error message or null. */
  onCommit(row: LedgerRow, colId: string, patch: LedgerCellPatch, draft: string): string | null;
  onCancelEdit(): void;
}

// ─── Value helpers ───────────────────────────────────────────────────────────

function money(value: string | null | undefined): string {
  if (value == null || value === '') return '—';
  const n = Number(value);
  return Number.isFinite(n) ? formatCurrency(n) : '—';
}

function textOrDash(value: string | null | undefined): string {
  return value != null && value.trim() !== '' ? value : '—';
}

function numOrDash(value: string | number | null | undefined): string {
  if (value == null || value === '') return '—';
  const n = Number(value);
  return Number.isFinite(n) ? formatNumber(n) : '—';
}

/** Sell-side rollup for one ancillary expense type; null = no fees recorded. */
function groupSellTotal(row: LedgerRow, types: string[]): string | null {
  const total = row.expenseRollup
    .filter(e => types.includes(e.expenseType))
    .reduce((sum, e) => sum + Number(e.sellTotal || 0), 0);
  return total !== 0 ? String(total) : null;
}

function groupExpenseIds(row: LedgerRow, types: string[]): number[] {
  return row.containers.flatMap(c => c.expenses)
    .filter(e => types.includes(e.expenseType))
    .map(e => e.id);
}

function legByLoading(row: LedgerRow, loadingType: LoadingType, sequence: number) {
  return row.legs.find(l => l.sequence === sequence && l.loadingType === loadingType) ?? null;
}

function containerQuantity(row: LedgerRow): ReactNode {
  const codes = row.containerTypeCodes;
  if (codes.length === 0) return '—';
  return `${row.containerCount ?? codes.length}x${codes.join('/')}`;
}

/**
 * Đối chiếu state of one container, mirroring the master sheet's container
 * cell colors: green = every fee approved with customs declarations complete,
 * amber = fees exist but something is missing, none = no fees recorded yet.
 */
export function containerReconStatus(c: LedgerRow['containers'][number]): 'none' | 'ok' | 'pending' {
  if (c.expenses.length === 0) return 'none';
  const allApproved = c.expenses.every(e => e.approvalStatus === 'APPROVED');
  const docsComplete = c.expenses.every(e => e.expenseType !== 'CUSTOMS' || (e.declarationNumber ?? '') !== '');
  return allApproved && docsComplete ? 'ok' : 'pending';
}

const STATUS_PILL_VARIANT: Record<TripStatus, 'success' | 'warn' | 'danger' | 'info' | 'neutral'> = {
  [TripStatus.CREATED]: 'neutral',
  [TripStatus.IN_TRANSIT]: 'info',
  [TripStatus.COMPLETED]: 'success',
  [TripStatus.LOCKED]: 'warn',
  [TripStatus.CANCELED]: 'danger',
};

// ─── Column groups ───────────────────────────────────────────────────────────

interface LeafMeta {
  group: 'plan' | 'revenue' | 'cash' | 'cost' | 'result';
  align?: 'num';
  /** Marks the last column of a group for the 1px group-boundary rule. */
  groupEnd?: boolean;
}

export type LedgerLeaf = ColumnDef<LedgerRow, unknown> & { meta?: LeafMeta };
/** tanstack v8 column group = a def carrying nested `columns`. Omit keeps the
 *  nested list canonical so contextual typing reaches each leaf's cell. */
export type LedgerGroup = Omit<ColumnDef<LedgerRow, unknown>, 'columns'> & { columns: LedgerLeaf[]; meta?: LeafMeta };

export function buildLedgerColumns(ctx: LedgerCellContext): Array<LedgerLeaf | LedgerGroup> {
  const plan = ctx.canPlan;
  const canMoney = ctx.canMoney;

  // Ba cột phí của sheet (nepoUI xlsx cột G/H/I): nâng hạ / nộp hộ / khác —
  // gom từ 8 loại phí ancillary; giá trị = Σ bán thu của nhóm.
  // depth) and the frozen column can stick on both scroll axes.
  const identityGroup: LedgerGroup = {
    id: 'g-identity',
    header: '',
    meta: { group: 'plan', groupEnd: true },
    columns: [
      {
        id: 'ledger-code',
        header: 'Lệnh',
        meta: { group: 'plan' },
        cell: ({ row }) => {
          const r = row.original;
          // Tên khách rút gọn nằm trong cột frozen: khi kế toán cuộn ngang tới
          // cột thứ 40 vẫn biết dòng này của khách hàng nào (sheet cột D).
          const customer = r.customerShortName || shortCompanyName(r.customerName) || `KH #${r.customerId}`;
          return (
            <div className="ledger-code">
              <button
                type="button"
                className="ledger-code__code"
                title="Bấm để xem đối chiếu theo container"
                onClick={(e) => {
                  e.stopPropagation();
                  ctx.onToggleExpand(r.id);
                }}
              >
                {r.tripCode ?? `#${r.id}`}
              </button>
              <span className="ledger-code__customer" title={r.customerName ?? undefined}>{customer}</span>
            </div>
          );
        },
      },
      {
        id: 'ledger-status',
        header: 'Trạng thái',
        meta: { group: 'plan', groupEnd: true },
        cell: ({ row }) => (
          <div className="ledger-status">
            <StatusPill variant={STATUS_PILL_VARIANT[row.original.status] ?? 'neutral'}>
              {TRIP_STATUS_LABELS[row.original.status] ?? row.original.status}
            </StatusPill>
          </div>
        ),
      },
    ],
  };

  const planGroup: LedgerGroup = {
    id: 'g-plan',
    header: 'Kế hoạch',
    columns: [
      {
        id: 'departureDate',
        header: 'Ngày KH',
        meta: { group: 'plan' },
        cell: ({ row }) => (
          <LedgerCell
            row={row.original}
            colId="departureDate"
            ctx={ctx}
            editable={plan}
            editType="date"
            rawValue={row.original.departureDate}
            display={formatDatePadded(row.original.departureDate)}
            lockedTitle="Chỉ Quản lý / Quản trị sửa được cột Kế hoạch"
            buildPatch={(r, draft) => (draft ? { kind: 'plan', body: { departureDate: draft } } : null)}
          />
        ),
      },
      {
        id: 'notes',
        header: 'Nội dung',
        meta: { group: 'plan' },
        cell: ({ row }) => (
          <LedgerCell
            row={row.original}
            colId="notes"
            ctx={ctx}
            editable={plan}
            rawValue={row.original.notes ?? ''}
            display={textOrDash(row.original.notes)}
            hint="+ Nội dung"
            buildPatch={(_r, draft) => ({ kind: 'plan', body: { notes: draft } })}
          />
        ),
      },
      {
        id: 'customerName',
        header: 'Khách hàng',
        meta: { group: 'plan' },
        cell: ({ row }) => {
          const r = row.original;
          return (
            <LedgerCell
              row={r}
              colId="customerName"
              ctx={ctx}
              editable={plan}
              editType="select"
              options={ctx.customerOptions}
              rawValue={String(r.customerId)}
              display={textOrDash(r.customerShortName || shortCompanyName(r.customerName))}
              hint="+ Khách hàng"
              title="Đổi khách hàng — hệ thống chặn nếu chuyến đã có thanh toán"
              buildPatch={(_rr, draft) => draft
                ? { kind: 'plan', body: { customerId: Number(draft) } }
                : null}
            />
          );
        },
      },
      {
        id: 'containerQty',
        header: 'Số lượng',
        meta: { group: 'plan', groupEnd: true },
        cell: ({ row }) => <span className="ledger-cell">{containerQuantity(row.original)}</span>,
      },
    ],
  };

  // Sheet reading order (nepoUI.docx image 3-4): after Số lượng come the money
  // blocks (revenue, cash — declared below), then route, then the container /
  // declaration identifiers, then carrier + hire cost.

  const routeGroup: LedgerGroup = {
    id: 'g-route',
    header: 'Tuyến & Hàng hóa',
    columns: [
      {
        id: 'origin1',
        header: 'Điểm đi',
        meta: { group: 'plan' },
        cell: ({ row }) => {
          const r = row.original;
          const leg = r.legs[0];
          return (
            <LedgerCell
              row={r}
              colId="origin1"
              ctx={ctx}
              editable={plan && !!leg}
              rawValue={leg?.origin ?? ''}
              display={textOrDash(leg?.origin ?? null)}
              hint="+ Điểm đi"
              lockedTitle={leg ? undefined : 'Chưa có chặng — thêm chặng trong bảng mở rộng'}
              buildPatch={(_rr, draft) => leg
                ? { kind: 'plan', body: { legs: [{ id: leg.id, sequence: leg.sequence, origin: draft }] } }
                : null}
            />
          );
        },
      },
      ...[0, 1, 2].map((legIdx): LedgerLeaf => ({
        id: `destination${legIdx + 1}`,
        header: `Điểm đến ${legIdx + 1}`,
        meta: { group: 'plan', groupEnd: legIdx === 2 },
        cell: ({ row }) => {
          const r = row.original;
          const leg = r.legs[legIdx];
          return (
            <LedgerCell
              row={r}
              colId={`destination${legIdx + 1}`}
              ctx={ctx}
              editable={plan && !!leg}
              rawValue={leg?.destination ?? ''}
              display={textOrDash(leg?.destination ?? null)}
              hint="+ Điểm đến"
              lockedTitle={leg ? undefined : 'Chưa có chặng này'}
              buildPatch={(_rr, draft) => leg
                ? { kind: 'plan', body: { legs: [{ id: leg.id, sequence: leg.sequence, destination: draft }] } }
                : null}
            />
          );
        },
      })),
      {
        id: 'cargoName',
        header: 'Tên hàng',
        meta: { group: 'plan', groupEnd: true },
        cell: ({ row }) => <span className="ledger-cell">{textOrDash(row.original.cargoTypeName)}</span>,
      },
    ],
  };

  const docsGroup: LedgerGroup = {
    id: 'g-docs',
    header: 'Cont & Tờ khai',
    columns: [
      {
        id: 'customerReference',
        header: 'Số BKG',
        meta: { group: 'plan' },
        cell: ({ row }) => (
          <LedgerCell
            row={row.original}
            colId="customerReference"
            ctx={ctx}
            editable={plan}
            rawValue={row.original.customerReference ?? ''}
            display={textOrDash(row.original.customerReference)}
            hint="+ Số BKG"
            buildPatch={(_r, draft) => ({ kind: 'plan', body: { customerReference: draft } })}
          />
        ),
      },
      {
        id: 'declarationNumbers',
        header: 'Số tờ khai',
        meta: { group: 'plan' },
        cell: ({ row }) => (
          <span className="ledger-cell">{textOrDash(row.original.containers.flatMap(c => c.declarationNumbers).join(', '))}</span>
        ),
      },
      {
        id: 'containerNumber',
        header: 'Số container',
        meta: { group: 'plan' },
        cell: ({ row }) => {
          const r = row.original;
          const c = r.containers.length === 1 ? r.containers[0] : null;
          const multi = r.containers.length > 1;
          return (
            <LedgerCell
              row={r}
              colId="containerNumber"
              ctx={ctx}
              editable={plan && !!c}
              rawValue={c?.containerNumber ?? ''}
              display={multi
                ? <span className="ledger-cell__stack"><ContainerStatusDot status={containerReconStatus(r.containers[0])} />{textOrDash(r.containers.map(x => x.containerNumber).join(', '))}</span>
                : <span className="ledger-cell__stack"><ContainerStatusDot status={c ? containerReconStatus(c) : 'none'} />{textOrDash(c?.containerNumber)}</span>}
              hint="+ Số Cont"
              lockedTitle={c ? undefined : 'Nhiều container — đối chiếu từng dòng container bên dưới'}
              buildPatch={(_rr, draft) => c ? { kind: 'plan', body: { containers: [{ id: c.id, containerNumber: draft }] } } : null}
            />
          );
        },
      },
      {
        id: 'sealNumber',
        header: 'Số seal',
        meta: { group: 'plan' },
        cell: ({ row }) => {
          const r = row.original;
          const c = r.containers.length === 1 ? r.containers[0] : null;
          return (
            <LedgerCell
              row={r}
              colId="sealNumber"
              ctx={ctx}
              editable={plan && !!c}
              rawValue={c?.seals.join(', ') ?? ''}
              display={c ? textOrDash(c.seals.join(', ')) : textOrDash(r.containers.map(x => x.seals.join(', ')).join(', '))}
              hint="+ Seal"
              lockedTitle={c ? undefined : 'Nhiều container — sửa trong bảng mở rộng dưới mỗi dòng'}
              buildPatch={(_rr, draft) => c ? { kind: 'plan', body: { containers: [{ id: c.id, containerNumber: c.containerNumber ?? '', sealNumber: draft }] } } : null}
            />
          );
        },
      },
      {
        id: 'completedAt',
        header: 'Ngày hạ hàng',
        meta: { group: 'plan' },
        cell: ({ row }) => (
          <span className="ledger-cell" title="Ngày hoàn thành hạ hàng">
            {row.original.completedAt ? row.original.completedAt.slice(0, 10) : '—'}
          </span>
        ),
      },
      {
        id: 'cargoWeight',
        header: 'G.W (kg)',
        meta: { group: 'plan', groupEnd: true },
        cell: ({ row }) => {
          const r = row.original;
          const c = r.containers.length === 1 ? r.containers[0] : null;
          return (
            <LedgerCell
              row={r}
              colId="cargoWeight"
              ctx={ctx}
              editable={plan && !!c}
              editType="number"
              rawValue={c?.cargoWeightKg ?? ''}
              display={numOrDash(c?.cargoWeightKg)}
              hint="+ G.W"
              buildPatch={(_rr, draft) => c ? { kind: 'plan', body: { containers: [{ id: c.id, cargoWeightKg: draft === '' ? null : Number(draft) }] } } : null}
            />
          );
        },
      },
    ],
  };

  // Ba cột phí của sheet (nepoUI xlsx cột G/H/I): nâng hạ / nộp hộ / khác —
  // gom từ 8 loại phí ancillary; giá trị = Σ bán thu của nhóm.
  const FEE_COLUMN_GROUPS: Array<{ id: string; header: string; hint: string; types: string[] }> = [
    {
      id: 'fee-nang-ha',
      header: 'Phí nâng hạ',
      hint: '+ Phí nâng hạ',
      types: [ANCILLARY_EXPENSE_TYPES[0], ANCILLARY_EXPENSE_TYPES[1]],
    },
    {
      id: 'fee-nop-ho',
      header: 'Phí nộp hộ',
      hint: '+ Phí nộp hộ',
      types: [ANCILLARY_EXPENSE_TYPES[3], ANCILLARY_EXPENSE_TYPES[4], ANCILLARY_EXPENSE_TYPES[5], ANCILLARY_EXPENSE_TYPES[6]],
    },
    {
      id: 'fee-khac',
      header: 'Phí khác',
      hint: '+ Phí khác',
      types: [ANCILLARY_EXPENSE_TYPES[2], ANCILLARY_EXPENSE_TYPES[7]],
    },
  ];
  // groupSellTotal / groupExpenseIds: module-level helpers (dưới đây).

  const revenueGroup: LedgerGroup = {
    id: 'g-revenue',
    header: 'Doanh thu',
    columns: [
      {
        id: 'revenue',
        header: 'Cước VC',
        meta: { group: 'revenue', align: 'num' },
        cell: ({ row }) => (
          <LedgerCell
            row={row.original}
            colId="revenue"
            ctx={ctx}
            editable={canMoney}
            editType="number"
            rawValue={row.original.revenue ?? ''}
            display={money(row.original.revenue)}
            hint="+ Cước"
            buildPatch={(_r, draft) => ({ kind: 'money', body: { revenue: draft === '' ? 0 : Number(draft) } })}
          />
        ),
      },
      ...FEE_COLUMN_GROUPS.map((group, gi): LedgerLeaf => ({
        id: group.id,
        header: group.header,
        meta: { group: 'revenue', align: 'num', groupEnd: gi === FEE_COLUMN_GROUPS.length - 1 },
        cell: ({ row }) => {
          const r = row.original;
          const eids = groupExpenseIds(r, group.types);
          const eid = eids.length === 1 ? eids[0] : null;
          const total = groupSellTotal(r, group.types);
          return (
            <LedgerCell
              row={r}
              colId={group.id}
              ctx={ctx}
              editable={canMoney && eid != null}
              editType="number"
              rawValue={total ?? ''}
              display={total
                ? <span className="ledger-collected">{money(total)}</span>
                : '—'}
              hint={group.hint}
              lockedTitle={eid != null ? undefined : 'Nhiều dòng phí trong nhóm — xem bảng mở rộng'}
              buildPatch={(_r2, draft) => eid != null
                ? { kind: 'expense', expenseId: eid, body: { sellAmount: draft === '' ? 0 : Number(draft) } }
                : null}
            />
          );
        },
      })),
      {
        id: 'returnCargo',
        header: 'Chọn vỏ',
        meta: { group: 'revenue', groupEnd: true },
        cell: ({ row }) => (
          <span
            className={`ledger-cell${row.original.hasReturnCargo ? ' ledger-flag--wait' : ''}`}
            title={row.original.hasReturnCargo ? 'Đang chở hàng/vỏ về' : undefined}
          >
            {row.original.hasReturnCargo ? 'Chờ vỏ' : '—'}
          </span>
        ),
      },
    ],
  };

  const cashGroup: LedgerGroup = {
    id: 'g-cash',
    header: 'Tạm ứng / Hoàn ứng',
    columns: [
      {
        id: 'advanceTotal',
        header: 'Tạm ứng',
        meta: { group: 'cash', align: 'num' },
        cell: ({ row }) => (
          <span className="ledger-cell" title="Tổng tạm ứng trong các phiếu hoàn ứng có chi phí của chuyến này">
            {Number(row.original.advanceTotal) !== 0 ? money(row.original.advanceTotal) : '—'}
          </span>
        ),
      },
      {
        id: 'outstandingAdvance',
        header: 'Số dư TU',
        meta: { group: 'cash', align: 'num' },
        cell: ({ row }) => (
          <span
            className="ledger-cell"
            title={row.original.outstandingAdvance == null ? 'Không xác định được nhân viên giao nhận của chuyến' : 'Số dư tạm ứng còn lại của nhân viên giao nhận'}
          >
            {row.original.outstandingAdvance == null ? '—' : money(row.original.outstandingAdvance)}
          </span>
        ),
      },
      {
        id: 'settlements',
        header: 'Hoàn ứng',
        meta: { group: 'cash', align: 'num', groupEnd: true },
        cell: ({ row }) => (
          <span className="ledger-cell">{textOrDash(row.original.settlements.map(st => st.code).join(', '))}</span>
        ),
      },
    ],
  };

  const kmColumns: LedgerLeaf[] = ([
    { loadingType: LoadingType.HANG, sequence: 1, header: 'Km hàng 1' },
    { loadingType: LoadingType.VO, sequence: 1, header: 'Km vỏ 1' },
    { loadingType: LoadingType.HANG, sequence: 2, header: 'Km hàng 2' },
    { loadingType: LoadingType.VO, sequence: 2, header: 'Km vỏ 2' },
  ]).map(({ loadingType, sequence, header }) => ({
    id: `km-${loadingType}-${sequence}`,
    header,
    meta: { group: 'cost', align: 'num' },
    cell: ({ row }) => {
      const r = row.original;
      const leg = legByLoading(r, loadingType, sequence);
      return (
        <LedgerCell
          row={r}
          colId={`km-${loadingType}-${sequence}`}
          ctx={ctx}
          editable={plan && !!leg}
          editType="number"
          rawValue={leg?.km != null ? String(leg.km) : ''}
          display={numOrDash(leg?.km)}
          lockedTitle={leg ? undefined : 'Chưa có chặng này'}
          buildPatch={(_rr, draft) => leg
            ? { kind: 'plan', body: { legs: [{ id: leg.id, sequence: leg.sequence, km: draft === '' ? 0 : Number(draft) }] } }
            : null}
        />
      );
    },
  }));

  const carrierGroup: LedgerGroup = {
    id: 'g-carrier',
    header: 'Phương tiện & Đối tác',
    columns: [
      {
        id: 'truck',
        header: 'Xe / Lái xe',
        meta: { group: 'plan' },
        cell: ({ row }) => {
          const r = row.original;
          const plate = r.carrierType === 'EXTERNAL' ? (r.externalPlateNumber ?? '—') : textOrDash(r.truckPlate);
          return (
            <span className="ledger-cell">
              <span className="plate">{plate}</span>
              <span className="ledger-cell__sub">{textOrDash(r.driverName)}</span>
            </span>
          );
        },
      },
      {
        id: 'carrier',
        header: 'Đối tác VC',
        meta: { group: 'plan' },
        cell: ({ row }) => <span className="ledger-cell">{textOrDash(row.original.externalCarrierName)}</span>,
      },
      {
        id: 'externalFreight',
        header: 'Cước thuê',
        meta: { group: 'cost', align: 'num', groupEnd: true },
        cell: ({ row }) => (
          <LedgerCell
            row={row.original}
            colId="externalFreight"
            ctx={ctx}
            editable={canMoney}
            editType="number"
            rawValue={row.original.externalFreightCost ?? ''}
            display={money(row.original.externalFreightCost)}
            hint="+ Cước thuê"
            buildPatch={(_r, draft) => ({ kind: 'money', body: { externalFreightCost: draft === '' ? null : Number(draft) } })}
          />
        ),
      },
    ],
  };

  const costGroup: LedgerGroup = {
    id: 'g-cost',
    header: 'Chi phí',
    columns: [
      {
        id: 'roadAllowance',
        header: 'Hạch toán',
        meta: { group: 'cost' },
        cell: ({ row }) => {
          // Sheet cột AB "Hạch toán" = KỲ hạch toán (tháng của ngày KH),
          // không phải số tiền — hiển thị suy ra từ departureDate.
          const d = row.original.departureDate;
          const period = /^\d{4}-\d{2}/.test(d) ? `Tháng ${d.slice(5, 7)}/${d.slice(0, 4)}` : '—';
          return (
            <span className="ledger-cell" title="Kỳ hạch toán (theo tháng kế hoạch)">
              {period}
            </span>
          );
        },
      },
      {
        id: 'tollCost',
        header: 'Vé cầu đường',
        meta: { group: 'cost', align: 'num' },
        cell: ({ row }) => {
          const r = row.original;
          const stations = r.tollsStations ?? 0;
          return (
            <LedgerCell
              row={r}
              colId="tollCost"
              ctx={ctx}
              editable={canMoney}
              editType="number"
              rawValue={String(stations)}
              display={
                <span className="ledger-toll">
                  <span className="ledger-toll__amount">{money(r.tollCost)}</span>
                  {stations > 0 && <span className="ledger-toll__stations">{stations} trạm</span>}
                </span>
              }
              title="Số trạm BOT — tiền trạm tính theo cấu hình"
              buildPatch={(_rr, draft) => ({ kind: 'money', body: { tollsStations: draft === '' ? 0 : Math.max(0, Math.round(Number(draft))) } })}
            />
          );
        },
      },
      ...kmColumns,
      {
        id: 'fuelLiters',
        header: 'Petro (l)',
        meta: { group: 'cost', align: 'num' },
        cell: ({ row }) => (
          <LedgerCell
            row={row.original}
            colId="fuelLiters"
            ctx={ctx}
            editable={canMoney}
            editType="number"
            rawValue={row.original.fuelLiters ?? ''}
            display={numOrDash(row.original.fuelLiters)}
            hint="+ Lít dầu"
            buildPatch={(_r, draft) => ({ kind: 'money', body: { fuelLitersOverride: draft === '' ? null : Number(draft) } })}
          />
        ),
      },
      {
        id: 'fuelUnitPrice',
        header: 'Đơn giá',
        meta: { group: 'cost', align: 'num' },
        cell: ({ row }) => (
          <LedgerCell
            row={row.original}
            colId="fuelUnitPrice"
            ctx={ctx}
            editable={canMoney}
            editType="number"
            rawValue={row.original.fuelUnitPrice ?? ''}
            display={money(row.original.fuelUnitPrice)}
            hint="+ Đơn giá"
            buildPatch={(_r, draft) => ({ kind: 'money', body: { fuelActualUnitPrice: draft === '' ? null : Number(draft) } })}
          />
        ),
      },
      {
        id: 'totalFuelCost',
        header: 'Thành tiền dầu',
        meta: { group: 'cost', align: 'num' },
        cell: ({ row }) => <span className="ledger-cell">{money(row.original.totalFuelCost)}</span>,
      },
      {
        id: 'fuelSupplier',
        header: 'NCC dầu',
        meta: { group: 'cost' },
        cell: ({ row }) => <span className="ledger-cell">{textOrDash(row.original.fuelSupplierName)}</span>,
      },
      {
        id: 'driverSalary',
        header: 'Tiền lương',
        meta: { group: 'cost', align: 'num', groupEnd: true },
        cell: ({ row }) => (
          <LedgerCell
            row={row.original}
            colId="driverSalary"
            ctx={ctx}
            editable={canMoney}
            editType="number"
            rawValue={row.original.driverSalary ?? ''}
            display={money(row.original.driverSalary)}
            hint="+ Lương"
            buildPatch={(_r, draft) => ({ kind: 'money', body: { driverSalary: draft === '' ? 0 : Number(draft) } })}
          />
        ),
      },
    ],
  };

  const resultGroup: LedgerGroup = {
    id: 'g-result',
    header: 'Kết quả',
    columns: [
      {
        id: 'totalCost',
        header: 'Tổng chi phí',
        meta: { group: 'result', align: 'num' },
        cell: ({ row }) => <span className="ledger-cell">{money(row.original.totalCost)}</span>,
      },
      {
        id: 'grossProfit',
        header: '(Lợi nhuận)',
        meta: { group: 'result', align: 'num' },
        cell: ({ row }) => {
          const r = row.original;
          if (r.grossProfit == null) return <span className="ledger-cell">—</span>;
          const n = Number(r.grossProfit);
          return (
            <span className={`ledger-cell${n < 0 ? ' ledger-cell--loss' : ''}`}>{money(r.grossProfit)}</span>
          );
        },
      },
      {
        id: 'marginPct',
        header: 'Biên LN',
        meta: { group: 'result', align: 'num', groupEnd: true },
        cell: ({ row }) => {
          const r = row.original;
          const rev = Number(r.revenue ?? 0);
          const gp = Number(r.grossProfit ?? 0);
          if (!rev || r.grossProfit == null) return <span className="ledger-cell">—</span>;
          const pct = Math.round((gp / rev) * 1000) / 10;
          return (
            <span className={`ledger-cell${pct < 0 ? ' ledger-cell--loss' : ''}`}>
              {pct.toLocaleString('vi-VN')}%
            </span>
          );
        },
      },
    ],
  };

  return [
    identityGroup,
    planGroup,
    revenueGroup,
    cashGroup,
    routeGroup,
    docsGroup,
    carrierGroup,
    costGroup,
    resultGroup,
  ];
}
