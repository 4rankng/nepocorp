import React from 'react';
import { ArrowLeft, X } from 'lucide-react';

// ─── KPI Metric Card Component ──────────────────────────────────────────────

interface KPIProps {
  label: string;
  value: string | number;
  unit?: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  meta?: React.ReactNode;
  variant?: 'success' | 'warn' | 'danger' | 'accent' | 'default';
  onClick?: () => void;
}

export function KPI({ label, value, unit, icon: Icon, meta, variant = 'default', onClick }: KPIProps) {
  return (
    <div
      className={`kpi kpi--${variant}`}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <div className="kpi__top">
        <span className="kpi__label">{label}</span>
        {Icon && (
          <div className="kpi__icon">
            <Icon size={16} />
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

// ─── Page Header Component ──────────────────────────────────────────────────

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  onBack?: () => void;
}

export function PageHeader({ title, description, action, onBack }: PageHeaderProps) {
  return (
    <div
      className="page-header"
      style={{
        marginBottom: 24,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 16,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {onBack && (
          <button
            className="btn btn-ghost btn-icon btn-sm"
            onClick={onBack}
            aria-label="Quay lại"
          >
            <ArrowLeft size={16} />
          </button>
        )}
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 10, margin: 0, fontSize: 24, fontWeight: 700 }}>
            {title}
          </h1>
          {description && (
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--fg-3)' }}>
              {description}
            </p>
          )}
        </div>
      </div>
      {action && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {action}
        </div>
      )}
    </div>
  );
}

// ─── Standard Card Component ────────────────────────────────────────────────

interface CardProps {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
  noPadding?: boolean;
}

export function Card({ title, subtitle, action, children, style, className = '', noPadding = false }: CardProps) {
  return (
    <div className={`card-shell ${className}`} style={{ ...style }}>
      {(title || action) && (
        <div
          className="card-header"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid var(--border-2)',
            padding: '16px 20px',
          }}
        >
          <div>
            {title && <h3 style={{ fontSize: 14.5, fontWeight: 700, margin: 0 }}>{title}</h3>}
            {subtitle && (
              <p style={{ fontSize: 11.5, color: 'var(--fg-3)', margin: '4px 0 0' }}>
                {subtitle}
              </p>
            )}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div style={{ padding: noPadding ? 0 : '16px 20px' }}>
        {children}
      </div>
    </div>
  );
}

// ─── Badge Component ────────────────────────────────────────────────────────

interface BadgeProps {
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'outline' | 'neutral';
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant = 'neutral', children, className = '' }: BadgeProps) {
  const badgeClassMap = {
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

// ─── Form Field Group Component ─────────────────────────────────────────────

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
      <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--fg-2)' }}>{label}</label>
      {children}
      {error && (
        <span style={{ fontSize: 11, color: 'var(--danger)', marginTop: 2 }}>
          {error}
        </span>
      )}
      {helpText && !error && (
        <span className="field-help" style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: 2 }}>
          {helpText}
        </span>
      )}
    </div>
  );
}

// ─── Dialog / Modal Component ───────────────────────────────────────────────

interface ModalProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function Modal({ isOpen, title, onClose, children, footer }: ModalProps) {
  if (!isOpen) return null;
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.4)',
        backdropFilter: 'blur(4px)',
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
          background: 'var(--bg-2)',
          border: '1px solid var(--border-1)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-elevated)',
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
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-2)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{title}</h3>
          <button
            className="btn btn-ghost btn-icon btn-sm"
            onClick={onClose}
            aria-label="Đóng"
          >
            <X size={16} />
          </button>
        </div>
        <div style={{ padding: '20px', overflowY: 'auto', maxHeight: 'calc(100vh - 200px)' }}>
          {children}
        </div>
        {footer && (
          <div
            style={{
              padding: '12px 20px',
              borderTop: '1px solid var(--border-2)',
              background: 'var(--bg-1)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 10,
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
