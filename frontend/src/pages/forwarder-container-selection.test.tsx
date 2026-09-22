import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ForwarderContainersSection, type ForwarderContainer } from './forwarder-trip-detail-sections';
afterEach(cleanup);
function mount(containers: ForwarderContainer[]) {
  const select = vi.fn();
  render(<ForwarderContainersSection containers={containers} show={false} setShow={vi.fn()} form={{ containerNumber: '', sealNumber: '', notes: '' }} setForm={vi.fn()} onAdd={vi.fn()} pending={false} selectedContainerId="" onSelectContainer={select} />);
  return select;
}
it('names a container whose number has not been entered yet', () => {
  const select = mount([{ id: 3, containerNumber: null, containerTypeName: "20'DC" }]);
  const row = screen.getByRole('button', { name: /20'DC Chưa nhập số container/ });
  row.focus();
  expect(document.activeElement).toBe(row);
  fireEvent.click(row);
  expect(select).toHaveBeenCalledWith('3');
});
it('preserves the identifying number and seal for completed entries', () => {
  mount([{ id: 4, containerNumber: 'MSKU1234567', containerTypeName: "40'DC", sealNumber: 'S123' }]);
  expect(screen.getByRole('button', { name: /MSKU1234567 Seal: S123/ })).toBeTruthy();
  expect(screen.queryByText('Chưa nhập số container')).toBeNull();
});
