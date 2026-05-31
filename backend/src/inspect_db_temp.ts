import { db } from './db';
import * as s from './db/schema';
import { isNull } from 'drizzle-orm';
import { getDashboardStats } from './services/reporting.service';

async function run() {
  const allTrips = await db.select().from(s.trips).where(isNull(s.trips.deletedAt));
  console.log(`Found ${allTrips.length} active trips:`);
  for (const t of allTrips) {
    console.log(`Trip ID: ${t.id}, Code: ${t.tripCode}, Departure: ${t.departureDate}, Status: ${t.status}, Rev: ${t.revenue}, Cost: ${t.totalCost}`);
  }
  
  const stats = await getDashboardStats();
  console.log('getDashboardStats() returned:', JSON.stringify(stats, null, 2));

  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
