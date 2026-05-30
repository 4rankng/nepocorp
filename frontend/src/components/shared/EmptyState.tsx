import React from 'react';
import { Inbox } from 'lucide-react';
import { Btn } from '../UI';
import './EmptyState.css';

interface EmptyStateProps {
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  className?: string;
}

export function EmptyState({ icon: Icon = Inbox, title, description, action, className = '' }: EmptyStateProps) {
  return (
    <div className={`empty-state ${className}`}>
      <div className="empty-state__icon"><Icon size={24} /></div>
      <div className="empty-state__title">{title}</div>
      {description && <div className="empty-state__desc">{description}</div>}
      {action && (
        <div className="empty-state__action">
          <Btn variant="secondary" onClick={action.onClick}>{action.label}</Btn>
        </div>
      )}
    </div>
  );
}
