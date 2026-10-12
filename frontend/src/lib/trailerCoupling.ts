/**
 * Secondary info on a trailer (rơ-moóc) row: the tractor (xe đầu kéo) currently
 * holding it, or "— trống" when it is unpaired. Every dropdown that lists
 * trailers appends this so staff can pick the right one at a glance instead of
 * grabbing a trailer that is already out on a run (kanban 091026010130).
 *
 * Shared because the wording must read identically on every surface: the fleet
 * truck dialog, the expense rơ-moóc picker, the tire transfer picker and the
 * schedule vehicle picker.
 */
export function trailerCouplingSuffix(tractorPlate: string | null | undefined): string {
  return tractorPlate ? ` — đang ghép ${tractorPlate}` : ' — trống';
}
