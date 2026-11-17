import type { TyreBoardSlot } from "@tingting/shared";
import { InlineCell } from "./TyreInlineCell";
import {
  ALL_POSITIONS,
  PORTRAIT_LAYOUT,
  SERIAL_H,
  SLOT_GROUP_BY_POSITION,
  SPARE_POSITIONS,
  TOP_VIEW_LAYOUT,
  type MarkerGeom,
} from "./tyrePositions";

const TIRE_FILL = "#d9dde3";
const TIRE_STROKE = "#9aa3ad";
const RED = "#d62828";
const MUTED = "#8a99b0";
const OUTLINE = "#c9ccd4";
const PINK_FILL = "#fdeaea";
const PINK_STROKE = "#e5b5b5";
const SLAB_FILL = "#ececf0";

interface Props {
  slots: TyreBoardSlot[];
  vertical: boolean;
  onSerialCommit: (position: number, raw: string) => void;
}

/** Decorative side-view wheel: dark donut, white hub, axle dot. */
function Wheel({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="#adb5be" stroke="#969ea8" strokeWidth={1} />
      <circle cx={cx} cy={cy} r={Math.round(r * 0.42)} fill="#fff" />
      <circle cx={cx} cy={cy} r={3} fill={MUTED} />
    </g>
  );
}

/** Gray numeral annotation on the decorative side view (no badge circle). */
function Callout({ x, y, n }: { x: number; y: number; n: string }) {
  return (
    <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize="12" fill={MUTED} fontWeight={600}>
      {n}
    </text>
  );
}

/**
 * One numbered tire unit: tire pill(s) + bare red position numeral (halo
 * keeps 4.5:1 on the gray pill) + the serial editor embedded in the drawing
 * via <foreignObject>. Dual pairs draw a second pill offset `pair.dx`; the
 * numeral centers between the two pills. Spare tires (ô 7–10) are yellow
 * with a dashed outline; empty slots render at reduced opacity. The full
 * data lives in the <title> tooltip.
 */
function TireMarker({ position, geom, slot, onSerialCommit }: {
  position: number;
  geom: MarkerGeom;
  slot: TyreBoardSlot | undefined;
  onSerialCommit: Props["onSerialCommit"];
}) {
  const spare = SPARE_POSITIONS[position] === true;
  const title = [
    `Ô ${position} — ${SLOT_GROUP_BY_POSITION[position]}`,
    slot?.size,
    slot?.model,
    slot?.note,
  ].filter(Boolean).join(" · ");

  const fill = spare ? "#fffbe9" : TIRE_FILL;
  const stroke = spare ? "#b5a13a" : TIRE_STROKE;
  const dash = spare ? "4 3" : undefined;
  const opacity = slot?.serial ? 1 : 0.45;
  const cx = geom.x + geom.w / 2 + (geom.pair ? geom.pair.dx / 2 : 0);
  const cy = geom.y + geom.h / 2;
  const pill = (px: number) => (
    <rect
      x={px}
      y={geom.y}
      width={geom.w}
      height={geom.h}
      rx={geom.h / 2}
      fill={fill}
      stroke={stroke}
      strokeDasharray={dash}
      opacity={opacity}
    />
  );

  return (
    <g className={`tbp-svg-marker${spare ? " tbp-svg-marker--spare" : ""}`} data-position={position}>
      <title>{title}</title>
      {geom.circle ? (
        <circle
          cx={geom.x + geom.w / 2}
          cy={cy}
          r={Math.min(geom.w, geom.h) / 2}
          fill={fill}
          stroke={stroke}
          strokeDasharray={dash}
          opacity={opacity}
        />
      ) : (
        <>
          {pill(geom.x)}
          {geom.pair ? pill(geom.x + geom.pair.dx) : null}
        </>
      )}
      <text
        className="tbp-svg-numeral"
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="12"
        fill={RED}
      >
        {position}
      </text>
      {/* Serial display: native svg text always paints (Chromium will not
          render text of an unfocused <input> inside foreignObject). The
          input below stays a transparent hitbox until focused. */}
      <text
        className="tbp-svg-serial-text"
        x={geom.serial.x}
        y={geom.serial.y + 12}
        fontSize="11"
        fontWeight={700}
        fill={slot?.serial ? "#12284b" : "#8a99b0"}
      >
        {slot?.serial || "—"}
      </text>
      <foreignObject x={geom.serial.x} y={geom.serial.y} width={geom.serial.w} height={SERIAL_H}>
        <div className="tbp-svg-serial-box">
          <InlineCell
            value={slot?.serial ?? null}
            onCommit={(raw) => onSerialCommit(position, raw)}
            placeholder="—"
            className="tbp-svg-serial"
            ariaLabel={`Số seri ô ${position}`}
          />
        </div>
      </foreignObject>
    </g>
  );
}

