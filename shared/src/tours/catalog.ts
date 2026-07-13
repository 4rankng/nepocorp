import { Role } from '../constants';
import type { Tour } from './schema';

/**
 * The curated tour catalog — single source for both the backend `tours.search`
 * tool and the frontend on-demand list / `TourController`. Add a tour by adding
 * a record here (and a `data-`-free stable `id` referenced by any spotlighted
 * element). The `satisfies Record<string, Tour>` check + the closed
 * `AgentRouteKey` enum on `AgentTutorialStep.directive.routeKey` give compile-
 * time safety; `catalog.test.ts` double-checks role + routeKey membership.
 */
export const TOUR_CATALOG = {
  'create-trip': {
    id: 'create-trip',
    version: 2,
    title: 'Tạo chuyến vận chuyển',
    summary: 'Tạo một lệnh vận chuyển mới: chọn khách + tuyến, nhập thông tin, rồi lưu.',
    description: 'Hướng dẫn tạo lệnh vận chuyển (chuyến đi) mới — chọn khách, tuyến, loại hàng rồi lưu.',
    aliases: ['tạo chuyến', 'tạo lệnh', 'lệnh vận chuyển', 'new trip', 'thêm chuyến', 'them chuyen'],
    roles: [Role.MANAGER, Role.ADMIN],
    steps: [
      {
        title: 'Mở form tạo chuyến',
        body: 'Mở trang Tạo lệnh vận chuyển. Hãy bắt đầu với khách hàng và tuyến đường ở phần Thông tin chuyến đi.',
        directive: {
          kind: 'navigate',
          routeKey: 'tripNew',
        },
      },
      {
        title: 'Chọn khách hàng',
        body: 'Chọn khách hàng (đơn vị) thuê chuyến. Khách phải có sẵn trong danh sách khách hàng.',
        example: 'VD: Công ty ABC',
        directive: { kind: 'scrollTo', targetId: 'customerId', durationMs: 3000 },
      },
      {
        title: 'Chọn tuyến & loại hàng',
        body: 'Chọn tuyến (lộ trình) và loại hàng. Hệ thống tự tính đơn giá theo bảng giá của tuyến.',
        directive: { kind: 'scrollTo', targetId: 'routeId', durationMs: 3000 },
      },
      {
        title: 'Lưu chuyến',
        body: 'Kiểm tra lại thông tin rồi bấm "Tạo chuyến". Chuyến sẽ ở trạng thái CREATED, sẵn sàng để điều vận khởi hành.',
        directive: { kind: 'scrollTo', targetId: 'trip-new-submit', durationMs: 3500 },
        // Phase 3 interaction step: this step auto-completes when the user
        // actually creates the trip (the `trip.created` product event fires at
        // the TripCreatePage success handler). The manual "Tôi đã làm xong"
        // button stays available as a fallback.
        completionEvent: 'trip.created',
      },
    ],
  },

  'lock-trip-and-payment': {
    id: 'lock-trip-and-payment',
    version: 1,
    title: 'Chốt chuyến & ghi nhận thanh toán',
    summary: 'Khóa sổ một chuyến đã hoàn thành, rồi ghi nhận tiền khách thanh toán vào công nợ.',
    description: 'Luồng chốt chuyến (khóa sổ) rồi ghi nhận thanh toán công nợ phải thu — đi qua 2 trang.',
    aliases: ['chốt chuyến', 'thu tiền', 'ghi nhận thanh toán', 'công nợ', 'khóa sổ', 'chot chuyen'],
    roles: [Role.MANAGER, Role.ADMIN, Role.ACCOUNTANT],
    steps: [
      {
        title: 'Mở danh sách chuyến',
        body: 'Vào trang Lệnh vận chuyển. Tìm một chuyến ở trạng thái COMPLETED (đã nhập số liệu thực tế) để chốt.',
        directive: { kind: 'navigate', routeKey: 'trips' },
      },
      {
        title: 'Chốt chuyến',
        body: 'Mở chi tiết chuyến COMPLETED đó, kiểm tra doanh thu/chi phí, rồi bấm "Chốt chuyến" để khóa sổ. Sau khi chốt, số liệu chuyến không thay đổi nữa.',
      },
      {
        title: 'Mở công nợ phải thu',
        body: 'Vào trang Công nợ phải thu — nơi ghi nhận tiền khách hàng thanh toán.',
        directive: { kind: 'navigate', routeKey: 'debt' },
      },
      {
        title: 'Ghi nhận thanh toán',
        body: 'Chọn khách hàng cần thu, bấm "Ghi nhận thanh toán", nhập số tiền và phân bổ vào các chuyến. Số tiền sẽ trừ vào công nợ còn nợ của khách.',
      },
    ],
  },

  // Migrated verbatim from the old buildScriptedTutorialResponse (orchestrator.ts).
  // Same 6 steps, same configFuel targetIds (already stamped on FuelConfigPage).
  'fuel-config': {
    id: 'fuel-config',
    version: 1,
    title: 'Nhập định mức nhiên liệu',
    summary: 'Cập nhật định mức dầu dùng cho tính chi phí nhiên liệu theo chuyến.',
    description: 'Hướng dẫn nhập định mức nhiên liệu (có tải, xe không, đơn giá dầu) trên trang cấu hình.',
    aliases: ['định mức dầu', 'định mức nhiên liệu', 'fuel config', 'nhiên liệu', 'dầu', 'dinh muc dau'],
    roles: [Role.MANAGER, Role.ADMIN, Role.ACCOUNTANT],
    steps: [
      {
        title: 'Mở đúng trang cấu hình',
        body: 'Vào trang Định mức nhiên liệu trong nhóm Cấu hình. Đây là nơi lưu định mức có tải, xe không và đơn giá dầu hiện hành.',
        directive: {
          kind: 'navigate',
          routeKey: 'configFuel',
          highlight: { targetId: 'fuel-loaded-norm-field', durationMs: 3500 },
        },
      },
      {
        title: 'Nhập định mức có tải',
        body: 'Điền số lít/100km khi xe chạy có hàng. Hệ thống dùng số này cho các chặng có tải.',
        example: 'VD: 35',
        directive: { kind: 'scrollTo', targetId: 'fuel-loaded-norm-field', durationMs: 3000 },
      },
      {
        title: 'Nhập định mức xe không',
        body: 'Điền số lít/100km khi xe chạy rỗng hoặc quay đầu không hàng.',
        example: 'VD: 22',
        directive: { kind: 'scrollTo', targetId: 'fuel-empty-norm-field', durationMs: 3000 },
      },
      {
        title: 'Thêm mức bổ sung nếu cần',
        body: 'Dùng cho phần dầu cộng thêm mặc định mỗi chuyến, ví dụ chạy nội cảng hoặc hao hụt cố định.',
        example: 'VD: 3 lít',
        directive: { kind: 'scrollTo', targetId: 'fuel-supplement-field', durationMs: 3000 },
      },
      {
        title: 'Cập nhật đơn giá dầu',
        body: 'Nhập đơn giá hiện hành theo đồng/lít. Giá này sẽ được chụp lại khi tính chi phí nhiên liệu cho chuyến.',
        example: 'VD: 23000',
        directive: { kind: 'scrollTo', targetId: 'fuel-unit-price-field', durationMs: 3000 },
      },
      {
        title: 'Lưu cấu hình',
        body: 'Kiểm tra các số đã nhập rồi bấm Lưu cấu hình. Sau khi lưu, định mức mới áp dụng cho các chuyến tính sau đó.',
        directive: { kind: 'scrollTo', targetId: 'fuel-save-config-button', durationMs: 3500 },
      },
    ],
  },
} satisfies Record<string, Tour>;

export type TourId = keyof typeof TOUR_CATALOG;

/** Stable id tuple (for iteration / membership checks). `Object.keys` is typed
 *  `string[]` in TS, so the cast is the known escape hatch. */
export const TOUR_IDS = Object.keys(TOUR_CATALOG) as TourId[];

/** Tours visible to a given role (role-scoped for both tours.search + the list). */
export function toursForRole(role: Role): readonly Tour[] {
  return TOUR_IDS.map((id) => TOUR_CATALOG[id]).filter((t) => {
    // `satisfies` preserves each tour's `roles` as a literal tuple of specific
    // enum members, so widen to Role[] before .includes (mirrors ui.ts:21-22).
    const roles: readonly Role[] = t.roles;
    return roles.includes(role);
  });
}

/** Lookup by id (returns undefined for an unknown id — caller validates). */
export function getTour(id: string): Tour | undefined {
  return TOUR_CATALOG[id as TourId];
}
