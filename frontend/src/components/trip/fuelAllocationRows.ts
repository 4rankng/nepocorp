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
 * Fuel allocation rows are derived from the active fuel-supplier catalog so
 * every available supplier is immediately usable. Keep selected legacy rows
 * that no longer appear in the catalog so saving an old trip never discards
 * recorded fuel.
 */
export function normalizeFuelAllocationRows(
  rows: FuelAllocationFormRow[],
  suppliers: CatalogSuppliers,
): FuelAllocationFormRow[] {
  const standardRows = [
    ...suppliers.map((supplier): FuelAllocationFormRow => ({
      _key: `fuel-supplier-${supplier.id}`,
      point: 'CUSTOM',
      enabled: false,
      supplierId: supplier.id,
      paymentMethod: 'CREDIT',
      liters: '',
    })),
    ...createDefaultFuelAllocations(),
  ];
  const standardByCounterparty = new Map(standardRows.map(row => [
    row.paymentMethod === 'CASH' ? 'CASH' : `CREDIT:${row.supplierId}`,
    row,
  ]));
  const remaining: FuelAllocationFormRow[] = [];

  for (const row of rows) {
    const target = standardByCounterparty.get(
      row.paymentMethod === 'CASH' ? 'CASH' : `CREDIT:${row.supplierId}`,
    );

    if (!target) {
      if (row.enabled || (Number(row.liters) || 0) > 0) remaining.push(row);
      continue;
    }

    const liters = (Number(target.liters) || 0) + (Number(row.liters) || 0);
    target.enabled ||= (Number(row.liters) || 0) > 0;
    target.liters = liters > 0 ? String(liters) : '';
    if (target.paymentMethod === 'CREDIT' && row.supplierId !== null) {
      target.supplierId = row.supplierId;
    }
  }

  return [...standardRows, ...remaining];
}
