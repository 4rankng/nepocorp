import { Panel } from '../../components/UI';
import { formatNumber } from '../../lib/format';

export interface CategoryBreakdownRow {
  categoryName: string;
  total: number;
}

interface FinanceCategoryPanelProps {
  categoryBreakdown: CategoryBreakdownRow[];
  month: number;
  year: number;
}

export function FinanceCategoryPanel({ categoryBreakdown, month, year }: FinanceCategoryPanelProps) {
  if (categoryBreakdown.length === 0) return null;

  return (
    <Panel
      title="Cơ cấu chi phí theo hạng mục"
      subtitle={`Tổng hợp chi phí ${String(month).padStart(2, '0')}/${String(year).slice(-2)} phân theo loại`}
      style={{ marginTop: 20 }}
      flush
    >
      <div className="table-scroll finance-category-scroll">
        <table className="finance-category-table" aria-label="Cơ cấu chi phí theo hạng mục">
          <thead>
            <tr>
              <th>Hạng mục</th>
              <th className="num" style={{ width: 200 }}>Tổng chi phí</th>
              <th style={{ width: 200 }}>Tỷ trọng</th>
            </tr>
          </thead>
          <tbody>
            {(() => {
              const grandTotal = categoryBreakdown.reduce((s, c) => s + c.total, 0) || 1;
              return categoryBreakdown.map((cat, i) => {
                const pct = (cat.total / grandTotal) * 100;
                return (
                  <tr key={i}>
                    <td style={{ fontWeight: 600, color: 'var(--fg-1)' }}>{cat.categoryName}</td>
                    <td className="num" data-label="Tổng chi phí">{formatNumber(cat.total)} ₫</td>
                    <td data-label="Tỷ trọng">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 8, borderRadius: 4, background: 'var(--border)', overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', borderRadius: 4, background: 'var(--brand)' }} />
                        </div>
                        <span style={{ fontSize: 'var(--fs-body)', fontWeight: 600, color: 'var(--fg-2)', minWidth: 40, textAlign: 'right' }}>
                          {pct.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              });
            })()}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
