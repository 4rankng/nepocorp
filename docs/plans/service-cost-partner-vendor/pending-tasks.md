# Service Costs, External Carrier & Debt Netting — Implementation Tasks

> **For agentic workers:** Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement tasks one at a time. Each task is self-contained. Read the **Big-Picture Context** below before starting any task.

**Goal:** Add three missing capabilities — ancillary service costs (mua vào/bán ra with service margin), external carrier dispatch (xe ngoài with management margin), and debt netting (đối trừ công nợ) — so per-trip/per-vehicle P&L is correct and AR/AP reflect net positions.

**Architecture:** DB-first (Drizzle schema → migration → shared types → backend services → frontend). All financial writes go through `LedgerService.postEntry` inside `db.transaction`. Ledger is append-only.

**Tech Stack:** Express v5, Drizzle ORM, PostgreSQL, Zod, React 18, TanStack Query, TypeScript strict.

---

## BIG-PICTURE CONTEXT (read before any task)

### Confirmed business decisions (Pete, 02/06/2026)

| ID | Decision |
|----|----------|
| D-A | `FORWARDER_ADVANCE` fees post a **debit** on the forwarder's FORWARDER ledger (reducing advance balance). `COMPANY_DIRECT` fees post a **VENDOR_EXPENSE credit** on the supplier's VENDOR ledger (AP). Foundation for Phase-2 advance subsystem. |
| D-B | Giấy báo nợ: **Excel first**; formal PDF layout is a later follow-up. |
| D-C | Build a **generic approval mechanism** (approval_status + approvals audit table). Apply this batch to debt offsets + forwarder-entered ancillary-fee sell-side edits. |
| D-D | New txn_type `EXTERNAL_CARRIER_COST` for external freight payables (not VENDOR_EXPENSE). |
| D-E | External carrier lives in **Customers catalog** (`is_carrier=true`), NOT Suppliers. `trips.external_carrier_id → customers(id)`. |
| D-F | What we owe an external carrier posts as a **CREDIT on their CUSTOMER ledger** (`entity_type='CUSTOMER'`). Negative balance = we owe them. Aging must exclude negative-balance customers from overdue AR buckets. |

### Existing codebase foundations
- **LedgerService** — `backend/src/services/ledger.service.ts`: `postEntry(tx, req)`, `lockEntity(tx, type, id)`, `lockEntities(tx, arr)`, `getBalance(type, id)`. Sign rule: CUSTOMER: `balance += debit − credit`; DRIVER/VENDOR/FORWARDER: `balance += credit − debit`.
- **trip_expenses** — currently has: `id, tripId, forwarderId (NOT NULL), expenseType (varchar50 FK to forwarder_expense_types.code), amount, note, createdAt`. **`forwarderId` must become nullable** (accountants also create fees).
- **trips** — `truckId` and `driverId` are currently `NOT NULL`. Must become nullable for EXTERNAL carrier trips.
- **forwarder_expense_types** config table — currently: `id, code, name, status, createdAt, updatedAt, deletedAt`. Has 5 codes: LIFTING, CUSTOMS, WEIGHING, INSPECTION, OTHER.
- **txnTypeEnum** — existing: TRIP_REVENUE, PAYMENT_RECEIVED, PENALTY, MANAGEMENT_FEE, ADJUSTMENT, DRIVER_SALARY, VENDOR_EXPENSE, VENDOR_PAYMENT, FORWARDER_ADVANCE, FORWARDER_SETTLEMENT. Need to add: `EXTERNAL_CARRIER_COST`.
- **Migration pattern** — edit `backend/src/db/schema.ts` → `npm run db:generate` (in `backend/`) → review generated SQL in `backend/drizzle/` → `npm run db:migrate`.
- **Route pattern** — `asyncHandler(async (req, res) => { const data = Schema.parse(req.body); const result = await db.transaction(async tx => { ... }); res.json(result); })`.
- **Casbin** — `backend/src/casbin/policy.csv`. Format: `p, ROLE, resource, action`. Approval endpoints are `financial:write`.

### VAT model
- `trips.vat_rate` stores the rate (e.g. `0.080`). `trips.revenue` = customer freight **incl-VAT** (existing). Ex-VAT = `revenue / (1 + vat_rate)`. P&L uses ex-VAT; AR uses incl-VAT. Default `vat_rate=0` → no change for existing rows.

---

## TASK A1 — DB Schema: add all new columns + tables

**Depends on:** nothing  
**Blocks:** all other tasks

### Files to modify
- Modify: `backend/src/db/schema.ts`
- Auto-generated: `backend/drizzle/003X_<name>.sql`

### Step 1 — Add columns to `trips`

In `backend/src/db/schema.ts`, in the `trips = pgTable(...)` definition, add these columns **after `notes`**:

```typescript
// Carrier type — OWN (existing) or EXTERNAL (hired partner from customers catalog)
carrierType: varchar('carrier_type', { length: 20 }).notNull().default('OWN'),
externalCarrierId: integer('external_carrier_id').references(() => customers.id),  // D-E: refs customers
externalFreightCost: numeric('external_freight_cost', { precision: 15, scale: 0 }), // incl-VAT
externalPlateNumber: varchar('external_plate_number', { length: 20 }),
externalDriverName: varchar('external_driver_name', { length: 100 }),
externalDriverPhone: varchar('external_driver_phone', { length: 20 }),
// VAT — stored per trip; revenue field remains incl-VAT
vatRate: numeric('vat_rate', { precision: 5, scale: 3 }).notNull().default('0.000'),
```

Also make `truckId` and `driverId` nullable (remove `.notNull()`):
```typescript
truckId: integer('truck_id').references(() => trucks.id),       // was notNull
driverId: integer('driver_id').references(() => drivers.id),    // was notNull
```

### Step 2 — Expand `trip_expenses`

Replace the current `tripExpenses` definition:

```typescript
export const tripExpenses = pgTable('trip_expenses', {
  id: serial('id').primaryKey(),
  tripId: integer('trip_id').references(() => trips.id).notNull(),
  forwarderId: integer('forwarder_id').references(() => users.id),  // nullable — accountants also create fees
  expenseType: varchar('expense_type', { length: 50 }).notNull(),   // FK to forwarder_expense_types.code
  // buy/sell split (replaces single `amount`)
  buyAmount: numeric('buy_amount', { precision: 15, scale: 0 }).notNull(),
  sellAmount: numeric('sell_amount', { precision: 15, scale: 0 }).notNull().default('0'),
  // Settlement method (D-A)
  settlementMethod: varchar('settlement_method', { length: 20 }).notNull().default('FORWARDER_ADVANCE'),
  supplierId: integer('supplier_id').references(() => suppliers.id),  // for COMPANY_DIRECT fees
  // Invoice metadata
  invoiceNumber: varchar('invoice_number', { length: 50 }),
  invoiceDate: date('invoice_date'),
  declarationNumber: varchar('declaration_number', { length: 50 }),  // customs tờ khai
  containerNumber: varchar('container_number', { length: 20 }),
  // Approval (D-C)
  approvalStatus: varchar('approval_status', { length: 20 }).notNull().default('APPROVED'),
  note: text('note'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('trip_expenses_trip_id_idx').on(table.tripId),
  index('trip_expenses_container_idx').on(table.containerNumber),
]);
```

**Migration note:** rename existing `amount` column → `buy_amount`. The generated migration will likely add `buy_amount` and `sell_amount`. You'll need to manually edit the generated SQL to include: `ALTER TABLE trip_expenses RENAME COLUMN amount TO buy_amount;` and backfill `sell_amount=0`, `settlement_method='FORWARDER_ADVANCE'`, `approval_status='APPROVED'` for all existing rows. Also drop `NOT NULL` from `forwarder_id`.

### Step 3 — Expand `forwarder_expense_types`

Add columns to the existing `forwarderExpenseTypes` table:

```typescript
export const forwarderExpenseTypes = pgTable('forwarder_expense_types', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  defaultMarkup: boolean('default_markup').notNull().default(false),  // true = prefill editable-with-margin
  billingLabel: varchar('billing_label', { length: 120 }),  // label on giấy báo nợ (may differ from name)
  vatRate: numeric('vat_rate', { precision: 5, scale: 3 }).notNull().default('0.080'),
  status: varchar('status', { length: 20 }).notNull().default('ACTIVE'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});
```

### Step 4 — Expand `customers`

Add to the existing `customers` table:

```typescript
isCarrier: boolean('is_carrier').notNull().default(false),  // D-E: flags carrier partners
debitNoteMode: varchar('debit_note_mode', { length: 20 }).notNull().default('MONTHLY'),  // 'MONTHLY'|'PER_BATCH'
linkedSupplierId: integer('linked_supplier_id').references(() => suppliers.id),  // for debt-netting (§4.10)
```

### Step 5 — Expand `suppliers`

Add to the existing `suppliers` table:

```typescript
linkedCustomerId: integer('linked_customer_id').references(() => customers.id),
```

### Step 6 — Add `debt_offsets` table

