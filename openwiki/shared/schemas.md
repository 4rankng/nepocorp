---
type: shared-schemas
title: Zod Schemas & Enums
description: Enum definitions and Zod validation schemas for all entities and API contracts — Vietnamese label maps paired with each enum, z.infer used over hand-rolled interfaces.
tags: [schemas, enums, zod, vietnamese-labels, validation, shared]
verified:
  - by: openwiki/0.5.0
    at: 2026-09-21T11:26:37.739Z
sources:
  - id: openwiki-source-e2544c2855fbda88c1fe56a1
    resource: repo://backend/src/middleware/errorHandler.ts
  - id: openwiki-source-7610fde5069b313fb993d644
    resource: repo://docs/code-standards.md
  - id: openwiki-source-1d8ade489420d496695e0c37
    resource: repo://shared/src/constants/index.ts
  - id: openwiki-source-7125cff8b96e306a9952fc37
    resource: repo://shared/src/schemas/agent.ts
  - id: openwiki-source-a26b081021ea0d41718744bf
    resource: repo://shared/src/schemas/app-settings.ts
  - id: openwiki-source-11d5148af202b472827eba66
    resource: repo://shared/src/schemas/faq.ts
  - id: openwiki-source-71b8955e9063a27160757df2
    resource: repo://shared/src/schemas/gps-settings.ts
  - id: openwiki-source-b650eeedb63cbb73aa890ab2
    resource: repo://shared/src/schemas/index.ts
  - id: openwiki-source-bd68344b341900c6b4e13b5b
    resource: repo://shared/src/schemas/llm-settings.ts
generated: { by: "opencode", at: "2026-09-21T11:26:37.739Z" }
---

The `@tingting/shared` package exposes two complementary surfaces for
validation and display:

- **`constants/index.ts`** — TS enums + `*_LABELS` maps (Vietnamese display
  labels) + helper constants.
- **`schemas/index.ts`** — Zod schemas for every API request body and the
  re-exported `z.infer` types for input shapes.

The pattern: each enum has a paired `*_LABELS` Record (`TripStatus →
'Tạo mới'`/`'Đang chạy'`/...) so the UI never hardcodes display strings.

## Enums (`shared/src/constants/index.ts`)

| Enum | Members | Paired label map |
|---|---|---|
| `TripStatus` | `CREATED, IN_TRANSIT, COMPLETED, LOCKED, CANCELED` | `TRIP_STATUS_LABELS`, `TRIP_STATUS_COLORS` |
| `FuelMode` | `AUTO, FLAT_RATE` | `FUEL_MODE_LABELS` |
| `LoadingType` | `HANG, VO` | `LOADING_TYPE_LABELS` |
| `Role` | `ADMIN, MANAGER, ACCOUNTANT, DRIVER, FORWARDER` | `ROLE_LABELS` |
| `TxnType` | `TRIP_REVENUE, PAYMENT_RECEIVED, PENALTY, MANAGEMENT_FEE, ADJUSTMENT, DRIVER_SALARY, VENDOR_EXPENSE, VENDOR_PAYMENT, FORWARDER_ADVANCE, FORWARDER_SETTLEMENT, EXTERNAL_CARRIER_COST, FUEL_EXPENSE, UNLOCK_REVERSAL, COMMISSION, DRIVER_PAYOUT, SERVICE_FEE` | (used directly) |
| `TrailerType` | `20FT, 40FT` | `TRAILER_TYPE_LABELS` |
| `TruckStatus` / `TrailerStatus` | `ACTIVE, MAINTENANCE, INACTIVE` | `TRAILER_STATUS_LABELS` |
| `DriverStatus` | `ACTIVE, INACTIVE` | (paired inline) |
| `CustomerStatus` | `ACTIVE, LOCKED` | |
| `PenaltyStatus` | `ACTIVE, CANCELED` | `PENALTY_STATUS_LABELS` |
| `TripPhotoType` | `CONTAINER, SEAL, OTHER` | |
| `VehicleComponent` | `TRUCK, TRAILER` | `VEHICLE_COMPONENT_LABELS` |
| `VehicleScheduleKind` | `MAINTENANCE, INSPECTION, INSURANCE, ROAD_FEE, DOCUMENT, OTHER` | `VEHICLE_SCHEDULE_KIND_LABELS` |
| `VehicleScheduleStatus` | `ACTIVE, COMPLETED, CANCELLED` | `VEHICLE_SCHEDULE_STATUS_LABELS` |
| `TireStatus` | (typed string set) | `TIRE_STATUS_LABELS`, `TIRE_STATUSES`, `TIRE_DISPOSAL_REASONS` |
| `AdvanceRequestStatus` | `PENDING, APPROVED, REJECTED` | `ADVANCE_REQUEST_STATUS_LABELS` |
| `AdvanceSettlementStatus` | `PENDING, CHECKED_BY_ACCOUNTANT, APPROVED, REJECTED` | `ADVANCE_SETTLEMENT_STATUS_LABELS` |
| `ExpenseEntryStatus` | (typed string set) | |
| `NotificationType` | (event-class enum) | `NOTIFICATION_TYPE_LABELS` |
| `CarrierType` | `OWN, EXTERNAL` | `CARRIER_TYPE_LABELS` |
| `SettlementMethod` | (typed string set) | `SETTLEMENT_METHOD_LABELS` |
| `ApprovalStatus` | (typed string set) | `APPROVAL_STATUS_LABELS` |
| `DebitNoteMode` | (typed string set) | |
| `TruckCapRole` | (typed string set) | `TRUCK_CAP_ROLE_LABELS` |
| `WorkDayStatus` | `TRIP_DAY, STANDBY, PERSONAL_LEAVE, WEEKLY_OFF` | |
| `SalaryConfirmationStatus` | `DRAFT, CONFIRMED` | |

