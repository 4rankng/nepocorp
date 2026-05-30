import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, ArrowLeft, HelpCircle, X } from 'lucide-react';

/* ─── Global confirm shortcuts ──────────────────────────────────────────────
 * Canonical keyboard pattern for any dialog/modal/drawer that asks the user
 * to confirm or cancel something:
 *   - Enter  → triggers the primary/confirm action (if provided)
 *   - Escape → triggers the cancel/close action
 *
 * Used by ConfirmDialog, Modal, Drawer below. Also exported so any one-off
 * custom dialog elsewhere in the app can opt-in by calling this hook.
 *
 * Listener is only attached while `isOpen` is true. Enter is suppressed when
 * focus is inside a <textarea> or contenteditable element so multi-line
 * editing still works naturally.
 * -------------------------------------------------------------------------- */
export function useConfirmShortcuts(opts: {
  isOpen: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
}) {
  const { isOpen, onConfirm, onCancel } = opts;
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onCancel) {
        e.preventDefault();
        onCancel();
        return;
      }
      if (e.key === 'Enter' && onConfirm) {
        // Don't hijack Enter inside multi-line editors or when Shift/IME compose.
        const target = e.target as HTMLElement | null;
        if (e.shiftKey || e.isComposing) return;
        if (target) {
          const tag = target.tagName;
          if (tag === 'TEXTAREA') return;
          if (target.isContentEditable) return;
          // Don't double-trigger when focus is on a <button> — let the button's
          // native click handler run instead.
          if (tag === 'BUTTON') return;
        }
        e.preventDefault();
        onConfirm();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onConfirm, onCancel]);
}

/* ─── KPI Metric Card ───────────────────────────────────────────────────── */

interface KPIProps {
  label: string;
  value: string | number;
  unit?: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  meta?: React.ReactNode;
  variant?: 'success' | 'warn' | 'danger' | 'accent' | 'info' | 'default';
  onClick?: () => void;
}

