import { z } from 'zod';
import {
  TripStatus, FuelMode, LoadingType, Role, TxnType,
  TrailerType, TruckStatus, DriverStatus, CustomerStatus,
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

// ─── Trip ────────────────────────────────────────────────────────────────────

export const tripLegSchema = z.object({
  sequence: z.number().int().positive(),
  origin: z.string().min(1),
  destination: z.string().min(1),
  km: positiveNumeric,
  loadingType: z.nativeEnum(LoadingType),
});

export const createTripSchema = z.object({
  customerId: z.coerce.number().int().positive(),
  routeId: z.coerce.number().int().positive(),
  truckId: z.coerce.number().int().positive(),
  driverId: z.coerce.number().int().positive(),
  cargoTypeId: z.coerce.number().int().positive(),
  departureDate: z.string().min(1),
  customerReference: z.string().optional(),
  containerCount: z.coerce.number().int().min(1).max(10).optional(),
  fuelMode: z.nativeEnum(FuelMode).optional(),
});

export const updateTripFiguresSchema = z.object({
  legs: z.array(tripLegSchema).min(1),
  fuelMode: z.nativeEnum(FuelMode),
  fuelLitersOverride: nonNegNumeric.nullable().optional(),
  fuelSupplementLiters: nonNegNumeric.optional(),
  fuelSupplementReason: z.string().optional(),
  tollsDiscount: nonNegNumeric.optional(),
  tollsAddition: nonNegNumeric.optional(),
  tollsStations: z.coerce.number().int().nonnegative().optional(),
  hasReturnCargo: z.boolean().optional(),
  driverSalary: nonNegNumeric.optional(),
  revenue: positiveNumeric.optional(),
  notes: z.string().optional(),
  photoUrls: z.array(z.string()).optional(),
  version: z.number().int().optional(),
  routeId: z.coerce.number().int().positive().optional(),
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
  amount: z.union([z.number(), z.string()]).transform(Number),
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
  fullName: z.string().max(255).or(z.literal('')).optional(),
  email: z.string().email().or(z.literal('')).optional(),
  phone: z.string().min(6).or(z.literal('')).optional(),
});

export const updateProfileSchema = z.object({
  username: z.string().min(1, 'Tên đăng nhập không được để trống').max(100).optional(),
  fullName: z.string().max(255).or(z.literal('')).optional(),
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
});

export const truckSchema = z.object({
  licensePlate: z.string().min(1),
  trailerPlateNumber: z.string().optional().nullable(),
  trailerType: z.nativeEnum(TrailerType).optional().nullable(),
  status: z.nativeEnum(TruckStatus).optional().default(TruckStatus.ACTIVE),
});

export const routeSchema = z.object({
  name: z.string().min(1),
  distanceKm: positiveNumeric.optional(),
  isMountain: z.boolean().optional().default(false),
  fixedFuelAllowance: nonNegNumeric.nullable().optional(),
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

export const penaltyReasonSchema = z.object({
  reasonText: z.string().min(1),
  defaultAmount: nonNegNumeric,
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
});

export const expenseCategorySchema = z.object({
  name: z.string().min(1),
  isRenewable: z.boolean().optional().default(false),
  reminderLeadDays: z.number().int().positive().optional().default(30),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional().default('ACTIVE'),
});

export const expenseSchema = z.object({
  expenseDate: z.string().min(1),
  supplierId: z.coerce.number().int().positive(),
  categoryId: z.coerce.number().int().positive(),
  truckId: z.coerce.number().int().positive().optional().nullable(),
  vehicleComponent: z.enum(['TRUCK', 'TRAILER']).optional().default('TRUCK'),
  amount: positiveNumeric,
  paymentStatus: z.enum(['PAID', 'UNPAID']),
  validFrom: z.string().optional().nullable(),
  validTo: z.string().optional().nullable(),
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
