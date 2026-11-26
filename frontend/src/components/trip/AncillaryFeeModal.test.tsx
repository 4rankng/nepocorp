import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AncillaryFeeModal } from './AncillaryFeeModal';
import { EMPTY_FORM } from './ancillary-fees-card-utils';

const baseProps = {
  isOpen: true,
  isEditing: false,
  form: { ...EMPTY_FORM, expenseType: 'CUSTOMS' as const, buyAmount: '400000', sellAmount: '500000' },
  hasMarkup: true,
  submitting: false,
  formError: '',
  catalogTypes: [
    { id: 1, code: 'CUSTOMS', name: 'Phí làm tờ khai hải quan', defaultMarkup: true },
    { id: 2, code: 'LIFTING', name: 'Phí nâng/hạ container', defaultMarkup: false },
  ],
  onClose: vi.fn(),
  onSubmit: vi.fn(),
  onExpenseTypeChange: vi.fn(),
  onBuyAmountChange: vi.fn(),
  onFieldChange: vi.fn(),
};

describe('AncillaryFeeModal', () => {
  it('uses distinct primary CTA labels for add vs edit mode', () => {
    const { rerender } = render(<AncillaryFeeModal {...baseProps} isEditing={false} />);
    expect(screen.getByRole('button', { name: 'Thêm phí' })).toBeTruthy();

    rerender(<AncillaryFeeModal {...baseProps} isEditing={true} />);
    expect(screen.getByRole('button', { name: 'Lưu thay đổi' })).toBeTruthy();
  });

  it('displays live positive margin and negative under-billing warning', () => {
    const { rerender } = render(<AncillaryFeeModal {...baseProps} />);
    expect(screen.getByText(/\+100\.000\s*₫\s*\(\+25%\)/)).toBeTruthy();

    rerender(
      <AncillaryFeeModal
        {...baseProps}
        form={{ ...baseProps.form, buyAmount: '500000', sellAmount: '450000' }}
      />,
    );
    expect(screen.getByText(/-50\.000\s*₫\s*\(-10%\)/)).toBeTruthy();
  });

  it('shows pass-through badge and locks sell amount when hasMarkup is false', () => {
    render(
      <AncillaryFeeModal
        {...baseProps}
        form={{ ...EMPTY_FORM, expenseType: 'LIFTING', buyAmount: '300000', sellAmount: '300000' }}
        hasMarkup={false}
      />,
    );
    expect(screen.getByText('Thu hộ đúng giá gốc')).toBeTruthy();
    expect(screen.getByLabelText(/Báo khách/)).toHaveProperty('disabled', true);
    expect(screen.queryByLabelText(/Số tờ khai hải quan/)).toBeNull();
  });

  it('renders locale-independent DateInput for Ngày hóa đơn', () => {
    render(<AncillaryFeeModal {...baseProps} />);
    expect(screen.getByPlaceholderText('dd/mm/yyyy')).toBeTruthy();
  });
});