```typescript
export const debtOffsets = pgTable('debt_offsets', {
  id: serial('id').primaryKey(),
  customerId: integer('customer_id').references(() => customers.id).notNull(),
  supplierId: integer('supplier_id').references(() => suppliers.id).notNull(),
  amount: numeric('amount', { precision: 15, scale: 0 }).notNull(),
  offsetDate: date('offset_date').notNull(),
  note: text('note'),
  approvalStatus: varchar('approval_status', { length: 20 }).notNull().default('PENDING'),
  createdBy: integer('created_by').references(() => users.id),
  approvedBy: integer('approved_by').references(() => users.id),
  approvedAt: timestamp('approved_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('debt_offsets_customer_idx').on(table.customerId),
  index('debt_offsets_supplier_idx').on(table.supplierId),
]);
```

### Step 7 — Add `EXTERNAL_CARRIER_COST` to txn_type enum (D-D)

In the enum definition at the top of `schema.ts`:

```typescript
export const txnTypeEnum = pgEnum('txn_type', [
  'TRIP_REVENUE', 'PAYMENT_RECEIVED', 'PENALTY', 'MANAGEMENT_FEE', 'ADJUSTMENT',
  'DRIVER_SALARY', 'VENDOR_EXPENSE', 'VENDOR_PAYMENT', 'FORWARDER_ADVANCE',
  'FORWARDER_SETTLEMENT', 'EXTERNAL_CARRIER_COST',  // new
]);
```

**Note:** Postgres enums require `ALTER TYPE … ADD VALUE` and cannot be removed. The generated migration will contain this statement. Verify it's present before running.

### Step 8 — Run migration

```bash
cd backend
npm run db:generate
# Review backend/drizzle/003X_*.sql:
# - Ensure amount→buy_amount rename is present (add manually if not)
# - Ensure sell_amount default 0, settlement_method default FORWARDER_ADVANCE backfill
# - Ensure forwarder_id NOT NULL is dropped
# - Ensure truckId/driverId NOT NULL is dropped
npm run db:migrate
```

### Acceptance
- `npm run db:migrate` exits 0
- `npm run db:studio` shows all new columns on all tables
- `npm run seed` still completes without errors (existing data compatible)

---

## TASK A2 — Shared types, Zod schemas, constants

**Depends on:** A1  
**Blocks:** B1, B2, B3, B4, C1, C2, C3, C4

### Files to modify
- `shared/src/types/index.ts`
- `shared/src/schemas/index.ts`
- `shared/src/constants/index.ts`

### Step 1 — Add enums to `shared/src/constants/index.ts`

```typescript
// Add to TxnType enum
export enum TxnType {
  // ... existing values ...
  EXTERNAL_CARRIER_COST = 'EXTERNAL_CARRIER_COST',
}

// Add new enums
export enum CarrierType {
  OWN = 'OWN',
  EXTERNAL = 'EXTERNAL',
}

export enum SettlementMethod {
  COMPANY_DIRECT = 'COMPANY_DIRECT',
  FORWARDER_ADVANCE = 'FORWARDER_ADVANCE',
}

export enum ApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum DebitNoteMode {
  MONTHLY = 'MONTHLY',
  PER_BATCH = 'PER_BATCH',
}

// Replace FORWARDER_EXPENSE_TYPE_DEFAULTS with expanded 8-code version
export const FORWARDER_EXPENSE_TYPE_DEFAULTS: Record<string, { name: string; defaultMarkup: boolean; billingLabel: string }> = {
  LIFTING:       { name: 'Phí nâng container',        defaultMarkup: false, billingLabel: 'Phí nâng container' },
  LOWERING:      { name: 'Phí hạ container',           defaultMarkup: false, billingLabel: 'Phí hạ container' },
  WEIGHING:      { name: 'Phí cân hàng',               defaultMarkup: false, billingLabel: 'Phí cân hàng' },
  CUSTOMS:       { name: 'Phí làm tờ khai hải quan',   defaultMarkup: true,  billingLabel: 'Phí hải quan' },
  INFRASTRUCTURE:{ name: 'Phí kết cấu hạ tầng',        defaultMarkup: false, billingLabel: 'Phí hạ tầng' },
  INSPECTION:    { name: 'Phí kiểm hóa tại cảng',      defaultMarkup: false, billingLabel: 'Phí kiểm hóa' },
  INSPECTION_SVC:{ name: 'Phí phục vụ kiểm hóa',       defaultMarkup: true,  billingLabel: 'Phí phục vụ kiểm hóa' },
  OTHER:         { name: 'Phí chi hộ khác',             defaultMarkup: false, billingLabel: 'Chi phí khác' },
};
```

### Step 2 — Extend `Customer` interface in `shared/src/types/index.ts`

```typescript
export interface Customer {
  // ... existing fields ...
  isCarrier: boolean;
  debitNoteMode: 'MONTHLY' | 'PER_BATCH';
  linkedSupplierId: number | null;
}
```

### Step 3 — Extend `Trip` interface

```typescript
export interface Trip {
  // ... existing fields ...
  vatRate: string;               // e.g. "0.080"
  carrierType: 'OWN' | 'EXTERNAL';
  externalCarrierId: number | null;
  externalFreightCost: string | null;   // incl-VAT, numeric string
  externalPlateNumber: string | null;
  externalDriverName: string | null;
  externalDriverPhone: string | null;
}
```

### Step 4 — Extend/replace `TripExpense` interface

```typescript
export interface TripExpense {
  id: number;
  tripId: number;
  forwarderId: number | null;
  expenseType: string;
  buyAmount: string;      // incl-VAT cost to company
  sellAmount: string;     // incl-VAT billed to customer (0 = internal only)
  settlementMethod: 'COMPANY_DIRECT' | 'FORWARDER_ADVANCE';
  supplierId: number | null;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  declarationNumber: string | null;
  containerNumber: string | null;
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  note: string | null;
  createdAt: string;
  updatedAt: string;
}
```

### Step 5 — Add `DebtOffset` interface

```typescript
export interface DebtOffset {
  id: number;
  customerId: number;
  supplierId: number;
  amount: string;
  offsetDate: string;
  note: string | null;
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdBy: number | null;
  approvedBy: number | null;
  approvedAt: string | null;
  createdAt: string;
}
```

### Step 6 — Update Zod schemas in `shared/src/schemas/index.ts`

Replace `tripExpenseSchema` (~line 388):

```typescript
export const ANCILLARY_EXPENSE_TYPES = [
  'LIFTING', 'LOWERING', 'WEIGHING', 'CUSTOMS',
  'INFRASTRUCTURE', 'INSPECTION', 'INSPECTION_SVC', 'OTHER',
] as const;

export const tripExpenseSchema = z.object({
  tripId: z.number().int().positive(),
  expenseType: z.enum(ANCILLARY_EXPENSE_TYPES),
  buyAmount: z.number().positive(),
  sellAmount: z.number().min(0).optional().default(0),
  settlementMethod: z.enum(['COMPANY_DIRECT', 'FORWARDER_ADVANCE']).default('FORWARDER_ADVANCE'),
  supplierId: z.number().int().positive().optional(),
  invoiceNumber: z.string().max(50).optional(),
  invoiceDate: z.string().optional(),       // ISO date YYYY-MM-DD
  declarationNumber: z.string().max(50).optional(),
  containerNumber: z.string().max(20).optional(),
  note: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.expenseType === 'CUSTOMS' && !data.declarationNumber) {
    ctx.addIssue({ code: 'custom', path: ['declarationNumber'], message: 'Số tờ khai là bắt buộc cho phí hải quan' });
  }
  if (data.settlementMethod === 'COMPANY_DIRECT' && !data.supplierId) {
    ctx.addIssue({ code: 'custom', path: ['supplierId'], message: 'Nhà cung cấp là bắt buộc khi chọn công ty trả trực tiếp' });
  }
});

export const debtOffsetSchema = z.object({
  customerId: z.number().int().positive(),
  supplierId: z.number().int().positive(),
  offsetDate: z.string(),   // ISO date
  note: z.string().optional(),
  // NOTE: no `amount` — server computes min(arBalance, apBalance)
});
```

Also add to trip create/update schema: `vatRate: z.number().min(0).max(0.5).optional().default(0)`, `carrierType: z.enum(['OWN','EXTERNAL']).optional().default('OWN')`, and conditional external-carrier fields.

### Step 7 — Build check

```bash
cd shared && npx tsc --noEmit
cd ../backend && npx tsc --noEmit
cd ../frontend && npx tsc --noEmit
```

All must pass with zero errors.

---

## TASK A3 — Generic approval mechanism

**Depends on:** A1  
**Blocks:** B3 (debt offsets), B2 (fee posting gating)

### Files to create/modify
- Create: `backend/src/services/approval.service.ts`
- Modify: `backend/src/casbin/policy.csv`

### Step 1 — Create `backend/src/services/approval.service.ts`

