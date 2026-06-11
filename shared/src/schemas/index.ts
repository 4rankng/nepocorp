import { z } from 'zod';
import {
  TripStatus, FuelMode, LoadingType, Role, TxnType,
  TrailerType, TruckStatus, TrailerStatus, DriverStatus, CustomerStatus,
  AdvanceRequestStatus, AdvanceSettlementStatus,
} from '../constants';

// Reusable numeric transform helpers to prevent string concatenation bugs and parse PG numeric types
export const numericMoney = z.union([z.number(), z.string()]).transform((val, ctx) => {
  const num = Number(val);
  if (isNaN(num)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Giá trị tiền tệ không hợp lệ' });
    return z.NEVER;
  }
  return num;
});

export const numericDecimal = z.union([z.number(), z.string()]).transform((val, ctx) => {
  const num = Number(val);
  if (isNaN(num)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Giá trị số không hợp lệ' });
    return z.NEVER;
  }
  return num;
});

const positiveNumeric = z.union([z.number(), z.string()]).transform((val, ctx) => {
  const num = Number(val);
  if (isNaN(num) || num <= 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Phải là số dương' });
    return z.NEVER;
  }
  return num;
});

const nonNegNumeric = z.union([z.number(), z.string()]).transform((val, ctx) => {
  const num = Number(val);
  if (isNaN(num) || num < 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Phải là số không âm' });
    return z.NEVER;
  }
  return num;
});

const fullNameField = z.string().max(255).or(z.literal('')).optional();

// ─── Trip ────────────────────────────────────────────────────────────────────

export const tripLegSchema = z.object({
  sequence: z.number().int().positive(),
  origin: z.string().min(1),
  destination: z.string().min(1),
  // Allow 0 so accountants can save partial drafts before final figures are entered.
  km: nonNegNumeric,
  loadingType: z.nativeEnum(LoadingType),
});

export const createTripSchema = z.object({
  customerId: z.coerce.number().int().positive(),
  routeId: z.coerce.number().int().positive(),
  truckId: z.coerce.number().int().positive().optional().nullable(),
  driverId: z.coerce.number().int().positive().optional().nullable(),
  cargoTypeId: z.coerce.number().int().positive(),
  departureDate: z.string().min(1),
  customerReference: z.string().optional(),
  containerCount: z.coerce.number().int().min(1).max(10).optional(),
  fuelMode: z.nativeEnum(FuelMode).optional(),
  fuelSupplierId: z.coerce.number().int().positive().optional().nullable(),
  vatRate: z.number().min(0).max(0.5).optional().default(0),
  carrierType: z.enum(['OWN', 'EXTERNAL']).optional().default('OWN'),
  externalCarrierId: z.number().int().positive().optional(),
  externalFreightCost: z.number().positive().optional(),
  externalPlateNumber: z.string().max(20).optional(),
  externalDriverName: z.string().max(100).optional(),
  externalDriverPhone: z.string().max(20).optional(),
}).superRefine((data, ctx) => {
  // OWN carrier trips require truckId and driverId; EXTERNAL trips require external fields
  if ((data.carrierType ?? 'OWN') === 'OWN') {
    if (!data.truckId) {
      ctx.addIssue({ code: 'custom', path: ['truckId'], message: 'Xe đầu kéo là bắt buộc cho chuyến xe nội bộ' });
    }
    if (!data.driverId) {
      ctx.addIssue({ code: 'custom', path: ['driverId'], message: 'Tài xế là bắt buộc cho chuyến xe nội bộ' });
    }
  } else {
    if (!data.externalCarrierId) {
      ctx.addIssue({ code: 'custom', path: ['externalCarrierId'], message: 'Nhà xe ngoài là bắt buộc cho chuyến xe ngoài' });
    }
    if (!data.externalFreightCost) {
      ctx.addIssue({ code: 'custom', path: ['externalFreightCost'], message: 'Cước xe ngoài là bắt buộc cho chuyến xe ngoài' });
    }
    if (!data.externalPlateNumber || data.externalPlateNumber.trim() === '') {
      ctx.addIssue({ code: 'custom', path: ['externalPlateNumber'], message: 'Biển số xe ngoài là bắt buộc cho chuyến xe ngoài' });
    }
    if (!data.externalDriverName || data.externalDriverName.trim() === '') {
      ctx.addIssue({ code: 'custom', path: ['externalDriverName'], message: 'Tên lái xe ngoài là bắt buộc cho chuyến xe ngoài' });
    }
    if (!data.externalDriverPhone || data.externalDriverPhone.trim() === '') {
      ctx.addIssue({ code: 'custom', path: ['externalDriverPhone'], message: 'SĐT lái xe ngoài là bắt buộc cho chuyến xe ngoài' });
    }
  }
});

