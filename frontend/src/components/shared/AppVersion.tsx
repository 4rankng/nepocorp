import { AlertTriangle } from 'lucide-react';
import { useAppVersion } from '../../hooks/useAppVersion';

/**
 * The one place the app version is shown: `Phiên bản v1.2.0`.
 *
 * Rendered in the sidebar user menu and the shell footer. When the API reports a
 * different build stamp than the running web bundle the line grows a warning —
 * that only happens when a deploy shipped one image without the other, and it
 * must never be silent. Hover shows both build stamps for comparing against
 * `git log`.
 */
export function AppVersion({ className }: { className?: string }) {
  const { text, apiBehind, title } = useAppVersion();

  return (
    <span className={className} title={title}>
      {apiBehind && (
        <AlertTriangle
          size={12}
          aria-hidden="true"
          style={{ color: 'var(--warning)', verticalAlign: '-2px', marginRight: 4 }}
        />
      )}
      {text}
    </span>
  );
}
