import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * The version line renders in the app shell — including trees with no query
 * provider — so it must not depend on one. It also has to stay silent until the
 * API answers, then speak up only when the API runs a different build.
 */

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

/**
 * `await import()` is deliberate here: the hook caches its single API request in
 * a module-level promise, so each case must load a FRESH module instance to
 * observe its own stubbed response — a static import would share the first
 * case's cache and make the other two meaningless.
 */
async function renderWithApiBuild(build: string | null) {
  vi.doMock('../../lib/api', () => ({
    api: { get: vi.fn().mockResolvedValue(build === null ? {} : { version: 'v1.2.0', build }) },
  }));
  const { AppVersion } = await import('./AppVersion');
  render(<AppVersion />);
}

describe('AppVersion', () => {
  it('shows the single app version with no query provider in the tree', async () => {
    await renderWithApiBuild('test-sha');
    expect(screen.getByText(/Phiên bản v1\.2\.0/)).toBeTruthy();
  });

  it('warns when the API reports a different build', async () => {
    await renderWithApiBuild('deadbeef');
    await waitFor(() => expect(screen.getByText(/API đang chạy bản deadbeef/)).toBeTruthy());
  });

  it('stays quiet when the API build is unknown', async () => {
    await renderWithApiBuild(null);
    expect(screen.getByText(/Phiên bản v1\.2\.0/)).toBeTruthy();
    expect(screen.queryByText(/API đang chạy bản/)).toBeNull();
  });
});
