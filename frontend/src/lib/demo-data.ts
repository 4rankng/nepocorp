import type {
  Driver, Truck, Trailer, Customer, Route, CargoType,
  PricingTable, RoadAllowance, FuelConfig, PenaltyReason,
  TripDetail, TripLeg, Penalty, CapTableHistory, ManagementFee,
  LedgerEntry,
} from '@nepocorp/shared';
import { TripStatus, FuelMode, LoadingType, Role, TrailerType, TruckStatus, DriverStatus, TrailerStatus, CustomerStatus, TxnType } from '@nepocorp/shared';

// ─── Drivers ─────────────────────────────────────────────────────────────────

export const demoDrivers: Driver[] = [
  { id: 1, user_id: 101, name: 'Nguyễn Văn Minh', phone: '0901234567', assigned_truck_id: 1, base_salary: '8000000', status: DriverStatus.ACTIVE, created_at: '2025-01-10T08:00:00Z', updated_at: '2025-06-01T08:00:00Z', deleted_at: null },
  { id: 2, user_id: 102, name: 'Trần Quốc Bảo', phone: '0902345678', assigned_truck_id: 2, base_salary: '7500000', status: DriverStatus.ACTIVE, created_at: '2025-01-15T08:00:00Z', updated_at: '2025-06-01T08:00:00Z', deleted_at: null },
  { id: 3, user_id: 103, name: 'Lê Hoàng Nam', phone: '0903456789', assigned_truck_id: 3, base_salary: '8200000', status: DriverStatus.ACTIVE, created_at: '2025-02-01T08:00:00Z', updated_at: '2025-06-01T08:00:00Z', deleted_at: null },
  { id: 4, user_id: 104, name: 'Phạm Đức Thắng', phone: '0904567890', assigned_truck_id: 4, base_salary: '7800000', status: DriverStatus.ACTIVE, created_at: '2025-02-15T08:00:00Z', updated_at: '2025-06-01T08:00:00Z', deleted_at: null },
  { id: 5, user_id: 105, name: 'Hoàng Anh Tuấn', phone: '0905678901', assigned_truck_id: 5, base_salary: '8000000', status: DriverStatus.ACTIVE, created_at: '2025-03-01T08:00:00Z', updated_at: '2025-06-01T08:00:00Z', deleted_at: null },
  { id: 6, user_id: 106, name: 'Võ Thành Nhân', phone: '0906789012', assigned_truck_id: 6, base_salary: '7600000', status: DriverStatus.ACTIVE, created_at: '2025-03-15T08:00:00Z', updated_at: '2025-06-01T08:00:00Z', deleted_at: null },
  { id: 7, user_id: 107, name: 'Đặng Minh Phú', phone: '0907890123', assigned_truck_id: null, base_salary: '7000000', status: DriverStatus.INACTIVE, created_at: '2025-04-01T08:00:00Z', updated_at: '2025-06-01T08:00:00Z', deleted_at: null },
  { id: 8, user_id: 108, name: 'Bùi Quang Huy', phone: '0908901234', assigned_truck_id: null, base_salary: '7200000', status: DriverStatus.INACTIVE, created_at: '2025-04-15T08:00:00Z', updated_at: '2025-06-01T08:00:00Z', deleted_at: null },
];

// ─── Trucks ──────────────────────────────────────────────────────────────────

export const demoTrucks: Truck[] = [
  { id: 1, license_plate: '51C-1234', status: TruckStatus.ACTIVE, created_at: '2024-06-01T08:00:00Z', updated_at: '2025-06-01T08:00:00Z', deleted_at: null },
  { id: 2, license_plate: '51C-5678', status: TruckStatus.ACTIVE, created_at: '2024-06-15T08:00:00Z', updated_at: '2025-06-01T08:00:00Z', deleted_at: null },
  { id: 3, license_plate: '60C-9012', status: TruckStatus.ACTIVE, created_at: '2024-07-01T08:00:00Z', updated_at: '2025-06-01T08:00:00Z', deleted_at: null },
  { id: 4, license_plate: '60C-3456', status: TruckStatus.ACTIVE, created_at: '2024-07-15T08:00:00Z', updated_at: '2025-06-01T08:00:00Z', deleted_at: null },
  { id: 5, license_plate: '51C-7890', status: TruckStatus.ACTIVE, created_at: '2024-08-01T08:00:00Z', updated_at: '2025-06-01T08:00:00Z', deleted_at: null },
  { id: 6, license_plate: '51C-2345', status: TruckStatus.ACTIVE, created_at: '2024-08-15T08:00:00Z', updated_at: '2025-06-01T08:00:00Z', deleted_at: null },
  { id: 7, license_plate: '60C-6789', status: TruckStatus.MAINTENANCE, created_at: '2024-09-01T08:00:00Z', updated_at: '2025-06-01T08:00:00Z', deleted_at: null },
  { id: 8, license_plate: '51C-0123', status: TruckStatus.INACTIVE, created_at: '2024-09-15T08:00:00Z', updated_at: '2025-06-01T08:00:00Z', deleted_at: null },
];

// ─── Trailers ────────────────────────────────────────────────────────────────