export function KPI({ label, value, unit, icon: Icon, meta, variant = 'default', onClick }: KPIProps) {
  const variantClass = variant === 'default' ? '' : `kpi--${variant}`;
  return (
    <div
      className={`kpi ${variantClass} ${onClick ? 'kpi--clickable' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="kpi__top">
        <span className="kpi__label">{label}</span>
        {Icon && (
          <div className="kpi__icon">
            <Icon size={18} />
          </div>
        )}
      </div>
      <div className="kpi__value">
        {value}
        {unit && <span className="kpi__value-unit">{unit}</span>}
      </div>
      {meta && <div className="kpi__meta">{meta}</div>}
    </div>
  );
}

/* ─── Page Header ───────────────────────────────────────────────────────── */

interface PageHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  onBack?: () => void;
}

export function PageHeader({ title, description, action, onBack }: PageHeaderProps) {
  return (
    <div className="page-header">
      <div className="page-header-main" style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        {onBack && (
          <button
            className="btn btn--ghost btn--icon btn--sm"
            onClick={onBack}
            aria-label="Quay lại"
            style={{ marginTop: 4 }}
          >
            <ArrowLeft size={16} />
          </button>
        )}
        <div style={{ minWidth: 0 }}>
          <h1 className="page-title">{title}</h1>
          {description && <p className="page-subtitle">{description}</p>}
        </div>
      </div>
      {action && <div className="page-actions">{action}</div>}
    </div>
  );
}

/* ─── Panel (wireframe canonical) ───────────────────────────────────────── */

interface PanelProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  flush?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function Panel({ title, subtitle, action, children, flush, className = '', style }: PanelProps) {
  return (
    <div className={`panel ${className}`} style={style}>
      {(title || action || subtitle) && (
        <div className="panel__head">
          <div style={{ minWidth: 0 }}>
            {title && <h3 className="panel__title">{title}</h3>}
            {subtitle && <p className="panel__subtitle">{subtitle}</p>}
          </div>
          {action && <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>{action}</div>}
        </div>
      )}
      <div className={`panel__body${flush ? ' panel__body--flush' : ''}`}>{children}</div>
    </div>
  );
}

/* ─── Card (alias for Panel — backward compat) ──────────────────────────── */

interface CardProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
  noPadding?: boolean;
}

export function Card({ title, subtitle, action, children, style, className = '', noPadding = false }: CardProps) {
  return (
    <Panel
      title={title}
      subtitle={subtitle}
      action={action}
      flush={noPadding}
      className={className}
      style={style}
    >
      {children}
    </Panel>
  );
}

/* ─── Button (wireframe variants) ───────────────────────────────────────── */

interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

export function Btn({
  variant = 'secondary',
  size = 'md',
  icon,
  children,
  className = '',
  ...rest
}: BtnProps) {
  const sizeClass = size === 'sm' ? ' btn--sm' : '';
  const iconOnly = !children && icon ? ' btn--icon' : '';
  return (
    <button
      className={`btn btn--${variant}${sizeClass}${iconOnly} ${className}`}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}

/* ─── Toolbar (table filters wrapper) ───────────────────────────────────── */

interface ToolbarProps {
  children: React.ReactNode;
  className?: string;
}

export function Toolbar({ children, className = '' }: ToolbarProps) {
  return <div className={`toolbar ${className}`}>{children}</div>;
}

/* ─── Filter pill ───────────────────────────────────────────────────────── */

interface FilterPillProps {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  icon?: React.ReactNode;
  count?: number;
}

export function FilterPill({ active, onClick, children, icon, count }: FilterPillProps) {
  return (
    <button
      type="button"
      className={`filter-pill${active ? ' is-active' : ''}`}
      onClick={onClick}
    >
      {icon}
      <span>{children}</span>
      {count !== undefined && <span className="filter-pill__count">{count}</span>}
    </button>
  );
}

/* ─── Status Pill ───────────────────────────────────────────────────────── */

export type PillVariant = 'success' | 'warn' | 'danger' | 'info' | 'neutral';

interface StatusPillProps {
  variant: PillVariant;
  children: React.ReactNode;
  dot?: boolean;
}

export function StatusPill({ variant, children, dot = true }: StatusPillProps) {
  return (
    <span className={`pill pill--${variant}`}>
      {dot && <span className="dot" />}
      {children}
    </span>
  );
}

/* ─── Plate Tag ─────────────────────────────────────────────────────────── */

interface PlateTagProps {
  plate: string;
  className?: string;
}

export function PlateTag({ plate, className = '' }: PlateTagProps) {
  return <span className={`plate ${className}`}>{plate}</span>;
}

/* ─── Badge (legacy) ────────────────────────────────────────────────────── */

interface BadgeProps {
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'outline' | 'neutral';
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant = 'neutral', children, className = '' }: BadgeProps) {
  const badgeClassMap: Record<string, string> = {
    success: 'badge-success',
    warning: 'badge-warning',
    danger: 'badge-danger',
    info: 'badge-info',
    outline: 'badge-outline',
    neutral: 'badge-neutral',
  };
  return (
    <span className={`badge ${badgeClassMap[variant] || 'badge-neutral'} ${className}`}>
      {children}
    </span>
  );
}

/* ─── Form group ────────────────────────────────────────────────────────── */

interface FormGroupProps {
  label: string;
  helpText?: string;
  error?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export function FormGroup({ label, helpText, error, children, style }: FormGroupProps) {
  return (
    <div className="field" style={{ display: 'flex', flexDirection: 'column', gap: 6, ...style }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-2)' }}>{label}</label>
      {children}
      {error && (
        <span style={{ fontSize: 11, color: 'var(--danger)', marginTop: 2 }}>{error}</span>
      )}
      {helpText && !error && (
        <span className="field-help" style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>
          {helpText}
        </span>
      )}
    </div>
  );
}

/* ─── Modal ─────────────────────────────────────────────────────────────── */

interface ModalProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /**
   * Optional primary action. When provided, pressing Enter while the modal is
   * open triggers it (e.g. "Save", "Confirm"). ESC always closes the modal.
   */
  onConfirm?: () => void;
}

export function Modal({ isOpen, title, onClose, children, footer, onConfirm }: ModalProps) {
  useConfirmShortcuts({ isOpen, onConfirm, onCancel: onClose });
  if (!isOpen) return null;
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(10,10,10,0.4)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff',
          border: '1px solid var(--line)',
          borderRadius: 18,
          boxShadow: 'var(--sh-lg)',
          width: '100%',
          maxWidth: 540,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: '18px 22px',
            borderBottom: '1px solid var(--line)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em' }}>
            {title}
          </h3>
          <button
            className="btn btn--ghost btn--icon btn--sm"
            onClick={onClose}
            aria-label="Đóng"
          >
            <X size={16} />
          </button>
        </div>
        <div style={{ padding: '20px 22px', overflowY: 'auto', maxHeight: 'calc(100vh - 200px)' }}>
          {children}
        </div>
        {footer && (
          <div
            style={{
              padding: '14px 22px',
              borderTop: '1px solid var(--line)',
              background: '#fff',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 8,
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Drawer ────────────────────────────────────────────────────────────── */

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /**
   * Optional primary action. When provided, pressing Enter while the drawer
   * is open triggers it. ESC always closes the drawer.
   */
  onConfirm?: () => void;
}

export function Drawer({ isOpen, onClose, title, subtitle, children, footer, onConfirm }: DrawerProps) {
  useConfirmShortcuts({ isOpen, onConfirm, onCancel: onClose });

  return createPortal(
    <>
      <div
        className={`drawer-overlay${isOpen ? ' is-open' : ''}`}
        onClick={onClose}
        aria-hidden={!isOpen}
      />
      <aside
        className={`drawer${isOpen ? ' is-open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-hidden={!isOpen}
      >
        <header className="drawer__head">
          <div style={{ minWidth: 0 }}>
            <h2 className="drawer__title">{title}</h2>
            {subtitle && <p className="drawer__subtitle">{subtitle}</p>}
          </div>
          <button
            className="drawer__close"
            onClick={onClose}
            aria-label="Đóng"
            type="button"
          >
            <X size={18} />
          </button>
        </header>
        <div className="drawer__body">{children}</div>
        {footer && <div className="drawer__foot">{footer}</div>}
      </aside>
    </>,
    document.body,
  );
}

/* ─── DataTable ─────────────────────────────────────────────────────────── */

export interface Column<T> {
  key: string;
  label: string;
  numeric?: boolean;
  width?: string | number;
  render?: (row: T) => React.ReactNode;
}

interface DataTableProps<T extends { id?: number | string }> {
  columns: Column<T>[];
  rows: T[];
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  loading?: boolean;
  className?: string;
  standalone?: boolean; // if true, full rounded corners (no toolbar above)
}

export function DataTable<T extends { id?: number | string }>({
  columns,
  rows,
  onRowClick,
  emptyMessage = 'Không có dữ liệu',
  loading,
  className = '',
  standalone = false,
}: DataTableProps<T>) {
  return (
    <div className={`table-wrap${standalone ? ' table-wrap--standalone' : ''} ${className}`}>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={col.numeric ? 'num' : ''}
                  style={{ width: col.width }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} style={{ textAlign: 'center', padding: '48px 12px', color: 'var(--ink-3)' }}>
                  Đang tải…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} style={{ textAlign: 'center', padding: '48px 12px', color: 'var(--ink-3)' }}>
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => (
                <tr
                  key={row.id ?? idx}
                  className={onRowClick ? 'is-clickable' : ''}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={col.numeric ? 'num' : ''}>
                      {col.render ? col.render(row) : (row as any)[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── ConfirmDialog ──────────────────────────────────────────────────────── */

interface ConfirmDialogProps {
  isOpen: boolean;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary' | 'warning';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  message,
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Hủy',
  variant = 'primary',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  // Enter → confirm, Escape → cancel (global pattern, see useConfirmShortcuts).
  useConfirmShortcuts({ isOpen, onConfirm, onCancel });

  if (!isOpen) return null;

  const Icon = variant === 'danger' || variant === 'warning' ? AlertTriangle : HelpCircle;
  const iconColor = variant === 'danger' ? 'var(--danger)' : variant === 'warning' ? 'var(--warning)' : 'var(--accent)';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(10,10,10,0.45)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
        padding: 16,
      }}
      onClick={onCancel}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          borderRadius: 16,
          boxShadow: 'var(--sh-lg)',
          width: '100%',
          maxWidth: 400,
          padding: '28px 28px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <div style={{
            flexShrink: 0,
            width: 40,
            height: 40,
            borderRadius: 10,
            background: variant === 'danger' ? 'var(--danger-soft, #FEF2F2)' : 'var(--accent-soft)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Icon size={20} color={iconColor} />
          </div>
          <p style={{
            margin: 0,
            fontSize: 14,
            lineHeight: 1.55,
            color: 'var(--ink)',
            fontWeight: 500,
            paddingTop: 9,
          }}>
            {message}
          </p>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="btn btn--secondary btn--sm" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            className={`btn btn--${variant === 'danger' ? 'danger' : 'primary'} btn--sm`}
            onClick={onConfirm}
            autoFocus
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── useConfirm hook ────────────────────────────────────────────────────── */

interface ConfirmOptions {
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary' | 'warning';
}

interface ConfirmState extends ConfirmOptions {
  message: string;
  resolve: (value: boolean) => void;
}

export function useConfirm() {
  const [state, setState] = useState<ConfirmState | null>(null);
  const resolveRef = useRef<((v: boolean) => void) | null>(null);

  const confirm = (message: string, options?: ConfirmOptions): Promise<boolean> =>
    new Promise((resolve) => {
      resolveRef.current = resolve;
      setState({ message, resolve, ...options });
    });

  const handleConfirm = () => {
    state?.resolve(true);
    setState(null);
  };

  const handleCancel = () => {
    state?.resolve(false);
    setState(null);
  };

  const dialog = state ? (
    <ConfirmDialog
      isOpen
      message={state.message}
      confirmLabel={state.confirmLabel}
      cancelLabel={state.cancelLabel}
      variant={state.variant}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  ) : null;

  return { confirm, dialog };
}
