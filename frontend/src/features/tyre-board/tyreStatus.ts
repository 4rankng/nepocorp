import type { TyreBoardSlot } from "@tingting/shared";
import { daysBetween } from "../tires/tireUtils";

/** Age cutoffs (days since ngày thay) driving the pill colors — the sheet
 *  tracks tuổi lốp; thresholds mirror the board mockup's good/warn/bad. */
const AGE_WARN_DAYS = 365;
const AGE_BAD_DAYS = 730;

export type TyreStatus = "good" | "warn" | "bad" | "empty";

/** Health class of one slot: serial presence + age since ngày thay. */
export function tyreStatus(slot: TyreBoardSlot | undefined): TyreStatus {
  const age = slot?.serial ? daysBetween(slot.lastChangedAt, null) : null;
  if (!slot?.serial || age == null) return "empty";
  if (age >= AGE_BAD_DAYS) return "bad";
  if (age >= AGE_WARN_DAYS) return "warn";
  return "good";
}
