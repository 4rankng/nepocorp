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

export function useTripFormLegs(routes: RouteOption[], routeId: string, isEditMode?: boolean) {
  const [legs, setLegs] = useState<FormLeg[]>([]);
  const [hasDeletedReturnLeg, setHasDeletedReturnLeg] = useState(false);

  const selectedRoute = useMemo(
    () => routes.find((r) => r.id === Number(routeId)),
    [routes, routeId],
  );

  useEffect(() => {
    setHasDeletedReturnLeg(false);
  }, [routeId]);

  const getOppositeLoadingType = (type: LoadingType): LoadingType => {
    return type === LoadingType.HANG ? LoadingType.VO : LoadingType.HANG;
  };

  useEffect(() => {
    if (isEditMode) return;
    if (!selectedRoute || legs.length > 0) return;

    if (selectedRoute.defaultLegs && selectedRoute.defaultLegs.length > 0) {
      if (selectedRoute.defaultLegs.length === 1) {
        const l = selectedRoute.defaultLegs[0];
        setLegs([
          {
            id: Math.random().toString(),
            sequence: 1,
            origin: l.origin,
            destination: l.destination,
            km: l.km.toString(),
            loadingType: l.loadingType as LoadingType,
          },
          {
            id: Math.random().toString(),
            sequence: 2,
            origin: l.destination,
            destination: l.origin,
            km: l.km.toString(),
            loadingType: getOppositeLoadingType(l.loadingType as LoadingType),
          },
        ]);
      } else {
        setLegs(selectedRoute.defaultLegs.map((l, i) => ({
          id: Math.random().toString(),
          sequence: i + 1,
          origin: l.origin,
          destination: l.destination,
          km: l.km.toString(),
          loadingType: l.loadingType as LoadingType,
        })));
      }
    } else {
      const parts = selectedRoute.name.split(/\s*[-→]\s*/).filter(Boolean);
      const origin = parts[0]?.trim() || "";
      const destination = parts.length > 1 ? parts[parts.length - 1].trim() : "";
      const km = selectedRoute.distanceKm ? String(selectedRoute.distanceKm) : "";
      setLegs([
        {
          id: Math.random().toString(),
          sequence: 1,
          origin,
          destination,
          km,
          loadingType: LoadingType.HANG,
        },
        {
          id: Math.random().toString(),
          sequence: 2,
          origin: destination,
          destination: origin,
          km,
          loadingType: LoadingType.VO,
        },
      ]);
    }
  }, [selectedRoute, legs.length, isEditMode]);

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
    setLegs((prev) => {
      if (prev.length === 2 && idx === 1) {
        setHasDeletedReturnLeg(true);
      }
      return prev
        .filter((_, i) => i !== idx)
        .map((leg, i) => ({ ...leg, sequence: i + 1 }));
    });
  }, []);

  const updateLeg = useCallback(
    (idx: number, field: keyof FormLeg, value: string) => {
      setLegs((prev) => {
        const next = prev.map((leg, i) => (i === idx ? { ...leg, [field]: value } : leg));

        if (idx === 0) {
          const leg1 = next[0];

          if (
            next.length === 1 &&
            !isEditMode &&
            !hasDeletedReturnLeg &&
            (leg1.origin || leg1.destination || leg1.km)
          ) {
            next.push({
              id: Math.random().toString(),
              sequence: 2,
              origin: leg1.destination,
              destination: leg1.origin,
              km: leg1.km,
              loadingType: getOppositeLoadingType(leg1.loadingType),
            });
          } else if (next.length === 2) {
            next[1] = {
              ...next[1],
              origin: leg1.destination,
              destination: leg1.origin,
              km: leg1.km,
              loadingType:
                field === 'loadingType' ? getOppositeLoadingType(leg1.loadingType) : next[1].loadingType,
            };
          }
        }

        return next;
      });
    },
    [isEditMode, hasDeletedReturnLeg],
  );

  return {
    legs,
    setLegs,
    addLeg,
    removeLeg,
    updateLeg,
  };
}
