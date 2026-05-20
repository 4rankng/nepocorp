import { z } from 'zod';
import {
  TripStatus, FuelMode, LoadingType, Role, TxnType,
  TrailerType, TruckStatus, DriverStatus, TrailerStatus,
} from '../constants';

const positiveNum = z.coerce.number().positive();
const nonNegNum = z.coerce.number().nonnegative();

// ─── Trip ────────────────────────────────────────────────────────────────────

export const tripLegSchema = z.object({
  sequence: z.number().int().positive(),
  origin: z.string().min(1),
  destination: z.string().min(1),
  km: positiveNum,
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
  fuel_liters_override: z.number().nonnegative().optional(),
  fuel_supplement_liters: z.number().nonnegative().optional(),
  fuel_supplement_reason: z.string().optional(),
  tolls_discount: nonNegNum.optional(),
  tolls_addition: nonNegNum.optional(),
  tolls_stations: nonNegNum.optional(),
  has_return_cargo: z.boolean().optional(),
  driver_salary: z.number().nonnegative().optional(),
  revenue: z.number().positive().optional(),
  notes: z.string().optional(),
  photo_urls: z.array(z.string()).optional(),
});

// ─── Payment ─────────────────────────────────────────────────────────────────

export const createPaymentSchema = z.object({
  customer_id: z.coerce.number().int().positive(),
  receipt_id: z.string().min(1),
  payments: z.array(z.object({
    trip_id: z.coerce.number().int().positive(),
    amount: positiveNum,
  })).min(1),
});

// ─── Penalty ─────────────────────────────────────────────────────────────────

export const createPenaltySchema = z.object({
  driver_id: z.coerce.number().int().positive(),
  trip_id: z.coerce.number().int().positive().optional(),
  reason_id: z.coerce.number().int().positive().optional(),
  custom_reason: z.string().optional(),
  amount: positiveNum,
  date: z.string().min(1),
});

// ─── Adjustment ──────────────────────────────────────────────────────────────

export const createAdjustmentSchema = z.object({
  trip_id: z.coerce.number().int().positive(),
  amount: z.number(),
  note: z.string().min(1),
  signed_agreement_ref: z.string().min(1),
});

// ─── Auth ────────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(1),
});

// ─── CRUD ────────────────────────────────────────────────────────────────────

export const customerSchema = z.object({
  name: z.string().min(1),
  contact_info: z.string().optional(),
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
  distance_km: positiveNum.optional(),
  is_mountain: z.boolean().optional().default(false),
  fixed_fuel_allowance: z.number().nonnegative().nullable().optional(),
});

export const cargoTypeSchema = z.object({
  name: z.string().min(1),
  requires_photos: z.boolean().optional().default(false),
});

export const pricingTableSchema = z.object({
  customer_id: z.coerce.number().int().positive(),
  route_id: z.coerce.number().int().positive(),
  price: positiveNum,
});

export const roadAllowanceSchema = z.object({
  route_id: z.coerce.number().int().positive(),
  trailer_type: z.nativeEnum(TrailerType),
  base_amount: positiveNum,
});

export const fuelConfigSchema = z.object({
  loaded_norm: positiveNum,
  empty_norm: positiveNum,
  supplement: nonNegNum.optional().default(3),
  unit_price: positiveNum,
});

export const penaltyReasonSchema = z.object({
  reason_text: z.string().min(1),
  default_amount: nonNegNum,
});

export const driverSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  assigned_truck_id: z.number().int().positive().nullable().optional(),
  base_salary: nonNegNum.optional(),
  status: z.nativeEnum(DriverStatus).optional().default(DriverStatus.ACTIVE),
});

export const managementFeeSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000),
  amount: nonNegNum,
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
