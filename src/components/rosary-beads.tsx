"use client";

import { useId } from "react";
import type {
  RosaryMysterySet,
  RosaryStep,
} from "@/lib/rosary";

type RosaryBeadsProps = {
  mysterySet: RosaryMysterySet;
  step: RosaryStep;
  repetition: number;
  finished: boolean;
  progressPercent: number;
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
  mysterySet,
  step,
  repetition,
  finished,
  progressPercent,
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
      aria-labelledby={`${gradientId}-chaplet-title`}
      className="relative overflow-hidden rounded-xl border border-[#315d4e] bg-[radial-gradient(circle_at_50%_34%,#1d5a47_0%,#0b3429_46%,#061d18_100%)] text-[#fff4d6] shadow-[inset_0_1px_0_rgb(255_255_255/0.08),0_24px_70px_rgb(4_18_14/0.25)]"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-[15%] top-[18%] aspect-square rounded-full bg-[#d8b66c]/10 blur-3xl"
      />

      <header className="relative z-10 border-b border-[#416a5c]/80 px-5 py-5 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#e7c978]">
              The living chaplet
            </p>
            <h2
              className="mt-2 font-serif text-2xl font-semibold text-[#fff8e7]"
              id={`${gradientId}-chaplet-title`}
            >
              {finished ? "Every bead has been offered." : step.title}
            </h2>
          </div>
          <span className="rounded-full border border-[#d8b66c]/50 bg-[#071f19]/55 px-3 py-1.5 text-xs font-bold text-[#f2d991]">
            {visualProgress.completedBeads} / 59 beads
          </span>
        </div>
        {currentMystery ? (
          <p className="mt-3 text-xs font-bold uppercase tracking-[0.12em] text-[#e7c978]">
            {currentMystery.title} · {currentMystery.scripture}
          </p>
        ) : null}
        <p
          className={`${currentMystery ? "mt-2" : "mt-3"} text-sm leading-6 text-[#d9cda9]`}
          id={statusId}
        >
          {status}
        </p>
      </header>

      <div className="relative z-10 mx-auto w-full max-w-[35rem] px-2 pb-1 pt-3 sm:px-4">
        <div className="relative aspect-[16/21] w-full">
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
                <stop offset="0" stopColor="#8a6428" />
                <stop offset="0.5" stopColor="#efd58d" />
                <stop offset="1" stopColor="#9d762f" />
              </linearGradient>
              <radialGradient
                cx="34%"
                cy="28%"
                id={`${gradientId}-pearl`}
                r="72%"
              >
                <stop offset="0" stopColor="#fffef7" />
                <stop offset="0.48" stopColor="#efe3c8" />
                <stop offset="1" stopColor="#a9956b" />
              </radialGradient>
              <radialGradient
                cx="32%"
                cy="28%"
                id={`${gradientId}-garnet`}
                r="72%"
              >
                <stop offset="0" stopColor="#c65e5e" />
                <stop offset="0.4" stopColor="#8d292e" />
                <stop offset="1" stopColor="#3f0c12" />
              </radialGradient>
              <radialGradient
                cx="31%"
                cy="26%"
                id={`${gradientId}-gold`}
                r="75%"
              >
                <stop offset="0" stopColor="#fff2b3" />
                <stop offset="0.42" stopColor="#d8a848" />
                <stop offset="1" stopColor="#765016" />
              </radialGradient>
              <filter
                height="260%"
                id={`${gradientId}-active-glow`}
                width="260%"
                x="-80%"
                y="-80%"
              >
                <feGaussianBlur result="blur" stdDeviation="8" />
                <feFlood floodColor="#f7d77f" floodOpacity="0.92" />
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
                  floodColor="#020b08"
                  floodOpacity="0.68"
                  stdDeviation="2.2"
                />
              </filter>
            </defs>

            <g fill="none" strokeLinecap="round" strokeLinejoin="round">
              <polyline
                points={loopChainPoints}
                stroke="#3b2a12"
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
                stroke="#3b2a12"
                strokeWidth="8"
              />
              <path
                d={`M ${round(loopBeads[0].x)} ${round(loopBeads[0].y)} Q 285 505 306 522`}
                stroke={`url(#${gradientId}-chain)`}
                strokeWidth="3"
              />
              <path
                d={`M ${round(loopBeads[loopBeads.length - 1].x)} ${round(loopBeads[loopBeads.length - 1].y)} Q 355 505 334 522`}
                stroke="#3b2a12"
                strokeWidth="8"
              />
              <path
                d={`M ${round(loopBeads[loopBeads.length - 1].x)} ${round(loopBeads[loopBeads.length - 1].y)} Q 355 505 334 522`}
                stroke={`url(#${gradientId}-chain)`}
                strokeWidth="3"
              />
              <path
                d="M 320 552 L 320 807"
                stroke="#3b2a12"
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
                stroke="#d8b66c"
                strokeDasharray="2 9"
                strokeLinecap="round"
                strokeOpacity="0.48"
                strokeWidth="2"
              />
              <circle
                cx="320"
                cy="270"
                fill="#08271f"
                fillOpacity="0.64"
                r="67"
                stroke="#d8b66c"
                strokeOpacity="0.5"
              />
              <text
                fill="#e7c978"
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
                fill="#fff4d6"
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
                      stroke="#f6d984"
                      strokeOpacity="0.72"
                      strokeWidth="2"
                    />
                  ) : null}
                  <circle
                    cx={station.x}
                    cy={station.y}
                    fill="#0a2b22"
                    r="11"
                    stroke={active ? "#f7df9c" : "#9d7a3e"}
                    strokeWidth={active ? 2.5 : 1.5}
                  />
                  <text
                    dominantBaseline="central"
                    fill={active ? "#fff4d6" : "#d4bd7d"}
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
                gradientId={gradientId}
                key={bead.id}
              />
            ))}

            <OpeningGloryStation
              active={visualProgress.activeStation === "opening-glory"}
              gradientId={gradientId}
            />

            <CenterMedal
              active={visualProgress.activeStation === "medal"}
              completed={visualProgress.completedBeads >= 4}
              gradientId={gradientId}
            />

            {tailBeads.map((bead) => (
              <BeadGlyph
                active={visualProgress.activeBeadOrder === bead.order}
                bead={bead}
                completed={bead.order < visualProgress.completedBeads}
                gradientId={gradientId}
                key={bead.id}
              />
            ))}

            <DecadeConnectorStations
              activeDecadeIndex={visualProgress.activeDecadeIndex}
              activeStation={visualProgress.activeStation}
              gradientId={gradientId}
            />

            <Crucifix
              active={visualProgress.activeStation === "crucifix"}
              completed={
                finished ||
                !["opening-sign", "opening-creed"].includes(step.id)
              }
              gradientId={gradientId}
            />
          </svg>

          {!finished && activeTarget ? (
            <button
              aria-describedby={statusId}
              aria-label={activeTarget.label}
              className="rosary-bead-touch absolute z-20 size-12 -translate-x-1/2 -translate-y-1/2 rounded-full bg-transparent transition hover:bg-[#fff4d6]/10 focus-visible:bg-[#fff4d6]/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f6d984]"
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

      <footer className="relative z-10 border-t border-[#416a5c]/80 bg-[#061d18]/45 px-5 py-4 sm:px-6">
        <div className="flex items-center justify-between gap-4 text-xs font-semibold">
          <span className="text-[#e7c978]">
            {finished
              ? "The chaplet is complete"
              : "Touch the illuminated bead to continue"}
          </span>
          <span className="text-[#d9cda9]">{progressPercent}% prayer complete</span>
        </div>
        <div
          aria-hidden
          className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#020e0b]/80"
        >
          <div
            className="h-full rounded-full bg-[linear-gradient(90deg,#8f6727,#f2d88c)] transition-[width] duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[0.68rem] font-bold uppercase tracking-[0.12em] text-[#cdbb8c]">
          <LegendSwatch className="bg-[#fff7df]" label="Awaiting" />
          <LegendSwatch className="bg-[#d8a848]" label="Offered" />
          <LegendSwatch className="bg-[#8d292e] ring-2 ring-[#f6d984]" label="Current" />
        </div>
      </footer>
    </section>
  );
}

