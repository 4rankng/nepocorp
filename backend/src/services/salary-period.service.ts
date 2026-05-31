import { db } from '../db';
import * as s from '../db/schema';
import { eq, and, isNull, desc } from 'drizzle-orm';
import type { SalaryPeriodRange } from '@nepocorp/shared';

/**
 * Resolve the salary period date range for a given month/year.
 *
 * Resolution order:
 * 1. Per-month override in `salary_periods` table
 * 2. Global default row (default_start_day / default_end_day)
 * 3. Calendar month fallback (1st to last day)
 *
 * Returns inclusive start/end dates as YYYY-MM-DD strings.
 */
export async function resolveSalaryPeriodDateRange(
  month: number,
  year: number,
): Promise<SalaryPeriodRange> {
  // 1. Check for per-month override
  const [override] = await db
    .select()
    .from(s.salaryPeriods)
    .where(
      and(
        eq(s.salaryPeriods.month, month),
        eq(s.salaryPeriods.year, year),
        isNull(s.salaryPeriods.deletedAt),
      ),
    )
    .limit(1);

  if (override?.startDate && override?.endDate) {
    return {
      month,
      year,
      start: override.startDate,
      end: override.endDate,
      label: override.label || `Kỳ lương T${month}/${year} (${formatDateShort(override.startDate)} - ${formatDateShort(override.endDate)})`,
    };
  }

  // 2. Check for global default
  const [defaultRow] = await db
    .select()
    .from(s.salaryPeriods)
    .where(
      and(
        eq(s.salaryPeriods.isDefault, true),
        isNull(s.salaryPeriods.deletedAt),
      ),
    )
    .limit(1);

  if (defaultRow?.defaultStartDay && defaultRow?.defaultEndDay) {
    const { start, end } = deriveFromDefault(
      month,
      year,
      defaultRow.defaultStartDay,
      defaultRow.defaultEndDay,
    );
    return {
      month,
      year,
      start,
      end,
      label: `Kỳ lương T${month}/${year} (${formatDateShort(start)} - ${formatDateShort(end)})`,
    };
  }

  // 3. Calendar month fallback
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return {
    month,
    year,
    start,
    end,
    label: `T${month}/${year} (lịch tháng)`,
  };
}

/**
 * Resolve the overall date range for a quarter using salary periods.
 * A quarter spans 3 salary periods; returns the earliest start and latest end.
 */
export async function resolveQuarterDateRange(
  quarter: number,
  year: number,
): Promise<{ start: string; end: string }> {
  const qStartMonth = (quarter - 1) * 3 + 1;
  const qEndMonth = quarter * 3;

  const periods = await Promise.all([
    resolveSalaryPeriodDateRange(qStartMonth, year),
    resolveSalaryPeriodDateRange(qStartMonth + 1, year),
    resolveSalaryPeriodDateRange(qEndMonth, year),
  ]);

  return {
    start: periods[0].start,
    end: periods[2].end,
  };
}

// ─── CRUD helpers ──────────────────────────────────────────────────────────────

/** Get the global default salary period config row */
export async function getSalaryPeriodDefault() {
  const [row] = await db
    .select()
    .from(s.salaryPeriods)
    .where(
      and(
        eq(s.salaryPeriods.isDefault, true),
        isNull(s.salaryPeriods.deletedAt),
      ),
    )
    .limit(1);
  return row ?? null;
}

/** Upsert the global default salary period config */
export async function updateSalaryPeriodDefault(
  defaultStartDay: number,
  defaultEndDay: number,
) {
  const existing = await getSalaryPeriodDefault();
  const values = {
    isDefault: true,
    defaultStartDay,
    defaultEndDay,
    month: null,
    year: null,
    startDate: null,
    endDate: null,
    updatedAt: new Date(),
  };

  if (existing) {
    const [updated] = await db
      .update(s.salaryPeriods)
      .set(values)
      .where(eq(s.salaryPeriods.id, existing.id))
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(s.salaryPeriods)
    .values(values)
    .returning();
  return created;
}

/** List all per-month salary period overrides (non-default, non-deleted) */
export async function getSalaryPeriodOverrides() {
  return db
    .select()
    .from(s.salaryPeriods)
    .where(
      and(
        eq(s.salaryPeriods.isDefault, false),
        isNull(s.salaryPeriods.deletedAt),
      ),
    )
    .orderBy(desc(s.salaryPeriods.year), desc(s.salaryPeriods.month));
}

/** Create or update a per-month salary period override */
export async function upsertSalaryPeriodOverride(
  month: number,
  year: number,
  startDate: string,
  endDate: string,
  label?: string,
) {
  // Check for existing override for this month/year
  const [existing] = await db
    .select()
    .from(s.salaryPeriods)
    .where(
      and(
        eq(s.salaryPeriods.month, month),
        eq(s.salaryPeriods.year, year),
        eq(s.salaryPeriods.isDefault, false),
        isNull(s.salaryPeriods.deletedAt),
      ),
    )
    .limit(1);

  const values = {
    month,
    year,
    startDate,
    endDate,
    label: label || null,
    isDefault: false,
    defaultStartDay: null,
    defaultEndDay: null,
    updatedAt: new Date(),
  };

  if (existing) {
    const [updated] = await db
      .update(s.salaryPeriods)
      .set(values)
      .where(eq(s.salaryPeriods.id, existing.id))
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(s.salaryPeriods)
    .values(values)
    .returning();
  return created;
}

/** Soft-delete a salary period override */
export async function deleteSalaryPeriodOverride(id: number) {
  const [deleted] = await db
    .update(s.salaryPeriods)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(s.salaryPeriods.id, id))
    .returning();
  return deleted ?? null;
}

// ─── Internal helpers ──────────────────────────────────────────────────────────

/**
 * Derive start/end dates from the global default rule.
 * Salary month N = day `startDay` of month N-1 through day `endDay` of month N.
 * Handles year boundary (e.g., January salary period starts in December).
 */
function deriveFromDefault(
  month: number,
  year: number,
  startDay: number,
  endDay: number,
): { start: string; end: string } {
  // Start: day `startDay` of the PREVIOUS month
  let startMonth = month - 1;
  let startYear = year;
  if (startMonth === 0) {
    startMonth = 12;
    startYear = year - 1;
  }

  const start = `${startYear}-${String(startMonth).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`;

  // Clamp endDay to actual days in the target month to avoid invalid dates like '2026-02-31'
  const maxDay = new Date(year, month, 0).getDate(); // last day of month
  const clampedEndDay = Math.min(endDay, maxDay);
  const end = `${year}-${String(month).padStart(2, '0')}-${String(clampedEndDay).padStart(2, '0')}`;

  return { start, end };
}

/** Format a YYYY-MM-DD date as DD/MM for display in labels */
function formatDateShort(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}`;
}
