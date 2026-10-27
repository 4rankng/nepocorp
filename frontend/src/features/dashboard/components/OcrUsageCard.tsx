import { AlertTriangle, ScanLine } from 'lucide-react';
import { SkeletonLine } from '../../../components/shared/Skeleton';
import { formatCurrency, formatNumber } from '../../../lib/format';
import type { OcrUsageStatus } from '@tingting/shared';

/**
 * Dashboard tile for AI OCR usage (NEPO-27): requests used this calendar month
 * against the configurable allowance, what's left, and — once the allowance is
 * exceeded — the overage count costed at the configured per-call price.
 *
 * Layout mirrors FleetStatusCard (wf-bento-third, wf-card-h + wf-fstats idiom)
 * so the tile drops into the dashboard's row-of-thirds without new CSS.
 */
interface OcrUsageCardProps {
  status: OcrUsageStatus | null;
  loading: boolean;
  isError: boolean;
  onRetry: () => void;
  /** 'T10' style label from the dashboard's month context. */
  monthLabel: string;
  /** ADMIN-only affordance — the settings live on the app-settings page. */
  canManage: boolean;
  onNavigate: (path: string) => void;
}

export function OcrUsageCard({
  status,
  loading,
  isError,
  onRetry,
  monthLabel,
  canManage,
  onNavigate,
}: OcrUsageCardProps) {
  if (isError) {
    return (
      <div className="d-card d-card-border bg-base-100 wf-card wf-bento-third" data-testid="ocr-usage-card-error">
        <div className="wf-card-h">
          <div>
            <h2 className="ttl">OCR — Chụp ảnh cont/seal</h2>
            <div className="sub">Không tải được số request tháng {monthLabel}.</div>
          </div>
        </div>
        <div className="body">
          <button type="button" className="d-btn d-btn-sm" onClick={onRetry}>Thử lại</button>
        </div>
      </div>
    );
  }

  if (loading || !status) {
    return (
      <div className="d-card d-card-border bg-base-100 wf-card wf-bento-third" aria-busy="true">
        <div className="wf-card-h">
          <div>
            <h2 className="ttl">OCR — Chụp ảnh cont/seal</h2>
            <SkeletonLine width="160px" />
          </div>
        </div>
        <div className="body">
          <SkeletonLine width="100%" />
        </div>
      </div>
    );
  }

  const over = status.overageCount > 0;
  const pct = status.monthlyAllowance > 0
    ? Math.min(100, (status.used / status.monthlyAllowance) * 100)
    : status.used > 0 ? 100 : 0;
  const pctText = status.monthlyAllowance > 0
    ? `${Math.round((status.used / status.monthlyAllowance) * 100)}%`
    : '—';
  const tone: 'ok' | 'high' | 'over' = over
    ? 'over'
    : status.monthlyAllowance > 0 && (status.used / status.monthlyAllowance) > 0.85 ? 'high' : 'ok';

  return (
    <div className="d-card d-card-border bg-base-100 wf-card wf-bento-third" data-testid="ocr-usage-card">
      <div className="wf-card-h">
        <div>
          <h2 className="ttl">
            <ScanLine size={14} aria-hidden="true" style={{ verticalAlign: '-2px', marginRight: 6 }} />
            OCR — Chụp ảnh cont/seal
          </h2>
          <div className="sub">Tháng {monthLabel} · counter tự reset đầu tháng</div>
        </div>
        {canManage && (
          <button className="d-btn d-btn-link d-btn-sm wf-link" onClick={() => onNavigate('/config/app-settings')}>
            Cài đặt
          </button>
        )}
      </div>
      <div className="body">
        <div className="wf-fstats">
          <div className="wf-fstat">
            <div className="v">{formatNumber(status.used)}</div>
            <div className="k">Đã dùng / {formatNumber(status.monthlyAllowance)}</div>
          </div>
          <div className="wf-fstat">
            <div className="v">
              <span className="pip" style={{ background: over ? 'var(--wf-amber)' : 'var(--wf-green)' }} />
              {formatNumber(status.remaining)}
            </div>
            <div className="k">Còn lại</div>
          </div>
        </div>
        <div
          className="wf-util"
          title={`Đã dùng ${formatNumber(status.used)}/${formatNumber(status.monthlyAllowance)} request trong tháng`}
        >
          <span className="cap">Hạn mức tháng</span>
          <progress
            className={`d-progress track ${tone === 'over' ? 'd-progress-warning' : tone === 'high' ? 'd-progress-info' : 'd-progress-success'}`}
            value={pct}
            max={100}
            aria-label="Tỷ lệ OCR request so với hạn mức tháng"
          />
          <span className={`pct pct--${tone}`}>{pctText}</span>
          {over && (
            <span className="wf-util__flag wf-util__flag--over" data-testid="ocr-usage-overage">
              <AlertTriangle size={12} aria-hidden="true" />
              Vượt hạn mức {formatNumber(status.overageCount)} request · {formatCurrency(status.overageCost)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
