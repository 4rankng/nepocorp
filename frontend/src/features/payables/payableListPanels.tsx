import type { MoneyParts } from '../../lib/format';
import { AssetIcon } from '../../components/AssetIcon';
import { AGING_BUCKET_LABELS, type PayablesAgingTotals } from './payableListUtils';

/* ─── Zone 1: Hero KPI Row ────────────────────────────────────────────────── */

export function PayableHeroKpiRow({
  totals,
  heroMoney,
}: {
  totals: PayablesAgingTotals;
  heroMoney: MoneyParts;
}) {
  return (
    <div className="hero-kpi-row">
      {/* Hero card — span 3 */}
      <div className="hero-kpi-card">
        <span className="hero-kpi-card__eyebrow">Tổng công nợ phải trả</span>
        <span className="hero-kpi-card__amount">
          <span>{heroMoney.num}</span>{' '}
          <span className="hero-kpi-card__currency">{heroMoney.unit}</span>
        </span>
        <span className="hero-kpi-card__subtitle">
          {totals.supplierCount} nhà cung cấp · cập nhật vừa xong
        </span>
        <AssetIcon name="payables" size={86} className="hero-kpi-card__watermark hero-kpi-card__watermark--asset" />
      </div>

      {/* Stacked mini-KPI cards — span 1 */}
      <div className="hero-kpi-stack">
        <div className="hero-kpi-mini hero-kpi-mini--danger">
          <div className="hero-kpi-mini__body">
            <span className="hero-kpi-mini__value">
              {totals.overdueCount}
            </span>{' '}
            <span className="hero-kpi-mini__label">quá hạn</span>
          </div>
          <AssetIcon name="overdue" size={44} className="hero-kpi-mini__watermark hero-kpi-mini__watermark--asset" />
        </div>
        <div className="hero-kpi-mini hero-kpi-mini--accent">
          <div className="hero-kpi-mini__body">
            <span className="hero-kpi-mini__value">
              {totals.supplierCount}
            </span>{' '}
            <span className="hero-kpi-mini__label">nhà cung cấp</span>
          </div>
          <AssetIcon name="active-supplier" size={44} className="hero-kpi-mini__watermark hero-kpi-mini__watermark--asset" />
        </div>
      </div>
    </div>
  );
}

/* ─── Zone 2: Aging Distribution ──────────────────────────────────────────── */

export function PayableAgingGrid({
  totals,
  currentMoney,
  d30Money,
  d60Money,
  over90Money,
}: {
  totals: PayablesAgingTotals;
  currentMoney: MoneyParts;
  d30Money: MoneyParts;
  d60Money: MoneyParts;
  over90Money: MoneyParts;
}) {
  /* ── Aging progress percentages ── */
  const agingTotal = totals.current + totals.d30 + totals.d60 + totals.over90 || 1;
  const pctCurrent = (totals.current / agingTotal) * 100;
  const pctD30 = (totals.d30 / agingTotal) * 100;
  const pctD60 = (totals.d60 / agingTotal) * 100;
  const pctOver90 = (totals.over90 / agingTotal) * 100;

  return (
    <div className="payables-aging-grid">
      {/* 0–30 days */}
      <div className="aging-card aging-card--ok">
        <div className="aging-card__header">
          <span className="aging-card__dot aging-card__dot--ok" />
          <span className="aging-card__label">{AGING_BUCKET_LABELS[0]}</span>
        </div>
        <span className="aging-card__value">
          <span>{currentMoney.num}</span>{' '}<span className="aging-card__unit">{currentMoney.unit}</span>
        </span>
        <span className="aging-card__count">{totals.currentCount} NCC</span>
        <div className="aging-card__bar-track">
          <div className="aging-card__bar aging-card__bar--ok" style={{ width: `${pctCurrent}%` }} />
        </div>
      </div>

      {/* 31–60 days */}
      <div className="aging-card aging-card--warn">
        <div className="aging-card__header">
          <span className="aging-card__dot aging-card__dot--warn" />
          <span className="aging-card__label">{AGING_BUCKET_LABELS[1]}</span>
        </div>
        <span className="aging-card__value">
          <span>{d30Money.num}</span>{' '}<span className="aging-card__unit">{d30Money.unit}</span>
        </span>
        <span className="aging-card__count">{totals.d30Count} NCC</span>
        <div className="aging-card__bar-track">
          <div className="aging-card__bar aging-card__bar--warn" style={{ width: `${pctD30}%` }} />
        </div>
      </div>

      {/* 61–90 days */}
      <div className="aging-card aging-card--deep">
        <div className="aging-card__header">
          <span className="aging-card__dot aging-card__dot--deep" />
          <span className="aging-card__label">{AGING_BUCKET_LABELS[2]}</span>
        </div>
        <span className="aging-card__value">
          <span>{d60Money.num}</span>{' '}<span className="aging-card__unit">{d60Money.unit}</span>
        </span>
        <span className="aging-card__count">{totals.d60Count} NCC</span>
        <div className="aging-card__bar-track">
          <div className="aging-card__bar aging-card__bar--deep" style={{ width: `${pctD60}%` }} />
        </div>
      </div>

      {/* Over 90 days */}
      <div className="aging-card aging-card--danger">
        <div className="aging-card__header">
          <span className="aging-card__dot aging-card__dot--danger" />
          <span className="aging-card__label">{AGING_BUCKET_LABELS[3]}</span>
        </div>
        <span className="aging-card__value">
          <span>{over90Money.num}</span>{' '}<span className="aging-card__unit">{over90Money.unit}</span>
        </span>
        <span className="aging-card__count">{totals.over90Count} NCC</span>
        <div className="aging-card__bar-track">
          <div className="aging-card__bar aging-card__bar--danger" style={{ width: `${pctOver90}%` }} />
        </div>
      </div>
    </div>
  );
}
