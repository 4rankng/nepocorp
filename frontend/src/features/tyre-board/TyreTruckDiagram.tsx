import type { TyreBoardSlot } from "@tingting/shared";
import { InlineCell } from "./TyreInlineCell";
import { tyreStatus, type TyreStatus } from "./tyreStatus";
import {
  ALL_POSITIONS,
  PORTRAIT_LAYOUT,
  SERIAL_H,
  SLOT_GROUP_BY_POSITION,
  SPARE_POSITIONS,
  TOP_VIEW_LAYOUT,
  type MarkerGeom,
} from "./tyrePositions";

/* Palette lifted verbatim from the owner's board mockups
   (Bảng theo dõi lốp – 15H-168.73.html): sheet grays, pink tractor, blue
   axle lines, big watermark section numerals, red position numerals. */
const BOX_FILL = "#f6f6f6";
const BOX_LINE = "#cfcfcf";
const WHEEL_GRAY = "#c9c9c9";
const BODY_FILL = "#fde9e7";
const BODY_STROKE = "#f3b3ad";
const AXLE_GRAY = "#ccd2d9";
const BIG_GRAY = "#c4c7c3";
const NUM_RED = "#d64545";

const STATUS_STYLE: Record<TyreStatus, { fill: string; stroke: string; label: string }> = {
  good: { fill: "#dcf2e3", stroke: "#2e9e5b", label: "tốt" },
  warn: { fill: "#fff3cd", stroke: "#d3940b", label: "cần chú ý" },
  bad: { fill: "#fde2e0", stroke: "#d64545", label: "cần thay" },
  empty: { fill: "#e8eaed", stroke: "#9aa0a6", label: "chưa lắp" },
};

/** Pill fill/stroke + status label for one slot. Spares use a neutral gray
 *  dashed outline — "not installed yet" reserve, no wear color. */
function pillStyle(slot: TyreBoardSlot | undefined, spare: boolean) {
  if (spare) return { fill: "#f1f3f5", stroke: "#9aa0a6", dash: "5 3", label: "dự phòng" };
  const st = tyreStatus(slot);
  return { ...STATUS_STYLE[st], dash: undefined };
}

interface Props {
  slots: TyreBoardSlot[];
  vertical: boolean;
  onSerialCommit: (position: number, raw: string) => void;
}

/** Donut wheel from the mockup: wide gray ring + small blue hub dot. */
function Wheel({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <circle r={32} fill="none" stroke={WHEEL_GRAY} strokeWidth={20} />
      <circle r={4.5} fill="#8a99b0" />
    </g>
  );
}

/** Big gray watermark numeral (side-view part labels, section braces).
 *  `counterRotate` keeps the text horizontal inside the portrait's rotated
 *  scene group (the mockup's own mobile transform). */
function BigNum({ x, y, n, counterRotate = false }: { x: number; y: number; n: string; counterRotate?: boolean }) {
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      fontSize="40"
      fontWeight={300}
      fill={BIG_GRAY}
      transform={counterRotate ? `rotate(-90 ${x} ${y})` : undefined}
    >
      {n}
    </text>
  );
}

/**
 * One numbered tire unit, mockup style: a status-colored pill with the
 * serial ON the pill (editable via <foreignObject> hitbox) and the red
 * position numeral OUTSIDE the pill at the mockup's numeral coordinates.
 * Spare tires (ô 7–10) stay yellow with a dashed outline. The full data
 * lives in the <title> tooltip.
 */
