"use client";

import {
  Check,
  ChevronLeft,
  ChevronRight,
  Crown,
  Heart,
  RotateCcw,
  Sparkles,
  Sun,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { RosaryBeads } from "@/components/rosary-beads";
import {
  buildRosarySteps,
  getMysterySet,
  getRecommendedMysterySet,
  getWeekdayName,
  isMysterySetId,
  MYSTERY_SETS,
  ROSARY_PRAYERS,
  type MysterySetId,
  type RosaryMystery,
  type RosaryMysterySet,
  type RosaryStep,
} from "@/lib/rosary";

type ProgressState = {
  setId: MysterySetId;
  stepIndex: number;
  repetition: number;
  includeFatimaPrayer: boolean;
  finished: boolean;
};

type TodayRecommendation = {
  setId: MysterySetId;
  weekday: string;
};

const storageKey = "sanctum-council:rosary-progress:v1";
const initialProgress: ProgressState = {
  setId: "joyful",
  stepIndex: 0,
  repetition: 0,
  includeFatimaPrayer: false,
  finished: false,
};

const mysterySetIcons: Record<MysterySetId, LucideIcon> = {
  joyful: Sparkles,
  luminous: Sun,
  sorrowful: Heart,
  glorious: Crown,
};

const setAccentClasses: Record<MysterySetId, string> = {
  joyful: "border-[#b9852b] bg-[#fff6dc] text-[#12372c]",
  luminous: "border-[#b9852b] bg-[#ffefb8] text-[#4f3510]",
  sorrowful: "border-[#7f1d1d] bg-[#fff0ed] text-[#681818]",
  glorious: "border-[#12372c] bg-[#e8f0eb] text-[#12372c]",
};

export function RosaryGuide() {
  const [progress, setProgress] =
    useState<ProgressState>(initialProgress);
  const [hydrated, setHydrated] = useState(false);
  const [recommendation, setRecommendation] = useState<TodayRecommendation>({
    setId: "joyful",
    weekday: "Today",
  });
  const guideRegionRef = useRef<HTMLDivElement>(null);
  const shouldFocusGuideRegionRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    window.queueMicrotask(() => {
      if (cancelled) {
        return;
      }

      const today = new Date();
      const recommendedSet = getRecommendedMysterySet(today);
      const storedProgress = readStoredProgress();

      setRecommendation({
        setId: recommendedSet.id,
        weekday: getWeekdayName(today),
      });

      if (storedProgress) {
        setProgress(storedProgress);
      } else {
        setProgress((current) => ({
          ...current,
          setId: recommendedSet.id,
        }));
      }

      setHydrated(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    try {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({
          version: 1,
          ...progress,
          updatedAt: new Date().toISOString(),
        }),
      );
    } catch {
      return;
    }
  }, [hydrated, progress]);

  useEffect(() => {
    if (!shouldFocusGuideRegionRef.current) {
      return;
    }

    shouldFocusGuideRegionRef.current = false;
    const frameId = window.requestAnimationFrame(() => {
      guideRegionRef.current?.focus({ preventScroll: true });
      guideRegionRef.current?.scrollIntoView({ block: "start" });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [progress.finished, progress.stepIndex]);

  const steps = useMemo(
    () =>
      buildRosarySteps(progress.setId, progress.includeFatimaPrayer),
    [progress.includeFatimaPrayer, progress.setId],
  );
  const selectedSet = getMysterySet(progress.setId);
  const currentStep = steps[progress.stepIndex] ?? steps[0];
  const currentMystery = getStepMystery(selectedSet, currentStep);
  const totalUnits = getTotalUnits(steps);
  const completedUnits = progress.finished
    ? totalUnits
    : getCompletedUnits(steps, progress.stepIndex, progress.repetition);
  const progressPercent = Math.round((completedUnits / totalUnits) * 100);
  const isAtStart =
    progress.stepIndex === 0 &&
    progress.repetition === 0 &&
    !progress.finished;

  function selectMysterySet(setId: MysterySetId) {
    if (!isAtStart) {
      return;
    }

    setProgress((current) => ({
      ...current,
      setId,
      stepIndex: 0,
      repetition: 0,
      finished: false,
    }));
  }

  function toggleFatimaPrayer(includeFatimaPrayer: boolean) {
    if (!isAtStart) {
      return;
    }

    setProgress((current) => ({
      ...current,
      includeFatimaPrayer,
    }));
  }

  function advance() {
    advanceProgress(true);
  }

  function advanceFromBead() {
    const step = steps[progress.stepIndex] ?? steps[0];
    const isFinishing =
      progress.stepIndex >= steps.length - 1 &&
      progress.repetition + 1 >= step.repeatTotal;

    advanceProgress(isFinishing);
  }

  function advanceProgress(focusGuideOnStepChange: boolean) {
    const step = steps[progress.stepIndex] ?? steps[0];

    if (
      focusGuideOnStepChange &&
      progress.repetition + 1 >= step.repeatTotal
    ) {
      shouldFocusGuideRegionRef.current = true;
    }

    setProgress((current) => {
      const currentSteps = buildRosarySteps(
        current.setId,
        current.includeFatimaPrayer,
      );
      const step = currentSteps[current.stepIndex] ?? currentSteps[0];
      const nextRepetition = current.repetition + 1;

      if (nextRepetition < step.repeatTotal) {
        return { ...current, repetition: nextRepetition };
      }

      if (current.stepIndex >= currentSteps.length - 1) {
        return {
          ...current,
          repetition: step.repeatTotal,
          finished: true,
        };
      }

      return {
        ...current,
        stepIndex: current.stepIndex + 1,
        repetition: 0,
      };
    });
  }

  function goBack() {
    if (
      progress.finished ||
      (progress.repetition === 0 && progress.stepIndex > 0)
    ) {
      shouldFocusGuideRegionRef.current = true;
    }

    setProgress((current) => {
      const currentSteps = buildRosarySteps(
        current.setId,
        current.includeFatimaPrayer,
      );

      if (current.finished) {
        const lastStep = currentSteps[currentSteps.length - 1];
        return {
          ...current,
          finished: false,
          stepIndex: currentSteps.length - 1,
          repetition: Math.max(0, lastStep.repeatTotal - 1),
        };
      }

      if (current.repetition > 0) {
        return { ...current, repetition: current.repetition - 1 };
      }

      if (current.stepIndex === 0) {
        return current;
      }

      const previousStepIndex = current.stepIndex - 1;
      const previousStep = currentSteps[previousStepIndex];

      return {
        ...current,
        stepIndex: previousStepIndex,
        repetition: Math.max(0, previousStep.repeatTotal - 1),
      };
    });
  }

  function reset() {
    setProgress((current) => ({
      ...current,
      stepIndex: 0,
      repetition: 0,
      finished: false,
    }));
  }

  if (!hydrated) {
    return (
      <section
        aria-busy="true"
        aria-live="polite"
        className="rounded-xl border border-hairline bg-vellum p-8 text-center shadow-[var(--shadow-soft)]"
      >
        <span
          aria-hidden
          className="mx-auto flex size-12 items-center justify-center rounded-full bg-sanctuary-night text-xl text-[var(--gilt-light)]"
        >
          ✠
        </span>
        <p className="mt-4 text-sm font-semibold text-sanctuary-night">
          Preparing the Rosary…
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-5" aria-label="Guided Rosary">
      <div className="rounded-xl border border-hairline bg-vellum p-4 shadow-[var(--shadow-soft)] sm:p-5">
        <div className="flex flex-col gap-4 border-b border-hairline pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-oxblood">
              Choose the mysteries
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-foreground">
              {recommendation.weekday}: {getMysterySet(recommendation.setId).title}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            <button
              className="inline-flex items-center gap-2 rounded-full border border-hairline bg-vellum px-3 py-2 text-muted transition hover:border-oxblood hover:text-oxblood focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gilt"
              onClick={reset}
              type="button"
            >
              <RotateCcw aria-hidden className="size-3.5" />
              Reset
            </button>
          </div>
        </div>

        <fieldset
          aria-describedby={isAtStart ? undefined : "mystery-set-lock-note"}
          className="mt-4"
        >
          <legend className="sr-only">Select a set of Rosary mysteries</legend>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            {MYSTERY_SETS.map((mysterySet) => (
              <MysterySetButton
                isRecommended={mysterySet.id === recommendation.setId}
                key={mysterySet.id}
                mysterySet={mysterySet}
                onSelect={selectMysterySet}
                selected={mysterySet.id === progress.setId}
                selectionLocked={!isAtStart}
              />
            ))}
          </div>
          {!isAtStart ? (
            <p
              className="mt-3 text-xs leading-5 text-muted"
              id="mystery-set-lock-note"
            >
              Reset to change mysteries.
            </p>
          ) : null}
        </fieldset>

        <div className="mt-4 flex flex-col gap-2 rounded-lg border border-hairline bg-[var(--panel-soft)] p-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex cursor-pointer items-start gap-3 text-sm text-foreground">
            <input
              checked={progress.includeFatimaPrayer}
              className="mt-0.5 size-4 accent-oxblood disabled:cursor-not-allowed"
              disabled={!isAtStart}
              onChange={(event) => toggleFatimaPrayer(event.target.checked)}
              type="checkbox"
            />
            <span>
              <span className="block font-semibold">
                Include the optional Fatima prayer after each decade
              </span>
              <span className="mt-0.5 block text-xs leading-5 text-muted">
                {isAtStart
                  ? "This optional invocation adds five guided steps."
                  : "Reset to the beginning before changing this option."}
              </span>
            </span>
          </label>
          <p className="text-xs font-semibold uppercase tracking-wide text-oxblood">
            {selectedSet.days}
          </p>
        </div>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(21rem,0.84fr)_minmax(0,1.16fr)] xl:grid-cols-[minmax(23rem,0.78fr)_minmax(0,1.22fr)]">
        <div className="order-1 lg:sticky lg:top-24 lg:self-start">
          <RosaryBeads
            finished={progress.finished}
            mysterySet={selectedSet}
            onAdvance={advanceFromBead}
            progressPercent={progressPercent}
            repetition={progress.repetition}
            step={currentStep}
          />
        </div>

        <div
          aria-label={
            progress.finished
              ? "Rosary complete"
              : `Rosary step: ${currentStep.title}`
          }
          className="order-2 scroll-mt-24 outline-none"
          ref={guideRegionRef}
          role="region"
          tabIndex={-1}
        >
          {progress.finished ? (
            <CompletionPanel
              includeFatimaPrayer={progress.includeFatimaPrayer}
              mysterySet={selectedSet}
              onBack={goBack}
              onPrayAgain={reset}
            />
          ) : (
            <GuideStep
              currentMystery={currentMystery}
              onAdvance={advance}
              onBack={goBack}
              progressPercent={progressPercent}
              repetition={progress.repetition}
              step={currentStep}
              stepIndex={progress.stepIndex}
              totalSteps={steps.length}
            />
          )}
        </div>
      </div>
    </section>
  );
}

function MysterySetButton({
  mysterySet,
  selected,
  selectionLocked,
  isRecommended,
  onSelect,
}: {
  mysterySet: RosaryMysterySet;
  selected: boolean;
  selectionLocked: boolean;
  isRecommended: boolean;
  onSelect: (setId: MysterySetId) => void;
}) {
  const Icon = mysterySetIcons[mysterySet.id];

  return (
    <button
      aria-pressed={selected}
      className={[
        "relative min-h-24 rounded-lg border p-3 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gilt disabled:cursor-not-allowed disabled:opacity-60",
        selected
          ? setAccentClasses[mysterySet.id]
          : "border-hairline bg-vellum text-muted hover:border-gilt hover:bg-[var(--panel-soft)]",
      ].join(" ")}
      disabled={selectionLocked}
      onClick={() => onSelect(mysterySet.id)}
      type="button"
    >
      <span className="flex items-start justify-between gap-2">
        <span className="flex size-9 items-center justify-center rounded-full border border-current/20 bg-vellum/70">
          <Icon aria-hidden className="size-4" />
        </span>
        {isRecommended ? (
          <span className="rounded-full bg-sanctuary-night px-2 py-1 text-[0.65rem] font-bold uppercase tracking-wide text-[var(--gilt-light)]">
            Today
          </span>
        ) : null}
      </span>
      <span className="mt-3 block text-sm font-bold">
        {mysterySet.shortTitle}
      </span>
      <span className="mt-1 block text-xs opacity-75">{mysterySet.days}</span>
    </button>
  );
}

function GuideStep({
  step,
  stepIndex,
  totalSteps,
  repetition,
  progressPercent,
  currentMystery,
  onAdvance,
  onBack,
}: {
  step: RosaryStep;
  stepIndex: number;
  totalSteps: number;
  repetition: number;
  progressPercent: number;
  currentMystery: RosaryMystery | null;
  onAdvance: () => void;
  onBack: () => void;
}) {
  const prayer = step.prayerId ? ROSARY_PRAYERS[step.prayerId] : null;
  const repetitionLabel = step.repetitionLabels?.[repetition];
  const isFirstStep = stepIndex === 0 && repetition === 0;

  return (
    <article className="order-1 overflow-hidden rounded-xl border border-hairline bg-vellum shadow-[var(--shadow-soft)] lg:order-2">
      <header className="border-b border-hairline bg-[var(--panel-soft)] px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="rounded-full bg-oxblood px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-vellum">
            {formatPhase(step.phase)}
          </span>
          <span className="text-xs font-semibold text-muted">
            Guided step {stepIndex + 1} of {totalSteps}
          </span>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <progress
            aria-label={`Rosary ${progressPercent}% complete`}
            className="h-2 w-full accent-oxblood"
            max={100}
            value={progressPercent}
          />
          <span className="w-10 text-right text-xs font-bold text-oxblood">
            {progressPercent}%
          </span>
        </div>
      </header>

      <div className="p-5 sm:p-7">
        <p aria-live="polite" className="sr-only">
          {step.title}
          {step.repeatTotal > 1
            ? `, repetition ${repetition + 1} of ${step.repeatTotal}`
            : ""}
        </p>

        {currentMystery && step.kind === "prayer" ? (
          <div className="mb-5 border-l-4 border-gilt bg-[var(--panel-soft)] px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-oxblood">
              Continue contemplating
            </p>
            <p className="mt-1 text-sm font-semibold text-ecclesial-green">
              {currentMystery.title} · {currentMystery.scripture}
            </p>
          </div>
        ) : null}

        <p className="text-sm leading-6 text-muted">{step.instruction}</p>

        {step.kind === "mystery" && currentMystery ? (
          <MysteryMeditation mystery={currentMystery} />
        ) : null}

        {prayer ? (
          <div className="mt-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-oxblood">
                  Pray slowly
                </p>
                <h2 className="mt-2 font-serif text-3xl font-semibold leading-tight text-foreground">
                  {prayer.title}
                </h2>
              </div>
              {step.repeatTotal > 1 ? (
                <span className="rounded-full border border-hairline bg-vellum px-3 py-1.5 text-xs font-bold text-ecclesial-green">
                  {repetition + 1} of {step.repeatTotal}
                  {repetitionLabel ? ` · ${repetitionLabel}` : ""}
                </span>
              ) : null}
            </div>

            <p className="mt-6 whitespace-pre-line border-y border-hairline py-6 font-serif text-xl leading-9 text-foreground sm:text-[1.35rem]">
              {prayer.text}
            </p>

            {step.repeatTotal > 1 ? (
              <BeadCounter
                completed={repetition}
                current={repetition}
                total={step.repeatTotal}
              />
            ) : null}
          </div>
        ) : null}

        <div className="mt-7 flex flex-col-reverse gap-3 border-t border-hairline pt-5 sm:flex-row sm:items-center sm:justify-between">
          <button
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-hairline bg-vellum px-4 text-sm font-semibold text-muted transition hover:border-ecclesial-green hover:text-ecclesial-green disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gilt"
            disabled={isFirstStep}
            onClick={onBack}
            type="button"
          >
            <ChevronLeft aria-hidden className="size-4" />
            Previous
          </button>
          <button
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-oxblood px-5 text-sm font-bold text-vellum shadow-sm transition hover:bg-liturgical-red focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gilt"
            onClick={onAdvance}
            type="button"
          >
            {getAdvanceLabel(step, repetition, stepIndex, totalSteps)}
            <ChevronRight aria-hidden className="size-4" />
          </button>
        </div>
      </div>
    </article>
  );
}

function MysteryMeditation({ mystery }: { mystery: RosaryMystery }) {
  return (
    <div className="mt-6 space-y-4">
      <div className="rounded-lg border border-hairline bg-vellum p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-oxblood">
              Scripture anchor
            </p>
            <h2 className="mt-2 font-serif text-3xl font-semibold leading-tight text-foreground">
              {mystery.title}
            </h2>
            <p className="mt-2 text-sm font-bold text-ecclesial-green">
              {mystery.scripture}
            </p>
          </div>
          <div className="shrink-0 rounded-lg border border-gilt/45 bg-[var(--panel-soft)] px-4 py-3 sm:max-w-48">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-oxblood">
              Traditional fruit
            </p>
            <p className="mt-1 text-sm font-semibold text-ecclesial-green">
              {mystery.fruit}
            </p>
          </div>
        </div>
        <p className="mt-5 font-serif text-xl leading-8 text-foreground">
          {mystery.meditation}
        </p>
      </div>
    </div>
  );
}

function BeadCounter({
  completed,
  current,
  total,
}: {
  completed: number;
  current: number;
  total: number;
}) {
  return (
    <div className="mt-5">
      <p className="sr-only">
        {completed} of {total} repetitions completed
      </p>
      <div aria-hidden className="flex flex-wrap items-center justify-center gap-2">
        {Array.from({ length: total }, (_, index) => (
          <span
            className={[
              "size-4 rounded-full border transition sm:size-[1.125rem]",
              index < completed
                ? "border-gilt bg-gilt"
                : index === current
                  ? "border-oxblood bg-vellum ring-2 ring-oxblood/20"
                  : "border-hairline bg-vellum",
            ].join(" ")}
            key={`${total}-${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

function CompletionPanel({
  mysterySet,
  includeFatimaPrayer,
  onPrayAgain,
  onBack,
}: {
  mysterySet: RosaryMysterySet;
  includeFatimaPrayer: boolean;
  onPrayAgain: () => void;
  onBack: () => void;
}) {
  return (
    <article className="order-1 flex min-h-[34rem] flex-col items-center justify-center rounded-xl border border-gilt bg-vellum p-6 text-center shadow-[var(--shadow-soft)] lg:order-2 sm:p-10">
      <span className="flex size-16 items-center justify-center rounded-full bg-sanctuary-night text-[var(--gilt-light)] shadow-sm">
        <Check aria-hidden className="size-8" />
      </span>
      <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-oxblood">
        Rosary complete
      </p>
      <h2 className="mt-3 font-serif text-4xl font-semibold text-foreground">
        Remain a moment in gratitude.
      </h2>
      <p className="mt-4 max-w-xl text-base leading-7 text-muted">
        You completed {mysterySet.title.toLowerCase()}
        {includeFatimaPrayer ? " with the optional Fatima prayer" : ""}.
        Entrust your intentions to God and carry the mystery into the next
        faithful act.
      </p>
      <div className="mt-8 flex w-full max-w-md flex-col gap-3 sm:flex-row">
        <button
          className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-md border border-hairline bg-vellum px-4 text-sm font-semibold text-muted transition hover:border-ecclesial-green hover:text-ecclesial-green focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gilt"
          onClick={onBack}
          type="button"
        >
          <ChevronLeft aria-hidden className="size-4" />
          Review final prayer
        </button>
        <button
          className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-md bg-oxblood px-4 text-sm font-bold text-vellum transition hover:bg-liturgical-red focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gilt"
          onClick={onPrayAgain}
          type="button"
        >
          <RotateCcw aria-hidden className="size-4" />
          Pray this set again
        </button>
      </div>
    </article>
  );
}

function getStepMystery(
  mysterySet: RosaryMysterySet,
  step: RosaryStep,
) {
  return typeof step.mysteryIndex === "number"
    ? (mysterySet.mysteries[step.mysteryIndex] ?? null)
    : null;
}

function getTotalUnits(steps: readonly RosaryStep[]) {
  return steps.reduce((total, step) => total + step.repeatTotal, 0);
}

function getCompletedUnits(
  steps: readonly RosaryStep[],
  stepIndex: number,
  repetition: number,
) {
  const priorUnits = steps
    .slice(0, stepIndex)
    .reduce((total, step) => total + step.repeatTotal, 0);

  return priorUnits + repetition;
}

function getAdvanceLabel(
  step: RosaryStep,
  repetition: number,
  stepIndex: number,
  totalSteps: number,
) {
  if (step.kind === "mystery") {
    return "Begin this decade";
  }

  if (step.repeatTotal > 1) {
    return `Complete prayer ${repetition + 1} of ${step.repeatTotal}`;
  }

  if (stepIndex === totalSteps - 1) {
    return "Finish the Rosary";
  }

  return "Prayer complete · continue";
}

function formatPhase(phase: RosaryStep["phase"]) {
  switch (phase) {
    case "opening":
      return "Opening prayers";
    case "decade":
      return "The five decades";
    case "closing":
      return "Closing prayers";
  }
}

function readStoredProgress(): ProgressState | null {
  try {
    const rawValue = window.localStorage.getItem(storageKey);

    if (!rawValue) {
      return null;
    }

    const parsed = JSON.parse(rawValue) as Partial<ProgressState> & {
      version?: unknown;
    };

    if (parsed.version !== 1 || !isMysterySetId(parsed.setId)) {
      return null;
    }

    const includeFatimaPrayer = parsed.includeFatimaPrayer === true;
    const steps = buildRosarySteps(parsed.setId, includeFatimaPrayer);
    const requestedStepIndex = Number.isInteger(parsed.stepIndex)
      ? Number(parsed.stepIndex)
      : 0;
    const stepIndex = Math.min(
      Math.max(0, requestedStepIndex),
      steps.length - 1,
    );
    const step = steps[stepIndex];
    const finished = parsed.finished === true;
    const requestedRepetition = Number.isInteger(parsed.repetition)
      ? Number(parsed.repetition)
      : 0;
    const maximumRepetition = finished
      ? step.repeatTotal
      : Math.max(0, step.repeatTotal - 1);

    return {
      setId: parsed.setId,
      includeFatimaPrayer,
      stepIndex: finished ? steps.length - 1 : stepIndex,
      repetition: finished
        ? steps[steps.length - 1].repeatTotal
        : Math.min(Math.max(0, requestedRepetition), maximumRepetition),
      finished,
    };
  } catch {
    return null;
  }
}