```typescript
import { db } from '../db';
import * as s from '../db/schema';
import { eq } from 'drizzle-orm';

export type ApprovableTable = 'trip_expenses' | 'debt_offsets';
export type ApprovalTransition = 'APPROVED' | 'REJECTED';

const ALLOWED_TABLES: Record<ApprovableTable, { table: any; statusCol: string }> = {
  trip_expenses: { table: s.tripExpenses, statusCol: 'approvalStatus' },
  debt_offsets:  { table: s.debtOffsets,  statusCol: 'approvalStatus' },
};

/**
 * Transitions an approvable record's status and logs the action.
 * Must be called inside a db.transaction().
 * Only MANAGER or ADMIN may approve; any authenticated user may reject.
 */
export async function transitionApproval(
  tx: any,
  opts: {
    table: ApprovableTable;
    id: number;
    toStatus: ApprovalTransition;
    actorId: number;
    actorRole: string;
    note?: string;
  },
): Promise<void> {
  if (opts.toStatus === 'APPROVED' && !['ADMIN', 'MANAGER'].includes(opts.actorRole)) {
    throw Object.assign(new Error('Chỉ quản lý mới có thể phê duyệt'), { status: 403 });
  }

  const { table } = ALLOWED_TABLES[opts.table];

  const [record] = await tx.select().from(table).where(eq(table.id, opts.id)).limit(1);
  if (!record) throw Object.assign(new Error('Không tìm thấy bản ghi'), { status: 404 });
  if (record.approvalStatus !== 'PENDING') {
    throw Object.assign(
      new Error(`Không thể chuyển trạng thái từ ${record.approvalStatus}`),
      { status: 400 }
    );
  }

  await tx.update(table).set({ approvalStatus: opts.toStatus }).where(eq(table.id, opts.id));
}
```

### Step 2 — Add Casbin rules for approval endpoints

In `backend/src/casbin/policy.csv`, ensure approval calls are gated as `financial:write`:

```csv
p, MANAGER, financial, write
p, ACCOUNTANT, financial, write
```

(ADMIN already has `*` wildcard. FORWARDER does not have `financial:write` — keep it that way.)

### Acceptance
- Calling `transitionApproval` with `actorRole='ACCOUNTANT'` and `toStatus='APPROVED'` throws 403.
- Calling with `actorRole='MANAGER'` on a `PENDING` record updates to `APPROVED`.
- Calling on a non-PENDING record throws 400.

---

## TASK A4 — Extend `computeTripTotals` + unit tests

**Depends on:** A2  
**Blocks:** B2, B4

### Files to modify
- `shared/src/calculations/tripTotals.ts`
- Create/update: `shared/src/calculations/tripTotals.test.ts`

### Step 1 — Extend input/output types

```typescript
// Add to ComputeTripTotalsInput:
vatRate?: number;           // default 0
carrierType?: 'OWN' | 'EXTERNAL';  // default 'OWN'
externalFreightCost?: number;       // incl-VAT, only for EXTERNAL
ancillaryFees?: Array<{
  buyAmount: number;
  sellAmount: number;
  vatRate?: number;       // per-fee VAT rate, default 0.080
}>;

// Add to ComputeTripTotalsOutput:
freightExVat: number;
serviceMargin: number;      // Σ(sell_ex_vat − buy_ex_vat) across ancillary fees
totalServiceBuy: number;    // Σ buy amounts (ex-VAT)
totalServiceSell: number;   // Σ sell amounts (ex-VAT)
externalMargin: number;     // for EXTERNAL trips: freightExVat − externalFreightExVat
externalFreightExVat: number;  // 0 for OWN trips
```

### Step 2 — Update `computeTripTotals` function

At the end of the existing function body, replace the final `totalCost`/`grossProfit` block:

```typescript
const vatRate = input.vatRate ?? 0;
const carrierType = input.carrierType ?? 'OWN';
const freightExVat = vatRate > 0 ? Math.round(input.revenue / (1 + vatRate)) : input.revenue;

// Ancillary service margin (fees in/out)
const ancillaryFees = input.ancillaryFees ?? [];
let totalServiceBuyExVat = 0;
let totalServiceSellExVat = 0;
for (const fee of ancillaryFees) {
  const feeVat = fee.vatRate ?? 0.080;
  totalServiceBuyExVat += feeVat > 0 ? Math.round(fee.buyAmount / (1 + feeVat)) : fee.buyAmount;
  totalServiceSellExVat += feeVat > 0 ? Math.round(fee.sellAmount / (1 + feeVat)) : fee.sellAmount;
}
const serviceMargin = totalServiceSellExVat - totalServiceBuyExVat;

let totalCost: number;
let grossProfit: number;
let externalMargin = 0;
let externalFreightExVat = 0;

if (carrierType === 'EXTERNAL') {
  const extCost = input.externalFreightCost ?? 0;
  externalFreightExVat = vatRate > 0 ? Math.round(extCost / (1 + vatRate)) : extCost;
  externalMargin = freightExVat - externalFreightExVat;
  totalCost = extCost;  // only the external freight cost; no fuel/allowance/salary
  grossProfit = externalMargin + serviceMargin;
} else {
  totalCost = totalFuelCost + totalRoadAllowance + input.driverSalary
    + input.twoPointDeliveryBonus + input.vehicleShiftAllowance;
  grossProfit = freightExVat - totalCost + serviceMargin;
}

return {
  totalFuelLiters, legCalculations, totalFuelCost, fuelPriceVariance, effectiveFuelPrice,
  totalRoadAllowance, totalCost, grossProfit,
  freightExVat, serviceMargin, totalServiceBuy: totalServiceBuyExVat,
  totalServiceSell: totalServiceSellExVat, externalMargin, externalFreightExVat,
};
```

### Step 3 — Write unit tests in `shared/src/calculations/tripTotals.test.ts`

```typescript
import { test } from 'node:test';
import assert from 'node:assert';
import { computeTripTotals } from './tripTotals.js';

const BASE = {
  legs: [{ sequence: 1, km: 100, loadingType: 'HANG' as const }],
  fuelMode: 'AUTO' as const,
  fuelLitersOverride: null,
  fuelSupplementLiters: 0,
  fuelLoadedNorm: 43,
  fuelEmptyNorm: 25,
  fuelPerTripSupplement: 3,
  fuelUnitPrice: 20000,
  isMountainRoute: false,
  mountainFixedAllowance: null,
  roadAllowanceBase: 500000,
  tollsDiscount: 0,
  tollsAddition: 0,
  tollsStations: 0,
  tollPerStation: 55000,
  hasReturnCargo: false,
  returnCargoBonus: 300000,
  revenue: 10800000,   // incl 8% VAT → ex-VAT = 10,000,000
  driverSalary: 800000,
  twoPointDeliveryBonus: 0,
  vehicleShiftAllowance: 0,
  roadAllowanceOverride: null,
};

test('OWN trip with VAT: freightExVat correctly computed', () => {
  const r = computeTripTotals({ ...BASE, vatRate: 0.08 });
  assert.strictEqual(r.freightExVat, 10000000);  // 10800000 / 1.08
});

test('OWN trip with ancillary fees: serviceMargin included in grossProfit', () => {
  const r = computeTripTotals({
    ...BASE, vatRate: 0.08,
    ancillaryFees: [
      { buyAmount: 540000, sellAmount: 540000, vatRate: 0.08 },   // at-cost: margin 0
      { buyAmount: 540000, sellAmount: 1080000, vatRate: 0.08 },  // markup: margin 500000 ex-VAT
    ],
  });
  assert.strictEqual(r.serviceMargin, 500000);  // (1000000 - 500000)
});

test('EXTERNAL trip: externalMargin = freightExVat - externalFreightExVat', () => {
  const r = computeTripTotals({
    ...BASE, vatRate: 0.08, carrierType: 'EXTERNAL',
    externalFreightCost: 5400000,  // incl-VAT → ex-VAT = 5,000,000
    revenue: 10800000,
  });
  assert.strictEqual(r.externalFreightExVat, 5000000);
  assert.strictEqual(r.externalMargin, 5000000);  // 10000000 - 5000000
  assert.strictEqual(r.totalCost, 5400000);        // only external freight (incl-VAT stored for AP)
  assert.strictEqual(r.grossProfit, 5000000);      // externalMargin + serviceMargin(0)
});

test('backward-compat: vatRate=0 returns revenue unchanged as freightExVat', () => {
  const r = computeTripTotals(BASE);  // no vatRate
  assert.strictEqual(r.freightExVat, BASE.revenue);
});

test('existing AUTO calculation still passes', () => {
  // 100km HANG: 43L/100 = 43L + 3 supplement = 46L
  const r = computeTripTotals(BASE);
  assert.strictEqual(r.totalFuelLiters, 46);
  assert.strictEqual(r.totalFuelCost, 920000);
});
```

### Step 4 — Run tests

```bash
cd shared && node --test src/calculations/tripTotals.test.ts
```

All tests must pass.

---

## TASK B1 — Ancillary fee service, routes, and seed

**Depends on:** A1, A2  
**Blocks:** B2 (needs fees seeded), C1, C2

### Files to create/modify
- Create: `backend/src/services/tripExpense.service.ts`
- Modify: `backend/src/routes/trips.ts` (add expense endpoints)
- Modify: `backend/src/routes/forwarder.ts` (update expense create to new schema)
- Modify: `backend/src/seed.ts` (seed 8 fee types)

### Step 1 — Create `backend/src/services/tripExpense.service.ts`

