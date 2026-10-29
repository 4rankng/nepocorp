import { AlertTriangle, Download, ScanLine } from 'lucide-react';
import { SkeletonLine } from '../../../components/shared/Skeleton';
import { OcrUsageChart } from '../../../components/charts/OcrUsageChart';
import { downloadCSV } from '../../../lib/csv';
import { formatCurrency, formatNumber } from '../../../lib/format';
import { buildOcrUsageDailyOverage } from '@tingting/shared';
import type { OcrUsageStatus } from '@tingting/shared';

/**
 * Dashboard tile for AI OCR usage (NEPO-27): requests used this calendar month
 * against the configurable allowance, what's left, and — once the allowance is
 * exceeded — the overage count costed at the configured per-call price.
 *
 * Layout (NEPO-28, owner spec): a four-metric row (used · projected month-end
 * · daily average · overage cost), a 3px micro-meter carrying the allowance
 * state, and the daily request chart underneath. The monthly allowance is
 * deliberately NOT drawn as a line on the daily axis — a 10.000 cap on a
 * 0–600 daily scale flattens every bar — so the meter above the chart is the
 * only place the cap is expressed.
 *
 * The tile carries the `wf-ocr` scope, which gives it its own padding and a
 * TWO-column stat grid (the fleet card's `wf-fstats` is a four-column grid
 * sized for four stats). It sits beside "Top tuyến sinh lời" as the second
 * half of a 6+6 row.
 */
interface OcrUsageCardProps {
  status: OcrUsageStatus | null;
  loading: boolean;
  isError: boolean;
  onRetry: () => void;
  /** ADMIN-only affordance — the settings live on the app-settings page. */
  canManage: boolean;
  onNavigate: (path: string) => void;
}

/** '2026-10' → '10/2026' */
function formatPeriod(period: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(period);
  return m ? `${m[2]}/${m[1]}` : period;
}

/** '2026-10-07' → '07/10/2026' */
function formatDay(date: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : date;
}

