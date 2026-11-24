export {
  TripStatus, BILLABLE_TRIP_STATUSES, FuelMode, LoadingType, Role, TxnType,
  TrailerType, TrailerStatus, TruckStatus, DriverStatus, CustomerStatus,
  PenaltyStatus, PENALTY_STATUS_LABELS, TRAILER_STATUS_LABELS, TRAILER_TYPE_LABELS,
  VehicleComponent, VehicleScheduleKind, VehicleScheduleStatus,
  VEHICLE_COMPONENT_LABELS, VEHICLE_SCHEDULE_KIND_LABELS, VEHICLE_SCHEDULE_STATUS_LABELS,
  TIRE_STATUSES, TIRE_STATUS_LABELS, TIRE_DISPOSAL_REASONS,
  TYRE_BOARD_POSITION_COUNT,
  TRIP_STATUS_LABELS, ROLE_LABELS, FUEL_MODE_LABELS, LOADING_TYPE_LABELS,
  TRIP_STATUS_COLORS, DATA_COMPLETENESS_COLORS,
  TRIP_TODAY_ROW_COLORS, TRIP_MISSING_FIELD_ROW_COLORS,
  AdvanceRequestStatus, AdvanceSettlementStatus, ExpenseEntryStatus,
  FORWARDER_EXPENSE_TYPE_DEFAULTS, ADVANCE_REQUEST_STATUS_LABELS, ADVANCE_SETTLEMENT_STATUS_LABELS,
  NotificationType, NOTIFICATION_TYPE_LABELS, PUSH_RULES,
  CONFIG, FINANCIAL, REPORTS, DRIVER, SYSTEM, AUTH, TRIPS, SHIPMENTS, CATALOGS, FORWARDER, NOTIFICATIONS, SALARY,
  TRACKING,
  CarrierType, SettlementMethod, ApprovalStatus, DebitNoteMode,
  // NEPO-61/63 — lô write-role gate + dashboard cutoff window
  SHIPMENT_WRITE_ROLES, SHIPMENT_CUTOFF_WARN_DAYS,
  TruckCapRole,
  // NEPO-62 — lot costs
  TripFlowType, FeeGroup, LotFeeStatus, TruckTransferCostKey, ShipmentDocType,
  FEE_GROUP_LABELS, LOT_FEE_STATUS_LABELS,
  LOT_DEBIT_NOTE_ORDER_XUAT, LOT_DEBIT_NOTE_ORDER_NHAP, LOT_DEBIT_NOTE_ORDER,
  TRUCK_TRANSFER_COST_ROWS, SHIPMENT_DOC_TYPE_LABELS,
  CARRIER_TYPE_LABELS, SETTLEMENT_METHOD_LABELS, APPROVAL_STATUS_LABELS,
  TRUCK_CAP_ROLE_LABELS,
  FINANCIAL_ROLES, isFinancialRole,
  LedgerColumnGroup, LEDGER_GROUP_ROLES,
  TIRES, TYRE_BOARD, VEHICLE_SCHEDULES,
  APP_VERSION,
} from './constants';

export type { PushAudience, TireStatus } from './constants';

