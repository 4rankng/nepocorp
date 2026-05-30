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
}

export interface ComputeTripTotalsOutput {
  totalFuelLiters: number;
  legCalculations: { sequence: number; calculatedLiters: number }[];
  totalFuelCost: number;
  totalRoadAllowance: number;
  totalCost: number;
  grossProfit: number;
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

  const totalFuelCost = Math.round(totalFuelLiters * input.fuelUnitPrice);

  const rawRoadAllowance = input.roadAllowanceBase
    - input.tollsDiscount
    + input.tollsAddition
    - (input.tollsStations * input.tollPerStation)
    + (input.hasReturnCargo ? input.returnCargoBonus : 0);

  const totalRoadAllowance = Math.max(0, rawRoadAllowance);

  const totalCost = totalFuelCost + totalRoadAllowance + input.driverSalary;
  const grossProfit = input.revenue - totalCost;

  return {
    totalFuelLiters,
    legCalculations,
    totalFuelCost,
    totalRoadAllowance,
    totalCost,
    grossProfit,
  };
}