export const demoTrailers: Trailer[] = [
  { id: 1, license_plate: '51R-1111', type: TrailerType.FT20, status: TrailerStatus.ACTIVE, created_at: '2024-06-01T08:00:00Z', updated_at: '2025-06-01T08:00:00Z', deleted_at: null },
  { id: 2, license_plate: '51R-2222', type: TrailerType.FT40, status: TrailerStatus.ACTIVE, created_at: '2024-06-15T08:00:00Z', updated_at: '2025-06-01T08:00:00Z', deleted_at: null },
  { id: 3, license_plate: '60R-3333', type: TrailerType.FT20, status: TrailerStatus.ACTIVE, created_at: '2024-07-01T08:00:00Z', updated_at: '2025-06-01T08:00:00Z', deleted_at: null },
  { id: 4, license_plate: '60R-4444', type: TrailerType.FT40, status: TrailerStatus.ACTIVE, created_at: '2024-07-15T08:00:00Z', updated_at: '2025-06-01T08:00:00Z', deleted_at: null },
  { id: 5, license_plate: '51R-5555', type: TrailerType.FT20, status: TrailerStatus.ACTIVE, created_at: '2024-08-01T08:00:00Z', updated_at: '2025-06-01T08:00:00Z', deleted_at: null },
  { id: 6, license_plate: '51R-6666', type: TrailerType.FT40, status: TrailerStatus.MAINTENANCE, created_at: '2024-08-15T08:00:00Z', updated_at: '2025-06-01T08:00:00Z', deleted_at: null },
];

// ─── Customers ───────────────────────────────────────────────────────────────

export const demoCustomers: Customer[] = [
  { id: 1, name: 'Công ty TNHH Vận Tải Phúc Thịnh', tax_code: '0312345678', contact_person: 'Nguyễn Thị Lan', phone: '0281234567', contact_info: 'lan@phucthinh.vn', credit_limit: '500000000', status: CustomerStatus.ACTIVE, created_at: '2025-01-01T08:00:00Z', updated_at: '2025-06-01T08:00:00Z', deleted_at: null },
  { id: 2, name: 'Công ty CP Xây Dựng Minh Anh', tax_code: '0323456789', contact_person: 'Trần Văn Hùng', phone: '0282345678', contact_info: 'hung@minhanh.vn', credit_limit: '300000000', status: CustomerStatus.ACTIVE, created_at: '2025-01-15T08:00:00Z', updated_at: '2025-06-01T08:00:00Z', deleted_at: null },
  { id: 3, name: 'Công ty TNHH Thương Mại Hải Nam', tax_code: '0334567890', contact_person: 'Lê Thị Mai', phone: '0283456789', contact_info: 'mai@hainam.vn', credit_limit: '200000000', status: CustomerStatus.ACTIVE, created_at: '2025-02-01T08:00:00Z', updated_at: '2025-06-01T08:00:00Z', deleted_at: null },
  { id: 4, name: 'Công ty CP Vật Liệu XD Đồng Nai', tax_code: '0345678901', contact_person: 'Phạm Đức Anh', phone: '0284567890', contact_info: 'anh@dongnai.vn', credit_limit: '400000000', status: CustomerStatus.ACTIVE, created_at: '2025-02-15T08:00:00Z', updated_at: '2025-06-01T08:00:00Z', deleted_at: null },
  { id: 5, name: 'Công ty TNHH Sản Xuất Bình Dương', tax_code: '0356789012', contact_person: 'Hoàng Minh Khoa', phone: '0285678901', contact_info: 'khoa@binhduong.vn', credit_limit: '350000000', status: CustomerStatus.ACTIVE, created_at: '2025-03-01T08:00:00Z', updated_at: '2025-06-01T08:00:00Z', deleted_at: null },
  { id: 6, name: 'Công ty CP Nông Sản Miền Tây', tax_code: '0367890123', contact_person: 'Võ Thanh Tùng', phone: '0286789012', contact_info: 'tung@mientay.vn', credit_limit: '150000000', status: CustomerStatus.LOCKED, created_at: '2025-03-15T08:00:00Z', updated_at: '2025-06-01T08:00:00Z', deleted_at: null },
];

// ─── Routes ──────────────────────────────────────────────────────────────────

export const demoRoutes: Route[] = [
  { id: 1, name: 'TP.HCM → Bình Dương', distance_km: 35, is_mountain: false, fixed_fuel_allowance: null, created_at: '2025-01-01T08:00:00Z', updated_at: '2025-06-01T08:00:00Z', deleted_at: null },
  { id: 2, name: 'TP.HCM → Đồng Nai', distance_km: 50, is_mountain: false, fixed_fuel_allowance: null, created_at: '2025-01-01T08:00:00Z', updated_at: '2025-06-01T08:00:00Z', deleted_at: null },
  { id: 3, name: 'TP.HCM → Vũng Tàu', distance_km: 95, is_mountain: true, fixed_fuel_allowance: '50000', created_at: '2025-01-01T08:00:00Z', updated_at: '2025-06-01T08:00:00Z', deleted_at: null },
  { id: 4, name: 'Bình Dương → Đồng Nai', distance_km: 60, is_mountain: false, fixed_fuel_allowance: null, created_at: '2025-01-01T08:00:00Z', updated_at: '2025-06-01T08:00:00Z', deleted_at: null },
  { id: 5, name: 'TP.HCM → Long An', distance_km: 45, is_mountain: false, fixed_fuel_allowance: null, created_at: '2025-01-01T08:00:00Z', updated_at: '2025-06-01T08:00:00Z', deleted_at: null },
  { id: 6, name: 'TP.HCM → Tiền Giang', distance_km: 70, is_mountain: false, fixed_fuel_allowance: null, created_at: '2025-01-01T08:00:00Z', updated_at: '2025-06-01T08:00:00Z', deleted_at: null },
];

// ─── Cargo Types ─────────────────────────────────────────────────────────────

