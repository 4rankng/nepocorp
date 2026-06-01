import React, { useState } from 'react';
import {
  Calendar,
  TrendingUp,
  Users,
  CheckSquare,
  Eye
} from 'lucide-react';
import { api } from '../lib/api';
import { getActiveCapTable } from '../lib/cap-table';
import { PageHeader, Card, FormGroup, useConfirm } from '../components/UI';
import { formatCurrency as formatVND } from '../lib/format';
import { useCapTable, useDistributionHistory, usePnlReport } from '../hooks/useQueries';
import { useToast } from '../components/shared/Toast';
import type { CapTableHistory } from '@nepocorp/shared';
import { useMonth } from '../hooks/useMonth';

interface DistributionResult {
  quarter: number;
  year: number;
  netProfit: number;
  tripCount?: number;
  distributions: Array<{
    partnerName: string;
    percentage?: string;
    amount: string;
  }>;
}

interface DistributionRecord {
  id: number;
  quarter: number;
  year: number;
  partnerName: string;
  amount: string;
  createdAt: string;
}

export default function ProfitPage() {
  const { confirm, dialog: confirmDialog } = useConfirm();
  const { toast: showToast } = useToast();

  const now = new Date();
  const { month: selectedMonth, year: selectedYear } = useMonth();

  const [selectedQuarter, setSelectedQuarter] = useState<number>(Math.ceil((now.getMonth() + 1) / 3));
  const [distQuarterYear, setDistQuarterYear] = useState<number>(now.getFullYear());
  const [distributing, setDistributing] = useState(false);
  const [distResult, setDistResult] = useState<DistributionResult | null>(null);
  const [preview, setPreview] = useState<DistributionResult | null>(null);
  const [previewing, setPreviewing] = useState(false);

  const { data: report, isLoading: loading, error: reportError } = usePnlReport(selectedMonth, selectedYear);

  const { data: capTable = [], error: capError } = useCapTable();
  const { data: history = [], refetch: refetchHistory } = useDistributionHistory();

  const error = reportError || capError ? 'Không thể tải báo cáo phân chia lợi nhuận.' : null;

  const handlePreview = async () => {
    setPreviewing(true);
    setPreview(null);
    try {
      const res = await api.post<DistributionResult>('/reports/distribute-profit/preview', {
        quarter: selectedQuarter,
        year: distQuarterYear,
      });
      setPreview(res);
    } catch (err: any) {
      showToast({ kind: 'error', message: err.message || 'Lỗi khi xem trước phân phối.' });
    } finally {
      setPreviewing(false);
    }
  };

  const handleDistributeProfit = async () => {
    if (!await confirm(`Xác nhận phân chia lợi nhuận cho Quý ${selectedQuarter}/${distQuarterYear}? Hành động này không thể hoàn tác.`)) {
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
      setPreview(null);
      showToast({ kind: 'success', message: 'Đã thực hiện phân chia lợi nhuận thành công!' });
      refetchHistory();
    } catch (err: any) {
      showToast({ kind: 'error', message: err.message || 'Lỗi khi phân chia lợi nhuận.' });
    } finally {
      setDistributing(false);
    }
  };

  const getDisplayCapTable = () => {
    if (capTable && capTable.length > 0) {
      const result = getActiveCapTable(capTable);
      if (result.length > 0) return result;
    }
    return [];
  };

  const activeCapTable = getDisplayCapTable();
  const netProfit = report?.netProfit || 0;

  return (
    <div className="fade-up" style={{ paddingBottom: 40 }}>
      {/* Header */}
      <PageHeader
        title="Phân chia lợi nhuận"
        description="Báo cáo phân bổ lợi nhuận ròng giữa các đối tác góp vốn."
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

          {/* Row 1, Col 1: Monthly Profit Hero & Shareholder cards */}
          <div>
            <div className="profit-hero">
              <div className="profit-hero__label">Lợi nhuận ròng để phân chia · T{selectedMonth} / {selectedYear}</div>
              <div className="profit-hero__value">
                {formatVND(netProfit)}
              </div>
              <div className="profit-hero__sub">
                Sau khi trừ phí quản lý {formatVND(report?.managementFee || 0)} · Dựa trên <strong>{report?.tripCount || 0}</strong> chuyến đã khóa
              </div>
            </div>

            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Users size={14} style={{ color: 'var(--brand)' }} />
              Phân chia theo tỷ lệ cổ phần
            </h3>

            <div className="partner-grid">
              {activeCapTable.map((partner, i) => {
                const isPrimary = i === 0;
                const avatarChar = partner.partnerName.charAt(partner.partnerName.lastIndexOf(' ') + 1) || partner.partnerName.charAt(0);
                const partnerShare = Math.round(netProfit * partner.percentage / 100);

                return (
                  <div key={i} className={`partner-card ${isPrimary ? 'partner-card--primary' : ''}`}>
                    <div className="partner-card__head">
                      <div className={`partner-card__avatar ${isPrimary ? 'partner-card__avatar--primary' : 'partner-card__avatar--secondary'}`}>
                        {avatarChar}
                      </div>
                      <div className="partner-card__info">
                        <div className="partner-card__name">
                          {partner.partnerName}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'nowrap' }}>
                          <span className="partner-card__role">{isPrimary ? 'Đối tác chính' : 'Đối tác góp vốn'}</span>
                          <div className="partner-card__pct" style={{ marginLeft: 'auto' }}>
                            {partner.percentage}%
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="partner-card__amount-label">Phần lợi nhuận tháng {selectedMonth}</div>
                    <div className="partner-card__amount" style={{ color: isPrimary ? 'var(--brand)' : 'var(--info)' }}>
                      {formatVND(partnerShare)}
                    </div>
                  </div>
                );
              })}
            </div>

            {activeCapTable.length === 0 && (
              <div style={{
                padding: 24,
                background: 'var(--bg-2)',
                borderRadius: 8,
                textAlign: 'center',
                color: 'var(--fg-3)',
                fontSize: 13,
              }}>
                <p style={{ margin: '0 0 8px', fontWeight: 600, color: 'var(--fg-2)' }}>Chưa cấu hình tỷ lệ cổ phần</p>
                <p style={{ margin: 0 }}>
                  Vui lòng thêm bản ghi tại{' '}
                  <a href="/config/cap-table" style={{ color: 'var(--brand)', fontWeight: 600 }}>
                    Cấu hình Cổ đông
                  </a>{' '}
                  để hiển thị phân chia lợi nhuận.
                </p>
              </div>
            )}
          </div>

          {/* Row 1, Col 2: Operating breakdown */}
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <TrendingUp size={14} style={{ color: 'var(--brand)' }} />
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
              {((report?.maintenanceExpensesTotal ?? 0) > 0) && (
                <div className="calc-row">
                  <div className="calc-row__label">
                    <span className="calc-row__op">-</span>
                    Chi phí bảo dưỡng, đăng kiểm xe
                  </div>
                  <div className="calc-row__value calc-row__value--neg">-{formatVND(report?.maintenanceExpensesTotal || 0)}</div>
                </div>
              )}
              <div className="calc-row">
                <div className="calc-row__label">
                  <span className="calc-row__op">-</span>
                  Phí quản lý văn phòng định mức
                </div>
                <div className="calc-row__value calc-row__value--neg">-{formatVND(report?.managementFee || 0)}</div>
              </div>
              <div className="calc-row">
                <div className="calc-row__label">
                  <span className="calc-row__op">-</span>
                  Chi phí chung công ty
                </div>
                <div className="calc-row__value calc-row__value--neg">-{formatVND(report?.companyExpenses || 0)}</div>
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
                <li>Doanh thu và chi phí chỉ được ghi nhận sau khi chuyến đi đã chuyển sang trạng thái <strong>Đã khóa (LOCKED)</strong>.</li>
                <li>Phí phạt tài xế được tính trực tiếp vào thu nhập tài chính khác của doanh nghiệp (Salary Deduction Ledger).</li>
              </ul>
            </div>
          </div>

          {/* Row 2, Col 1: Quarterly Settlement Action Card */}
          <Card
            style={history.length === 0 ? { gridColumn: '1 / -1' } : undefined}
            title="Quyết toán & Chốt Quý"
            subtitle="Khóa sổ kế toán và tạo bản ghi phân phối lợi nhuận chính thức."
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <FormGroup label="Chọn Quý">
                  <select
                    className="input"
                    style={{ minWidth: 120, flex: '1 1 auto' }}
                    value={selectedQuarter}
                    onChange={e => { setSelectedQuarter(Number(e.target.value)); setPreview(null); }}
                  >
                    {[1, 2, 3, 4].map(q => <option key={q} value={q}>Quý {q}</option>)}
                  </select>
                </FormGroup>
                <FormGroup label="Năm quyết toán">
                  <select
                    className="input"
                    style={{ minWidth: 120, flex: '1 1 auto' }}
                    value={distQuarterYear}
                    onChange={e => { setDistQuarterYear(Number(e.target.value)); setPreview(null); }}
                  >
                    {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>Năm {y}</option>)}
                  </select>
                </FormGroup>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
                <button
                  className="btn btn--secondary"
                  style={{ height: 38, display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 auto', justifyContent: 'center' }}
                  onClick={handlePreview}
                  disabled={previewing}
                >
                  <Eye size={14} />
                  {previewing ? 'Đang tính...' : 'Xem trước'}
                </button>
                <button
                  className="btn btn--primary"
                  style={{ height: 38, display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 auto', justifyContent: 'center' }}
                  onClick={handleDistributeProfit}
                  disabled={distributing}
                >
                  <CheckSquare size={14} />
                  {distributing ? 'Đang xử lý...' : 'Chốt & phân bổ'}
                </button>
              </div>
            </div>

            {preview && !distResult && (
              <div style={{ marginTop: 16, padding: 16, background: 'var(--bg-2)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <h4 style={{ margin: '0 0 10px', fontSize: 13.5, fontWeight: 700, color: 'var(--fg-1)' }}>📋 Dự kiến phân phối Quý {preview.quarter} / {preview.year}</h4>
                <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--fg-2)' }}>
                  Lợi nhuận ròng từ <strong>{preview.tripCount ?? '?'} chuyến</strong>: <strong>{formatVND(preview.netProfit)}</strong>
                </p>
                <table style={{ width: '100%', fontSize: 12.5 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-2)', color: 'var(--fg-3)' }}>
                      <th style={{ textAlign: 'left', paddingBottom: 6 }}>Đối tác</th>
                      <th style={{ textAlign: 'right', paddingBottom: 6 }}>Tỷ lệ</th>
                      <th style={{ textAlign: 'right', paddingBottom: 6 }}>Số tiền nhận</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.distributions.map((d, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border-3)' }}>
                        <td style={{ padding: '6px 0', fontWeight: 600 }}>{d.partnerName}</td>
                        <td style={{ padding: '6px 0', textAlign: 'right', color: 'var(--fg-3)' }}>{d.percentage ?? '—'}%</td>
                        <td style={{ padding: '6px 0', textAlign: 'right', color: 'var(--brand)', fontWeight: 700 }}>{formatVND(Number(d.amount))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {distResult && (
              <div style={{ marginTop: 16, padding: 16, background: 'var(--brand-soft)', borderRadius: 8, border: '1px dashed var(--brand)' }}>
                <h4 style={{ margin: '0 0 10px', fontSize: 13.5, fontWeight: 700, color: 'var(--brand)' }}>✅ Đã phân chia lợi nhuận Quý {distResult.quarter} / {distResult.year}</h4>
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
                <p style={{ margin: '8px 0 0', fontSize: 11, color: 'var(--fg-3)' }}>Bản ghi không thể thay đổi. Xem chi tiết trong Lịch sử phân phối bên dưới.</p>
              </div>
            )}
          </Card>

          {/* Row 2, Col 2: Historical Distribution View */}
          {history.length > 0 && (
            <Card title="Lịch sử phân phối" subtitle="Các lần phân chia lợi nhuận đã thực hiện">
              <div className="profit-history-scroll">
                <div className="table-scroll">
                  <table style={{ width: '100%', fontSize: 12.5 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-2)', color: 'var(--fg-3)' }}>
                        <th style={{ textAlign: 'left', paddingBottom: 6 }}>Kỳ</th>
                        <th style={{ textAlign: 'left', paddingBottom: 6 }}>Đối tác</th>
                        <th style={{ textAlign: 'right', paddingBottom: 6 }}>Số tiền</th>
                        <th style={{ textAlign: 'right', paddingBottom: 6 }}>Ngày phân chia</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((d: any) => (
                        <tr key={d.id} style={{ borderBottom: '1px solid var(--border-3)' }}>
                          <td style={{ padding: '6px 0', fontWeight: 600 }}>Q{d.quarter}/{d.year}</td>
                          <td style={{ padding: '6px 0' }}>{d.partnerName}</td>
                          <td style={{ padding: '6px 0', textAlign: 'right', color: 'var(--brand)', fontWeight: 600 }}>{formatVND(Number(d.amount))}</td>
                          <td style={{ padding: '6px 0', textAlign: 'right', color: 'var(--fg-3)', fontSize: 11 }}>{new Date(d.createdAt).toLocaleDateString('vi-VN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </Card>
          )}

        </div>
      )}
      {confirmDialog}
    </div>
  );
}
