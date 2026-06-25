/**
 * AssetIcon — central registry + render component for the project's branded
 * icon set shipped in /public/assets/icons.
 *
 * Every icon lives at `/assets/icons/<slug>.png` (served from
 * `frontend/public/assets/icons/`). All 24 icons in that folder are catalogued
 * here so we can render them anywhere in the UI without having to remember
 * file names.
 *
 * Each entry also carries:
 *   - `label`  : Vietnamese human-readable label
 *   - `group`  : semantic group for documentation / future grouping
 *
 * Use the component with either:
 *   <AssetIcon name="overview" />
 *   <AssetIcon slug="01-overview-tong-quan" />
 */

import React from 'react';

export type AssetIconName =
  | 'overview'
  | 'dispatch'
  | 'trip-log'
  | 'truck'
  | 'driver'
  | 'customer'
  | 'supplier'
  | 'warehouse'
  | 'cargo'
  | 'route'
  | 'location'
  | 'schedule'
  | 'fuel'
  | 'expense'
  | 'receivables'
  | 'payroll'
  | 'attendance'
  | 'analytics'
  | 'alert'
  | 'document'
  | 'notification'
  | 'settings'
  | 'users-hr'
  | 'checklist';

export interface AssetIconEntry {
  /** Short semantic name used in <AssetIcon name=...>. */
  name: AssetIconName;
  /** Filename (without path) under /assets/icons/. */
  slug: string;
  /** Vietnamese label for documentation / accessibility. */
  label: string;
  /** Semantic group. */
  group: 'operations' | 'fleet' | 'people' | 'cargo' | 'place' | 'money' | 'system' | 'reporting';
}

export const ASSET_ICONS: Record<AssetIconName, AssetIconEntry> = {
  overview:     { name: 'overview',     slug: '01-overview-tong-quan',                              label: 'Tổng quan',            group: 'reporting' },
  dispatch:     { name: 'dispatch',     slug: '02-dispatch-dieu-phoi',                               label: 'Điều phối / Phân xe',  group: 'operations' },
  'trip-log':   { name: 'trip-log',     slug: '03-trip-log-so-chuyen-chuyen-xe',                    label: 'Sổ chuyến đi',         group: 'operations' },
  truck:        { name: 'truck',        slug: '04-truck-xe-tai',                                     label: 'Đầu kéo / Xe tải',     group: 'fleet' },
  driver:       { name: 'driver',       slug: '05-driver-tai-xe',                                    label: 'Lái xe / Tài xế',      group: 'people' },
  customer:     { name: 'customer',     slug: '06-customer-khach-hang',                              label: 'Khách hàng',           group: 'people' },
  supplier:     { name: 'supplier',     slug: '07-supplier-nha-cung-cap',                            label: 'Nhà cung cấp',         group: 'people' },
  warehouse:    { name: 'warehouse',    slug: '08-warehouse-kho-hang',                               label: 'Kho hàng',             group: 'place' },
  cargo:        { name: 'cargo',        slug: '09-cargo-hang-hoa',                                   label: 'Hàng hóa',             group: 'cargo' },
  route:        { name: 'route',        slug: '10-route-tuyen-duong',                                label: 'Tuyến đường',          group: 'place' },
  location:     { name: 'location',     slug: '11-location-gps-vi-tri',                              label: 'Vị trí / GPS',         group: 'place' },
  schedule:     { name: 'schedule',     slug: '12-schedule-lich-trinh',                              label: 'Lịch trình',           group: 'operations' },
  fuel:         { name: 'fuel',         slug: '13-fuel-nhien-lieu',                                  label: 'Nhiên liệu',           group: 'fleet' },
  expense:      { name: 'expense',      slug: '14-expense-chi-phi',                                  label: 'Chi phí',              group: 'money' },
  receivables:  { name: 'receivables',  slug: '15-accounts-receivable-cong-no-phai-thu',            label: 'Công nợ phải thu',     group: 'money' },
  payroll:      { name: 'payroll',      slug: '16-payroll-luong-tien-luong',                         label: 'Lương / Tiền lương',   group: 'money' },
  attendance:   { name: 'attendance',   slug: '17-attendance-cham-cong',                             label: 'Chấm công',            group: 'people' },
  analytics:    { name: 'analytics',    slug: '18-analytics-bao-cao-phan-tich',                      label: 'Phân tích / Báo cáo',  group: 'reporting' },
  alert:        { name: 'alert',        slug: '19-alert-canh-bao',                                   label: 'Cảnh báo',             group: 'system' },
  document:     { name: 'document',     slug: '20-document-tai-lieu',                                label: 'Tài liệu',             group: 'system' },
  notification: { name: 'notification', slug: '21-notification-thong-bao',                           label: 'Thông báo',            group: 'system' },
  settings:     { name: 'settings',     slug: '22-settings-system-cai-dat-he-thong',                 label: 'Cài đặt hệ thống',     group: 'system' },
  'users-hr':   { name: 'users-hr',     slug: '23-users-hr-nguoi-dung-nhan-su',                      label: 'Người dùng / Nhân sự', group: 'people' },
  checklist:    { name: 'checklist',    slug: '24-checklist-approval-danh-sach-kiem-tra-phe-duyet',  label: 'Danh sách kiểm tra / Phê duyệt', group: 'operations' },
};

