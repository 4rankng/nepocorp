import type { Trip } from '@tingting/shared';

/**
 * Pre-completion notice for fuel drawn without a named supplier
 * (kanban 121026194100). Completion is deliberately permissive about it: xe
 * nhà must reach "Hoàn thành" before the truck can be dispatched again, while
 * kế toán only chốt số the next day. This is a warning, never a block — the
 * unassigned cost posts nothing to công nợ until NCC is gán and the trip is
 * chốt lại, and the supplier fuel statement lists every such trip.
 *
 * Xe ngoài is exempt: a subcontracted trip carries no company fuel cost at all
 * (the figures schema rejects a supplier/allocations), so its liters are
 * informational and nothing needs filling in.
 */
export function fuelSupplierCompletionWarning(
  trip: Pick<Trip, 'carrierType' | 'fuelLiters' | 'fuelLitersOverride' | 'fuelSupplierId' | 'fuelSupplier' | 'fuelAllocations'>,
): string | null {
  if (trip.carrierType === 'EXTERNAL') return null;
  const hasFuel = Number(trip.fuelLiters ?? 0) > 0 || Number(trip.fuelLitersOverride ?? 0) > 0;
  if (!hasFuel) return null;
  if (trip.fuelSupplierId || trip.fuelSupplier?.id) return null;
  // A CASH allocation legitimately carries supplierId = NULL (schema CHECK) —
  // the fuel is accounted for, just not as a credit purchase.
  if ((trip.fuelAllocations?.length ?? 0) > 0) return null;
  return 'Chuyến có số lít dầu nhưng chưa gán nhà cung cấp nên chi phí nhiên liệu chưa vào công nợ. '
    + 'Vẫn hoàn thành được chuyến — kế toán gán NCC nhiên liệu rồi chốt lại chuyến sau.';
}
