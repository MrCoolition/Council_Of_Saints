"use client";

import { type CSSProperties, useId } from "react";
import type {
  RosaryMysterySet,
  RosaryStep,
} from "@/lib/rosary";
import type {
  RosaryBeadShape,
  RosaryDesign,
  RosaryOurFatherShape,
} from "@/lib/rosary-designs";

type RosaryBeadsProps = {
  design: RosaryDesign;
  mysterySet: RosaryMysterySet;
  step: RosaryStep;
  repetition: number;
  finished: boolean;
  onAdvance: () => void;
};

type BeadPoint = {
  id: string;
  order: number;
  x: number;
  y: number;
  large: boolean;
  decadeIndex: number | null;
};

type StationName =
  | "crucifix"
  | "medal"
  | "mystery"
  | "opening-glory"
  | "decade-glory"
  | "fatima";

type VisualProgress = {
  activeBeadOrder: number | null;
  activeDecadeIndex: number | null;
  activeStation: StationName | null;
  completedBeads: number;
};

type ActiveTarget = {
  x: number;
  y: number;
  label: string;
};

const viewBoxWidth = 640;
const viewBoxHeight = 840;
const loopCenter = { x: 320, y: 270 };
const loopRadius = { x: 228, y: 220 };
const loopStartAngle = 103;
const loopEndAngle = 437;
const loopBeadCount = 55;
const loopAngleStep =
  (loopEndAngle - loopStartAngle) / (loopBeadCount - 1);

const tailBeads: readonly BeadPoint[] = [
  { id: "opening-large", order: 0, x: 320, y: 603, large: true, decadeIndex: null },
  { id: "opening-small-1", order: 1, x: 320, y: 651, large: false, decadeIndex: null },
  { id: "opening-small-2", order: 2, x: 320, y: 690, large: false, decadeIndex: null },
  { id: "opening-small-3", order: 3, x: 320, y: 729, large: false, decadeIndex: null },
];

const loopBeads: readonly BeadPoint[] = Array.from(
  { length: loopBeadCount },
  (_, loopIndex) => {
    const angle = loopStartAngle + loopIndex * loopAngleStep;
    const position = pointOnEllipse(angle, loopRadius.x, loopRadius.y);
    const positionInDecade = loopIndex % 11;

    return {
      id: `loop-${loopIndex + 1}`,
      order: loopIndex + 4,
      x: position.x,
      y: position.y,
      large: positionInDecade === 0,
      decadeIndex: Math.floor(loopIndex / 11),
    };
  },
);

const loopChainPoints = loopBeads
  .map((bead) => `${round(bead.x)},${round(bead.y)}`)
  .join(" ");

const decadeStations = Array.from({ length: 5 }, (_, decadeIndex) => {
  const finalBeadIndex = decadeIndex * 11 + 10;
  const stationAngle =
    decadeIndex === 4
      ? 450
      : loopStartAngle + (finalBeadIndex + 0.5) * loopAngleStep;
  const position = pointOnEllipse(
    stationAngle,
    loopRadius.x - 25,
    loopRadius.y - 23,
  );

  return {
    decadeIndex,
    x: position.x,
    y: position.y,
  };
});

const romanNumerals = ["I", "II", "III", "IV", "V"] as const;

