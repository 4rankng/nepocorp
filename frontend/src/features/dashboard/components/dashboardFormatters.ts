// Pure formatters + label/icon lookups for the dashboard. Split out of
// `dashboard-presenters.tsx` so that module exports only components (React Fast
// Refresh).

export const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Chào buổi sáng';
  if (hour < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
};

export const fmtVN = (value: number) => Math.round(value).toLocaleString('vi-VN');

export const runningSum = (values: number[]): number[] => {
  let total = 0;
  return values.map((value) => (total += value));
};

/** Compact millions formatter for the hero chart's y-axis and the inline KPI
 *  cluster (NEPO-25 verdict §a: "format 'tr' gọn"). Receives values already
 *  plotted in millions: 226 → "226tr", 0 → "0tr". Tooltips keep full VND. */
export const fmtMillionsTr = (valueMillions: number): string => `${Math.round(valueMillions)}tr`;
