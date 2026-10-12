import type { ComponentProps } from 'react';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ExpenseDetailFields } from './expenseDetailFields';

const baseProps: ComponentProps<typeof ExpenseDetailFields> = {
  expenseType: 'TRAILER',
  onExpenseTypeChange: vi.fn(),
  truckId: '',
  onTruckIdChange: vi.fn(),
  trucks: [],
  trailers: [],
  amount: '',
  onAmountChange: vi.fn(),
  showValidityFields: false,
  validFrom: '',
  onValidFromChange: vi.fn(),
  validTo: '',
  onValidToChange: vi.fn(),
  receiptId: '',
  onReceiptIdChange: vi.fn(),
  note: '',
  onNoteChange: vi.fn(),
  errors: {},
};

describe('ExpenseDetailFields rơ-moóc dropdown', () => {
  /**
   * Staff pick the trailer from these rows and had no way to see which tractor
   * holds it, so the right rơ-moóc was hard to tell apart (kanban
   * 091026010130). Same secondary info as the fleet truck dialog.
   */
  it('labels each rơ-moóc option with the paired tractor and falls back for unpaired trailers', () => {
    render(
      <ExpenseDetailFields
        {...baseProps}
        trucks={[{ id: 3, licensePlate: '15C-139.82', currentTrailerId: 1 }]}
        trailers={[
          { id: 1, licensePlate: '15R-070.51' },
          { id: 2, licensePlate: '15R-050.37' },
        ]}
      />,
    );

    const options = within(screen.getByLabelText(/Biển số rơ-moóc/))
      .getAllByRole('option')
      .map(o => o.textContent);

    expect(options[1]).toContain('15R-070.51');
    expect(options[1]).toContain('đang ghép 15C-139.82');
    expect(options[2]).toContain('15R-050.37');
    expect(options[2]).toContain('trống');
  });
});
