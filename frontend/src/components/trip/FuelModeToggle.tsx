import React from 'react';
import './FuelModeToggle.css';
import { Layers, Pencil } from 'lucide-react';
import { FuelMode } from '@tingting/shared';

interface FuelModeToggleProps {
  value: FuelMode;
  onChange: (v: FuelMode) => void;
}

export function FuelModeToggle({ value, onChange }: FuelModeToggleProps) {
  return (
    <div className="tc-fuel-mode">
      <input type="radio" name="fuelmode" id="fuel-auto" checked={value === FuelMode.AUTO} onChange={() => onChange(FuelMode.AUTO)} />
      <label htmlFor="fuel-auto" title="Tự động: định mức dầu × Km từng chặng"><Layers size={14} /> Tự động</label>
      <input type="radio" name="fuelmode" id="fuel-manual" checked={value === FuelMode.FLAT_RATE} onChange={() => onChange(FuelMode.FLAT_RATE)} />
      <label htmlFor="fuel-manual" title="Nhập tay số lít dầu"><Pencil size={14} /> Thủ công</label>
    </div>
  );
}