export const demoCargoTypes: CargoType[] = [
  { id: 1, name: 'Cát xây dựng', requires_photos: false, created_at: '2025-01-01T08:00:00Z', updated_at: '2025-06-01T08:00:00Z', deleted_at: null },
  { id: 2, name: 'Đá miễu', requires_photos: false, created_at: '2025-01-01T08:00:00Z', updated_at: '2025-06-01T08:00:00Z', deleted_at: null },
  { id: 3, name: 'Xi măng', requires_photos: true, created_at: '2025-01-01T08:00:00Z', updated_at: '2025-06-01T08:00:00Z', deleted_at: null },
  { id: 4, name: 'Hạt nhựa', requires_photos: true, created_at: '2025-01-01T08:00:00Z', updated_at: '2025-06-01T08:00:00Z', deleted_at: null },
];

// ─── Pricing Tables ──────────────────────────────────────────────────────────

export const demoPricingTables: PricingTable[] = [
  { id: 1, customer_id: 1, route_id: 1, price: '2500000', created_at: '2025-01-01T08:00:00Z', updated_at: '2025-06-01T08:00:00Z', deleted_at: null },
  { id: 2, customer_id: 1, route_id: 2, price: '3200000', created_at: '2025-01-01T08:00:00Z', updated_at: '2025-06-01T08:00:00Z', deleted_at: null },
  { id: 3, customer_id: 2, route_id: 1, price: '2800000', created_at: '2025-01-01T08:00:00Z', updated_at: '2025-06-01T08:00:00Z', deleted_at: null },
  { id: 4, customer_id: 2, route_id: 3, price: '4500000', created_at: '2025-01-01T08:00:00Z', updated_at: '2025-06-01T08:00:00Z', deleted_at: null },
  { id: 5, customer_id: 3, route_id: 2, price: '3000000', created_at: '2025-01-01T08:00:00Z', updated_at: '2025-06-01T08:00:00Z', deleted_at: null },
  { id: 6, customer_id: 4, route_id: 4, price: '3500000', created_at: '2025-01-01T08:00:00Z', updated_at: '2025-06-01T08:00:00Z', deleted_at: null },
];

// ─── Road Allowances ─────────────────────────────────────────────────────────

export const demoRoadAllowances: RoadAllowance[] = [
  { id: 1, route_id: 1, trailer_type: TrailerType.FT20, base_amount: '150000', created_at: '2025-01-01T08:00:00Z', updated_at: '2025-06-01T08:00:00Z', deleted_at: null },
  { id: 2, route_id: 1, trailer_type: TrailerType.FT40, base_amount: '200000', created_at: '2025-01-01T08:00:00Z', updated_at: '2025-06-01T08:00:00Z', deleted_at: null },
  { id: 3, route_id: 2, trailer_type: TrailerType.FT20, base_amount: '180000', created_at: '2025-01-01T08:00:00Z', updated_at: '2025-06-01T08:00:00Z', deleted_at: null },
  { id: 4, route_id: 2, trailer_type: TrailerType.FT40, base_amount: '250000', created_at: '2025-01-01T08:00:00Z', updated_at: '2025-06-01T08:00:00Z', deleted_at: null },
  { id: 5, route_id: 3, trailer_type: TrailerType.FT20, base_amount: '300000', created_at: '2025-01-01T08:00:00Z', updated_at: '2025-06-01T08:00:00Z', deleted_at: null },
  { id: 6, route_id: 3, trailer_type: TrailerType.FT40, base_amount: '400000', created_at: '2025-01-01T08:00:00Z', updated_at: '2025-06-01T08:00:00Z', deleted_at: null },
];

// ─── Fuel Config ─────────────────────────────────────────────────────────────

export const demoFuelConfig: FuelConfig = {
  id: 1, loaded_norm: '28', empty_norm: '15', supplement: '3', unit_price: '23500',
  created_at: '2025-01-01T08:00:00Z', updated_at: '2025-06-01T08:00:00Z', deleted_at: null,
};

// ─── Penalty Reasons ─────────────────────────────────────────────────────────

export const demoPenaltyReasons: PenaltyReason[] = [
  { id: 1, reason_text: 'Đi trễ', default_amount: '200000', created_at: '2025-01-01T08:00:00Z', updated_at: '2025-06-01T08:00:00Z', deleted_at: null },
  { id: 2, reason_text: 'Vi phạm tốc độ', default_amount: '500000', created_at: '2025-01-01T08:00:00Z', updated_at: '2025-06-01T08:00:00Z', deleted_at: null },
  { id: 3, reason_text: 'Xe không sạch sẽ', default_amount: '100000', created_at: '2025-01-01T08:00:00Z', updated_at: '2025-06-01T08:00:00Z', deleted_at: null },
  { id: 4, reason_text: 'Thiếu giấy tờ', default_amount: '300000', created_at: '2025-01-01T08:00:00Z', updated_at: '2025-06-01T08:00:00Z', deleted_at: null },
  { id: 5, reason_text: 'Giao hàng chậm', default_amount: '400000', created_at: '2025-01-01T08:00:00Z', updated_at: '2025-06-01T08:00:00Z', deleted_at: null },
];

// ─── Trip Legs (shared) ──────────────────────────────────────────────────────

