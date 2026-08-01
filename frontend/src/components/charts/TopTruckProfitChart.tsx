import { formatNumber } from '../../lib/format';

export interface TopTruckProfitItem {
  name: string;
  profit: number;
}

interface TopTruckProfitChartProps {
  items: TopTruckProfitItem[];
  ariaLabel: string;
}

export function TopTruckProfitChart({ items, ariaLabel }: TopTruckProfitChartProps) {
  const maxProfit = Math.max(...items.map(item => item.profit), 1);
  const minProfit = Math.min(...items.map(item => item.profit), 0);
  const totalRange = maxProfit - minProfit;
  const zeroPercent = minProfit < 0
    ? (Math.abs(minProfit) / totalRange) * 100
    : 0;

  return (
    <div className="finance-top-trucks" role="list" aria-label={ariaLabel}>
      {items.map((item, index) => {
        const isNegative = item.profit < 0;
        const widthPercent = item.profit === 0
          ? 0
          : Math.max(1, (Math.abs(item.profit) / totalRange) * 100);
        const formattedProfit = `${formatNumber(item.profit)}₫`;

        return (
          <div
            key={`${item.name}-${index}`}
            className="finance-top-trucks__row"
            role="listitem"
            aria-label={`${item.name}: ${formattedProfit}`}
          >
            <span className="finance-top-trucks__plate" title={item.name}>{item.name}</span>
            <span className="finance-top-trucks__track" aria-hidden="true">
              {item.profit !== 0 && (
                <span
                  className={`finance-top-trucks__bar${isNegative ? ' finance-top-trucks__bar--negative' : ''}`}
                  style={isNegative
                    ? { right: `${100 - zeroPercent}%`, width: `${widthPercent}%` }
                    : { left: `${zeroPercent}%`, width: `${widthPercent}%` }}
                />
              )}
              {minProfit < 0 && (
                <span className="finance-top-trucks__zero" style={{ left: `${zeroPercent}%` }} />
              )}
            </span>
            <span className={`finance-top-trucks__value${isNegative ? ' finance-top-trucks__value--negative' : ''}`}>
              {formattedProfit}
            </span>
          </div>
        );
      })}
    </div>
  );
}
