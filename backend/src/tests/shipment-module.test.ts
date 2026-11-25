import { after, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { and, eq, gte, inArray, like, or } from 'drizzle-orm';
import { FeeGroup, Role, TripStatus } from '@tingting/shared';
import { db, client } from '../db';
import * as s from '../db/schema';
import {
  addShipmentCost,
  createShipment,
  getLotCostRegister,
  getShipmentById,
  getShipmentDetail,
  listShipments,
  updateShipment,
} from '../services/shipment.service';
import { setTripShipment } from '../services/trip-mutations.service';
import { getTripById } from '../services/trip-queries.service';
import { ApiError } from '../errors';
import { initEnforcer, getEnforcer } from '../casbin/enforcer';
import { disconnectRedis } from '../lib/redis';

/**
 * NEPO-61 — Lô hàng service tests (scoped): auto-code contract, cost
 * economics rollup, trip link invariants and the `shipments` Casbin matrix.
 * Real Postgres (test conventions: fixtures with unique suffixes, tracked
 * ids, after() cleanup). Migration 0132 must be applied first.
 */

const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const createdShipmentIds: number[] = [];
const createdCustomerIds: number[] = [];
const createdTripIds: number[] = [];
const testStartedAt = new Date(Date.now() - 5_000);

async function seedCustomer(name: string, shortName: string | null): Promise<typeof s.customers.$inferSelect> {
  const [row] = await db.insert(s.customers).values({
    name: `${name} ${suffix}`,
    shortName,
  }).returning();
  createdCustomerIds.push(row.id);
  return row;
}

async function seedTrip(customerId: number, shipmentId: number | null, totalCost: string | null): Promise<typeof s.trips.$inferSelect> {
  const [row] = await db.insert(s.trips).values({
    tripCode: `SH-${suffix}-${createdTripIds.length + 1}`.slice(0, 50),
    customerId,
    departureDate: '2026-11-20',
    status: TripStatus.CREATED,
    totalCost,
    carrierType: 'OWN',
  }).returning();
  createdTripIds.push(row.id);
  if (shipmentId != null) {
    await db.update(s.trips).set({ shipmentId }).where(eq(s.trips.id, row.id));
  }
  return row;
}

async function seedUser(role: Role): Promise<number> {
  const [row] = await db.insert(s.users).values({
    username: `sh-${role.toLowerCase()}-${suffix}`,
    passwordHash: 'x',
    role,
    fullName: `SH Test ${role}`,
  }).returning();
  return row.id;
}
void seedUser;

after(async () => {
  if (createdTripIds.length > 0) {
    await db.delete(s.trips).where(inArray(s.trips.id, createdTripIds));
  }
  if (createdShipmentIds.length > 0) {
    await db.delete(s.billingDocuments).where(inArray(s.billingDocuments.shipmentId, createdShipmentIds));
    await db.delete(s.shipmentCosts).where(inArray(s.shipmentCosts.shipmentId, createdShipmentIds));
    await db.delete(s.shipmentDocuments).where(inArray(s.shipmentDocuments.shipmentId, createdShipmentIds));
    await db.delete(s.shipments).where(inArray(s.shipments.id, createdShipmentIds));
  }
  if (createdCustomerIds.length > 0) {
    await db.delete(s.customers).where(inArray(s.customers.id, createdCustomerIds));
  }
  await db.delete(s.auditLogs).where(gte(s.auditLogs.createdAt, testStartedAt));
  await db.delete(s.users).where(or(
    like(s.users.username, `sh-admin-${suffix}%`),
    like(s.users.username, `sh-forwarder-${suffix}%`),
    like(s.users.username, `sh-dispatcher-${suffix}%`),
    like(s.users.username, `sh-accountant-${suffix}%`),
  ));
  await disconnectRedis();
  await client.end();
});

describe('NEPO-61 shipment auto-code', () => {
  test('generates [Mã KH][Năm][STT] per customer with independent sequences', async () => {
    const mct = await seedCustomer('Công ty TNHH Mộc Trà', 'MCT');
    const tmt = await seedCustomer('Công ty TMT', 'TMT');

    const first = await createShipment({ customerId: mct.id }, null);
    createdShipmentIds.push(first.id);
    const second = await createShipment({ customerId: mct.id }, null);
    createdShipmentIds.push(second.id);
    const other = await createShipment({ customerId: tmt.id }, null);
    createdShipmentIds.push(other.id);

    const year = String(new Date().getFullYear() % 100).padStart(2, '0');
    assert.match(first.shipmentCode, new RegExp(`^MCT${year}\\d{3,}$`));
    assert.match(second.shipmentCode, new RegExp(`^MCT${year}\\d{3,}$`));
    const seqOf = (code: string) => Number(code.slice(3 + year.length));
    assert.equal(seqOf(second.shipmentCode), seqOf(first.shipmentCode) + 1);
    assert.match(other.shipmentCode, new RegExp(`^TMT${year}001$`));
    // Flow type + customer denormalization travel with the row.
    assert.equal(first.customerId, mct.id);
  });

  test('auto-generates Mã KH for an existing customer missing one (no block)', async () => {
    const noShort = await seedCustomer('Khách không có tên viết tắt', null);
    const shipment = await createShipment({ customerId: noShort.id }, null);
    createdShipmentIds.push(shipment.id);
    const year = String(new Date().getFullYear() % 100).padStart(2, '0');
    // seedCustomer appends ` ${suffix}`; identity tokens join to
    // "KHACHKHONG…" and the 6-char cap yields KHACHK.
    assert.match(shipment.shipmentCode, new RegExp(`^KHACHK${year}\\d{3,}$`));
    // The generated Mã KH persists — the customer now owns a stable code.
    const [refreshed] = await db.select({ shortName: s.customers.shortName })
      .from(s.customers).where(eq(s.customers.id, noShort.id));
    assert.equal(refreshed.shortName, 'KHACHK');
  });

  test('derived Mã KH collision gets a numeric suffix, codes stay distinct', async () => {
    const nam = await seedCustomer('Beta Logistics Nam', null);
    const bac = await seedCustomer('Beta Logistics Bac', null);
    const first = await createShipment({ customerId: nam.id }, null);
    createdShipmentIds.push(first.id);
    const second = await createShipment({ customerId: bac.id }, null);
    createdShipmentIds.push(second.id);
    const [refreshedNam] = await db.select({ shortName: s.customers.shortName })
      .from(s.customers).where(eq(s.customers.id, nam.id));
    const [refreshedBac] = await db.select({ shortName: s.customers.shortName })
      .from(s.customers).where(eq(s.customers.id, bac.id));
    assert.equal(refreshedNam.shortName, 'BETALO');
    assert.equal(refreshedBac.shortName, 'BETAL2');
    const year = String(new Date().getFullYear() % 100).padStart(2, '0');
    assert.notEqual(first.shipmentCode.slice(0, 6), second.shipmentCode.slice(0, 6));
    assert.match(first.shipmentCode, new RegExp(`^BETALO${year}`));
    assert.match(second.shipmentCode, new RegExp(`^BETAL2${year}`));
  });

  test('FORWARDER lot create never blocked by an underivable name — deterministic id-based prefix, shortName untouched', async () => {
    // A name with no usable tokens defeats the legal-name derivation. Insert
    // directly (seedCustomer's unique suffix would tokenize and become usable).
    const [row] = await db.insert(s.customers).values({ name: '!!! ???' }).returning();
    createdCustomerIds.push(row.id);
    const shipment = await createShipment({ customerId: row.id }, null, Role.FORWARDER);
    createdShipmentIds.push(shipment.id);
    const year = String(new Date().getFullYear() % 100).padStart(2, '0');
    const fallbackPrefix = `K${row.id.toString(36).toUpperCase()}`.slice(0, 6);
    assert.match(shipment.shipmentCode, new RegExp(`^${fallbackPrefix}${year}\\d{3,}$`));
    // The fallback is not persisted — shortName stays a display label (null),
    // so dense grids keep showing the legal name.
    const [refreshed] = await db.select({ shortName: s.customers.shortName })
      .from(s.customers).where(eq(s.customers.id, row.id));
    assert.equal(refreshed.shortName, null);
  });

  test('internal role keeps the underivable-name guard — error message names no Mã KH', async () => {
    const [row] = await db.insert(s.customers).values({ name: '??? !!!' }).returning();
    createdCustomerIds.push(row.id);
    await assert.rejects(
      () => createShipment({ customerId: row.id }, null, Role.ADMIN),
      (error: unknown) => {
        assert.ok(error instanceof ApiError);
        assert.equal(error.statusCode, 400);
        assert.ok(!error.message.includes('Mã KH'));
        assert.match(error.message, /tên viết tắt/);
        return true;
      },
    );
  });

  test('rejects moving a lô to another customer (code encodes Mã KH)', async () => {
    const mct = await seedCustomer('Mộc Trà giữ lô', 'MCT');
    const tmt = await seedCustomer('TMT nhận nhầm lô', 'TMT');
    const shipment = await createShipment({ customerId: mct.id }, null);
    createdShipmentIds.push(shipment.id);
    await assert.rejects(
      () => updateShipment(shipment.id, { customerId: tmt.id }),
      (error: unknown) => error instanceof ApiError && error.statusCode === 400,
    );
  });

  test('list search hits mã lô, booking và tên khách', async () => {
    const mct = await seedCustomer('Mộc Trà tìm kiếm', 'MCT');
    const shipment = await createShipment({ customerId: mct.id, bookingNo: `BOOK-${suffix}` }, null);
    createdShipmentIds.push(shipment.id);

    const byCode = await listShipments({ search: shipment.shipmentCode });
    assert.ok(byCode.items.some((row) => row.id === shipment.id));
    const byBooking = await listShipments({ search: `BOOK-${suffix}` });
    assert.ok(byBooking.items.some((row) => row.id === shipment.id));
    const byCustomer = await listShipments({ search: 'Mộc Trà tìm kiếm' });
    assert.ok(byCustomer.items.some((row) => row.id === shipment.id));
  });
});

describe('NEPO-61 lô profit rollup', () => {
  test('collect/pay split excludes awaiting-invoice rows; trip cost flows in', async () => {
    const mct = await seedCustomer('Mộc Trà lợi nhuận', 'MCT');
    const shipment = await createShipment({ customerId: mct.id }, null);
    createdShipmentIds.push(shipment.id);

    // Thu khách 30M (collect), Trả NCC 1M (pay), chờ hóa đơn 5M (excluded).
    // The 1M pay row is a non-LINE_ADVANCE group on purpose: normal supplier
    // fees keep counting — only nộp hộ (NEPO-68) is excluded, see next test.
    await addShipmentCost(shipment.id, {
      costType: FeeGroup.OCEAN_FREIGHT, direction: 'CUSTOMER', serviceMode: 'SERVICE',
      description: 'Cước biển thu khách', currency: 'VND', amount: 30_000_000,
      vatRate: 0.08, awaitingInvoice: false, incurredDate: '2026-11-20',
    }, null);
    await addShipmentCost(shipment.id, {
      costType: FeeGroup.CUSTOMS_SERVICE, direction: 'SUPPLIER', serviceMode: 'SERVICE',
      description: 'Phí DV hải quan', currency: 'VND', amount: 1_000_000,
      vatRate: 0.08, awaitingInvoice: false, incurredDate: '2026-11-20',
    }, null);
    await addShipmentCost(shipment.id, {
      costType: FeeGroup.LIFTING, direction: 'SUPPLIER', serviceMode: 'SERVICE',
      description: 'Nâng hạ chờ hóa đơn', currency: 'VND', amount: 5_000_000,
      vatRate: 0.08, awaitingInvoice: true, incurredDate: '2026-11-20',
    }, null);

    // Trip running cost flows automatically: totalCost 18M.
    await seedTrip(mct.id, shipment.id, '18000000');

    const detail = await getShipmentDetail(shipment.id);
    assert.equal(detail.profit.collectTotal, 30_000_000);
    assert.equal(detail.profit.payTotal, 1_000_000);
    assert.equal(detail.profit.tripCosts, 18_000_000);
    assert.equal(detail.profit.revenueInclVat, 0);
    assert.equal(detail.profit.profit, -19_000_000);
    assert.equal(detail.profit.linkedTripCount, 1);
    assert.equal(detail.trips.length, 1);
  });

  test('NEPO-68 — nộp hộ (LINE_ADVANCE) chỉ đối soát, không vào lợi nhuận lô', async () => {
    const mct = await seedCustomer('Mộc Trà nộp hộ', 'NPH');
    const shipment = await createShipment({ customerId: mct.id }, null);
    createdShipmentIds.push(shipment.id);

    // Ticket numbers: LINE_ADVANCE 2M + nâng hạ trả NCC 300k + Thu 13.1M.
    await addShipmentCost(shipment.id, {
      costType: FeeGroup.LINE_ADVANCE, direction: 'SUPPLIER', serviceMode: 'ADVANCE',
      description: 'Nộp hộ hãng tàu', currency: 'VND', amount: 2_000_000,
      vatRate: 0.08, awaitingInvoice: false, incurredDate: '2026-11-20',
    }, null);
    await addShipmentCost(shipment.id, {
      costType: FeeGroup.LIFTING, direction: 'SUPPLIER', serviceMode: 'SERVICE',
      description: 'Phí nâng hạ trả NCC', currency: 'VND', amount: 300_000,
      vatRate: 0.08, awaitingInvoice: false, incurredDate: '2026-11-20',
    }, null);
    await db.insert(s.billingDocuments).values({
      type: 'DEBIT_NOTE', entityType: 'CUSTOMER', entityId: mct.id,
      shipmentId: shipment.id, rangeFrom: '2026-11-20', rangeTo: '2026-11-20',
      totalInclVat: '13100000',
    });

    const detail = await getShipmentDetail(shipment.id);
    assert.equal(detail.profit.revenueInclVat, 13_100_000);
    assert.equal(detail.profit.payTotal, 300_000, 'Chi trả NCC excludes nộp hộ');
    assert.equal(detail.profit.profit, 12_800_000, '13.1M Thu − 300k Chi Trả NCC');

    // Đối soát KHÔNG đổi: register vẫn nắm đủ cả dòng nộp hộ.
    const register = await getLotCostRegister(shipment.id);
    assert.equal(register.totals.pay, 2_300_000);
    const advanceGroup = register.groups.find((g) => g.group === FeeGroup.LINE_ADVANCE);
    assert.equal(advanceGroup?.rows.length, 1, 'nộp hộ row still listed');
    assert.equal(advanceGroup?.payTotal, 2_000_000);
  });
});

describe('NEPO-61 trip ⇄ lô link invariants', () => {
  test('same-customer link works; cross-customer and LOCKED trips reject', async () => {
    const mct = await seedCustomer('Mộc Trà gắn chuyến', 'MCT');
    const tmt = await seedCustomer('TMT khác khách', 'TMT');
    const shipment = await createShipment({ customerId: mct.id }, null);
    createdShipmentIds.push(shipment.id);
    const trip = await seedTrip(mct.id, null, null);
    const lockedTrip = await seedTrip(tmt.id, null, null);
    await db.update(s.trips).set({ status: TripStatus.LOCKED }).where(eq(s.trips.id, lockedTrip.id));

    await setTripShipment(trip.id, shipment.id);
    const linked = await getTripById(trip.id);
    assert.equal(linked?.shipmentId, shipment.id);
    assert.equal(linked?.shipmentCode, shipment.shipmentCode);

    // Track BEFORE asserting so a passing 400 still cleans up the fixture.
    const tmtShipment = await createShipment({ customerId: tmt.id }, null);
    createdShipmentIds.push(tmtShipment.id);
    await assert.rejects(
      () => setTripShipment(trip.id, tmtShipment.id),
      (error: unknown) => error instanceof ApiError && error.statusCode === 400,
    );
    await assert.rejects(
      () => setTripShipment(lockedTrip.id, shipment.id),
      (error: unknown) => error instanceof ApiError && error.statusCode === 400,
    );
    // Gỡ liên kết.
    await setTripShipment(trip.id, null);
    const unlinked = await getTripById(trip.id);
    assert.equal(unlinked?.shipmentId ?? null, null);
  });
});

describe('NEPO-61 shipments Casbin matrix', () => {
  test('FORWARDER (Ops biển) writes; ACCOUNTANT reads; DISPATCHER reads; DRIVER nothing', async () => {
    await initEnforcer();
    const enforcer = getEnforcer();
    assert.ok(await enforcer.enforce(Role.FORWARDER, 'shipments', 'write'));
    assert.ok(await enforcer.enforce(Role.FORWARDER, 'shipments', 'read'));
    assert.ok(await enforcer.enforce(Role.MANAGER, 'shipments', 'write'));
    assert.ok(await enforcer.enforce(Role.ACCOUNTANT, 'shipments', 'read'));
    // Kế toán: read-only trên policy.csv — route-level SHIPMENT_WRITE_ROLES
    // không bao giờ được hỏi vì mount casbinAuthz chặn write trước (403).
    assert.ok(!(await enforcer.enforce(Role.ACCOUNTANT, 'shipments', 'write')));
    assert.ok(await enforcer.enforce(Role.DISPATCHER, 'shipments', 'read'));
    assert.ok(!(await enforcer.enforce(Role.DISPATCHER, 'shipments', 'write')));
    assert.ok(!(await enforcer.enforce(Role.DRIVER, 'shipments', 'read')));
  });

  test('soft-deleted shipments disappear from reads', async () => {
    const mct = await seedCustomer('Mộc Trà soft delete', 'MCT');
    const shipment = await createShipment({ customerId: mct.id }, null);
    createdShipmentIds.push(shipment.id);
    await db.update(s.shipments).set({ deletedAt: new Date() })
      .where(and(eq(s.shipments.id, shipment.id)));
    await assert.rejects(() => getShipmentById(shipment.id), ApiError);
  });
});