const makeLegs = (tripId: number, origin: string, dest: string, km: number): TripLeg[] => [
  { id: tripId * 10 + 1, trip_id: tripId, sequence: 1, origin, destination: dest, km, loading_type: LoadingType.HANG, calculated_liters: String(km * 0.28), created_at: '2025-05-20T08:00:00Z', updated_at: '2025-05-20T08:00:00Z' },
  { id: tripId * 10 + 2, trip_id: tripId, sequence: 2, origin: dest, destination: origin, km, loading_type: LoadingType.VO, calculated_liters: String(km * 0.15), created_at: '2025-05-20T08:00:00Z', updated_at: '2025-05-20T08:00:00Z' },
];

// ─── Trips ───────────────────────────────────────────────────────────────────

function makeTrip(overrides: Partial<TripDetail> & { id: number }): TripDetail {
  const route = demoRoutes.find(r => r.id === overrides.route_id) ?? demoRoutes[0];
  const customer = demoCustomers.find(c => c.id === overrides.customer_id) ?? demoCustomers[0];
  const driver = demoDrivers.find(d => d.id === overrides.driver_id) ?? demoDrivers[0];
  const truck = demoTrucks.find(t => t.id === overrides.truck_id) ?? demoTrucks[0];
  const trailer = demoTrailers.find(t => t.id === overrides.trailer_id) ?? demoTrailers[0];
  const cargoType = demoCargoTypes.find(c => c.id === overrides.cargo_type_id) ?? demoCargoTypes[0];
  const parts = route.name.split('→');
  const origin = parts[0]?.trim() ?? 'TP.HCM';
  const dest = parts[1]?.trim() ?? 'Bình Dương';
  const km = route.distance_km ?? 50;

  return {
    customer_id: 1, customer_reference: null, truck_id: 1, driver_id: 1, route_id: 1,
    trailer_id: 1, cargo_type_id: 1, status: TripStatus.CREATED,
    departure_date: '2025-05-27', fuel_mode: FuelMode.AUTO,
    fuel_liters_override: null, fuel_supplement_liters: null, fuel_supplement_reason: null,
    fuel_price_applied: null, tolls_discount: '0', tolls_addition: '0', tolls_stations: 0,
    has_return_cargo: false, driver_salary: null, fuel_liters: null,
    total_fuel_cost: null, total_road_allowance: null, total_cost: null,
    revenue: null, gross_profit: null, revenue_original: null,
    revenue_overridden_by: null, revenue_overridden_at: null,
    photo_urls: null, notes: null,
    created_at: '2025-05-20T08:00:00Z', updated_at: '2025-05-20T08:00:00Z', deleted_at: null,
    ...overrides,
    legs: overrides.legs ?? makeLegs(overrides.id, origin, dest, km),
    driver, truck, trailer, route, customer, cargoType,
  } as TripDetail;
}

export const demoTrips: TripDetail[] = [
  // CREATED (pending dispatch)
  makeTrip({ id: 1, customer_id: 1, route_id: 1, truck_id: 1, driver_id: 1, trailer_id: 1, cargo_type_id: 1, status: TripStatus.CREATED, departure_date: '2025-05-27' }),
  makeTrip({ id: 2, customer_id: 2, route_id: 2, truck_id: 2, driver_id: 2, trailer_id: 2, cargo_type_id: 2, status: TripStatus.CREATED, departure_date: '2025-05-28' }),
  makeTrip({ id: 3, customer_id: 3, route_id: 3, truck_id: 3, driver_id: 3, trailer_id: 3, cargo_type_id: 1, status: TripStatus.CREATED, departure_date: '2025-05-28' }),
  // IN_TRANSIT
  makeTrip({ id: 4, customer_id: 1, route_id: 2, truck_id: 4, driver_id: 4, trailer_id: 4, cargo_type_id: 3, status: TripStatus.IN_TRANSIT, departure_date: '2025-05-25', revenue: '3200000', total_cost: '1800000', gross_profit: '1400000', driver_salary: '600000', fuel_liters: '40', total_fuel_cost: '940000', total_road_allowance: '180000' }),
  makeTrip({ id: 5, customer_id: 4, route_id: 4, truck_id: 5, driver_id: 5, trailer_id: 5, cargo_type_id: 2, status: TripStatus.IN_TRANSIT, departure_date: '2025-05-26', revenue: '3500000', total_cost: '2000000', gross_profit: '1500000', driver_salary: '650000', fuel_liters: '48', total_fuel_cost: '1128000', total_road_allowance: '200000' }),
  // COMPLETED
  makeTrip({ id: 6, customer_id: 2, route_id: 1, truck_id: 1, driver_id: 1, trailer_id: 1, cargo_type_id: 1, status: TripStatus.COMPLETED, departure_date: '2025-05-20', revenue: '2500000', total_cost: '1400000', gross_profit: '1100000', driver_salary: '550000', fuel_liters: '30', total_fuel_cost: '705000', total_road_allowance: '150000' }),
  makeTrip({ id: 7, customer_id: 1, route_id: 5, truck_id: 2, driver_id: 2, trailer_id: 2, cargo_type_id: 4, status: TripStatus.COMPLETED, departure_date: '2025-05-21', revenue: '2800000', total_cost: '1600000', gross_profit: '1200000', driver_salary: '580000', fuel_liters: '36', total_fuel_cost: '846000', total_road_allowance: '160000' }),
  makeTrip({ id: 8, customer_id: 3, route_id: 6, truck_id: 3, driver_id: 3, trailer_id: 3, cargo_type_id: 3, status: TripStatus.COMPLETED, departure_date: '2025-05-22', revenue: '3800000', total_cost: '2200000', gross_profit: '1600000', driver_salary: '700000', fuel_liters: '56', total_fuel_cost: '1316000', total_road_allowance: '200000' }),
  // LOCKED
  makeTrip({ id: 9, customer_id: 4, route_id: 3, truck_id: 4, driver_id: 4, trailer_id: 4, cargo_type_id: 2, status: TripStatus.LOCKED, departure_date: '2025-05-15', revenue: '4500000', total_cost: '2600000', gross_profit: '1900000', driver_salary: '750000', fuel_liters: '65', total_fuel_cost: '1527500', total_road_allowance: '300000' }),
  makeTrip({ id: 10, customer_id: 5, route_id: 2, truck_id: 5, driver_id: 5, trailer_id: 5, cargo_type_id: 1, status: TripStatus.LOCKED, departure_date: '2025-05-16', revenue: '3100000', total_cost: '1750000', gross_profit: '1350000', driver_salary: '620000', fuel_liters: '42', total_fuel_cost: '987000', total_road_allowance: '180000' }),
  makeTrip({ id: 11, customer_id: 1, route_id: 1, truck_id: 6, driver_id: 6, trailer_id: 1, cargo_type_id: 4, status: TripStatus.LOCKED, departure_date: '2025-05-17', revenue: '2600000', total_cost: '1450000', gross_profit: '1150000', driver_salary: '540000', fuel_liters: '32', total_fuel_cost: '752000', total_road_allowance: '150000' }),
  makeTrip({ id: 12, customer_id: 2, route_id: 4, truck_id: 1, driver_id: 1, trailer_id: 2, cargo_type_id: 3, status: TripStatus.LOCKED, departure_date: '2025-05-18', revenue: '3600000', total_cost: '2050000', gross_profit: '1550000', driver_salary: '680000', fuel_liters: '50', total_fuel_cost: '1175000', total_road_allowance: '200000' }),
  // CANCELED
  makeTrip({ id: 13, customer_id: 3, route_id: 5, truck_id: 2, driver_id: 2, trailer_id: 3, cargo_type_id: 1, status: TripStatus.CANCELED, departure_date: '2025-05-19', revenue: null, total_cost: null, gross_profit: null }),
  // More locked for finance
  makeTrip({ id: 14, customer_id: 5, route_id: 6, truck_id: 3, driver_id: 3, trailer_id: 4, cargo_type_id: 2, status: TripStatus.LOCKED, departure_date: '2025-05-14', revenue: '3900000', total_cost: '2300000', gross_profit: '1600000', driver_salary: '720000', fuel_liters: '58', total_fuel_cost: '1363000', total_road_allowance: '220000' }),
  makeTrip({ id: 15, customer_id: 4, route_id: 1, truck_id: 4, driver_id: 4, trailer_id: 5, cargo_type_id: 4, status: TripStatus.LOCKED, departure_date: '2025-05-13', revenue: '2700000', total_cost: '1500000', gross_profit: '1200000', driver_salary: '560000', fuel_liters: '34', total_fuel_cost: '799000', total_road_allowance: '150000' }),
];

