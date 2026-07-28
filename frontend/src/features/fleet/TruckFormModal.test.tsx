import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TruckFormModal } from './TruckFormModal';

describe('TruckFormModal', () => {
  it('keeps vehicle identity editing separate from canonical schedules', () => {
    render(
      <TruckFormModal
        saving={false}
        trailers={[]}
        onsave={vi.fn()}
        oncancel={vi.fn()}
        isOpen
      />,
    );

    expect(screen.getByLabelText('Biển số xe đầu kéo *')).toBeTruthy();
    expect(screen.queryByText('Mốc nhắc việc')).toBeNull();
    expect(screen.queryByLabelText('Hạn đăng kiểm')).toBeNull();
    expect(screen.queryByLabelText('Hạn bảo hiểm')).toBeNull();
    expect(screen.queryByLabelText('Thay dầu kế tiếp')).toBeNull();
  });
});