function TireMarker({ position, geom, slot, onSerialCommit }: {
  position: number;
  geom: MarkerGeom;
  slot: TyreBoardSlot | undefined;
  onSerialCommit: Props["onSerialCommit"];
}) {
  const spare = SPARE_POSITIONS[position] === true;
  const style = pillStyle(slot, spare);
  const title = [
    `Ô ${position} — ${SLOT_GROUP_BY_POSITION[position]}`,
    style.label,
    slot?.size,
    slot?.model,
    slot?.note,
  ].filter(Boolean).join(" · ");

  const cx = geom.x + geom.w / 2;
  const cy = geom.y + geom.h / 2;
  const numX = geom.num?.x ?? cx;
  const numY = geom.num?.y ?? cy;
  const pill = (px: number, py: number) => (
    <rect
      x={px}
      y={py}
      width={geom.w}
      height={geom.h}
      rx={geom.h / 2}
      fill={style.fill}
      stroke={style.stroke}
      strokeDasharray={style.dash}
    />
  );

  return (
    <g className={`tbp-svg-marker${spare ? " tbp-svg-marker--spare" : ""}`} data-position={position}>
      <title>{title}</title>
      {geom.circle ? (
        <circle
          cx={cx}
          cy={cy}
          r={Math.min(geom.w, geom.h) / 2}
          fill={style.fill}
          stroke={style.stroke}
          strokeDasharray={style.dash}
        />
      ) : (
        <>
          {pill(geom.x, geom.y)}
          {geom.pair ? pill(geom.x + (geom.pair.dx ?? 0), geom.y + (geom.pair.dy ?? 0)) : null}
        </>
      )}
      <text
        className="tbp-svg-numeral"
        x={numX}
        y={numY}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="15"
        fontWeight={700}
        fill={NUM_RED}
      >
        {position}
      </text>
      {/* Serial display: native svg text always paints (Chromium will not
          render text of an unfocused <input> inside foreignObject). The
          input below stays a transparent hitbox until focused. Empty slots
          show nothing — a row of "—" dashes reads as noise. */}
      {slot?.serial && (
        <text
          className="tbp-svg-serial-text"
          x={geom.serial.x + geom.serial.w / 2}
          y={geom.serial.y + SERIAL_H / 2 + 4}
          textAnchor="middle"
          fontSize="11"
          fontWeight={700}
          fontFamily="ui-monospace, Menlo, Consolas, monospace"
          fill="#1d2421"
        >
          {slot.serial}
        </text>
      )}
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

/**
 * Horizontal top view outline, copied from the owner's mockup: pink tractor
 * body with windshield lanes and fuel-tank boxes, gray trailer slab, blue
 * axle runs with hub circles, kingpin feet, section braces as staple paths.
 * `counterRotate` is set when the whole group is drawn inside the portrait's
 * rotate(90) scene, so watermark numerals stay horizontal.
 */
function TopViewOutlineHorizontal({ counterRotate = false }: { counterRotate?: boolean }) {
  return (
    <g>
      {/* Section braces: 2 over the trailer, 1 under the tractor */}
      <g fill="none" stroke={BOX_LINE} strokeWidth={3}>
        <path d="M381,650 V640 q0,-18 18,-18 H786 q16,0 16,-17 q0,17 16,17 H1206 q18,0 18,18 V650" />
        <path d="M55,860 V870 q0,18 18,18 H304 q16,0 16,17 q0,-17 16,-17 H567 q18,0 18,-18 V860" />
      </g>
      <BigNum x={802} y={590} n="2" counterRotate={counterRotate} />
      <BigNum x={320} y={950} n="1" counterRotate={counterRotate} />

      {/* Trailer slab + kingpin feet */}
      <rect x={381} y={657} width={843} height={193} fill={BOX_FILL} stroke={BOX_LINE} strokeWidth={3} />
      <path d="M620,688 H680 M620,818 H680" stroke={WHEEL_GRAY} strokeWidth={3} fill="none" />
      <rect x={618} y={681} width={14} height={14} fill={WHEEL_GRAY} />
      <rect x={618} y={811} width={14} height={14} fill={WHEEL_GRAY} />

      {/* Tractor: cab block, drive box, windshield lanes, fuel-tank boxes */}
      <g fill={BODY_FILL} stroke={BODY_STROKE} strokeWidth={2}>
        <rect x={70} y={655} width={255} height={195} rx={26} />
        <rect x={326} y={710} width={259} height={87} />
        <rect x={178} y={686} width={72} height={136} fill="none" />
        <rect x={252} y={686} width={72} height={136} fill="none" />
      </g>
      <g fill={BOX_FILL} stroke={BOX_LINE} strokeWidth={2.5}>
        <rect x={190} y={655} width={97} height={43} />
        <rect x={190} y={808} width={97} height={43} />
      </g>

      {/* Watermark part numerals */}
      <BigNum x={92} y={768} n="3" />
      <BigNum x={212} y={737} n="4" />
      <BigNum x={288} y={739} n="5" />
      <BigNum x={232} y={689} n="7" />
      <BigNum x={232} y={840} n="7" />
      <BigNum x={789} y={768} n="9" />
      <BigNum x={655} y={765} n="10" />
      <BigNum x={1035} y={765} n="11" />

      {/* Axle runs through the pill columns */}
      <g stroke={AXLE_GRAY} strokeWidth={7} strokeLinecap="round" fill="none">
        <path d="M125,690 V820 M435,712 V795 M533,712 V795" />
        <path d="M983,705 V800 M1080,705 V800 M1176,705 V800" />
      </g>
      {/* Dual-pair hubs on the drive axle — donut wheels like the side view */}
      {[435, 533].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy={752} r={16} fill="none" stroke={WHEEL_GRAY} strokeWidth={8} />
          <circle cx={cx} cy={752} r={4.5} fill="#8a99b0" />
        </g>
      ))}
    </g>
  );
}