export function OcrUsageCard({
  status,
  loading,
  isError,
  onRetry,
  canManage,
  onNavigate,
}: OcrUsageCardProps) {
  if (isError) {
    return (
      <div className="d-card d-card-border bg-base-100 wf-card wf-ocr wf-bento-half" data-testid="ocr-usage-card-error">
        <div className="wf-card-h">
          <div>
            <h2 className="ttl">OCR</h2>
            <div className="sub">Không tải được số request tháng này.</div>
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
      <div className="d-card d-card-border bg-base-100 wf-card wf-ocr wf-bento-half" aria-busy="true">
        <div className="wf-card-h">
          <div>
            <h2 className="ttl">OCR</h2>
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
  const ratio = status.monthlyAllowance > 0 ? status.used / status.monthlyAllowance : 0;
  const pct = status.monthlyAllowance > 0
    ? Math.min(100, ratio * 100)
    : status.used > 0 ? 100 : 0;
  // One decimal, vi-VN formatted — the raw ratio would leak float noise
  // ("43.980000000000004%").
  const pctText = status.monthlyAllowance > 0
    ? `${formatNumber(Math.round(ratio * 1000) / 10)}%`
    : '—';
  // Status tone: green below 85%, blue 85–100%, amber past the cap. The house
  // idiom encodes state through colour + words, never through a badge shape.
  const tone: 'ok' | 'high' | 'over' = over
    ? 'over'
    : status.monthlyAllowance > 0 && ratio > 0.85 ? 'high' : 'ok';
  const projectedOver = status.projectedTotal > status.monthlyAllowance;
  const projectedText = status.projectedTotal > 0 ? `~${formatNumber(status.projectedTotal)}` : '—';

  /**
   * Export the month's daily usage as a spreadsheet — one row per day of the
   * month (including the days without scans, so the total reconciles) plus a
   * totals row. NEPO-620: the third column carries the tile's "Phát sinh
   * ngoài gói" figure per day (overage requests × price), and the subtitle
   * spells out the overage whenever there is one. Same house export as the
   * other reports (branded title band).
   */
  const exportReport = async () => {
    const overageByDate: Record<string, number> = {};
    for (const point of buildOcrUsageDailyOverage(status.daily, status.monthlyAllowance)) {
      overageByDate[point.date] = point.count;
    }
    const rows: (string | number)[][] = [];
    for (let day = 1; day <= status.daysInMonth; day++) {
      const date = `${status.period}-${String(day).padStart(2, '0')}`;
      const count = status.daily.find(point => point.date === date)?.count ?? 0;
      const dayOverage = (overageByDate[date] ?? 0) * status.overagePricePerCall;
      rows.push([formatDay(date), count, dayOverage]);
    }
    await downloadCSV(
      `bao-cao-ocr-${status.period}.csv`,
      ['Ngày', 'Số request OCR', 'Phát sinh'],
      rows,
      {
        title: 'BÁO CÁO AI OCR',
        subtitle:
          `Tháng ${formatPeriod(status.period)} · Hạn mức ${formatNumber(status.monthlyAllowance)} request · Trung bình ${formatNumber(status.dailyAverage)} lượt/ngày` +
          (over
            ? ` · Phát sinh: ${formatNumber(status.overageCount)} request × ${formatCurrency(status.overagePricePerCall)} = ${formatCurrency(status.overageCost)}`
            : ''),
        columnTypes: ['date', 'number', 'currency'],
        totalsColumns: [1, 2],
      },
    );
  };

  return (
    <div className="d-card d-card-border bg-base-100 wf-card wf-ocr wf-bento-half" data-testid="ocr-usage-card">
      <div className="wf-card-h">
        <div>
          <h2 className="ttl">
            <ScanLine size={14} aria-hidden="true" style={{ verticalAlign: '-2px', marginRight: 6 }} />
            OCR
          </h2>
          <div className="sub">Tháng {formatPeriod(status.period)} · counter tự reset đầu tháng</div>
        </div>
        <div className="wf-ocr-actions">
          <button
            className="d-btn d-btn-link d-btn-sm wf-link"
            onClick={() => void exportReport()}
            title="Xuất báo cáo request OCR theo ngày"
          >
            <Download size={13} aria-hidden="true" />
            Xuất báo cáo
          </button>
          {canManage && (
            <button className="d-btn d-btn-link d-btn-sm wf-link" onClick={() => onNavigate('/config/app-settings')}>
              Cài đặt
            </button>
          )}
        </div>
      </div>

      <div className="body">
        {/* Four metrics, none of them a repeat of what the chart already shows:
            the chart carries the daily rhythm, the row carries the month. */}
        <div className="wf-ocr-metrics">
          <div className="wf-ocr-metric">
            <div className="k">Đã dùng</div>
            <div className="v">
              {formatNumber(status.used)}
              <span className="of"> / {formatNumber(status.monthlyAllowance)}</span>
            </div>
            <div className="s">Còn {formatNumber(status.remaining)} lượt</div>
          </div>
          <div className="wf-ocr-metric">
            <div className="k">Dự báo tháng</div>
            <div className={`v ${projectedOver ? 'v--over' : ''}`}>{projectedText}</div>
            <div className="s">
              {status.projectedTotal > 0
                ? projectedOver ? 'Vượt hạn mức' : 'Trong hạn mức'
                : 'Chưa có số liệu'}
            </div>
          </div>
          <div className="wf-ocr-metric">
            <div className="k">Trung bình</div>
            <div className="v">{status.dailyAverage > 0 ? formatNumber(status.dailyAverage) : '—'}</div>
            <div className="s">lượt / ngày</div>
          </div>
          <div className="wf-ocr-metric">
            <div className="k">Phát sinh</div>
            <div className={`v ${over ? 'v--over' : ''}`}>{formatCurrency(status.overageCost)}</div>
            <div className="s">
              {over
                ? `${formatNumber(status.overageCount)} lượt · ${formatCurrency(status.overagePricePerCall)}/lượt`
                : `${formatCurrency(status.overagePricePerCall)} / lượt`}
            </div>
          </div>
        </div>

        {/* The monthly cap: a 3px micro-meter + the state in words. */}
        <div className="wf-ocr-meter">
          <div className="wf-ocr-meter__track">
            <span
              className={`wf-ocr-meter__fill wf-ocr-meter__fill--${tone}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className={`pct pct--${tone}`}>{pctText}</span>
          <span className={`wf-ocr-meter__state wf-ocr-meter__state--${tone}`}>
            {over
              ? `Vượt ${formatNumber(status.overageCount)} lượt`
              : tone === 'high'
                ? `Sắp chạm hạn mức (còn ${formatNumber(status.remaining)})`
                : 'Đang trong hạn mức'}
          </span>
          {over && (
            <span className="wf-util__flag wf-util__flag--over" data-testid="ocr-usage-overage">
              <AlertTriangle size={12} aria-hidden="true" />
              {formatNumber(status.overageCount)} request · {formatCurrency(status.overageCost)}
            </span>
          )}
        </div>

        <div className="wf-ocr-chart">
          <OcrUsageChart
            daily={status.daily}
            period={status.period}
            elapsedDays={status.elapsedDays}
            daysInMonth={status.daysInMonth}
            dailyAverage={status.dailyAverage}
          />
        </div>
      </div>
    </div>
  );
}