// ─── Penalties ───────────────────────────────────────────────────────────────

export const demoPenalties: Penalty[] = [
  { id: 1, driver_id: 1, trip_id: 6, reason_id: 1, custom_reason: null, amount: '200000', date: '2025-05-20', created_at: '2025-05-20T10:00:00Z', updated_at: '2025-05-20T10:00:00Z', deleted_at: null },
  { id: 2, driver_id: 2, trip_id: 7, reason_id: 2, custom_reason: null, amount: '500000', date: '2025-05-21', created_at: '2025-05-21T10:00:00Z', updated_at: '2025-05-21T10:00:00Z', deleted_at: null },
  { id: 3, driver_id: 3, trip_id: 8, reason_id: 3, custom_reason: null, amount: '100000', date: '2025-05-22', created_at: '2025-05-22T10:00:00Z', updated_at: '2025-05-22T10:00:00Z', deleted_at: null },
  { id: 4, driver_id: 4, trip_id: 9, reason_id: 5, custom_reason: null, amount: '400000', date: '2025-05-15', created_at: '2025-05-15T10:00:00Z', updated_at: '2025-05-15T10:00:00Z', deleted_at: null },
  { id: 5, driver_id: 1, trip_id: null, reason_id: null, custom_reason: 'Lỗi vi phạm nội quy', amount: '300000', date: '2025-05-10', created_at: '2025-05-10T10:00:00Z', updated_at: '2025-05-10T10:00:00Z', deleted_at: null },
];

// ─── Cap Table ───────────────────────────────────────────────────────────────

export const demoCapTable: CapTableHistory[] = [
  { id: 1, partnerName: 'Nguyễn Văn A', percentage: '40', effectiveDate: '2025-01-01', createdAt: '2025-01-01T08:00:00Z', updatedAt: '2025-01-01T08:00:00Z' },
  { id: 2, partnerName: 'Trần Thị B', percentage: '35', effectiveDate: '2025-01-01', createdAt: '2025-01-01T08:00:00Z', updatedAt: '2025-01-01T08:00:00Z' },
  { id: 3, partnerName: 'Lê Văn C', percentage: '25', effectiveDate: '2025-01-01', createdAt: '2025-01-01T08:00:00Z', updatedAt: '2025-01-01T08:00:00Z' },
];

// ─── Management Fees ─────────────────────────────────────────────────────────

