import { cleanup, render } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { DriverContainerCard } from './DriverContainerCard';

vi.mock('../shared/Toast', () => ({
  useToast: () => ({ toast: vi.fn(), dismiss: vi.fn() }),
}));
vi.mock('../../lib/api', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn(), upload: vi.fn() },
  getAuthenticatedPhotoUrl: (url: string) => url,
}));
afterEach(cleanup);

const container = {
  id: 445,
  containerNumber: 'TIIU5311210',
  sealNumber: 'WHLU906529',
  containerTypeId: 4,
  containerTypeName: "20'DC",
  containerTypeCode: '20DC',
  cargoWeightKg: null as string | null,
};

it('labels the container type once — the readable name, not name plus its normalized code', () => {
  const view = render(
    <DriverContainerCard tripId={138} containers={[container]} contPhotoKey={null} sealPhotoKey={null} onSaved={vi.fn()} />,
  );
  expect(view.container.querySelector('.dcc-bento__hero-meta')?.textContent).toBe("20'DC");
  // The normalized code ("20DC") must not appear anywhere: name + code on one
  // line read as the type being printed twice (kanban 101026101530).
  expect(view.container.textContent).not.toContain('20DC');
});

it('falls back to the type code when the catalog row has no readable name', () => {
  const view = render(
    <DriverContainerCard tripId={138} containers={[{ ...container, containerTypeName: null }]} contPhotoKey={null} sealPhotoKey={null} onSaved={vi.fn()} />,
  );
  expect(view.container.querySelector('.dcc-bento__hero-meta')?.textContent).toBe('20DC');
});
