import React, { useEffect, useMemo } from 'react';
import type { Supplier } from '@tingting/shared';
import { useCatalogs } from '../../hooks/useCatalogs';
import { useTripFormContext } from '../../hooks/useTripFormContext';
import { normalizeFuelAllocationRows, fuelSupplierLabel, activeFuelSuppliers } from './fuelAllocationRows';
import type { FuelAllocationFormRow } from '../../hooks/useTripFormState';
import './FuelAllocationEditor.css';

// The pure row helpers live in ./fuelAllocationRows so state hooks (which
// cannot import from a component module) share the exact same logic.
export { normalizeFuelAllocationRows, fuelSupplierLabel, activeFuelSuppliers } from './fuelAllocationRows';

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

export function FuelAllocationEditor() {
  const form = useTripFormContext();
  const { data: catalogData } = useCatalogs();
  const fuelSuppliers = useMemo(
    () => activeFuelSuppliers(catalogData?.suppliers) as Supplier[],
    [catalogData?.suppliers],
  );

  // The catalog may refresh after the initial form state; normalize again so
  // its active fuel suppliers become available without altering saved rows.
  // The row keys are part of the trigger: reseeding the form (trip load,
  // navigation between two trips) replaces the rows with saved-only entries,
  // and without re-normalizing the catalog points would silently disappear.
  const rowKeys = form.fuelAllocations.map(row => row._key).join(',');
  useEffect(() => {
    form.setFuelAllocations((previous) => {
      const next = normalizeFuelAllocationRows(previous, fuelSuppliers);
      return sameRows(previous, next) ? previous : next;
    });
  }, [form.setFuelAllocations, fuelSuppliers, rowKeys]);

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
