import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { CalendarDays } from 'lucide-react';
import './DateInput.css';

/**
 * DateInput — a date field that always reads DD/MM/YYYY.
 *
 * Why not `<input type="date">`: the native control renders its digits in the
 * *browser's* locale (Chrome uses the UI language, page `lang` is ignored), so
 * the same field reads 01/10/2026 on a Vietnamese machine and 10/01/2026 on an
 * en-US one — right next to cards that render DD/MM. That inconsistency was
 * reported as a defect (kanban 101026101520). This field owns its own
 * formatting, so it is locale-independent everywhere.
 *
 * The value contract stays ISO (`yyyy-mm-dd`, `''` when empty) exactly like the
 * native input, and the native picker is still available through the calendar
 * button. Typing accepts `d/m/yyyy`, `dd/mm/yyyy`, `dd-mm-yyyy`, `dd.mm.yyyy`
 * and the eight-digit `ddmmyyyy` run; anything else reverts on blur.
 */

const DMY_PATTERN = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/;
const DIGITS_PATTERN = /^(\d{2})(\d{2})(\d{4})$/;

/** ISO (`yyyy-mm-dd`) → `dd/mm/yyyy`. Empty or malformed → ''. */
export function isoToDmy(iso: string | null | undefined): string {
  if (!iso) return '';
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.slice(0, 10));
  if (!match) return '';
  return `${match[3]}/${match[2]}/${match[1]}`;
}

/** Lenient VN date parser → ISO, or null when the text is not a real date. */
export function parseDmy(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const match = DMY_PATTERN.exec(trimmed) ?? DIGITS_PATTERN.exec(trimmed);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const iso = `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
  // Reject impossible calendar dates (31/02, 30/02…) instead of rolling over.
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day
  ) return null;
  return iso;
}

export interface DateInputProps {
  /** ISO `yyyy-mm-dd`, or `''` for empty. */
  value: string;
  onChange: (iso: string) => void;
  /** Accessible name. */
  label: string;
  /** ISO lower bound (inclusive) — also bounds the native picker. */
  min?: string;
  /** ISO upper bound (inclusive) — also bounds the native picker. */
  max?: string;
  id?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
}

export function DateInput({
  value,
  onChange,
  label,
  min,
  max,
  id,
  className,
  disabled,
  required,
}: DateInputProps) {
  const [text, setText] = useState(() => isoToDmy(value));
  const nativeRef = useRef<HTMLInputElement>(null);

  // Follow external value changes (picker, "Xóa bộ lọc", month switch).
  useEffect(() => {
    setText(isoToDmy(value));
  }, [value]);

  const commit = (raw: string): boolean => {
    const iso = parseDmy(raw);
    if (!iso) return false;
    if ((min && iso < min) || (max && iso > max)) return false;
    if (iso !== value) onChange(iso);
    setText(isoToDmy(iso));
    return true;
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // A complete field ignores further keystrokes instead of slicing the tail
    // off (which silently mangled the value while editing). Focusing selects
    // the whole date, so typing a new one replaces it.
    if (raw.length > 10) return;
    setText(raw);
    // Commit as soon as the field holds a complete, in-range date so filters
    // run without waiting for blur.
    if (raw.length === 10) commit(raw);
  };

  const handleBlur = () => {
    if (!commit(text)) setText(isoToDmy(value));
  };

  const openPicker = () => {
    const el = nativeRef.current;
    if (!el) return;
    try {
      el.showPicker();
    } catch {
      el.focus();
      el.click();
    }
  };

  return (
    <span className={['ds-date-input', className].filter(Boolean).join(' ')}>
      <input
        id={id}
        className="input ds-date-input__text"
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="dd/mm/yyyy"
        aria-label={label}
        value={text}
        onChange={handleChange}
        onFocus={e => e.currentTarget.select()}
        onBlur={handleBlur}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleBlur(); } }}
        disabled={disabled}
        required={required}
      />
      <button
        type="button"
        className="ds-date-input__trigger"
        aria-label={`Mở lịch chọn ngày — ${label}`}
        tabIndex={-1}
        disabled={disabled}
        onClick={openPicker}
      >
        <CalendarDays size={15} aria-hidden="true" />
      </button>
      <input
        ref={nativeRef}
        className="ds-date-input__native"
        type="date"
        tabIndex={-1}
        aria-hidden="true"
        value={value || ''}
        min={min}
        max={max}
        disabled={disabled}
        onChange={e => commit(e.target.value)}
      />
    </span>
  );
}
