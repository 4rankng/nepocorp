import { db } from './db';
import * as s from './db/schema';
import { eq } from 'drizzle-orm';
import { TripStatus, FuelMode } from '@tingting/shared';
import * as tripService from './services/trip.service';

async function run() {
  const tripId = 49;
  
  // Clean up any existing photos first to be safe
  await db.delete(s.tripPhotos).where(eq(s.tripPhotos.tripId, tripId));

  // Insert the required cargo photo so completion validation passes
  await db.insert(s.tripPhotos).values({
    tripId,
    type: 'CONTAINER',
    storageKey: 'trips/49/e2e-container-mock.jpg',
    uploadedBy: 2, // giamdoc user ID
  });
  console.log('1. Inserted cargo confirmation photo.');

  // Transition to COMPLETED
  await tripService.transitionTripStatus(tripId, TripStatus.COMPLETED, 2, 'MANAGER');
  console.log('2. Transitioned trip status to COMPLETED.');

  // Get current trip version
  const [trip] = await db.select().from(s.trips).where(eq(s.trips.id, tripId)).limit(1);
  const version = trip?.version || 1;

  // Update actuals
  await tripService.updateTripFigures(tripId, {
    expectedVersion: version,
    fuelMode: FuelMode.AUTO,
    legs: [{ sequence: 1, origin: 'Hà Nội', destination: 'Hải Phòng', km: 120, loadingType: 'HANG' as any }],
    fuelSupplementLiters: 0,
    tollsDiscount: 0,
    tollsAddition: 0,
    tollsStations: 0,
    hasReturnCargo: false,
    driverSalary: 500000,
    revenue: 4500000,
    userId: 2
  });
  console.log('3. Updated trip figures and actuals.');

  // Lock the trip to trigger Sổ cái (Ledger) creation
  await tripService.transitionTripStatus(tripId, TripStatus.LOCKED, 2, 'MANAGER');
  console.log('4. Transitioned trip to LOCKED (Immutable Ledger rows generated).');
}

run().then(() => {
  console.log('E2E Lifecycle completed successfully.');
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