export type {
  User, UserPublic, Driver, Customer, Truck, Trailer, Route, CargoType,
  PricingTable, RoadAllowance, FuelConfig, FuelPriceHistory, PenaltyReason, RoadConfig, AppSetting, CompanyInfo,
  Trip, TripLeg, TripDetail, TripInstruction, TripFuelAllocation,
  TripFuelAllocationInput, FuelPaymentMethod, LedgerEntry, Penalty,
  CapTableHistory, TruckCapEntry, Distribution, ManagementFee, AuditLog, Notification, PushSubscriptionPayload,
  CreateTripRequest, TripLegInput, UpdateTripFiguresRequest,
  BulkUpdateTripFiguresRequest, BulkUpdateTripFiguresResponse,
  CreatePaymentRequest, CreatePenaltyRequest, CreateAdjustmentRequest,
  LoginResponse, PaginatedResponse, DashboardStats, DashboardDecisionItem, DashboardDecisionKind, DashboardDecisionSeverity, CustomerStatement, AgingBucket, UnpaidTrip, PeriodSummary, StatementLine, StatementPeriodTotals, StatementVoucher, StatementVoucherLine, StatementBalancePair, FastStatementDetail,
  SalaryPeriod, SalaryPeriodRange, PnlTruck, PnlMaintenanceItem, PnlTripDetail, PnlReport,
  Supplier, ExpenseCategory, Expense, ExpenseWithRefs, PayableSummary, PayablesCategory, SupplierStatement, SupplierFuelStatement, SupplierFuelStatementRow, SupplierFuelStatementUnassignedTrip, RenewalReminder, VendorPaymentRequest,
  TripContainer, TripExpense, TripExpenseWithRefs, ForwarderTripDetail, TripExpenseWithSupplier,
  AdvanceRequest, AdvanceRequestWithRefs, AdvanceSettlement, AdvanceSettlementWithRefs,
  ContainerType, Port, SealType,
  DebtOffset,
  ApprovalItemType,
  VehicleAlertField, VehicleAlertStatus, VehicleAlert,
  VehicleSchedule,
  Tire, TirePosition, TireImportRow, TireImportRowResult, TireImportResult,
  TyreBoard, TyreBoardSlot, TyreChangeRecord,
  BillingDocument, BillingDocumentLine, BillingDocumentType, BillingDocumentEntityType,
  BillingLineSourceType, BillingLineType, BillingDraftLine, BillingDocumentDraft,
  BillingLineRenderData, DebitNoteColumnVariable, DebitNoteTemplateColumn,
  DebitNoteTemplate, DebitNoteTemplateSnapshot,
  Shipment, ShipmentDocument, ShipmentCost, ShipmentProfitSummary,
  OpsToday, ShipmentOpsAlert, ShipmentProfitReport, ShipmentProfitReportRow,
  ShipmentDetail, ShipmentTripRow, ShipmentBillingDocSummary,
  ShipmentInfo, LotCostRow, LotCostGroup, TruckTransferCostRow, LotCostRegister,
  CustomerMonthlySoa, CustomerMonthlySoaRow, CustomerMonthlySoaCell,
  LiveFleetVehicle, LiveFleetResponse, LiveFleetStatus, LiveFleetDetails, LiveFleetLeg,
  GpsStop,
  FuelReconcileStatus, FuelReconcileResult, FuelReconcileResultRow, FuelReconcileSummary, FuelReconcileResponse,
  LedgerLeg, LedgerExpense, LedgerAdvance, LedgerSettlement, LedgerContainer,
  LedgerExpenseRollup, LedgerRow, LedgerQueryResult,
} from './types';

export { parseThreshold } from './types';

export { canonicalFreightDescription } from './calculations/billingDocument';
export { buildShipmentCode, deriveShipmentCodeShortName, shipmentCodePrefix, shipmentCodeSeqRe } from './calculations/shipmentCode';

// ─── Navigation catalog (single source for SPA paths/titles + agent search) ──
export { PAGE_CATALOG } from './navigation/pageCatalog';
export type {
  PageCatalogEntry,
  StaticPageEntry,
  DynamicPageEntry,
  PageCatalogKey,
  PageSection,
  PageAgentMeta,
} from './navigation/pageCatalog';