```typescript
import * as s from '../db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { tripExpenseSchema } from '@nepocorp/shared';
import { z } from 'zod';

type CreateExpenseInput = z.infer<typeof tripExpenseSchema> & { forwarderId?: number };

export async function createTripExpense(tx: any, input: CreateExpenseInput) {
  const [row] = await tx.insert(s.tripExpenses).values({
    tripId: input.tripId,
    forwarderId: input.forwarderId ?? null,
    expenseType: input.expenseType,
    buyAmount: String(input.buyAmount),
    sellAmount: String(input.sellAmount ?? 0),
    settlementMethod: input.settlementMethod ?? 'FORWARDER_ADVANCE',
    supplierId: input.supplierId ?? null,
    invoiceNumber: input.invoiceNumber ?? null,
    invoiceDate: input.invoiceDate ?? null,
    declarationNumber: input.declarationNumber ?? null,
    containerNumber: input.containerNumber ?? null,
    // Forwarder-entered sell-price edits start PENDING (D-C);
    // accountant/admin-created fees start APPROVED.
    approvalStatus: input.forwarderId != null ? 'PENDING' : 'APPROVED',
    note: input.note ?? null,
  }).returning();
  return row;
}

export async function updateTripExpense(tx: any, id: number, input: Partial<CreateExpenseInput>) {
  const patch: Record<string, any> = {};
  if (input.buyAmount !== undefined) patch.buyAmount = String(input.buyAmount);
  if (input.sellAmount !== undefined) {
    patch.sellAmount = String(input.sellAmount);
    // Re-pend if forwarder edits the sell side
    if (input.forwarderId != null) patch.approvalStatus = 'PENDING';
  }
  if (input.settlementMethod !== undefined) patch.settlementMethod = input.settlementMethod;
  if (input.supplierId !== undefined) patch.supplierId = input.supplierId;
  if (input.invoiceNumber !== undefined) patch.invoiceNumber = input.invoiceNumber;
  if (input.invoiceDate !== undefined) patch.invoiceDate = input.invoiceDate;
  if (input.declarationNumber !== undefined) patch.declarationNumber = input.declarationNumber;
  if (input.containerNumber !== undefined) patch.containerNumber = input.containerNumber;
  if (input.note !== undefined) patch.note = input.note;
  patch.updatedAt = new Date();

  const [row] = await tx.update(s.tripExpenses).set(patch).where(eq(s.tripExpenses.id, id)).returning();
  return row;
}

export async function deleteTripExpense(tx: any, id: number) {
  await tx.delete(s.tripExpenses).where(eq(s.tripExpenses.id, id));
}

export async function getTripExpenses(db: any, tripId: number) {
  return db.select().from(s.tripExpenses).where(
    and(eq(s.tripExpenses.tripId, tripId), isNull(s.tripExpenses.deletedAt ?? null))
  );
}
```

### Step 2 — Add expense endpoints to `backend/src/routes/trips.ts`

```typescript
import { createTripExpense, updateTripExpense, deleteTripExpense, getTripExpenses } from '../services/tripExpense.service';
import { tripExpenseSchema } from '@nepocorp/shared';

// GET /api/trips/:id/expenses
router.get('/:id/expenses', asyncHandler(async (req: Request, res: Response) => {
  const tripId = parseInt(req.params.id, 10);
  const expenses = await getTripExpenses(db, tripId);
  res.json(expenses);
}));

// POST /api/trips/:id/expenses
router.post('/:id/expenses', asyncHandler(async (req: Request, res: Response) => {
  const tripId = parseInt(req.params.id, 10);
  const data = tripExpenseSchema.parse({ ...req.body, tripId });
  const result = await db.transaction(async (tx) =>
    createTripExpense(tx, { ...data, forwarderId: undefined })  // accountant-created = APPROVED
  );
  res.status(201).json(result);
}));

// PUT /api/trips/:id/expenses/:eid
router.put('/:id/expenses/:eid', asyncHandler(async (req: Request, res: Response) => {
  const eid = parseInt(req.params.eid, 10);
  const data = tripExpenseSchema.partial().parse(req.body);
  const result = await db.transaction(async (tx) => updateTripExpense(tx, eid, data));
  res.json(result);
}));

// DELETE /api/trips/:id/expenses/:eid
router.delete('/:id/expenses/:eid', asyncHandler(async (req: Request, res: Response) => {
  const eid = parseInt(req.params.eid, 10);
  await db.transaction(async (tx) => deleteTripExpense(tx, eid));
  res.json({ ok: true });
}));
```

### Step 3 — Update forwarder portal expense create (`backend/src/routes/forwarder.ts`)

The existing forwarder expense create at `POST /api/forwarder/me/expenses` currently accepts `{ tripId, expenseType, amount, note }`. Update it to use the full `tripExpenseSchema` and set `forwarderId = req.user.userId` (which lands the fee as `PENDING`):

```typescript
router.post('/me/expenses', asyncHandler(async (req: Request, res: Response) => {
  const forwarderId = req.user!.userId;
  const data = tripExpenseSchema.parse(req.body);
  const result = await db.transaction(async (tx) =>
    createTripExpense(tx, { ...data, forwarderId })  // PENDING because forwarder
  );
  res.status(201).json(result);
}));
```

### Step 4 — Add approval endpoint for trip expenses

In `backend/src/routes/financial.ts` (or `trips.ts`):

```typescript
// POST /api/trips/:id/expenses/:eid/approve
router.post('/:id/expenses/:eid/approve', requireRoles(['ADMIN','MANAGER']), asyncHandler(async (req: Request, res: Response) => {
  const eid = parseInt(req.params.eid, 10);
  await db.transaction(async (tx) =>
    transitionApproval(tx, {
      table: 'trip_expenses',
      id: eid,
      toStatus: 'APPROVED',
      actorId: req.user!.userId,
      actorRole: req.user!.role,
      note: req.body.note,
    })
  );
  res.json({ ok: true });
}));
```

### Step 5 — Seed the 8 fee types in `backend/src/seed.ts`

```typescript
import { FORWARDER_EXPENSE_TYPE_DEFAULTS } from '@nepocorp/shared';

// Inside seed():
const existingFeeTypes = await db.select({ code: schema.forwarderExpenseTypes.code }).from(schema.forwarderExpenseTypes);
const existingCodes = new Set(existingFeeTypes.map(f => f.code));

for (const [code, meta] of Object.entries(FORWARDER_EXPENSE_TYPE_DEFAULTS)) {
  if (existingCodes.has(code)) {
    // Update existing rows with new columns
    await db.update(schema.forwarderExpenseTypes)
      .set({ name: meta.name, defaultMarkup: meta.defaultMarkup, billingLabel: meta.billingLabel, vatRate: '0.080' })
      .where(eq(schema.forwarderExpenseTypes.code, code));
  } else {
    await db.insert(schema.forwarderExpenseTypes)
      .values({ code, name: meta.name, defaultMarkup: meta.defaultMarkup, billingLabel: meta.billingLabel, vatRate: '0.080' });
  }
}
```

Run: `cd backend && npm run seed`

### Acceptance
- `POST /api/trips/:id/expenses` with CUSTOMS and no `declarationNumber` → 400.
- `POST /api/forwarder/me/expenses` creates expense with `approvalStatus='PENDING'`.
- `POST /api/trips/:id/expenses` (accountant) creates with `approvalStatus='APPROVED'`.
- Seed: all 8 fee types present in `forwarder_expense_types` with `defaultMarkup` correct.

---

## TASK B2 — Extend `lockTrip` for fees and external carrier ledger posting

**Depends on:** A1, A2, A3, A4, B1  
**Blocks:** nothing directly, but must be done before end-to-end testing

### Files to modify
- `backend/src/services/trip.service.ts` (~line 496, `lockTrip` function)
- `backend/src/services/ledger.service.ts` (extend `postTripLock`)

### Step 1 — Extend `LedgerService.postTripLock` signature

The current signature is `postTripLock(tx, trip: { id, customerId, driverId, tripCode, revenue, driverSalary })`.

Extend it to:

```typescript
static async postTripLock(tx: any, trip: {
  id: number;
  tripCode: string | null;
  customerId: number;
  driverId: number | null;          // null for EXTERNAL trips
  tripCode: string | null;
  revenue: string | null;           // incl-VAT total freight
  driverSalary: string | null;
  carrierType: string;              // 'OWN' | 'EXTERNAL'
  externalCarrierId: number | null;
  externalFreightCost: string | null;
  ancillaryFees: Array<{
    id: number;
    buyAmount: string;
    sellAmount: string;
    settlementMethod: string;
    supplierId: number | null;
    forwarderId: number | null;
    approvalStatus: string;
  }>;
}): Promise<void>
```

### Step 2 — Inside `postTripLock`: collect entities to lock

```typescript
const entitiesToLock: Array<{ entityType: 'CUSTOMER'|'DRIVER'|'VENDOR'|'FORWARDER'; entityId: number }> = [];

// Always lock trip customer
entitiesToLock.push({ entityType: 'CUSTOMER', entityId: trip.customerId });

// External carrier customer (D-F)
if (trip.carrierType === 'EXTERNAL' && trip.externalCarrierId) {
  if (trip.externalCarrierId !== trip.customerId) {
    entitiesToLock.push({ entityType: 'CUSTOMER', entityId: trip.externalCarrierId });
  }
}

// OWN driver salary
if (trip.carrierType === 'OWN' && trip.driverId) {
  entitiesToLock.push({ entityType: 'DRIVER', entityId: trip.driverId });
}

// APPROVED COMPANY_DIRECT suppliers
for (const fee of trip.ancillaryFees) {
  if (fee.approvalStatus === 'APPROVED' && fee.settlementMethod === 'COMPANY_DIRECT' && fee.supplierId) {
    if (!entitiesToLock.find(e => e.entityType === 'VENDOR' && e.entityId === fee.supplierId)) {
      entitiesToLock.push({ entityType: 'VENDOR', entityId: fee.supplierId });
    }
  }
  if (fee.approvalStatus === 'APPROVED' && fee.settlementMethod === 'FORWARDER_ADVANCE' && fee.forwarderId) {
    if (!entitiesToLock.find(e => e.entityType === 'FORWARDER' && e.entityId === fee.forwarderId)) {
      entitiesToLock.push({ entityType: 'FORWARDER', entityId: fee.forwarderId });
    }
  }
}

await this.lockEntities(tx, entitiesToLock);
```

