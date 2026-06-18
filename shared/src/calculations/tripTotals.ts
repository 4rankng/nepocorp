import { roundInt } from './round';

export interface ComputeTripTotalsInput {
  legs: { sequence: number; km: number; loadingType: 'HANG' | 'VO' }[];
  fuelMode: 'AUTO' | 'FLAT_RATE';

  fuelLitersOverride: number | null;
  fuelSupplementLiters: number;
  fuelLoadedNorm: number;
  fuelEmptyNorm: number;
  fuelPerTripSupplement: number;
  fuelUnitPrice: number;
  fuelActualUnitPrice?: number | null;
  isMountainRoute: boolean;
  mountainFixedAllowance: number | null;
  roadAllowanceBase: number;
  tollsDiscount: number;
  tollsAddition: number;
  tollsStations: number;
  tollPerStation: number;
  hasReturnCargo: boolean;
  returnCargoBonus: number;
  revenue: number;
  driverSalary: number;
  twoPointDeliveryBonus: number;
  vehicleShiftAllowance: number;
  roadAllowanceOverride?: number | null;
  vatRate?: number;                    // default 0 (no VAT change for existing trips)
  carrierType?: 'OWN' | 'EXTERNAL';   // default 'OWN'
  externalFreightCost?: number;        // incl-VAT; only used when carrierType='EXTERNAL'
  ancillaryFees?: Array<{
    buyAmount: number;                 // incl-VAT cost to company
    sellAmount: number;               // incl-VAT billed to customer
    vatRate?: number;                  // per-fee VAT rate, default 0.080
  }>;
  customerCommission?: number;         // per-trip commission deducted from freightExVat
}

export interface ComputeTripTotalsOutput {
  totalFuelLiters: number;
  legCalculations: { sequence: number; calculatedLiters: number }[];
  totalFuelCost: number;
  fuelPriceVariance: number;
  effectiveFuelPrice: number;
  totalRoadAllowance: number;
  tollCost: number;            // tollsStations × tollPerStation; separate from road allowance
  totalCost: number;
  grossProfit: number;
  freightExVat: number;        // revenue / (1 + vatRate); equals revenue when vatRate=0
  recordedRevenue: number;     // freightExVat - customerCommission; P&L revenue after commission
  serviceMargin: number;       // sum(sellExVat - buyInclVat) across ancillary fees; 0 when none
  totalServiceBuy: number;     // sum buyAmount incl-VAT (cost component, per spec section 4.6.1)
  totalServiceSell: number;    // sum sellAmount ex-VAT (revenue component)
  externalMargin: number;      // freightExVat - externalFreightCost(incl-VAT) per §4.7; 0 for OWN trips
  externalFreightExVat: number; // informational: externalFreightCost/(1+vatRate); 0 for OWN trips (display only — margin uses incl-VAT cost)
}

export function computeRoadAllowance(params: {
  base: number;
  tollsDiscount: number;
  tollsAddition: number;
  tollsStations: number;
  tollPerStation: number;
  returnCargoBonus: number;
  hasReturnCargo: boolean;
}): number {
  const tongTienDiDuong = params.tollsAddition > 0
    ? params.tollsAddition + (params.hasReturnCargo ? params.returnCargoBonus : 0)
    : (params.base - (params.tollsStations * params.tollPerStation) + (params.hasReturnCargo ? params.returnCargoBonus : 0));
  const raw = tongTienDiDuong - params.tollsDiscount;
  return Math.max(0, raw);
}

