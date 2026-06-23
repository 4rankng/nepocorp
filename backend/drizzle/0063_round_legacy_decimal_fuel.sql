-- Round calculated_liters in trip_legs
UPDATE trip_legs
SET calculated_liters = ROUND(calculated_liters)
WHERE calculated_liters IS NOT NULL
  AND calculated_liters != ROUND(calculated_liters);

--> statement-breakpoint

-- Round fuel_supplement_liters in trips
UPDATE trips
SET fuel_supplement_liters = ROUND(fuel_supplement_liters)
WHERE fuel_supplement_liters IS NOT NULL
  AND fuel_supplement_liters != ROUND(fuel_supplement_liters);

--> statement-breakpoint

-- Round fuel_liters, recalculate total_fuel_cost, total_cost, and gross_profit in trips
WITH rounded_trips AS (
  SELECT
    id,
    ROUND(fuel_liters) AS rounded_liters,
    ROUND(COALESCE(fuel_actual_unit_price, fuel_price_applied, ROUND(total_fuel_cost / NULLIF(fuel_liters, 0)))) AS unit_price,
    total_fuel_cost AS orig_fuel_cost,
    total_cost AS orig_total_cost,
    gross_profit AS orig_gross_profit
  FROM trips
  WHERE fuel_liters IS NOT NULL
    AND fuel_liters != ROUND(fuel_liters)
),
calcs AS (
  SELECT
    id,
    rounded_liters,
    (rounded_liters * unit_price) AS new_fuel_cost,
    (rounded_liters * unit_price) - orig_fuel_cost AS cost_delta,
    orig_total_cost,
    orig_gross_profit
  FROM rounded_trips
)
UPDATE trips t
SET
  fuel_liters = c.rounded_liters,
  total_fuel_cost = c.new_fuel_cost,
  total_cost = c.orig_total_cost + c.cost_delta,
  gross_profit = c.orig_gross_profit - c.cost_delta,
  fuel_supplement_norm_applied = CASE WHEN t.id IN (2, 3) THEN 3.00 ELSE t.fuel_supplement_norm_applied END
FROM calcs c
WHERE t.id = c.id;
