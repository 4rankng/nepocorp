// Sổ cái service — one consolidated dispatch/accounting row per trip.
//
// Read path assembles the flat LedgerRow the /ledger grid renders: plan
// columns, revenue components, per-container cross-check payloads, advances /
// settlements reached through settlement_expenses → trip_expenses, cost
// figures, and computed results. Write paths are thin group-scoped dispatchers
// over the EXISTING mutation services (updateTripFigures, container/seal
// batches) so every accounting invariant — recomputation, ledger posting on
// COMPLETED, version-guarded optimistic concurrency — stays in one place.
// No posting rules are added or changed here.

import { db } from '../db';
import * as s from '../db/schema';
import { and, asc, desc, eq, gte, inArray, isNull, lte, or, sql, type SQL } from 'drizzle-orm';
import { alias, type BuildAliasTable } from 'drizzle-orm/pg-core';
import {
  ANCILLARY_EXPENSE_TYPES,
  ApprovalStatus,
  CustomerStatus,
  FuelMode,
  LoadingType,
  SettlementMethod,
  TripStatus,
  normalizeContainerNumber,
  type CreateLedgerDraftInput,
  type LedgerQueryInput,
  type LedgerQueryResult,
  type LedgerRow,
  type UpdateLedgerMoneyInput,
  type UpdateTripPlanInput,
} from '@tingting/shared';
import { ApiError } from '../errors';
import type { AuthUser } from '../middleware/auth';
import { updateTripFigures, generateTripCode } from './trip-mutations.service';
import { batchUpsertContainerSeals, batchUpsertTripContainers } from './forwarder-container.service';
import { getOutstandingAdvanceBalances } from './advance.service';

// ─── Read: getLedgerRows ─────────────────────────────────────────────────────

