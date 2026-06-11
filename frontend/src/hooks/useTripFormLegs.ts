import { useState, useEffect, useMemo, useCallback } from 'react';
import { LoadingType } from '@tingting/shared';
import type { RouteOption } from './useTripOptions';

export interface FormLeg {
  id: string;
  sequence: number;
  origin: string;
  destination: string;
  km: string;
  loadingType: LoadingType;
}

export function useTripFormLegs(routes: RouteOption[], routeId: string) {
  const [legs, setLegs] = useState<FormLeg[]>([]);

  const selectedRoute = useMemo(
    () => routes.find((r) => r.id === Number(routeId)),
    [routes, routeId],
  );

  useEffect(() => {
    if (!selectedRoute || legs.length > 0) return;

    if (selectedRoute.defaultLegs && selectedRoute.defaultLegs.length > 0) {
      setLegs(selectedRoute.defaultLegs.map((l, i) => ({
        id: Math.random().toString(),
        sequence: i + 1,
        origin: l.origin,
        destination: l.destination,
        km: l.km.toString(),
        loadingType: l.loadingType as LoadingType,
      })));
    } else {
      const parts = selectedRoute.name.split(/\s*[-→]\s*/).filter(Boolean);
      setLegs([
        {
          id: Math.random().toString(),
          sequence: 1,
          origin: parts[0]?.trim() || "",
          destination: parts.length > 1 ? parts[parts.length - 1].trim() : "",
          km: selectedRoute.distanceKm ? String(selectedRoute.distanceKm) : "",
          loadingType: LoadingType.HANG,
        },
      ]);
    }
  }, [selectedRoute, legs.length]);

  const addLeg = useCallback(() => {
    setLegs((prev) => {
      const lastLeg = prev[prev.length - 1];
      return [
        ...prev,
        {
          id: Math.random().toString(),
          sequence: prev.length + 1,
          origin: lastLeg ? lastLeg.destination : "",
          destination: "",
          km: "",
          loadingType: LoadingType.HANG,
        },
      ];
    });
  }, []);

  const removeLeg = useCallback((idx: number) => {
    setLegs((prev) =>
      prev
        .filter((_, i) => i !== idx)
        .map((leg, i) => ({ ...leg, sequence: i + 1 })),
    );
  }, []);

  const updateLeg = useCallback(
    (idx: number, field: keyof FormLeg, value: string) => {
      setLegs((prev) =>
        prev.map((leg, i) => (i === idx ? { ...leg, [field]: value } : leg)),
      );
    },
    [],
  );

  return {
    legs, setLegs,
    addLeg, removeLeg, updateLeg,
  };
}
