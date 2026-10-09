/**
 * Attribute fuel that never reached a payable ledger to a supplier.
 *
 * A trip with `fuel_liters > 0` but no `fuel_supplier_id` and no
 * `trip_fuel_allocations` row posts NO FUEL_EXPENSE entry at completion —
 * LedgerService keys the fallback on `trip.fuelSupplierId`, so a null id drops
 * the cost silently. The fuel exists (the trip even carries
 * `total_fuel_cost`), but it appears on no bảng kê and no công nợ.
 *
 * September 2026 (PETROLIMEX) had exactly one: TRP-202609-0048, 152 lít,
 * 4.550.880đ. Finding it is what closed the gap between the app's
 * departure-basis total and the supplier's own statement.
 *
 * Dry-run is the default. Writes need both `--apply` and `--i-have-signoff`.
 * Scope is deliberately narrow — it only touches trips that currently post
 * nothing, and it refuses if the trip already has any fuel ledger rows, so it
 * cannot double-post a cost that was already booked.
 *
 * Usage:
 *   npx tsx scripts/attribute-unassigned-fuel.ts --dry-run
 *   npx tsx scripts/attribute-unassigned-fuel.ts --apply --i-have-signoff
 *   npx tsx scripts/attribute-unassigned-fuel.ts --apply --i-have-signoff --supplier-id 10
 */
import { and, eq, isNull, sql } from 'drizzle-orm';
import { db, client } from '../src/db';
import * as s from '../src/db/schema';
import { LedgerService } from '../src/services/ledger.service';
import { TxnType } from '@tingting/shared';

const APPLY = process.argv.includes('--apply');
const HAVE_SIGNOFF = process.argv.includes('--i-have-signoff');
const WRITE_MODE = APPLY && HAVE_SIGNOFF;

function flagValue(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

const supplierFlag = flagValue('supplier-id');
let defaultSupplierId: number | null = null;
if (supplierFlag !== undefined) {
  defaultSupplierId = Number(supplierFlag);
  if (!Number.isInteger(defaultSupplierId) || defaultSupplierId <= 0) {
    console.error(`--supplier-id không hợp lệ: ${supplierFlag}`);
    process.exit(1);
  }
}

const DRY = !WRITE_MODE;

async function main() {
  const fuelSuppliers = await db.select({ id: s.suppliers.id, name: s.suppliers.name })
    .from(s.suppliers).where(eq(s.suppliers.isFuelSupplier, true));
  const supplierNameById = new Map(fuelSuppliers.map((r) => [r.id, r.name]));

  // Candidate trips: drew fuel, never assigned a supplier, and — critically —
  // attached to a live truck. Orphaned trips (truck row gone) are junk data
  // rather than un-invoiced deliveries; touching them would pollute the ledger.
  const candidates = await db.select({
    id: s.trips.id,
    tripCode: s.trips.tripCode,
    departureDate: s.trips.departureDate,
    licensePlate: s.trucks.licensePlate,
    status: s.trips.status,
    fuelLiters: s.trips.fuelLiters,
    totalFuelCost: s.trips.totalFuelCost,
    fuelActualUnitPrice: s.trips.fuelActualUnitPrice,
    supplierId: s.trips.fuelSupplierId,
  })
    .from(s.trips)
    .innerJoin(s.trucks, eq(s.trips.truckId, s.trucks.id))
    .where(and(
      isNull(s.trips.fuelSupplierId),
      isNull(s.trucks.deletedAt),
      sql`${s.trips.fuelLiters} > 0`,
    ))
    .orderBy(s.trips.departureDate, s.trips.id);

  console.log(`Tìm thấy ${candidates.length} chuyến có nhiên liệu nhưng chưa gán nhà cung cấp.`);
  if (candidates.length === 0) {
    console.log('Không có gì cần sửa.');
    return;
  }

  let applied = 0;
  let skipped = 0;

  for (const trip of candidates) {
    // Never touch a trip that already posts fuel — this is a repair for the
    // silent-skip case, not a way to re-book an existing cost.
    const existing = await db.select({ id: s.ledger.id })
      .from(s.ledger)
      .where(and(
        eq(s.ledger.entityType, 'VENDOR'),
        eq(s.ledger.txnId, trip.id),
        sql`${s.ledger.txnType} in ('FUEL_EXPENSE','UNLOCK_REVERSAL')`,
      ));
    if (existing.length > 0) {
      console.log(`  BỎ QUA ${trip.tripCode} — đã có ${existing.length} dòng nhiên liệu trong sổ.`);
      skipped++;
      continue;
    }

    const allocationCount = await db.select({ n: sql<number>`count(*)::int` })
      .from(s.tripFuelAllocations).where(eq(s.tripFuelAllocations.tripId, trip.id));
    if ((allocationCount[0]?.n ?? 0) > 0) {
      console.log(`  BỎ QUA ${trip.tripCode} — đã có dòng phân bổ nhiên liệu (mua tiền mặt).`);
      skipped++;
      continue;
    }

    const supplierId = defaultSupplierId;
    if (supplierId === null) {
      const label = `${trip.tripCode ?? trip.id} · ${trip.departureDate} · ${trip.licensePlate ?? '?'} · ${trip.fuelLiters} lít`;
      console.log(`  CẦN CHỈ ĐỊNH: ${label}`);
      console.log(`      chạy lại với --supplier-id <id> để gán nhà cung cấp cho chuyến này`);
      continue;
    }
    if (!supplierNameById.has(supplierId)) {
      console.error(`  NCC ${supplierId} không phải nhà cung cấp nhiên liệu (is_fuel_supplier = false).`);
      process.exitCode = 1;
      continue;
    }

    const liters = Number(trip.fuelLiters ?? 0);
    const unitPrice = Number(trip.fuelActualUnitPrice ?? 0);
    const amount = Number(trip.totalFuelCost ?? 0);

    if (DRY) {
      console.log(`  [DRY] ${trip.tripCode} → NCC ${supplierId} (${supplierNameById.get(supplierId)}): `
        + `${liters} lít${unitPrice ? ` × ${unitPrice.toLocaleString('vi-VN')}đ` : ''} = ${amount.toLocaleString('vi-VN')}đ`);
      continue;
    }

    // One transaction: assign the supplier, record the allocation, then let
    // LedgerService post the payable exactly as it would on a fresh completion
    // so the amount matches whatever the trip already carries.
    await db.transaction(async (tx) => {
      await tx.update(s.trips)
        .set({ fuelSupplierId: supplierId, updatedAt: new Date() })
        .where(eq(s.trips.id, trip.id));
      await tx.insert(s.tripFuelAllocations).values({
        tripId: trip.id,
        supplierId,
        liters: String(liters),
        unitPrice: unitPrice || null,
        paymentMethod: 'CREDIT',
      });
      const [fresh] = await tx.select().from(s.trips).where(eq(s.trips.id, trip.id));
      await LedgerService.postTripEntries(tx, fresh);
    });

    console.log(`  ĐÃ SỬA ${trip.tripCode}: gán NCC ${supplierId}, ghi ${amount.toLocaleString('vi-VN')}đ vào công nợ.`);
    applied++;
  }

  console.log('');
  console.log(`Tóm tắt: sửa ${applied}, bỏ qua ${skipped}${DRY ? ' (chế độ dry-run — chưa ghi gì)' : ''}.`);
  if (DRY && (applied + skipped) > 0) {
    console.log('Chạy lại với --apply --i-have-signoff để ghi vào database.');
  }
}

main()
  .then(() => client.end())
  .catch(async (err) => {
    console.error('Lỗi:', err);
    await client.end();
    process.exit(1);
  });