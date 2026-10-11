// DD/MM/YYYY ↔ ISO date conversion for the DateInput field. Split out of
// `DateInput.tsx` so that module exports only the component (React Fast
// Refresh); the field and its tests import these from here.

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
