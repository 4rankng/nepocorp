import { canonicalFreightDescription, type BillingDocumentType, type BillingDocumentLine } from '@tingting/shared';

export interface BillingRouteGroup {
  key: string;
  routeName: string;
  lines: Array<{ line: BillingDocumentLine; index: number }>;
  subtotal: number;
  visibleCount: number;
}

export interface BillingContainerGroup {
  key: string;
  label: string;
  lines: Array<{ line: BillingDocumentLine; index: number }>;
  subtotal: number;
  visibleCount: number;
}

export const TITLE: Record<BillingDocumentType, string> = {
  DEBIT_NOTE: 'Giấy báo nợ',
  PAYMENT_STATEMENT: 'Bảng kê',
};

export const SERVICE_FEE_LABELS: Record<string, string> = {
  LIFTING: 'Phí nâng container',
  LOWERING: 'Phí hạ container',
  CUSTOMS: 'Phí hải quan',
  INFRASTRUCTURE: 'Phí hạ tầng',
  WEIGHING: 'Phí cân hàng',
  INSPECTION: 'Phí kiểm hóa',
  INSPECTION_SVC: 'Phí dịch vụ kiểm hóa',
  OTHER: 'Phí chi hộ khác',
};

export function normalizeFreightDescription(line: BillingDocumentLine): BillingDocumentLine {
  const description = canonicalFreightDescription(line);
  return description !== line.description ? { ...line, description } : line;
}

export function normalizeLine(line: BillingDocumentLine): BillingDocumentLine {
  const normalized = normalizeFreightDescription(line);
  if (normalized.lineType !== 'SERVICE_FEE') return normalized;
  const label = SERVICE_FEE_LABELS[normalized.description?.trim().toUpperCase() ?? ''];
  if (label) normalized.description = label;
  return normalized;
}

export function lineTotal(line: BillingDocumentLine): number {
  // NEPO-62 VAT — mirrors the server's debitNoteTotals: Chờ hóa đơn lines
  // contribute nothing; a SHIPMENT_COST line's total carries its VAT rate.
  if (line.excluded || line.renderData?.blankAmount) return 0;
  const amount = line.amountOverride != null ? Number(line.amountOverride) : Number(line.baseAmount);
  const vat = line.sourceType === 'SHIPMENT_COST' ? (line.renderData?.vatRate ?? 0) : 0;
  return Math.round(amount * (1 + vat));
}

export function thisMonthRange(): { from: string; to: string } {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { from: fmt(from), to: fmt(to) };
}

export function displayDate(value: string): string {
  const [year, month, day] = value.split('-');
  return year && month && day ? `${day}/${month}/${year}` : value;
}

export function splitRouteName(routeName: string): { origin: string; destination: string } | null {
  const normalized = routeName.replace(/\s+/g, ' ').trim();
  const separator = normalized.match(/\s[-–—]\s/);
  if (!separator || separator.index === undefined) return null;
  const origin = normalized.slice(0, separator.index).trim();
  const destination = normalized.slice(separator.index + separator[0].length).trim();
  return origin && destination ? { origin, destination } : null;
}

// removed lineTypeLabel since we use typeLabel string now

export function containerLabel(line: BillingDocumentLine): string {
  return (line.containerNumbers ?? []).join(', ') || 'Không có container';
}

export function groupLinesByContainer(lines: Array<{ line: BillingDocumentLine; index: number }>): BillingContainerGroup[] {
  const groups: BillingContainerGroup[] = [];
  const byContainer = new Map<string, BillingContainerGroup>();

  for (const item of lines) {
    const label = containerLabel(item.line);
    const key = label.trim().toLowerCase();
    let group = byContainer.get(key);
    if (!group) {
      group = { key, label, lines: [], subtotal: 0, visibleCount: 0 };
      byContainer.set(key, group);
      groups.push(group);
    }
    group.lines.push(item);
    group.subtotal += lineTotal(item.line);
    if (!item.line.excluded) group.visibleCount += 1;
  }

  return groups;
}

export function documentFileName(type: BillingDocumentType, entityName: string): string {
  const prefix = type === 'DEBIT_NOTE' ? 'giay-bao-no' : 'bang-ke';
  return `${prefix}-${entityName}.xlsx`;
}
