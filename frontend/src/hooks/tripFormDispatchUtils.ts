import { LoadingType } from '@tingting/shared';
import type { FormLeg } from './useTripFormLegs';

export function resolveContainerCount(raw: string): number {
  return Math.min(10, Math.max(1, Number(raw) || 1));
}

export function createFallbackLegsFromRouteName(
  routeName: string | undefined,
  idFactory: () => string = () => Math.random().toString(),
): FormLeg[] {
  const parts = (routeName || '').split(/\s*[-→]\s*/).filter(Boolean);
  const originGuess = parts[0]?.trim() || '';
  const destGuess = parts.length > 1 ? parts[parts.length - 1].trim() : '';

  return [
    {
      id: idFactory(),
      sequence: 1,
      origin: originGuess,
      destination: destGuess,
      km: '',
      loadingType: LoadingType.HANG,
    },
    {
      id: idFactory(),
      sequence: 2,
      origin: destGuess,
      destination: originGuess,
      km: '',
      loadingType: LoadingType.VO,
    },
  ];
}
