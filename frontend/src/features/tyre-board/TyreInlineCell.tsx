import { useEffect, useRef, useState } from "react";

/** ISO 'YYYY-MM-DD' → 'dd/MM/yyyy' ('' / null stays '—'). */
function fmtISO(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return y && m && d ? `${d}/${m}/${y}` : iso;
}

/**
 * Inline-editable cell. Saves on blur/Enter only when the draft differs from
 * the server value; Esc reverts. Data entry only — writes no history row.
 *
 * Date cells render as quiet text ("25/06/2025" / "—") and swap to the real
 * <input type=date> only while editing — an always-on native date input
 * paints a wide "dd/mm/yyyy" placeholder per empty row.
 *
 * Moved verbatim out of TyreBoardPage so the SVG diagram (TyreTruckDiagram)
 * can embed the same editor inside <foreignObject>.
 */
export function InlineCell({ value, onCommit, type = "text", placeholder, className, ariaLabel }: {
  value: string | null;
  onCommit: (raw: string) => void;
  type?: "text" | "date";
  placeholder?: string;
  className?: string;
  /** Accessible name — required for the serial editors embedded in the SVG. */
  ariaLabel?: string;
}) {
  const [draft, setDraft] = useState(value ?? "");
  const [editing, setEditing] = useState(false);
  const escRef = useRef(false);

  useEffect(() => {
    if (!editing) setDraft(value ?? "");
  }, [value, editing]);

  if (type === "date" && !editing) {
    return (
      <span
        className={className ? `tbp-cell-input tbp-cell-quiet ${className}` : "tbp-cell-input tbp-cell-quiet"}
        tabIndex={0}
        aria-label={ariaLabel}
        title="Bấm để chọn ngày thay"
        onClick={() => setEditing(true)}
        onFocus={() => setEditing(true)}
      >
        {fmtISO(value)}
      </span>
    );
  }

  return (
    <input
      type={type}
      className={className ? `tbp-cell-input ${className}` : "tbp-cell-input"}
      value={draft}
      placeholder={placeholder}
      aria-label={ariaLabel}
      autoFocus={type === "date"}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (escRef.current) {
          escRef.current = false;
          setDraft(value ?? "");
          setEditing(false);
          return;
        }
        setEditing(false);
        if (draft !== (value ?? "")) onCommit(draft);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
        else if (e.key === "Escape") {
          escRef.current = true;
          (e.currentTarget as HTMLInputElement).blur();
        }
      }}
    />
  );
}
