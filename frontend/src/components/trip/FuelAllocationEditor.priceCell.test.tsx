import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FuelAllocationEditor } from './FuelAllocationEditor';

const useTripFormContextMock = vi.fn();
const useCatalogsMock = vi.fn();
const useFuelConfigMock = vi.fn();

vi.mock('../../hooks/useTripFormContext', () => ({
  useTripFormContext: () => useTripFormContextMock(),
}));

vi.mock('../../hooks/useCatalogs', () => ({
  useCatalogs: () => useCatalogsMock(),
}));

vi.mock('../../hooks/useQueries', () => ({
  useFuelConfig: () => useFuelConfigMock(),
}));

const suppliers = [
  { id: 10, name: 'Petrolimex Hải Phòng', shortName: 'Petrolimex', status: 'ACTIVE', isFuelSupplier: true },
  { id: 11, name: 'Long Hưng', shortName: 'Long Hưng', status: 'ACTIVE', isFuelSupplier: true },
];

/** Form state as it is when the form opens: nothing has been entered yet. */
const emptyForm = {
  fuelAllocations: [
    { _key: 'fuel-supplier-10', point: 'CUSTOM', enabled: false, supplierId: 10, paymentMethod: 'CREDIT', liters: '', unitPrice: '' },
    { _key: 'fuel-supplier-11', point: 'CUSTOM', enabled: false, supplierId: 11, paymentMethod: 'CREDIT', liters: '', unitPrice: '' },
    { _key: 'fuel-outside', point: 'CUSTOM', enabled: false, supplierId: null, paymentMethod: 'CASH', liters: '', unitPrice: '' },
  ],
  setFuelAllocations: vi.fn(),
  setFuelActualUnitPrice: vi.fn(),
  fuelActualUnitPrice: '',
};

function priceCellTexts(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('.fuel-allocation-price'))
    .map(cell => (cell.textContent ?? '').trim());
}

describe('FuelAllocationEditor price column', () => {
  beforeEach(() => {
    useTripFormContextMock.mockReturnValue(emptyForm);
    useCatalogsMock.mockReturnValue({ data: { suppliers } });
    useFuelConfigMock.mockReturnValue({ data: { unitPrice: '27650' } });
  });

  it('names the configured price in every price cell while no litres are entered', () => {
    const { container } = render(<FuelAllocationEditor />);

    const cells = priceCellTexts(container);
    expect(cells).toHaveLength(3);
    for (const cell of cells) {
      expect(cell).not.toBe('');
      expect(cell).toContain('27.650');
      expect(cell).toContain('đ/lít');
    }
  });

  it('prefers the entered actual price over the configured price', () => {
    useTripFormContextMock.mockReturnValue({ ...emptyForm, fuelActualUnitPrice: '26000' });

    const { container } = render(<FuelAllocationEditor />);

    for (const cell of priceCellTexts(container)) {
      expect(cell).toContain('Theo đơn giá thực tế');
      expect(cell).toContain('26.000');
      expect(cell).not.toContain('27.650');
    }
  });

  it('never leaves the price cell blank when the fuel config is not loaded', () => {
    useFuelConfigMock.mockReturnValue({ data: null });

    const { container } = render(<FuelAllocationEditor />);

    for (const cell of priceCellTexts(container)) {
      expect(cell).toBe('Theo cấu hình hệ thống');
    }
  });

  it('swaps the hint for the pump-price input once litres are entered', () => {
    useTripFormContextMock.mockReturnValue({
      ...emptyForm,
      fuelAllocations: [
        { ...emptyForm.fuelAllocations[0], enabled: true, liters: '60' },
      ],
    });

    const { container } = render(<FuelAllocationEditor />);

    const cell = container.querySelector('.fuel-allocation-price');
    expect(cell?.querySelector('input')).not.toBeNull();
    expect(cell?.textContent).not.toContain('Theo giá cấu hình');
  });
});
