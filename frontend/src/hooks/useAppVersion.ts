import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { APP_VERSION } from '@tingting/shared';
import { appVersionLine, webBuild } from '../lib/app-version';

interface HealthPayload {
  version?: string;
  build?: string;
}

/**
 * The app version line for the UI: the shared `APP_VERSION`, plus a warning when
 * the API reports a different build stamp than the running web bundle.
 *
 * Deliberately provider-free: this renders in the shell (sidebar menu, mobile
 * user sheet), including in states where no query provider is mounted, and the
 * API's build stamp cannot change while the tab is open. One module-level
 * promise keeps it to a single request per session, shared by every instance.
 */
let apiBuildRequest: Promise<string | null> | null = null;

function fetchApiBuild(): Promise<string | null> {
  apiBuildRequest ??= api
    .get<HealthPayload>('/health')
    .then(payload => payload?.build ?? null)
    .catch(() => null);
  return apiBuildRequest;
}

export function useAppVersion(): { text: string; apiBehind: boolean; title: string } {
  const [apiBuild, setApiBuild] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetchApiBuild().then(build => {
      if (alive) setApiBuild(build);
    });
    return () => {
      alive = false;
    };
  }, []);

  return appVersionLine({ version: APP_VERSION, build: webBuild(), apiBuild });
}
