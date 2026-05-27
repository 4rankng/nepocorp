import React from 'react';
import { Plus } from 'lucide-react';

interface CardSectionProps {
  number: number;
  title: string;
  subtitle?: string;
  badge?: 'required' | 'optional';
  action?: { label: string; icon?: React.ReactNode; onClick: () => void };
  children: React.ReactNode;
}

export function CardSection({ number, title, subtitle, badge, action, children }: CardSectionProps) {
  return (
    <section className="tc-card">
      <div className="tc-card-head">
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
        {action && (
          <button className="tc-card-action" onClick={action.onClick} type="button">
            {action.icon ?? <Plus size={14} />}
            {action.label}
          </button>
        )}
      </div>
      <div className="tc-card-body">{children}</div>
    </section>
  );
}