### Step 3 — Post revenue and carrier cost

```typescript
const revenue = Number(trip.revenue || 0);
const label = trip.tripCode || '';

// 1. Customer AR (incl-VAT, unchanged)
await this.postEntry(tx, {
  txnType: TxnType.TRIP_REVENUE,
  txnId: trip.id,
  entityType: 'CUSTOMER',
  entityId: trip.customerId,
  debit: revenue,
  credit: 0,
  note: `Doanh thu chuyến ${label}`,
});

// 2. OWN: driver salary
if (trip.carrierType === 'OWN' && trip.driverId && Number(trip.driverSalary || 0) > 0) {
  await this.postEntry(tx, {
    txnType: TxnType.DRIVER_SALARY,
    txnId: trip.id,
    entityType: 'DRIVER',
    entityId: trip.driverId,
    debit: 0,
    credit: Number(trip.driverSalary),
    note: `Lương sản lượng chuyến ${label}`,
  });
}

// 3. EXTERNAL: carrier payable as CREDIT on their CUSTOMER ledger (D-F)
if (trip.carrierType === 'EXTERNAL' && trip.externalCarrierId && Number(trip.externalFreightCost || 0) > 0) {
  await this.postEntry(tx, {
    txnType: TxnType.EXTERNAL_CARRIER_COST,  // D-D
    txnId: trip.id,
    entityType: 'CUSTOMER',  // D-F: carrier is a customer entity
    entityId: trip.externalCarrierId,
    debit: 0,
    credit: Number(trip.externalFreightCost),  // credit → negative balance = we owe them
    note: `Cước thuê ngoài chuyến ${label}`,
  });
}
```

### Step 4 — Post APPROVED ancillary fees

```typescript
for (const fee of trip.ancillaryFees) {
  if (fee.approvalStatus !== 'APPROVED') continue;  // skip PENDING/REJECTED

  const buyAmt = Number(fee.buyAmount);
  if (buyAmt <= 0) continue;

  if (fee.settlementMethod === 'COMPANY_DIRECT' && fee.supplierId) {
    // D-A: Company pays supplier directly → AP
    await this.postEntry(tx, {
      txnType: TxnType.VENDOR_EXPENSE,
      txnId: fee.id,
      entityType: 'VENDOR',
      entityId: fee.supplierId,
      debit: 0,
      credit: buyAmt,
      note: `Chi phí DV chuyến ${label}`,
    });
  } else if (fee.settlementMethod === 'FORWARDER_ADVANCE' && fee.forwarderId) {
    // D-A: Forwarder paid from advance → reduce advance balance (debit on FORWARDER)
    await this.postEntry(tx, {
      txnType: TxnType.FORWARDER_ADVANCE,
      txnId: fee.id,
      entityType: 'FORWARDER',
      entityId: fee.forwarderId,
      debit: buyAmt,   // debit reduces FORWARDER balance (balance += credit - debit)
      credit: 0,
      note: `Chi hộ DV chuyến ${label}`,
    });
  }
}
```

### Step 5 — Update `lockTrip` in `trip.service.ts` to load fees and call extended `postTripLock`

Inside `lockTrip`, before calling `LedgerService.postTripLock`:

```typescript
const fees = await db.select().from(s.tripExpenses)
  .where(eq(s.tripExpenses.tripId, trip.id));

await LedgerService.postTripLock(tx, {
  id: trip.id,
  tripCode: trip.tripCode,
  customerId: trip.customerId,
  driverId: trip.driverId,
  revenue: trip.revenue,
  driverSalary: trip.driverSalary,
  carrierType: trip.carrierType ?? 'OWN',
  externalCarrierId: trip.externalCarrierId ?? null,
  externalFreightCost: trip.externalFreightCost ?? null,
  ancillaryFees: fees,
});
```

### Acceptance
- Lock an OWN trip with 1 COMPANY_DIRECT fee (supplierId=X) → VENDOR ledger for X gains a credit entry.
- Lock an OWN trip with 1 FORWARDER_ADVANCE fee (forwarderId=Y) → FORWARDER ledger for Y gains a debit entry.
- Lock an EXTERNAL trip (externalCarrierId=Z) → CUSTOMER ledger for Z gains a CREDIT entry (negative balance); no DRIVER_SALARY entry.
- PENDING fees are skipped (no ledger entry).

---

## TASK B3 — Debt-offset endpoints

**Depends on:** A1, A2, A3  
**Blocks:** C4

### Files to create/modify
- Create: `backend/src/services/debtOffset.service.ts`
- Modify: `backend/src/routes/financial.ts`

### Step 1 — Create `backend/src/services/debtOffset.service.ts`

```typescript
import { db } from '../db';
import * as s from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { LedgerService } from './ledger.service';
import { TxnType } from '@nepocorp/shared';
import { transitionApproval } from './approval.service';

export async function getDualEntities() {
  // Customers that have a linked supplier
  const linked = await db.select({
    customerId: s.customers.id,
    customerName: s.customers.name,
    supplierId: s.customers.linkedSupplierId,
  }).from(s.customers)
    .where(and(
      sql`${s.customers.linkedSupplierId} IS NOT NULL`,
      isNull(s.customers.deletedAt)
    ));

  return Promise.all(linked.map(async (row) => {
    const arBalance = await LedgerService.getBalance('CUSTOMER', row.customerId);
    const apBalance = await LedgerService.getBalance('VENDOR', row.supplierId!);
    return {
      customerId: row.customerId,
      customerName: row.customerName,
      supplierId: row.supplierId,
      arBalance,
      apBalance,
      netBalance: arBalance - apBalance,
      offsetAmount: Math.min(arBalance, apBalance),
    };
  }));
}

export async function createDebtOffset(input: {
  customerId: number;
  supplierId: number;
  offsetDate: string;
  note?: string;
  createdBy: number;
}) {
  const arBalance = await LedgerService.getBalance('CUSTOMER', input.customerId);
  const apBalance = await LedgerService.getBalance('VENDOR', input.supplierId);
  const amount = Math.min(arBalance, apBalance);

  if (amount <= 0) throw Object.assign(new Error('Không có số dư để đối trừ'), { status: 400 });

  const [row] = await db.insert(s.debtOffsets).values({
    customerId: input.customerId,
    supplierId: input.supplierId,
    amount: String(amount),
    offsetDate: input.offsetDate,
    note: input.note ?? null,
    approvalStatus: 'PENDING',
    createdBy: input.createdBy,
  }).returning();
  return row;
}

export async function approveDebtOffset(id: number, actorId: number, actorRole: string) {
  return db.transaction(async (tx) => {
    await transitionApproval(tx, { table: 'debt_offsets', id, toStatus: 'APPROVED', actorId, actorRole });

    const [offset] = await tx.select().from(s.debtOffsets).where(eq(s.debtOffsets.id, id)).limit(1);
    const amount = Number(offset.amount);

    await LedgerService.lockEntities(tx, [
      { entityType: 'CUSTOMER', entityId: offset.customerId },
      { entityType: 'VENDOR',   entityId: offset.supplierId },
    ]);

    // Debit on CUSTOMER → reduces AR (CUSTOMER balance += debit − credit)
    await LedgerService.postEntry(tx, {
      txnType: TxnType.ADJUSTMENT,
      txnId: id,
      entityType: 'CUSTOMER',
      entityId: offset.customerId,
      debit: 0,
      credit: amount,  // credit reduces customer balance
      note: `Đối trừ công nợ #${id}`,
    });

    // Credit on VENDOR → reduces AP (VENDOR balance += credit − debit)
    await LedgerService.postEntry(tx, {
      txnType: TxnType.ADJUSTMENT,
      txnId: id,
      entityType: 'VENDOR',
      entityId: offset.supplierId,
      debit: amount,  // debit reduces vendor balance
      credit: 0,
      note: `Đối trừ công nợ #${id}`,
    });

    return offset;
  });
}
```

### Step 2 — Add routes to `backend/src/routes/financial.ts`

```typescript
import { getDualEntities, createDebtOffset, approveDebtOffset } from '../services/debtOffset.service';
import { debtOffsetSchema } from '@nepocorp/shared';

// GET /api/finance/dual-entities
router.get('/finance/dual-entities', asyncHandler(async (req: Request, res: Response) => {
  res.json(await getDualEntities());
}));

// POST /api/finance/debt-offsets
router.post('/finance/debt-offsets', asyncHandler(async (req: Request, res: Response) => {
  const data = debtOffsetSchema.parse(req.body);
  const result = await createDebtOffset({ ...data, createdBy: req.user!.userId });
  res.status(201).json(result);
}));