function BeadGlyph({
  bead,
  active,
  completed,
  gradientId,
}: {
  bead: BeadPoint;
  active: boolean;
  completed: boolean;
  gradientId: string;
}) {
  const radius = bead.large ? 14 : 8;
  const fill = active
    ? `url(#${gradientId}-garnet)`
    : completed
      ? `url(#${gradientId}-gold)`
      : bead.large
        ? `url(#${gradientId}-garnet)`
        : `url(#${gradientId}-pearl)`;

  return (
    <g filter={active ? `url(#${gradientId}-bead-shadow)` : undefined}>
      {active ? (
        <circle
          className="rosary-bead-halo"
          cx={bead.x}
          cy={bead.y}
          fill="none"
          r={radius + 9}
          stroke="#f6d984"
          strokeOpacity="0.82"
          strokeWidth="3"
        />
      ) : null}
      <circle
        className={active ? "rosary-bead-current" : undefined}
        cx={bead.x}
        cy={bead.y}
        fill={fill}
        filter={active ? `url(#${gradientId}-active-glow)` : undefined}
        r={radius}
        stroke={active ? "#fff4d6" : completed ? "#f5d985" : "#9d7a3e"}
        strokeWidth={active ? 3 : bead.large ? 2.25 : 1.5}
      />
      <circle
        cx={bead.x - radius * 0.27}
        cy={bead.y - radius * 0.31}
        fill="#fff"
        fillOpacity={active || completed ? 0.55 : 0.72}
        r={Math.max(1.4, radius * 0.2)}
      />
    </g>
  );
}

