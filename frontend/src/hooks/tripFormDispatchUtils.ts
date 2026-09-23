import { LoadingType } from '@tingting/shared';
import type { FormLeg } from './useTripFormLegs';

export interface PlannedContainer {
  containerTypeId?: number | null;
}

export interface RequiredTripFields {
  customerId: string;
  routeId: string;
  carrierType: 'OWN' | 'EXTERNAL';
  externalCarrierId: number | null;
  externalFreightCost: string;
  externalPlateNumber: string;
  truckId: string;
  trailerType: string;
  driverId: string;
  cargoTypeId: string;
  plannedContainerTypeId: string;
  containerRows: PlannedContainer[];
  departureDate: string;
}

export interface RequiredFieldProgress {
  filled: number;
  total: number;
}

export function requiredTripFieldProgress(fields: RequiredTripFields): RequiredFieldProgress {
  const carrierChecks =
    fields.carrierType === 'EXTERNAL'
      ? // externalPlateNumber is intentionally NOT required here: the partner
        // assigns the truck after planning, so the plate is only required at
        // completion (kanban 20260921_4).
        [!!fields.externalCarrierId, fields.externalFreightCost.trim() !== '']
      : [!!fields.truckId, !!fields.trailerType, !!fields.driverId];
  const checks = [
    !!fields.customerId,
    !!fields.routeId,
    ...carrierChecks,
    !!fields.cargoTypeId,
    !!fields.plannedContainerTypeId || fields.containerRows.some(row => row.containerTypeId),
    !!fields.departureDate,
  ];
  return { filled: checks.filter(Boolean).length, total: checks.length };
}

export function resolveContainerCount(raw: string): number {
  return Math.min(10, Math.max(1, Number(raw) || 1));
}

export function resolveCommonContainerTypeId(
  containers: PlannedContainer[] | undefined,
): string {
  if (!containers?.length) return '';
  const typeIds = containers.map((container) => container.containerTypeId);

  if (typeIds.some((typeId) => typeId == null)) return '';
  return typeIds.every((typeId) => typeId === typeIds[0])
    ? String(typeIds[0])
    : '';
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
