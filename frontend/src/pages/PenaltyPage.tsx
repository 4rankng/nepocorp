import { useState, useCallback } from 'react';
import { usePenalties, usePenaltyCatalogs } from '../hooks/usePenalties';
import { useAuth } from '../hooks/useAuth';
import { useCreatePenalty, useCancelPenalty } from '../features/penalties/hooks/usePenaltyMutations';
import { PenaltyTable } from '../features/penalties/components/PenaltyTable';
import { PenaltyFormDrawer } from '../features/penalties/components/PenaltyFormDrawer';
import { CancelPenaltyDialog } from '../features/penalties/components/CancelPenaltyDialog';
import type { PenaltyRow } from '../hooks/usePenalties';

export default function PenaltyPage() {
  const { data: penaltiesData, isLoading: listLoading } = usePenalties();
  const { data: catalogsData } = usePenaltyCatalogs();
  const penalties: PenaltyRow[] = penaltiesData ?? [];
  const drivers = catalogsData?.drivers ?? [];
  const reasons = catalogsData?.reasons ?? [];
  const trucks = catalogsData?.trucks ?? [];

  const { user } = useAuth();
  const canCancel = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const createMutation = useCreatePenalty();
  const cancelMutation = useCancelPenalty();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [preselectedDriver, setPreselectedDriver] = useState<number | undefined>();
  const [cancelTarget, setCancelTarget] = useState<PenaltyRow | null>(null);

  const openDrawer = useCallback((driverId?: number) => {
    setPreselectedDriver(driverId);
    setDrawerOpen(true);
  }, []);

  const handleCancelPenalty = useCallback(async (reason?: string) => {
    if (!cancelTarget) return;
    try {
      await cancelMutation.mutateAsync({ id: cancelTarget.id, reason });
      setCancelTarget(null);
    } catch (e: any) {
      alert(e.message || 'Lỗi khi hủy kỷ luật');
    }
  }, [cancelTarget, cancelMutation]);

  return (
    <div className="penalty-page fade-up">
      <PenaltyTable
        penalties={penalties}
        drivers={drivers}
        reasons={reasons}
        trucks={trucks}
        listLoading={listLoading}
        canCancel={canCancel}
        onOpenDrawer={openDrawer}
        onCancelPenalty={setCancelTarget}
      />

      <PenaltyFormDrawer
        isOpen={drawerOpen}
        onClose={() => { setDrawerOpen(false); setPreselectedDriver(undefined); }}
        drivers={drivers}
        reasons={reasons}
        onSubmit={async (body) => {
          const result = await createMutation.mutateAsync(body);
          setDrawerOpen(false);
          setPreselectedDriver(undefined);
          return result;
        }}
        preselectedDriverId={preselectedDriver}
      />

      <CancelPenaltyDialog
        isOpen={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleCancelPenalty}
        penalty={cancelTarget}
        loading={cancelMutation.isPending}
      />
    </div>
  );
}