// GET /api/finance/debt-offsets
router.get('/finance/debt-offsets', asyncHandler(async (req: Request, res: Response) => {
  const { customerId, supplierId } = req.query;
  const conditions = [];
  if (customerId) conditions.push(eq(s.debtOffsets.customerId, Number(customerId)));
  if (supplierId) conditions.push(eq(s.debtOffsets.supplierId, Number(supplierId)));
  const rows = await db.select().from(s.debtOffsets)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(s.debtOffsets.createdAt));
  res.json(rows);
}));

// POST /api/finance/debt-offsets/:id/approve
router.post('/finance/debt-offsets/:id/approve', requireRoles(['ADMIN','MANAGER']), asyncHandler(async (req: Request, res: Response) => {
  const result = await approveDebtOffset(
    parseInt(req.params.id, 10),
    req.user!.userId,
    req.user!.role,
  );
  res.json(result);
}));
```

### Acceptance
- `POST /api/finance/debt-offsets` with customer AR=5M, supplier AP=3M → creates offset with amount=3M, status=PENDING.
- `POST /api/finance/debt-offsets/:id/approve` → both AR and AP drop by 3M; status=APPROVED.
- Approve with ACCOUNTANT role → 403.
- Second approve on same record → 400 (not PENDING).

---

## TASK B4 — Per-vehicle P&L: service + external margins

**Depends on:** A1, A2, A4  
**Blocks:** C5

### Files to modify
- `backend/src/services/reporting.service.ts` (getPnlReport ~line 119)
- `shared/src/types/index.ts` (PnlTruck ~line 628)

### Step 1 — Extend `PnlTruck` type in `shared/src/types/index.ts`

```typescript
export interface PnlTruck {
  // ... existing fields (id, plate, trips, revenue, costs, profit) ...
  serviceMargin: number;      // Σ ancillary sell-buy margin (ex-VAT)
  externalMargin: number;     // Σ external management margin (ex-VAT)
  maintenanceExpenses?: { truck: number; trailer: number };
}

export interface PnlReport {
  // ... existing fields ...
  serviceMarginTotal: number;
  externalMarginTotal: number;
  externalTripsCount: number;
}
```

### Step 2 — Update `getPnlReport` in `reporting.service.ts`

For each trip in the period:
1. Fetch associated `trip_expenses` where `approvalStatus='APPROVED'`.
2. Compute `serviceMargin` via: `Σ((sell_amount - buy_amount) / (1 + fee_vat_rate))` or simply `Σ(sell_amount - buy_amount)` (net incl-VAT margin is acceptable for now).
3. For EXTERNAL trips: `externalMargin = (revenue / (1 + vat_rate)) - (external_freight_cost / (1 + vat_rate))`.
4. Group EXTERNAL trips under a **"Xe ngoài"** bucket (truck_id = null).
5. Treat customers with **negative balance** (EXTERNAL_CARRIER_COST credits) differently in aging: negative = owed-to-carrier, exclude from overdue AR.

Key code addition in the per-truck aggregation:

```typescript
const ownTrips = monthTrips.filter(t => (t.carrierType ?? 'OWN') === 'OWN');
const extTrips = monthTrips.filter(t => t.carrierType === 'EXTERNAL');

// ... existing OWN truck grouping stays unchanged ...

