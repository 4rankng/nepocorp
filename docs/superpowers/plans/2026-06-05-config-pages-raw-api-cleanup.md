# Config Pages Raw API Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace all raw `api.get`/`api.put` calls in config pages with proper TanStack Query hooks for cache-coherent data loading and mutations.

**Architecture:** Add missing mutation methods to `configClient`, create mutation hooks in `useCatalogQueries`, then refactor each config page to use hooks instead of raw API calls + `useEffect`/`setState`.

**Tech Stack:** React 18, TanStack Query v5, TypeScript

---

## File Structure

| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `frontend/src/api/configClient.ts` | Add `saveFuelConfig()`, `saveRoadConfig()` mutation methods |
| Modify | `frontend/src/hooks/useCatalogQueries.ts` | Add `useSaveFuelConfig()`, `useSaveRoadConfig()` mutation hooks, add query hooks for ports/penalty-reasons/routes-dropdowns |
| Modify | `frontend/src/pages/config/FuelConfigPage.tsx` | Use `useFuelConfig()` + `useSaveFuelConfig()` |
| Modify | `frontend/src/pages/config/TripExpenseConfigPage.tsx` | Use `useRoadConfig()` + `useSaveRoadConfig()` |
| Modify | `frontend/src/pages/config/PortsConfigPage.tsx` | Replace `useEffect`+`api.get`+`setState` with `useQuery` |
| Modify | `frontend/src/pages/config/ContainerTypesConfigPage.tsx` | Replace `useEffect`+`api.get`+`setState` with `useQuery` |
| Modify | `frontend/src/pages/config/PenaltyReasonsConfigPage.tsx` | Replace `useEffect`+`api.get`+`setState` with `useQuery` |
| Modify | `frontend/src/pages/config/PricingTablesConfigPage.tsx` | Replace raw `api.get` dropdown loads with existing query hooks |
| Modify | `frontend/src/pages/config/RoadAllowancesConfigPage.tsx` | Replace raw `api.get` route loads with query hook |
| Modify | `frontend/src/pages/config/RoutesConfigPage.tsx` | Replace raw `api.get` dropdown loads with query hooks |

---

## Task 1: Add mutation methods to configClient + mutation hooks to useCatalogQueries

**Files:**
- Modify: `frontend/src/api/configClient.ts`
- Modify: `frontend/src/hooks/useCatalogQueries.ts`

### configClient.ts — add these methods:

```ts
saveFuelConfig: async (data: Omit<FuelConfig, 'id' | 'createdAt' | 'updatedAt'>) => {
  return api.put<FuelConfig>('/fuel-config', data);
},

saveRoadConfig: async (data: Omit<RoadConfig, 'id' | 'createdAt' | 'updatedAt'>) => {
  return api.put<RoadConfig>('/road-config', data);
},

getPorts: async () => {
  return api.get<PaginatedResponse<Port>>('/ports');
},

getContainerTypes: async () => {
  return api.get<PaginatedResponse<ContainerType>>('/container-types');
},

getRoutes: async (search?: string) => {
  const qs = search ? `?search=${encodeURIComponent(search)}` : '';
  return api.get<PaginatedResponse<any>>(`/routes${qs}`);
},
```

Add imports for `Port`, `ContainerType` from `@nepocorp/shared`.

### useCatalogQueries.ts — add these hooks:

```ts
export function useSaveFuelConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof configClient.saveFuelConfig>[0]) =>
      configClient.saveFuelConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel-config'] });
      queryClient.invalidateQueries({ queryKey: ['cfg-count', 'fuel-config'] });
    },
  });
}

export function useSaveRoadConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof configClient.saveRoadConfig>[0]) =>
      configClient.saveRoadConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['road-config'] });
    },
  });
}

export function usePorts() {
  return useQuery({
    queryKey: ['ports'],
    queryFn: async () => {
      const res = await configClient.getPorts();
      return res.items;
    },
  });
}

export function useContainerTypes() {
  return useQuery({
    queryKey: ['container-types'],
    queryFn: async () => {
      const res = await configClient.getContainerTypes();
      return res.items;
    },
  });
}

export function useRoutesDropdown() {
  return useQuery({
    queryKey: ['routes-dropdown'],
    queryFn: async () => {
      const res = await configClient.getRoutes();
      return res.items;
    },
    staleTime: 5 * 60 * 1000,
  });
}
```

