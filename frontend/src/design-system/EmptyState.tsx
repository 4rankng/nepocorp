import type { ReactNode } from 'react';
import { resolveEmptyIllustration } from '../lib/emptyIllustrations';
import './EmptyState.css';

export interface EmptyStateProps {
  title: string;
  description?: ReactNode;
  illustration?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ title, description, illustration, action, className }: EmptyStateProps) {
  return (
    <div className={`ds-empty-state ${className ?? ''}`}>
      {illustration && (
        <img
          src={resolveEmptyIllustration(illustration)}
          alt=""
          aria-hidden="true"
          className="ds-empty-state__illustration"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
        />
      )}
      <h3 className="ds-empty-state__title">{title}</h3>
      {description && <p className="ds-empty-state__description">{description}</p>}
      {action && <div className="ds-empty-state__action">{action}</div>}
    </div>
  );
}
