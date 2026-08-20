import React, { useEffect, useMemo } from 'react';
import type { Supplier } from '@tingting/shared';
import { useCatalogs } from '../../hooks/useCatalogs';
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
      if (row.enabled) remaining.push(row);
      continue;
    }

    const liters = (Number(target.liters) || 0) + (row.enabled ? Number(row.liters) || 0 : 0);
    target.enabled ||= row.enabled;
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
  const fuelSuppliers = useMemo(() => (
    catalogData?.suppliers?.filter(supplier => (supplier as Supplier).isFuelSupplier) ?? []
  ) as Supplier[], [catalogData?.suppliers]);

  // The catalog may refresh after the initial form state; normalize again so
  // its active fuel suppliers become available without altering saved rows.
  useEffect(() => {
    form.setFuelAllocations((previous) => {
      const next = normalizeFuelAllocationRows(previous, fuelSuppliers);
      return sameRows(previous, next) ? previous : next;
    });
  }, [form.setFuelAllocations, fuelSuppliers]);

  const allocatedLiters = form.fuelAllocations.reduce(
    (total, allocation) => allocation.enabled ? total + (Number(allocation.liters) || 0) : total,
    0,
  );

  const setRow = (key: string, update: Partial<FuelAllocationFormRow>) => {
    form.setFuelAllocations(previous => previous.map(row => (
      row._key === key ? { ...row, ...update } : row
    )));
  };

  return (
    <div className="fuel-allocation-editor">
      <div className="fuel-allocation-heading">
        <div>
          <label>Phân bổ nơi đổ dầu</label>
          <p className="tc-field-hint">
            Tích nơi đã đổ rồi nhập số lít. Cây ngoài là tiền mặt, không phát sinh công nợ.
          </p>
        </div>
      </div>

      <div className="fuel-allocation-list">
        {form.fuelAllocations.map((allocation) => {
          const supplier = allocation.supplierId == null
            ? undefined
            : fuelSuppliers.find(item => item.id === allocation.supplierId);
          const isCreditPointWithoutSupplier = allocation.paymentMethod === 'CREDIT' && allocation.supplierId === null;
          const inputDisabled = !allocation.enabled || isCreditPointWithoutSupplier;
          const pointLabel = allocation.paymentMethod === 'CASH'
            ? 'Cây dầu ngoài'
            : supplier?.name ?? 'Nhà cung cấp đã lưu';

          return (
            <div className="fuel-allocation-row" key={allocation._key}>
              <div className="fuel-allocation-point">
                <label className="fuel-allocation-check" htmlFor={`fuel-allocation-enabled-${allocation._key}`}>
                  <input
                    id={`fuel-allocation-enabled-${allocation._key}`}
                    type="checkbox"
                    checked={allocation.enabled}
                    disabled={Boolean(isCreditPointWithoutSupplier)}
                    onChange={(event) => setRow(allocation._key, { enabled: event.target.checked })}
                  />
                  <span>{pointLabel}</span>
                </label>
                {isCreditPointWithoutSupplier ? (
                  <p className="fuel-allocation-warning">Nhà cung cấp nơi đổ đã không còn hoạt động trong Danh mục.</p>
                ) : null}
              </div>

              <div className="field">
                <label htmlFor={`fuel-allocation-liters-${allocation._key}`}>Số lít</label>
                <input
                  id={`fuel-allocation-liters-${allocation._key}`}
                  className="input"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  placeholder="VD: 200"
                  disabled={inputDisabled}
                  value={allocation.liters}
                  onChange={event => setRow(allocation._key, { liters: event.target.value })}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="fuel-allocation-total" aria-live="polite">
        Đã phân bổ: <strong>{allocatedLiters.toLocaleString('vi-VN')} lít</strong>
      </div>
    </div>
  );
}