Add `useMutation, useQueryClient` to the import from `@tanstack/react-query`.

- [ ] Add mutation methods to configClient
- [ ] Add mutation + query hooks to useCatalogQueries
- [ ] TypeScript compiles clean

---

## Task 2: Refactor FuelConfigPage — use hooks instead of raw api calls

**Files:**
- Modify: `frontend/src/pages/config/FuelConfigPage.tsx`

### Changes:
- Remove `import { api } from '../../lib/api'`
- Remove the `useEffect` that calls `api.get<FuelConfig>('/fuel-config')` and populates form via setState
- Replace with `useFuelConfig()` query hook — use its `data` to populate form via a single `useEffect` on `data` change
- Replace `handleSave`'s raw `api.put('/fuel-config', ...)` with `useSaveFuelConfig()` mutation hook
- Remove manual `queryClient.invalidateQueries` calls (mutation hook handles this)
- Remove `useQueryClient` import (no longer needed)
- Keep fuel price history query as-is (it already uses `configClient.getFuelPriceHistory()`)

### New data loading pattern:
```tsx
const { data: fuelConfig } = useFuelConfig();
const saveFuel = useSaveFuelConfig();

// Sync form when config loads
useEffect(() => {
  if (fuelConfig) {
    const f = fuelConfig as any;
    setForm({
      loadedNorm: f.loadedNorm ?? f.loaded_norm ?? '',
      emptyNorm: f.emptyNorm ?? f.empty_norm ?? '',
      supplement: f.supplement ?? '0',
      unitPrice: f.unitPrice ?? f.unit_price ?? '',
      warningThreshold: f.warningThreshold ?? f.warning_threshold ?? '37',
      criticalThreshold: f.criticalThreshold ?? f.critical_threshold ?? '40',
    });
  }
}, [fuelConfig]);
```

### New save handler:
```tsx
const handleSave = async () => {
  setSaving(true);
  setError(null);
  try {
    await saveFuel.mutateAsync({
      loadedNorm: Number(form.loadedNorm),
      emptyNorm: Number(form.emptyNorm),
      supplement: Number(form.supplement) || 0,
      unitPrice: Number(form.unitPrice),
      warningThreshold: form.warningThreshold ? Number(form.warningThreshold) : 37,
      criticalThreshold: form.criticalThreshold ? Number(form.criticalThreshold) : 40,
    });
    navigate('/config');
  } catch (e: any) { setError(e?.message || 'Lỗi lưu'); } finally { setSaving(false); }
};
```

- [ ] Replace raw api.get with useFuelConfig()
- [ ] Replace raw api.put with useSaveFuelConfig()
- [ ] Remove unused imports (api, useQueryClient)
- [ ] TypeScript compiles clean

---

## Task 3: Refactor TripExpenseConfigPage — use hooks instead of raw api calls

**Files:**
- Modify: `frontend/src/pages/config/TripExpenseConfigPage.tsx`

### Changes:
- Remove `import { api } from '../../lib/api'`
- Remove `import { useQueryClient } from '@tanstack/react-query'`
- Remove the `useEffect` that calls `api.get<RoadConfig>('/road-config')` and populates form
- Replace with `useRoadConfig()` query hook
- Replace `handleSave`'s raw `api.put('/road-config', ...)` with `useSaveRoadConfig()` mutation hook
- Remove manual `queryClient.invalidateQueries` calls