/** Chassis outlines the tire markers sit on (horizontal top view). */
function TopViewOutlineHorizontal() {
  return (
    <g fill="none" stroke={OUTLINE}>
      {/* Tractor body */}
      <rect x={60} y={258} width={400} height={154} rx={10} fill="#fff" />
      {/* Cab zone + windshield band (pink, like the Excel) */}
      <rect x={60} y={258} width={140} height={154} rx={10} fill={PINK_FILL} stroke={PINK_STROKE} />
      <rect x={62} y={262} width={34} height={150} rx={8} fill="#f8dcdc" stroke="none" />
      {/* Drive well */}
      <rect x={240} y={268} width={210} height={134} rx={6} fill="#f4f7fb" stroke="none" />
      {/* Catwalk: chassis rail + landing-gear feet toward the trailer */}
      <line x1={460} y1={400} x2={520} y2={400} />
      <line x1={470} y1={394} x2={470} y2={408} strokeWidth={2} />
      <line x1={506} y1={394} x2={506} y2={408} strokeWidth={2} />
      {/* Trailer slab */}
      <rect x={520} y={252} width={540} height={166} rx={4} fill={SLAB_FILL} stroke={OUTLINE} />
      {/* Axle lines through the dual columns (under the pills, like the Excel) */}
      <g stroke="#b8cdf5" strokeWidth={2}>
        <line x1={284} y1={259} x2={428} y2={259} />
        <line x1={284} y1={411} x2={428} y2={411} />
        <line x1={800} y1={246} x2={800} y2={424} />
        <line x1={880} y1={246} x2={880} y2={424} />
        <line x1={960} y1={246} x2={960} y2={424} />
      </g>
    </g>
  );
}

/** Same for the portrait (nose-up) variant. */
function TopViewOutlineVertical() {
  return (
    <g fill="none" stroke={OUTLINE}>
      <rect x={150} y={20} width={170} height={90} rx={10} fill={PINK_FILL} stroke={PINK_STROKE} />
      <rect x={154} y={22} width={162} height={30} rx={8} fill="#f8dcdc" stroke="none" />
      <rect x={160} y={110} width={150} height={170} rx={6} fill="#fff" />
      <rect x={175} y={155} width={120} height={115} rx={6} fill="#f4f7fb" stroke="none" />
      <rect x={210} y={285} width={50} height={100} rx={4} fill="#f4f7fb" stroke="none" />
      <rect x={140} y={390} width={190} height={440} rx={4} fill={SLAB_FILL} stroke={OUTLINE} />
    </g>
  );
}

/**
 * Decorative side view (horizontal variant only) replicating the Excel
 * figure: pink tractor (hood, cab, exhaust, fuel tank), dark donut wheels,
 * gray trailer slab with corrugations, landing gear, section braces 1 (under
 * the tractor) and 2 (over the trailer) with numerals outside the apexes.
 * Gray strokes/muted numerals only — no data, not clickable. The numbered
 * callouts are the Excel figure's part labels, NOT tyre positions.
 */
