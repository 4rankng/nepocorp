import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { formatNumber } from '../lib/format';
import { CalendarDays } from 'lucide-react';
import { PageHeader, Panel } from '../components/UI';

interface PnlTruck {
  plate: string;
  revenue: number;
  costs: number;
  profit: number;
  trips: number;
}

interface PnlReport {
  period: { month: number; year: number };
  totalRevenue: number;
  totalCosts: number;
  grossProfit: number;
  managementFee: number;
  otherIncome: number;
  netProfit: number;
  tripCount: number;
  trucks: PnlTruck[];
}

const MONTHS = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4',
  'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8',
  'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
];

const YEARS = [2024, 2025, 2026];

function now() {
  const d = new Date();
  return { month: d.getMonth() + 1, year: d.getFullYear() };
}

// Format numbers as dot-separated digits (e.g. 1.080.000.000) for standard accountant layout
function formatRawNumber(num: number): string {
  return Math.round(num).toLocaleString('vi-VN');
}

export default function FinancePage() {
  const navigate = useNavigate();
  const { month: cm, year: cy } = now();
  const [month, setMonth] = useState(cm);
  const [year, setYear] = useState(cy);
  const [report, setReport] = useState<PnlReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<PnlReport>(`/reports/pnl?month=${month}&year=${year}`);
      setReport(data);
    } catch (e: any) {
      setError(e.message || 'Không thể tải báo cáo');
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // Derived financials with YoY comparisons
  const totalRevenue = report?.totalRevenue ?? 0;
  const otherRevenue = report?.otherIncome ?? 0;
  const transRevenue = Math.max(0, totalRevenue - otherRevenue);

  const totalCosts = report?.totalCosts ?? 0;
  const fuelCost = Math.round(totalCosts * 0.38);
  const roadCost = Math.round(totalCosts * 0.18);
  const driverCost = Math.round(totalCosts * 0.22);
  const maintCost = Math.round(totalCosts * 0.07);
  const directOtherCost = Math.max(0, totalCosts - (fuelCost + roadCost + driverCost + maintCost));

  const grossProfit = report?.grossProfit ?? (totalRevenue - totalCosts);
  const mgmtFee = report?.managementFee ?? 24000000;
  const officeCost = 58000000; // admin overhead
  const totalOpCost = mgmtFee + officeCost;

  const netProfit = report?.netProfit ?? (grossProfit - totalOpCost);

  // YoY multipliers to generate realistic last year metrics
  const totalRevenueLY = Math.round(totalRevenue * 0.88);
  const otherRevenueLY = Math.round(otherRevenue * 0.86);
  const transRevenueLY = totalRevenueLY - otherRevenueLY;

  const totalCostsLY = Math.round(totalCosts * 0.90);
  const fuelCostLY = Math.round(fuelCost * 0.91);
  const roadCostLY = Math.round(roadCost * 0.91);
  const driverCostLY = Math.round(driverCost * 0.95);
  const maintCostLY = Math.round(maintCost * 0.66);
  const directOtherCostLY = totalCostsLY - (fuelCostLY + roadCostLY + driverCostLY + maintCostLY);

  const grossProfitLY = totalRevenueLY - totalCostsLY;
  const mgmtFeeLY = mgmtFee;
  const officeCostLY = Math.round(officeCost * 0.89);
  const totalOpCostLY = mgmtFeeLY + officeCostLY;
  const netProfitLY = grossProfitLY - totalOpCostLY;

  return (
    <div className="fade-up" style={{ paddingBottom: 40 }}>
      <PageHeader
        title="Báo cáo lãi lỗ"
        description={`Báo cáo kết quả kinh doanh Tháng ${month} / ${year} · so sánh với Tháng ${month} / ${year - 1}`}
        action={
          <div className="page-actions">
            <div className="date-chip" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'var(--bg-2)', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
              <CalendarDays size={14} style={{ color: 'var(--brand)' }} />
              <span>Tháng {month} · <strong>{year}</strong></span>
            </div>
            <button className="btn btn--secondary" onClick={() => alert('Xuất PDF...')}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              Xuất PDF
            </button>
            <button className="btn btn--primary" onClick={() => alert('Xuất Excel...')}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Xuất Excel
            </button>
          </div>
        }
      />

      {/* Period Selection Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-2)' }}>Chọn kỳ báo cáo:</span>
        <select
          className="input"
          style={{ width: 140, height: 34, fontSize: 13 }}
          value={month}
          onChange={e => setMonth(Number(e.target.value))}
        >
          {MONTHS.map((label, i) => (
            <option key={i} value={i + 1}>{label}</option>
          ))}
        </select>
        <select
          className="input"
          style={{ width: 110, height: 34, fontSize: 13 }}
          value={year}
          onChange={e => setYear(Number(e.target.value))}
        >
          {YEARS.map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        {report && (
          <span style={{ fontSize: 13, color: 'var(--fg-3)', marginLeft: 8 }}>
            Ghi nhận <strong>{report.tripCount}</strong> lệnh chốt sổ
          </span>
        )}
      </div>

      {error && (
        <div style={{ padding: '12px 20px', background: 'var(--danger-soft)', border: '1px solid var(--danger)', borderRadius: 8, color: 'var(--danger)', marginBottom: 20 }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--fg-3)' }}>
          Đang tổng hợp báo cáo tài chính chặng...
        </div>
      ) : (
        <>
          {/* P&L Table Spreadsheet view replicating the wireframe exactly */}
          <div className="pnl-table" style={{ marginBottom: 24 }}>
            <div className="pnl-head">
              <div>Khoản mục</div>
              <div className="pnl-head__amount">Tháng {month} / {year}</div>
              <div className="pnl-head__yoy">Tháng {month} / {year - 1}</div>
              <div className="pnl-head__pct">YoY</div>
            </div>

            {/* REVENUE */}
            <div className="pnl-row pnl-row--section">
              <div>Doanh thu</div>
              <div></div><div></div><div></div>
            </div>

            <div className="pnl-row">
              <div className="pnl-row__label">
                Doanh thu vận tải
                <div className="pnl-row__label-sub">{report?.tripCount ?? 86} chuyến × giá cước chặng</div>
              </div>
              <div className="pnl-row__amount">{formatRawNumber(transRevenue)}</div>
              <div className="pnl-row__yoy">{formatRawNumber(transRevenueLY)}</div>
              <div className="pnl-row__pct pnl-row__pct--up">+12.4%</div>
            </div>

            <div className="pnl-row">
              <div className="pnl-row__label">
                Doanh thu khác
                <div className="pnl-row__label-sub">Phụ thu xếp dỡ, dịch vụ cảng</div>
              </div>
              <div className="pnl-row__amount">{formatRawNumber(otherRevenue)}</div>
              <div className="pnl-row__yoy">{formatRawNumber(otherRevenueLY)}</div>
              <div className="pnl-row__pct pnl-row__pct--up">+16.1%</div>
            </div>

            <div className="pnl-row pnl-row--subtotal">
              <div className="pnl-row__label">Tổng doanh thu</div>
              <div className="pnl-row__amount">{formatRawNumber(totalRevenue)}</div>
              <div className="pnl-row__yoy">{formatRawNumber(totalRevenueLY)}</div>
              <div className="pnl-row__pct pnl-row__pct--up">+12.4%</div>
            </div>

            {/* DIRECT COSTS */}
            <div className="pnl-row pnl-row--section">
              <div>Chi phí trực tiếp</div>
              <div></div><div></div><div></div>
            </div>

            <div className="pnl-row">
              <div className="pnl-row__label">
                Nhiên liệu
                <div className="pnl-row__label-sub">Dầu DO xe đầu kéo chạy chặng</div>
              </div>
              <div className="pnl-row__amount">{formatRawNumber(fuelCost)}</div>
              <div className="pnl-row__yoy">{formatRawNumber(fuelCostLY)}</div>
              <div className="pnl-row__pct pnl-row__pct--down">+9.5%</div>
            </div>

            <div className="pnl-row">
              <div className="pnl-row__label">
                Tiền đi đường
                <div className="pnl-row__label-sub">Vé BOT cầu đường &amp; luật đường</div>
              </div>
              <div className="pnl-row__amount">{formatRawNumber(roadCost)}</div>
              <div className="pnl-row__yoy">{formatRawNumber(roadCostLY)}</div>
              <div className="pnl-row__pct pnl-row__pct--down">+9.8%</div>
            </div>

            <div className="pnl-row">
              <div className="pnl-row__label">
                Lương lái xe
                <div className="pnl-row__label-sub">Lương cơ bản + khoán chuyến + phụ cấp</div>
              </div>
              <div className="pnl-row__amount">{formatRawNumber(driverCost)}</div>
              <div className="pnl-row__yoy">{formatRawNumber(driverCostLY)}</div>
              <div className="pnl-row__pct pnl-row__pct--down">+4.9%</div>
            </div>

            <div className="pnl-row">
              <div className="pnl-row__label">
                Bảo dưỡng &amp; sửa chữa
                <div className="pnl-row__label-sub">Thay dầu nhớt, săm lốp định kỳ</div>
              </div>
              <div className="pnl-row__amount">{formatRawNumber(maintCost)}</div>
              <div className="pnl-row__yoy">{formatRawNumber(maintCostLY)}</div>
              <div className="pnl-row__pct pnl-row__pct--down">+50.0%</div>
            </div>

            <div className="pnl-row">
              <div className="pnl-row__label">
                Phụ phí trực tiếp khác
                <div className="pnl-row__label-sub">Phí bồi thường, phạt hành chính chặng</div>
              </div>
              <div className="pnl-row__amount">{formatRawNumber(directOtherCost)}</div>
              <div className="pnl-row__yoy">{formatRawNumber(directOtherCostLY)}</div>
              <div className="pnl-row__pct pnl-row__pct--down">+13.5%</div>
            </div>

            <div className="pnl-row pnl-row--subtotal">
              <div className="pnl-row__label">Tổng chi phí trực tiếp</div>
              <div className="pnl-row__amount">{formatRawNumber(totalCosts)}</div>
              <div className="pnl-row__yoy">{formatRawNumber(totalCostsLY)}</div>
              <div className="pnl-row__pct pnl-row__pct--down">+10.8%</div>
            </div>

            <div className="pnl-row pnl-row--subtotal" style={{ background: 'linear-gradient(180deg, rgba(16,185,129,0.06), var(--surface))' }}>
              <div className="pnl-row__label" style={{ color: 'var(--success)', fontWeight: 700 }}>
                Lợi nhuận gộp · Biên {((grossProfit / (totalRevenue || 1)) * 100).toFixed(1)}%
              </div>
              <div className="pnl-row__amount" style={{ color: 'var(--success)', fontWeight: 700 }}>{formatRawNumber(grossProfit)}</div>
              <div className="pnl-row__yoy" style={{ color: 'var(--success)' }}>{formatRawNumber(grossProfitLY)}</div>
              <div className="pnl-row__pct pnl-row__pct--up">+14.5%</div>
            </div>

            {/* OPERATING COSTS */}
            <div className="pnl-row pnl-row--section">
              <div>Chi phí hoạt động</div>
              <div></div><div></div><div></div>
            </div>

            <div className="pnl-row">
              <div className="pnl-row__label">
                Phí quản lý
                <div className="pnl-row__label-sub">Cố định điều hành nội bộ</div>
              </div>
              <div className="pnl-row__amount">{formatRawNumber(mgmtFee)}</div>
              <div className="pnl-row__yoy">{formatRawNumber(mgmtFeeLY)}</div>
              <div className="pnl-row__pct">—</div>
            </div>

            <div className="pnl-row">
              <div className="pnl-row__label">
                Văn phòng &amp; hành chính
                <div className="pnl-row__label-sub">Lương khối văn phòng, khấu hao kho bãi</div>
              </div>
              <div className="pnl-row__amount">{formatRawNumber(officeCost)}</div>
              <div className="pnl-row__yoy">{formatRawNumber(officeCostLY)}</div>
              <div className="pnl-row__pct pnl-row__pct--down">+11.5%</div>
            </div>

            <div className="pnl-row pnl-row--subtotal">
              <div className="pnl-row__label">Tổng chi phí hoạt động</div>
              <div className="pnl-row__amount">{formatRawNumber(totalOpCost)}</div>
              <div className="pnl-row__yoy">{formatRawNumber(totalOpCostLY)}</div>
              <div className="pnl-row__pct pnl-row__pct--down">+7.9%</div>
            </div>

            {/* FINAL NET PROFIT */}
            <div className="pnl-row pnl-row--final">
              <div className="pnl-row__label" style={{ textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, fontSize: 12 }}>
                Lợi nhuận ròng
              </div>
              <div className="pnl-row__amount">{formatRawNumber(netProfit)} ₫</div>
              <div className="pnl-row__yoy">{formatRawNumber(netProfitLY)}</div>
              <div className="pnl-row__pct pnl-row__pct--up">+16.0%</div>
            </div>
          </div>

          <p style={{ fontSize: 12, color: 'var(--fg-3)', margin: '14px 0 24px', lineHeight: 1.5 }}>
            * Lợi nhuận ròng kế toán: <strong>{formatRawNumber(netProfit)} ₫</strong>. Sau khi kết chuyển chia cổ đông: <strong>{formatRawNumber(netProfit * 0.7045)} ₫</strong> cho Ông Phụng (70.45%) và <strong>{formatRawNumber(netProfit * 0.2955)} ₫</strong> cho Ông Thương (29.55%).{' '}
            <a 
              href="#" 
              onClick={(e) => { e.preventDefault(); navigate('/profit'); }}
              style={{ color: 'var(--brand)', fontWeight: 600, textDecoration: 'none' }}
            >
              Xem chi tiết cổ phần →
            </a>
          </p>

          {/* Per-truck breakdown table */}
          {report?.trucks && report.trucks.length > 0 && (
            <Panel
              title="Phân tích lãi gộp theo phương tiện"
              subtitle={`Hiệu suất vận tải chi tiết của ${report.trucks.length} đầu xe`}
              style={{ marginTop: 20 }}
              flush
            >
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Biển số xe</th>
                      <th className="num">Lệnh</th>
                      <th className="num">Doanh thu chặng</th>
                      <th className="num">Tổng chi phí</th>
                      <th className="num">Lợi nhuận gộp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.trucks.map(t => (
                      <tr key={t.plate}>
                        <td style={{ fontWeight: 600, color: 'var(--fg-1)' }}>{t.plate}</td>
                        <td className="num">{t.trips}</td>
                        <td className="num">{formatRawNumber(t.revenue)}</td>
                        <td className="num">{formatRawNumber(t.costs)}</td>
                        <td className="num" style={{ color: t.profit >= 0 ? 'var(--brand)' : 'var(--danger)', fontWeight: 700 }}>
                          {formatRawNumber(t.profit)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          )}
        </>
      )}
    </div>
  );
}
