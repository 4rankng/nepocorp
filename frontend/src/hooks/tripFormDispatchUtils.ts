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

export function countRequiredTripFields(fields: RequiredTripFields): number {
  let count = 0;
  if (fields.customerId) count++;
  if (fields.routeId) count++;
  if (fields.carrierType === 'EXTERNAL') {
    if (fields.externalCarrierId) count++;
    if (fields.externalFreightCost.trim()) count++;
    // externalPlateNumber is intentionally NOT counted: the partner assigns the
    // truck after planning, so the plate is only required at completion
    // (kanban 20260921_4).
  } else {
    if (fields.truckId) count++;
    if (fields.trailerType) count++;
    if (fields.driverId) count++;
  }
  if (fields.cargoTypeId) count++;
  if (fields.plannedContainerTypeId || fields.containerRows.some(row => row.containerTypeId)) count++;
  if (fields.departureDate) count++;
  return count;
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