export const demoManagementFees: ManagementFee[] = [
  { id: 1, month: 1, year: 2025, amount: '5000000', created_at: '2025-02-01T08:00:00Z', updated_at: '2025-02-01T08:00:00Z' },
  { id: 2, month: 2, year: 2025, amount: '5200000', created_at: '2025-03-01T08:00:00Z', updated_at: '2025-03-01T08:00:00Z' },
  { id: 3, month: 3, year: 2025, amount: '4800000', created_at: '2025-04-01T08:00:00Z', updated_at: '2025-04-01T08:00:00Z' },
  { id: 4, month: 4, year: 2025, amount: '5500000', created_at: '2025-05-01T08:00:00Z', updated_at: '2025-05-01T08:00:00Z' },
];

// ─── Ledger Entries ──────────────────────────────────────────────────────────

export const demoLedgerEntries: LedgerEntry[] = [
  { id: 1, timestamp: '2025-05-20T10:00:00Z', txn_type: TxnType.TRIP_REVENUE, txn_id: 6, receipt_id: null, entity_type: 'CUSTOMER', entity_id: 2, credit: '2500000', debit: '0', balance: '2500000', note: 'Doanh thu chuyến #6', created_at: '2025-05-20T10:00:00Z' },
  { id: 2, timestamp: '2025-05-21T10:00:00Z', txn_type: TxnType.TRIP_REVENUE, txn_id: 7, receipt_id: null, entity_type: 'CUSTOMER', entity_id: 1, credit: '2800000', debit: '0', balance: '5300000', note: 'Doanh thu chuyến #7', created_at: '2025-05-21T10:00:00Z' },
  { id: 3, timestamp: '2025-05-22T14:00:00Z', txn_type: TxnType.PAYMENT_RECEIVED, txn_id: null, receipt_id: 'PT-001', entity_type: 'CUSTOMER', entity_id: 1, credit: '0', debit: '3000000', balance: '2300000', note: 'Thu tiền khách Phúc Thịnh', created_at: '2025-05-22T14:00:00Z' },
  { id: 4, timestamp: '2025-05-22T10:00:00Z', txn_type: TxnType.TRIP_REVENUE, txn_id: 8, receipt_id: null, entity_type: 'CUSTOMER', entity_id: 3, credit: '3800000', debit: '0', balance: '6100000', note: 'Doanh thu chuyến #8', created_at: '2025-05-22T10:00:00Z' },
  { id: 5, timestamp: '2025-05-23T10:00:00Z', txn_type: TxnType.PENALTY, txn_id: 1, receipt_id: null, entity_type: 'DRIVER', entity_id: 1, credit: '200000', debit: '0', balance: '200000', note: 'Phạt đi trễ', created_at: '2025-05-23T10:00:00Z' },
  { id: 6, timestamp: '2025-05-25T10:00:00Z', txn_type: TxnType.TRIP_REVENUE, txn_id: 9, receipt_id: null, entity_type: 'CUSTOMER', entity_id: 4, credit: '4500000', debit: '0', balance: '10600000', note: 'Doanh thu chuyến #9', created_at: '2025-05-25T10:00:00Z' },
];

// ─── Dashboard Stats ─────────────────────────────────────────────────────────
// Source of truth for "current month" headline figures. The P&L report mock
// below reconciles to these numbers when asked for the current month, so the
// dashboard and Báo cáo lãi lỗ stop telling the director two different stories
// about the same period.

const CURRENT_MONTH = new Date().getMonth() + 1;
const CURRENT_YEAR = new Date().getFullYear();

const DASHBOARD_REVENUE = 116_500_000;
const DASHBOARD_COSTS = 66_405_000;
const DASHBOARD_MGMT_FEE = 5_000_000;
const DASHBOARD_OTHER_INCOME = 1_000_000;
const DASHBOARD_TRIP_COUNT = 23;

export const demoDashboardStats = {
  revenue: DASHBOARD_REVENUE,
  costs: DASHBOARD_COSTS,
  grossProfit: DASHBOARD_REVENUE - DASHBOARD_COSTS,
  tripCount: DASHBOARD_TRIP_COUNT,
  completedTrips: 3,
  inTransitTrips: 2,
  pendingPayments: 8_500_000,
  totalTrucks: 8,
  totalDrivers: 8,
};

// ─── PnL Report ──────────────────────────────────────────────────────────────

export function makePnlReport(month: number, year: number) {
  // For the current month, mirror the dashboard headline numbers exactly so
  // the two views agree. For historical months, generate plausible seeded
  // values that scale around the current-month baseline.
  const isCurrent = month === CURRENT_MONTH && year === CURRENT_YEAR;

  let totalRevenue: number;
  let totalCosts: number;
  let tripCount: number;
  if (isCurrent) {
    totalRevenue = DASHBOARD_REVENUE;
    totalCosts = DASHBOARD_COSTS;
    tripCount = DASHBOARD_TRIP_COUNT;
  } else {
    const seed = (month * 7 + year * 13) % 100;
    // Plausible monthly drift ±20% of the baseline revenue.
    const scale = 0.8 + (seed / 100) * 0.4;
    totalRevenue = Math.round(DASHBOARD_REVENUE * scale);
    totalCosts = Math.round(totalRevenue * 0.57);
    tripCount = 20 + (seed % 10);
  }

  const grossProfit = totalRevenue - totalCosts;
  const managementFee = DASHBOARD_MGMT_FEE;
  const otherIncome = DASHBOARD_OTHER_INCOME;
  const netProfit = grossProfit - managementFee + otherIncome;

  return {
    period: { month, year },
    totalRevenue, totalCosts, grossProfit,
    managementFee, otherIncome, netProfit,
    tripCount,
    trucks: demoTrucks.filter(t => t.status === TruckStatus.ACTIVE).map((t, i) => ({
      plate: t.license_plate,
      revenue: Math.round((totalRevenue / 6) * (0.8 + i * 0.1)),
      costs: Math.round((totalCosts / 6) * (0.8 + i * 0.1)),
      profit: Math.round(((totalRevenue - totalCosts) / 6) * (0.8 + i * 0.1)),
      trips: 3 + (i % 3),
    })),
  };
}