### New data loading:
```tsx
import { useRoadConfig, useSaveRoadConfig } from '../../hooks/useCatalogQueries';

const { data: roadConfig } = useRoadConfig();
const saveRoad = useSaveRoadConfig();

useEffect(() => {
  if (roadConfig) {
    setForm({
      defaultDriverSalary: roadConfig.defaultDriverSalary ?? '400000',
      twoPointDeliveryBonus: roadConfig.twoPointDeliveryBonus ?? '200000',
      vehicleShiftDefault: roadConfig.vehicleShiftDefault ?? '200000',
      tollPerStation: roadConfig.tollPerStation ?? '55000',
      returnCargoBonus: roadConfig.returnCargoBonus ?? '300000',
    });
  }
}, [roadConfig]);
```

### New save handler:
```tsx
const handleSave = async () => {
  setSaving(true);
  setError(null);
  try {
    await saveRoad.mutateAsync({
      tollPerStation: Number(form.tollPerStation),
      returnCargoBonus: Number(form.returnCargoBonus),
      defaultDriverSalary: Number(form.defaultDriverSalary),
      twoPointDeliveryBonus: Number(form.twoPointDeliveryBonus),
      vehicleShiftDefault: Number(form.vehicleShiftDefault),
    });
    navigate('/config');
  } catch (e: any) { setError(e?.message || 'Lỗi lưu'); } finally { setSaving(false); }
};
```

- [ ] Replace raw api.get with useRoadConfig()
- [ ] Replace raw api.put with useSaveRoadConfig()
- [ ] Remove unused imports
- [ ] TypeScript compiles clean

---

## Task 4: Refactor PortsConfigPage — useQuery instead of useEffect+api.get

**Files:**
- Modify: `frontend/src/pages/config/PortsConfigPage.tsx`

### Changes:
- Add `import { useQuery } from '@tanstack/react-query'` (if not present)
- Add `import { usePorts } from '../../hooks/useCatalogQueries'`
- Replace the `useEffect` + `api.get('/ports')` + `setState` pattern with `usePorts()` hook
- Replace `loading` state with `isLoading` from the query
- Replace `items` state with `data ?? []` from the query
- Update `refresh` callback passed to `useCRUD` to use `refetch()` from the query
- Remove raw `api` import if no longer needed

### Pattern:
```tsx
const { data: items = [], isLoading, refetch } = usePorts();
const crud = useCRUD('/ports', async () => { await refetch(); });
```

Remove: `const [items, setItems] = useState<Port[]>([])`, `const [loading, setLoading] = useState(true)`, the old `refresh` useCallback, the `useEffect`.

- [ ] Replace useEffect+api.get+setState with usePorts()
- [ ] Update useCRUD to use refetch()
- [ ] Remove unused state variables and imports
- [ ] TypeScript compiles clean

---

## Task 5: Refactor ContainerTypesConfigPage — useQuery instead of useEffect+api.get

**Files:**
- Modify: `frontend/src/pages/config/ContainerTypesConfigPage.tsx`

### Changes:
- Same pattern as Task 4
- Add `import { useContainerTypes } from '../../hooks/useCatalogQueries'`
- Replace `useEffect` + `api.get('/container-types')` + `setState` with `useContainerTypes()`
- Update `refresh` in `useCRUD` to use `refetch()`

### Pattern:
```tsx
const { data: items = [], isLoading, refetch } = useContainerTypes();
const crud = useCRUD('/container-types', async () => { await refetch(); });
```

- [ ] Replace useEffect+api.get+setState with useContainerTypes()
- [ ] Update useCRUD to use refetch()
- [ ] Remove unused state variables and imports
- [ ] TypeScript compiles clean

---

## Task 6: Refactor PenaltyReasonsConfigPage — useQuery instead of useEffect+api.get

**Files:**
- Modify: `frontend/src/pages/config/PenaltyReasonsConfigPage.tsx`