export const updateTripFiguresSchema = z.object({
  legs: z.array(tripLegSchema).min(1),
  departureDate: z.string().optional(),
  completedAt: z.string().optional(),
  fuelMode: z.nativeEnum(FuelMode),
  fuelLitersOverride: nonNegNumeric.nullable().optional(),
  fuelSupplementLiters: nonNegNumeric.optional(),
  fuelSupplementReason: z.string().optional(),
  fuelActualUnitPrice: positiveNumeric.nullable().optional(),
  fuelSupplierId: z.coerce.number().int().positive().nullable().optional(),
  tollsDiscount: nonNegNumeric.optional(),
  tollsAddition: nonNegNumeric.optional(),
  tollsStations: z.coerce.number().int().nonnegative().optional(),
  hasReturnCargo: z.boolean().optional(),
  roadAllowanceOverride: nonNegNumeric.nullable().optional(),
  driverSalary: nonNegNumeric.optional(),
  revenue: nonNegNumeric.optional(),
  revenueEmptyReturn: nonNegNumeric.optional(),
  revenueCombine: nonNegNumeric.optional(),
  twoPointDeliveryBonus: nonNegNumeric.optional(),
  vehicleShiftAllowance: nonNegNumeric.optional(),
  notes: z.string().optional(),
  photoUrls: z.array(z.string()).optional(),
  version: z.number().int().optional(),
  routeId: z.coerce.number().int().positive().optional(),
  vatRate: z.number().min(0).max(0.5).optional(),
  carrierType: z.enum(['OWN', 'EXTERNAL']).optional(),
  externalCarrierId: z.number().int().positive().optional(),
  externalFreightCost: z.number().positive().optional(),
  externalPlateNumber: z.string().max(20).optional(),
  externalDriverName: z.string().max(100).optional(),
  externalDriverPhone: z.string().max(20).optional(),
}).superRefine((data, ctx) => {
  if (data.fuelSupplementLiters && data.fuelSupplementLiters > 0) {
    if (!data.fuelSupplementReason || data.fuelSupplementReason.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Lý do cấp dầu bổ sung là bắt buộc khi số lít dầu bổ sung lớn hơn 0',
        path: ['fuelSupplementReason'],
      });
    }
  }
});


// ─── Payment ─────────────────────────────────────────────────────────────────

export const createPaymentSchema = z.object({
  customerId: z.coerce.number().int().positive(),
  receiptId: z.string().min(1),
  payments: z.array(z.object({
    tripId: z.coerce.number().int().positive(),
    amount: positiveNumeric,
  })).min(1),
});

// ─── Penalty ─────────────────────────────────────────────────────────────────

export const createPenaltySchema = z.object({
  driverId: z.coerce.number().int().positive(),
  tripId: z.coerce.number().int().positive().optional(),
  reasonId: z.coerce.number().int().positive().optional(),
  customReason: z.string().optional(),
  amount: positiveNumeric,
  date: z.string().min(1),
});

// ─── Adjustment ──────────────────────────────────────────────────────────────

export const createAdjustmentSchema = z.object({
  tripId: z.coerce.number().int().positive(),
  amount: z.union([z.number(), z.string()]).transform(Number)
    .refine((v) => Number.isFinite(v), { message: 'Số tiền không hợp lệ' }),
  note: z.string().min(1),
  signedAgreementRef: z.string().min(1),
});

// ─── Auth ────────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(1),
});

export const createUserSchema = z.object({
  username: z.string().min(2).optional(),
  email: z.string().email().optional(),
  fullName: fullNameField,
  phone: z.string().min(6).optional(),
  password: z.string().min(6),
  role: z.nativeEnum(Role),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional().default('ACTIVE'),
}).refine(data => data.username || data.email || data.phone, {
  message: 'Phải cung cấp ít nhất một trong: username, email, hoặc số điện thoại',
});

export const updateUserSchema = z.object({
  role: z.nativeEnum(Role).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  password: z.string().min(6).optional(),
  username: z.string().min(1).max(100).optional(),
  fullName: fullNameField,
  email: z.string().email().or(z.literal('')).optional(),
  phone: z.string().min(6).or(z.literal('')).optional(),
});