/** Portrait renders the SAME top view rotated 90° — the mockup's own mobile
 *  transform (side view hidden, watermark numerals counter-rotated, tire
 *  markers drawn upright from the precomputed rotated slot table).
 *  translate(975,0) lands the rotated group at x ∈ [5, 385] — the same
 *  mapping (x,y) → (964−y, x) the rotated slot table was computed with. */
function PortraitScene() {
  return (
    <g transform="translate(975, 0) rotate(90)">
      <TopViewOutlineHorizontal counterRotate />
    </g>
  );
}

/**
 * Side view, copied from the owner's mockup: gray trailer slab with brace,
 * kingpin V, pink tractor (hood, cab, roof fairing, windshield lanes,
 * exhaust with inner slats, fuel-tank step box), donut wheels, watermark
 * numerals. Decorative only — no data, not clickable.
 */
function SideView() {
  return (
    <g>
      {/* Section braces: 2 over the trailer, 1 under the tractor */}
      <g fill="none" stroke={BOX_LINE} strokeWidth={3}>
        <path d="M381,160 V145 q0,-18 18,-18 H786 q16,0 16,-17 q0,17 16,17 H1206 q18,0 18,18 V160" />
        <path d="M55,462 V472 q0,18 18,18 H304 q16,0 16,17 q0,-17 16,-17 H567 q18,0 18,-18 V462" />
      </g>
      <BigNum x={802} y={88} n="2" />
      <BigNum x={320} y={553} n="1" />

      {/* Trailer slab + kingpin V */}
      <rect x={381} y={163} width={843} height={210} fill={BOX_FILL} stroke={BOX_LINE} strokeWidth={3} />
      <path d="M600,373 L626,402 L680,373 M626,402 V432" fill="none" stroke={BOX_LINE} strokeWidth={3} />

      {/* Tractor: hood, cab, roof fairing, windshield lanes, chassis rail */}
      <g fill={BODY_FILL} stroke={BODY_STROKE} strokeWidth={2}>
        <path d="M55,420 V340 Q55,323 75,321 L173,316 V420 Z" />
        <rect x={173} y={238} width={152} height={182} />
        <path d="M205,238 Q210,176 262,165 L322,163 V238 Z" />
        <rect x={326} y={388} width={259} height={32} />
        <rect x={178} y={242} width={72} height={150} fill="none" />
        <rect x={252} y={242} width={72} height={150} fill="none" />
      </g>

      {/* Exhaust stack + inner slats */}
      <rect x={330} y={220} width={17} height={164} rx={7} fill="none" stroke={BOX_LINE} strokeWidth={3} />
      <rect x={334} y={288} width={12} height={62} fill={WHEEL_GRAY} opacity={0.7} />

      {/* Fuel-tank step box */}
      <rect x={190} y={378} width={100} height={38} fill={BOX_FILL} stroke={BOX_LINE} strokeWidth={2.5} />

      {/* Watermark part numerals */}
      <BigNum x={92} y={362} n="3" />
      <BigNum x={212} y={347} n="4" />
      <BigNum x={288} y={348} n="5" />
      <BigNum x={276} y={217} n="6" />
      <BigNum x={232} y={410} n="7" />
      <BigNum x={789} y={272} n="9" />
      <BigNum x={482} y={360} n="8" />
      <BigNum x={1060} y={360} n="11" />
      <BigNum x={655} y={432} n="10" />

      {/* Wheels: steer, drive tandem, trailer tridem */}
      <Wheel x={125} y={422} />
      <Wheel x={435} y={422} />
      <Wheel x={533} y={422} />
      <Wheel x={980} y={422} />
      <Wheel x={1078} y={422} />
      <Wheel x={1176} y={422} />
    </g>
  );
}

/**
 * Annotated truck drawing for /fleet/tyre-board (NEPO-49): side view + top
 * view carrying all 22 numbered positions and their editable serials
 * (horizontal), or the portrait top view only (vertical, ≤640px). Geometry
 * follows the owner's board mockups; slot colors follow tyreStatus.
 */
export function TyreTruckDiagram({ slots, vertical, onSerialCommit }: Props) {
  const byPosition = new Map(slots.map((s) => [s.position, s]));
  const layout = vertical ? PORTRAIT_LAYOUT : TOP_VIEW_LAYOUT;

  return (
    <svg
      key={vertical ? "portrait" : "horizontal"}
      viewBox={vertical ? "0 0 390 1250" : "30 55 1270 905"}
      width="100%"
      role="img"
      aria-label={vertical
        ? "Sơ đồ xe xoay dọc: cabin trên, rơ-moóc dưới, 22 ô lốp kèm số seri"
        : "Sơ đồ xe: side view + top view, 22 ô lốp kèm số seri, sửa trực tiếp trên sơ đồ"}
    >
      {!vertical && <SideView />}
      {vertical ? <PortraitScene /> : <TopViewOutlineHorizontal />}
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
