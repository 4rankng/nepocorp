import { describe, expect, it } from 'vitest';
import { APP_VERSION } from '@tingting/shared';
import { appVersionLabel } from './app-version';

describe('appVersionLabel', () => {
  it('prints the shared product version', () => {
    expect(appVersionLabel()).toBe(`Phiên bản ${APP_VERSION}`);
  });

  it('keeps the version the single source - no per-build suffix', () => {
    // One product = one version. A commit stamp here would mean the UI reports a
    // different number than the API for the same release.
    expect(appVersionLabel('v1.12.1')).toBe('Phiên bản v1.12.1');
  });
});
