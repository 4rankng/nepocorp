/**
 * NEPO-49 — Tyre-position mapping + drawing geometry for TyreTruckDiagram.
 *
 * Canonical mapping (from the accountant's Excel, docs/design/THEO-DOI-LOP.xlsx):
 * 22 slots ↔ 22 drawn tire units, 1:1.
 *
 * | Positions      | Unit                                | Drawn as                      |
 * |----------------|-------------------------------------|-------------------------------|
 * | 1, 2           | steer axle, left / right            | single tire each              |
 * | 3, 4, 5, 6     | drive tandem dual-pair per axle per | one wide dual-pair rect each  |
 * |                | side: 3 = front-axle left,          |                               |
 * |                | 4 = rear-axle left,                 |                               |
 * |                | 5 = rear-axle right,                |                               |
 * |                | 6 = front-axle right                |                               |
 * | 7, 8, 9, 10    | spare (dự phòng), stacked at the    | small spare tires,            |
 * |                | catwalk between tractor and trailer | vertical stack 7→10           |
 * | 11–14          | trailer axle 1: N = left-outer,     | individual dual tires         |
 * | 15–18          | trailer axle 2: N+1 = left-inner,   | "                             |
 * | 19–22          | trailer axle 3: N+2 = right-inner,  | "                             |
 * |                | N+3 = right-outer                   |                               |
 *
 * On the horizontal drawing the truck's left side is the TOP edge; in the
 * portrait variant it is the LEFT column. Serial input boxes sit OUTSIDE the
 * drawing body (staggered rows where duals would collide; spare serials to the
 * right of / left of the spare stack, overlapping the trailer front — the
 * Excel does the same).
 */

/** Static label per slot for the hover tooltip (the Excel only shows numbers). */
export const SLOT_GROUP_BY_POSITION: Record<number, string> = {
  1: "Trục trước", 2: "Trục trước",
  3: "Trục động", 4: "Trục động", 5: "Trục động", 6: "Trục động",
  7: "Dự phòng thân", 8: "Dự phòng thân", 9: "Dự phòng thân", 10: "Dự phòng thân",
  11: "Rơ-moóc trục 1", 12: "Rơ-moóc trục 1", 13: "Rơ-moóc trục 1", 14: "Rơ-moóc trục 1",
  15: "Rơ-moóc trục 2", 16: "Rơ-moóc trục 2", 17: "Rơ-moóc trục 2", 18: "Rơ-moóc trục 2",
  19: "Rơ-moóc trục 3", 20: "Rơ-moóc trục 3", 21: "Rơ-moóc trục 3", 22: "Rơ-moóc trục 3",
};

/** Ô 7–10 = dự phòng thân xe (per the Excel's G group) — drawn yellow/dashed. */
export const SPARE_POSITIONS: Record<number, true> = { 7: true, 8: true, 9: true, 10: true };

export const ALL_POSITIONS: number[] = Array.from({ length: 22 }, (_, i) => i + 1);

/** Height of every serial input box, in SVG user units. */
export const SERIAL_H = 16;

/** One drawn tire unit: tire shape bbox + its serial input box. */
export interface MarkerGeom {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Draw the tire as a circle inscribed in the bbox (spare stack). */
  circle?: boolean;
  /** Dual pair: draw a second identical pill offset `dx` (horizontal view) or
   * `dy` (portrait view) — always along the travel axis; the position numeral
   * centers between the two pills. */
  pair?: { dx?: number; dy?: number };
  /** Red position numeral anchor, outside the pill (horizontal mockup).
   * Omitted → numeral centers on the pill (portrait). */
  num?: { x: number; y: number };
  serial: { x: number; y: number; w: number };
}

/**
 * Horizontal variant — slot table copied from the owner's mockup
 * (viewBox 30 55 1270 905): pill 84x22 at (x0, yc-11), serial ON the pill
 * (x0+1, yc-8, w82), red numeral at (x0+74, ly) outside the pill.
 */