export const updateProfileSchema = z.object({
  username: z.string().min(1, 'Tên đăng nhập không được để trống').max(100).optional(),
  fullName: fullNameField,
  email: z.string().email('Email không hợp lệ').or(z.literal('')).optional(),
  phone: z.string().min(6, 'Số điện thoại quá ngắn').or(z.literal('')).optional(),
}).refine(data => data.username || data.fullName !== undefined || data.email || data.phone, {
  message: 'Phải cung cấp ít nhất một trong: username, họ tên, email, hoặc số điện thoại',
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại'),
  newPassword: z.string().min(6, 'Mật khẩu mới phải có ít nhất 6 ký tự').max(128, 'Mật khẩu quá dài'),
});

// ─── CRUD ────────────────────────────────────────────────────────────────────

export const customerSchema = z.object({
  name: z.string().min(1),
  taxCode: z.string().optional(),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  contactInfo: z.string().optional(),
  creditLimit: nonNegNumeric.optional(),
  status: z.nativeEnum(CustomerStatus).optional().default(CustomerStatus.ACTIVE),
  isCarrier: z.boolean().optional().default(false),
  debitNoteMode: z.enum(['MONTHLY', 'PER_BATCH']).optional().default('MONTHLY'),
  linkedSupplierId: z.number().int().positive().optional().nullable(),
});

export const truckSchema = z.object({
  licensePlate: z.string().min(1),
  trailerPlateNumber: z.string().optional().nullable(),
  trailerType: z.nativeEnum(TrailerType).optional().nullable(),
  currentTrailerId: z.number().optional().nullable(),
  status: z.nativeEnum(TruckStatus).optional().default(TruckStatus.ACTIVE),
});

export const trailerSchema = z.object({
  licensePlate: z.string().min(1),
  type: z.nativeEnum(TrailerType),
  status: z.nativeEnum(TrailerStatus).optional().default(TrailerStatus.ACTIVE),
});

export const routeSchema = z.object({
  name: z.string().min(1),
  distanceKm: positiveNumeric.optional(),
  isMountain: z.boolean().optional().default(false),
  fixedFuelAllowance: nonNegNumeric.nullable().optional(),
  tollsStations: nonNegNumeric.nullable().optional(),
  driverSalary: nonNegNumeric.nullable().optional(),
  defaultLegs: z.array(z.object({
    origin: z.string(),
    destination: z.string(),
    km: z.coerce.number().nonnegative(),
    loadingType: z.enum([LoadingType.HANG, LoadingType.VO]),
  })).optional().nullable(),
});

export const cargoTypeSchema = z.object({
  name: z.string().min(1),
  requiresPhotos: z.boolean().optional().default(false),
});

export const pricingTableSchema = z.object({
  customerId: z.coerce.number().int().positive(),
  routeId: z.coerce.number().int().positive(),
  price: positiveNumeric,
});

export const roadAllowanceSchema = z.object({
  routeId: z.coerce.number().int().positive(),
  trailerType: z.nativeEnum(TrailerType),
  baseAmount: positiveNumeric,
});

export const fuelConfigSchema = z.object({
  loadedNorm: positiveNumeric,
  emptyNorm: positiveNumeric,
  supplement: nonNegNumeric.optional().default(3),
  unitPrice: positiveNumeric,
  warningThreshold: nonNegNumeric.optional().default(37),
  criticalThreshold: nonNegNumeric.optional().default(40),
});

export const fuelPriceHistorySchema = z.object({
  unitPrice: positiveNumeric,
  effectiveDate: z.string().min(1),
  note: z.string().optional(),
});

export const penaltyReasonSchema = z.object({
  reasonText: z.string().min(1),
  defaultAmount: nonNegNumeric,
  severity: z.enum(['low', 'mid', 'high']).default('mid'),
});

export const driverSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  assignedTruckId: z.number().int().positive().nullable().optional(),
  baseSalary: nonNegNumeric.optional(),
  status: z.nativeEnum(DriverStatus).optional().default(DriverStatus.ACTIVE),
});

export const managementFeeSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000),
  amount: nonNegNumeric,
});

// Cap-table snapshot. The application drives ownership through `percentage`
// (0–100); `contributionAmount` is optional book-keeping kept here so the
// schema matches the underlying table without forcing every CRUD payload
// to supply it.
export const capTableSchema = z.object({
  partnerName: z.string().min(1),
  percentage: z.union([z.number(), z.string()]).optional()
    .transform(v => v == null ? undefined : Number(v))
    .refine(v => v == null || (v >= 0 && v <= 100), { message: 'Tỷ lệ phải trong khoảng 0–100' }),
  contributionAmount: z.union([z.number(), z.string()]).optional()
    .transform(v => v == null ? undefined : Number(v))
    .refine(v => v == null || v >= 0, { message: 'Số tiền góp vốn không hợp lệ' }),
  effectiveDate: z.string().min(1),
});