export function RosaryBeads({
  design,
  mysterySet,
  step,
  repetition,
  finished,
  onAdvance,
}: RosaryBeadsProps) {
  const rawId = useId();
  const gradientId = rawId.replaceAll(":", "");
  const statusId = `${gradientId}-bead-status`;
  const visualProgress = getVisualProgress(step, repetition, finished);
  const activeTarget = getActiveTarget(step, repetition, visualProgress);
  const currentMystery =
    typeof step.mysteryIndex === "number"
      ? (mysterySet.mysteries[step.mysteryIndex] ?? null)
      : null;
  const status = getBeadStatus(step, repetition, visualProgress, finished);
  const activeMysteryNumber =
    visualProgress.activeDecadeIndex === null
      ? null
      : romanNumerals[visualProgress.activeDecadeIndex];

  return (
    <section
      aria-label={`Interactive ${design.name} Rosary beads`}
      className={[
        "rosary-chaplet",
        finished ? "rosary-chaplet-complete" : "",
      ].join(" ")}
      data-rosary-design={design.id}
      data-rosary-texture={design.texture}
      style={getDesignStyle(design)}
    >
      <div
        aria-hidden
        className="rosary-chaplet-light"
      />
      <p aria-live="polite" className="sr-only" id={statusId}>
        {status}
      </p>

      <div className="rosary-beads-frame">
        <div className="rosary-beads-stage">
          <svg
            aria-hidden="true"
            className="absolute inset-0 size-full overflow-visible"
            preserveAspectRatio="xMidYMid meet"
            viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
          >
            <defs>
              <linearGradient
                id={`${gradientId}-chain`}
                x1="0"
                x2="1"
                y1="0"
                y2="1"
              >
                <stop offset="0" stopColor={design.palette.chainLow} />
                <stop offset="0.5" stopColor={design.palette.chainHigh} />
                <stop offset="1" stopColor={design.palette.chainLow} />
              </linearGradient>
              <radialGradient
                cx="34%"
                cy="28%"
                id={`${gradientId}-pearl`}
                r="72%"
              >
                <stop offset="0" stopColor={design.palette.beadHighlight} />
                <stop offset="0.48" stopColor={design.palette.beadMid} />
                <stop offset="1" stopColor={design.palette.beadShadow} />
              </radialGradient>
              <radialGradient
                cx="32%"
                cy="28%"
                id={`${gradientId}-garnet`}
                r="72%"
              >
                <stop offset="0" stopColor={design.palette.paterHighlight} />
                <stop offset="0.4" stopColor={design.palette.paterMid} />
                <stop offset="1" stopColor={design.palette.paterShadow} />
              </radialGradient>
              <radialGradient
                cx="31%"
                cy="26%"
                id={`${gradientId}-gold`}
                r="75%"
              >
                <stop offset="0" stopColor={design.palette.completedHighlight} />
                <stop offset="0.42" stopColor={design.palette.completedMid} />
                <stop offset="1" stopColor={design.palette.completedShadow} />
              </radialGradient>
              <filter
                height="260%"
                id={`${gradientId}-active-glow`}
                width="260%"
                x="-80%"
                y="-80%"
              >
                <feGaussianBlur result="blur" stdDeviation="8" />
                <feFlood
                  floodColor={design.palette.active}
                  floodOpacity="0.92"
                />
                <feComposite in2="blur" operator="in" />
                <feMerge>
                  <feMergeNode />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter
                height="180%"
                id={`${gradientId}-bead-shadow`}
                width="180%"
                x="-40%"
                y="-40%"
              >
                <feDropShadow
                  dx="0"
                  dy="2"
                  floodColor={design.palette.chainShadow}
                  floodOpacity="0.68"
                  stdDeviation="2.2"
                />
              </filter>
            </defs>

            <g fill="none" strokeLinecap="round" strokeLinejoin="round">
              <polyline
                points={loopChainPoints}
                stroke={design.palette.chainShadow}
                strokeOpacity="0.78"
                strokeWidth="8"
              />
              <polyline
                points={loopChainPoints}
                stroke={`url(#${gradientId}-chain)`}
                strokeWidth="3"
              />
              <path
                d={`M ${round(loopBeads[0].x)} ${round(loopBeads[0].y)} Q 285 505 306 522`}
                stroke={design.palette.chainShadow}
                strokeWidth="8"
              />
              <path
                d={`M ${round(loopBeads[0].x)} ${round(loopBeads[0].y)} Q 285 505 306 522`}
                stroke={`url(#${gradientId}-chain)`}
                strokeWidth="3"
              />
              <path
                d={`M ${round(loopBeads[loopBeads.length - 1].x)} ${round(loopBeads[loopBeads.length - 1].y)} Q 355 505 334 522`}
                stroke={design.palette.chainShadow}
                strokeWidth="8"
              />
              <path
                d={`M ${round(loopBeads[loopBeads.length - 1].x)} ${round(loopBeads[loopBeads.length - 1].y)} Q 355 505 334 522`}
                stroke={`url(#${gradientId}-chain)`}
                strokeWidth="3"
              />
              <path
                d="M 320 552 L 320 807"
                stroke={design.palette.chainShadow}
                strokeWidth="8"
              />
              <path
                d="M 320 552 L 320 807"
                stroke={`url(#${gradientId}-chain)`}
                strokeWidth="3"
              />
            </g>

            <g opacity="0.9">
              <circle
                cx="320"
                cy="270"
                fill="none"
                r="79"
                stroke={design.palette.metalBright}
                strokeDasharray="2 9"
                strokeLinecap="round"
                strokeOpacity="0.48"
                strokeWidth="2"
              />
              <circle
                cx="320"
                cy="270"
                fill={design.palette.centerFill}
                fillOpacity="0.64"
                r="67"
                stroke={design.palette.metal}
                strokeOpacity="0.5"
              />
              <text
                fill={design.palette.centerText}
                fontFamily="Georgia, serif"
                fontSize="72"
                fontStyle="italic"
                textAnchor="middle"
                x="320"
                y="291"
              >
                M
              </text>
              <text
                fill={design.palette.metalBright}
                fontFamily="Avenir Next, Segoe UI, sans-serif"
                fontSize="13"
                fontWeight="700"
                letterSpacing="3"
                textAnchor="middle"
                x="320"
                y="329"
              >
                {activeMysteryNumber
                  ? `DECADE ${activeMysteryNumber}`
                  : formatVisualPhase(step.phase)}
              </text>
            </g>

            {decadeStations.map((station) => {
              const active =
                visualProgress.activeDecadeIndex === station.decadeIndex;

              return (
                <g key={`station-${station.decadeIndex + 1}`}>
                  {active ? (
                    <circle
                      className="rosary-bead-halo"
                      cx={station.x}
                      cy={station.y}
                      fill="none"
                      r="18"
                      stroke={design.palette.active}
                      strokeOpacity="0.72"
                      strokeWidth="2"
                    />
                  ) : null}
                  <circle
                    cx={station.x}
                    cy={station.y}
                    fill={design.palette.centerFill}
                    r="11"
                    stroke={
                      active
                        ? design.palette.active
                        : design.palette.metal
                    }
                    strokeWidth={active ? 2.5 : 1.5}
                  />
                  <text
                    dominantBaseline="central"
                    fill={
                      active
                        ? design.palette.metalBright
                        : design.palette.centerText
                    }
                    fontFamily="Georgia, serif"
                    fontSize="9"
                    fontWeight="700"
                    textAnchor="middle"
                    x={station.x}
                    y={station.y}
                  >
                    {romanNumerals[station.decadeIndex]}
                  </text>
                </g>
              );
            })}

            {loopBeads.map((bead) => (
              <BeadGlyph
                active={visualProgress.activeBeadOrder === bead.order}
                bead={bead}
                completed={bead.order < visualProgress.completedBeads}
                design={design}
                gradientId={gradientId}
                key={bead.id}
              />
            ))}

            <OpeningGloryStation
              active={visualProgress.activeStation === "opening-glory"}
              design={design}
              gradientId={gradientId}
            />

            <CenterMedal
              active={visualProgress.activeStation === "medal"}
              completed={visualProgress.completedBeads >= 4}
              design={design}
              gradientId={gradientId}
            />

            {tailBeads.map((bead) => (
              <BeadGlyph
                active={visualProgress.activeBeadOrder === bead.order}
                bead={bead}
                completed={bead.order < visualProgress.completedBeads}
                design={design}
                gradientId={gradientId}
                key={bead.id}
              />
            ))}

            <DecadeConnectorStations
              activeDecadeIndex={visualProgress.activeDecadeIndex}
              activeStation={visualProgress.activeStation}
              design={design}
              gradientId={gradientId}
            />

            <Crucifix
              active={visualProgress.activeStation === "crucifix"}
              completed={
                finished ||
                !["opening-sign", "opening-creed"].includes(step.id)
              }
              design={design}
              gradientId={gradientId}
            />
          </svg>

          {!finished && activeTarget ? (
            <button
              aria-describedby={statusId}
              aria-label={activeTarget.label}
              className="rosary-bead-touch absolute z-20 size-12 -translate-x-1/2 -translate-y-1/2 rounded-full bg-transparent transition focus-visible:outline-2 focus-visible:outline-offset-4"
              onClick={onAdvance}
              style={{
                left: `${(activeTarget.x / viewBoxWidth) * 100}%`,
                top: `${(activeTarget.y / viewBoxHeight) * 100}%`,
              }}
              type="button"
            >
              <span className="sr-only">{activeTarget.label}</span>
            </button>
          ) : null}
        </div>
      </div>
      <div className="rosary-chaplet-caption" aria-hidden>
        <span>
          {design.name} · {finished ? "Amen" : currentMystery?.title ?? step.title}
        </span>
        <span>{visualProgress.completedBeads} of 59</span>
      </div>
    </section>
  );
}

