import React, { useState, useId } from 'react';
import { ChevronDown } from 'lucide-react';

interface CardSectionProps {
  number: number;
  title: string;
  subtitle?: string;
  badge?: 'required' | 'optional';
  /** Allow the section to collapse/expand. When true the head row becomes a button. */
  collapsible?: boolean;
  /** Initial state when `collapsible` is true. Defaults to expanded. */
  defaultCollapsed?: boolean;
  children: React.ReactNode;
}

export function CardSection({
  number,
  title,
  subtitle,
  badge,
  collapsible = false,
  defaultCollapsed = false,
  children,
}: CardSectionProps) {
  const [collapsed, setCollapsed] = useState(collapsible && defaultCollapsed);
  const bodyId = useId();

  // Head content is shared between the static <div> path (non-collapsible) and
  // the <button> path (collapsible) — keeping the inner layout identical avoids
  // visual drift between the two modes.
  const headContent = (
    <>
      <span className="tc-card-num">{number}</span>
      <div className="tc-card-text">
        <div className="tc-card-title">{title}</div>
        {subtitle && <div className="tc-card-sub">{subtitle}</div>}
      </div>
      {badge && (
        <span className={badge === 'required' ? 'tc-badge-required' : 'tc-badge-optional'}>
          {badge === 'required' ? 'Bắt buộc' : 'Tùy chọn'}
        </span>
      )}
      {collapsible && (
        <ChevronDown
          size={18}
          className={`tc-card-chev${collapsed ? '' : ' is-open'}`}
          aria-hidden
        />
      )}
    </>
  );

  return (
    <section className={`tc-card${collapsible ? ' is-collapsible' : ''}${collapsed ? ' is-collapsed' : ''}`}>
      {collapsible ? (
        <button
          type="button"
          className="tc-card-head tc-card-head-btn"
          onClick={() => setCollapsed((v) => !v)}
          aria-expanded={!collapsed}
          aria-controls={bodyId}
          style={{ cursor: 'pointer' }}
        >
          {headContent}
        </button>
      ) : (
        <div className="tc-card-head">{headContent}</div>
      )}
      {!collapsed && (
        <div id={bodyId} className="tc-card-body">
          {children}
        </div>
      )}
    </section>
  );
}