function escapeLikeTerm(value: string): string {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`);
}

function containerSearchConditions(rawTerm: string, normalizedTerm: string): SQL[] {
  const conditions: SQL[] = [sql`${s.tripContainers.containerNumber} ILIKE ${rawTerm}`];
  if (normalizedTerm !== '%%') {
    conditions.push(sql`upper(regexp_replace(${s.tripContainers.containerNumber}, '[[:space:]-]', '', 'g')) ILIKE ${normalizedTerm}`);
  }
  return conditions;
}

function tripContainerExists(rawTerm: string, normalizedTerm: string): SQL {
  return sql`EXISTS (
    SELECT 1 FROM ${s.tripContainers}
    WHERE ${s.tripContainers.tripId} = ${s.trips.id}
      AND (${sql.join(containerSearchConditions(rawTerm, normalizedTerm), sql` OR `)})
  )`;
}

/** customers alias carrying the external-carrier name (D-E: carriers live in customers). */
const CARRIER_CUSTOMER_ALIAS = 'carrier_customer';
type CarrierAliasTable = BuildAliasTable<typeof s.customers, typeof CARRIER_CUSTOMER_ALIAS>;

/**
 * Ledger main query: trips + joined display names. Returns the concrete
 * drizzle builder so callers chain .where/.orderBy/.limit/.offset typed.
 */
function ledgerMainQuery(carrierCustomer: CarrierAliasTable) {
  return db.select({
    id: s.trips.id,
    tripCode: s.trips.tripCode,
    version: s.trips.version,
    status: s.trips.status,
    departureDate: s.trips.departureDate,
    completedAt: s.trips.completedAt,
    notes: s.trips.notes,
    customerId: s.trips.customerId,
    customerName: s.customers.name,
    customerShortName: s.customers.shortName,
    customerTaxCode: s.customers.taxCode,
    customerReference: s.trips.customerReference,
    truckPlate: s.trucks.licensePlate,
    driverName: s.drivers.name,
    carrierType: s.trips.carrierType,
    externalCarrierName: carrierCustomer.name,
    externalFreightCost: s.trips.externalFreightCost,
    externalPlateNumber: s.trips.externalPlateNumber,
    containerCount: s.trips.containerCount,
    cargoTypeName: s.cargoTypes.name,
    hasReturnCargo: s.trips.hasReturnCargo,
    revenue: s.trips.revenue,
    revenueEmptyReturn: s.trips.revenueEmptyReturn,
    revenueCombine: s.trips.revenueCombine,
    tollCost: s.trips.tollCost,
    tollsStations: s.trips.tollsStations,
    fuelLiters: s.trips.fuelLiters,
    fuelUnitPrice: sql<string | null>`coalesce(${s.trips.fuelActualUnitPrice}, ${s.trips.fuelPriceApplied})`,
    totalFuelCost: s.trips.totalFuelCost,
    fuelSupplierName: s.suppliers.name,
    driverSalary: s.trips.driverSalary,
    totalRoadAllowance: s.trips.totalRoadAllowance,
    totalCost: s.trips.totalCost,
    grossProfit: s.trips.grossProfit,
  })
    .from(s.trips)
    .leftJoin(s.customers, eq(s.trips.customerId, s.customers.id))
    .leftJoin(s.drivers, eq(s.trips.driverId, s.drivers.id))
    .leftJoin(s.trucks, eq(s.trips.truckId, s.trucks.id))
    .leftJoin(s.cargoTypes, eq(s.trips.cargoTypeId, s.cargoTypes.id))
    .leftJoin(s.suppliers, eq(s.trips.fuelSupplierId, s.suppliers.id))
    .leftJoin(carrierCustomer, eq(s.trips.externalCarrierId, carrierCustomer.id));
}

/** Core assembler: loads every child collection for the given trip ids and
 *  shapes one LedgerRow per trip (same order as the ids input). */
async function assembleLedgerRows(
  trips: Array<Record<string, unknown>>,
): Promise<LedgerRow[]> {
  if (trips.length === 0) return [];
  const tripIds = trips.map(t => t.id as number);

  const [containerRows, legRows, expenseRows] = await Promise.all([
    db.select({
      id: s.tripContainers.id,
      tripId: s.tripContainers.tripId,
      containerTypeId: s.tripContainers.containerTypeId,
      containerTypeCode: s.containerTypes.code,
      containerNumber: s.tripContainers.containerNumber,
      sealNumber: s.tripContainers.sealNumber,
      cargoWeightKg: s.tripContainers.cargoWeightKg,
    }).from(s.tripContainers)
      .leftJoin(s.containerTypes, eq(s.tripContainers.containerTypeId, s.containerTypes.id))
      .where(inArray(s.tripContainers.tripId, tripIds))
      .orderBy(asc(s.tripContainers.id)),
    db.select({
      id: s.tripLegs.id,
      tripId: s.tripLegs.tripId,
      sequence: s.tripLegs.sequence,
      origin: s.tripLegs.origin,
      destination: s.tripLegs.destination,
      km: s.tripLegs.km,
      loadingType: s.tripLegs.loadingType,
    }).from(s.tripLegs)
      .where(inArray(s.tripLegs.tripId, tripIds))
      .orderBy(asc(s.tripLegs.sequence)),
    db.select({
      id: s.tripExpenses.id,
      tripId: s.tripExpenses.tripId,
      expenseType: s.tripExpenses.expenseType,
      buyAmount: s.tripExpenses.buyAmount,
      sellAmount: s.tripExpenses.sellAmount,
      settlementMethod: s.tripExpenses.settlementMethod,
      invoiceNumber: s.tripExpenses.invoiceNumber,
      invoiceDate: s.tripExpenses.invoiceDate,
      declarationNumber: s.tripExpenses.declarationNumber,
      tripContainerId: s.tripExpenses.tripContainerId,
      forwarderId: s.tripExpenses.forwarderId,
      approvalStatus: s.tripExpenses.approvalStatus,
    }).from(s.tripExpenses)
      .where(inArray(s.tripExpenses.tripId, tripIds))
      .orderBy(asc(s.tripExpenses.id)),
  ]);

  const containerIds = containerRows.map(c => c.id);
  const expenseIds = expenseRows.map(e => e.id);

  const [sealRows, settlementLinks] = await Promise.all([
    containerIds.length > 0
      ? db.select({
          id: s.tripContainerSeals.id,
          tripContainerId: s.tripContainerSeals.tripContainerId,
          sealNumber: s.tripContainerSeals.sealNumber,
        }).from(s.tripContainerSeals)
          .where(inArray(s.tripContainerSeals.tripContainerId, containerIds))
          .orderBy(asc(s.tripContainerSeals.id))
      : Promise.resolve([] as Array<{ id: number; tripContainerId: number; sealNumber: string }>),
    expenseIds.length > 0
      ? db.select({
          settlementId: s.advanceSettlements.id,
          code: s.advanceSettlements.code,
          status: s.advanceSettlements.status,
          totalExpenseAmount: s.advanceSettlements.totalExpenseAmount,
          refundAmount: s.advanceSettlements.refundAmount,
          reimbursementAmount: s.advanceSettlements.reimbursementAmount,
          tripExpenseId: s.settlementExpenses.tripExpenseId,
        }).from(s.settlementExpenses)
          .innerJoin(s.advanceSettlements, eq(s.settlementExpenses.settlementId, s.advanceSettlements.id))
          .where(inArray(s.settlementExpenses.tripExpenseId, expenseIds))
      : Promise.resolve([] as Array<{
          settlementId: number; code: string; status: string;
          totalExpenseAmount: string; refundAmount: string; reimbursementAmount: string;
          tripExpenseId: number;
        }>),
  ]);

  const settlementIds = [...new Set(settlementLinks.map(l => l.settlementId))];
  const advanceLinks = settlementIds.length > 0
    ? await db.select({
        settlementId: s.advanceSettlementRequests.settlementId,
        id: s.advanceRequests.id,
        amount: s.advanceRequests.amount,
        requesterName: s.users.fullName,
      }).from(s.advanceSettlementRequests)
        .innerJoin(s.advanceRequests, eq(s.advanceSettlementRequests.advanceRequestId, s.advanceRequests.id))
        .leftJoin(s.users, eq(s.advanceRequests.requesterId, s.users.id))
        .where(inArray(s.advanceSettlementRequests.settlementId, settlementIds))
    : [];

  // Forwarder outstanding balances via the shared balance formula (F1) — one
  // query for the page, never recomputed per row.
  const forwarderIds = [...new Set(
    expenseRows.map(e => e.forwarderId).filter((id): id is number => id != null),
  )];
  const outstandingByForwarder = new Map<number, string>();
  if (forwarderIds.length > 0) {
    const balances = await getOutstandingAdvanceBalances();
    for (const item of balances.items) outstandingByForwarder.set(item.forwarderId, String(item.outstanding));
  }

  const sealsByContainer = new Map<number, string[]>();
  for (const seal of sealRows) {
    const list = sealsByContainer.get(seal.tripContainerId) ?? [];
    list.push(seal.sealNumber);
    sealsByContainer.set(seal.tripContainerId, list);
  }

  interface SettlementAgg {
    id: number; code: string; status: string;
    totalExpenseAmount: string; refundAmount: string; reimbursementAmount: string;
    advances: Array<{ id: number; amount: string; requesterName: string | null }>;
  }
  const settlementsByTrip = new Map<number, Map<number, SettlementAgg>>();
  const expenseIdsBySettlement = new Map<number, Set<number>>();
  for (const link of settlementLinks) {
    const tripId = expenseRows.find(e => e.id === link.tripExpenseId)?.tripId;
    if (tripId == null) continue;
    if (!settlementsByTrip.has(tripId)) settlementsByTrip.set(tripId, new Map());
    const bySettlement = settlementsByTrip.get(tripId)!;
    if (!bySettlement.has(link.settlementId)) {
      bySettlement.set(link.settlementId, {
        id: link.settlementId,
        code: link.code,
        status: link.status,
        totalExpenseAmount: link.totalExpenseAmount,
        refundAmount: link.refundAmount,
        reimbursementAmount: link.reimbursementAmount,
        advances: [],
      });
    }
    const set = expenseIdsBySettlement.get(link.settlementId) ?? new Set<number>();
    set.add(link.tripExpenseId);
    expenseIdsBySettlement.set(link.settlementId, set);
  }
  for (const advance of advanceLinks) {
    for (const [, bySettlement] of settlementsByTrip) {
      const agg = bySettlement.get(advance.settlementId);
      if (agg) {
        agg.advances.push({ id: advance.id, amount: advance.amount, requesterName: advance.requesterName });
      }
    }
  }

  const expensesByTrip = new Map<number, typeof expenseRows>();
  for (const expense of expenseRows) {
    const list = expensesByTrip.get(expense.tripId) ?? [];
    list.push(expense);
    expensesByTrip.set(expense.tripId, list);
  }
  const containersByTrip = new Map<number, typeof containerRows>();
  for (const container of containerRows) {
    const list = containersByTrip.get(container.tripId) ?? [];
    list.push(container);
    containersByTrip.set(container.tripId, list);
  }
  const legsByTrip = new Map<number, typeof legRows>();
  for (const leg of legRows) {
    const list = legsByTrip.get(leg.tripId) ?? [];
    list.push(leg);
    legsByTrip.set(leg.tripId, list);
  }

  return trips.map((trip) => {
    const tripId = trip.id as number;
    const tripExpenses = expensesByTrip.get(tripId) ?? [];
    const activeExpenses = tripExpenses.filter(e => e.approvalStatus !== ApprovalStatus.REJECTED);
    const tripContainers = containersByTrip.get(tripId) ?? [];

    const rollupMap = new Map<string, { buy: number; sell: number }>();
    for (const expense of activeExpenses) {
      const agg = rollupMap.get(expense.expenseType) ?? { buy: 0, sell: 0 };
      agg.buy += Number(expense.buyAmount || 0);
      agg.sell += Number(expense.sellAmount || 0);
      rollupMap.set(expense.expenseType, agg);
    }
    const expenseRollup = [...rollupMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([expenseType, agg]) => ({
        expenseType,
        buyTotal: String(agg.buy),
        sellTotal: String(agg.sell),
      }));

    const containers = tripContainers.map(container => ({
      id: container.id,
      containerTypeId: container.containerTypeId,
      containerTypeCode: container.containerTypeCode,
      containerNumber: container.containerNumber,
      sealNumber: container.sealNumber,
      seals: sealsByContainer.get(container.id) ?? [],
      cargoWeightKg: container.cargoWeightKg,
      declarationNumbers: [...new Set(
        activeExpenses
          .filter(e => e.tripContainerId === container.id && e.declarationNumber)
          .map(e => e.declarationNumber as string),
      )],
      expenses: activeExpenses
        .filter(e => e.tripContainerId === container.id)
        .map(e => ({
          id: e.id,
          expenseType: e.expenseType,
          buyAmount: e.buyAmount,
          sellAmount: e.sellAmount,
          settlementMethod: e.settlementMethod as SettlementMethod,
          approvalStatus: e.approvalStatus as 'PENDING' | 'APPROVED' | 'REJECTED',
          invoiceNumber: e.invoiceNumber,
          invoiceDate: e.invoiceDate,
          declarationNumber: e.declarationNumber,
          tripContainerId: e.tripContainerId,
          forwarderId: e.forwarderId,
        })),
    }));

    const tripSettlements = [...(settlementsByTrip.get(tripId)?.values() ?? [])];
    const advanceTotal = tripSettlements.reduce(
      (sum, settlement) => sum + settlement.advances.reduce((a, adv) => a + Number(adv.amount || 0), 0),
      0,
    );

    const tripForwarderIds = [...new Set(
      activeExpenses.map(e => e.forwarderId).filter((id): id is number => id != null),
    )];
    const outstandingAdvance = tripForwarderIds.length === 1
      ? (outstandingByForwarder.get(tripForwarderIds[0]) ?? '0')
      : null;

    const containerTypeCodes = [...new Set(
      tripContainers.map(c => c.containerTypeCode).filter((c): c is string => !!c),
    )];

    return {
      id: tripId,
      tripCode: trip.tripCode as string | null,
      status: (trip.status ?? TripStatus.CREATED) as TripStatus,
      version: trip.version as number,
      departureDate: trip.departureDate as string,
      completedAt: (trip.completedAt as string | null) ?? null,
      notes: trip.notes as string | null,
      customerId: trip.customerId as number,
      customerName: trip.customerName as string | null,
      customerShortName: trip.customerShortName as string | null,
      customerTaxCode: (trip.customerTaxCode as string | null) ?? null,
      customerReference: trip.customerReference as string | null,
      truckPlate: trip.truckPlate as string | null,
      driverName: trip.driverName as string | null,
      carrierType: (trip.carrierType ?? 'OWN') as 'OWN' | 'EXTERNAL',
      externalCarrierName: trip.externalCarrierName as string | null,
      externalFreightCost: trip.externalFreightCost as string | null,
      externalPlateNumber: trip.externalPlateNumber as string | null,
      containerCount: trip.containerCount as number | null,
      containerTypeCodes,
      containers,
      legs: (legsByTrip.get(tripId) ?? []).map(leg => ({
        id: leg.id,
        sequence: leg.sequence,
        origin: leg.origin,
        destination: leg.destination,
        km: leg.km,
        loadingType: leg.loadingType as LoadingType,
      })),
      cargoTypeName: trip.cargoTypeName as string | null,
      hasReturnCargo: (trip.hasReturnCargo ?? false) as boolean,
      revenue: trip.revenue as string | null,
      revenueEmptyReturn: trip.revenueEmptyReturn as string | null,
      revenueCombine: trip.revenueCombine as string | null,
      expenseRollup,
      settlements: tripSettlements,
      advanceTotal: String(advanceTotal),
      outstandingAdvance,
      tollCost: trip.tollCost as string | null,
      tollsStations: trip.tollsStations as number | null,
      fuelLiters: trip.fuelLiters as string | null,
      fuelUnitPrice: trip.fuelUnitPrice as string | null,
      totalFuelCost: trip.totalFuelCost as string | null,
      fuelSupplierName: trip.fuelSupplierName as string | null,
      driverSalary: trip.driverSalary as string | null,
      totalRoadAllowance: trip.totalRoadAllowance as string | null,
      externalFreightCostRollup: trip.externalFreightCost as string | null,
      totalCost: trip.totalCost as string | null,
      grossProfit: trip.grossProfit as string | null,
    } satisfies LedgerRow;
  });
}

export async function getLedgerRows(filter: LedgerQueryInput): Promise<LedgerQueryResult> {
  const limit = Math.min(500, filter.limit ?? 100);
  const offset = filter.offset ?? 0;

  const carrierCustomer = alias(s.customers, CARRIER_CUSTOMER_ALIAS);

  const conditions: SQL<unknown>[] = [isNull(s.trips.deletedAt)];
  conditions.push(gte(s.trips.departureDate, filter.from));
  conditions.push(lte(s.trips.departureDate, filter.to));
  if (filter.customerId) conditions.push(eq(s.trips.customerId, filter.customerId));
  if (filter.status) conditions.push(eq(s.trips.status, filter.status));
  if (filter.q) {
    const term = `%${escapeLikeTerm(filter.q)}%`;
    const normalizedTerm = `%${escapeLikeTerm(normalizeContainerNumber(filter.q))}%`;
    const searchCondition = or(
      sql`unaccent(${s.trips.tripCode}) ILIKE unaccent(${term})`,
      sql`unaccent(${s.customers.name}) ILIKE unaccent(${term})`,
      tripContainerExists(term, normalizedTerm),
    );
    if (searchCondition) conditions.push(searchCondition);
  }

  const where = and(...conditions);

  const [countRow] = await db.select({ total: sql<string>`count(*)` })
    .from(s.trips)
    .leftJoin(s.customers, eq(s.trips.customerId, s.customers.id))
    .where(where);

  const rows = await ledgerMainQuery(carrierCustomer)
    .where(where)
    .orderBy(desc(s.trips.departureDate), desc(s.trips.id))
    .limit(limit)
    .offset(offset);

  const ledgerRows = await assembleLedgerRows(rows as unknown as Array<Record<string, unknown>>);

  return { rows: ledgerRows, total: Number(countRow?.total ?? 0), limit, offset };
}

export async function getLedgerRow(tripId: number): Promise<LedgerRow> {
  const carrierCustomer = alias(s.customers, CARRIER_CUSTOMER_ALIAS);
  const [row] = await ledgerMainQuery(carrierCustomer).where(eq(s.trips.id, tripId)).limit(1);
  if (!row) throw new ApiError(404, 'Không tìm thấy chuyến đi');
  const [ledgerRow] = await assembleLedgerRows([row as unknown as Record<string, unknown>]);
  return ledgerRow;
}

// ─── Write: quick-add draft ──────────────────────────────────────────────────

/** Create a CREATED-status draft from customer + date only (ledger quick-add). */
export async function createLedgerDraft(data: CreateLedgerDraftInput, user: AuthUser) {
  const [customer] = await db.select({ id: s.customers.id })
    .from(s.customers)
    .where(and(eq(s.customers.id, data.customerId), eq(s.customers.status, CustomerStatus.ACTIVE), isNull(s.customers.deletedAt)))
    .limit(1);
  if (!customer) throw new ApiError(400, 'Khách hàng không tồn tại hoặc đã ngừng hoạt động');

  return db.transaction(async (tx) => {
    const tripCode = await generateTripCode(tx, data.departureDate);
    const [trip] = await tx.insert(s.trips).values({
      tripCode,
      version: 1,
      createdBy: user.userId,
      customerId: data.customerId,
      departureDate: data.departureDate,
      notes: data.notes ?? null,
      status: TripStatus.CREATED,
    }).returning();
    return trip;
  });
}

// ─── Write: PLAN group ───────────────────────────────────────────────────────

async function loadEditableTrip(tripId: number) {
  const [trip] = await db.select().from(s.trips).where(and(eq(s.trips.id, tripId), isNull(s.trips.deletedAt))).limit(1);
  if (!trip) throw new ApiError(404, 'Không tìm thấy chuyến đi');
  if (trip.status === TripStatus.LOCKED || trip.status === TripStatus.CANCELED) {
    throw new ApiError(400, 'Chuyến đi đã chốt hoặc đã hủy, không thể sửa');
  }
  return trip;
}

/**
 * PLAN-group patch: date / notes / customer / BKG / legs / containers (+seal).
 * Route/figure-affecting plan fields (legs, departureDate, customerId) flow
 * through the existing updateTripFigures transaction — money values are merged
 * from stored so a plan edit cannot silently rewrite accountant figures —
 * while customerReference and container rows use their own narrow updates.
 * Returns the fresh LedgerRow so the grid can repaint the saved cells.
 */
export async function updateLedgerPlan(tripId: number, patch: UpdateTripPlanInput, user: AuthUser): Promise<LedgerRow> {
  const trip = await loadEditableTrip(tripId);

  const needsFiguresUpdate = patch.legs !== undefined
    || patch.departureDate !== undefined
    || (patch.customerId !== undefined && patch.customerId !== trip.customerId);

  if (needsFiguresUpdate) {
    // Merge stored money figures so updateTripFigures' unconditional rewrites
    // preserve them; explicit driverSalary freezes the auto-fill branch.
    const storedLegs = await db.select()
      .from(s.tripLegs).where(eq(s.tripLegs.tripId, tripId)).orderBy(asc(s.tripLegs.sequence));

    type MergedLeg = {
      sequence: number;
      origin: string;
      destination: string;
      km: number;
      loadingType: LoadingType;
    };

    let mergedLegs: MergedLeg[] = storedLegs.map(leg => ({
      sequence: leg.sequence,
      origin: leg.origin,
      destination: leg.destination,
      km: leg.km,
      loadingType: leg.loadingType as LoadingType,
    }));
    if (patch.legs) {
      const bySequence = new Map(mergedLegs.map(leg => [leg.sequence, { ...leg }]));
      // Patch entries with an id overlay the stored leg with that id.
      const storedById = new Map(storedLegs.map(leg => [leg.id, leg]));
      for (const patchLeg of patch.legs) {
        const target = patchLeg.id ? storedById.get(patchLeg.id) : undefined;
        if (target) {
          bySequence.set(patchLeg.sequence, {
            sequence: patchLeg.sequence,
            origin: patchLeg.origin ?? target.origin,
            destination: patchLeg.destination ?? target.destination,
            km: patchLeg.km !== undefined ? Math.round(patchLeg.km) : target.km,
            loadingType: patchLeg.loadingType ?? (target.loadingType as LoadingType),
          });
        } else {
          // New leg — schema refine guarantees origin/destination/km present.
          bySequence.set(patchLeg.sequence, {
            sequence: patchLeg.sequence,
            origin: patchLeg.origin!,
            destination: patchLeg.destination!,
            km: Math.round(patchLeg.km!),
            loadingType: patchLeg.loadingType ?? LoadingType.HANG,
          });
        }
      }
      mergedLegs = [...bySequence.values()].sort((a, b) => a.sequence - b.sequence);
    }

    await updateTripFigures(tripId, {
      customerId: patch.customerId ?? trip.customerId,
      departureDate: patch.departureDate ?? trip.departureDate,
      fuelMode: (trip.fuelMode ?? FuelMode.AUTO) as FuelMode,
      fuelLitersOverride: trip.fuelLitersOverride != null ? Number(trip.fuelLitersOverride) : null,
      fuelSupplementLiters: Number(trip.fuelSupplementLiters || 0),
      fuelSupplementReason: trip.fuelSupplementReason ?? undefined,
      fuelActualUnitPrice: trip.fuelActualUnitPrice != null ? Number(trip.fuelActualUnitPrice) : null,
      tollsDiscount: Number(trip.tollsDiscount || 0),
      tollsAddition: Number(trip.tollsAddition || 0),
      tollsStations: trip.tollsStations || 0,
      hasReturnCargo: trip.hasReturnCargo ?? false,
      roadAllowanceOverride: trip.roadAllowanceOverride != null ? Number(trip.roadAllowanceOverride) : null,
      driverSalary: Number(trip.driverSalary || 0),
      legs: mergedLegs,
      // updateTripFigures writes notes as `data.notes ?? null`: undefined
      // clears, so the ledger's "clear cell" ('') maps to undefined here.
      notes: patch.notes !== undefined
        ? (patch.notes === '' ? undefined : patch.notes)
        : (trip.notes ?? undefined),
      expectedVersion: patch.expectedVersion,
      userId: user.userId,
      userRole: user.role,
    });

    // updateTripFigures unconditionally writes revenue (resolveRevenue falls
    // back to 0 for a never-priced draft). Keep the sheet semantics — an
    // unknown price stays a blank cell, not "0" — by re-nulling the revenue
    // pair on drafts that had none. grossProfit stays figures-consistent
    // (0 − costs) and is recomputed properly on the first revenue entry.
    if (trip.revenue == null) {
      await db.update(s.trips)
        .set({ revenue: null, revenueOriginal: null, updatedAt: new Date() })
        .where(eq(s.trips.id, tripId));
    }
  } else if (patch.notes !== undefined) {
    await db.update(s.trips)
      .set({ notes: patch.notes === '' ? null : patch.notes, updatedAt: new Date() })
      .where(eq(s.trips.id, tripId));
  }

  if (patch.customerReference !== undefined) {
    await db.update(s.trips)
      .set({ customerReference: patch.customerReference === '' ? null : patch.customerReference, updatedAt: new Date() })
      .where(eq(s.trips.id, tripId));
  }

  if (patch.containers) {
    const stored = await db.select()
      .from(s.tripContainers).where(eq(s.tripContainers.tripId, tripId)).orderBy(asc(s.tripContainers.id));
    const storedById = new Map(stored.map(c => [c.id, c]));

    type MergedContainer = {
      id?: number;
      containerTypeId?: number | null;
      containerNumber: string | null;
      cargoWeightKg: string | number | null;
      notes: string | null;
    };

    // batchUpsertTripContainers is a full reconcile (rows absent from the
    // payload are deleted), so the patch is merged onto the stored list.
    const merged: MergedContainer[] = stored.map((c) => {
      const p = patch.containers!.find(x => x.id === c.id);
      if (!p) {
        return {
          id: c.id,
          containerTypeId: c.containerTypeId,
          containerNumber: c.containerNumber,
          cargoWeightKg: c.cargoWeightKg,
          notes: c.notes,
        };
      }
      return {
        id: c.id,
        containerTypeId: p.containerTypeId !== undefined ? p.containerTypeId : c.containerTypeId,
        containerNumber: p.containerNumber !== undefined ? (p.containerNumber === '' ? null : p.containerNumber) : c.containerNumber,
        cargoWeightKg: p.cargoWeightKg !== undefined ? p.cargoWeightKg : c.cargoWeightKg,
        notes: c.notes,
      };
    });
    for (const p of patch.containers) {
      if (!p.id || !storedById.has(p.id)) {
        merged.push({
          containerTypeId: p.containerTypeId ?? null,
          containerNumber: p.containerNumber ? p.containerNumber : null,
          cargoWeightKg: p.cargoWeightKg ?? null,
          notes: null,
        });
      }
    }

    const savedContainers = await batchUpsertTripContainers(tripId, user.userId, merged);

    // Seal edits: the ledger cell shows the primary seal. Containers with a
    // single seal reconcile that row in place; multi-seal containers are
    // rejected with a pointer to the trip detail page (no silent data loss).
    for (const p of patch.containers) {
      if (p.sealNumber === undefined) continue;
      const saved = p.id
        ? savedContainers.find(c => c.id === p.id)
        : savedContainers.find(c => !!p.containerNumber && c.containerNumber === p.containerNumber);
      if (!saved) continue;
      const existingSeals = await db.select()
        .from(s.tripContainerSeals)
        .where(eq(s.tripContainerSeals.tripContainerId, saved.id))
        .orderBy(asc(s.tripContainerSeals.id));
      if (existingSeals.length > 1) {
        throw new ApiError(409, 'Container có nhiều seal — vui lòng sửa seal ở trang chi tiết chuyến');
      }
      if (p.sealNumber === '') {
        await batchUpsertContainerSeals(saved.id, [], user.userId);
      } else if (existingSeals.length === 1) {
        await batchUpsertContainerSeals(saved.id, [{ id: existingSeals[0].id, sealNumber: p.sealNumber }], user.userId);
      } else {
        await batchUpsertContainerSeals(saved.id, [{ sealNumber: p.sealNumber }], user.userId);
      }
    }
  }

  return getLedgerRow(tripId);
}

// ─── Write: MONEY group ──────────────────────────────────────────────────────

/**
 * MONEY-group patch: revenue / fuel / toll / salary / allowances. Dispatches
 * through the existing updateTripFigures with stored values merged under the
 * patch, so partial cell edits keep every other figure and the COMPLETED-trip
 * ledger posting path runs unchanged. Returns the fresh LedgerRow.
 */
export async function updateLedgerMoney(tripId: number, patch: UpdateLedgerMoneyInput, user: AuthUser): Promise<LedgerRow> {
  const trip = await loadEditableTrip(tripId);

  await updateTripFigures(tripId, {
    expectedVersion: patch.expectedVersion,
    customerId: trip.customerId,
    departureDate: trip.departureDate,
    fuelMode: (patch.fuelMode ?? trip.fuelMode ?? FuelMode.AUTO) as FuelMode,
    fuelLitersOverride: patch.fuelLitersOverride !== undefined
      ? patch.fuelLitersOverride
      : (trip.fuelLitersOverride != null ? Number(trip.fuelLitersOverride) : null),
    fuelSupplementLiters: Number(trip.fuelSupplementLiters || 0),
    fuelSupplementReason: trip.fuelSupplementReason ?? undefined,
    fuelActualUnitPrice: patch.fuelActualUnitPrice !== undefined
      ? patch.fuelActualUnitPrice
      : (trip.fuelActualUnitPrice != null ? Number(trip.fuelActualUnitPrice) : null),
    fuelSupplierId: patch.fuelSupplierId !== undefined ? patch.fuelSupplierId : trip.fuelSupplierId,
    tollsDiscount: patch.tollsDiscount ?? Number(trip.tollsDiscount || 0),
    tollsAddition: patch.tollsAddition ?? Number(trip.tollsAddition || 0),
    tollsStations: patch.tollsStations ?? (trip.tollsStations || 0),
    hasReturnCargo: patch.hasReturnCargo ?? (trip.hasReturnCargo ?? false),
    roadAllowanceOverride: patch.roadAllowanceOverride !== undefined
      ? patch.roadAllowanceOverride
      : (trip.roadAllowanceOverride != null ? Number(trip.roadAllowanceOverride) : null),
    // Explicit stored value freezes the route auto-fill: a one-cell ledger
    // edit must not silently populate lương from config.
    driverSalary: patch.driverSalary ?? Number(trip.driverSalary || 0),
    revenue: patch.revenue,
    revenueEmptyReturn: patch.revenueEmptyReturn,
    revenueCombine: patch.revenueCombine,
    twoPointDeliveryBonus: patch.twoPointDeliveryBonus,
    vehicleShiftAllowance: patch.vehicleShiftAllowance,
    customerCommission: patch.customerCommission,
    tripWageDays: patch.tripWageDays,
    externalFreightCost: patch.externalFreightCost,
    notes: trip.notes ?? undefined,
    userId: user.userId,
    userRole: user.role,
  });

  return getLedgerRow(tripId);
}

// ─── Excel export (Sổ cái → worksheet) ──────────────────────────────────────

/** Money columns render as numbers with VND grouping so the sheet stays computable. */
const LEDGER_MONEY_FORMAT = '#,##0';

interface LedgerExportColumn {
  header: string;
  width: number;
  /** 'money' renders numbers with #,##0; other values render as text. */
  kind?: 'money';
  value: (row: LedgerRow) => string | number | null;
}

/** Km columns per loading type, following the sheet's hàng1/vỏ1/hàng2/vỏ2 order. */
const LEDGER_KM_COLUMNS: Array<{ loadingType: LoadingType; sequence: number; header: string }> = [
  { loadingType: LoadingType.HANG, sequence: 1, header: 'Km hàng 1' },
  { loadingType: LoadingType.VO, sequence: 1, header: 'Km vỏ 1' },
  { loadingType: LoadingType.HANG, sequence: 2, header: 'Km hàng 2' },
  { loadingType: LoadingType.VO, sequence: 2, header: 'Km vỏ 2' },
];

function rollupSell(row: LedgerRow, expenseType: string): string | null {
  const entry = row.expenseRollup.find(r => r.expenseType === expenseType);
  return entry && Number(entry.sellTotal) !== 0 ? entry.sellTotal : null;
}

function legKm(row: LedgerRow, loadingType: LoadingType, sequence: number): number | null {
  const leg = row.legs.find(l => l.sequence === sequence && l.loadingType === loadingType);
  return leg?.km ?? null;
}

function joinNonEmpty(values: Array<string | null | undefined>): string | null {
  const joined = values.filter(v => !!v && v.trim() !== '').join(', ');
  return joined === '' ? null : joined;
}

const LEDGER_EXPORT_COLUMNS: LedgerExportColumn[] = [
  { header: 'Ngày KH', width: 11, value: r => r.departureDate },
  { header: 'Nội dung vận chuyển', width: 30, value: r => r.notes },
  { header: 'Khách hàng', width: 24, value: r => r.customerName },
  {
    header: 'Số lượng',
    width: 12,
    value: (r) => {
      const codes = r.containerTypeCodes.join('/');
      if (codes === '') return null;
      return `${r.containerCount ?? r.containerTypeCodes.length}x${codes}`;
    },
  },
  { header: 'Số BKG', width: 14, value: r => r.customerReference },
  {
    header: 'Số tờ khai',
    width: 16,
    value: r => joinNonEmpty(r.containers.flatMap(c => c.declarationNumbers)),
  },
  { header: 'Số container', width: 20, value: r => joinNonEmpty(r.containers.map(c => c.containerNumber)) },
  { header: 'Số seal', width: 18, value: r => joinNonEmpty(r.containers.map(c => joinNonEmpty(c.seals))) },
  { header: 'G.W (kg)', width: 12, value: r => joinNonEmpty(r.containers.map(c => c.cargoWeightKg)) },
  { header: 'Điểm đi', width: 16, value: r => r.legs[0]?.origin ?? null },
  { header: 'Điểm đến 1', width: 16, value: r => r.legs[0]?.destination ?? null },
  { header: 'Điểm đến 2', width: 16, value: r => r.legs[1]?.destination ?? null },
  { header: 'Điểm đến 3', width: 16, value: r => r.legs[2]?.destination ?? null },
  { header: 'Tên hàng', width: 16, value: r => r.cargoTypeName },
  { header: 'Cước VC', width: 13, kind: 'money', value: r => r.revenue },
  { header: 'Phí nâng hạ', width: 13, kind: 'money', value: r => rollupSell(r, ANCILLARY_EXPENSE_TYPES[0]) },
  { header: 'Phí xếp hạ', width: 13, kind: 'money', value: r => rollupSell(r, ANCILLARY_EXPENSE_TYPES[1]) },
  {
    header: 'Phí khác',
    width: 13,
    kind: 'money',
    value: (r) => {
      const named = new Set<string>([ANCILLARY_EXPENSE_TYPES[0], ANCILLARY_EXPENSE_TYPES[1]]);
      const others = r.expenseRollup
        .filter(entry => !named.has(entry.expenseType))
        .reduce((sum, entry) => sum + Number(entry.sellTotal || 0), 0);
      return others !== 0 ? String(others) : null;
    },
  },
  { header: 'Đối tác VC', width: 20, value: r => r.externalCarrierName },
  { header: 'Cước thuê', width: 13, kind: 'money', value: r => r.externalFreightCost },
  { header: 'Vé cầu đường', width: 13, kind: 'money', value: r => r.tollCost },
  ...LEDGER_KM_COLUMNS.map(col => ({
    header: col.header,
    width: 10,
    value: (r: LedgerRow) => legKm(r, col.loadingType, col.sequence),
  })),
  { header: 'Petro (lít)', width: 11, kind: 'money', value: r => r.fuelLiters },
  { header: 'Đơn giá', width: 11, kind: 'money', value: r => r.fuelUnitPrice },
  { header: 'Thành tiền dầu', width: 13, kind: 'money', value: r => r.totalFuelCost },
  { header: 'Nhà cung cấp', width: 18, value: r => r.fuelSupplierName },
  { header: 'Tiền lương', width: 13, kind: 'money', value: r => r.driverSalary },
  { header: 'Hạch toán', width: 13, kind: 'money', value: r => r.totalRoadAllowance },
  { header: 'Tạm ứng', width: 13, kind: 'money', value: r => (Number(r.advanceTotal) !== 0 ? r.advanceTotal : null) },
  { header: 'Số dư TU', width: 13, kind: 'money', value: r => r.outstandingAdvance },
  { header: 'Hoàn ứng', width: 18, value: r => joinNonEmpty(r.settlements.map(st => st.code)) },
  { header: 'Tổng chi phí', width: 14, kind: 'money', value: r => r.totalCost },
  { header: '(Lợi nhuận)', width: 14, kind: 'money', value: r => r.grossProfit },
  {
    header: 'Trạng thái',
    width: 12,
    value: r => joinNonEmpty([r.hasReturnCargo ? 'Chờ hàng/vỏ về' : null]),
  },
];

/**
 * Export the ledger for a date range as one worksheet in the master sheet's
 * column order. Unknown values stay blank cells (never 0) to match the sheet.
 */
export async function exportLedgerXlsx(filter: LedgerQueryInput, writable: import('stream').Writable): Promise<boolean> {
  // Page through the range so exports are not capped at one page size.
  const pageSize = 500;
  const maxRows = 5000;
  const rows: LedgerRow[] = [];
  for (let offset = 0; offset < maxRows; offset += pageSize) {
    const page = await getLedgerRows({ ...filter, limit: pageSize, offset });
    rows.push(...page.rows);
    if (rows.length >= page.total || page.rows.length < pageSize) break;
  }

  // Dynamic import is the repo-wide convention for exceljs (settlement-export,
  // statement, billingDocument, fuel-voucher): a heavy CJS dependency paid only
  // when an export actually runs, never at server start.
  const ExcelJSMod = await import('exceljs');
  const ExcelJS = (ExcelJSMod as unknown as { default?: typeof ExcelJSMod }).default ?? ExcelJSMod;
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Kế hoạch vận chuyển');

  sheet.columns = LEDGER_EXPORT_COLUMNS.map(col => ({ key: col.header, width: col.width }));
  const headerRow = sheet.getRow(1);
  LEDGER_EXPORT_COLUMNS.forEach((col, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = col.header;
    cell.font = { bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEBF3EA' } };
    cell.border = { bottom: { style: 'thin' } };
    cell.alignment = { vertical: 'middle' };
  });
  headerRow.commit();

  for (const row of rows) {
    const values = LEDGER_EXPORT_COLUMNS.map((col) => {
      const raw = col.value(row);
      if (raw == null || raw === '') return null;
      if (col.kind === 'money') {
        const num = Number(raw);
        return Number.isFinite(num) ? num : null;
      }
      return String(raw);
    });
    const sheetRow = sheet.getRow(sheet.rowCount + 1);
    values.forEach((value, i) => {
      if (value == null) return;
      const cell = sheetRow.getCell(i + 1);
      cell.value = value;
      if (typeof value === 'number') cell.numFmt = LEDGER_MONEY_FORMAT;
    });
    sheetRow.commit();
  }

  await workbook.xlsx.write(writable);
  return true;
}