// ─── Users ───────────────────────────────────────────────────────────────────

export const demoUsers = [
  { id: 1, username: 'giamdoc', email: 'giamdoc@nepocorp.vn', phone: null, role: Role.ADMIN, status: 'ACTIVE', createdAt: '2025-01-01T08:00:00Z' },
  { id: 2, username: 'ketoan', email: 'ketoan@nepocorp.vn', phone: null, role: Role.ACCOUNTANT, status: 'ACTIVE', createdAt: '2025-01-01T08:00:00Z' },
  { id: 3, username: 'laixe', email: 'laixe@nepocorp.vn', phone: null, role: Role.DRIVER, status: 'ACTIVE', createdAt: '2025-01-01T08:00:00Z' },
  { id: 4, username: 'quanly', email: 'quanly@nepocorp.vn', phone: '0909999999', role: Role.MANAGER, status: 'ACTIVE', createdAt: '2025-02-01T08:00:00Z' },
  { id: 5, username: 'laixe2', email: 'laixe2@nepocorp.vn', phone: '0908888888', role: Role.DRIVER, status: 'INACTIVE', createdAt: '2025-03-01T08:00:00Z' },
];

// ─── Driver-specific data ────────────────────────────────────────────────────

export const demoEarningsSummary = {
  baseSalary: '8000000',
  tripIncome: '4500000',
  penalties: '500000',
  netIncome: '12000000',
};

export const demoDriverPenalties = [
  { id: 1, amount: '200000', date: '2025-05-20', customReason: null, reasonText: 'Đi trễ' },
  { id: 2, amount: '300000', date: '2025-05-10', customReason: 'Lỗi vi phạm nội quy', reasonText: null },
];

export const demoDriverTrips = demoTrips.filter(t => t.driver_id === 1).map(t => ({
  id: t.id,
  departureDate: t.departure_date,
  status: t.status,
  revenue: t.revenue,
  driverSalary: t.driver_salary,
  routeName: t.route?.name ?? null,
  truckPlate: t.truck?.license_plate ?? null,
}));

export const demoDriverTripDetail = (tripId: number) => {
  const t = demoTrips.find(tr => tr.id === tripId);
  if (!t) return null;
  return {
    id: t.id, status: t.status, departureDate: t.departure_date,
    routeName: t.route?.name ?? null, truckPlate: t.truck?.license_plate ?? null,
    trailerPlate: t.trailer?.license_plate ?? null, trailerType: t.trailer?.type ?? null,
    customerName: t.customer?.name ?? null, cargoTypeName: t.cargoType?.name ?? null,
    fuelLiters: t.fuel_liters, fuelMode: t.fuel_mode,
    roadAllowance: t.total_road_allowance, driverSalary: t.driver_salary,
    revenue: t.revenue, totalCost: t.total_cost, grossProfit: t.gross_profit,
    legs: t.legs?.map(l => ({
      id: l.id, sequence: l.sequence, origin: l.origin, destination: l.destination,
      km: l.km, loading_type: l.loading_type,
    })) ?? [],
  };
};

// ─── Customer Statement ─────────────────────────────────────────────────────

function ts(hoursAgo: number, minutesAgo = 0): string {
  const d = new Date('2026-05-30T10:00:00Z');
  d.setHours(d.getHours() - hoursAgo, d.getMinutes() - minutesAgo, 0, 0);
  return d.toISOString();
}

