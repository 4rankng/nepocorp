import React from 'react';
import { Layers, Pencil } from 'lucide-react';
import type { FuelMode } from '../../hooks/useTripForm';

interface FuelModeToggleProps {
  value: FuelMode;
  onChange: (v: FuelMode) => void;
}

export function FuelModeToggle({ value, onChange }: FuelModeToggleProps) {
  return (
    <div className="tc-fuel-mode">
      <input type="radio" name="fuelmode" id="fuel-auto" checked={value === 'AUTO'} onChange={() => onChange('AUTO')} />
      <label htmlFor="fuel-auto"><Layers size={14} /> Tự động (Định mức × Km chặng)</label>
      <input type="radio" name="fuelmode" id="fuel-manual" checked={value === 'FLAT_RATE'} onChange={() => onChange('FLAT_RATE')} />
      <label htmlFor="fuel-manual"><Pencil size={14} /> Thủ công</label>
    </div>
  );
}