type RosaryGlyphShape = RosaryBeadShape | RosaryOurFatherShape;

function BeadGlyph({
  bead,
  active,
  completed,
  design,
  gradientId,
}: {
  bead: BeadPoint;
  active: boolean;
  completed: boolean;
  design: RosaryDesign;
  gradientId: string;
}) {
  const radius = bead.large ? 14 : 8;
  const displayRadius = active ? radius + 3 : radius;
  const shape = bead.large ? design.ourFatherShape : design.beadShape;
  const fill = active
    ? `url(#${gradientId}-garnet)`
    : completed
      ? `url(#${gradientId}-gold)`
      : bead.large
        ? `url(#${gradientId}-garnet)`
        : `url(#${gradientId}-pearl)`;
  const stroke = active
    ? design.palette.metalBright
    : completed
      ? design.palette.active
      : design.palette.metal;

  return (
    <g filter={active ? `url(#${gradientId}-bead-shadow)` : undefined}>
      {active ? (
        <circle
          className="rosary-bead-halo"
          cx={bead.x}
          cy={bead.y}
          fill="none"
          r={displayRadius + 9}
          stroke={design.palette.active}
          strokeOpacity="0.82"
          strokeWidth="3"
        />
      ) : null}
      <BeadBody
        className={[
          "rosary-bead-body",
          active ? "rosary-bead-current" : "",
        ].join(" ")}
        fill={fill}
        filter={active ? `url(#${gradientId}-active-glow)` : undefined}
        radius={displayRadius}
        shape={shape}
        stroke={stroke}
        strokeWidth={active ? 3 : bead.large ? 2.25 : 1.5}
        x={bead.x}
        y={bead.y}
      />
      <BeadTextureMark
        design={design}
        large={bead.large}
        radius={displayRadius}
        x={bead.x}
        y={bead.y}
      />
    </g>
  );
}

