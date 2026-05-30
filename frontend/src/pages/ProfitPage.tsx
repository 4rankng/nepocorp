import React, { useState, useEffect, useCallback } from 'react';
import { 
  DollarSign, 
  Calendar, 
  TrendingUp, 
  ArrowRightLeft,
  Briefcase,
  Users,
  Percent,
  CheckSquare
} from 'lucide-react';
import { api, ApiError } from '../lib/api';
import { getActiveCapTable } from '../lib/cap-table';
import { PageHeader, Card, KPI, FormGroup, useConfirm } from '../components/UI';
import { formatCurrency as formatVND } from '../lib/format';
import type { CapTableHistory } from '@nepocorp/shared';

interface PnlReport {
  period: { month: number; year: number };
  totalRevenue: number;
  totalCosts: number;
  grossProfit: number;
  managementFee: number;
  otherIncome: number;
  netProfit: number;
  tripCount: number;
}

interface DistributionResult {
  quarter: number;
  year: number;
  netProfit: number;
  distributions: Array<{
    partnerName: string;
    amount: string;
  }>;
}

export default function ProfitPage() {
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Month / Year state
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());

  // Quarter Distribution State
  const [selectedQuarter, setSelectedQuarter] = useState<number>(Math.ceil((now.getMonth() + 1) / 3));
  const [distQuarterYear, setDistQuarterYear] = useState<number>(now.getFullYear());
  const [distributing, setDistributing] = useState(false);
  const [distResult, setDistResult] = useState<DistributionResult | null>(null);

  // Data
  const [report, setReport] = useState<PnlReport | null>(null);
  const [capTable, setCapTable] = useState<CapTableHistory[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    let pnlOk = false;
    let capOk = false;
    try {
      const pnlRes = await api.get<PnlReport>(`/reports/pnl?month=${selectedMonth}&year=${selectedYear}`);
      setReport(pnlRes);
      pnlOk = true;
    } catch (err) {
      console.error(err);
    }
    try {
      const capRes = await api.get<{ items: CapTableHistory[] }>('/cap-table?limit=50');
      setCapTable(Array.isArray(capRes) ? capRes : (capRes.items || []));
      capOk = true;
    } catch (err) {
      console.error(err);
    }
    if (!pnlOk && !capOk) {
      setError('Không thể tải báo cáo phân chia lợi nhuận.');
    }
    setLoading(false);
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Action: Distribute profit
  const handleDistributeProfit = async () => {
    if (!await confirm(`Xác nhận chốt & phân chia lợi nhuận cho Quý ${selectedQuarter}/${distQuarterYear}?`)) {
      return;
    }

    setDistributing(true);
    setDistResult(null);
    try {
      const res = await api.post<DistributionResult>('/reports/distribute-profit', {
        quarter: selectedQuarter,
        year: distQuarterYear
      });
      setDistResult(res);
      alert('Đã thực hiện chốt phân chia lợi nhuận thành công!');
    } catch (err: any) {
      alert(err.message || 'Lỗi khi phân chia lợi nhuận.');
    } finally {
      setDistributing(false);
    }
  };

  // Get active cap table (default if empty).
  const getDisplayCapTable = () => {
    if (capTable && capTable.length > 0) {
      const result = getActiveCapTable(capTable);
      if (result.length > 0) return result;
    }
    // Wireframe default fallbacks
    return [
      { partnerName: 'Ông Phụng', percentage: 70.45 },
      { partnerName: 'Ông Thương', percentage: 29.55 }
    ];
  };

  const activeCapTable = getDisplayCapTable();
  const netProfit = report?.netProfit || 0;

  return (
    <div className="fade-up" style={{ paddingBottom: 40 }}>
      {/* Header */}
      <PageHeader 
        title="Lợi nhuận & Phân chia" 
        description="Báo cáo phân bổ lợi nhuận ròng giữa các đối tác góp vốn."
        action={
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 6 }}>
              <select
                className="input"
                style={{ width: 115, height: 36 }}
                value={selectedMonth}
                onChange={e => setSelectedMonth(Number(e.target.value))}
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>Tháng {i + 1}</option>
                ))}
              </select>
              <select
                className="input"
                style={{ width: 125, height: 36 }}
                value={selectedYear}
                onChange={e => setSelectedYear(Number(e.target.value))}
              >
                {[2024, 2025, 2026, 2027].map(y => (
                  <option key={y} value={y}>Năm {y}</option>
                ))}
              </select>
            </div>
            <button className="btn btn--secondary" onClick={loadData} style={{ height: 36 }}>Tải lại</button>
          </div>
        }
      />

      {error && (
        <div style={{ padding: 16, background: 'var(--danger-soft)', color: 'var(--danger)', borderRadius: 8, marginBottom: 20 }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
          <div className="spin" style={{ width: 32, height: 32, border: '4px solid var(--border-2)', borderTopColor: 'var(--brand)', borderRadius: '50%' }}></div>
        </div>
      ) : (
        <div className="profit-layout">
          
          {/* Left Column: Monthly Profit Hero & Shareholder cards */}
          <div>
            {/* Profit Hero Widget */}
            <div className="profit-hero">
              <div className="profit-hero__label">Lợi nhuận ròng để phân chia · T{selectedMonth} / {selectedYear}</div>
              <div className="profit-hero__value">
                {formatVND(netProfit)}
              </div>
              <div className="profit-hero__sub">
                Sau khi trừ phí quản lý {formatVND(report?.managementFee || 0)} · Dựa trên <strong>{report?.tripCount || 0}</strong> chuyến đã chốt
              </div>
            </div>

            {/* Shareholder cards grid */}
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Users size={16} style={{ color: 'var(--brand)' }} />
              Phân chia theo tỷ lệ cổ phần
            </h3>
            
            <div className="partner-grid">
              {activeCapTable.map((partner, i) => {
                const maxPct = Math.max(...activeCapTable.map(p => p.percentage));
                const isPhung = partner.percentage === maxPct;
                const avatarChar = partner.partnerName.charAt(partner.partnerName.lastIndexOf(' ') + 1) || partner.partnerName.charAt(0);
                const partnerShare = Math.round(netProfit * partner.percentage / 100);

                return (
                  <div key={i} className={`partner-card ${isPhung ? 'partner-card--primary' : ''}`}>
                    <div className="partner-card__head">
                      <div className={`partner-card__avatar ${isPhung ? 'partner-card__avatar--phung' : 'partner-card__avatar--thuong'}`}>
                        {avatarChar}
                      </div>
                      <div className="partner-card__info">
                        <div className="partner-card__name">
                          {partner.partnerName}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'nowrap' }}>
                          {isPhung ? (
                            <span style={{
                              display: 'inline-block',
                              padding: '2px 7px',
                              background: 'var(--brand-soft)',
                              color: 'var(--brand)',
                              borderRadius: 99,
                              fontSize: 9,
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              letterSpacing: '0.06em',
                              whiteSpace: 'nowrap',
                              flexShrink: 0
                            }}>
                              Đối tác chính
                            </span>
                          ) : (
                            <span className="partner-card__role">Đối tác góp vốn</span>
                          )}
                          <div className="partner-card__pct" style={{ marginLeft: 'auto', fontSize: 16 }}>
                            {partner.percentage}%
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="partner-card__amount-label">Phần lợi nhuận tháng {selectedMonth}</div>
                    <div className="partner-card__amount" style={{ color: isPhung ? 'var(--brand)' : 'var(--info)' }}>
                      {formatVND(partnerShare)}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quarterly Settlement Action Card */}
            <Card style={{ marginTop: 24 }} title="Quyết toán & Chốt Quý" subtitle="Khóa sổ kế toán và tạo bản ghi phân phối lợi nhuận chính thức.">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: 12 }}>
                  <FormGroup label="Chọn Quý">
                    <select 
                      className="input" 
                      style={{ width: 120 }}
                      value={selectedQuarter} 
                      onChange={e => setSelectedQuarter(Number(e.target.value))}
                    >
                      {[1, 2, 3, 4].map(q => <option key={q} value={q}>Quý {q}</option>)}
                    </select>
                  </FormGroup>
                  <FormGroup label="Năm quyết toán">
                    <select 
                      className="input" 
                      style={{ width: 120 }}
                      value={distQuarterYear} 
                      onChange={e => setDistQuarterYear(Number(e.target.value))}
                    >
                      {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>Năm {y}</option>)}
                    </select>
                  </FormGroup>
                </div>
                <div>
                  <button 
                    className="btn btn--primary"
                    style={{ height: 40, marginTop: 18, display: 'flex', alignItems: 'center', gap: 8 }}
                    onClick={handleDistributeProfit}
                    disabled={distributing}
                  >
                    <CheckSquare size={16} />
                    {distributing ? 'Đang xử lý...' : 'Chốt & phân bổ'}
                  </button>
                </div>
              </div>

              {distResult && (
                <div style={{ marginTop: 16, padding: 16, background: 'var(--brand-soft)', borderRadius: 8, border: '1px dashed var(--brand)' }}>
                  <h4 style={{ margin: '0 0 10px', fontSize: 13.5, fontWeight: 700, color: 'var(--brand)' }}>Kết quả chốt sổ Quý {distResult.quarter} / {distResult.year}</h4>
                  <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--fg-2)' }}>Tổng lợi nhuận ròng phân phối: <strong>{formatVND(distResult.netProfit)}</strong></p>
                  <table style={{ width: '100%', fontSize: 12.5 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-2)', color: 'var(--fg-3)' }}>
                        <th style={{ textAlign: 'left', paddingBottom: 6 }}>Đối tác</th>
                        <th style={{ textAlign: 'right', paddingBottom: 6 }}>Số tiền nhận</th>
                      </tr>
                    </thead>
                    <tbody>
                      {distResult.distributions.map((d, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--border-3)' }}>
                          <td style={{ padding: '6px 0', fontWeight: 600 }}>{d.partnerName}</td>
                          <td style={{ padding: '6px 0', textAlign: 'right', color: 'var(--brand)', fontWeight: 700 }}>{formatVND(Number(d.amount))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>

          {/* Right Column: Operating breakdown */}
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <TrendingUp size={16} style={{ color: 'var(--brand)' }} />
              Diễn giải kế toán
            </h3>

            <div className="calc-breakdown">
              <div className="calc-row">
                <div className="calc-row__label calc-row__label--bold">Doanh thu vận hành</div>
                <div className="calc-row__value">{formatVND(report?.totalRevenue || 0)}</div>
              </div>
              <div className="calc-row">
                <div className="calc-row__label">
                  <span className="calc-row__op">-</span>
                  Chi phí vận hành đội xe
                </div>
                <div className="calc-row__value calc-row__value--neg">-{formatVND(report?.totalCosts || 0)}</div>
              </div>
              <div className="calc-row calc-row--total">
                <div className="calc-row__label calc-row__label--bold">Lợi nhuận gộp hoạt động</div>
                <div className="calc-row__value">{formatVND(report?.grossProfit || 0)}</div>
              </div>
              <div className="calc-row">
                <div className="calc-row__label">
                  <span className="calc-row__op">-</span>
                  Phí quản lý văn phòng định mức
                </div>
                <div className="calc-row__value calc-row__value--neg">-{formatVND(report?.managementFee || 0)}</div>
              </div>
              <div className="calc-row">
                <div className="calc-row__label">
                  <span className="calc-row__op">+</span>
                  Thu nhập phạt vi phạm (Deduction)
                </div>
                <div className="calc-row__value calc-row__value--positive">+{formatVND(report?.otherIncome || 0)}</div>
              </div>
              <div className="calc-row calc-row--total calc-row--final">
                <div className="calc-row__label calc-row__label--bold">Lợi nhuận ròng chia cổ đông</div>
                <div className="calc-row__value">{formatVND(netProfit)}</div>
              </div>
            </div>

            <div style={{ marginTop: 16, padding: '14px 18px', background: 'var(--bg-3)', borderRadius: 8, fontSize: 11.5, color: 'var(--fg-3)', lineHeight: 1.5 }}>
              <p style={{ margin: 0, fontWeight: 600, color: 'var(--fg-2)', marginBottom: 4 }}>* Nguyên tắc ghi nhận:</p>
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                <li>Doanh thu và chi phí chỉ được ghi nhận sau khi chuyến đi đã chuyển sang trạng thái <strong>Đã chốt (LOCKED)</strong>.</li>
                <li>Phí phạt tài xế được tính trực tiếp vào thu nhập tài chính khác của doanh nghiệp (Salary Deduction Ledger).</li>
              </ul>
            </div>
          </div>
          
        </div>
      )}
      {confirmDialog}
    </div>
  );
}