/** Every icon name, exported for iteration / verification. */
export const ASSET_ICON_NAMES: AssetIconName[] = Object.keys(ASSET_ICONS) as AssetIconName[];

const SLUG_TO_NAME: Record<string, AssetIconName> = Object.values(ASSET_ICONS).reduce(
  (acc, entry) => {
    acc[entry.slug] = entry.name;
    return acc;
  },
  {} as Record<string, AssetIconName>,
);

export interface AssetIconProps {
  /** Use either `name` (preferred) or `slug` (the raw filename). */
  name?: AssetIconName;
  slug?: string;
  /** Pixel size for width/height. Defaults to 24. */
  size?: number;
  /** Width override. Defaults to `size`. */
  width?: number | string;
  /** Height override. Defaults to `size`. */
  height?: number | string;
  /** Accessible label. When omitted, the icon is hidden from assistive tech. */
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
  /** Optional aria-hidden override; defaults to `true` when `alt` is omitted. */
  'aria-hidden'?: boolean;
}

/**
 * Build the public URL for an icon slug.
 *
 * Files in `frontend/public/assets/icons/` are stored as `.png`. The slug
 * stored on each `ASSET_ICONS` entry is the filename without extension, so
 * we append `.png` here. Without it, Vite serves the SPA `index.html`
 * fallback for unknown paths and the `<img>` element renders the broken
 * placeholder rectangle.
 */
export function assetIconUrl(slug: string): string {
  return `/assets/icons/${slug}.png`;
}

/**
 * Renders one of the project's branded icon assets. Falls back to a hidden
 * placeholder if the slug is unknown, so a typo never throws.
 */
export function AssetIcon({
  name,
  slug,
  size = 24,
  width,
  height,
  alt,
  className,
  style,
  'aria-hidden': ariaHidden,
}: AssetIconProps) {
  let entry: AssetIconEntry | undefined;
  if (name) {
    entry = ASSET_ICONS[name];
  } else if (slug) {
    const fromSlug = SLUG_TO_NAME[slug];
    if (fromSlug) entry = ASSET_ICONS[fromSlug];
  }

  if (!entry) {
    if (import.meta.env.DEV) {
      console.warn(`[AssetIcon] Unknown icon ${name ?? slug ?? '(none)'}`);
    }
    return null;
  }

  const ariaProps =
    alt != null
      ? { role: 'img' as const, 'aria-label': alt }
      : { 'aria-hidden': ariaHidden ?? true };

  return (
    <img
      src={assetIconUrl(entry.slug)}
      alt={alt ?? ''}
      {...ariaProps}
      width={width ?? size}
      height={height ?? size}
      className={className}
      style={{ display: 'inline-block', objectFit: 'contain', ...style }}
      draggable={false}
    />
  );
}

export default AssetIcon;