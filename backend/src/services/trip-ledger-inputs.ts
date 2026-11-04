/**
 * Pure ledger-input comparison for the COMPLETED-trip edit flow (NEPO-43).
 *
 * updateTripFigures posts postTripUnlock + postTripLock as a pair whenever a
 * COMPLETED trip is saved. When no ledger-relevant input actually changed, the
 * pair still mints rows that net to exactly 0 ₫ on every affected ledger and
 * only pollute the customer statement ("Doanh thu chuyến X" +
 * "Hoàn tác khóa chuyến X" with the same amount and instant). The comparison
 * here gates that pair: the caller passes the very objects postTripUnlock
 * (side A) and postTripLock (side B) would receive, so this check can never
 * diverge from what the postings would consume.
 */

/** Scalars of TripLedgerParams that steer the posted amounts/entities. */
export interface LedgerInputSide {
  customerId: number;
  driverId: number | null;
  revenue: string | null;
  driverSalary: string | null;
  carrierType?: string | null;
  externalCarrierId?: number | null;
  externalFreightCost?: string | null;
  fuelSupplierId?: number | null;
  fuelPriceApplied?: string | null;
  fuelActualUnitPrice?: string | null;
  totalFuelCost?: string | null;
}

export interface LedgerAllocationInput {
  supplierId: number | null;
  liters: string;
  unitPrice?: string | null;
  paymentMethod: string;
}

export interface LedgerFeeInput {
  id: number;
  buyAmount: string;
  sellAmount: string;
  settlementMethod: string;
  supplierId: number | null;
  forwarderId: number | null;
  approvalStatus: string;
}

// Numeric columns arrive as strings; `Number()` folds null and '0' into the
// same zero, so a stored null vs an explicit 0 is not a ledger change.
const NUMERIC_FIELDS = [
  'revenue',
  'driverSalary',
  'externalFreightCost',
  'fuelPriceApplied',
  'fuelActualUnitPrice',
  'totalFuelCost',
] as const;

const IDENTITY_FIELDS = [
  'customerId',
  'driverId',
  'carrierType',
  'externalCarrierId',
  'fuelSupplierId',
] as const;

export function allocationLedgerKey(allocation: LedgerAllocationInput): string {
  return [
    allocation.supplierId ?? '',
    Number(allocation.liters ?? 0),
    allocation.unitPrice == null ? '' : Number(allocation.unitPrice),
    allocation.paymentMethod ?? '',
  ].join('|');
}

/**
 * True when any input that steers the unlock/lock ledger postings differs
 * between the stored trip (side A) and the updated trip (side B). When false,
 * the pair would net to 0 ₫ everywhere and is skipped entirely.
 */
export function ledgerInputsChanged(
  trip: LedgerInputSide,
  updated: LedgerInputSide,
  allocationsA: LedgerAllocationInput[],
  allocationsB: LedgerAllocationInput[],
  fees: LedgerFeeInput[],
): boolean {
  // The same mapped fee list feeds postTripUnlock and postTripLock, so fees
  // cancel across the pair and cannot contribute a change today. The parameter
  // stays on the signature so a future split of the lists must extend this
  // check (same seam as LedgerService.validateAncillaryFees).
  void fees;

  for (const field of NUMERIC_FIELDS) {
    if (Number(trip[field] ?? 0) !== Number(updated[field] ?? 0)) return true;
  }
  for (const field of IDENTITY_FIELDS) {
    if ((trip[field] ?? null) !== (updated[field] ?? null)) return true;
  }
  // Fuel allocations compare as sorted multisets: a duplicated row doubles the
  // posted FUEL_EXPENSE (duplicates must not collapse), row order must not.
  const keysA = allocationsA.map(allocationLedgerKey).sort();
  const keysB = allocationsB.map(allocationLedgerKey).sort();
  if (keysA.length !== keysB.length || keysA.some((key, index) => key !== keysB[index])) return true;
  return false;
}
