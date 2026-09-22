import React from 'react';
import { formatNumber } from '../../../lib/format';
import { StatusStrip } from '../../../components/shared/StatusStrip';
import { AssetIcon } from '../../../components/AssetIcon';
import { DeltaPill, fmtVN } from './dashboard-presenters';

type DashboardStatTone = 'revenue' | 'cost' | 'gross' | 'net' | 'debt';

const DASHBOARD_STAT_STRIP_COLORS: Record<DashboardStatTone, string> = {
  revenue: 'var(--wf-green)',
  cost: 'var(--wf-amber)',
  gross: 'var(--wf-blue)',
  net: 'var(--wf-green-500)',
  debt: 'var(--wf-red)',
};

interface DashboardStatProps {
  tone: DashboardStatTone;
  icon: React.ReactNode;
  label: string;
  delta?: React.ReactNode;
  value: string;
  valueRef?: (element: HTMLSpanElement | null) => void;
  description: React.ReactNode;
}

function DashboardStat({ tone, icon, label, delta, value, valueRef, description }: DashboardStatProps) {
  return (
    <div className={`d-stats d-card d-card-border bg-base-100 wf-kpi wf-kpi--${tone}`}>
      <StatusStrip color={DASHBOARD_STAT_STRIP_COLORS[tone]} />
      <div className="d-stat">
        <div className="d-stat-title row1">
          <span className="lbl">
            <span className="wf-kpi__icon" aria-hidden="true">{icon}</span>
            {label}
          </span>
          {delta}
        </div>
        <div className="d-stat-value val">
          <span ref={valueRef}>{value}</span> <i>đ</i>
        </div>
        <div className="d-stat-desc foot">{description}</div>
      </div>
    </div>
  );
}

export interface DashboardKpiRowProps {
  currentMonth: number;
  currentYear: number;
  revenue: number;
  prevRevenue: number;
  revenueMoM: string | null;
  costs: number;
  costsMoM: string | null;
  costRatio: number;
  grossProfit: number;
  grossMoM: string | null;
  grossMargin: number;
  netProfit: number;
  netMoM: string | null;
  totalOutstanding: number;
  overdueCustomers: number;
  /** KPI refs for counter animation — point to <span> wrapping just the number. */
  kpiRefs: { current: Record<string, HTMLSpanElement | null> };
  onNavigate: (path: string) => void;
}

export function DashboardKpiRow({
  currentMonth, currentYear,
  revenue, prevRevenue, revenueMoM,
  costs, costsMoM, costRatio,
  grossProfit, grossMoM, grossMargin,
  netProfit, netMoM,
  totalOutstanding, overdueCustomers,
  kpiRefs, onNavigate,
}: DashboardKpiRowProps) {
  return (
    <div className="wf-kpis" data-tour-id="dashboard-kpis">
      <DashboardStat
        tone="revenue"
        icon={<AssetIcon name="analytics" size={15} />}
        label={`Doanh thu · ${String(currentMonth).padStart(2, '0')}/${currentYear}`}
        delta={<DeltaPill mom={revenueMoM} />}
        value={fmtVN(revenue)}
        valueRef={element => { kpiRefs.current.revenue = element; }}
        description={<>Tháng trước · {formatNumber(prevRevenue)} đ</>}
      />
      <DashboardStat
        tone="cost"
        icon={<AssetIcon name="expense" size={15} />}
        label="Tổng chi phí"
        delta={<DeltaPill mom={costsMoM} />}
        value={fmtVN(costs)}
        valueRef={element => { kpiRefs.current.costs = element; }}
        description={<>{costRatio.toFixed(1)}% doanh thu</>}
      />
      <DashboardStat
        tone="gross"
        icon={<AssetIcon name="gross-margin" size={15} />}
        label="Lợi nhuận gộp"
        delta={<DeltaPill mom={grossMoM} />}
        value={fmtVN(grossProfit)}
        valueRef={element => { kpiRefs.current.gross = element; }}
        description={<>Biên gộp · {grossMargin.toFixed(1)}%</>}
      />
      <DashboardStat
        tone="net"
        icon={<AssetIcon name="profit" size={15} />}
        label="Lợi nhuận ròng"
        delta={<DeltaPill mom={netMoM} />}
        value={fmtVN(netProfit)}
        valueRef={element => { kpiRefs.current.net = element; }}
        description={<>Sau phí quản lý · <button className="d-btn d-btn-link d-btn-xs wf-link" onClick={() => onNavigate('/profit')}>Phân chia →</button></>}
      />
      <DashboardStat
        tone="debt"
        icon={<AssetIcon name="receivables" size={15} />}
        label="Công nợ phải thu"
        value={fmtVN(totalOutstanding)}
        description={<>{overdueCustomers} khách quá hạn</>}
      />
    </div>
  );
}
