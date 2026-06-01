import { db } from './index.js';
import * as s from './schema.js';
import { eq, isNotNull, sql, and } from 'drizzle-orm';

async function migrateTrailers() {
  console.log('Starting trailer migration...');

  try {
    const result = await db.transaction(async (tx) => {
      const existingTrailers = await tx.select({ count: sql<number>`count(*)::int` }).from(s.trailers);
      if (existingTrailers[0].count > 0) {
        console.log(`Trailers table already has ${existingTrailers[0].count} rows — skipping.`);
        return { skipped: true };
      }

      const trucksWithTrailers = await tx
        .select({
          id: s.trucks.id,
          trailerPlateNumber: s.trucks.trailerPlateNumber,
          trailerType: s.trucks.trailerType,
        })
        .from(s.trucks)
        .where(isNotNull(s.trucks.trailerPlateNumber));

      console.log(`Found ${trucksWithTrailers.length} trucks with trailer plates.`);

      const uniqueCombos = new Map<string, { plateNumber: string; type: '20FT' | '40FT' }>();
      for (const t of trucksWithTrailers) {
        const key = `${t.trailerPlateNumber}|${t.trailerType ?? '40FT'}`;
        if (!uniqueCombos.has(key)) {
          uniqueCombos.set(key, {
            plateNumber: t.trailerPlateNumber!,
            type: (t.trailerType ?? '40FT') as '20FT' | '40FT',
          });
        }
      }

      console.log(`Extracted ${uniqueCombos.size} unique trailer combinations.`);

      const insertedTrailers = await tx
        .insert(s.trailers)
        .values(
          Array.from(uniqueCombos.values()).map((combo) => ({
            plateNumber: combo.plateNumber,
            type: combo.type,
          }))
        )
        .returning({ id: s.trailers.id, plateNumber: s.trailers.plateNumber });

      console.log(`Inserted ${insertedTrailers.length} trailers.`);

      const plateToTrailerId = new Map<string, number>();
      for (const tr of insertedTrailers) {
        plateToTrailerId.set(tr.plateNumber, tr.id);
      }

      let trucksUpdated = 0;
      for (const truck of trucksWithTrailers) {
        const trailerId = plateToTrailerId.get(truck.trailerPlateNumber!);
        if (trailerId != null) {
          await tx
            .update(s.trucks)
            .set({ currentTrailerId: trailerId })
            .where(eq(s.trucks.id, truck.id));
          trucksUpdated++;
        }
      }
      console.log(`Updated currentTrailerId on ${trucksUpdated} trucks.`);

      const truckIdToTrailerId = new Map<number, number>();
      for (const truck of trucksWithTrailers) {
        const trailerId = plateToTrailerId.get(truck.trailerPlateNumber!);
        if (trailerId != null) {
          truckIdToTrailerId.set(truck.id, trailerId);
        }
      }

      const allTrips = await tx
        .select({ id: s.trips.id, truckId: s.trips.truckId })
        .from(s.trips);

      let tripsUpdated = 0;
      for (const trip of allTrips) {
        const trailerId = truckIdToTrailerId.get(trip.truckId);
        if (trailerId != null) {
          await tx
            .update(s.trips)
            .set({ trailerId })
            .where(eq(s.trips.id, trip.id));
          tripsUpdated++;
        }
      }
      console.log(`Updated trailerId on ${tripsUpdated} trips.`);

      return {
        skipped: false,
        trailersInserted: insertedTrailers.length,
        trucksUpdated,
        tripsUpdated,
      };
    });

    if ('skipped' in result && result.skipped) {
      console.log('Migration skipped — trailers already exist.');
    } else {
      console.log('Migration complete.');
      console.log(`  Trailers inserted: ${result.trailersInserted}`);
      console.log(`  Trucks updated:    ${result.trucksUpdated}`);
      console.log(`  Trips updated:     ${result.tripsUpdated}`);
    }

    process.exit(0);
  } catch (err) {
    console.error('Trailer migration failed:', err);
    process.exit(1);
  }
}

migrateTrailers();
