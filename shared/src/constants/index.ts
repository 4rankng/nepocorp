export enum TripStatus {
  CREATED = 'CREATED',
  IN_TRANSIT = 'IN_TRANSIT',
  COMPLETED = 'COMPLETED',
  LOCKED = 'LOCKED',
  CANCELED = 'CANCELED',
}

export enum FuelMode {
  AUTO = 'AUTO',
  FLAT_RATE = 'FLAT_RATE',
}

export enum LoadingType {
  HANG = 'HANG',
  VO = 'VO',
}

export enum Role {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  ACCOUNTANT = 'ACCOUNTANT',
  DRIVER = 'DRIVER',
}

export enum TxnType {
  TRIP_REVENUE = 'TRIP_REVENUE',
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
  PENALTY = 'PENALTY',
  MANAGEMENT_FEE = 'MANAGEMENT_FEE',
  ADJUSTMENT = 'ADJUSTMENT',
  DRIVER_SALARY = 'DRIVER_SALARY',
}

export enum TrailerType {
  FT20 = '20FT',
  FT40 = '40FT',
}

export enum TruckStatus {
  ACTIVE = 'ACTIVE',
  MAINTENANCE = 'MAINTENANCE',
  INACTIVE = 'INACTIVE',
}

export enum DriverStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export enum TrailerStatus {
  ACTIVE = 'ACTIVE',
  MAINTENANCE = 'MAINTENANCE',
  INACTIVE = 'INACTIVE',
}

export enum CustomerStatus {
  ACTIVE = 'ACTIVE',
  LOCKED = 'LOCKED',
}

export const TRIP_STATUS_LABELS: Record<TripStatus, string> = {
  [TripStatus.CREATED]: 'Mới tạo',
  [TripStatus.IN_TRANSIT]: 'Đang chạy',
  [TripStatus.COMPLETED]: 'Hoàn thành',
  [TripStatus.LOCKED]: 'Đã chốt',
  [TripStatus.CANCELED]: 'Đã hủy',
};

export const ROLE_LABELS: Record<Role, string> = {
  [Role.ADMIN]: 'Quản trị',
  [Role.MANAGER]: 'Quản lý',
  [Role.ACCOUNTANT]: 'Kế toán',
  [Role.DRIVER]: 'Tài xế',
};

export const FUEL_MODE_LABELS: Record<FuelMode, string> = {
  [FuelMode.AUTO]: 'Tự động',
  [FuelMode.FLAT_RATE]: 'Khoán',
};

export const LOADING_TYPE_LABELS: Record<LoadingType, string> = {
  [LoadingType.HANG]: 'Hàng',
  [LoadingType.VO]: 'Vỏ',
};
