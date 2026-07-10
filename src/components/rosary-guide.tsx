"use client";

import {
  Check,
  ChevronLeft,
  ChevronRight,
  Crown,
  Heart,
  RotateCcw,
  Save,
  Sparkles,
  Sun,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  buildRosarySteps,
  FRUIT_GUIDANCE,
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
  const [wasRestored, setWasRestored] = useState(false);
  const [recommendation, setRecommendation] = useState<TodayRecommendation>({
    setId: "joyful",
    weekday: "Today",
  });
  const guideRegionRef = useRef<HTMLDivElement>(null);
  const shouldFocusGuideRegionRef = useRef(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const today = new Date();
      const recommendedSet = getRecommendedMysterySet(today);
      const storedProgress = readStoredProgress();

      setRecommendation({
        setId: recommendedSet.id,
        weekday: getWeekdayName(today),
      });

      if (storedProgress) {
        setProgress(storedProgress);
        setWasRestored(
          storedProgress.stepIndex > 0 ||
            storedProgress.repetition > 0 ||
            storedProgress.finished,
        );
      } else {
        setProgress((current) => ({
          ...current,
          setId: recommendedSet.id,
        }));
      }

      setHydrated(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
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
    setWasRestored(false);
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
    const step = steps[progress.stepIndex] ?? steps[0];

    if (progress.repetition + 1 >= step.repeatTotal) {
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
    setWasRestored(false);
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
    setWasRestored(false);
  }

  function reset() {
    setProgress((current) => ({
      ...current,
      stepIndex: 0,
      repetition: 0,
      finished: false,
    }));
    setWasRestored(false);
  }

  if (!hydrated) {
    return (
      <section
        aria-busy="true"
        aria-live="polite"
        className="rounded-xl border border-[#d4c6a7] bg-[#fffaf0] p-8 text-center shadow-sm"
      >
        <span
          aria-hidden
          className="mx-auto flex size-12 items-center justify-center rounded-full bg-[#12372c] text-xl text-[#f4d58a]"
        >
          ✠
        </span>
        <p className="mt-4 text-sm font-semibold text-[#12372c]">
          Preparing your Rosary and restoring saved progress…
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-5" aria-label="Guided Rosary">
      <div className="rounded-xl border border-[#d4c6a7] bg-[#fffaf0] p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 border-b border-[#e2d8c3] pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#7f1d1d]">
              Choose the mysteries
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-[#17130b]">
              {recommendation.weekday}: {getMysterySet(recommendation.setId).title}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
              The weekday pattern is a recommendation, not a restriction. Choose
              any set according to your prayer and the liturgical day.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#c8b68f] bg-white px-3 py-2 text-stone-700">
              <Save aria-hidden className="size-3.5 text-[#12372c]" />
              {wasRestored ? "Resumed on this device" : "Progress saves on this device"}
            </span>
            <button
              className="inline-flex items-center gap-2 rounded-full border border-[#c8b68f] bg-white px-3 py-2 text-stone-700 transition hover:border-[#7f1d1d] hover:text-[#7f1d1d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b9852b]"
              onClick={reset}
              type="button"
            >
              <RotateCcw aria-hidden className="size-3.5" />
              Reset
            </button>
          </div>
        </div>

        <fieldset
          aria-describedby="mystery-set-lock-note"
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
          <p
            className="mt-3 text-xs leading-5 text-stone-500"
            id="mystery-set-lock-note"
          >
            {isAtStart
              ? "Mystery selection locks after the first prayer so progress is not lost."
              : "Mystery selection is locked. Reset to the beginning before changing sets."}
          </p>
        </fieldset>

        <div className="mt-4 flex flex-col gap-2 rounded-lg border border-[#e2d8c3] bg-white/75 p-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex cursor-pointer items-start gap-3 text-sm text-stone-800">
            <input
              checked={progress.includeFatimaPrayer}
              className="mt-0.5 size-4 accent-[#7f1d1d] disabled:cursor-not-allowed"
              disabled={!isAtStart}
              onChange={(event) => toggleFatimaPrayer(event.target.checked)}
              type="checkbox"
            />
            <span>
              <span className="block font-semibold">
                Include the optional Fatima prayer after each decade
              </span>
              <span className="mt-0.5 block text-xs leading-5 text-stone-500">
                {isAtStart
                  ? "This optional invocation adds five guided steps."
                  : "Reset to the beginning before changing this option."}
              </span>
            </span>
          </label>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#7f1d1d]">
            {selectedSet.days}
          </p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(16rem,0.62fr)_minmax(0,1.38fr)]">
        <MysteryOutline
          activeMysteryIndex={
            progress.finished ? null : (currentStep.mysteryIndex ?? null)
          }
          complete={progress.finished}
          mysterySet={selectedSet}
        />

        <div
          aria-label={
            progress.finished
              ? "Rosary complete"
              : `Rosary step: ${currentStep.title}`
          }
          className="order-1 scroll-mt-24 outline-none lg:order-2"
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
        "relative min-h-24 rounded-lg border p-3 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b9852b] disabled:cursor-not-allowed disabled:opacity-60",
        selected
          ? setAccentClasses[mysterySet.id]
          : "border-[#d8ccb4] bg-white text-stone-700 hover:border-[#b9852b] hover:bg-[#fffdf7]",
      ].join(" ")}
      disabled={selectionLocked}
      onClick={() => onSelect(mysterySet.id)}
      type="button"
    >
      <span className="flex items-start justify-between gap-2">
        <span className="flex size-9 items-center justify-center rounded-full border border-current/20 bg-white/70">
          <Icon aria-hidden className="size-4" />
        </span>
        {isRecommended ? (
          <span className="rounded-full bg-[#12372c] px-2 py-1 text-[0.65rem] font-bold uppercase tracking-wide text-[#fff3cf]">
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

function MysteryOutline({
  mysterySet,
  activeMysteryIndex,
  complete,
}: {
  mysterySet: RosaryMysterySet;
  activeMysteryIndex: number | null;
  complete: boolean;
}) {
  return (
    <aside className="order-2 rounded-xl border border-[#12372c] bg-[#12372c] p-5 text-[#fff4d6] shadow-sm lg:order-1">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#e5c778]">
        Five mysteries
      </p>
      <h2 className="mt-2 text-xl font-semibold">{mysterySet.title}</h2>
      <ol className="mt-5 space-y-2">
        {mysterySet.mysteries.map((mystery, index) => {
          const active = index === activeMysteryIndex;

          return (
            <li
              aria-current={active ? "step" : undefined}
              className={[
                "grid grid-cols-[2rem_1fr] gap-3 rounded-lg border p-3 transition",
                active
                  ? "border-[#e5c778] bg-[#1b493a]"
                  : "border-[#2c5a4b] bg-[#163f33]",
              ].join(" ")}
              key={mystery.id}
            >
              <span
                className={[
                  "flex size-8 items-center justify-center rounded-full text-xs font-bold",
                  complete
                    ? "bg-[#e5c778] text-[#12372c]"
                    : active
                      ? "bg-[#fff4d6] text-[#7f1d1d]"
                      : "border border-[#6e8a7f] text-[#f7e8bd]",
                ].join(" ")}
              >
                {complete ? <Check aria-hidden className="size-4" /> : index + 1}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold leading-5">
                  {mystery.title}
                </span>
                <span className="mt-1 block text-xs text-[#d9cda9]">
                  {mystery.scripture}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
      <p className="mt-5 border-t border-[#416a5c] pt-4 text-xs leading-5 text-[#d9cda9]">
        The Rosary is Christ-centered contemplation with Mary. Scripture anchors
        the scene; repetition makes room for attentive prayer.
      </p>
    </aside>
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
    <article className="order-1 overflow-hidden rounded-xl border border-[#d4c6a7] bg-[#fffaf0] shadow-sm lg:order-2">
      <header className="border-b border-[#ddcfb3] bg-[#f5ecd9] px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="rounded-full bg-[#7f1d1d] px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-white">
            {formatPhase(step.phase)}
          </span>
          <span className="text-xs font-semibold text-stone-600">
            Guided step {stepIndex + 1} of {totalSteps}
          </span>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <progress
            aria-label={`Rosary ${progressPercent}% complete`}
            className="h-2 w-full accent-[#7f1d1d]"
            max={100}
            value={progressPercent}
          />
          <span className="w-10 text-right text-xs font-bold text-[#7f1d1d]">
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
          <div className="mb-5 border-l-4 border-[#b9852b] bg-[#f8f0df] px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7f1d1d]">
              Continue contemplating
            </p>
            <p className="mt-1 text-sm font-semibold text-[#12372c]">
              {currentMystery.title} · {currentMystery.scripture}
            </p>
          </div>
        ) : null}

        <p className="text-sm leading-6 text-stone-600">{step.instruction}</p>

        {step.kind === "mystery" && currentMystery ? (
          <MysteryMeditation mystery={currentMystery} />
        ) : null}

        {prayer ? (
          <div className="mt-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#7f1d1d]">
                  Pray slowly
                </p>
                <h2 className="mt-2 font-serif text-3xl font-semibold leading-tight text-[#17130b]">
                  {prayer.title}
                </h2>
              </div>
              {step.repeatTotal > 1 ? (
                <span className="rounded-full border border-[#c7b78f] bg-white px-3 py-1.5 text-xs font-bold text-[#12372c]">
                  {repetition + 1} of {step.repeatTotal}
                  {repetitionLabel ? ` · ${repetitionLabel}` : ""}
                </span>
              ) : null}
            </div>

            <p className="mt-6 whitespace-pre-line border-y border-[#e1d5bd] py-6 font-serif text-xl leading-9 text-stone-900 sm:text-[1.35rem]">
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

        <div className="mt-7 flex flex-col-reverse gap-3 border-t border-[#e1d5bd] pt-5 sm:flex-row sm:items-center sm:justify-between">
          <button
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-[#bcae91] bg-white px-4 text-sm font-semibold text-stone-700 transition hover:border-[#12372c] hover:text-[#12372c] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b9852b]"
            disabled={isFirstStep}
            onClick={onBack}
            type="button"
          >
            <ChevronLeft aria-hidden className="size-4" />
            Previous
          </button>
          <button
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#7f1d1d] px-5 text-sm font-bold text-white shadow-sm transition hover:bg-[#681818] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b9852b]"
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
      <div className="rounded-lg border border-[#cbb98f] bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#7f1d1d]">
              Scripture anchor
            </p>
            <h2 className="mt-2 font-serif text-3xl font-semibold leading-tight text-[#17130b]">
              {mystery.title}
            </h2>
            <p className="mt-2 text-sm font-bold text-[#12372c]">
              {mystery.scripture}
            </p>
          </div>
          <div className="shrink-0 rounded-lg border border-[#dccca8] bg-[#fff7df] px-4 py-3 sm:max-w-48">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-[#7f1d1d]">
              Traditional fruit
            </p>
            <p className="mt-1 text-sm font-semibold text-[#12372c]">
              {mystery.fruit}
            </p>
          </div>
        </div>
        <p className="mt-5 font-serif text-xl leading-8 text-stone-800">
          {mystery.meditation}
        </p>
        <p className="mt-4 text-xs leading-5 text-stone-500">
          {FRUIT_GUIDANCE}
        </p>
      </div>

      {mystery.typologicalNote ? (
        <div className="rounded-lg border border-[#b9852b] bg-[#fff3cf] p-4 text-sm leading-6 text-[#52370f]">
          <p className="font-bold">About this Scripture anchor</p>
          <p className="mt-1">{mystery.typologicalNote}</p>
        </div>
      ) : null}
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
                ? "border-[#b9852b] bg-[#b9852b]"
                : index === current
                  ? "border-[#7f1d1d] bg-[#fffaf0] ring-2 ring-[#7f1d1d]/20"
                  : "border-[#b7aa8e] bg-white",
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
    <article className="order-1 flex min-h-[34rem] flex-col items-center justify-center rounded-xl border border-[#b9852b] bg-[#fffaf0] p-6 text-center shadow-sm lg:order-2 sm:p-10">
      <span className="flex size-16 items-center justify-center rounded-full bg-[#12372c] text-[#f4d58a] shadow-sm">
        <Check aria-hidden className="size-8" />
      </span>
      <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-[#7f1d1d]">
        Rosary complete
      </p>
      <h2 className="mt-3 font-serif text-4xl font-semibold text-[#17130b]">
        Remain a moment in gratitude.
      </h2>
      <p className="mt-4 max-w-xl text-base leading-7 text-stone-600">
        You completed {mysterySet.title.toLowerCase()}
        {includeFatimaPrayer ? " with the optional Fatima prayer" : ""}.
        Entrust your intentions to God and carry the mystery into the next
        faithful act.
      </p>
      <div className="mt-8 flex w-full max-w-md flex-col gap-3 sm:flex-row">
        <button
          className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-md border border-[#bcae91] bg-white px-4 text-sm font-semibold text-stone-700 transition hover:border-[#12372c] hover:text-[#12372c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b9852b]"
          onClick={onBack}
          type="button"
        >
          <ChevronLeft aria-hidden className="size-4" />
          Review final prayer
        </button>
        <button
          className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-md bg-[#7f1d1d] px-4 text-sm font-bold text-white transition hover:bg-[#681818] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b9852b]"
          onClick={onPrayAgain}
          type="button"
        >
          <RotateCcw aria-hidden className="size-4" />
          Pray this set again
        </button>
      </div>
      <p className="mt-6 text-xs text-stone-500">
        Completion is saved locally on this device until you begin again.
      </p>
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
