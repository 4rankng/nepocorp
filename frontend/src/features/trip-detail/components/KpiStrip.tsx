import React from 'react';
import { Wallet, Receipt, Tag, Gauge } from 'lucide-react';
import { Money } from '../../../components/shared/Money';
import { formatCurrency } from '../../../lib/format';
import { formatVatRate } from '../formatters';

interface KpiStripProps {
  /**
   * Revenue on the P&L basis (freight ex-VAT, after customer commission) — the
   * figure `grossProfit` is computed against, so the tiles add up.
   */
  revenue: number;
  totalCost: number;
  grossProfit: number;
  marginPct: string | null;
  /** VAT-inclusive contract freight; the VAT note's total. */
  contractRevenue?: number;
  /** Output VAT inside `contractRevenue`; > 0 reveals the basis label + note. */
  vatAmount?: number;
  /** Trip VAT rate as a fraction (0.08 = 8%). */
  vatRate?: number;
  /**
   * `inline` (default) — 4 free-floating KPI tiles in a single row, used
   * when the strip is rendered as a full-width section above the body grid.
   * `rail` — 2×2 micro-grid wrapped in a single glass card, used when the
   * strip is rendered inside the right rail of the 2-col body.
   */
  variant?: 'inline' | 'rail';
}

export function KpiStrip({
  revenue,
  totalCost,
  grossProfit,
  marginPct,
  contractRevenue,
  vatAmount,
  vatRate,
  variant = 'inline',
}: KpiStripProps) {
  // A trip with output VAT shows the VAT-exclusive revenue it earns on, with the
  // VAT-inclusive contract value spelled out beneath — otherwise the tile reads
  // 8.466.120 ₫ next to a profit recorded on 7.839.000 ₫ and the three figures
  // look like they do not add up (kanban 101026203100).
  const showVat = (vatAmount ?? 0) > 0;
  const revenueLabel = `Doanh thu${showVat ? ' (chưa VAT)' : ''}`;
  const revenueNote = showVat
    ? `Gồm VAT ${formatVatRate(vatRate ?? 0)}%: ${formatCurrency(contractRevenue ?? revenue)}`
    : 'Cước vận chuyển hợp đồng';

  if (variant === 'rail') {
    return (
      <div className="kpi-rail">
        <div className="kpi-rail__head">
          <span className="kpi-rail__eyebrow">Tổng quan tài chính</span>
        </div>
        <div className="kpi-rail__grid">
          <div className="kpi-rail__cell">
            <div className="kpi-label">
              <span className="dot"><Wallet size={12} /></span>
              {revenueLabel}
            </div>
            <div className="kpi-value kpi-value--sm">
              <Money value={revenue} />
            </div>
            {showVat && (
              <div className="kpi-sub">{revenueNote}</div>
            )}
          </div>

          <div className="kpi-rail__cell">
            <div className="kpi-label">
              <span className="dot"><Receipt size={12} /></span>
              Tổng chi phí
            </div>
            <div className="kpi-value kpi-value--sm">
              <Money value={totalCost} />
            </div>
          </div>

          <div className="kpi-rail__cell">
            <div className="kpi-label">
              <span className="dot"><Tag size={12} /></span>
              Lợi nhuận gộp
            </div>
            <div className="kpi-value kpi-value--sm">
              <Money value={grossProfit} />
            </div>
          </div>

          <div className="kpi-rail__cell">
            <div className="kpi-label">
              <span className="dot"><Gauge size={12} /></span>
              Biên LN
            </div>
            <div className="kpi-value kpi-value--sm">
              {marginPct ?? '—'}
              <span className="u">%</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="kpi">
        <div className="kpi-label">
          <span className="dot"><Wallet size={13} /></span>
          {revenueLabel}
        </div>
        <div className="kpi-value">
          <Money value={revenue} />
        </div>
        <div className="kpi-sub">{revenueNote}</div>
      </div>

      <div className="kpi">
        <div className="kpi-label">
          <span className="dot"><Receipt size={13} /></span>
          Tổng chi phí
        </div>
        <div className="kpi-value">
          <Money value={totalCost} />
        </div>
        <div className="kpi-sub">100% từ nhiên liệu</div>
      </div>

      <div className="kpi accent">
        <div className="kpi-label">
          <span className="dot"><Tag size={13} /></span>
          Lợi nhuận gộp
        </div>
        <div className="kpi-value">
          <Money value={grossProfit} />
        </div>
        <div className="kpi-sub">{showVat ? 'Doanh thu chưa VAT − Tổng chi phí' : 'Doanh thu − Tổng chi phí'}</div>
      </div>

      <div className="kpi">
        <div className="kpi-label">
          <span className="dot"><Gauge size={13} /></span>
          Biên lợi nhuận
        </div>
        <div className="kpi-value">
          {marginPct ?? '—'}
          <span className="u">%</span>
        </div>
        <div className="kpi-sub">{showVat ? 'Trên doanh thu chưa VAT' : 'Trên doanh thu'}</div>
      </div>
    </>
  );
}
