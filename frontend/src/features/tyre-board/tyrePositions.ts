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
 * Horizontal variant, viewBox 1100 × 470: decorative side view y 0–190,
 * top view y 200–470. Left side of the truck = top edge (serial rows y 200/218),
 * right side = bottom edge (serial rows y 436/454). Wheel pills straddle the
 * body outline edges (the edges are the axle lines), like the Excel.
 */
export const TOP_VIEW_LAYOUT: Record<number, MarkerGeom> = {
  // Steer axle — tall single pills centered on the body's top/bottom edges.
  1: { x: 132, y: 236, w: 16, h: 44, serial: { x: 92, y: 200, w: 110 } },
  2: { x: 132, y: 390, w: 16, h: 44, serial: { x: 92, y: 454, w: 110 } },
  // Drive tandem — dual pairs (two pills per position) on the axle edges.
  3: { x: 288, y: 240, w: 16, h: 38, pair: { dx: 20 }, serial: { x: 246, y: 200, w: 110 } },
  4: { x: 388, y: 240, w: 16, h: 38, pair: { dx: 20 }, serial: { x: 356, y: 218, w: 110 } },
  5: { x: 388, y: 392, w: 16, h: 38, pair: { dx: 20 }, serial: { x: 356, y: 436, w: 110 } },
  6: { x: 288, y: 392, w: 16, h: 38, pair: { dx: 20 }, serial: { x: 246, y: 454, w: 110 } },
  // Spares — vertical pill stack at the catwalk, serials to the right
  // (overlapping the trailer front, like the Excel).
  7: { x: 472, y: 264, w: 20, h: 26, serial: { x: 505, y: 266, w: 110 } },
  8: { x: 472, y: 296, w: 20, h: 26, serial: { x: 505, y: 298, w: 110 } },
  9: { x: 472, y: 328, w: 20, h: 26, serial: { x: 505, y: 330, w: 110 } },
  10: { x: 472, y: 360, w: 20, h: 26, serial: { x: 505, y: 362, w: 110 } },
  // Trailer axles 1–3 — one pill per marker (individual duals, per the locked
  // position semantics): outer dual straddles the slab edge, inner sits just
  // inside. Serial columns w 72 at x 764/844/924 leave 8-unit gaps.
  11: { x: 792, y: 238, w: 16, h: 36, serial: { x: 764, y: 200, w: 72 } },
  12: { x: 792, y: 278, w: 16, h: 36, serial: { x: 764, y: 218, w: 72 } },
  13: { x: 792, y: 356, w: 16, h: 36, serial: { x: 764, y: 436, w: 72 } },
  14: { x: 792, y: 396, w: 16, h: 36, serial: { x: 764, y: 454, w: 72 } },
  15: { x: 872, y: 238, w: 16, h: 36, serial: { x: 844, y: 200, w: 72 } },
  16: { x: 872, y: 278, w: 16, h: 36, serial: { x: 844, y: 218, w: 72 } },
  17: { x: 872, y: 356, w: 16, h: 36, serial: { x: 844, y: 436, w: 72 } },
  18: { x: 872, y: 396, w: 16, h: 36, serial: { x: 844, y: 454, w: 72 } },
  19: { x: 952, y: 238, w: 16, h: 36, serial: { x: 924, y: 200, w: 72 } },
  20: { x: 952, y: 278, w: 16, h: 36, serial: { x: 924, y: 218, w: 72 } },
  21: { x: 952, y: 356, w: 16, h: 36, serial: { x: 924, y: 436, w: 72 } },
  22: { x: 952, y: 396, w: 16, h: 36, serial: { x: 924, y: 454, w: 72 } },
};

/**
 * Portrait variant, viewBox 470 × 850: truck nose-up, tractor y 20–280,
 * trailer y 300–830. Left column of the truck = left edge (serial boxes
 * x 5…, right column x 361/389), serial text stays horizontal. Side view is
 * omitted — a rotated side view with 11 labels is illegible at phone width.
 */
export const PORTRAIT_LAYOUT: Record<number, MarkerGeom> = {
  // Steer axle — vertical single pills straddling the cab's side edges.
  1: { x: 141, y: 30, w: 18, h: 44, serial: { x: 5, y: 42, w: 104 } },
  2: { x: 311, y: 30, w: 18, h: 44, serial: { x: 361, y: 42, w: 104 } },
  // Drive tandem — vertical dual pairs stacked along the travel axis, on the
  // body's side edges: 3/4 = left (front/rear axle), 6/5 = right.
  3: { x: 151, y: 120, w: 18, h: 34, pair: { dy: 38 }, serial: { x: 5, y: 182, w: 76 } },
  4: { x: 151, y: 204, w: 18, h: 34, pair: { dy: 38 }, serial: { x: 5, y: 232, w: 76 } },
  5: { x: 301, y: 204, w: 18, h: 34, pair: { dy: 38 }, serial: { x: 389, y: 232, w: 76 } },
  6: { x: 301, y: 120, w: 18, h: 34, pair: { dy: 38 }, serial: { x: 389, y: 182, w: 76 } },
  // Spares — circle stack at the catwalk, serials to the left.
  7: { x: 224, y: 281, w: 22, h: 22, circle: true, serial: { x: 5, y: 283, w: 104 } },
  8: { x: 224, y: 307, w: 22, h: 22, circle: true, serial: { x: 5, y: 309, w: 104 } },
  9: { x: 224, y: 333, w: 22, h: 22, circle: true, serial: { x: 5, y: 335, w: 104 } },
  10: { x: 224, y: 359, w: 22, h: 22, circle: true, serial: { x: 5, y: 361, w: 104 } },
  // Trailer axles 1–3 — vertical pills per marker: outer duals straddle the
  // slab's side edges, inner duals sit just inside (same pattern as the
  // horizontal view, rotated 90°).
  11: { x: 132, y: 668, w: 16, h: 44, serial: { x: 5, y: 676, w: 104 } },
  12: { x: 172, y: 668, w: 16, h: 44, serial: { x: 5, y: 704, w: 104 } },
  13: { x: 282, y: 668, w: 16, h: 44, serial: { x: 361, y: 704, w: 104 } },
  14: { x: 322, y: 668, w: 16, h: 44, serial: { x: 361, y: 676, w: 104 } },
  15: { x: 132, y: 728, w: 16, h: 44, serial: { x: 5, y: 736, w: 104 } },
  16: { x: 172, y: 728, w: 16, h: 44, serial: { x: 5, y: 764, w: 104 } },
  17: { x: 282, y: 728, w: 16, h: 44, serial: { x: 361, y: 764, w: 104 } },
  18: { x: 322, y: 728, w: 16, h: 44, serial: { x: 361, y: 736, w: 104 } },
  19: { x: 132, y: 788, w: 16, h: 44, serial: { x: 5, y: 796, w: 104 } },
  20: { x: 172, y: 788, w: 16, h: 44, serial: { x: 5, y: 824, w: 104 } },
  21: { x: 282, y: 788, w: 16, h: 44, serial: { x: 361, y: 824, w: 104 } },
  22: { x: 322, y: 788, w: 16, h: 44, serial: { x: 361, y: 796, w: 104 } },
};
