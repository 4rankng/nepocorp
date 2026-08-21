import React, { useEffect, useMemo } from 'react';
import type { Supplier } from '@tingting/shared';
import { useCatalogs } from '../../hooks/useCatalogs';
import type { CatalogData } from '../../api/tripClient';
import { useTripFormContext } from '../../hooks/useTripFormContext';
import { createDefaultFuelAllocations, type FuelAllocationFormRow } from '../../hooks/useTripFormState';
import './FuelAllocationEditor.css';

function sameRows(left: FuelAllocationFormRow[], right: FuelAllocationFormRow[]): boolean {
  return left.length === right.length && left.every((row, index) => {
    const candidate = right[index];
    return row._key === candidate._key
      && row.point === candidate.point
      && row.enabled === candidate.enabled
      && row.supplierId === candidate.supplierId
      && row.paymentMethod === candidate.paymentMethod
      && row.liters === candidate.liters;
  });
}

/** Fuel allocation is an operational workflow, so prefer a configured short label. */
export function fuelSupplierLabel(supplier: Pick<Supplier, 'name' | 'shortName'> | undefined): string {
  return supplier?.shortName ?? supplier?.name ?? 'Nhà cung cấp đã lưu';
}

/**
 * The database catalog is the authority for the fuel-allocation rows. An
 * inactive supplier is retained only when it was already saved on an old trip
 * (handled by normalizeFuelAllocationRows), never offered for new allocation.
 */
export function activeFuelSuppliers(
  suppliers: CatalogData['suppliers'] | undefined,
): CatalogData['suppliers'] {
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
  suppliers: Supplier[],
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

export function FuelAllocationEditor() {
  const form = useTripFormContext();
  const { data: catalogData } = useCatalogs();
  const fuelSuppliers = useMemo(
    () => activeFuelSuppliers(catalogData?.suppliers) as Supplier[],
    [catalogData?.suppliers],
  );

  // The catalog may refresh after the initial form state; normalize again so
  // its active fuel suppliers become available without altering saved rows.
  useEffect(() => {
    form.setFuelAllocations((previous) => {
      const next = normalizeFuelAllocationRows(previous, fuelSuppliers);
      return sameRows(previous, next) ? previous : next;
    });
  }, [form.setFuelAllocations, fuelSuppliers]);

  const allocatedLiters = form.fuelAllocations.reduce(
    (total, allocation) => total + (Number(allocation.liters) || 0),
    0,
  );

  const setRow = (key: string, update: Partial<FuelAllocationFormRow>) => {
    form.setFuelAllocations(previous => previous.map(row => (
      row._key === key ? { ...row, ...update } : row
    )));
  };

  const setLiters = (key: string, liters: string) => {
    setRow(key, { liters, enabled: (Number(liters) || 0) > 0 });
  };

  return (
    <div className="fuel-allocation-editor">
      <div className="fuel-allocation-heading">
        <div>
          <label>Phân bổ nơi đổ dầu</label>
          <p className="tc-field-hint">
            Nhập số lít tại nơi đã đổ. Để trống nơi không đổ; Cây dầu ngoài là tiền mặt, không phát sinh công nợ.
          </p>
        </div>
        <div className="fuel-allocation-total" aria-live="polite">
          <span>Đã phân bổ</span>
          <strong>{allocatedLiters.toLocaleString('vi-VN')} lít</strong>
        </div>
      </div>

      <div className="fuel-allocation-list" role="table" aria-label="Phân bổ nơi đổ dầu">
        <div className="fuel-allocation-row fuel-allocation-row--head" role="row">
          <span role="columnheader">Nơi đổ dầu</span>
          <span role="columnheader" className="fuel-allocation-column-liters">Số lít</span>
        </div>
        {form.fuelAllocations.map((allocation) => {
          const supplier = allocation.supplierId == null
            ? undefined
            : fuelSuppliers.find(item => item.id === allocation.supplierId);
          const isCreditPointWithoutSupplier = allocation.paymentMethod === 'CREDIT' && allocation.supplierId === null;
          const pointLabel = allocation.paymentMethod === 'CASH'
            ? 'Cây dầu ngoài'
            : fuelSupplierLabel(supplier);

          return (
            <div className="fuel-allocation-row" key={allocation._key} role="row">
              <div className="fuel-allocation-point" role="cell">
                <span className="fuel-allocation-label">{pointLabel}</span>
                {isCreditPointWithoutSupplier ? (
                  <p className="fuel-allocation-warning">Nhà cung cấp nơi đổ đã không còn hoạt động trong Danh mục.</p>
                ) : null}
              </div>

              <div className="fuel-allocation-liters" role="cell">
                <div className="fuel-allocation-input">
                <input
                  id={`fuel-allocation-liters-${allocation._key}`}
                  className="input"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  placeholder="0"
                  aria-label={`Số lít tại ${pointLabel}`}
                  disabled={isCreditPointWithoutSupplier}
                  value={allocation.liters}
                  onChange={event => setLiters(allocation._key, event.target.value)}
                />
                  <span aria-hidden="true">lít</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
