-- Reclassify the already-recorded two-point delivery payment into the road
-- money received by drivers. total_cost and gross_profit are intentionally
-- unchanged: this moves one existing component, it does not add a new cost.
--
-- The equality against the old formula makes this safe to re-run manually:
-- rows that were already reclassified no longer match and are skipped.
WITH eligible_trips AS (
  SELECT
    id,
    COALESCE(two_point_delivery_bonus, 0) AS two_point_delivery_bonus
  FROM trips
  WHERE COALESCE(carrier_type, 'OWN') = 'OWN'
    AND status <> 'CANCELED'
    AND COALESCE(two_point_delivery_bonus, 0) > 0
    AND COALESCE(total_road_allowance, 0) = CASE
      WHEN COALESCE(road_allowance_override, 0) > 0
        THEN road_allowance_override
      ELSE GREATEST(
        0,
        CASE
          WHEN COALESCE(tolls_addition, 0) > 0
            THEN COALESCE(tolls_addition, 0)
              + CASE WHEN COALESCE(has_return_cargo, false)
                THEN COALESCE(return_cargo_bonus_applied, 0)
                ELSE 0
              END
          ELSE COALESCE(road_allowance_base_applied, 0)
            - (COALESCE(tolls_stations, 0) * COALESCE(toll_per_station_applied, 0))
            + CASE WHEN COALESCE(has_return_cargo, false)
              THEN COALESCE(return_cargo_bonus_applied, 0)
              ELSE 0
            END
        END - COALESCE(tolls_discount, 0)
      )
    END
)
UPDATE trips
SET total_road_allowance = COALESCE(trips.total_road_allowance, 0) + eligible_trips.two_point_delivery_bonus
FROM eligible_trips
WHERE trips.id = eligible_trips.id;
