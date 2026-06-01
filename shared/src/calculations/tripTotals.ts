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
  roadAllowanceOverride?: number | null;
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

  const effectiveFuelPrice = input.fuelActualUnitPrice || input.fuelUnitPrice;
  const totalFuelCost = Math.round(totalFuelLiters * effectiveFuelPrice);
  const fuelPriceVariance = input.fuelActualUnitPrice
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

  const totalCost = totalFuelCost + totalRoadAllowance + input.driverSalary;
  const grossProfit = input.revenue - totalCost;

  return {
    totalFuelLiters,
    legCalculations,
    totalFuelCost,
    fuelPriceVariance,
    effectiveFuelPrice,
    totalRoadAllowance,
    totalCost,
    grossProfit,
  };
}