function SideView() {
  return (
    <g fill="none" strokeWidth={1.5}>
      {/* Ground line */}
      <line x1={40} y1={182} x2={1060} y2={182} stroke={OUTLINE} />
      {/* Chassis rail cab → trailer (painted before wheels/tank overlap it) */}
      <line x1={260} y1={158} x2={520} y2={158} stroke={OUTLINE} />
      {/* Fuel tank (under the cab, behind the drive wheels) */}
      <rect x={238} y={138} width={54} height={20} rx={4} fill="#e3e6ea" stroke={TIRE_STROKE} />
      {/* Exhaust stack behind the cab, rising above the roof */}
      <rect x={256} y={52} width={8} height={66} fill={PINK_FILL} stroke={PINK_STROKE} strokeWidth={1.2} />
      {/* Tractor profile — pink body, like the Excel */}
      <rect x={60} y={118} width={90} height={40} rx={14} fill={PINK_FILL} stroke={PINK_STROKE} />
      <line x1={150} y1={118} x2={162} y2={80} stroke={PINK_STROKE} />
      <rect x={150} y={70} width={110} height={88} rx={8} fill={PINK_FILL} stroke={PINK_STROKE} />
      <rect x={162} y={84} width={42} height={26} rx={3} fill="#f8dcdc" stroke={PINK_STROKE} strokeWidth={1.2} />
      {/* Trailer box — filled slab, corrugations, bottom rail */}
      <rect x={520} y={48} width={540} height={102} rx={4} fill={SLAB_FILL} stroke={OUTLINE} />
      {[560, 620, 680, 740, 800, 860, 920, 980].map((x) => (
        <line key={x} x1={x} y1={56} x2={x} y2={134} stroke="#d5d8de" strokeWidth={1.2} />
      ))}
      <line x1={524} y1={138} x2={1056} y2={138} stroke={OUTLINE} />
      {/* Landing gear under the trailer front (V legs + feet, like the Excel) */}
      <line x1={543} y1={150} x2={553} y2={178} stroke={OUTLINE} strokeWidth={1.2} />
      <line x1={567} y1={150} x2={557} y2={178} stroke={OUTLINE} strokeWidth={1.2} />
      <line x1={548} y1={178} x2={562} y2={178} stroke={OUTLINE} strokeWidth={1.2} />
      {/* Wheels — steer, drive tandem, trailer tridem */}
      <Wheel cx={100} cy={156} r={22} />
      <Wheel cx={330} cy={158} r={24} />
      <Wheel cx={380} cy={158} r={24} />
      <Wheel cx={880} cy={158} r={24} />
      <Wheel cx={940} cy={158} r={24} />
      <Wheel cx={1000} cy={158} r={24} />
      {/* Section braces: 1 under the tractor (apex down), 2 over the trailer (apex up) */}
      <path
        d="M 60 184 C 60 187 63 188 68 188 H 255 C 261 188 263 190 263 193 C 263 190 265 188 271 188 H 462 C 467 188 470 187 470 184"
        stroke="#b9c2cc"
        strokeWidth={1.5}
      />
      <path
        d="M 520 46 C 520 43 523 42 528 42 H 781 C 787 42 789 40 789 37 C 789 40 791 42 797 42 H 1052 C 1057 42 1060 43 1060 46"
        stroke="#b9c2cc"
        strokeWidth={1.5}
      />
      <Callout x={265} y={208} n="1" />
      <Callout x={790} y={30} n="2" />
      {/* Part callouts (Excel figure labels, not tyre positions) */}
      <Callout x={105} y={140} n="3" />
      <Callout x={170} y={118} n="4" />
      <Callout x={225} y={118} n="5" />
      <Callout x={205} y={60} n="6" />
      <Callout x={265} y={148} n="7" />
      <Callout x={545} y={144} n="8" />
      <Callout x={790} y={102} n="9" />
      <Callout x={568} y={170} n="10" />
      <Callout x={940} y={112} n="11" />
    </g>
  );
}

/**
 * Annotated truck drawing for /fleet/tyre-board (NEPO-49): decorative side
 * view + top view carrying all 22 numbered positions and their editable
 * serials (horizontal), or the portrait top view only (vertical, ≤640px).
 * Geometry comes from the layout tables in tyrePositions.ts.
 */
export function TyreTruckDiagram({ slots, vertical, onSerialCommit }: Props) {
  const byPosition = new Map(slots.map((s) => [s.position, s]));
  const layout = vertical ? PORTRAIT_LAYOUT : TOP_VIEW_LAYOUT;

  return (
    <svg
      key={vertical ? "portrait" : "horizontal"}
      viewBox={vertical ? "0 0 470 850" : "0 0 1100 470"}
      width="100%"
      role="img"
      aria-label={vertical
        ? "Sơ đồ xe xoay dọc: cabin trên, rơ-moóc dưới, 22 ô lốp kèm số seri"
        : "Sơ đồ xe: side view + top view, 22 ô lốp kèm số seri, sửa trực tiếp trên sơ đồ"}
    >
      {!vertical && <SideView />}
      {vertical ? <TopViewOutlineVertical /> : <TopViewOutlineHorizontal />}
      {ALL_POSITIONS.map((position) => (
        <TireMarker
          key={position}
          position={position}
          geom={layout[position]}
          slot={byPosition.get(position)}
          onSerialCommit={onSerialCommit}
        />
      ))}
    </svg>
  );
}
