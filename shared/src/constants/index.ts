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
  FORWARDER = 'FORWARDER',
}

export enum TxnType {
  TRIP_REVENUE = 'TRIP_REVENUE',
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
  PENALTY = 'PENALTY',
  MANAGEMENT_FEE = 'MANAGEMENT_FEE',
  ADJUSTMENT = 'ADJUSTMENT',
  DRIVER_SALARY = 'DRIVER_SALARY',
  VENDOR_EXPENSE = 'VENDOR_EXPENSE',
  VENDOR_PAYMENT = 'VENDOR_PAYMENT',
  FORWARDER_ADVANCE = 'FORWARDER_ADVANCE',
  FORWARDER_SETTLEMENT = 'FORWARDER_SETTLEMENT',
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

export enum TrailerStatus {
  ACTIVE = 'ACTIVE',
  MAINTENANCE = 'MAINTENANCE',
  INACTIVE = 'INACTIVE',
}

export enum DriverStatus {
  ACTIVE = 'ACTIVE',
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
  [TripStatus.LOCKED]: 'Đã khóa',
  [TripStatus.CANCELED]: 'Đã hủy',
};

export const ROLE_LABELS: Record<Role, string> = {
  [Role.ADMIN]: 'Quản trị viên',
  [Role.MANAGER]: 'Quản lý',
  [Role.ACCOUNTANT]: 'Kế toán',
  [Role.DRIVER]: 'Tài xế',
  [Role.FORWARDER]: 'Giao nhận',
};

export const FUEL_MODE_LABELS: Record<FuelMode, string> = {
  [FuelMode.AUTO]: 'Tự động',
  [FuelMode.FLAT_RATE]: 'Khoán',
};

export const LOADING_TYPE_LABELS: Record<LoadingType, string> = {
  [LoadingType.HANG]: 'Hàng',
  [LoadingType.VO]: 'Vỏ',
};

export enum PenaltyStatus {
  ACTIVE = 'ACTIVE',
  CANCELED = 'CANCELED',
}

export const PENALTY_STATUS_LABELS: Record<PenaltyStatus, string> = {
  [PenaltyStatus.ACTIVE]: 'Hiệu lực',
  [PenaltyStatus.CANCELED]: 'Đã hủy',
};

/** Default seeds for forwarder_expense_types config table (code → Vietnamese name). */
export const FORWARDER_EXPENSE_TYPE_DEFAULTS: Record<string, string> = {
  LIFTING: 'Nâng hạ',
  CUSTOMS: 'Hải quan',
  WEIGHING: 'Cân xe',
  INSPECTION: 'Kiểm tra',
  OTHER: 'Khác',
};

export enum AdvanceRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum AdvanceSettlementStatus {
  PENDING = 'PENDING',
  CHECKED_BY_ACCOUNTANT = 'CHECKED_BY_ACCOUNTANT',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export const ADVANCE_REQUEST_STATUS_LABELS: Record<AdvanceRequestStatus, string> = {
  [AdvanceRequestStatus.PENDING]: 'Chờ duyệt',
  [AdvanceRequestStatus.APPROVED]: 'Đã duyệt',
  [AdvanceRequestStatus.REJECTED]: 'Từ chối',
};

export const ADVANCE_SETTLEMENT_STATUS_LABELS: Record<AdvanceSettlementStatus, string> = {
  [AdvanceSettlementStatus.PENDING]: 'Chờ xử lý',
  [AdvanceSettlementStatus.CHECKED_BY_ACCOUNTANT]: 'KT đã kiểm tra',
  [AdvanceSettlementStatus.APPROVED]: 'Đã duyệt',
  [AdvanceSettlementStatus.REJECTED]: 'Từ chối',
};

export const TRAILER_STATUS_LABELS: Record<TrailerStatus, string> = {
  [TrailerStatus.ACTIVE]: 'Hoạt động',
  [TrailerStatus.MAINTENANCE]: 'Bảo trì',
  [TrailerStatus.INACTIVE]: 'Ngưng hoạt động',
};

export const TRAILER_TYPE_LABELS: Record<TrailerType, string> = {
  [TrailerType.FT20]: '20FT',
  [TrailerType.FT40]: '40FT',
};

// ─── Notification ───────────────────────────────────────────────────────────
export enum NotificationType {
  TRIP_CREATED = 'TRIP_CREATED',
  TRIP_DISPATCHED = 'TRIP_DISPATCHED',
  TRIP_IN_TRANSIT = 'TRIP_IN_TRANSIT',
  TRIP_COMPLETED = 'TRIP_COMPLETED',
  TRIP_LOCKED = 'TRIP_LOCKED',
  TRIP_CANCELED = 'TRIP_CANCELED',
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
  PENALTY_CREATED = 'PENALTY_CREATED',
  PENALTY_CANCELED = 'PENALTY_CANCELED',
  OVERDUE_PAYMENT = 'OVERDUE_PAYMENT',
  SALARY_PERIOD_CLOSING = 'SALARY_PERIOD_CLOSING',
  SYSTEM_ANNOUNCEMENT = 'SYSTEM_ANNOUNCEMENT',
}

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  [NotificationType.TRIP_CREATED]: 'Chuyến mới',
  [NotificationType.TRIP_DISPATCHED]: 'Chuyến đã điều phối',
  [NotificationType.TRIP_IN_TRANSIT]: 'Chuyến đang chạy',
  [NotificationType.TRIP_COMPLETED]: 'Chuyến hoàn thành',
  [NotificationType.TRIP_LOCKED]: 'Chuyến đã khóa',
  [NotificationType.TRIP_CANCELED]: 'Chuyến đã hủy',
  [NotificationType.PAYMENT_RECEIVED]: 'Thanh toán nhận được',
  [NotificationType.PENALTY_CREATED]: 'Phạt mới',
  [NotificationType.PENALTY_CANCELED]: 'Hủy phạt',
  [NotificationType.OVERDUE_PAYMENT]: 'Thanh toán quá hạn',
  [NotificationType.SALARY_PERIOD_CLOSING]: 'Sắp chốt kỳ lương',
  [NotificationType.SYSTEM_ANNOUNCEMENT]: 'Thông báo hệ thống',
};

export * from './api-paths';