function BeadBody({
  className,
  fill,
  filter,
  radius,
  shape,
  stroke,
  strokeWidth,
  x,
  y,
}: {
  className: string;
  fill: string;
  filter?: string;
  radius: number;
  shape: RosaryGlyphShape;
  stroke: string;
  strokeWidth: number;
  x: number;
  y: number;
}) {
  const shared = { className, fill, filter, stroke, strokeWidth };

  switch (shape) {
    case "oval":
    case "wood":
      return (
        <ellipse
          {...shared}
          cx={x}
          cy={y}
          rx={radius * 0.78}
          ry={radius * 1.16}
        />
      );
    case "crystal":
    case "chalice-cut":
      return (
        <polygon
          {...shared}
          points={`${x},${y - radius * 1.18} ${x + radius * 0.76},${y - radius * 0.45} ${x + radius * 0.68},${y + radius * 0.68} ${x},${y + radius * 1.12} ${x - radius * 0.68},${y + radius * 0.68} ${x - radius * 0.76},${y - radius * 0.45}`}
        />
      );
    case "faceted":
    case "diamond-cut":
    case "rose-cut":
      return (
        <polygon
          {...shared}
          points={polygonPoints(x, y, radius, shape === "rose-cut" ? 10 : 8)}
        />
      );
    case "stone":
      return (
        <path
          {...shared}
          d={`M ${x - radius * 0.08} ${y - radius} C ${x + radius * 0.55} ${y - radius * 0.98}, ${x + radius} ${y - radius * 0.48}, ${x + radius * 0.92} ${y + radius * 0.16} C ${x + radius * 0.83} ${y + radius * 0.78}, ${x + radius * 0.3} ${y + radius}, ${x - radius * 0.22} ${y + radius * 0.93} C ${x - radius * 0.86} ${y + radius * 0.84}, ${x - radius} ${y + radius * 0.28}, ${x - radius * 0.92} ${y - radius * 0.3} C ${x - radius * 0.82} ${y - radius * 0.78}, ${x - radius * 0.48} ${y - radius * 1.02}, ${x - radius * 0.08} ${y - radius} Z`}
        />
      );
    case "heart-cut":
      return (
        <path
          {...shared}
          d={`M ${x} ${y + radius} C ${x - radius * 0.25} ${y + radius * 0.55}, ${x - radius} ${y + radius * 0.08}, ${x - radius} ${y - radius * 0.42} C ${x - radius} ${y - radius * 1.08}, ${x - radius * 0.22} ${y - radius * 1.1}, ${x} ${y - radius * 0.5} C ${x + radius * 0.22} ${y - radius * 1.1}, ${x + radius} ${y - radius * 1.08}, ${x + radius} ${y - radius * 0.42} C ${x + radius} ${y + radius * 0.08}, ${x + radius * 0.25} ${y + radius * 0.55}, ${x} ${y + radius} Z`}
        />
      );
    case "grotto-cut":
      return (
        <path
          {...shared}
          d={`M ${x - radius * 0.82} ${y + radius} V ${y - radius * 0.12} C ${x - radius * 0.82} ${y - radius * 1.18}, ${x + radius * 0.82} ${y - radius * 1.18}, ${x + radius * 0.82} ${y - radius * 0.12} V ${y + radius} Z`}
        />
      );
    case "medal":
      return (
        <g>
          <circle {...shared} cx={x} cy={y} r={radius} />
          <circle
            cx={x}
            cy={y}
            fill="none"
            r={radius * 0.67}
            stroke={stroke}
            strokeOpacity="0.72"
            strokeWidth={Math.max(1, strokeWidth * 0.62)}
          />
        </g>
      );
    case "carved-cross":
      return (
        <path
          {...shared}
          d={`M ${x - radius * 0.3} ${y - radius} H ${x + radius * 0.3} V ${y - radius * 0.3} H ${x + radius} V ${y + radius * 0.3} H ${x + radius * 0.3} V ${y + radius} H ${x - radius * 0.3} V ${y + radius * 0.3} H ${x - radius} V ${y - radius * 0.3} H ${x - radius * 0.3} Z`}
        />
      );
    case "star-cut":
      return (
        <polygon
          {...shared}
          points={starPoints(x, y, radius, radius * 0.57, 8)}
        />
      );
    default:
      return <circle {...shared} cx={x} cy={y} r={radius} />;
  }
}

