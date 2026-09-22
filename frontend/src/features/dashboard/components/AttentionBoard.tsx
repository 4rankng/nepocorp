import React from 'react';
import { ChevronRight, ChevronUp } from 'lucide-react';
import type { DashboardDecisionItem } from '@tingting/shared';
import { StatusStrip } from '../../../components/shared/StatusStrip';
import { AssetIcon } from '../../../components/AssetIcon';
import { decisionIcon, severityLabel } from './dashboard-presenters';

const DECISION_STRIP_COLORS: Record<DashboardDecisionItem['severity'], string> = {
  critical: 'var(--wf-red)',
  warning: 'var(--wf-amber)',
  info: 'var(--wf-blue)',
  success: 'var(--wf-green-500)',
};

export interface AttentionBoardProps {
  orderedAttention: DashboardDecisionItem[];
  visibleAttention: DashboardDecisionItem[];
  showAllAttention: boolean;
  onToggleShowAll: () => void;
  onNavigate: (path: string) => void;
}

export function AttentionBoard({
  orderedAttention, visibleAttention, showAllAttention, onToggleShowAll, onNavigate,
}: AttentionBoardProps) {
  return (
    <section
      className={`d-card d-card-border bg-base-100 wf-card wf-att wf-att--wide wf-bento-full wf-priority-board${showAllAttention ? ' is-expanded' : ''}`}
      data-tour-id="dashboard-attention"
      aria-labelledby="dashboard-priority-title"
    >
        <div className="wf-card-h">
          <div>
            <h2 className="ttl" id="dashboard-priority-title">Việc cần xử lý</h2>
            <div className="sub">Ưu tiên theo mức độ ảnh hưởng · {orderedAttention.length} mục</div>
          </div>
        </div>
        <div className="body" id="dashboard-priority-list">
          {visibleAttention.map((item, i) => {
            const iconName = decisionIcon(item.kind);
            return (
            <React.Fragment key={item.id}>
              {i > 0 && <div className="wf-divider" />}
              <div className={`wf-arow wf-arow--${item.severity}`}>
                <StatusStrip color={DECISION_STRIP_COLORS[item.severity]} />
                <div className={`ic wf-ic-${item.severity}`}>
                  <AssetIcon name={iconName} size={18} />
                </div>
                <div className="tx">
                  <div className="t">
                    {item.title}
                    <span className={`d-badge d-badge-soft d-badge-sm wf-severity wf-severity--${item.severity}`}>
                      {severityLabel(item.severity)}
                    </span>
                  </div>
                  <div className="s">{item.subtitle}</div>
                </div>
                {item.route && item.actionLabel && (
                  <div className="go">
                    <button
                      className={`d-btn d-btn-sm wf-minibtn${item.severity === 'success' ? ' d-btn-success green' : ''}`}
                      onClick={() => onNavigate(item.route!)}
                    >
                      <span>{item.actionLabel}</span>
                      <ChevronRight className="wf-minibtn__icon" aria-hidden="true" />
                    </button>
                  </div>
                )}
              </div>
            </React.Fragment>
            );
          })}
          {orderedAttention.length > 4 && (
            <div className="wf-priority-more">
              <button
                type="button"
                className="d-btn d-btn-link d-btn-sm wf-link"
                aria-expanded={showAllAttention}
                aria-controls="dashboard-priority-list"
                onClick={onToggleShowAll}
              >
                {showAllAttention ? (
                  <>Thu gọn <ChevronUp aria-hidden="true" /></>
                ) : (
                  <>Xem tất cả {orderedAttention.length} mục <ChevronRight aria-hidden="true" /></>
                )}
              </button>
            </div>
          )}
        </div>
      </section>
  );
}