export function computeTripTotals(input: ComputeTripTotalsInput): ComputeTripTotalsOutput {
  let totalFuelLiters = 0;
  let legCalculations: { sequence: number; calculatedLiters: number }[] = [];

  // Fuel is issued in whole liters only -- round every quantity so the
  // dispatched value matches what the fuel station hands over
  // (e.g. 97.2 L -> 97 L, 68.96 L -> 69 L). The per-trip supplement and
  // any manual supplement are likewise rounded, which keeps the displayed
  // breakdown (sum of legs + supplements) consistent with the issued total.
  const fuelSupplement = roundInt(input.fuelSupplementLiters || 0);

  // Precedence: FLAT_RATE takes precedence even over Mountain
  if (input.fuelMode === 'FLAT_RATE') {
    const baseLiters = roundInt(input.fuelLitersOverride || 0);
    totalFuelLiters = baseLiters + fuelSupplement;
    legCalculations = input.legs.map((leg) => ({ sequence: leg.sequence, calculatedLiters: 0 }));
  } else {
    // AUTO Mode
    if (input.isMountainRoute && input.mountainFixedAllowance !== null) {
      // AUTO Mountain with allowance
      const baseLiters = roundInt(input.mountainFixedAllowance);
      totalFuelLiters = baseLiters + fuelSupplement;
      legCalculations = input.legs.map((leg) => ({ sequence: leg.sequence, calculatedLiters: 0 }));
    } else {
      // AUTO Standard, or Mountain fallback to per-leg
      const legsLitersTotal = input.legs.reduce((sum, leg) => {
        const norm = leg.loadingType === 'HANG' ? input.fuelLoadedNorm : input.fuelEmptyNorm;
        // Floor each leg so the per-leg breakdown (and the sum of legs)
        // matches the integer total. Flooring after summing would let
        // sub-liter noise from individual legs push the total up by 1.
        const legLiters = roundInt((leg.km * norm) / 100);
        legCalculations.push({ sequence: leg.sequence, calculatedLiters: legLiters });
        return sum + legLiters;
      }, 0);

      const tripSupplement = roundInt(input.fuelPerTripSupplement || 0);
      totalFuelLiters = legsLitersTotal + tripSupplement + fuelSupplement;
    }
  }

  // Use nullish coalescing -- `0` is a valid numeric price, not "missing".
  const effectiveFuelPrice = input.fuelActualUnitPrice ?? input.fuelUnitPrice;
  const totalFuelCost = Math.round(totalFuelLiters * effectiveFuelPrice);
  const fuelPriceVariance = input.fuelActualUnitPrice != null
    ? Math.round(totalFuelLiters * input.fuelActualUnitPrice) - Math.round(totalFuelLiters * input.fuelUnitPrice)
    : 0;

  const computedRoadAllowance = computeRoadAllowance({
    base: input.roadAllowanceBase,
    tollsDiscount: input.tollsDiscount,
    tollsAddition: input.tollsAddition,
    tollsStations: input.tollsStations,
    tollPerStation: input.tollPerStation,
    returnCargoBonus: input.returnCargoBonus,
    hasReturnCargo: input.hasReturnCargo,
  });

  const totalRoadAllowance =
    input.roadAllowanceOverride != null && input.roadAllowanceOverride > 0
      ? input.roadAllowanceOverride
      : computedRoadAllowance;

  const vatRate = input.vatRate ?? 0;
  const carrierType = input.carrierType ?? 'OWN';

  // Freight ex-VAT (for P&L; AR uses incl-VAT)
  const freightExVat = vatRate > 0
    ? Math.round(input.revenue / (1 + vatRate))
    : input.revenue;

  // Ancillary service margin -- per spec section 4.6.1 and 4.7:
  //   sell side = ex-VAT (revenue perspective), buy side = incl-VAT (cost perspective).
  //   This follows the asymmetric VAT principle: revenue ex-VAT, costs incl-VAT.
  const fees = input.ancillaryFees ?? [];
  let totalServiceBuyInclVat = 0;
  let totalServiceSellExVat = 0;
  for (const fee of fees) {
    const feeVat = fee.vatRate ?? 0.080;
    totalServiceBuyInclVat += fee.buyAmount;  // incl-VAT, no stripping
    totalServiceSellExVat  += feeVat > 0 ? Math.round(fee.sellAmount / (1 + feeVat)) : fee.sellAmount;
  }
  const serviceMargin = totalServiceSellExVat - totalServiceBuyInclVat;

  // Toll cost — separate from road allowance for transparent P&L display.
  // computeRoadAllowance already subtracts tolls from the base rate (driver pays tolls
  // from their allowance). tollCost is the gross toll expense, added to totalCost so
  // the company's P&L reflects the full cost picture: roadAllowance (net) + tollCost.
  const tollCost = input.tollsStations * input.tollPerStation;

  // Recorded revenue = freight ex-VAT minus customer commission
  const customerCommission = input.customerCommission ?? 0;
  const recordedRevenue = freightExVat - customerCommission;

  let totalCost: number;
  let grossProfit: number;
  let externalMargin = 0;
  let externalFreightExVat = 0;

  if (carrierType === 'EXTERNAL') {
    const extCost = input.externalFreightCost ?? 0;  // incl-VAT, stored as-paid
    externalFreightExVat = vatRate > 0 ? Math.round(extCost / (1 + vatRate)) : extCost;  // informational ex-VAT (display only)
    // §4.7: costs recorded INCL VAT — margin = revenue ex-VAT − hire cost incl-VAT (no input-VAT deduction)
    externalMargin = freightExVat - extCost;
    // For external trips: cost = external freight only (no fuel/allowance/salary)
    totalCost = extCost;
    grossProfit = externalMargin + serviceMargin;
  } else {
    // OWN trip: total cost = fuel + road allowance (net) + tolls + ticket paid by company + salary + bonuses
    totalCost = totalFuelCost + totalRoadAllowance + tollCost + input.tollsDiscount + input.driverSalary
      + input.twoPointDeliveryBonus + input.vehicleShiftAllowance;
    grossProfit = recordedRevenue - totalCost + serviceMargin;
  }

  return {
    totalFuelLiters,
    legCalculations,
    totalFuelCost,
    fuelPriceVariance,
    effectiveFuelPrice,
    totalRoadAllowance,
    tollCost,
    totalCost,
    grossProfit,
    freightExVat,
    recordedRevenue,
    serviceMargin,
    totalServiceBuy: totalServiceBuyInclVat,
    totalServiceSell: totalServiceSellExVat,
    externalMargin,
    externalFreightExVat,
  };
}