function BeadTextureMark({
  design,
  large,
  radius,
  x,
  y,
}: {
  design: RosaryDesign;
  large: boolean;
  radius: number;
  x: number;
  y: number;
}) {
  const highlight = design.palette.metalBright;

  switch (design.texture) {
    case "olivewood-grain":
      return (
        <g fill="none" opacity="0.48" stroke={design.palette.paterShadow}>
          <path
            d={`M ${x - radius * 0.45} ${y - radius * 0.35} Q ${x} ${y - radius * 0.05} ${x + radius * 0.42} ${y - radius * 0.28}`}
            strokeWidth="1"
          />
          <path
            d={`M ${x - radius * 0.38} ${y + radius * 0.3} Q ${x} ${y + radius * 0.05} ${x + radius * 0.36} ${y + radius * 0.34}`}
            strokeWidth="0.8"
          />
        </g>
      );
    case "rose-quartz":
      return (
        <path
          d={`M ${x - radius * 0.55} ${y + radius * 0.2} Q ${x - radius * 0.08} ${y - radius * 0.35} ${x + radius * 0.58} ${y + radius * 0.12}`}
          fill="none"
          opacity="0.46"
          stroke={highlight}
          strokeWidth={large ? 1.7 : 1}
        />
      );
    case "water-glass":
      return (
        <path
          d={`M ${x - radius * 0.58} ${y + radius * 0.05} Q ${x} ${y - radius * 0.72} ${x + radius * 0.55} ${y - radius * 0.12}`}
          fill="none"
          opacity="0.72"
          stroke={highlight}
          strokeLinecap="round"
          strokeWidth={large ? 2 : 1.2}
        />
      );
    case "polished-hematite":
      return (
        <ellipse
          cx={x - radius * 0.28}
          cy={y - radius * 0.32}
          fill={highlight}
          fillOpacity="0.62"
          rx={radius * 0.18}
          ry={radius * 0.34}
          transform={`rotate(-28 ${x} ${y})`}
        />
      );
    case "luminous-crystal":
      return (
        <path
          d={`M ${x} ${y - radius * 0.78} L ${x + radius * 0.25} ${y} L ${x} ${y + radius * 0.72} L ${x - radius * 0.23} ${y} Z`}
          fill={highlight}
          fillOpacity="0.42"
        />
      );
    case "moonstone-fire":
      return (
        <circle
          cx={x - radius * 0.2}
          cy={y - radius * 0.22}
          fill={design.palette.aura}
          fillOpacity="0.68"
          r={radius * 0.38}
        />
      );
    case "nacre":
      return (
        <ellipse
          cx={x - radius * 0.2}
          cy={y - radius * 0.26}
          fill={highlight}
          fillOpacity="0.68"
          rx={radius * 0.24}
          ry={radius * 0.34}
        />
      );
    case "satin-onyx":
      return (
        <circle
          cx={x - radius * 0.22}
          cy={y - radius * 0.24}
          fill={highlight}
          fillOpacity="0.25"
          r={radius * 0.22}
        />
      );
  }
}

function CenterMedal({
  active,
  completed,
  design,
  gradientId,
}: {
  active: boolean;
  completed: boolean;
  design: RosaryDesign;
  gradientId: string;
}) {
  const fill = active
    ? `url(#${gradientId}-garnet)`
    : completed
      ? `url(#${gradientId}-gold)`
      : design.palette.centerFill;
  const textFill = active
    ? design.palette.metalBright
    : completed
      ? design.palette.completedShadow
      : design.palette.centerText;

  return (
    <g filter={`url(#${gradientId}-bead-shadow)`}>
      {active ? (
        <ellipse
          className="rosary-bead-halo"
          cx="320"
          cy="532"
          fill="none"
          rx="36"
          ry="33"
          stroke={design.palette.active}
          strokeOpacity="0.82"
          strokeWidth="3"
        />
      ) : null}
      <CenterpieceBody
        design={design}
        fill={fill}
        stroke={design.palette.metalBright}
        strokeWidth={active ? 3 : 2}
      />
      <text
        fill={textFill}
        fontFamily="Georgia, serif"
        fontSize={design.centerMark.length > 3 ? "10" : design.centerMark.length > 1 ? "14" : "22"}
        fontStyle={design.centerMark === "M" ? "italic" : "normal"}
        fontWeight="700"
        letterSpacing={design.centerMark.length > 1 ? "1" : undefined}
        textAnchor="middle"
        x="320"
        y="538"
      >
        {design.centerMark}
      </text>
    </g>
  );
}

