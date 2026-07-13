/**
 * Typed API client for the admin onboarding master-switch settings.
 *
 * Wraps `GET/PUT /api/admin/onboarding-settings`. After a successful PUT the
 * caller invalidates the `/auth/me` query so the app-wide `onboardingEnabled`
 * flag (read from the auth user) refreshes immediately — no re-login needed.
 */
import { api } from '../lib/api';
import type { OnboardingSettingsResponse } from '@tingting/shared';

export const onboardingSettingsClient = {
  getSettings: () =>
    api.get<OnboardingSettingsResponse>('/admin/onboarding-settings'),
  saveSettings: (tutorialEnabled: boolean) =>
    api.put<OnboardingSettingsResponse>('/admin/onboarding-settings', { tutorialEnabled }),
};
