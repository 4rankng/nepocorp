import bcrypt from 'bcryptjs';
import { db } from '../db';
import * as s from '../db/schema';
import { eq, sql, or } from 'drizzle-orm';
import { Role, TruckStatus, DriverStatus, TrailerType, TripStatus, FuelMode } from '@nepocorp/shared';
import { users } from './users';
import { customers } from './customers';
import { trucks } from './trucks';
import { trailers } from './trailers';
import { drivers } from './drivers';
import { routes } from './routes';
import { cargoTypes } from './cargo-types';
import { pricingTables } from './pricing';
import { roadAllowances } from './road-allowances';
import { penaltyReasons } from './penalties';
import { fuelConfig } from './fuel-config';
import { trips } from './trips';
import { capTableHistory } from './cap-table';
import { managementFees } from './management-fees';

async function getOrCreate(table: any, uniqueKey: string, value: any, data: Record<string, unknown>) {
  const [existing] = await db.select().from(table).where(eq(table[uniqueKey], value)).limit(1);
  if (existing) return existing;
  const [created] = await db.insert(table).values(data).returning();
  return created;
}

async function seed() {
  console.log('🌱 Seeding database with realistic data...');

  // Users
  console.log('👥 Seeding users...');
  const userMap: Record<string, any> = {};
  for (const u of users) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    const [row] = await db.insert(s.users).values({
      username: u.username,
      email: u.email,
      phone: u.phone,
      passwordHash,
      role: u.role as any,
    }).onConflictDoNothing().returning();
    if (!row) {
      const [existing] = await db.select().from(s.users).where(
        or(eq(s.users.username, u.username), eq(s.users.email, u.email))
      ).limit(1);
      userMap[u.username] = existing;
    } else {
      userMap[u.username] = row;
    }
  }

  // Customers
  console.log('🏢 Seeding customers...');
  const customerMap: Record<string, any> = {};
  for (const c of customers) {
    customerMap[c.name] = await getOrCreate(s.customers, 'name', c.name, c);
  }

  // Trucks
  console.log('🚛 Seeding trucks...');
  const truckMap: Record<string, any> = {};
  for (const t of trucks) {
    truckMap[t.licensePlate] = await getOrCreate(s.trucks, 'licensePlate', t.licensePlate, t);
  }

  // Trailers
  console.log('🚛 Seeding trailers...');
  const trailerMap: Record<string, any> = {};
  for (const t of trailers) {
    trailerMap[t.licensePlate] = await getOrCreate(s.trailers, 'licensePlate', t.licensePlate, t);
  }

  // Drivers
  console.log('👨‍✈️ Seeding drivers...');
  const driverMap: Record<string, any> = {};
  for (const d of drivers) {
    const assignedTruckId = d.assignedTruck ? truckMap[d.assignedTruck]?.id : null;
    const userId = d.username ? userMap[d.username]?.id : null;
    driverMap[d.name] = await getOrCreate(s.drivers, 'phone', d.phone, {
      name: d.name,
      phone: d.phone,
      baseSalary: d.baseSalary,
      assignedTruckId,
      userId,
      status: d.status,
    });
  }

  // Routes
  console.log('🛣️ Seeding routes...');
  const routeMap: Record<string, any> = {};
  for (const r of routes) {
    routeMap[r.name] = await getOrCreate(s.routes, 'name', r.name, r);
  }

  // Cargo types
  console.log('📦 Seeding cargo types...');
  const cargoTypeMap: Record<string, any> = {};
  for (const ct of cargoTypes) {
    cargoTypeMap[ct.name] = await getOrCreate(s.cargoTypes, 'name', ct.name, ct);
  }

  // Check if pricing tables exist
  const [pc] = await db.select({ cnt: sql<number>`count(*)` }).from(s.pricingTables);
  if (Number(pc?.cnt ?? 0) === 0) {
    console.log('💰 Seeding pricing tables...');
    await db.insert(s.pricingTables).values(
      pricingTables.map(p => ({
        customerId: customerMap[p.customerName]?.id,
        routeId: routeMap[p.routeName]?.id,
        price: p.price,
      }))
    );
  }

  // Check if road allowances exist
  const [ac] = await db.select({ cnt: sql<number>`count(*)` }).from(s.roadAllowances);
  if (Number(ac?.cnt ?? 0) === 0) {
    console.log('🛣️ Seeding road allowances...');
    await db.insert(s.roadAllowances).values(
      roadAllowances.map(ra => ({
        routeId: routeMap[ra.routeName]?.id,
        trailerType: ra.trailerType,
        baseAmount: ra.baseAmount,
      }))
    );
  }

  // Check if penalty reasons exist
  const [rc] = await db.select({ cnt: sql<number>`count(*)` }).from(s.penaltyReasons);
  if (Number(rc?.cnt ?? 0) === 0) {
    console.log('⚠️ Seeding penalty reasons...');
    await db.insert(s.penaltyReasons).values(penaltyReasons);
  }

  // Check if fuel config exists
  const [existingFuel] = await db.select().from(s.fuelConfig).limit(1);
  if (!existingFuel) {
    console.log('⛽ Seeding fuel config...');
    await db.insert(s.fuelConfig).values(fuelConfig);
  }

  // Check if road config exists
  const [existingRoadCfg] = await db.select().from(s.roadConfig).limit(1);
  if (!existingRoadCfg) {
    console.log('🛣️ Seeding road config...');
    await db.insert(s.roadConfig).values({
      tollPerStation: '55000',
      returnCargoBonus: '300000',
    });
  }

  // Check if trips exist
  const [tc] = await db.select({ cnt: sql<number>`count(*)` }).from(s.trips);
  if (Number(tc?.cnt ?? 0) === 0) {
    console.log('🚚 Seeding trips...');
    await db.insert(s.trips).values(
      trips.map(t => ({
        customerId: customerMap[t.customerName]?.id,
        routeId: routeMap[t.routeName]?.id,
        truckId: truckMap[t.truckPlate]?.id,
        trailerId: trailerMap[t.trailerPlate]?.id,
        driverId: driverMap[t.driverName]?.id,
        cargoTypeId: cargoTypeMap[t.cargoType]?.id,
        ...t.data,
      }))
    );
  }

  // Check if cap table history exists
  const [ctc] = await db.select({ cnt: sql<number>`count(*)` }).from(s.capTableHistory);
  if (Number(ctc?.cnt ?? 0) === 0) {
    console.log('📊 Seeding cap table history...');
    await db.insert(s.capTableHistory).values(capTableHistory);
  }

  // Check if management fees exist
  const [mfc] = await db.select({ cnt: sql<number>`count(*)` }).from(s.managementFees);
  if (Number(mfc?.cnt ?? 0) === 0) {
    console.log('💼 Seeding management fees...');
    await db.insert(s.managementFees).values(managementFees);
  }

  console.log('✅ Seed complete!');
  console.log('');
  console.log('🔑 Login credentials:');
  console.log('  Admin:      admin / admin123');
  console.log('  Giám đốc:   giamdoc / admin123');
  console.log('  Kế toán:    ketoan / admin123');
  console.log('  Lái xe:     laixe / admin123');
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
