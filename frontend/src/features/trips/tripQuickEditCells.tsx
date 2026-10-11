// Small cell inputs used by the trip-list quick-edit columns. Kept in their own
// component-only module so `tripColumns.tsx` (which exports the column builders
// + the row-style helper) has no local components — React Fast Refresh.

export function QuickMoneyInput({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <input
      className="quick-money-input"
      type="text"
      inputMode="numeric"
      value={value}
      disabled={disabled}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