## Helper constants

- `BILLABLE_TRIP_STATUSES` — `[COMPLETED, LOCKED]` for revenue counting.
- `FINANCIAL_ROLES` / `isFinancialRole` — `[ADMIN, MANAGER, ACCOUNTANT]`.
- `CONFIG, FINANCIAL, REPORTS, DRIVER, SYSTEM, AUTH, TRIPS, CATALOGS, FORWARDER, NOTIFICATIONS, SALARY, TRACKING, TIRES, VEHICLE_SCHEDULES` — Casbin resource
  names consumed by `casbinAuthz('resource')`.
- `FORWARDER_EXPENSE_TYPE_DEFAULTS` — seed defaults for the forwarder expense
  types catalog.
- `ANCILLARY_EXPENSE_TYPES` — set of expense type names considered ancillary
  (debit-note billing only).
- `PUSH_RULES` — per-`NotificationType` rule for the web-push fan-out.
- `AGENT_ROUTE_KEYS`, `ACKED_DIRECTIVE_KINDS` — agent/chatbot surface flags.
- `CHATBOT_METRICS_PATHS`, `LLM_PROVIDERS`, `LLM_PROVIDER_MODELS`,
  `LLM_PROVIDER_LABELS`, `LLM_SETTINGS_PATHS`, `GPS_SETTINGS_PATHS`,
  `FAQ_ADMIN_PATHS` — admin-API path constants.

## Schemas (`shared/src/schemas/index.ts`)

Two custom Zod primitives are exported first because every schema uses them:

- `numericMoney` — `z.union([z.number(), z.string()])` that transforms to a
  decimal-string money value (2 decimal places). Coerces `string | number`
  inputs from JSON or form-encoded bodies.
- `numericDecimal` — same shape but keeps higher precision for non-money
  numerics.

Major schemas:

- **Trip** — `tripLegSchema`, `createTripSchema`, `reassignTripSchema`,
  `updateTripFiguresSchema`, `bulkUpdateTripFiguresSchema`.
- **Payment + penalty + adjustment** — `createPaymentSchema`,
  `createPenaltySchema`, `createAdjustmentSchema`.
- **Auth** — `loginSchema`, `createUserSchema`, `updateUserSchema`,
  `updateProfileSchema`, `changePasswordSchema`.
