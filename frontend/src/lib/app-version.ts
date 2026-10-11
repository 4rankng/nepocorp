import { APP_VERSION } from '@tingting/shared';

/**
 * The app version surface.
 *
 * One product = one version: the API and the web bundle are built from the same
 * commit, so the UI shows `APP_VERSION` and nothing else. The build stamp is not
 * a user-facing concept — it stays in `GET /api/health` for deploy checks.
 */

/** What the operator reads, e.g. `Phiên bản v1.2.0`. */
export function appVersionLabel(version: string = APP_VERSION): string {
  return `Phiên bản ${version}`;
}
