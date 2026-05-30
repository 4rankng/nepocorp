import { z } from 'zod';
import {
  TripStatus, FuelMode, LoadingType, Role, TxnType,
  TrailerType, TruckStatus, DriverStatus, TrailerStatus, CustomerStatus,
} from '../constants';

// Reusable numeric transform helpers to prevent string concatenation bugs and parse PG numeric types
export const numericMoney = z.union([z.number(), z.string()]).transform((val) => {
  const num = Number(val);
  if (isNaN(num)) throw new Error('Giá trị tiền tệ không hợp lệ');
  return num;
});

export const numericDecimal = z.union([z.number(), z.string()]).transform((val) => {
  const num = Number(val);
  if (isNaN(num)) throw new Error('Giá trị số không hợp lệ');
  return num;
});

const positiveNumeric = z.union([z.number(), z.string()]).transform((val) => {
  const num = Number(val);
  if (isNaN(num) || num <= 0) throw new Error('Phải là số dương');
  return num;
});

const nonNegNumeric = z.union([z.number(), z.string()]).transform((val) => {
  const num = Number(val);
  if (isNaN(num) || num < 0) throw new Error('Phải là số không âm');
  return num;
});

// ─── Trip ────────────────────────────────────────────────────────────────────

export const tripLegSchema = z.object({
  sequence: z.number().int().positive(),
  origin: z.string().min(1),
  destination: z.string().min(1),
  km: positiveNumeric,
  loading_type: z.nativeEnum(LoadingType),
});

export const createTripSchema = z.object({
  customer_id: z.coerce.number().int().positive(),
  route_id: z.coerce.number().int().positive(),
  trailer_id: z.coerce.number().int().positive(),
  truck_id: z.coerce.number().int().positive(),
  driver_id: z.coerce.number().int().positive(),
  cargo_type_id: z.coerce.number().int().positive(),
  departure_date: z.string().min(1),
  customer_reference: z.string().optional(),
});

export const updateTripFiguresSchema = z.object({
  legs: z.array(tripLegSchema).min(1),
  fuel_mode: z.nativeEnum(FuelMode),
  fuel_liters_override: nonNegNumeric.nullable().optional(),
  fuel_supplement_liters: nonNegNumeric.optional(),
  fuel_supplement_reason: z.string().optional(),
  tolls_discount: nonNegNumeric.optional(),
  tolls_addition: nonNegNumeric.optional(),
  tolls_stations: z.coerce.number().int().nonnegative().optional(),
  has_return_cargo: z.boolean().optional(),
  driver_salary: nonNegNumeric.optional(),
  revenue: positiveNumeric.optional(),
  notes: z.string().optional(),
  photo_urls: z.array(z.string()).optional(),
  version: z.number().int().optional(),
}).superRefine((data, ctx) => {
  if (data.fuel_supplement_liters && data.fuel_supplement_liters > 0) {
    if (!data.fuel_supplement_reason || data.fuel_supplement_reason.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Lý do cấp dầu bổ sung là bắt buộc khi số lít dầu bổ sung lớn hơn 0',
        path: ['fuel_supplement_reason'],
      });
    }
  }
});


// ─── Payment ─────────────────────────────────────────────────────────────────

export const createPaymentSchema = z.object({
  customer_id: z.coerce.number().int().positive(),
  receipt_id: z.string().min(1),
  payments: z.array(z.object({
    trip_id: z.coerce.number().int().positive(),
    amount: positiveNumeric,
  })).min(1),
});

// ─── Penalty ─────────────────────────────────────────────────────────────────

export const createPenaltySchema = z.object({
  driver_id: z.coerce.number().int().positive(),
  trip_id: z.coerce.number().int().positive().optional(),
  reason_id: z.coerce.number().int().positive().optional(),
  custom_reason: z.string().optional(),
  amount: positiveNumeric,
  date: z.string().min(1),
});

// ─── Adjustment ──────────────────────────────────────────────────────────────

export const createAdjustmentSchema = z.object({
  trip_id: z.coerce.number().int().positive(),
  amount: z.union([z.number(), z.string()]).transform(Number),
  note: z.string().min(1),
  signed_agreement_ref: z.string().min(1),
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
});

// ─── CRUD ────────────────────────────────────────────────────────────────────

export const customerSchema = z.object({
  name: z.string().min(1),
  tax_code: z.string().optional(),
  contact_person: z.string().optional(),
  phone: z.string().optional(),
  contact_info: z.string().optional(),
  credit_limit: nonNegNumeric.optional(),
  status: z.nativeEnum(CustomerStatus).optional().default(CustomerStatus.ACTIVE),
});

export const truckSchema = z.object({
  license_plate: z.string().min(1),
  status: z.nativeEnum(TruckStatus).optional().default(TruckStatus.ACTIVE),
});

export const trailerSchema = z.object({
  license_plate: z.string().min(1),
  type: z.nativeEnum(TrailerType),
  status: z.nativeEnum(TrailerStatus).optional().default(TrailerStatus.ACTIVE),
});

export const routeSchema = z.object({
  name: z.string().min(1),
  distance_km: positiveNumeric.optional(),
  is_mountain: z.boolean().optional().default(false),
  fixed_fuel_allowance: nonNegNumeric.nullable().optional(),
});

export const cargoTypeSchema = z.object({
  name: z.string().min(1),
  requires_photos: z.boolean().optional().default(false),
});

export const pricingTableSchema = z.object({
  customer_id: z.coerce.number().int().positive(),
  route_id: z.coerce.number().int().positive(),
  price: positiveNumeric,
});

export const roadAllowanceSchema = z.object({
  route_id: z.coerce.number().int().positive(),
  trailer_type: z.nativeEnum(TrailerType),
  base_amount: positiveNumeric,
});

export const fuelConfigSchema = z.object({
  loaded_norm: positiveNumeric,
  empty_norm: positiveNumeric,
  supplement: nonNegNumeric.optional().default(3),
  unit_price: positiveNumeric,
  warning_threshold: nonNegNumeric.optional().default(37),
  critical_threshold: nonNegNumeric.optional().default(40),
});

export const penaltyReasonSchema = z.object({
  reason_text: z.string().min(1),
  default_amount: nonNegNumeric,
});

export const driverSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  assigned_truck_id: z.number().int().positive().nullable().optional(),
  base_salary: nonNegNumeric.optional(),
  status: z.nativeEnum(DriverStatus).optional().default(DriverStatus.ACTIVE),
});

export const managementFeeSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000),
  amount: nonNegNumeric,
});

export const capTableSchema = z.object({
  partner_name: z.string().min(1),
  percentage: z.number().min(0).max(100),
  effective_date: z.string().min(1),
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