// External bucket
const extServiceMargin = extTrips.reduce((sum, t) => {
  const fees = tripFeeMap.get(t.id) ?? [];
  return sum + fees.filter(f => f.approvalStatus === 'APPROVED')
    .reduce((s, f) => s + (Number(f.sellAmount) - Number(f.buyAmount)), 0);
}, 0);
const extMgmtMargin = extTrips.reduce((sum, t) => {
  const vat = Number(t.vatRate ?? 0);
  const rev = Number(t.revenue ?? 0);
  const cost = Number(t.externalFreightCost ?? 0);
  return sum + (vat > 0 ? Math.round(rev / (1 + vat)) - Math.round(cost / (1 + vat)) : rev - cost);
}, 0);
if (extTrips.length > 0) {
  truckBreakdown.push({
    id: 0, plate: 'Xe ngoài', trips: extTrips.length,
    revenue: extTrips.reduce((s, t) => s + Number(t.revenue ?? 0), 0),
    costs: extTrips.reduce((s, t) => s + Number(t.externalFreightCost ?? 0), 0),
    profit: extMgmtMargin + extServiceMargin,
    serviceMargin: extServiceMargin,
    externalMargin: extMgmtMargin,
    maintenanceExpenses: { truck: 0, trailer: 0 },
  });
}
```

### Acceptance
- P&L response for a month with one EXTERNAL trip includes a `Xe ngoài` bucket with correct `externalMargin`.
- P&L response includes `serviceMarginTotal` and `externalMarginTotal` in the summary.

---

## TASK C1 — Trip form: carrier toggle, VAT, ancillary fee grid; TripDetail display

**Depends on:** B1 (fee type endpoint needed for dropdown data)  
**Blocks:** nothing

### Files to modify
- `frontend/src/hooks/useTripForm.ts`
- `frontend/src/pages/TripCreatePage.tsx`
- `frontend/src/pages/TripEditPage.tsx`
- `frontend/src/pages/TripDetailPage.tsx`
- `frontend/src/api/tripClient.ts`

### Step 1 — Add carrier-type state and external-carrier fields to `useTripForm.ts`

Add to form state:
```typescript
carrierType: 'OWN' | 'EXTERNAL'     // default 'OWN'
vatRate: number                       // default 0.08 (prefilled from customer)
externalCarrierId: number | null
externalFreightCost: number | null
externalPlateNumber: string
externalDriverName: string
externalDriverPhone: string
ancillaryFees: AncillaryFeeRow[]
```

Where `AncillaryFeeRow`:
```typescript
interface AncillaryFeeRow {
  expenseType: string;
  buyAmount: number;
  sellAmount: number;
  settlementMethod: 'COMPANY_DIRECT' | 'FORWARDER_ADVANCE';
  supplierId: number | null;
  invoiceNumber: string;
  invoiceDate: string;
  declarationNumber: string;
  containerNumber: string;
  note: string;
}
```

### Step 2 — UI: Carrier toggle in `TripCreatePage.tsx` / `TripEditPage.tsx`

```tsx
{/* Carrier type toggle */}
<div className="flex gap-2">
  <button
    type="button"
    className={`px-4 py-2 rounded ${carrierType === 'OWN' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
    onClick={() => setCarrierType('OWN')}
  >
    Xe nhà
  </button>
  <button
    type="button"
    className={`px-4 py-2 rounded ${carrierType === 'EXTERNAL' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
    onClick={() => setCarrierType('EXTERNAL')}
  >
    Xe ngoài
  </button>
</div>

{carrierType === 'OWN' && (
  /* existing Truck + Driver dropdowns */
)}

{carrierType === 'EXTERNAL' && (
  <>
    <Select label="Đối tác vận chuyển" options={carrierCustomers} /* customers where is_carrier=true */ />
    <NumberInput label="Giá cước thuê ngoài (gồm VAT)" />
    <TextInput label="Biển số xe" />
    <TextInput label="Tên lái xe" />
    <TextInput label="SĐT lái xe" />
    <div className="text-sm text-gray-500">
      Lãi điều xe ngoài (dự kiến): {formatVnd(externalMarginPreview)}
    </div>
  </>
)}

{/* VAT rate */}
<Select label="Thuế VAT" options={[{label:'8%',value:0.08},{label:'10%',value:0.10},{label:'0%',value:0}]} />
```

### Step 3 — Ancillary fee grid

```tsx
<section>
  <h3>Chi phí dịch vụ đi kèm</h3>
  <table>
    <thead>
      <tr>
        <th>Loại phí</th><th>Mua vào</th><th>Bán ra</th><th>Lãi DV</th>
        <th>NCC</th><th>Hình thức</th><th>Số HĐ</th><th>Ngày HĐ</th>
        <th>Số tờ khai</th><th>Số cont</th><th></th>
      </tr>
    </thead>
    <tbody>
      {ancillaryFees.map((fee, i) => (
        <tr key={i}>
          <td><Select options={feeTypeOptions} value={fee.expenseType} onChange={...} /></td>
          <td><NumberInput value={fee.buyAmount} onChange={...} /></td>
          <td><NumberInput value={fee.sellAmount} onChange={...} /></td>
          <td className="text-right text-sm">{formatVnd(fee.sellAmount - fee.buyAmount)}</td>
          <td><Select options={supplierOptions} value={fee.supplierId} nullable /></td>
          <td>
            <Select value={fee.settlementMethod} options={[
              {label:'Chi hộ tạm ứng',value:'FORWARDER_ADVANCE'},
              {label:'Công ty trả',value:'COMPANY_DIRECT'}
            ]} />
          </td>
          <td><TextInput value={fee.invoiceNumber} /></td>
          <td><DateInput value={fee.invoiceDate} /></td>
          {fee.expenseType === 'CUSTOMS' && <td><TextInput value={fee.declarationNumber} /></td>}
          <td><TextInput value={fee.containerNumber} /></td>
          <td><button onClick={() => removeFee(i)}>✕</button></td>
        </tr>
      ))}
    </tbody>
  </table>
  <button onClick={addFeeRow}>+ Thêm phí</button>
</section>
```

### Step 4 — TripDetailPage: external carrier section + service margin

When `trip.carrierType === 'EXTERNAL'`:
```tsx
<section className="border rounded p-4">
  <h3>Xe ngoài</h3>
  <dl>
    <dt>Đối tác vận chuyển</dt><dd>{externalCarrierName}</dd>
    <dt>Biển số xe</dt><dd>{trip.externalPlateNumber}</dd>
    <dt>Lái xe</dt><dd>{trip.externalDriverName} — {trip.externalDriverPhone}</dd>
    <dt>Cước thuê ngoài (gồm VAT)</dt><dd>{formatVnd(trip.externalFreightCost)}</dd>
    <dt>Lãi điều xe ngoài</dt><dd className="font-bold text-green-700">{formatVnd(externalMargin)}</dd>
  </dl>
</section>
```

Also show the ancillary fee grid (read-only) with buy/sell/margin columns and approval badges.

### Step 5 — Add API client methods to `tripClient.ts`

```typescript
createTripExpense: (tripId: number, data: object) =>
  api.post<TripExpense>(`/api/trips/${tripId}/expenses`, data),

listTripExpenses: (tripId: number) =>
  api.get<TripExpense[]>(`/api/trips/${tripId}/expenses`),

approveTripExpense: (tripId: number, eid: number) =>
  api.post<void>(`/api/trips/${tripId}/expenses/${eid}/approve`, {}),
```

### Acceptance
- Create an OWN trip → existing behavior unchanged.
- Create an EXTERNAL trip with carrier + freight cost → trip saved with `carrierType='EXTERNAL'`.
- Ancillary fee grid: adding a CUSTOMS fee without declarationNumber shows inline validation error.
- TripDetail shows external carrier section when applicable.

---

## TASK C2 — Forwarder portal expense form upgrade

**Depends on:** B1  
**Blocks:** nothing

### Files to modify
- `frontend/src/pages/ForwarderTripDetailPage.tsx` (expense form ~line 40-114)

### Step 1 — Replace single `amount` field with full buy/sell form

The current expense form has: `expenseType, amount, note`.

Replace with:
```tsx
<form onSubmit={handleSubmitExpense}>
  <Select label="Loại chi phí" name="expenseType" options={feeTypeOptions} required />
  <NumberInput label="Giá mua vào (VNĐ)" name="buyAmount" min={1} required />
  <NumberInput
    label="Giá bán ra (VNĐ)"
    name="sellAmount"
    value={sellAmount}
    hint={defaultMarkup ? 'Gợi ý: cộng thêm phí quản lý' : 'Mặc định bằng giá mua'}
  />
  <Select label="NCC" name="supplierId" options={supplierOptions} nullable />
  <Select label="Hình thức chi" name="settlementMethod" options={[
    { label: 'Chi hộ tạm ứng', value: 'FORWARDER_ADVANCE' },
    { label: 'Công ty trả trực tiếp', value: 'COMPANY_DIRECT' },
  ]} />
  <TextInput label="Số hóa đơn" name="invoiceNumber" />
  <DateInput label="Ngày hóa đơn" name="invoiceDate" />
  {expenseType === 'CUSTOMS' && (
    <TextInput label="Số tờ khai hải quan" name="declarationNumber" required />
  )}
  <TextInput label="Số container" name="containerNumber" />
  <TextInput label="Ghi chú" name="note" />
  <button type="submit">Lưu</button>
</form>
```

When expense has `approvalStatus='PENDING'`, show a badge: `Chờ duyệt` in yellow. Keep the delete button (ownership check still applies).

When `sellAmount` field changes, auto-fill from `buyAmount` if the fee type has `defaultMarkup=false` (at-cost default).

### Acceptance
- Forwarder creates CUSTOMS fee without declarationNumber → validation error.
- Created fee shows `approvalStatus='PENDING'` badge.
- After manager approves, badge changes to `Đã duyệt`.

---

## TASK C3 — Customer and supplier linking fields

**Depends on:** A1, A2  
**Blocks:** C4 (debt-netting UI needs linked entities)

### Files to modify
- `frontend/src/pages/CustomersPage.tsx`
- `frontend/src/pages/SupplierListPage.tsx`

### Step 1 — Add fields to Customers form

In the inline add/edit form:
```tsx
{/* is_carrier */}
<label className="flex items-center gap-2">
  <input type="checkbox" checked={isCarrier} onChange={e => setIsCarrier(e.target.checked)} />
  Đối tác vận tải (xe ngoài)
</label>

{/* debit_note_mode */}
<Select
  label="Phương thức Giấy báo nợ"
  value={debitNoteMode}
  onChange={setDebitNoteMode}
  options={[
    { label: 'Theo tháng', value: 'MONTHLY' },
    { label: 'Theo lô', value: 'PER_BATCH' },
  ]}
/>

{/* linked_supplier_id */}
<Select
  label="Liên kết Nhà cung cấp (đối trừ công nợ)"
  value={linkedSupplierId}
  onChange={setLinkedSupplierId}
  options={supplierOptions}
  nullable
  hint="Nếu đối tác này cũng là NCC, chọn để cho phép đối trừ"
/>
```

Include these fields in the `POST /api/customers` and `PUT /api/customers/:id` request bodies.

### Step 2 — Add `linked_customer_id` to Suppliers form

```tsx
<Select
  label="Liên kết Khách hàng (đối trừ công nợ)"
  value={linkedCustomerId}
  onChange={setLinkedCustomerId}
  options={customerOptions}
  nullable
/>
```

### Acceptance
- Save customer with `isCarrier=true` → that customer appears in the carrier dropdown in the trip form (C1).
- Save customer with `linkedSupplierId=X` → the supplier with `linkedCustomerId` set reciprocally appears in `/api/finance/dual-entities`.

---

## TASK C4 — Debt-netting UI

**Depends on:** B3, C3  
**Blocks:** nothing

### Files to create/modify
- `frontend/src/pages/DebtListPage.tsx`
- `frontend/src/pages/DebtDetailPage.tsx`
- Create: `frontend/src/components/DebtOffsetModal.tsx`

### Step 1 — DebtListPage: add "Đối tác 2 chiều" badge

For customers that have `linkedSupplierId !== null`, show a green badge `2 chiều` next to their name in the debt list table. Add a "Net công nợ" column showing `arBalance - apBalance`.

### Step 2 — DebtDetailPage: add AP card and offset button

When the customer has `linkedSupplierId`:
```tsx
{customer.linkedSupplierId && (
  <div className="border rounded p-4 mt-4">
    <h3>Công nợ phải trả (với NCC liên kết)</h3>
    <p className="text-lg font-bold">{formatVnd(apBalance)}</p>
    <button
      className="mt-2 px-4 py-2 bg-orange-500 text-white rounded"
      onClick={() => setOffsetModalOpen(true)}
    >
      Đối trừ công nợ
    </button>
  </div>
)}
<DebtOffsetModal
  open={offsetModalOpen}
  customerId={customer.id}
  supplierId={customer.linkedSupplierId}
  arBalance={arBalance}
  apBalance={apBalance}
  onClose={() => setOffsetModalOpen(false)}
  onSuccess={() => { refetch(); setOffsetModalOpen(false); }}
/>
```

### Step 3 — Create `DebtOffsetModal.tsx`

```tsx
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';

interface Props {
  open: boolean;
  customerId: number;
  supplierId: number;
  arBalance: number;
  apBalance: number;
  onClose: () => void;
  onSuccess: () => void;
}

export function DebtOffsetModal({ open, customerId, supplierId, arBalance, apBalance, onClose, onSuccess }: Props) {
  const offsetAmount = Math.min(arBalance, apBalance);
  const [offsetDate, setOffsetDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');

  const createMutation = useMutation({
    mutationFn: () => api.post('/api/finance/debt-offsets', { customerId, supplierId, offsetDate, note }),
    onSuccess,
  });

  if (!open) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <h2>Đối trừ công nợ</h2>
        <dl>
          <dt>Phải thu (KH)</dt><dd className="text-right">{formatVnd(arBalance)}</dd>
          <dt>Phải trả (NCC)</dt><dd className="text-right">{formatVnd(apBalance)}</dd>
          <dt className="font-bold">Số tiền đối trừ</dt>
          <dd className="text-right font-bold text-lg">{formatVnd(offsetAmount)}</dd>
        </dl>
        <p className="text-sm text-yellow-700 mt-2">
          Sau khi tạo, Quản lý cần phê duyệt để chính thức ghi sổ cái.
        </p>
        <input type="date" value={offsetDate} onChange={e => setOffsetDate(e.target.value)} />
        <textarea placeholder="Ghi chú" value={note} onChange={e => setNote(e.target.value)} />
        <div className="flex gap-2 mt-4">
          <button onClick={onClose}>Hủy</button>
          <button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
            Tạo yêu cầu đối trừ
          </button>
        </div>
      </div>
    </div>
  );
}
```

### Step 4 — Offset history / bảng đối chiếu

On the DebtDetailPage, add a collapsible "Bảng đối chiếu công nợ" section that shows past offsets (from `GET /api/finance/debt-offsets?customerId=X`) with columns: date, amount, status, note.

### Acceptance
- Customer without `linkedSupplierId` → no "Đối trừ" button shown.
- Offset modal shows the correct computed amount (min of AR/AP), not editable.
- After submitting, modal shows "Chờ duyệt" status.
- After manager approves via `POST /api/finance/debt-offsets/:id/approve`, both balances drop and offset shows "Đã duyệt".

---

## TASK C5 — FinancePage P&L new lines

**Depends on:** B4  
**Blocks:** nothing

### Files to modify
- `frontend/src/pages/FinancePage.tsx` (~line 403-589)

### Step 1 — Add new revenue lines to Income Statement

In the `Bảng Kết quả HKD` section, after "I. Doanh thu vận tải", add:

```tsx
<tr>
  <td>Doanh thu điều xe ngoài (lãi quản lý)</td>
  <td className="text-right">{formatVnd(report.externalMarginTotal)}</td>
</tr>
<tr>
  <td>Lãi dịch vụ đi kèm</td>
  <td className="text-right">{formatVnd(report.serviceMarginTotal)}</td>
</tr>
```

### Step 2 — Add "Xe ngoài" bucket to per-truck breakdown

The existing per-truck table iterates `report.trucks`. The backend now includes a `{ id: 0, plate: 'Xe ngoài', ... }` entry when external trips exist. This will render automatically. Add a visual indicator (e.g. italic or different icon) for the "Xe ngoài" bucket:

```tsx
{truck.id === 0 && <span className="text-gray-500 italic"> (xe thuê ngoài)</span>}
```

### Acceptance
- With a month containing external trips, the P&L shows "Doanh thu điều xe ngoài" and "Lãi dịch vụ đi kèm" lines.
- The per-truck table includes a "Xe ngoài" bucket.
- Total profit reconciles: sum of truck profits = company-level profit.

---

## TASK D1 — Giấy báo nợ: itemized Excel export

**Depends on:** B1, B2  
**Blocks:** nothing

### Files to create/modify
- Create: `backend/src/services/debitNote.service.ts`
- Modify: `backend/src/routes/financial.ts`
- Create: `frontend/src/components/DebitNoteExport.tsx`
- Modify: `frontend/src/pages/DebtDetailPage.tsx`

### Step 1 — Create `backend/src/services/debitNote.service.ts`

```typescript
import { db } from '../db';
import * as s from '../db/schema';
import { eq, and, gte, lte, isNull, inArray } from 'drizzle-orm';

export interface DebitNoteLine {
  tripCode: string;
  departureDate: string;
  description: string;  // route name or fee billing_label
  sellAmountInclVat: number;
  lineType: 'FREIGHT' | 'SERVICE_FEE';
}

export async function getDebitNoteData(customerId: number, opts: {
  mode: 'MONTHLY' | 'PER_BATCH';
  month?: number;
  year?: number;
  tripIds?: number[];
}): Promise<{ customer: any; lines: DebitNoteLine[]; total: number }> {
  const [customer] = await db.select().from(s.customers)
    .where(and(eq(s.customers.id, customerId), isNull(s.customers.deletedAt)));
  if (!customer) throw Object.assign(new Error('Không tìm thấy khách hàng'), { status: 404 });

  let tripConditions = [eq(s.trips.customerId, customerId), eq(s.trips.status, 'LOCKED')];
  if (opts.mode === 'MONTHLY' && opts.month && opts.year) {
    const from = `${opts.year}-${String(opts.month).padStart(2,'0')}-01`;
    const to = `${opts.year}-${String(opts.month).padStart(2,'0')}-31`;
    tripConditions.push(gte(s.trips.departureDate, from), lte(s.trips.departureDate, to));
  } else if (opts.mode === 'PER_BATCH' && opts.tripIds?.length) {
    tripConditions.push(inArray(s.trips.id, opts.tripIds));
  }

  const trips = await db.select().from(s.trips).where(and(...tripConditions));
  const lines: DebitNoteLine[] = [];

  for (const trip of trips) {
    // Freight line
    lines.push({
      tripCode: trip.tripCode ?? '',
      departureDate: trip.departureDate,
      description: 'Cước vận chuyển',
      sellAmountInclVat: Number(trip.revenue ?? 0),
      lineType: 'FREIGHT',
    });

    // Approved ancillary fees with sellAmount > 0
    const fees = await db.select({
      fe: s.tripExpenses,
      ft: s.forwarderExpenseTypes,
    }).from(s.tripExpenses)
      .leftJoin(s.forwarderExpenseTypes, eq(s.tripExpenses.expenseType, s.forwarderExpenseTypes.code))
      .where(and(
        eq(s.tripExpenses.tripId, trip.id),
        eq(s.tripExpenses.approvalStatus, 'APPROVED'),
      ));

    for (const { fe, ft } of fees) {
      if (Number(fe.sellAmount) > 0) {
        lines.push({
          tripCode: trip.tripCode ?? '',
          departureDate: trip.departureDate,
          description: ft?.billingLabel ?? ft?.name ?? fe.expenseType,
          sellAmountInclVat: Number(fe.sellAmount),
          lineType: 'SERVICE_FEE',
        });
      }
    }
  }

  const total = lines.reduce((s, l) => s + l.sellAmountInclVat, 0);
  return { customer, lines, total };
}
```

### Step 2 — Add export route to `backend/src/routes/financial.ts`

```typescript
import ExcelJS from 'exceljs';  // already in project dependencies

router.get('/finance/debit-note/:customerId/export', asyncHandler(async (req: Request, res: Response) => {
  const customerId = parseInt(req.params.customerId, 10);
  const mode = (req.query.mode as string) === 'PER_BATCH' ? 'PER_BATCH' : 'MONTHLY';
  const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;
  const year = parseInt(req.query.year as string) || new Date().getFullYear();
  const tripIds = req.query.tripIds ? (req.query.tripIds as string).split(',').map(Number) : undefined;

  const data = await getDebitNoteData(customerId, { mode, month, year, tripIds });

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Giấy báo nợ');

  ws.addRow(['GIẤY BÁO NỢ']);
  ws.addRow([`Khách hàng: ${data.customer.name}`]);
  ws.addRow([`Tháng: ${month}/${year}`]);
  ws.addRow([]);
  ws.addRow(['Mã chuyến', 'Ngày', 'Diễn giải', 'Số tiền (có VAT)']);

  for (const line of data.lines) {
    ws.addRow([line.tripCode, line.departureDate, line.description, line.sellAmountInclVat]);
  }

  ws.addRow([]);
  ws.addRow(['', '', 'Tổng cộng', data.total]);

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="giay-bao-no-${customerId}-${month}-${year}.xlsx"`);
  await wb.xlsx.write(res);
  res.end();
}));
```

### Step 3 — Add button to `DebtDetailPage.tsx`

Add a "Xuất Giấy báo nợ" button near the existing export controls:

```tsx
<button
  onClick={() => window.open(
    `/api/finance/debit-note/${customerId}/export?mode=${customer.debitNoteMode}&month=${month}&year=${year}`,
    '_blank'
  )}
>
  Xuất Giấy báo nợ (Excel)
</button>
```

### Acceptance
- MONTHLY mode exports all LOCKED trips in that month + their approved fee sell lines.
- Each fee is its own row (itemized, never consolidated).
- Download triggers an .xlsx file.

---

## Final verification checklist

Run these in order:

```bash
# 1. Schema + seed
cd backend && npm run db:migrate && npm run seed

# 2. Type check
cd shared && npx tsc --noEmit
cd ../backend && npx tsc --noEmit
cd ../frontend && npx tsc --noEmit

# 3. Calculation tests
cd shared && node --test src/calculations/tripTotals.test.ts

# 4. Start servers
cd backend && npm run dev &
cd frontend && npm run dev &
```

Manual E2E:
- [ ] Mark an existing customer as `is_carrier=true` (C3) → appears in trip carrier dropdown
- [ ] Create EXTERNAL trip with that carrier → saved with `carrierType='EXTERNAL'`
- [ ] Add COMPANY_DIRECT ancillary fee (CUSTOMS + declarationNumber) as accountant → `approvalStatus='APPROVED'`
- [ ] Add FORWARDER_ADVANCE fee as FORWARDER → `approvalStatus='PENDING'`; manager approves → `APPROVED`
- [ ] Lock the EXTERNAL trip → carrier's customer ledger shows CREDIT (negative balance = we owe them); VENDOR_EXPENSE on COMPANY_DIRECT supplier; FORWARDER_ADVANCE debit on forwarder
- [ ] P&L page shows "Doanh thu điều xe ngoài" and "Xe ngoài" bucket
- [ ] Set `linkedSupplierId` on the customer → debt-netting "Đối trừ" button appears on DebtDetail
- [ ] Create offset → PENDING; approve → AR and AP both decrease by min(AR,AP)
- [ ] Export Giấy báo nợ → .xlsx with itemized lines (freight + approved fee sells)

---

## Follow-ups (not in this batch)

- **Giấy báo nợ PDF company-form:** once the official form template is provided.
- **Forwarder advance top-up + phiếu thanh toán settlement:** Phase 2/3 subsystem builds on the FORWARDER ledger entries posted by B2.
- **Negative-balance aging UI:** the DebtListPage should treat `balance < 0` (we-owe-them) customers differently — show "Chúng tôi nợ" instead of aging buckets.
