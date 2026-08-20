import React, { useEffect, useMemo } from 'react';
import type { Supplier } from '@tingting/shared';
import { useCatalogs } from '../../hooks/useCatalogs';
import { useTripFormContext } from '../../hooks/useTripFormContext';
import { createDefaultFuelAllocations, type FuelAllocationFormRow } from '../../hooks/useTripFormState';
import './FuelAllocationEditor.css';

const POINT_COPY = {
  PETRO: { label: 'Petro', paymentMethod: 'CREDIT' },
  LONG_HUNG: { label: 'Long Hưng', paymentMethod: 'CREDIT' },
  OUTSIDE: { label: 'Cây ngoài', paymentMethod: 'CASH' },
} as const;

function normalizeSupplierName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function findSupplierForPoint(point: FuelAllocationFormRow['point'], suppliers: Supplier[]): Supplier | undefined {
  const match = point === 'PETRO'
    ? ['petro', 'petrolimex']
    : point === 'LONG_HUNG'
      ? ['longhung']
      : [];
  return suppliers.find((supplier) => {
    const normalizedName = normalizeSupplierName(supplier.name);
    return match.some((keyword) => normalizedName.includes(keyword));
  });
}

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
 * Existing trips stored only supplier/payment data, while the new editor has
 * three stable accounting points. Match legacy rows to those points when the
 * supplier catalog identifies them; preserve any unrecognised legacy row so a
 * later save can never discard fuel already recorded.
 */
export function normalizeFuelAllocationRows(
  rows: FuelAllocationFormRow[],
  suppliers: Supplier[],
): FuelAllocationFormRow[] {
  const standardRows = createDefaultFuelAllocations().map((row) => {
    const supplier = findSupplierForPoint(row.point, suppliers);
    return supplier ? { ...row, supplierId: supplier.id } : row;
  });
  const standardByPoint = new Map(standardRows.map(row => [row.point, row]));
  const remaining: FuelAllocationFormRow[] = [];

  for (const row of rows) {
    const matchedPoint = row.point === 'CUSTOM'
      ? row.paymentMethod === 'CASH'
        ? 'OUTSIDE'
        : standardRows.find(standard => standard.supplierId === row.supplierId)?.point
      : row.point;
    const target = matchedPoint ? standardByPoint.get(matchedPoint) : undefined;

    if (!target) {
      remaining.push(row);
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

  // Standard credit points identify their configured supplier automatically.
  // This keeps the three accounting rows deterministic without storing a
  // deployment-specific supplier ID in frontend code, including for old trips
  // whose saved allocations predate the point-based UI.
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
          const point = allocation.point === 'CUSTOM' ? null : POINT_COPY[allocation.point];
          const isCreditPointWithoutSupplier = point?.paymentMethod === 'CREDIT' && allocation.supplierId === null;
          const inputDisabled = !allocation.enabled || Boolean(isCreditPointWithoutSupplier);

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
                  <span>{point?.label ?? 'Nơi đổ đã lưu'}</span>
                </label>
                {allocation.point === 'CUSTOM' ? (
                  <select
                    className="input"
                    aria-label="Nhà cung cấp nơi đổ đã lưu"
                    value={allocation.paymentMethod === 'CASH' ? 'CASH' : (allocation.supplierId ?? '')}
                    onChange={(event) => {
                      const value = event.target.value;
                      setRow(allocation._key, {
                        paymentMethod: value === 'CASH' ? 'CASH' : 'CREDIT',
                        supplierId: value && value !== 'CASH' ? Number(value) : null,
                      });
                    }}
                  >
                    <option value="">-- Chọn nhà cung cấp --</option>
                    {fuelSuppliers.map(supplier => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
                    <option value="CASH">Cây dầu ngoài (tiền mặt)</option>
                  </select>
                ) : isCreditPointWithoutSupplier ? (
                  <p className="fuel-allocation-warning">Chưa tìm thấy nhà cung cấp {point?.label} trong Danh mục.</p>
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