### Changes:
- Add `import { useQuery } from '@tanstack/react-query'` (if not present)
- Replace the main data loading `useEffect` + `api.get('/penalty-reasons')` + `setState` with a useQuery hook
- The penalty reasons page also loads dropdown data via raw `api.get` calls — convert those to useQuery too
- Update `refresh` in `useCRUD` to use `refetch()`

### Pattern:
```tsx
const { data: reasonsData, isLoading, refetch } = useQuery({
  queryKey: ['penalty-reasons'],
  queryFn: async () => {
    const r = await api.get<PaginatedResponse<PenaltyReason>>('/penalty-reasons');
    return r.items;
  },
});
const items = reasonsData ?? [];
const crud = useCRUD('/penalty-reasons', async () => { await refetch(); });
```

Note: This page may also have category/employee dropdown loads via raw api.get — check and convert those too.

- [ ] Replace main data useEffect+api.get+setState with useQuery
- [ ] Convert any dropdown data loading to useQuery
- [ ] Update useCRUD to use refetch()
- [ ] Remove unused state variables and imports
- [ ] TypeScript compiles clean

---

## Task 7: Refactor PricingTablesConfigPage — use query hooks for dropdown data

**Files:**
- Modify: `frontend/src/pages/config/PricingTablesConfigPage.tsx`

### Changes:
- Replace `api.get('/customers')` + `setState` with `useCustomers()` or a useQuery hook
- Replace `api.get('/routes')` + `setState` with `useRoutesDropdown()` from useCatalogQueries
- Remove the `useEffect` that loads dropdown data

### Pattern:
```tsx
const { data: customersData } = useCustomers(1, '');
const { data: routesData } = useRoutesDropdown();
const customers = customersData?.items ?? [];
const routes = routesData ?? [];
```

- [ ] Replace raw api.get for customers with useCustomers()
- [ ] Replace raw api.get for routes with useRoutesDropdown()
- [ ] Remove useEffect and setState for dropdown data
- [ ] TypeScript compiles clean

---

## Task 8: Refactor RoadAllowancesConfigPage — use query hook for routes dropdown

**Files:**
- Modify: `frontend/src/pages/config/RoadAllowancesConfigPage.tsx`

### Changes:
- Replace both `api.get('/routes')` + `setState` calls (in useEffect and in handler) with `useRoutesDropdown()`
- Remove the `useEffect` that loads route data on mount

### Pattern:
```tsx
const { data: routes = [] } = useRoutesDropdown();
```

If there's a handler that also calls `api.get('/routes')` after creating an allowance, replace it with `refetch()`.

- [ ] Replace raw api.get for routes with useRoutesDropdown()
- [ ] Remove useEffect for route loading
- [ ] TypeScript compiles clean

---

## Task 9: Refactor RoutesConfigPage — use query hooks for dropdown data

**Files:**
- Modify: `frontend/src/pages/config/RoutesConfigPage.tsx`

### Changes:
- This page uses `api.get('/trips?limit=500')` for a trip dropdown — this is a large load and should use a proper query
- Replace `api.get('/road-allowances?limit=200')` with a useQuery hook
- The main routes data loading already uses useQuery with `queryKey: ['routes']` — check if it can be simplified

### Notes:
- For the trips dropdown (`api.get('/trips?limit=500')`), this should use `tripClient.listTrips()` or `tripClient.fetchAllTrips()` in a useQuery
- For road-allowances, add a `useRoadAllowances()` query hook to useCatalogQueries

- [ ] Replace raw api.get for road-allowances with useQuery
- [ ] Replace raw api.get for trips dropdown with tripClient.listTrips() in useQuery
- [ ] TypeScript compiles clean

---

## Task 10: Final verification

- [ ] `cd frontend && npx tsc --noEmit` — zero errors
- [ ] `grep -rn "api\.\(get\|post\|put\|patch\|delete\)" frontend/src/pages/config/` — only remaining hits should be in CrudTable.tsx or legitimately unavoidable
- [ ] Manual spot-check: each config page loads, edits, and saves correctly