function CenterpieceBody({
  design,
  fill,
  stroke,
  strokeWidth,
}: {
  design: RosaryDesign;
  fill: string;
  stroke: string;
  strokeWidth: number;
}) {
  switch (design.centerpieceStyle) {
    case "lourdes-grotto":
      return (
        <path
          d="M 297 558 V 526 C 297 497 343 497 343 526 V 558 L 334 567 H 306 Z"
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
      );
    case "twin-hearts":
      return (
        <g fill={fill} stroke={stroke} strokeWidth={strokeWidth}>
          <path d="M 313 560 C 306 550 294 542 294 528 C 294 515 309 510 320 522 C 331 510 346 515 346 528 C 346 542 334 550 327 560 L 320 568 Z" />
          <path d="M 306 507 L 314 518 M 334 507 L 326 518" fill="none" />
        </g>
      );
    case "guadalupe-mandorla":
      return (
        <g>
          <polygon
            fill={design.palette.metal}
            opacity="0.65"
            points={starPoints(320, 532, 37, 27, 12)}
          />
          <ellipse
            cx="320"
            cy="532"
            fill={fill}
            rx="22"
            ry="34"
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
        </g>
      );
    case "benedict-medal":
      return (
        <g>
          <circle cx="320" cy="532" fill={fill} r="30" stroke={stroke} strokeWidth={strokeWidth} />
          <circle cx="320" cy="532" fill="none" r="22" stroke={stroke} strokeOpacity="0.72" />
        </g>
      );
    case "eucharistic-host":
      return (
        <g>
          <polygon fill={design.palette.metal} opacity="0.6" points={starPoints(320, 532, 37, 28, 16)} />
          <circle cx="320" cy="532" fill={fill} r="27" stroke={stroke} strokeWidth={strokeWidth} />
        </g>
      );
    case "bethlehem-nativity":
      return (
        <path
          d="M 320 500 L 346 522 V 555 L 335 567 H 305 L 294 555 V 522 Z"
          fill={fill}
          stroke={stroke}
          strokeLinejoin="round"
          strokeWidth={strokeWidth}
        />
      );
    case "fatima-crown":
      return (
        <g>
          <path
            d="M 295 520 L 305 510 L 320 522 L 335 510 L 345 520 L 341 558 Q 320 570 299 558 Z"
            fill={fill}
            stroke={stroke}
            strokeLinejoin="round"
            strokeWidth={strokeWidth}
          />
          <circle cx="305" cy="509" fill={design.palette.active} r="3" />
          <circle cx="335" cy="509" fill={design.palette.active} r="3" />
        </g>
      );
    default:
      return (
        <g>
          <polygon fill={design.palette.metal} opacity="0.55" points={starPoints(320, 532, 36, 27, 8)} />
          <path
            d="M 320 503 C 343 503 350 521 342 541 C 337 553 327 560 320 569 C 313 560 303 553 298 541 C 290 521 297 503 320 503 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
        </g>
      );
  }
}

function OpeningGloryStation({
  active,
  design,
  gradientId,
}: {
  active: boolean;
  design: RosaryDesign;
  gradientId: string;
}) {
  return (
    <g filter={active ? `url(#${gradientId}-active-glow)` : undefined}>
      {active ? (
        <circle
          className="rosary-bead-halo"
          cx="320"
          cy="573"
          fill="none"
          r="15"
          stroke={design.palette.active}
          strokeWidth="2"
        />
      ) : null}
      <path
        d="M 317 564 H 323 V 570 H 329 V 576 H 323 V 583 H 317 V 576 H 311 V 570 H 317 Z"
        fill={active ? design.palette.metalBright : design.palette.metal}
        stroke={design.palette.chainShadow}
        strokeWidth="1"
      />
    </g>
  );
}

function DecadeConnectorStations({
  activeDecadeIndex,
  activeStation,
  design,
  gradientId,
}: {
  activeDecadeIndex: number | null;
  activeStation: StationName | null;
  design: RosaryDesign;
  gradientId: string;
}) {
  return (
    <g>
      {decadeStations.map((station) => {
        const gloryActive =
          activeDecadeIndex === station.decadeIndex &&
          activeStation === "decade-glory";
        const fatimaActive =
          activeDecadeIndex === station.decadeIndex &&
          activeStation === "fatima";

        return (
          <g key={`connector-${station.decadeIndex + 1}`}>
            <path
              d={`M ${station.x - 4} ${station.y - 19} H ${station.x + 4} V ${station.y - 12} H ${station.x + 10} V ${station.y - 4} H ${station.x + 4} V ${station.y + 3} H ${station.x - 4} V ${station.y - 4} H ${station.x - 10} V ${station.y - 12} H ${station.x - 4} Z`}
              fill={
                gloryActive
                  ? design.palette.metalBright
                  : design.palette.metal
              }
              filter={
                gloryActive ? `url(#${gradientId}-active-glow)` : undefined
              }
              opacity={gloryActive ? 1 : 0.68}
            />
            <path
              d={`M ${station.x} ${station.y + 9} L ${station.x + 7} ${station.y + 17} L ${station.x} ${station.y + 25} L ${station.x - 7} ${station.y + 17} Z`}
              fill={fatimaActive ? design.palette.active : design.palette.chainLow}
              filter={
                fatimaActive ? `url(#${gradientId}-active-glow)` : undefined
              }
              opacity={fatimaActive ? 1 : 0.62}
              stroke={fatimaActive ? design.palette.metalBright : design.palette.metal}
              strokeWidth="1.5"
            />
          </g>
        );
      })}
    </g>
  );
}

function Crucifix({
  active,
  completed,
  design,
  gradientId,
}: {
  active: boolean;
  completed: boolean;
  design: RosaryDesign;
  gradientId: string;
}) {
  const fill = active
    ? `url(#${gradientId}-garnet)`
    : completed
      ? `url(#${gradientId}-gold)`
      : design.palette.centerFill;

  return (
    <g filter={`url(#${gradientId}-bead-shadow)`}>
      {active ? (
        <circle
          className="rosary-bead-halo"
          cx="320"
          cy="796"
          fill="none"
          r="36"
          stroke={design.palette.active}
          strokeOpacity="0.82"
          strokeWidth="3"
        />
      ) : null}
      <path
        d={getCrucifixPath(design)}
        fill={fill}
        filter={active ? `url(#${gradientId}-active-glow)` : undefined}
        stroke={design.palette.metalBright}
        strokeLinejoin="round"
        strokeWidth={active ? 3 : 2}
      />
      <CrucifixDecoration design={design} />
    </g>
  );
}

