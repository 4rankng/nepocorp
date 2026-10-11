import { appVersionLabel } from '../../lib/app-version';

/**
 * The one place the app version is shown: `Phiên bản v1.2.0`.
 *
 * Rendered in the sidebar user menu (desktop) and the mobile user sheet. No build
 * stamps, no hover text — `GET /api/health` carries the commit for deploy checks.
 */
export function AppVersion({ className }: { className?: string }) {
  return <span className={className}>{appVersionLabel()}</span>;
}
