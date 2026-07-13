/**
 * React Query hooks for the admin onboarding master switch.
 *
 * On a successful save, invalidates the `/auth/me` query so the app-wide
 * `user.onboardingEnabled` flag refreshes (the checklist + tour launch read it
 * from the auth user, not from this query). Mirrors useLlmSettings.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { onboardingSettingsClient } from '../api/onboardingSettingsClient';
import { qk } from '../api/keys';

export function useOnboardingSettings() {
  return useQuery({
    queryKey: qk.onboardingSettings.detail,
    queryFn: () => onboardingSettingsClient.getSettings(),
    staleTime: 30_000,
  });
}

export function useSaveOnboardingSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tutorialEnabled: boolean) =>
      onboardingSettingsClient.saveSettings(tutorialEnabled),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.onboardingSettings.all });
      // Refresh /auth/me so user.onboardingEnabled updates app-wide without a re-login.
      qc.invalidateQueries({ queryKey: qk.auth.me });
    },
  });
}
