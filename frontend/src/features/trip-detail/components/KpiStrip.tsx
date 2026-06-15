import React from 'react';
import { Wallet, Receipt, Tag, Gauge } from 'lucide-react';
import { Money } from '../../../components/shared/Money';

interface KpiStripProps {
  revenue: number;
  totalCost: number;
  grossProfit: number;
  marginPct: string | null;
}

export function KpiStrip({ revenue, totalCost, grossProfit, marginPct }: KpiStripProps) {
  return (
    <>
      <div className="kpi">
        <div className="kpi-label">
          <span className="dot"><Wallet size={13} /></span>
          Doanh thu
        </div>
        <div className="kpi-value">
          <Money value={revenue} />
        </div>
        <div className="kpi-sub">Cước vận chuyển hợp đồng</div>
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
        <div className="kpi-sub">Doanh thu − Tổng chi phí</div>
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
        <div className="kpi-sub">Trên doanh thu</div>
      </div>
    </>
  );
}