function CrucifixDecoration({ design }: { design: RosaryDesign }) {
  const bright = design.palette.metalBright;
  const metal = design.palette.metal;

  switch (design.crucifixStyle) {
    case "lily-filigree":
      return (
        <g fill={bright} fillOpacity="0.82">
          <circle cx="320" cy="762" r="3" />
          <circle cx="297" cy="783" r="3" />
          <circle cx="343" cy="783" r="3" />
        </g>
      );
    case "grotto-silver":
      return <path d="M 320 767 V 818 M 300 783 H 340" fill="none" stroke={bright} strokeOpacity="0.72" strokeWidth="2" />;
    case "sacred-heart":
      return <path d="M 320 793 C 315 787 307 790 309 797 C 311 803 317 806 320 810 C 323 806 329 803 331 797 C 333 790 325 787 320 793 Z" fill={design.palette.active} stroke={bright} />;
    case "radiant-rose":
      return <polygon fill={bright} fillOpacity="0.72" points={starPoints(320, 784, 13, 6, 10)} />;
    case "benedict-bronze":
      return (
        <g>
          <circle cx="320" cy="784" fill={metal} r="10" stroke={bright} />
          <text fill={bright} fontFamily="Georgia, serif" fontSize="6" fontWeight="700" textAnchor="middle" x="320" y="786">PAX</text>
        </g>
      );
    case "eucharistic-gold":
      return (
        <g>
          <circle cx="320" cy="783" fill={bright} fillOpacity="0.88" r="7" />
          <path d="M 314 804 Q 320 797 326 804" fill="none" stroke={bright} strokeWidth="2" />
        </g>
      );
    case "olivewood-pilgrim":
      return (
        <g fill="none" opacity="0.65" stroke={design.palette.paterShadow} strokeWidth="1.4">
          <path d="M 316 766 Q 322 783 317 817" />
          <path d="M 301 780 Q 320 786 339 780" />
        </g>
      );
    case "crowned-light":
      return (
        <g>
          <path d="M 310 772 L 314 765 L 320 772 L 326 765 L 330 772" fill="none" stroke={bright} strokeWidth="2" />
          <polygon fill={bright} fillOpacity="0.78" points={starPoints(320, 785, 9, 4, 8)} />
        </g>
      );
  }
}

function getCrucifixPath(design: RosaryDesign) {
  switch (design.crucifixStyle) {
    case "olivewood-pilgrim":
      return "M 312 756 H 328 V 775 H 344 V 791 H 328 V 828 H 312 V 791 H 296 V 775 H 312 Z";
    case "radiant-rose":
    case "crowned-light":
      return "M 311 757 H 329 L 331 774 L 348 776 V 791 L 331 793 L 329 829 H 311 L 309 793 L 292 791 V 776 L 309 774 Z";
    case "benedict-bronze":
      return "M 310 756 H 330 V 773 H 346 V 793 H 330 V 828 H 310 V 793 H 294 V 773 H 310 Z";
    default:
      return "M 310 758 H 330 V 774 H 347 V 792 H 330 V 828 H 310 V 792 H 293 V 774 H 310 Z";
  }
}

function getVisualProgress(
  step: RosaryStep,
  repetition: number,
  finished: boolean,
): VisualProgress {
  if (finished) {
    return {
      activeBeadOrder: null,
      activeDecadeIndex: null,
      activeStation: "medal",
      completedBeads: 59,
    };
  }

  if (step.id === "opening-sign" || step.id === "opening-creed") {
    return {
      activeBeadOrder: null,
      activeDecadeIndex: null,
      activeStation: "crucifix",
      completedBeads: 0,
    };
  }

  if (step.id === "opening-our-father") {
    return {
      activeBeadOrder: 0,
      activeDecadeIndex: null,
      activeStation: null,
      completedBeads: 0,
    };
  }

  if (step.id === "opening-hail-marys") {
    return {
      activeBeadOrder: 1 + repetition,
      activeDecadeIndex: null,
      activeStation: null,
      completedBeads: 1 + repetition,
    };
  }

  if (step.id === "opening-glory") {
    return {
      activeBeadOrder: null,
      activeDecadeIndex: null,
      activeStation: "opening-glory",
      completedBeads: 4,
    };
  }

  if (typeof step.mysteryIndex === "number") {
    const decadeIndex = step.mysteryIndex;
    const decadeStartOrder = 4 + decadeIndex * 11;

    if (step.kind === "mystery") {
      return {
        activeBeadOrder: null,
        activeDecadeIndex: decadeIndex,
        activeStation: "mystery",
        completedBeads: decadeStartOrder,
      };
    }

    if (step.prayerId === "our_father") {
      return {
        activeBeadOrder: decadeStartOrder,
        activeDecadeIndex: decadeIndex,
        activeStation: null,
        completedBeads: decadeStartOrder,
      };
    }

    if (step.prayerId === "hail_mary") {
      return {
        activeBeadOrder: decadeStartOrder + 1 + repetition,
        activeDecadeIndex: decadeIndex,
        activeStation: null,
        completedBeads: decadeStartOrder + 1 + repetition,
      };
    }

    if (step.prayerId === "fatima_prayer") {
      return {
        activeBeadOrder: null,
        activeDecadeIndex: decadeIndex,
        activeStation: "fatima",
        completedBeads: decadeStartOrder + 11,
      };
    }

    return {
      activeBeadOrder: null,
      activeDecadeIndex: decadeIndex,
      activeStation: "decade-glory",
      completedBeads: decadeStartOrder + 11,
    };
  }

  return {
    activeBeadOrder: null,
    activeDecadeIndex: null,
    activeStation: step.id === "closing-sign" ? "crucifix" : "medal",
    completedBeads: 59,
  };
}

