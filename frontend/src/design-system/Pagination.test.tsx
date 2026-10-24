import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Pagination } from './Pagination';

describe('Pagination', () => {
  it('renders nothing when totalPages <= 1 and no summary', () => {
    const { container } = render(
      <Pagination page={1} totalPages={1} onChange={() => {}} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders the page buttons when totalPages > 1', () => {
    const { getByText, getAllByRole } = render(
      <Pagination page={2} totalPages={5} onChange={() => {}} />,
    );
    expect(getByText('1')).toBeTruthy();
    expect(getByText('5')).toBeTruthy();
    const buttons = getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(7); // ‹ 1 2 3 4 5 ›
  });

  it('renders summary when totalItems + pageSize are provided', () => {
    const { container } = render(
      <Pagination page={1} totalPages={2} totalItems={50} pageSize={25} onChange={() => {}} />,
    );
    expect(container.textContent).toContain('Hiển thị');
  });

  // NEPO-16: with at most one page the controls are dead weight — the count
  // line must be the only thing left, on both modes.
  it('hides prev/next/page buttons and the size selector when totalPages <= 1, keeping the count line', () => {
    const { container } = render(
      <Pagination
        page={1}
        totalPages={1}
        totalItems={7}
        pageSize={25}
        onPageSizeChange={() => {}}
        onChange={() => {}}
        summary={<span>Hiển thị <b>7</b>/<b>7</b> khách hàng</span>}
      />,
    );
    expect(container.querySelector('.ds-pagination__controls')).toBeNull();
    expect(container.querySelector('.ds-pagination__btn')).toBeNull();
    expect(container.querySelector('select')).toBeNull();
    expect(container.textContent).toContain('Hiển thị');
    expect(container.textContent).toContain('khách hàng');
  });

  it('hides the infinite controls (sentinel, end pill) when totalPages <= 1', () => {
    const { container } = render(
      <Pagination
        mode="infinite"
        page={1}
        totalPages={1}
        totalItems={3}
        pageSize={10}
        onChange={() => {}}
        hasMore={false}
        summary={<span>Hiển thị <b>3</b>/<b>3</b> dòng</span>}
      />,
    );
    expect(container.querySelector('.ds-pagination__controls')).toBeNull();
    expect(container.querySelector('.ds-pagination__sentinel')).toBeNull();
    expect(container.querySelector('.ds-pagination__end')).toBeNull();
    expect(container.textContent).toContain('3/3');
  });
});