// ─── Salary Period ──────────────────────────────────────────────────────────────

/** Per-month salary period override */
export const salaryPeriodSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  label: z.string().optional(),
});

/** Global default salary period configuration */
export const salaryPeriodDefaultSchema = z.object({
  defaultStartDay: z.number().int().min(1).max(28),
  defaultEndDay: z.number().int().min(1).max(31),
});

// ─── Supplier & Expense ────────────────────────────────────────────────────────

export const supplierSchema = z.object({
  name: z.string().min(1),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  taxCode: z.string().optional(),
  note: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional().default('ACTIVE'),
  linkedCustomerId: z.number().int().positive().optional().nullable(),
  isFuelSupplier: z.boolean().optional().default(false),
});

export const expenseCategorySchema = z.object({
  name: z.string().min(1),
  isRenewable: z.boolean().optional().default(false),
  reminderLeadDays: z.number().int().positive().nullable().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional().default('ACTIVE'),
});

// Date columns reject the empty string — normalise "" → null so the form can submit
// blank optional dates without forcing the client to strip them.
const optionalDate = z.string().optional().nullable().transform((v) => (v === '' ? null : v));

export const expenseSchema = z.object({
  expenseDate: z.string().min(1),
  supplierId: z.coerce.number().int().positive(),
  categoryId: z.coerce.number().int().positive(),
  truckId: z.coerce.number().int().positive().optional().nullable(),
  vehicleComponent: z.enum(['TRUCK', 'TRAILER']).optional().default('TRUCK'),
  amount: positiveNumeric,
  paymentStatus: z.enum(['PAID', 'UNPAID']),
  validFrom: optionalDate,
  validTo: optionalDate,
  receiptId: z.string().optional(),
  note: z.string().optional(),
});

export const vendorPaymentSchema = z.object({
  supplierId: z.coerce.number().int().positive(),
  receiptId: z.string().min(1),
  amount: positiveNumeric,
  date: z.string().min(1),
  confirmOverpay: z.boolean().optional(),
});

// ─── Forwarder catalogs ──────────────────────────────────────────────────────

export const containerTypeSchema = z.object({
  code: z.string().min(1, 'Mã loại container không được để trống').max(20),
  name: z.string().min(1, 'Tên loại container không được để trống').max(50),
  notes: z.string().optional().nullable(),
});

export const portSchema = z.object({
  name: z.string().min(1, 'Tên cảng/bãi không được để trống').max(255),
  code: z.string().max(20).optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  notes: z.string().optional().nullable(),
});

// ─── Forwarder ──────────────────────────────────────────────────────────────

export const tripContainerSchema = z.object({
  tripId: z.coerce.number().int().positive(),
  containerTypeId: z.coerce.number().int().positive().optional().nullable(),
  containerNumber: z.string().min(1, 'Số container không được để trống'),
  sealNumber: z.string().optional().nullable(),
  cargoWeightKg: nonNegNumeric.optional().nullable(),
  notes: z.string().optional().nullable(),
});

// Batch upsert payload used by the trip-edit form: the client sends the full
// desired list of container instances for a trip, and the backend reconciles
// (insert new, update existing by id, delete the rest).
export const tripContainerBatchSchema = z.object({
  containers: z.array(z.object({
    id: z.coerce.number().int().positive().optional(),
    containerTypeId: z.coerce.number().int().positive().optional().nullable(),
    containerNumber: z.string().min(1, 'Số container không được để trống'),
    sealNumber: z.string().optional().nullable().transform(v => (v === '' ? null : v)),
    cargoWeightKg: nonNegNumeric.optional().nullable(),
    notes: z.string().optional().nullable().transform(v => (v === '' ? null : v)),
  })),
});

export const ANCILLARY_EXPENSE_TYPES = [
  'LIFTING', 'LOWERING', 'WEIGHING', 'CUSTOMS',
  'INFRASTRUCTURE', 'INSPECTION', 'INSPECTION_SVC', 'OTHER',
] as const;

export type AncillaryExpenseType = typeof ANCILLARY_EXPENSE_TYPES[number];

export const baseTripExpenseSchema = z.object({
  tripId: z.coerce.number().int().positive(),
  expenseType: z.enum(ANCILLARY_EXPENSE_TYPES),
  buyAmount: z.number().positive(),
  sellAmount: z.number().min(0).optional().default(0),
  settlementMethod: z.enum(['COMPANY_DIRECT', 'FORWARDER_ADVANCE']).default('FORWARDER_ADVANCE'),
  supplierId: z.number().int().positive().optional(),
  invoiceNumber: z.string().max(50).optional(),
  invoiceDate: z.string().optional(),
  declarationNumber: z.string().max(50).optional(),
  containerNumber: z.string().max(20).optional(),
  note: z.string().optional(),
});

