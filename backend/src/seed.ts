import bcrypt from 'bcryptjs';
import { db } from './db';
import * as s from './db/schema';
import { eq, sql, or } from 'drizzle-orm';
import { Role, TruckStatus, DriverStatus, TrailerType, TripStatus, FuelMode } from '@nepocorp/shared';

async function getOrCreate(table: any, uniqueKey: string, value: any, data: Record<string, unknown>) {
  const [existing] = await db.select().from(table).where(eq(table[uniqueKey], value)).limit(1);
  if (existing) return existing;
  const [created] = await db.insert(table).values(data).returning();
  return created;
}

async function seed() {
  console.log('Seeding database...');

  // Users
  const userDefs = [
    { username: 'admin', email: 'admin@nepo.vn', phone: '0900000001', passwordHash: await bcrypt.hash('admin123', 10), role: Role.ADMIN },
    { username: 'giamdoc', email: 'giamdoc@nepo.vn', phone: '0900000002', passwordHash: await bcrypt.hash('admin123', 10), role: Role.MANAGER },
    { username: 'ketoan', email: 'ketoan@nepo.vn', phone: '0900000003', passwordHash: await bcrypt.hash('admin123', 10), role: Role.ACCOUNTANT },
    { username: 'laixe', email: 'laixe@nepo.vn', phone: '0900000004', passwordHash: await bcrypt.hash('admin123', 10), role: Role.DRIVER },
  ];
  const userRows: any[] = [];
  for (const u of userDefs) {
    const [row] = await db.insert(s.users).values(u).onConflictDoNothing().returning();
    if (row) { userRows.push(row); }
    else {
      const [existing] = await db.select().from(s.users).where(
        or(eq(s.users.username, u.username), eq(s.users.email, u.email))
      ).limit(1);
      userRows.push(existing);
    }
  }
  const driverUser = userRows[3];

  // Config entities
  const c1 = await getOrCreate(s.customers, 'name', 'Công ty CP Vận tải ABC', { name: 'Công ty CP Vận tải ABC', contactInfo: '0901234567' });
  const c2 = await getOrCreate(s.customers, 'name', 'Công ty TNHH Logistics XYZ', { name: 'Công ty TNHH Logistics XYZ', contactInfo: '0912345678' });
  const c3 = await getOrCreate(s.customers, 'name', 'Công ty Xuất nhập khẩu DEF', { name: 'Công ty Xuất nhập khẩu DEF', contactInfo: '0923456789' });

  const t1 = await getOrCreate(s.trucks, 'licensePlate', '30A-12345', { licensePlate: '30A-12345', status: TruckStatus.ACTIVE });
  const t2 = await getOrCreate(s.trucks, 'licensePlate', '30A-67890', { licensePlate: '30A-67890', status: TruckStatus.ACTIVE });
  const t3 = await getOrCreate(s.trucks, 'licensePlate', '29C-11111', { licensePlate: '29C-11111', status: TruckStatus.ACTIVE });

  const tr1 = await getOrCreate(s.trailers, 'licensePlate', '30R-0001', { licensePlate: '30R-0001', type: TrailerType.FT40 });
  const tr2 = await getOrCreate(s.trailers, 'licensePlate', '30R-0002', { licensePlate: '30R-0002', type: TrailerType.FT20 });
  const tr3 = await getOrCreate(s.trailers, 'licensePlate', '30R-0003', { licensePlate: '30R-0003', type: TrailerType.FT40 });

  const d1 = await getOrCreate(s.drivers, 'phone', '0987654321', { name: 'Lê Văn Tài', phone: '0987654321', baseSalary: '8000000', assignedTruckId: t1.id, userId: driverUser?.id, status: DriverStatus.ACTIVE });
  const d2 = await getOrCreate(s.drivers, 'phone', '0976543210', { name: 'Phạm Đức Minh', phone: '0976543210', baseSalary: '8000000', assignedTruckId: t2.id, status: DriverStatus.ACTIVE });
  const d3 = await getOrCreate(s.drivers, 'phone', '0965432109', { name: 'Hoàng Nam', phone: '0965432109', baseSalary: '7500000', assignedTruckId: t3.id, status: DriverStatus.ACTIVE });

  const r1 = await getOrCreate(s.routes, 'name', 'Hà Nội - Hải Phòng', { name: 'Hà Nội - Hải Phòng', distanceKm: 120, isMountain: false });
  const r2 = await getOrCreate(s.routes, 'name', 'Hà Nội - Mộc Châu', { name: 'Hà Nội - Mộc Châu', distanceKm: 200, isMountain: true, fixedFuelAllowance: '240' });
  const r3 = await getOrCreate(s.routes, 'name', 'Hà Nội - Đà Nẵng', { name: 'Hà Nội - Đà Nẵng', distanceKm: 780, isMountain: false });
  const r4 = await getOrCreate(s.routes, 'name', 'Hà Nội - Sơn La', { name: 'Hà Nội - Sơn La', distanceKm: 320, isMountain: true, fixedFuelAllowance: '320' });

  const ct1 = await getOrCreate(s.cargoTypes, 'name', 'Container 40ft', { name: 'Container 40ft' });
  const ct2 = await getOrCreate(s.cargoTypes, 'name', 'Container 20ft', { name: 'Container 20ft' });
  const ct3 = await getOrCreate(s.cargoTypes, 'name', 'Hàng rời', { name: 'Hàng rời' });
  const ct4 = await getOrCreate(s.cargoTypes, 'name', 'Chè', { name: 'Chè', requiresPhotos: true });

  // Bulk data — only insert if tables are empty
  const [pc] = await db.select({ cnt: sql<number>`count(*)` }).from(s.pricingTables);
  if (Number(pc?.cnt ?? 0) === 0) {
    await db.insert(s.pricingTables).values([
      { customerId: c1.id, routeId: r1.id, price: '4500000' },
      { customerId: c1.id, routeId: r2.id, price: '6000000' },
      { customerId: c2.id, routeId: r1.id, price: '4200000' },
      { customerId: c2.id, routeId: r2.id, price: '5800000' },
      { customerId: c3.id, routeId: r3.id, price: '12000000' },
    ]);
  }

  const [ac] = await db.select({ cnt: sql<number>`count(*)` }).from(s.roadAllowances);
  if (Number(ac?.cnt ?? 0) === 0) {
    await db.insert(s.roadAllowances).values([
      { routeId: r1.id, trailerType: TrailerType.FT40, baseAmount: '950000' },
      { routeId: r1.id, trailerType: TrailerType.FT20, baseAmount: '850000' },
      { routeId: r2.id, trailerType: TrailerType.FT40, baseAmount: '1100000' },
      { routeId: r2.id, trailerType: TrailerType.FT20, baseAmount: '1000000' },
      { routeId: r3.id, trailerType: TrailerType.FT40, baseAmount: '2200000' },
      { routeId: r3.id, trailerType: TrailerType.FT20, baseAmount: '2000000' },
      { routeId: r4.id, trailerType: TrailerType.FT40, baseAmount: '1300000' },
      { routeId: r4.id, trailerType: TrailerType.FT20, baseAmount: '1150000' },
    ]);
  }

  const [rc] = await db.select({ cnt: sql<number>`count(*)` }).from(s.penaltyReasons);
  if (Number(rc?.cnt ?? 0) === 0) {
    await db.insert(s.penaltyReasons).values([
      { reasonText: 'Thiếu hóa đơn nhiên liệu', defaultAmount: '100000' },
      { reasonText: 'Đi sai tuyến', defaultAmount: '200000' },
      { reasonText: 'Đến trễ', defaultAmount: '150000' },
      { reasonText: 'Vi phạm an toàn giao thông', defaultAmount: '500000' },
    ]);
  }

  // Fuel config — singleton
  const [existingFuel] = await db.select().from(s.fuelConfig).limit(1);
  if (!existingFuel) {
    await db.insert(s.fuelConfig).values({ loadedNorm: '43', emptyNorm: '25', supplement: '3', unitPrice: '23000' });
  }

  // Sample trips - comprehensive real-life scenarios
  const [tc] = await db.select({ cnt: sql<number>`count(*)` }).from(s.trips);
  if (Number(tc?.cnt ?? 0) === 0) {
    const now = new Date();
    const baseDate = new Date(now.getTime() - 90 * 86400000); // 3 months ago

    await db.insert(s.trips).values([
      // ===== MONTH 1 (3 months ago) - Mixed results =====

      // 1. Normal profitable trip
      {
        customerId: c1.id, routeId: r1.id, truckId: t1.id, trailerId: tr1.id,
        driverId: d1.id, cargoTypeId: ct1.id,
        departureDate: new Date(baseDate.getTime() + 1 * 86400000).toISOString().slice(0, 10),
        status: TripStatus.LOCKED, revenue: '4500000', revenueOriginal: '4500000',
        fuelLiters: '85', totalFuelCost: '1955000', totalRoadAllowance: '950000',
        driverSalary: '500000', totalCost: '3405000', grossProfit: '1095000',
        fuelMode: FuelMode.AUTO, hasReturnCargo: false, fuelPriceApplied: '23000',
        fuelSupplementLiters: '0', tollsDiscount: '0', tollsAddition: '0', tollsStations: 0,
      },
      // 2. Mountain route loss
      {
        customerId: c2.id, routeId: r2.id, truckId: t2.id, trailerId: tr2.id,
        driverId: d2.id, cargoTypeId: ct4.id,
        departureDate: new Date(baseDate.getTime() + 3 * 86400000).toISOString().slice(0, 10),
        status: TripStatus.LOCKED, revenue: '6000000', revenueOriginal: '6000000',
        fuelLiters: '248', totalFuelCost: '5704000', totalRoadAllowance: '1100000',
        driverSalary: '700000', totalCost: '7504000', grossProfit: '-1504000',
        fuelMode: FuelMode.AUTO, hasReturnCargo: false, fuelPriceApplied: '23000',
        fuelSupplementLiters: '0', tollsDiscount: '0', tollsAddition: '0', tollsStations: 0,
      },
      // 3. Long distance profitable
      {
        customerId: c3.id, routeId: r3.id, truckId: t3.id, trailerId: tr3.id,
        driverId: d3.id, cargoTypeId: ct2.id,
        departureDate: new Date(baseDate.getTime() + 5 * 86400000).toISOString().slice(0, 10),
        status: TripStatus.LOCKED, revenue: '12000000', revenueOriginal: '12000000',
        fuelLiters: '315', totalFuelCost: '7245000', totalRoadAllowance: '2200000',
        driverSalary: '900000', totalCost: '10345000', grossProfit: '1655000',
        fuelMode: FuelMode.AUTO, hasReturnCargo: false, fuelPriceApplied: '23000',
        fuelSupplementLiters: '0', tollsDiscount: '0', tollsAddition: '0', tollsStations: 0,
      },
      // 4. Break-even trip
      {
        customerId: c1.id, routeId: r1.id, truckId: t1.id, trailerId: tr1.id,
        driverId: d1.id, cargoTypeId: ct1.id,
        departureDate: new Date(baseDate.getTime() + 8 * 86400000).toISOString().slice(0, 10),
        status: TripStatus.LOCKED, revenue: '4200000', revenueOriginal: '4500000',
        fuelLiters: '88', totalFuelCost: '2024000', totalRoadAllowance: '950000',
        driverSalary: '500000', totalCost: '3474000', grossProfit: '726000',
        fuelMode: FuelMode.AUTO, hasReturnCargo: false, fuelPriceApplied: '23000',
        fuelSupplementLiters: '0', tollsDiscount: '0', tollsAddition: '0', tollsStations: 0,
      },

      // ===== MONTH 2 (2 months ago) - Good month =====

      // 5. Very profitable with return cargo
      {
        customerId: c2.id, routeId: r1.id, truckId: t2.id, trailerId: tr2.id,
        driverId: d2.id, cargoTypeId: ct1.id,
        departureDate: new Date(baseDate.getTime() + 32 * 86400000).toISOString().slice(0, 10),
        status: TripStatus.LOCKED, revenue: '5800000', revenueOriginal: '4500000',
        fuelLiters: '80', totalFuelCost: '1840000', totalRoadAllowance: '850000',
        driverSalary: '500000', totalCost: '3190000', grossProfit: '2610000',
        fuelMode: FuelMode.AUTO, hasReturnCargo: true, fuelPriceApplied: '23000',
        fuelSupplementLiters: '0', tollsDiscount: '0', tollsAddition: '0', tollsStations: 0,
      },
      // 6. Mountain route with supplement
      {
        customerId: c1.id, routeId: r4.id, truckId: t3.id, trailerId: tr3.id,
        driverId: d3.id, cargoTypeId: ct3.id,
        departureDate: new Date(baseDate.getTime() + 35 * 86400000).toISOString().slice(0, 10),
        status: TripStatus.LOCKED, revenue: '8000000', revenueOriginal: '8000000',
        fuelLiters: '335', totalFuelCost: '7705000', totalRoadAllowance: '1300000',
        driverSalary: '850000', totalCost: '9855000', grossProfit: '-1855000',
        fuelMode: FuelMode.AUTO, hasReturnCargo: false, fuelPriceApplied: '23000',
        fuelSupplementLiters: '15', fuelSupplementReason: 'Đèo Cao - đường dốc',
        tollsDiscount: '0', tollsAddition: '0', tollsStations: 0,
      },
      // 7. Standard trip
      {
        customerId: c3.id, routeId: r1.id, truckId: t1.id, trailerId: tr1.id,
        driverId: d1.id, cargoTypeId: ct1.id,
        departureDate: new Date(baseDate.getTime() + 38 * 86400000).toISOString().slice(0, 10),
        status: TripStatus.LOCKED, revenue: '4600000', revenueOriginal: '4500000',
        fuelLiters: '83', totalFuelCost: '1909000', totalRoadAllowance: '950000',
        driverSalary: '500000', totalCost: '3359000', grossProfit: '1241000',
        fuelMode: FuelMode.AUTO, hasReturnCargo: false, fuelPriceApplied: '23000',
        fuelSupplementLiters: '0', tollsDiscount: '0', tollsAddition: '0', tollsStations: 0,
      },
      // 8. Multiple tolls
      {
        customerId: c2.id, routeId: r3.id, truckId: t3.id, trailerId: tr3.id,
        driverId: d3.id, cargoTypeId: ct2.id,
        departureDate: new Date(baseDate.getTime() + 41 * 86400000).toISOString().slice(0, 10),
        status: TripStatus.LOCKED, revenue: '12500000', revenueOriginal: '12000000',
        fuelLiters: '325', totalFuelCost: '7475000', totalRoadAllowance: '2200000',
        driverSalary: '900000', totalCost: '10575000', grossProfit: '1925000',
        fuelMode: FuelMode.AUTO, hasReturnCargo: false, fuelPriceApplied: '23000',
        fuelSupplementLiters: '0', tollsDiscount: '0', tollsAddition: '200000', tollsStations: 5,
      },
      // 9. Toll discount
      {
        customerId: c1.id, routeId: r1.id, truckId: t2.id, trailerId: tr2.id,
        driverId: d2.id, cargoTypeId: ct1.id,
        departureDate: new Date(baseDate.getTime() + 44 * 86400000).toISOString().slice(0, 10),
        status: TripStatus.LOCKED, revenue: '4400000', revenueOriginal: '4500000',
        fuelLiters: '86', totalFuelCost: '1978000', totalRoadAllowance: '850000',
        driverSalary: '500000', totalCost: '3328000', grossProfit: '1072000',
        fuelMode: FuelMode.AUTO, hasReturnCargo: false, fuelPriceApplied: '23000',
        fuelSupplementLiters: '0', tollsDiscount: '100000', tollsAddition: '0', tollsStations: 0,
      },

      // ===== MONTH 3 (last month) - Mixed with issues =====

      // 10. High fuel consumption warning
      {
        customerId: c2.id, routeId: r2.id, truckId: t1.id, trailerId: tr1.id,
        driverId: d1.id, cargoTypeId: ct4.id,
        departureDate: new Date(baseDate.getTime() + 60 * 86400000).toISOString().slice(0, 10),
        status: TripStatus.LOCKED, revenue: '6200000', revenueOriginal: '6000000',
        fuelLiters: '295', totalFuelCost: '6785000', totalRoadAllowance: '1100000',
        driverSalary: '700000', totalCost: '8585000', grossProfit: '-2385000',
        fuelMode: FuelMode.AUTO, hasReturnCargo: false, fuelPriceApplied: '23000',
        fuelSupplementLiters: '55', fuelSupplementReason: 'Xe cũ tiêu hao cao',
        tollsDiscount: '0', tollsAddition: '0', tollsStations: 0,
      },
      // 11. Canceled trip
      {
        customerId: c3.id, routeId: r3.id, truckId: t3.id, trailerId: tr3.id,
        driverId: d3.id, cargoTypeId: ct2.id,
        departureDate: new Date(baseDate.getTime() + 63 * 86400000).toISOString().slice(0, 10),
        status: TripStatus.CANCELED, notes: 'Khách hàng hủy chuyến gấp',
      },
      // 12. Very profitable long distance
      {
        customerId: c1.id, routeId: r3.id, truckId: t1.id, trailerId: tr1.id,
        driverId: d1.id, cargoTypeId: ct1.id,
        departureDate: new Date(baseDate.getTime() + 66 * 86400000).toISOString().slice(0, 10),
        status: TripStatus.LOCKED, revenue: '13000000', revenueOriginal: '12000000',
        fuelLiters: '310', totalFuelCost: '7130000', totalRoadAllowance: '2200000',
        driverSalary: '900000', totalCost: '10230000', grossProfit: '2770000',
        fuelMode: FuelMode.AUTO, hasReturnCargo: true, fuelPriceApplied: '23000',
        fuelSupplementLiters: '0', tollsDiscount: '0', tollsAddition: '0', tollsStations: 0,
      },
      // 13. Completed waiting approval
      {
        customerId: c2.id, routeId: r4.id, truckId: t2.id, trailerId: tr2.id,
        driverId: d2.id, cargoTypeId: ct3.id,
        departureDate: new Date(baseDate.getTime() + 69 * 86400000).toISOString().slice(0, 10),
        status: TripStatus.COMPLETED, revenue: '7800000', revenueOriginal: '7500000',
        fuelLiters: '285', totalFuelCost: '6555000', totalRoadAllowance: '1300000',
        driverSalary: '750000', totalCost: '8605000', grossProfit: '-805000',
        fuelMode: FuelMode.AUTO, hasReturnCargo: false, fuelPriceApplied: '23000',
        fuelSupplementLiters: '0', tollsDiscount: '0', tollsAddition: '0', tollsStations: 0,
      },
      // 14. Another completed
      {
        customerId: c3.id, routeId: r1.id, truckId: t3.id, trailerId: tr3.id,
        driverId: d3.id, cargoTypeId: ct2.id,
        departureDate: new Date(baseDate.getTime() + 72 * 86400000).toISOString().slice(0, 10),
        status: TripStatus.COMPLETED, revenue: '4700000', revenueOriginal: '4500000',
        fuelLiters: '84', totalFuelCost: '1932000', totalRoadAllowance: '950000',
        driverSalary: '500000', totalCost: '3382000', grossProfit: '1318000',
        fuelMode: FuelMode.AUTO, hasReturnCargo: false, fuelPriceApplied: '23000',
        fuelSupplementLiters: '0', tollsDiscount: '0', tollsAddition: '0', tollsStations: 0,
      },

      // ===== CURRENT MONTH - Active trips =====

      // 15. Currently in transit
      {
        customerId: c1.id, routeId: r1.id, truckId: t1.id, trailerId: tr1.id,
        driverId: d1.id, cargoTypeId: ct1.id,
        departureDate: new Date(now.getTime() - 2 * 86400000).toISOString().slice(0, 10),
        status: TripStatus.IN_TRANSIT,
      },
      // 16. Currently in transit - mountain route
      {
        customerId: c2.id, routeId: r2.id, truckId: t3.id, trailerId: tr3.id,
        driverId: d3.id, cargoTypeId: ct4.id,
        departureDate: new Date(now.getTime() - 1 * 86400000).toISOString().slice(0, 10),
        status: TripStatus.IN_TRANSIT,
      },
      // 17. Created, waiting dispatch
      {
        customerId: c3.id, routeId: r3.id, truckId: t2.id, trailerId: tr2.id,
        driverId: d2.id, cargoTypeId: ct2.id,
        departureDate: now.toISOString().slice(0, 10),
        status: TripStatus.CREATED,
        notes: 'Hàng 40ft vỏ rỗng, cần xe gấp',
      },
      // 18. Created, waiting dispatch
      {
        customerId: c1.id, routeId: r4.id, truckId: t1.id, trailerId: tr1.id,
        driverId: d1.id, cargoTypeId: ct3.id,
        departureDate: now.toISOString().slice(0, 10),
        status: TripStatus.CREATED,
      },
      // 19. Created, waiting dispatch - urgent
      {
        customerId: c2.id, routeId: r1.id, truckId: t2.id, trailerId: tr2.id,
        driverId: d2.id, cargoTypeId: ct1.id,
        departureDate: now.toISOString().slice(0, 10),
        status: TripStatus.CREATED,
        notes: 'Khách hàng VIP, cần xuất phát 14:00 hôm nay',
      },
      // 20. Created, waiting dispatch
      {
        customerId: c3.id, routeId: r2.id, truckId: t3.id, trailerId: tr3.id,
        driverId: d3.id, cargoTypeId: ct4.id,
        departureDate: new Date(now.getTime() + 1 * 86400000).toISOString().slice(0, 10),
        status: TripStatus.CREATED,
      },
    ]);
  }

  console.log('Seed complete!');
  console.log('Login credentials:');
  console.log('  Admin:      admin / admin123');
  console.log('  Giám đốc:   giamdoc / admin123');
  console.log('  Kế toán:    ketoan / admin123');
  console.log('  Lái xe:     laixe / admin123');
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