function CenterMedal({
  active,
  completed,
  gradientId,
}: {
  active: boolean;
  completed: boolean;
  gradientId: string;
}) {
  return (
    <g filter={`url(#${gradientId}-bead-shadow)`}>
      {active ? (
        <ellipse
          className="rosary-bead-halo"
          cx="320"
          cy="532"
          fill="none"
          rx="34"
          ry="31"
          stroke="#f6d984"
          strokeOpacity="0.82"
          strokeWidth="3"
        />
      ) : null}
      <path
        d="M 320 503 C 343 503 350 521 342 541 C 337 553 327 560 320 569 C 313 560 303 553 298 541 C 290 521 297 503 320 503 Z"
        fill={
          active
            ? `url(#${gradientId}-garnet)`
            : completed
              ? `url(#${gradientId}-gold)`
              : "#12372c"
        }
        stroke={active ? "#fff4d6" : "#d8b66c"}
        strokeWidth={active ? 3 : 2}
      />
      <text
        fill={active ? "#fff4d6" : completed ? "#4a2e0d" : "#e7c978"}
        fontFamily="Georgia, serif"
        fontSize="22"
        fontStyle="italic"
        textAnchor="middle"
        x="320"
        y="539"
      >
        M
      </text>
    </g>
  );
}

function OpeningGloryStation({
  active,
  gradientId,
}: {
  active: boolean;
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
          stroke="#f6d984"
          strokeWidth="2"
        />
      ) : null}
      <path
        d="M 317 564 H 323 V 570 H 329 V 576 H 323 V 583 H 317 V 576 H 311 V 570 H 317 Z"
        fill={active ? "#fff4d6" : "#c79a49"}
        stroke="#6f4a18"
        strokeWidth="1"
      />
    </g>
  );
}

function DecadeConnectorStations({
  activeDecadeIndex,
  activeStation,
  gradientId,
}: {
  activeDecadeIndex: number | null;
  activeStation: StationName | null;
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
              fill={gloryActive ? "#fff4d6" : "#a87d35"}
              filter={
                gloryActive ? `url(#${gradientId}-active-glow)` : undefined
              }
              opacity={gloryActive ? 1 : 0.68}
            />
            <path
              d={`M ${station.x} ${station.y + 9} L ${station.x + 7} ${station.y + 17} L ${station.x} ${station.y + 25} L ${station.x - 7} ${station.y + 17} Z`}
              fill={fatimaActive ? "#fff0a6" : "#8a6428"}
              filter={
                fatimaActive ? `url(#${gradientId}-active-glow)` : undefined
              }
              opacity={fatimaActive ? 1 : 0.62}
              stroke={fatimaActive ? "#fff4d6" : "#c99e50"}
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
  gradientId,
}: {
  active: boolean;
  completed: boolean;
  gradientId: string;
}) {
  return (
    <g filter={`url(#${gradientId}-bead-shadow)`}>
      {active ? (
        <circle
          className="rosary-bead-halo"
          cx="320"
          cy="796"
          fill="none"
          r="34"
          stroke="#f6d984"
          strokeOpacity="0.82"
          strokeWidth="3"
        />
      ) : null}
      <path
        d="M 310 758 H 330 V 774 H 347 V 792 H 330 V 828 H 310 V 792 H 293 V 774 H 310 Z"
        fill={
          active
            ? `url(#${gradientId}-garnet)`
            : completed
              ? `url(#${gradientId}-gold)`
              : "#7f1d1d"
        }
        filter={active ? `url(#${gradientId}-active-glow)` : undefined}
        stroke={active ? "#fff4d6" : "#e0bd6a"}
        strokeLinejoin="round"
        strokeWidth={active ? 3 : 2}
      />
      <circle cx="320" cy="784" fill="#fff4d6" fillOpacity="0.78" r="4" />
    </g>
  );
}

function LegendSwatch({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span aria-hidden className={`size-2.5 rounded-full ${className}`} />
      {label}
    </span>
  );
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
        activeBeadOrder: decadeStartOrder,
        activeDecadeIndex: decadeIndex,
        activeStation: null,
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
