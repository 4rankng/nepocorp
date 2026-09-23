import React, { useEffect, useMemo } from 'react';
import { Plus, X } from 'lucide-react';
import type { Supplier } from '@tingting/shared';
import { useCatalogs } from '../../hooks/useCatalogs';
import { useFuelConfig } from '../../hooks/useQueries';
import { useTripFormContext } from '../../hooks/useTripFormContext';
import { Money } from '../shared/Money';
import { formatCurrency } from '../../lib/format';
import { normalizeFuelAllocationRows, fuelSupplierLabel, activeFuelSuppliers, isStandardFuelRowKey, groupFuelAllocationRows } from './fuelAllocationRows';
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
      && row.liters === candidate.liters
      && row.unitPrice === candidate.unitPrice;
  });
}

export function FuelAllocationEditor() {
  const form = useTripFormContext();
  const { data: catalogData } = useCatalogs();
  const { data: fuelConfig } = useFuelConfig();
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

  // A row without its own pump price is priced at the trip's effective price —
  // the entered actual price when present, otherwise the configured one (same
  // `actual ?? config` precedence the ledger and computeTripTotals apply). The
  // price cell must never render blank, so rows still waiting for their litres
  // show which price will be applied instead of an empty column.
  const configuredUnitPrice = Number(fuelConfig?.unitPrice) || 0;
  const actualUnitPrice = Number(form.fuelActualUnitPrice) || 0;
  const defaultUnitPrice = actualUnitPrice > 0 ? actualUnitPrice : configuredUnitPrice;
  const defaultUnitPriceSource = actualUnitPrice > 0 ? 'Theo đơn giá thực tế' : 'Theo giá cấu hình';

  const setRow = (key: string, update: Partial<FuelAllocationFormRow>) => {
    form.setFuelAllocations(previous => previous.map(row => (
      row._key === key ? { ...row, ...update } : row
    )));
  };

  const setLiters = (key: string, liters: string) => {
    setRow(key, { liters, enabled: (Number(liters) || 0) > 0 });
  };

  const setUnitPrice = (key: string, unitPrice: string) => {
    setRow(key, { unitPrice });
  };

  // "Thêm lần đổ" — a trip may refuel the same counterparty several times at
  // different pump prices, so a purchase row can be duplicated. New rows key
  // as extra-<n> (session-local uniqueness).
  const addExtraRow = (source: FuelAllocationFormRow) => {
    let maxExtra = 0;
    for (const r of form.fuelAllocations) {
      const m = /^extra-(\d+)$/.exec(r._key);
      if (m) maxExtra = Math.max(maxExtra, Number(m[1]));
    }
    const key = `extra-${maxExtra + 1}`;
    const extra: FuelAllocationFormRow = {
      _key: key,
      point: source.point,
      enabled: false,
      supplierId: source.supplierId,
      paymentMethod: source.paymentMethod,
      liters: '',
      unitPrice: '',
    };
    const idx = form.fuelAllocations.findIndex(r => r._key === source._key);
    const next = [...form.fuelAllocations];
    next.splice(idx + 1, 0, extra);
    form.setFuelAllocations(next);
  };

  const removeExtraRow = (key: string) => {
    form.setFuelAllocations(form.fuelAllocations.filter(r => r._key !== key));
  };

  // Rows of one counterparty form one group: its label and subtotal sit on the
  // group's first line, repeat purchases follow with a "↳ lần N" marker, and the
  // group carries a single "+" so a new purchase lands inside its own group.
  const lineInfo = new Map<string, { index: number; size: number; inUse: boolean; liters: number }>();
  for (const group of groupFuelAllocationRows(form.fuelAllocations)) {
    const inUse = group.rows.some(entry => entry.enabled || (Number(entry.liters) || 0) > 0);
    const liters = group.rows.reduce((total, entry) => total + (Number(entry.liters) || 0), 0);
    group.rows.forEach((entry, index) => {
      lineInfo.set(entry._key, { index, size: group.rows.length, inUse, liters });
    });
  }

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
          <span role="columnheader" className="fuel-allocation-column-price">Đơn giá (đ/lít)</span>
          <span role="columnheader" aria-hidden="true" />
        </div>
        {form.fuelAllocations.map((allocation) => {
          const info = lineInfo.get(allocation._key) ?? { index: 0, size: 1, inUse: false, liters: 0 };
          const isContinuation = info.index > 0;
          const supplier = allocation.supplierId == null
            ? undefined
            : fuelSuppliers.find(item => item.id === allocation.supplierId);
          const isCreditPointWithoutSupplier = allocation.paymentMethod === 'CREDIT' && allocation.supplierId === null;
          const pointLabel = allocation.paymentMethod === 'CASH'
            ? 'Cây dầu ngoài'
            : fuelSupplierLabel(supplier);

          return (
            <div
              className={`fuel-allocation-row${isContinuation ? ' fuel-allocation-row--continuation' : ''}`}
              key={allocation._key}
              role="row"
              aria-label={info.size > 1 ? `${pointLabel} — lần ${info.index + 1}/${info.size}` : undefined}
            >
              <div className="fuel-allocation-point" role="cell">
                {isContinuation ? (
                  <span className="fuel-allocation-continuation">↳ lần {info.index + 1}</span>
                ) : (
                  <>
                    <span className="fuel-allocation-label">{pointLabel}</span>
                    {info.size > 1 ? (
                      <span className="fuel-allocation-group-meta">
                        {info.size} lần đổ · {info.liters.toLocaleString('vi-VN')} lít
                      </span>
                    ) : null}
                    {isCreditPointWithoutSupplier ? (
                      <p className="fuel-allocation-warning">Nhà cung cấp nơi đổ đã không còn hoạt động trong Danh mục.</p>
                    ) : null}
                  </>
                )}
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

              <div className="fuel-allocation-price" role="cell">
                {allocation.enabled ? (
                  <div className="fuel-allocation-input">
                    <input
                      id={`fuel-allocation-price-${allocation._key}`}
                      className="input"
                      type="number"
                      inputMode="numeric"
                      min="0"
                      max="1000000000"
                      step="1"
                      placeholder="Giá chuyến"
                      aria-label={`Đơn giá tại ${pointLabel}`}
                      disabled={isCreditPointWithoutSupplier}
                      value={allocation.unitPrice ?? ''}
                      onChange={event => setUnitPrice(allocation._key, event.target.value)}
                    />
                    <span aria-hidden="true">đ</span>
                  </div>
                ) : (
                  <p
                    className="tc-field-hint fuel-allocation-price-default"
                    title={defaultUnitPrice > 0
                      ? `${defaultUnitPriceSource} ${formatCurrency(defaultUnitPrice)}/lít`
                      : 'Theo cấu hình hệ thống'}
                  >
                    {defaultUnitPrice > 0 ? (
                      <>
                        {/* Price on its own line: the column is ~176px wide and the
                            full sentence used to wrap mid-phrase (kanban 20260921_23). */}
                        <span className="fuel-allocation-price-default__value">
                          <Money value={defaultUnitPrice} noUnit /> đ/lít
                        </span>
                        <span className="fuel-allocation-price-default__source">{defaultUnitPriceSource}</span>
                      </>
                    ) : 'Theo cấu hình hệ thống'}
                  </p>
                )}
              </div>

              <div className="fuel-allocation-actions" role="cell">
                {info.index === info.size - 1 && info.inUse ? (
                  <button
                    type="button"
                    className="btn btn--ghost btn--icon btn--sm fuel-allocation-add"
                    aria-label={`Thêm lần đổ tại ${pointLabel}`}
                    title={form.fuelAllocations.length >= 10 ? 'Tối đa 10 lần đổ mỗi chuyến' : `Thêm lần đổ tại ${pointLabel}`}
                    disabled={form.fuelAllocations.length >= 10}
                    onClick={() => addExtraRow(allocation)}
                  >
                    <Plus size={18} />
                  </button>
                ) : null}
                {!isStandardFuelRowKey(allocation._key) ? (
                  <button
                    type="button"
                    className="btn btn--ghost btn--icon btn--sm fuel-allocation-remove"
                    aria-label={`Xóa lần đổ tại ${pointLabel}`}
                    title={`Xóa lần đổ tại ${pointLabel}`}
                    onClick={() => removeExtraRow(allocation._key)}
                  >
                    <X size={18} />
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