- **Catalogs** — `customerSchema`, `truckSchema`, `trailerSchema`,
  `routeSchema`, `cargoTypeSchema`, `pricingTableSchema`,
  `roadAllowanceSchema`, `fuelConfigSchema`, `fuelPriceHistorySchema`,
  `companyInfoSchema`, `penaltyReasonSchema`, `driverSchema`,
  `managementFeeSchema`, `capTableSchema`, `truckCapSchema`,
  `salaryPeriodSchema`, `salaryPeriodDefaultSchema`.
- **Suppliers + expenses** — `supplierSchema`, `expenseCategorySchema`,
  `expenseSchema`, `vendorPaymentSchema`.
- **Vehicle schedules** — `createVehicleScheduleSchema`,
  `updateVehicleScheduleSchema`, `vehicleScheduleListQuerySchema`,
  `postgresSerialIdSchema`.
- **Trip containers + seals + expenses + instructions** — `tripContainerSchema`,
  `tripContainerBatchSchema`, `tripContainerPatchSchema`,
  `tripContainerSealSchema`, `tripContainerSealBatchSchema`,
  `tripExpenseSchema`, `baseTripExpenseSchema`, `tripExpensePatchSchema`,
  `tripExpenseCompletionSchema`,
  `accountantSettlementExpensePatchSchema`, `forwarderExpenseTypeSchema`.
- **Forwarder flow** — `createAdvanceRequestSchema`,
  `createAdvanceSettlementSchema`, `updateAdvanceSettlementSchema`,
  `upsertTripInstructionsSchema`.
- **Tires** — `tireSchema`, `installTireSchema`, `disposeTireSchema`,
  `transferTireSchema`, `tirePositionSchema`.
- **Billing** — `generateBillingDocumentSchema`, `saveBillingDocumentSchema`,
  `billingDocumentLineSchema`, `debitNoteTemplateSchema`,
  `debitNoteColumnSchema`, `debitNoteColumnVariableSchema`,
  `defaultDebitNoteColumns`, `defaultPaymentStatementColumns`.
- **Commission + payout + offset** — `commissionSchema`, `driverPayoutSchema`,
  `debtOffsetSchema`.
- **Containers + ports + seals** — `containerTypeSchema`, `portSchema`,
  `sealTypeSchema`.
- **Bách Khoa GPS** — `bachKhoaVehicleSchema`, `bachKhoaResponseSchema`,
  `parseBachKhoaResponse`.
- **Agent / chatbot** — `agentDirectiveSchema`, `agentWidgetSchema`,
  `widgetFormatSchema`, `agentActionChipSchema`, `agentCitationSchema`,
  `provenanceSchema`, `agentResponseSchema`, `agentMessageSchema`,
  `agentConversationSchema`, `agentEventSchema`, `agentRouteKeySchema`,
  `agentActionResultSchema`.
- **FAQ** — `faqEntryCreateSchema`, `faqEntryUpdateSchema`.

Module-specific sub-barrels:

- `schemas/agent.ts` — agent schemas re-exported by index.
- `schemas/chatbot-metrics.ts` — types + paths.
- `schemas/llm-settings.ts` — provider list + update schema.
- `schemas/gps-settings.ts` — GPS credentials schema + paths.
- `schemas/app-settings.ts` — single-row app settings.
- `schemas/faq.ts` — FAQ admin schemas.

## The `z.infer` pattern

For every domain the shared package exports an input type next to the schema:

```ts
export const createTripSchema = z.object({ ... });
export type CreateTripInput = z.infer<typeof createTripSchema>;
```

Backend route handlers read `req.body` through `createTripSchema.parse(...)`
(`ZodError → 400` in `globalErrorHandler`), then use `CreateTripInput` for
their service signature. The frontend re-imports the same `CreateTripInput`
for form types — no parallel interface.

> **Convention**: prefer `z.infer<typeof XxxSchema>` over hand-written
> TypeScript interfaces. See [development/conventions.md](../development/conventions.md).

## Where to read more

- Where schemas are consumed — [backend/api-routes.md](../backend/api-routes.md)
- Conventions — [development/conventions.md](../development/conventions.md)
- Domain glossary — [domain-glossary.md](../domain-glossary.md)