export const tripExpenseSchema = baseTripExpenseSchema.superRefine((data, ctx) => {
  if (data.expenseType === 'CUSTOMS' && !data.declarationNumber) {
    ctx.addIssue({
      code: 'custom',
      path: ['declarationNumber'],
      message: 'Số tờ khai là bắt buộc cho phí hải quan',
    });
  }
  if (data.settlementMethod === 'COMPANY_DIRECT' && !data.supplierId) {
    ctx.addIssue({
      code: 'custom',
      path: ['supplierId'],
      message: 'Nhà cung cấp là bắt buộc khi chọn công ty trả trực tiếp',
    });
  }
});

export const forwarderExpenseTypeSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1, 'Tên loại chi phí không được để trống').max(100),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
  defaultMarkup: z.boolean().optional(),
  billingLabel: z.string().max(120).nullable().optional(),
  vatRate: z.union([z.string(), z.number()]).optional()
    .transform(v => v == null ? undefined : Number(v))
    .refine(v => v == null || (Number.isFinite(v) && v >= 0 && v <= 1), {
      message: 'Tỷ lệ VAT phải từ 0 đến 1 (VD: 0.08 cho 8%)',
    }),
});

export const debtOffsetSchema = z.object({
  customerId: z.number().int().positive(),
  supplierId: z.number().int().positive(),
  offsetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày không hợp lệ'),
  note: z.string().optional(),
  // NOTE: no `amount` field — server computes min(arBalance, apBalance)
});

export const createAdvanceRequestSchema = z.object({
  amount: positiveNumeric,
  reason: z.string().min(1, 'Lý do tạm ứng không được để trống'),
});

export const createAdvanceSettlementSchema = z.object({
  totalExpenseAmount: nonNegNumeric.optional(),
  refundAmount: nonNegNumeric.optional().default(0),
  note: z.string().optional().nullable(),
  tripExpenseIds: z.array(z.coerce.number().int().positive()).optional(),
  advanceRequestIds: z.array(z.coerce.number().int().positive()).min(1, 'Phải chọn ít nhất 1 yêu cầu tạm ứng'),
});

// ─── Inferred types ──────────────────────────────────────────────────────────

export type CreateTripInput = z.infer<typeof createTripSchema>;
export type UpdateTripFiguresInput = z.infer<typeof updateTripFiguresSchema>;
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type CreatePenaltyInput = z.infer<typeof createPenaltySchema>;
export type CreateAdjustmentInput = z.infer<typeof createAdjustmentSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type CustomerInput = z.infer<typeof customerSchema>;
export type TruckInput = z.infer<typeof truckSchema>;
export type TrailerInput = z.infer<typeof trailerSchema>;
export type RouteInput = z.infer<typeof routeSchema>;
export type CargoTypeInput = z.infer<typeof cargoTypeSchema>;
export type PricingTableInput = z.infer<typeof pricingTableSchema>;
export type RoadAllowanceInput = z.infer<typeof roadAllowanceSchema>;
export type FuelConfigInput = z.infer<typeof fuelConfigSchema>;
export type PenaltyReasonInput = z.infer<typeof penaltyReasonSchema>;
export type DriverInput = z.infer<typeof driverSchema>;
export type ManagementFeeInput = z.infer<typeof managementFeeSchema>;
export type CapTableInput = z.infer<typeof capTableSchema>;
export type SalaryPeriodInput = z.infer<typeof salaryPeriodSchema>;
export type SalaryPeriodDefaultInput = z.infer<typeof salaryPeriodDefaultSchema>;
export type SupplierInput = z.infer<typeof supplierSchema>;
export type ExpenseCategoryInput = z.infer<typeof expenseCategorySchema>;
export type ExpenseInput = z.infer<typeof expenseSchema>;
export type VendorPaymentInput = z.infer<typeof vendorPaymentSchema>;
export type TripContainerInput = z.infer<typeof tripContainerSchema>;
export type TripExpenseInput = z.infer<typeof tripExpenseSchema>;
export type DebtOffsetInput = z.infer<typeof debtOffsetSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type CreateAdvanceRequestInput = z.infer<typeof createAdvanceRequestSchema>;
export type CreateAdvanceSettlementInput = z.infer<typeof createAdvanceSettlementSchema>;
export type ContainerTypeInput = z.infer<typeof containerTypeSchema>;
export type PortInput = z.infer<typeof portSchema>;

