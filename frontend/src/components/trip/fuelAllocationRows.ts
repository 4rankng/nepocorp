import type { Supplier } from '@tingting/shared';
import { createDefaultFuelAllocations, type FuelAllocationFormRow } from '../../hooks/useTripFormState';

/** Same shape the catalogs bootstrap endpoint returns for suppliers. */
type CatalogSuppliers = Array<Pick<Supplier, 'id' | 'name' | 'shortName' | 'status' | 'isFuelSupplier'>>;

export function fuelSupplierLabel(supplier: Pick<Supplier, 'name' | 'shortName'> | undefined): string {
  return supplier?.shortName ?? supplier?.name ?? 'Nhà cung cấp đã lưu';
}

/**
 * The database catalog is the authority for the fuel-allocation rows. An
 * inactive supplier is retained only when it was already saved on an old trip
 * (handled by normalizeFuelAllocationRows), never offered for new allocation.
 */
export function activeFuelSuppliers(
  suppliers: CatalogSuppliers | undefined,
): CatalogSuppliers {
  return suppliers?.filter(supplier => (
    supplier.status === 'ACTIVE' && supplier.isFuelSupplier
  )) ?? [];
}

/**
 * Standard slot key for a counterparty (a credit supplier or the cash row).
 */
function counterpartyKey(paymentMethod: 'CREDIT' | 'CASH', supplierId: number | null): string {
  return paymentMethod === 'CASH' ? 'CASH' : `CREDIT:${supplierId}`;
}

/**
 * True for the fixed catalog slots (one row per active supplier + cash row);
 * false for per-purchase extra rows and saved extras.
 */
export function isStandardFuelRowKey(key: string): boolean {
  return key === 'fuel-outside' || /^fuel-supplier-\d+$/.test(key);
}
/**
 * Fuel allocation rows are derived from the active fuel-supplier catalog so
 * every available supplier is immediately usable. One standard slot exists per
 * counterparty; a trip may hold several PURCHASES per counterparty (each with
 * its own pump price), so:
 * - the first saved row per counterparty merges into the standard slot;
 * - the 2nd+ saved rows per counterparty are kept as per-purchase extra rows;
 * - unmatched rows survive only when they carry fuel (the legacy branch).
 *
 * Output keeps the canonical counterparty order (catalog suppliers, cash last)
 * and every per-purchase row stays directly after its own counterparty's slot,
 * so a row added with "+" never drifts to another supplier. Idempotent:
 * normalizing twice yields the same rows as once.
 */
export function normalizeFuelAllocationRows(
  rows: FuelAllocationFormRow[],
  suppliers: CatalogSuppliers,
): FuelAllocationFormRow[] {
  const standardRows: FuelAllocationFormRow[] = [
    ...suppliers.map((supplier) => ({
      _key: `fuel-supplier-${supplier.id}`,
      point: 'CUSTOM' as const,
      enabled: false,
      supplierId: supplier.id,
      paymentMethod: 'CREDIT' as const,
      liters: '',
      unitPrice: '',
    })),
    ...createDefaultFuelAllocations(),
  ];
  const slotByCounterparty = new Map(standardRows.map(row => [counterpartyKey(row.paymentMethod, row.supplierId), row]));
  const consumed = new Set<string>();
  const extrasByCounterparty = new Map<string, FuelAllocationFormRow[]>();
  const unmatched: FuelAllocationFormRow[] = [];

  for (const row of rows) {
    const key = counterpartyKey(row.paymentMethod, row.supplierId);
    const slot = slotByCounterparty.get(key);
    if (!slot) {
      // Unmatched rows (e.g. a supplier no longer active) survive only when
      // they still carry fuel.
      if (row.enabled || (Number(row.liters) || 0) > 0) unmatched.push(row);
      continue;
    }
    if (consumed.has(key)) {
      // 2nd+ purchase rows per counterparty are always kept — including empty
      // drafts the + button just added (the submit payload filters them).
      const extras = extrasByCounterparty.get(key);
      if (extras) extras.push(row);
      else extrasByCounterparty.set(key, [row]);
      continue;
    }
    consumed.add(key);
    slot.liters = row.liters;
    slot.unitPrice = row.unitPrice ?? '';
    slot.enabled = row.enabled || (Number(row.liters) || 0) > 0;
  }

  const out: FuelAllocationFormRow[] = [];
  for (const slot of standardRows) {
    out.push(slot);
    const extras = extrasByCounterparty.get(counterpartyKey(slot.paymentMethod, slot.supplierId));
    if (extras) out.push(...extras);
  }

  return [...out, ...unmatched];
}

/** One counterparty with every purchase line recorded against it. */
export interface FuelAllocationGroup {
  /** counterpartyKey — `CREDIT:<supplierId>` or `CASH`. */
  key: string;
  rows: FuelAllocationFormRow[];
}

/**
 * Groups allocation rows by counterparty in first-appearance order, so the
 * editor renders one block per place the truck refuelled instead of scattering
 * repeat purchases.
 */
export function groupFuelAllocationRows(rows: FuelAllocationFormRow[]): FuelAllocationGroup[] {
  const groups = new Map<string, FuelAllocationGroup>();
  for (const row of rows) {
    const key = counterpartyKey(row.paymentMethod, row.supplierId);
    const group = groups.get(key);
    if (group) group.rows.push(row);
    else groups.set(key, { key, rows: [row] });
  }
  return [...groups.values()];
}
