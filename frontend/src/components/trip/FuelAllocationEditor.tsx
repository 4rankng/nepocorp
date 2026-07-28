import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { Supplier } from '@tingting/shared';
import { useCatalogs } from '../../hooks/useCatalogs';
import { useTripFormContext } from '../../hooks/useTripFormContext';
import './FuelAllocationEditor.css';

const CASH_OPTION = 'CASH';

export function FuelAllocationEditor() {
  const form = useTripFormContext();
  const { data: catalogData } = useCatalogs();
  const fuelSuppliers = catalogData?.suppliers?.filter(
    supplier => (supplier as Supplier).isFuelSupplier,
  ) ?? [];
  const allocatedLiters = form.fuelAllocations.reduce(
    (total, allocation) => total + (Number(allocation.liters) || 0),
    0,
  );

  const addAllocation = () => {
    form.setFuelAllocations(previous => [
      ...previous,
      {
        _key: `fuel-${Date.now()}-${previous.length}`,
        supplierId: null,
        paymentMethod: 'CREDIT',
        liters: '',
      },
    ]);
  };

  return (
    <div className="fuel-allocation-editor">
      <div className="fuel-allocation-heading">
        <div>
          <label>Phân bổ nơi đổ dầu</label>
          <p className="tc-field-hint">
            Tách số lít theo từng nơi đổ. Dòng tiền mặt không phát sinh công nợ.
          </p>
        </div>
        <button className="btn btn--secondary btn--sm" type="button" onClick={addAllocation}>
          <Plus size={15} />
          Thêm điểm đổ
        </button>
      </div>

      {form.fuelAllocations.length === 0 ? (
        <button className="fuel-allocation-empty" type="button" onClick={addAllocation}>
          Chưa phân bổ nơi đổ dầu. Nhấn để thêm dòng đầu tiên.
        </button>
      ) : (
        <div className="fuel-allocation-list">
          {form.fuelAllocations.map((allocation, index) => {
            const selectValue = allocation.paymentMethod === 'CASH'
              ? CASH_OPTION
              : (allocation.supplierId ?? '');
            return (
              <div className="fuel-allocation-row" key={allocation._key}>
                <div className="field">
                  <label htmlFor={`fuel-allocation-supplier-${allocation._key}`}>
                    Nơi đổ #{index + 1}
                  </label>
                  <select
                    id={`fuel-allocation-supplier-${allocation._key}`}
                    className="input"
                    value={selectValue}
                    onChange={event => {
                      const value = event.target.value;
                      form.setFuelAllocations(previous => previous.map(row =>
                        row._key === allocation._key
                          ? {
                              ...row,
                              paymentMethod: value === CASH_OPTION ? 'CASH' : 'CREDIT',
                              supplierId: value && value !== CASH_OPTION ? Number(value) : null,
                            }
                          : row,
                      ));
                    }}
                  >
                    <option value="">-- Chọn nhà cung cấp --</option>
                    {fuelSuppliers.map(supplier => (
                      <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                    ))}
                    <option value={CASH_OPTION}>Cây dầu ngoài (tiền mặt)</option>
                  </select>
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
                    value={allocation.liters}
                    onChange={event => {
                      const value = event.target.value;
                      form.setFuelAllocations(previous => previous.map(row =>
                        row._key === allocation._key ? { ...row, liters: value } : row,
                      ));
                    }}
                  />
                </div>

                <button
                  className="fuel-allocation-remove"
                  type="button"
                  aria-label={`Xóa nơi đổ số ${index + 1}`}
                  onClick={() => form.setFuelAllocations(previous =>
                    previous.filter(row => row._key !== allocation._key),
                  )}
                >
                  <Trash2 size={17} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {form.fuelAllocations.length > 0 && (
        <div className="fuel-allocation-total" aria-live="polite">
          Đã phân bổ: <strong>{allocatedLiters.toLocaleString('vi-VN')} lít</strong>
        </div>
      )}
    </div>
  );
}
