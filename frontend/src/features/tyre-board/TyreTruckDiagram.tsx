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

const STROKE = "#9fb3cc";
const TIRE_FILL = "#dfe7f1";
const RED = "#d62828";

interface Props {
  slots: TyreBoardSlot[];
  vertical: boolean;
  onSerialCommit: (position: number, raw: string) => void;
}

/**
 * One numbered tire unit: tire shape + red number badge (like the Excel) +
 * the serial editor embedded in the drawing via <foreignObject>. Spare tires
 * (ô 7–10) are yellow with a dashed outline; empty slots render at reduced
 * opacity. The full data lives in the <title> tooltip.
 */
function TireMarker({ position, geom, slot, onSerialCommit }: {
  position: number;
  geom: MarkerGeom;
  slot: TyreBoardSlot | undefined;
  onSerialCommit: Props["onSerialCommit"];
}) {
  const spare = SPARE_POSITIONS[position] === true;
  const cx = geom.x + geom.w / 2;
  const cy = geom.y + geom.h / 2;
  const title = [
    `Ô ${position} — ${SLOT_GROUP_BY_POSITION[position]}`,
    slot?.size,
    slot?.model,
    slot?.note,
  ].filter(Boolean).join(" · ");

  return (
    <g className={`tbp-svg-marker${spare ? " tbp-svg-marker--spare" : ""}`} data-position={position}>
      <title>{title}</title>
      {geom.circle ? (
        <circle
          cx={cx}
          cy={cy}
          r={Math.min(geom.w, geom.h) / 2}
          fill={spare ? "#fffbe9" : TIRE_FILL}
          stroke={spare ? "#b5a13a" : STROKE}
          strokeDasharray={spare ? "4 3" : undefined}
          opacity={slot?.serial ? 1 : 0.45}
        />
      ) : (
        <rect
          x={geom.x}
          y={geom.y}
          width={geom.w}
          height={geom.h}
          rx={4}
          fill={spare ? "#fffbe9" : TIRE_FILL}
          stroke={spare ? "#b5a13a" : STROKE}
          strokeDasharray={spare ? "4 3" : undefined}
          opacity={slot?.serial ? 1 : 0.45}
        />
      )}
      <circle cx={cx} cy={cy} r={9} fill={RED} />
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fontSize="10" fontWeight={700} fill="#fff">
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

/** Gray chassis/box outlines the tire markers sit on (horizontal top view). */
function TopViewOutlineHorizontal() {
  return (
    <g fill="none" stroke={STROKE}>
      <rect x={60} y={258} width={400} height={154} rx={8} fill="#fff" />
      <rect x={235} y={268} width={210} height={134} rx={6} fill="#f4f7fb" stroke="#c9d4e8" />
      <rect x={460} y={300} width={60} height={70} rx={4} fill="#f4f7fb" stroke="#c9d4e8" />
      <rect x={520} y={258} width={540} height={154} rx={6} fill="#fff" />
    </g>
  );
}

/** Same for the portrait (nose-up) variant. */
function TopViewOutlineVertical() {
  return (
    <g fill="none" stroke={STROKE}>
      <rect x={150} y={20} width={170} height={90} rx={8} fill="#fff" />
      <rect x={160} y={110} width={150} height={170} rx={6} fill="#fff" />
      <rect x={175} y={155} width={120} height={115} rx={6} fill="#f4f7fb" stroke="#c9d4e8" />
      <rect x={210} y={285} width={50} height={100} rx={4} fill="#f4f7fb" stroke="#c9d4e8" />
      <rect x={140} y={390} width={190} height={440} rx={6} fill="#fff" />
    </g>
  );
}

/** Small numbered annotation used across the decorative side view. */
function SideLabel({ x, y, n }: { x: number; y: number; n: string }) {
  return (
    <g>
      <circle cx={x} cy={y} r={9} fill="#fff" stroke={STROKE} />
      <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize="9" fill="#6b7a90">{n}</text>
    </g>
  );
}

/**
 * Decorative side view (horizontal variant only) replicating the reference
 * diagram: hood, cab, drive wheels, trailer box, tri-axle, braces 1/2.
 * Gray strokes only — no data, not clickable. The numbered labels are the
 * Excel figure's part callouts, NOT tyre positions.
 */
function SideView() {
  return (
    <g fill="none" stroke={STROKE} strokeWidth={2}>
      {/* Section braces: 1 = tractor, 2 = trailer */}
      <path d="M 60 44 V 38 H 430 V 44" strokeWidth={1.5} />
      <path d="M 480 44 V 38 H 1060 V 44" strokeWidth={1.5} />
      {/* Ground line */}
      <line x1={40} y1={182} x2={1060} y2={182} stroke="#c9d4e8" strokeWidth={1.5} />
      {/* Tractor profile */}
      <rect x={60} y={120} width={90} height={42} rx={6} />
      <rect x={150} y={78} width={115} height={84} rx={6} />
      <rect x={162} y={90} width={42} height={26} rx={3} strokeWidth={1.2} />
      {/* Fuel tank */}
      <rect x={240} y={140} width={48} height={20} rx={8} />
      {/* Drive wheels */}
      <circle cx={320} cy={156} r={26} fill={TIRE_FILL} />
      <circle cx={372} cy={156} r={26} fill={TIRE_FILL} />
      {/* Kingpin + trailer box */}
      <rect x={462} y={152} width={16} height={10} fill="#fff" strokeWidth={1.2} />
      <rect x={480} y={60} width={580} height={96} rx={4} />
      {/* Rear tri-axle */}
      <circle cx={900} cy={156} r={24} fill={TIRE_FILL} />
      <circle cx={950} cy={156} r={24} fill={TIRE_FILL} />
      <circle cx={1000} cy={156} r={24} fill={TIRE_FILL} />
      {/* Callout numbers */}
      <SideLabel x={245} y={30} n="1" />
      <SideLabel x={770} y={30} n="2" />
      <SideLabel x={285} y={108} n="3" />
      <SideLabel x={313} y={108} n="4" />
      <SideLabel x={341} y={108} n="5" />
      <SideLabel x={369} y={108} n="6" />
      <SideLabel x={264} y={130} n="7" />
      <SideLabel x={346} y={116} n="8" />
      <SideLabel x={510} y={80} n="9" />
      <SideLabel x={470} y={136} n="10" />
      <SideLabel x={950} y={118} n="11" />
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
