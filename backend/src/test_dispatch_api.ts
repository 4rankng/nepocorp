import { db } from './db';
import * as s from './db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { TripStatus, Role } from '@nepocorp/shared';
import jwt from 'jsonwebtoken';
import { config } from './config';

async function diagnose() {
  console.log('--- STARTING DISPATCH ROUTE DIAGNOSTIC ---');
  
  // Find a CREATED trip to test with
  const [trip] = await db.select()
    .from(s.trips)
    .where(and(eq(s.trips.status, TripStatus.CREATED), isNull(s.trips.deletedAt)))
    .limit(1);

  if (!trip) {
    console.log('No CREATED trips found to test with in the database.');
    return;
  }
  
  console.log(`Found CREATED trip: ID = ${trip.id}, Code = ${trip.tripCode}`);

  // Retrieve 'giamdoc' user
  const [giamdoc] = await db.select()
    .from(s.users)
    .where(eq(s.users.username, 'giamdoc'))
    .limit(1);

  if (!giamdoc) {
    console.error('Error: "giamdoc" user not found in the database.');
    return;
  }

  console.log(`Found giamdoc user: ID = ${giamdoc.id}, Role = ${giamdoc.role}`);

  // Generate JWT token
  const token = jwt.sign(
    { userId: giamdoc.id, username: giamdoc.username, role: giamdoc.role },
    config.jwtSecret,
    { expiresIn: '1h' }
  );

  console.log('Generated mock JWT token for giamdoc.');

  // Fire local HTTP request to the active backend (port 3090)
  try {
    const url = `http://localhost:3090/api/trips/${trip.id}/dispatch`;
    console.log(`Sending POST request to ${url}...`);

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    const responseText = await res.text();
    console.log(`HTTP Status: ${res.status}`);
    console.log(`Response: ${responseText}`);

  } catch (err: any) {
    console.error('HTTP Request failed:', err.message);
  }
}

diagnose().then(() => {
  console.log('--- DIAGNOSTIC COMPLETE ---');
  process.exit(0);
}).catch(err => {
  console.error('Unexpected diagnostic error:', err);
  process.exit(1);
});