export {
  tripLegSchema, createTripSchema, reassignTripSchema, updateTripFiguresSchema, bulkUpdateTripFiguresSchema,
  createPaymentSchema, updatePaymentSchema, createPenaltySchema, createAdjustmentSchema,
  loginSchema, createUserSchema, updateUserSchema, updateProfileSchema, changePasswordSchema,
  customerSchema, truckSchema, trailerSchema, routeSchema,
  cargoTypeSchema, pricingTableSchema, roadAllowanceSchema,
  fuelConfigSchema, fuelPriceHistorySchema, companyInfoSchema, penaltyReasonSchema, driverSchema,
  managementFeeSchema, capTableSchema, truckCapSchema,
  salaryPeriodSchema, salaryPeriodDefaultSchema,
  supplierSchema, expenseCategorySchema, expenseSchema, vendorPaymentSchema,
  createVehicleScheduleSchema, updateVehicleScheduleSchema, vehicleScheduleListQuerySchema, postgresSerialIdSchema,
  tripContainerSchema, tripContainerBatchSchema, tripContainerPatchSchema, tripContainerSealSchema, tripContainerSealBatchSchema, tripExpenseSchema, baseTripExpenseSchema, tripExpensePatchSchema, tripExpenseCompletionSchema, accountantSettlementExpensePatchSchema, forwarderExpenseTypeSchema,
  createAdvanceRequestSchema, updateAdvanceRequestSchema, createAdvanceSettlementSchema, updateAdvanceSettlementSchema,
  upsertTripInstructionsSchema,
  partialUpdateSchema,
  containerTypeSchema, portSchema, sealTypeSchema,
  debtOffsetSchema, ANCILLARY_EXPENSE_TYPES,
  commissionSchema,
  driverPayoutSchema,
  tireSchema, installTireSchema, disposeTireSchema, transferTireSchema, tirePositionSchema,
  tyreBoardSlotUpdateSchema, tyreBoardChangeSchema,
  generateBillingDocumentSchema, saveBillingDocumentSchema, billingDocumentLineSchema,
  customerSoaQuerySchema,
  createShipmentSchema, updateShipmentSchema, shipmentCostSchema, updateShipmentCostSchema,
  registerShipmentDocumentSchema, linkTripShipmentSchema,
  debitNoteTemplateSchema, debitNoteColumnSchema, debitNoteColumnVariableSchema, defaultDebitNoteColumns, defaultPaymentStatementColumns,
  bachKhoaVehicleSchema, bachKhoaResponseSchema, parseBachKhoaResponse,
  agentDirectiveSchema, agentWidgetSchema, widgetFormatSchema, agentActionChipSchema,
  agentCitationSchema, provenanceSchema,
  agentResponseSchema, agentMessageSchema, agentConversationSchema, agentEventSchema,
  agentRouteKeySchema, AGENT_ROUTE_KEYS,
  ACKED_DIRECTIVE_KINDS,
  agentActionResultSchema,
  faqEntryCreateSchema, faqEntryUpdateSchema, FAQ_ADMIN_PATHS,
  fuelReconcileRequestSchema,
  ledgerQuerySchema, ledgerPlanContainerSchema, ledgerPlanLegSchema,
  updateTripPlanSchema, updateLedgerMoneySchema, createLedgerDraftSchema,
  paymentMethodSchema,
  closeCustomerDebtSchema,
} from './schemas';

export { appSettingsSchema } from './schemas/app-settings';
export type { AppSettings } from './schemas/app-settings';

export {
  FUEL_PRICE_PER_LITER_FALLBACK,
  FUEL_LOADED_NORM_FALLBACK,
  FUEL_EMPTY_NORM_FALLBACK,
  ROAD_ALLOWANCE_PER_KM_FALLBACK,
} from './calculations/tripFormDefaults';

export type {
  CreateTripInput, UpdateTripFiguresInput, CreatePaymentInput, UpdatePaymentInput,
  CreatePenaltyInput, CreateAdjustmentInput, LoginInput,
  CustomerInput, TruckInput, TrailerInput, TirePositionInput, RouteInput,
  CargoTypeInput, PricingTableInput, RoadAllowanceInput,
  FuelConfigInput, CompanyInfoInput, PenaltyReasonInput, DriverInput,
  ManagementFeeInput, CapTableInput, TruckCapInput,
  SalaryPeriodInput, SalaryPeriodDefaultInput,
  SupplierInput, ExpenseCategoryInput, ExpenseInput, VendorPaymentInput,
  CreateVehicleScheduleInput, UpdateVehicleScheduleInput, VehicleScheduleListQuery,
  CreateUserInput, UpdateUserInput,
  TripContainerInput, TripExpenseInput,
  CreateAdvanceRequestInput, UpdateAdvanceRequestInput, CreateAdvanceSettlementInput, UpdateAdvanceSettlementInput,
  ContainerTypeInput, PortInput, SealTypeInput,
  AncillaryExpenseType,
  UpdateProfileInput,
  CommissionInput,
  TireInput, InstallTireInput,
  TyreBoardSlotUpdateInput, TyreBoardChangeInput,
  GenerateBillingDocumentInput, SaveBillingDocumentInput, BillingDocumentLineInput,
  DebitNoteTemplateInput, DebitNoteColumnInput, DebitNoteColumnVariableInput,
  BachKhoaVehicle,
  AgentDirective, AgentWidget, WidgetFormat, AgentActionChip, AgentCitation, Provenance, AgentResponse,
  AgentMessage, AgentConversation, AgentEvent, AgentRouteKey,
  AckedDirectiveKind, AgentActionResult,
  FaqEntry, FaqEntryCreate, FaqEntryUpdate, FaqEmbeddingStatus, FaqEntryMutationResponse,
  FuelReconcileRowInput, FuelReconcileRequest,
  LedgerQueryInput, UpdateTripPlanInput, UpdateLedgerMoneyInput, CreateLedgerDraftInput,
  PaymentMethod,
  CreateShipmentInput, UpdateShipmentInput, ShipmentCostInput, ShipmentCostUpdateInput,
  RegisterShipmentDocumentInput, LinkTripShipmentInput,
} from './schemas';

