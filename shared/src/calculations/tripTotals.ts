import { round2dp } from './round';

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
}

export interface ComputeTripTotalsOutput {
  totalFuelLiters: number;
  legCalculations: { sequence: number; calculatedLiters: number }[];
  totalFuelCost: number;
  fuelPriceVariance: number;
  effectiveFuelPrice: number;
  totalRoadAllowance: number;
  totalCost: number;
  grossProfit: number;
  freightExVat: number;        // revenue / (1 + vatRate); equals revenue when vatRate=0
  serviceMargin: number;       // Σ(sellExVat − buyInclVat) across ancillary fees; 0 when none
  totalServiceBuy: number;     // Σ buyAmount incl-VAT (cost component, per spec §4.6.1)
  totalServiceSell: number;    // Σ sellAmount ex-VAT (revenue component)
  externalMargin: number;      // freightExVat − externalFreightExVat; 0 for OWN trips
  externalFreightExVat: number; // externalFreightCost/(1+vatRate); 0 for OWN trips
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
  const raw = params.base
    - params.tollsDiscount
    + params.tollsAddition
    - (params.tollsStations * params.tollPerStation)
    + (params.hasReturnCargo ? params.returnCargoBonus : 0);
  return Math.max(0, raw);
}

export function computeTripTotals(input: ComputeTripTotalsInput): ComputeTripTotalsOutput {
  let totalFuelLiters = 0;
  let legCalculations: { sequence: number; calculatedLiters: number }[] = [];

  const fuelSupplement = round2dp(input.fuelSupplementLiters || 0);

  // Precedence: FLAT_RATE takes precedence even over Mountain
  if (input.fuelMode === 'FLAT_RATE') {
    const baseLiters = round2dp(input.fuelLitersOverride || 0);
    totalFuelLiters = round2dp(baseLiters + fuelSupplement);
    legCalculations = input.legs.map((leg) => ({ sequence: leg.sequence, calculatedLiters: 0 }));
  } else {
    // AUTO Mode
    if (input.isMountainRoute && input.mountainFixedAllowance !== null) {
      // AUTO Mountain with allowance
      const baseLiters = round2dp(input.mountainFixedAllowance);
      totalFuelLiters = round2dp(baseLiters + fuelSupplement);
      legCalculations = input.legs.map((leg) => ({ sequence: leg.sequence, calculatedLiters: 0 }));
    } else {
      // AUTO Standard, or Mountain fallback to per-leg
      const legsLitersTotal = input.legs.reduce((sum, leg) => {
        const norm = leg.loadingType === 'HANG' ? input.fuelLoadedNorm : input.fuelEmptyNorm;
        const legLiters = round2dp((leg.km * norm) / 100);
        legCalculations.push({ sequence: leg.sequence, calculatedLiters: legLiters });
        return sum + legLiters;
      }, 0);

      const tripSupplement = round2dp(input.fuelPerTripSupplement || 0);
      totalFuelLiters = round2dp(legsLitersTotal + tripSupplement + fuelSupplement);
    }
  }

  // Use nullish coalescing — `0` is a valid numeric price, not "missing".
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

  // Ancillary service margin — per spec §4.6.1 & §4.7:
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

  let totalCost: number;
  let grossProfit: number;
  let externalMargin = 0;
  let externalFreightExVat = 0;

  if (carrierType === 'EXTERNAL') {
    const extCost = input.externalFreightCost ?? 0;
    externalFreightExVat = vatRate > 0 ? Math.round(extCost / (1 + vatRate)) : extCost;
    externalMargin = freightExVat - externalFreightExVat;
    // For external trips: cost = external freight only (no fuel/allowance/salary)
    totalCost = extCost;
    grossProfit = externalMargin + serviceMargin;
  } else {
    // OWN trip: existing formula
    totalCost = totalFuelCost + totalRoadAllowance + input.driverSalary
      + input.twoPointDeliveryBonus + input.vehicleShiftAllowance;
    grossProfit = freightExVat - totalCost + serviceMargin;
  }

  return {
    totalFuelLiters,
    legCalculations,
    totalFuelCost,
    fuelPriceVariance,
    effectiveFuelPrice,
    totalRoadAllowance,
    totalCost,
    grossProfit,
    freightExVat,
    serviceMargin,
    totalServiceBuy: totalServiceBuyInclVat,
    totalServiceSell: totalServiceSellExVat,
    externalMargin,
    externalFreightExVat,
  };
}
