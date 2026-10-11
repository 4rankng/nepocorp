import { describe, expect, it } from 'vitest';
import { appVersionLine, appVersionShort } from './app-version';

/**
 * One product, one version: the API and the web bundle share APP_VERSION, so the
 * only thing the line has to react to is an API running a different BUILD.
 */
describe('appVersionLine', () => {
  it('shows the single app version when both sides carry the same build', () => {
    const line = appVersionLine({ version: 'v1.2.0', build: '6426570a', apiBuild: '6426570a' });
    expect(line.text).toBe('Phiên bản v1.2.0');
    expect(line.apiBehind).toBe(false);
    expect(line.title).toBe('Bản dựng web 6426570a · API 6426570a');
  });

  it('flags an API that lags behind the web bundle', () => {
    const line = appVersionLine({ version: 'v1.2.0', build: '6426570a', apiBuild: '14f9c59a' });
    expect(line.apiBehind).toBe(true);
    expect(line.text).toBe('Phiên bản v1.2.0 · API đang chạy bản 14f9c59a');
  });

  it('never treats the local-dev stamp as a lag', () => {
    expect(appVersionLine({ version: 'v1.2.0', build: 'dev', apiBuild: 'dev' }).apiBehind).toBe(false);
    expect(appVersionLine({ version: 'v1.2.0', build: 'dev', apiBuild: null }).apiBehind).toBe(false);
    expect(appVersionLine({ version: 'v1.2.0', build: '6426570a', apiBuild: null }).text).toBe('Phiên bản v1.2.0');
  });

  it('exposes the version alone for places that only need the number', () => {
    expect(appVersionShort('v1.12.1')).toBe('Phiên bản v1.12.1');
  });
});