export { round2dp, roundInt } from './calculations/round';
export { computeTripDriverSalary, resolveTripDriverSalary, TRIP_SALARY_WORK_DAYS } from './calculations/tripDriverSalary';
export {
  normalizeContainerNumber,
  validateContainerFormat,
  calculateCheckDigit,
  validateCheckDigit,
  validateContainerNumber,
  suggestCorrections,
} from './calculations/iso6346';
export { computeDriverRoadAllowance, computeExVatAmount, computeTripTotals, computeRoadAllowance } from './calculations/tripTotals';
export type { ComputeTripTotalsInput, ComputeTripTotalsOutput } from './calculations/tripTotals';
export { computeFifoAging, bucketOpenInvoices, maxOpenInvoiceAgeDays } from './calculations/fifoAging';
export type { FifoAgingInput, AgingBuckets, OpenInvoice } from './calculations/fifoAging';
export { computeVehicleAlerts, VEHICLE_ALERT_LABELS } from './calculations/vehicleAlerts';
export type { VehicleAlertInput } from './calculations/vehicleAlerts';

// ─── Chatbot (agent) performance monitoring ────────────────────────────────
// Plain TS interfaces + API path constants for the ADMIN aggregation API and
// the dashboard frontend. See ./schemas/chatbot-metrics.ts.
export type {
  ChatbotSlaThresholds,
  ChatbotMetricSummary,
  ChatbotLatencyBreakdown,
  ChatbotMetricDay,
  ChatbotToolStat,
  ChatbotRecentTurn,
} from './schemas/chatbot-metrics';
export { CHATBOT_METRICS_PATHS } from './schemas/chatbot-metrics';

// ─── Admin LLM provider settings (MiniMax / OpenRouter) ─────────────────────
// ADMIN-only settings API + frontend config page. See ./schemas/llm-settings.ts.
export {
  LLM_PROVIDERS,
  LLM_PROVIDER_MODELS,
  LLM_PROVIDER_LABELS,
  LLM_SETTINGS_PATHS,
  llmSettingsUpdateSchema,
} from './schemas/llm-settings';
export type {
  LlmProvider,
  LlmSettingsResponse,
  LlmSettingsUpdate,
} from './schemas/llm-settings';

// ─── Admin Bách Khoa GPS credentials ────────────────────────────────────────
export { GPS_SETTINGS_PATHS, gpsSettingsUpdateSchema } from './schemas/gps-settings';
export type { GpsSettingsResponse, GpsSettingsUpdate } from './schemas/gps-settings';

// ─── AI OCR usage allowance + overage billing (NEPO-27) ─────────────────────
export {
  OCR_USAGE_DEFAULT_MONTHLY_ALLOWANCE,
  OCR_USAGE_DEFAULT_OVERAGE_PRICE_PER_CALL,
  OCR_USAGE_PATHS,
  ocrUsageSettingsUpdateSchema,
} from './schemas/ocr-usage';
export type {
  OcrUsageSettingsResponse,
  OcrUsageSettingsUpdate,
  OcrUsageStatus,
  OcrUsageDailyPoint,
} from './schemas/ocr-usage';
export {
  computeOcrUsageStatus,
  ocrUsagePeriodKey,
  ocrUsageDateKey,
  ocrUsageDaysInMonth,
  buildOcrUsageDailySeries,
  buildOcrUsageDailyOverage,
} from './calculations/ocr-usage';

// ─── Admin AI OCR model settings (provider / API key / model) (NEPO-28) ─────
export {
  OCR_AI_PROVIDERS,
  OCR_AI_PROVIDER_LABELS,
  OCR_AI_MODELS,
  OCR_AI_DEFAULT_MODEL,
  OCR_AI_SETTINGS_PATHS,
  ocrAiSettingsUpdateSchema,
} from './schemas/ocr-ai-settings';
export type {
  OcrAiProvider,
  OcrAiSettingsResponse,
  OcrAiSettingsUpdate,
  OcrAiTestResponse,
} from './schemas/ocr-ai-settings';

// ─── AI OCR request log (response / model / duration) (NEPO-33) ───────────────
export { ocrRequestListQuerySchema } from './schemas/ocr-requests';
export type {
  OcrRequestRow,
  OcrRequestStats,
  OcrRequestCounts,
  OcrRequestFilters,
  OcrRequestListResponse,
  OcrRequestStatus,
} from './schemas/ocr-requests';