export const TOP_VIEW_LAYOUT: Record<number, MarkerGeom> = {
  1: { x: 83, y: 659, w: 84, h: 22, num: { x: 175, y: 646 }, serial: { x: 84, y: 662, w: 82 } },
  2: { x: 83, y: 827, w: 84, h: 22, num: { x: 175, y: 870 }, serial: { x: 84, y: 830, w: 82 } },
  3: { x: 393, y: 659, w: 84, h: 22, num: { x: 467, y: 646 }, serial: { x: 394, y: 662, w: 82 } },
  4: { x: 393, y: 686, w: 84, h: 22, num: { x: 467, y: 730 }, serial: { x: 394, y: 689, w: 82 } },
  5: { x: 393, y: 799, w: 84, h: 22, num: { x: 467, y: 786 }, serial: { x: 394, y: 802, w: 82 } },
  6: { x: 393, y: 827, w: 84, h: 22, num: { x: 467, y: 870 }, serial: { x: 394, y: 830, w: 82 } },
  7: { x: 491, y: 659, w: 84, h: 22, num: { x: 565, y: 646 }, serial: { x: 492, y: 662, w: 82 } },
  8: { x: 491, y: 686, w: 84, h: 22, num: { x: 565, y: 730 }, serial: { x: 492, y: 689, w: 82 } },
  9: { x: 491, y: 799, w: 84, h: 22, num: { x: 565, y: 786 }, serial: { x: 492, y: 802, w: 82 } },
  10: { x: 491, y: 827, w: 84, h: 22, num: { x: 565, y: 870 }, serial: { x: 492, y: 830, w: 82 } },
  11: { x: 941, y: 659, w: 84, h: 22, num: { x: 1015, y: 646 }, serial: { x: 942, y: 662, w: 82 } },
  12: { x: 941, y: 686, w: 84, h: 22, num: { x: 1015, y: 730 }, serial: { x: 942, y: 689, w: 82 } },
  13: { x: 941, y: 799, w: 84, h: 22, num: { x: 1015, y: 786 }, serial: { x: 942, y: 802, w: 82 } },
  14: { x: 941, y: 827, w: 84, h: 22, num: { x: 1015, y: 870 }, serial: { x: 942, y: 830, w: 82 } },
  15: { x: 1038, y: 659, w: 84, h: 22, num: { x: 1112, y: 646 }, serial: { x: 1039, y: 662, w: 82 } },
  16: { x: 1038, y: 686, w: 84, h: 22, num: { x: 1112, y: 730 }, serial: { x: 1039, y: 689, w: 82 } },
  17: { x: 1038, y: 799, w: 84, h: 22, num: { x: 1112, y: 786 }, serial: { x: 1039, y: 802, w: 82 } },
  18: { x: 1038, y: 827, w: 84, h: 22, num: { x: 1112, y: 870 }, serial: { x: 1039, y: 830, w: 82 } },
  19: { x: 1133, y: 659, w: 84, h: 22, num: { x: 1207, y: 646 }, serial: { x: 1134, y: 662, w: 82 } },
  20: { x: 1133, y: 686, w: 84, h: 22, num: { x: 1207, y: 730 }, serial: { x: 1134, y: 689, w: 82 } },
  21: { x: 1133, y: 799, w: 84, h: 22, num: { x: 1207, y: 786 }, serial: { x: 1134, y: 802, w: 82 } },
  22: { x: 1133, y: 827, w: 84, h: 22, num: { x: 1207, y: 870 }, serial: { x: 1134, y: 830, w: 82 } },
};

/**
 * Portrait variant — the same mockup slots rotated 90 degrees (the mockup's
 * own mobile transform): pill 22x84 at (964-yc, x0), viewBox 0 0 390 1250.
 * Serials sit in the readable gaps below/beside their pill rows (horizontal
 * text); numerals stay centered on the pills.
 */
export const PORTRAIT_LAYOUT: Record<number, MarkerGeom> = {
  // Steer row — serials below the pills.
  1: { x: 294, y: 83, w: 22, h: 84, serial: { x: 263, y: 171, w: 84 } },
  2: { x: 126, y: 83, w: 22, h: 84, serial: { x: 95, y: 171, w: 84 } },
  // Drive tandem row — serials staggered on two sub-rows above the pills
// (pill pitch 27 < serial width 84, so neighbors alternate height).
  3: { x: 294, y: 393, w: 22, h: 84, serial: { x: 263, y: 371, w: 84 } },
  4: { x: 267, y: 393, w: 22, h: 84, serial: { x: 236, y: 352, w: 84 } },
  5: { x: 154, y: 393, w: 22, h: 84, serial: { x: 123, y: 371, w: 84 } },
  6: { x: 126, y: 393, w: 22, h: 84, serial: { x: 95, y: 352, w: 84 } },
  // Spares row — serials staggered on two sub-rows below the pills.
  7: { x: 294, y: 491, w: 22, h: 84, serial: { x: 263, y: 579, w: 84 } },
  8: { x: 267, y: 491, w: 22, h: 84, serial: { x: 236, y: 598, w: 84 } },
  9: { x: 154, y: 491, w: 22, h: 84, serial: { x: 123, y: 579, w: 84 } },
  10: { x: 126, y: 491, w: 22, h: 84, serial: { x: 95, y: 598, w: 84 } },
  // Trailer axles — serials stacked in the left lane, one per pill, ordered
  // top-to-bottom to match the pills right-to-left.
  11: { x: 294, y: 941, w: 22, h: 84, serial: { x: 4, y: 949, w: 118 } },
  12: { x: 267, y: 941, w: 22, h: 84, serial: { x: 4, y: 969, w: 118 } },
  13: { x: 154, y: 941, w: 22, h: 84, serial: { x: 4, y: 989, w: 118 } },
  14: { x: 126, y: 941, w: 22, h: 84, serial: { x: 4, y: 1009, w: 118 } },
  15: { x: 294, y: 1038, w: 22, h: 84, serial: { x: 4, y: 1046, w: 118 } },
  16: { x: 267, y: 1038, w: 22, h: 84, serial: { x: 4, y: 1066, w: 118 } },
  17: { x: 154, y: 1038, w: 22, h: 84, serial: { x: 4, y: 1086, w: 118 } },
  18: { x: 126, y: 1038, w: 22, h: 84, serial: { x: 4, y: 1106, w: 118 } },
  19: { x: 294, y: 1133, w: 22, h: 84, serial: { x: 4, y: 1141, w: 118 } },
  20: { x: 267, y: 1133, w: 22, h: 84, serial: { x: 4, y: 1161, w: 118 } },
  21: { x: 154, y: 1133, w: 22, h: 84, serial: { x: 4, y: 1181, w: 118 } },
  22: { x: 126, y: 1133, w: 22, h: 84, serial: { x: 4, y: 1201, w: 118 } },
};