export const demoAuditLogs = [
  { id: 1,  timestamp: ts(0, 12), userEmail: 'giamdoc@nepo.vn',  userName: 'Nguyễn Văn Giám', action: 'TRIP_DISPATCHED',           method: 'PUT',    message: 'Xuất phát chuyến xe #42 — HP → HN',                                     category: 'trip' },
  { id: 2,  timestamp: ts(0, 25), userEmail: 'ketoan@nepo.vn',   userName: 'Trần Thị Lan',    action: 'PAYMENT_RECEIVED',           method: 'POST',   message: 'Ghi nhận thanh toán 15.000.000₫ từ Công ty ABC',                        category: 'finance' },
  { id: 3,  timestamp: ts(0, 40), userEmail: 'vanhanh@nepo.vn',  userName: 'Phạm Đức Minh',   action: 'TRIP_CREATED',               method: 'POST',   message: 'Tạo lệnh vận chuyển mới — Khách: Công ty XYZ, Tuyến: HP → QN',          category: 'trip' },
  { id: 4,  timestamp: ts(0, 55), userEmail: 'admin@nepo.vn',    userName: 'Lê Quang Admin',   action: 'ENTITY_UPDATED',             method: 'PUT',    message: 'Cập nhật xe đầu kéo 29C-567.89 → trạng thái Bảo trì',                  category: 'config' },
  { id: 5,  timestamp: ts(1, 10), userEmail: 'giamdoc@nepo.vn',  userName: 'Nguyễn Văn Giám', action: 'TRIP_LOCKED',                method: 'PUT',    message: 'Khóa chuyến #38 — HP → NB, doanh thu 8.500.000₫',                      category: 'trip' },
  { id: 6,  timestamp: ts(1, 30), userEmail: 'ketoan@nepo.vn',   userName: 'Trần Thị Lan',    action: 'ADJUSTMENT_CREATED',         method: 'POST',   message: 'Tạo hóa đơn điều chỉnh +2.300.000₫ — Công ty DEF',                     category: 'finance' },
  { id: 7,  timestamp: ts(1, 45), userEmail: 'vanhanh@nepo.vn',  userName: 'Phạm Đức Minh',   action: 'TRIP_UPDATED_ACTUALS',       method: 'PUT',    message: 'Cập nhật số liệu thực tế chuyến #41 — KM thực: 186, dầu: 52L',         category: 'trip' },
  { id: 8,  timestamp: ts(2, 5),  userEmail: 'admin@nepo.vn',    userName: 'Lê Quang Admin',   action: 'ENTITY_CREATED',             method: 'POST',   message: 'Thêm tuyến đường mới: Hải Phòng → Thái Nguyên (214 km)',               category: 'config' },
  { id: 9,  timestamp: ts(2, 20), userEmail: 'giamdoc@nepo.vn',  userName: 'Nguyễn Văn Giám', action: 'PENALTY_CREATED',            method: 'POST',   message: 'Ghi kỷ luật tài xế Hoàng Nam — Vượt tốc độ, phạt 500.000₫',            category: 'penalty' },
  { id: 10, timestamp: ts(2, 35), userEmail: 'ketoan@nepo.vn',   userName: 'Trần Thị Lan',    action: 'TRIP_COMPLETED',             method: 'PUT',    message: 'Hoàn thành chuyến #39 — HP → HN, doanh thu 6.200.000₫',               category: 'trip' },
  { id: 11, timestamp: ts(2, 50), userEmail: 'vanhanh@nepo.vn',  userName: 'Phạm Đức Minh',   action: 'TRIP_UPDATED_PRE_DEPARTURE', method: 'PUT',    message: 'Cập nhật số liệu trước xuất phát chuyến #43 — thêm 3 legs',            category: 'trip' },
  { id: 12, timestamp: ts(3, 15), userEmail: 'admin@nepo.vn',    userName: 'Lê Quang Admin',   action: 'ENTITY_DELETED',             method: 'DELETE', message: 'Xóa loại hàng hóa "Cát đen" khỏi danh mục',                             category: 'config' },
  { id: 13, timestamp: ts(3, 30), userEmail: 'giamdoc@nepo.vn',  userName: 'Nguyễn Văn Giám', action: 'PAYMENT_RECEIVED',           method: 'POST',   message: 'Ghi nhận thanh toán 8.700.000₫ từ Công ty GHI',                         category: 'finance' },
  { id: 14, timestamp: ts(3, 45), userEmail: 'ketoan@nepo.vn',   userName: 'Trần Thị Lan',    action: 'TRIP_DISPATCHED',            method: 'PUT',    message: 'Xuất phát chuyến xe #44 — QN → HP',                                     category: 'trip' },
  { id: 15, timestamp: ts(4, 0),  userEmail: 'vanhanh@nepo.vn',  userName: 'Phạm Đức Minh',   action: 'PENALTY_CREATED',            method: 'POST',   message: 'Ghi kỷ luật tài xế Trần Nam — Không xuất trình hóa đơn dầu',            category: 'penalty' },
  { id: 16, timestamp: ts(5, 0),  userEmail: 'admin@nepo.vn',    userName: 'Lê Quang Admin',   action: 'CONFIG_UPDATED',             method: 'PUT',    message: 'Cập nhật đơn giá nhiên liệu 18.730 → 19.200 đ/lít',                    category: 'config' },
  { id: 17, timestamp: ts(6, 0),  userEmail: 'giamdoc@nepo.vn',  userName: 'Nguyễn Văn Giám', action: 'TRIP_CREATED',               method: 'POST',   message: 'Tạo lệnh vận chuyển mới — Khách: Cảng Xanh, Tuyến: HP → Mộc Châu',    category: 'trip' },
  { id: 18, timestamp: ts(7, 0),  userEmail: 'ketoan@nepo.vn',   userName: 'Trần Thị Lan',    action: 'TRIP_LOCKED',                method: 'PUT',    message: 'Khóa chuyến #35 — HP → Sơn La, doanh thu 12.500.000₫',                 category: 'trip' },
  { id: 19, timestamp: ts(8, 0),  userEmail: 'vanhanh@nepo.vn',  userName: 'Phạm Đức Minh',   action: 'ADJUSTMENT_CREATED',         method: 'POST',   message: 'Điều chỉnh giảm chuyến #32 — sai đơn giá, -800.000₫',                  category: 'finance' },
  { id: 20, timestamp: ts(9, 0),  userEmail: 'admin@nepo.vn',    userName: 'Lê Quang Admin',   action: 'LOGIN',                      method: 'POST',   message: 'Đăng nhập thành công từ IP 192.168.1.15',                               category: 'auth' },
];

export function demoCustomerStatement(customerId: number) {
  const customer = demoCustomers.find(c => c.id === customerId) ?? demoCustomers[0];
  const entries = demoLedgerEntries.filter(e => e.entity_type === 'CUSTOMER' && e.entity_id === customerId);
  return {
    customer: { id: customer.id, name: customer.name, contact_info: customer.contact_info },
    ledgerRows: entries,
    agingBuckets: [
      { range: '0-30 ngày', amount: 5300000 },
      { range: '31-60 ngày', amount: 3200000 },
      { range: '61-90 ngày', amount: 0 },
      { range: '>90 ngày', amount: 0 },
    ],
    totalOutstanding: 8500000,
  };
}