function getActiveTarget(
  step: RosaryStep,
  repetition: number,
  visualProgress: VisualProgress,
): ActiveTarget | null {
  const label = getActiveTargetLabel(step, repetition);

  if (visualProgress.activeBeadOrder !== null) {
    const bead = [...tailBeads, ...loopBeads].find(
      (candidate) => candidate.order === visualProgress.activeBeadOrder,
    );

    return bead ? { x: bead.x, y: bead.y, label } : null;
  }

  if (visualProgress.activeStation === "crucifix") {
    return { x: 320, y: 796, label };
  }

  if (visualProgress.activeStation === "medal") {
    return { x: 320, y: 532, label };
  }

  if (visualProgress.activeStation === "opening-glory") {
    return { x: 320, y: 573, label };
  }

  if (
    visualProgress.activeDecadeIndex !== null &&
    visualProgress.activeStation
  ) {
    const station = decadeStations[visualProgress.activeDecadeIndex];
    const yOffset = visualProgress.activeStation === "fatima" ? 17 : -8;

    return { x: station.x, y: station.y + yOffset, label };
  }

  return null;
}

function getActiveTargetLabel(step: RosaryStep, repetition: number) {
  if (step.kind === "mystery") {
    return `Announce ${step.title} and begin the decade`;
  }

  if (step.repeatTotal > 1) {
    return `Complete ${step.title} ${repetition + 1} of ${step.repeatTotal} and move to the next bead`;
  }

  return `Complete ${step.title} and continue`;
}

function getBeadStatus(
  step: RosaryStep,
  repetition: number,
  visualProgress: VisualProgress,
  finished: boolean,
) {
  if (finished) {
    return "All 59 physical beads are illuminated. Remain a moment in gratitude.";
  }

  const decade =
    visualProgress.activeDecadeIndex === null
      ? null
      : `Decade ${visualProgress.activeDecadeIndex + 1}`;
  const repetitionLabel =
    step.repeatTotal > 1
      ? `, prayer ${repetition + 1} of ${step.repeatTotal}`
      : "";

  if (visualProgress.activeBeadOrder !== null) {
    return `${decade ? `${decade}: ` : ""}bead ${visualProgress.activeBeadOrder + 1} of 59${repetitionLabel}. ${visualProgress.completedBeads} beads offered.`;
  }

  return `${decade ? `${decade}: ` : ""}${step.title}${repetitionLabel}. ${visualProgress.completedBeads} of 59 beads offered.`;
}

function formatVisualPhase(phase: RosaryStep["phase"]) {
  switch (phase) {
    case "opening":
      return "BEGIN IN FAITH";
    case "decade":
      return "WITH MARY";
    case "closing":
      return "REMAIN IN GRACE";
  }
}

function getDesignStyle(design: RosaryDesign) {
  return {
    "--chaplet-active": design.palette.active,
    "--chaplet-aura": design.palette.aura,
    "--chaplet-stage-dark": design.palette.stageDark,
    "--chaplet-stage-light": design.palette.stageLight,
    "--chaplet-stage-mid": design.palette.stageMid,
  } as CSSProperties;
}

function polygonPoints(
  centerX: number,
  centerY: number,
  radius: number,
  sides: number,
) {
  return Array.from({ length: sides }, (_, index) => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / sides;
    return `${round(centerX + Math.cos(angle) * radius)},${round(centerY + Math.sin(angle) * radius)}`;
  }).join(" ");
}

function starPoints(
  centerX: number,
  centerY: number,
  outerRadius: number,
  innerRadius: number,
  points: number,
) {
  return Array.from({ length: points * 2 }, (_, index) => {
    const radius = index % 2 === 0 ? outerRadius : innerRadius;
    const angle = -Math.PI / 2 + (index * Math.PI) / points;
    return `${round(centerX + Math.cos(angle) * radius)},${round(centerY + Math.sin(angle) * radius)}`;
  }).join(" ");
}

function pointOnEllipse(angleInDegrees: number, radiusX: number, radiusY: number) {
  const radians = (angleInDegrees * Math.PI) / 180;

  return {
    x: loopCenter.x + radiusX * Math.cos(radians),
    y: loopCenter.y + radiusY * Math.sin(radians),
  };
}

function round(value: number) {
  return Math.round(value * 10) / 10;
}
