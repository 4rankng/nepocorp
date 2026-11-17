import { useEffect, useRef, useState } from "react";

/**
 * Inline-editable cell. Saves on blur/Enter only when the draft differs from
 * the server value; Esc reverts. Data entry only — writes no history row.
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

  return (
    <input
      type={type}
      className={className ? `tbp-cell-input ${className}` : "tbp-cell-input"}
      value={draft}
      placeholder={placeholder}
      aria-label={ariaLabel}
      onChange={(e) => setDraft(e.target.value)}
      onFocus={() => setEditing(true)}
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
