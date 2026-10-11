import { APP_VERSION } from '@tingting/shared';

/**
 * The app version surface.
 *
 * One product = one version: the API and the web bundle are built from the same
 * commit, so the UI shows `APP_VERSION` and nothing else. The commit stamp stays
 * as a build identity (tooltip + `GET /api/health`), and its only visible job is
 * to shout when the API is running a DIFFERENT build than the web bundle — the
 * case that happens when a deploy ships only one of the two images.
 */

/** Build stamp of the running web bundle, injected by vite (`__BUILD_SHA__`). */
export function webBuild(): string {
  return typeof __BUILD_SHA__ !== 'undefined' ? __BUILD_SHA__ : 'dev';
}

export interface AppVersionState {
  /** App version, e.g. `v1.2.0`. */
  version: string;
  /** Build stamp of the web bundle. */
  build: string;
  /** Build stamp the API reports; null/undefined while unknown. */
  apiBuild?: string | null;
}

export interface AppVersionLine {
  /** What the operator reads. */
  text: string;
  /** True when the API reports a different, real build. */
  apiBehind: boolean;
  /** Hover detail: both build stamps, for comparing against `git log`. */
  title: string;
}

export function appVersionLine({ version, build, apiBuild }: AppVersionState): AppVersionLine {
  // 'dev' is the local-dev stamp (no build arg), never a lag.
  const apiKnown = !!apiBuild && apiBuild !== 'dev';
  const apiBehind = apiKnown && apiBuild !== build;
  const text = apiBehind
    ? `Phiên bản ${version} · API đang chạy bản ${apiBuild}`
    : `Phiên bản ${version}`;
  const title = apiKnown
    ? `Bản dựng web ${build} · API ${apiBuild}`
    : `Bản dựng web ${build}`;
  return { text, apiBehind, title };
}

/** Version string for a header/tooltip that has no API data yet. */
export function appVersionShort(version: string = APP_VERSION): string {
  return `Phiên bản ${version}`;
}
