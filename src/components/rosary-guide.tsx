"use client";

import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Crown,
  Heart,
  Maximize2,
  Minimize2,
  MoreHorizontal,
  RotateCcw,
  Sparkles,
  Sun,
  Vibrate,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import {
  type KeyboardEvent,
  type RefObject,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { RosaryBeads } from "@/components/rosary-beads";
import { RosaryDesignPicker } from "@/components/rosary-design-picker";
import {
  buildRosarySteps,
  getMysterySet,
  isMysterySetId,
  MYSTERY_SETS,
  ROSARY_PRAYERS,
  type MysterySetId,
  type RosaryMystery,
  type RosaryMysterySet,
  type RosaryStep,
} from "@/lib/rosary";
import {
  DEFAULT_ROSARY_DESIGN_ID,
  getRosaryDesign,
  isRosaryDesignId,
  type RosaryDesignId,
} from "@/lib/rosary-designs";

type RosaryGuideProps = {
  localDate: string;
  liturgicalSeason: string;
  recommendedSetId: MysterySetId;
  scriptureExcerpts: Record<string, string>;
  weekday: string;
};

type ProgressState = {
  setId: MysterySetId;
  stepIndex: number;
  repetition: number;
  includeFatimaPrayer: boolean;
  started: boolean;
  finished: boolean;
};

type RosaryPreferences = {
  haptics: boolean;
  keepAwake: boolean;
};

type WakeLockSentinelLike = {
  release: () => Promise<void>;
};

type NavigatorWithWakeLock = Navigator & {
  wakeLock?: {
    request: (type: "screen") => Promise<WakeLockSentinelLike>;
  };
};

const progressStorageKey = "sanctum-council:rosary-progress:v2";
const preferencesStorageKey = "sanctum-council:rosary-preferences:v1";
const designStorageKey = "sanctum-council:rosary-design:v1";

const mysterySetIcons: Record<MysterySetId, LucideIcon> = {
  joyful: Sparkles,
  luminous: Sun,
  sorrowful: Heart,
  glorious: Crown,
};

const defaultPreferences: RosaryPreferences = {
  haptics: true,
  keepAwake: true,
};

export function RosaryGuide({
  localDate,
  liturgicalSeason,
  recommendedSetId,
  scriptureExcerpts,
  weekday,
}: RosaryGuideProps) {
  const [progress, setProgress] = useState<ProgressState>(() =>
    createInitialProgress(recommendedSetId),
  );
  const [preferences, setPreferences] =
    useState<RosaryPreferences>(defaultPreferences);
  const [designId, setDesignId] = useState<RosaryDesignId>(
    DEFAULT_ROSARY_DESIGN_ID,
  );
  const [ready, setReady] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [wakeLockSupported, setWakeLockSupported] = useState(false);
  const chamberRef = useRef<HTMLElement>(null);
  const settingsRef = useRef<HTMLDetailsElement>(null);
  const wakeLockRef = useRef<WakeLockSentinelLike | null>(null);

  useEffect(() => {
    let cancelled = false;

    window.queueMicrotask(() => {
      if (cancelled) {
        return;
      }

      const storedProgress = readStoredProgress(localDate, recommendedSetId);
      const storedPreferences = readStoredPreferences();
      const storedDesignId = readStoredDesignId();
      const navigatorWithWakeLock = navigator as NavigatorWithWakeLock;

      setProgress(storedProgress);
      setPreferences(storedPreferences);
      setDesignId(storedDesignId);
      setFocusMode(storedProgress.started && !storedProgress.finished);
      setWakeLockSupported(Boolean(navigatorWithWakeLock.wakeLock));
      setReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [localDate, recommendedSetId]);

  useEffect(() => {
    if (!ready) {
      return;
    }

    storeValue(progressStorageKey, {
      version: 2,
      localDate,
      updatedAt: new Date().toISOString(),
      ...progress,
    });
  }, [localDate, progress, ready]);

  useEffect(() => {
    if (!ready) {
      return;
    }

    storeValue(preferencesStorageKey, {
      version: 1,
      ...preferences,
    });
  }, [preferences, ready]);

  useEffect(() => {
    if (!ready) {
      return;
    }

    storeValue(designStorageKey, {
      version: 1,
      designId,
    });
  }, [designId, ready]);

  useEffect(() => {
    if (!focusMode) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const backgroundElements = [
      document.querySelector<HTMLElement>(".oratory-header"),
      document.querySelector<HTMLElement>(".mobile-oratory-nav"),
      document.querySelector<HTMLElement>(".skip-link"),
    ].filter((element): element is HTMLElement => Boolean(element));
    const backgroundState = backgroundElements.map((element) => ({
      element,
      inert: element.inert,
      ariaHidden: element.getAttribute("aria-hidden"),
    }));

    document.body.style.overflow = "hidden";
    backgroundElements.forEach((element) => {
      element.inert = true;
      element.setAttribute("aria-hidden", "true");
    });

    return () => {
      document.body.style.overflow = previousOverflow;
      backgroundState.forEach(({ element, inert, ariaHidden }) => {
        element.inert = inert;

        if (ariaHidden === null) {
          element.removeAttribute("aria-hidden");
        } else {
          element.setAttribute("aria-hidden", ariaHidden);
        }
      });
    };
  }, [focusMode]);

  useEffect(() => {
    if (!progress.started) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      chamberRef.current?.focus({ preventScroll: true });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [focusMode, progress.started]);

  useEffect(() => {
    const navigatorWithWakeLock = navigator as NavigatorWithWakeLock;
    const shouldStayAwake =
      preferences.keepAwake && progress.started && !progress.finished;
    let cancelled = false;

    async function releaseWakeLock() {
      const lock = wakeLockRef.current;
      wakeLockRef.current = null;

      if (lock) {
        await lock.release().catch(() => undefined);
      }
    }

    async function requestWakeLock() {
      if (
        cancelled ||
        !shouldStayAwake ||
        document.visibilityState !== "visible" ||
        !navigatorWithWakeLock.wakeLock ||
        wakeLockRef.current
      ) {
        return;
      }

      try {
        const lock = await navigatorWithWakeLock.wakeLock.request("screen");

        if (cancelled) {
          await lock.release();
          return;
        }

        wakeLockRef.current = lock;
      } catch {
        return;
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        void requestWakeLock();
      } else {
        void releaseWakeLock();
      }
    }

    void requestWakeLock();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      void releaseWakeLock();
    };
  }, [preferences.keepAwake, progress.finished, progress.started]);

  const steps = useMemo(
    () => buildRosarySteps(progress.setId, progress.includeFatimaPrayer),
    [progress.includeFatimaPrayer, progress.setId],
  );
  const selectedSet = getMysterySet(progress.setId);
  const selectedDesign = getRosaryDesign(designId);
  const currentStep = steps[progress.stepIndex] ?? steps[0];
  const currentMystery = getStepMystery(selectedSet, currentStep);

  function vibrate(pattern: number | number[]) {
    if (preferences.haptics && "vibrate" in navigator) {
      navigator.vibrate(pattern);
    }
  }

  function beginRosary() {
    setProgress((current) => ({
      ...current,
      stepIndex: current.finished ? 0 : current.stepIndex,
      repetition: current.finished ? 0 : current.repetition,
      started: true,
      finished: false,
    }));
    setFocusMode(true);
    vibrate(14);
  }

  function selectMysterySet(setId: MysterySetId, beginImmediately = false) {
    setProgress((current) => ({
      ...current,
      setId,
      stepIndex: 0,
      repetition: 0,
      started: beginImmediately,
      finished: false,
    }));
    settingsRef.current?.removeAttribute("open");

    if (beginImmediately) {
      setFocusMode(true);
      vibrate(14);
    }
  }

  function toggleFatimaPrayer(includeFatimaPrayer: boolean) {
    setProgress((current) => {
      const currentSteps = buildRosarySteps(
        current.setId,
        current.includeFatimaPrayer,
      );
      const nextSteps = buildRosarySteps(current.setId, includeFatimaPrayer);
      const currentStep = currentSteps[current.stepIndex] ?? currentSteps[0];
      let nextStepIndex = nextSteps.findIndex(
        (candidate) => candidate.id === currentStep.id,
      );

      if (nextStepIndex === -1) {
        nextStepIndex = nextSteps.findIndex((candidate) => {
          const oldIndex = currentSteps.findIndex(
            (oldCandidate) => oldCandidate.id === candidate.id,
          );
          return oldIndex > current.stepIndex;
        });
      }

      const safeStepIndex =
        nextStepIndex === -1 ? nextSteps.length - 1 : nextStepIndex;
      const nextStep = nextSteps[safeStepIndex];

      return {
        ...current,
        includeFatimaPrayer,
        stepIndex: safeStepIndex,
        repetition: Math.min(
          current.repetition,
          Math.max(0, nextStep.repeatTotal - 1),
        ),
      };
    });
  }

  function advance() {
    if (progress.finished) {
      return;
    }

    const isDecadeBoundary =
      currentStep.phase === "decade" &&
      currentStep.prayerId ===
        (progress.includeFatimaPrayer ? "fatima_prayer" : "glory_be");
    vibrate(isDecadeBoundary ? [16, 42, 16] : 11);

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
    vibrate(8);
    setProgress((current) => {
      const currentSteps = buildRosarySteps(
        current.setId,
        current.includeFatimaPrayer,
      );

      if (current.finished) {
        const finalStep = currentSteps.at(-1) ?? currentSteps[0];
        return {
          ...current,
          finished: false,
          stepIndex: currentSteps.length - 1,
          repetition: Math.max(0, finalStep.repeatTotal - 1),
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

  function beginAgain() {
    setProgress((current) => ({
      ...current,
      stepIndex: 0,
      repetition: 0,
      started: true,
      finished: false,
    }));
    settingsRef.current?.removeAttribute("open");
    setFocusMode(true);
    vibrate(14);
  }

  function returnToThreshold() {
    const nextProgress: ProgressState = {
      ...progress,
      stepIndex: 0,
      repetition: 0,
      started: false,
      finished: false,
    };

    setProgress(nextProgress);
    storeValue(progressStorageKey, {
      version: 2,
      localDate,
      updatedAt: new Date().toISOString(),
      ...nextProgress,
    });
    setFocusMode(false);
  }

  function toggleHaptics() {
    setPreferences((current) => {
      const haptics = !current.haptics;

      if (haptics && "vibrate" in navigator) {
        navigator.vibrate(12);
      }

      return { ...current, haptics };
    });
  }

  function handleChamberKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape" && focusMode) {
      event.preventDefault();
      setFocusMode(false);
      return;
    }

    if (event.key === "Tab" && focusMode) {
      const focusable = chamberRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])',
      );

      if (focusable?.length) {
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (
          event.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === chamberRef.current)
        ) {
          event.preventDefault();
          last.focus();
          return;
        }

        if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
          return;
        }
      }
    }

    if (
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      (event.target as HTMLElement).closest(
        "a, input, select, textarea, summary, .rosary-settings",
      )
    ) {
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      advance();
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      goBack();
    }
  }

  if (!progress.started) {
    return (
      <RosaryThreshold
        includeFatimaPrayer={progress.includeFatimaPrayer}
        liturgicalSeason={liturgicalSeason}
        onBegin={beginRosary}
        onSelectDesign={setDesignId}
        onSelect={selectMysterySet}
        onToggleFatima={toggleFatimaPrayer}
        ready={ready}
        recommendedSetId={recommendedSetId}
        selectedDesignId={designId}
        selectedSetId={progress.setId}
        weekday={weekday}
      />
    );
  }

  const currentDecade =
    typeof currentStep.mysteryIndex === "number"
      ? currentStep.mysteryIndex
      : null;
  const completedDecades =
    progress.finished || currentStep.phase === "closing"
      ? 5
      : currentDecade ?? 0;

  return (
    <section
      aria-label="The Most Holy Rosary"
      aria-modal={focusMode ? true : undefined}
      className={[
        "rosary-prayer-chamber",
        focusMode ? "rosary-focus-mode" : "",
      ].join(" ")}
      onKeyDown={handleChamberKeyDown}
      ref={chamberRef}
      role={focusMode ? "dialog" : undefined}
      tabIndex={-1}
    >
      <header className="rosary-chamber-header">
        <div className="min-w-0">
          <p className="rosary-eyebrow">The Most Holy Rosary</p>
          <div className="mt-1 flex min-w-0 items-baseline gap-2">
            <h1 className="truncate font-serif text-xl font-semibold text-[var(--rosary-pearl)] sm:text-2xl">
              {selectedSet.title}
            </h1>
            {currentMystery ? (
              <span className="hidden truncate text-xs text-[var(--rosary-mist)] sm:inline">
                {currentMystery.title}
              </span>
            ) : null}
          </div>
        </div>

        <MysteryRail
          activeDecade={currentDecade}
          completedDecades={completedDecades}
          finished={progress.finished}
          mysterySet={selectedSet}
        />

        <div className="flex items-center gap-1.5">
          <button
            aria-label={focusMode ? "Leave focus mode" : "Enter focus mode"}
            className="rosary-icon-button"
            onClick={() => setFocusMode((current) => !current)}
            title={focusMode ? "Leave focus mode" : "Enter focus mode"}
            type="button"
          >
            {focusMode ? (
              <Minimize2 aria-hidden className="size-4" />
            ) : (
              <Maximize2 aria-hidden className="size-4" />
            )}
          </button>

          <RosarySettings
            haptics={preferences.haptics}
            includeFatimaPrayer={progress.includeFatimaPrayer}
            keepAwake={preferences.keepAwake}
            onBeginAgain={beginAgain}
            onSelectDesign={setDesignId}
            onSelectMysterySet={(setId) =>
              selectMysterySet(setId, true)
            }
            onToggleFatima={toggleFatimaPrayer}
            onToggleHaptics={toggleHaptics}
            onToggleKeepAwake={() =>
              setPreferences((current) => ({
                ...current,
                keepAwake: !current.keepAwake,
              }))
            }
            ref={settingsRef}
            selectedDesignId={designId}
            selectedSetId={progress.setId}
            wakeLockSupported={wakeLockSupported}
          />
        </div>
      </header>

      <div className="rosary-chamber-grid">
        <div className="rosary-chaplet-pane">
          <RosaryBeads
            design={selectedDesign}
            finished={progress.finished}
            mysterySet={selectedSet}
            onAdvance={advance}
            repetition={progress.repetition}
            step={currentStep}
          />
        </div>

        <div className="rosary-prayer-pane">
          {progress.finished ? (
            <CompletionPanel
              onBack={goBack}
              onPrayAgain={beginAgain}
              onReturnToToday={returnToThreshold}
            />
          ) : (
            <PrayerPanel
              currentMystery={currentMystery}
              onAdvance={advance}
              onBack={goBack}
              repetition={progress.repetition}
              scriptureExcerpt={
                currentMystery ? scriptureExcerpts[currentMystery.id] : undefined
              }
              step={currentStep}
              stepIndex={progress.stepIndex}
              totalSteps={steps.length}
            />
          )}
        </div>
      </div>

      {!focusMode ? (
        <button
          className="rosary-return-threshold"
          onClick={returnToThreshold}
          type="button"
        >
          <ArrowLeft aria-hidden className="size-4" />
          Mysteries
        </button>
      ) : null}
    </section>
  );
}

function RosaryThreshold({
  selectedSetId,
  recommendedSetId,
  weekday,
  liturgicalSeason,
  includeFatimaPrayer,
  ready,
  selectedDesignId,
  onSelect,
  onSelectDesign,
  onToggleFatima,
  onBegin,
}: {
  selectedSetId: MysterySetId;
  recommendedSetId: MysterySetId;
  weekday: string;
  liturgicalSeason: string;
  includeFatimaPrayer: boolean;
  ready: boolean;
  selectedDesignId: RosaryDesignId;
  onSelect: (setId: MysterySetId) => void;
  onSelectDesign: (designId: RosaryDesignId) => void;
  onToggleFatima: (include: boolean) => void;
  onBegin: () => void;
}) {
  const selectedSet = getMysterySet(selectedSetId);

  return (
    <section className="rosary-threshold" aria-labelledby="rosary-heading">
      <div aria-hidden className="rosary-threshold-stars" />
      <div className="rosary-threshold-content">
        <div className="rosary-marian-seal" aria-hidden>
          M
        </div>
        <p className="rosary-eyebrow mt-6">The Most Holy Rosary</p>
        <h1
          className="mt-3 max-w-4xl font-serif text-4xl font-semibold leading-[1.02] tracking-[-0.025em] text-[var(--rosary-pearl)] sm:text-6xl lg:text-7xl"
          id="rosary-heading"
        >
          With Mary, look upon Christ.
        </h1>
        <p className="mt-5 font-serif text-lg italic text-[var(--rosary-mist)] sm:text-xl">
          {weekday} · {liturgicalSeason}
        </p>

        <fieldset className="mt-10">
          <legend className="sr-only">Choose the mysteries</legend>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            {MYSTERY_SETS.map((mysterySet) => (
              <MysteryChoice
                isRecommended={mysterySet.id === recommendedSetId}
                key={mysterySet.id}
                mysterySet={mysterySet}
                onSelect={onSelect}
                selected={mysterySet.id === selectedSetId}
              />
            ))}
          </div>
        </fieldset>

        <RosaryDesignPicker
          onSelect={onSelectDesign}
          selectedDesignId={selectedDesignId}
        />

        <div className="mt-8 flex flex-col gap-4 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <label className="inline-flex min-h-11 cursor-pointer items-center gap-3 text-sm font-semibold text-[var(--rosary-mist)]">
            <input
              checked={includeFatimaPrayer}
              className="size-4 accent-[var(--rosary-gold)]"
              onChange={(event) => onToggleFatima(event.target.checked)}
              type="checkbox"
            />
            Fatima prayer after each decade
          </label>

          <button
            className="rosary-primary-action"
            disabled={!ready}
            onClick={onBegin}
            type="button"
          >
            Begin the {selectedSet.shortTitle} Mysteries
            <ChevronRight aria-hidden className="size-5" />
          </button>
        </div>
      </div>
    </section>
  );
}

function MysteryChoice({
  mysterySet,
  selected,
  isRecommended,
  onSelect,
}: {
  mysterySet: RosaryMysterySet;
  selected: boolean;
  isRecommended: boolean;
  onSelect: (setId: MysterySetId) => void;
}) {
  const Icon = mysterySetIcons[mysterySet.id];

  return (
    <button
      aria-pressed={selected}
      className={[
        "rosary-mystery-choice",
        selected ? "rosary-mystery-choice-active" : "",
      ].join(" ")}
      onClick={() => onSelect(mysterySet.id)}
      type="button"
    >
      <span className="flex items-start justify-between gap-3">
        <span className="rosary-mystery-icon">
          <Icon aria-hidden className="size-4" />
        </span>
        {isRecommended ? (
          <span className="rosary-today-pill">Today</span>
        ) : null}
      </span>
      <span className="mt-4 block font-serif text-xl font-semibold text-[var(--rosary-pearl)]">
        {mysterySet.shortTitle}
      </span>
      <span className="mt-1 block text-xs leading-5 text-[var(--rosary-mist)]">
        {mysterySet.days}
      </span>
    </button>
  );
}

function MysteryRail({
  mysterySet,
  activeDecade,
  completedDecades,
  finished,
}: {
  mysterySet: RosaryMysterySet;
  activeDecade: number | null;
  completedDecades: number;
  finished: boolean;
}) {
  return (
    <div
      aria-label={
        finished
          ? "Five decades complete"
          : activeDecade === null
            ? "Opening prayers"
            : `Decade ${activeDecade + 1} of five`
      }
      className="hidden items-center gap-2 md:flex"
      role="img"
    >
      {mysterySet.mysteries.map((mystery, index) => {
        const complete = finished || index < completedDecades;
        const active = !finished && activeDecade === index;

        return (
          <span
            aria-hidden
            className={[
              "rosary-decade-dot",
              complete ? "rosary-decade-dot-complete" : "",
              active ? "rosary-decade-dot-active" : "",
            ].join(" ")}
            key={mystery.id}
            title={mystery.title}
          />
        );
      })}
    </div>
  );
}

const RosarySettings = function RosarySettings({
  ref,
  selectedSetId,
  includeFatimaPrayer,
  haptics,
  keepAwake,
  wakeLockSupported,
  onSelectMysterySet,
  onToggleFatima,
  onToggleHaptics,
  onToggleKeepAwake,
  onBeginAgain,
  onSelectDesign,
  selectedDesignId,
}: {
  ref: RefObject<HTMLDetailsElement | null>;
  selectedSetId: MysterySetId;
  includeFatimaPrayer: boolean;
  haptics: boolean;
  keepAwake: boolean;
  wakeLockSupported: boolean;
  onSelectMysterySet: (setId: MysterySetId) => void;
  onToggleFatima: (include: boolean) => void;
  onToggleHaptics: () => void;
  onToggleKeepAwake: () => void;
  onBeginAgain: () => void;
  onSelectDesign: (designId: RosaryDesignId) => void;
  selectedDesignId: RosaryDesignId;
}) {
  return (
    <details className="rosary-settings" ref={ref}>
      <summary aria-label="Rosary settings" className="rosary-icon-button">
        <MoreHorizontal aria-hidden className="size-5" />
      </summary>
      <div className="rosary-settings-panel">
        <p className="rosary-settings-heading">Mysteries</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {MYSTERY_SETS.map((mysterySet) => {
            const Icon = mysterySetIcons[mysterySet.id];

            return (
              <button
                aria-pressed={mysterySet.id === selectedSetId}
                className={[
                  "rosary-settings-mystery",
                  mysterySet.id === selectedSetId
                    ? "rosary-settings-mystery-active"
                    : "",
                ].join(" ")}
                key={mysterySet.id}
                onClick={() => onSelectMysterySet(mysterySet.id)}
                type="button"
              >
                <Icon aria-hidden className="size-4" />
                {mysterySet.shortTitle}
              </button>
            );
          })}
        </div>

        <RosaryDesignPicker
          compact
          onSelect={onSelectDesign}
          selectedDesignId={selectedDesignId}
        />

        <div className="mt-4 space-y-1 border-t border-white/10 pt-3">
          <SettingsToggle
            checked={includeFatimaPrayer}
            label="Fatima prayer"
            onToggle={() => onToggleFatima(!includeFatimaPrayer)}
          />
          <SettingsToggle
            checked={haptics}
            Icon={Vibrate}
            label="Haptic beads"
            onToggle={onToggleHaptics}
          />
          {wakeLockSupported ? (
            <SettingsToggle
              checked={keepAwake}
              label="Keep screen awake"
              onToggle={onToggleKeepAwake}
            />
          ) : null}
        </div>

        <button
          className="rosary-begin-again"
          onClick={onBeginAgain}
          type="button"
        >
          <RotateCcw aria-hidden className="size-4" />
          Reset Rosary
        </button>
      </div>
    </details>
  );
};

function SettingsToggle({
  checked,
  label,
  onToggle,
  Icon,
}: {
  checked: boolean;
  label: string;
  onToggle: () => void;
  Icon?: LucideIcon;
}) {
  return (
    <button
      aria-checked={checked}
      className="rosary-settings-toggle"
      onClick={onToggle}
      role="switch"
      type="button"
    >
      <span className="inline-flex items-center gap-2">
        {Icon ? <Icon aria-hidden className="size-4" /> : null}
        {label}
      </span>
      <span
        aria-hidden
        className={[
          "rosary-switch",
          checked ? "rosary-switch-active" : "",
        ].join(" ")}
      >
        <span />
      </span>
    </button>
  );
}

function PrayerPanel({
  step,
  stepIndex,
  totalSteps,
  repetition,
  currentMystery,
  scriptureExcerpt,
  onAdvance,
  onBack,
}: {
  step: RosaryStep;
  stepIndex: number;
  totalSteps: number;
  repetition: number;
  currentMystery: RosaryMystery | null;
  scriptureExcerpt?: string;
  onAdvance: () => void;
  onBack: () => void;
}) {
  const prayer = step.prayerId ? ROSARY_PRAYERS[step.prayerId] : null;
  const repetitionLabel = step.repetitionLabels?.[repetition];
  const isAtStart = stepIndex === 0 && repetition === 0;

  return (
    <article className="rosary-prayer-card">
      <div className="rosary-prayer-scroll" key={step.id}>
        {step.kind === "mystery" && currentMystery ? (
          <MysteryMeditation
            mystery={currentMystery}
            scriptureExcerpt={scriptureExcerpt}
          />
        ) : null}

        {prayer ? (
          <div className="rosary-vocal-prayer">
            {currentMystery ? (
              <p className="rosary-current-mystery">
                {currentMystery.title} · {currentMystery.scripture}
              </p>
            ) : (
              <p className="rosary-current-mystery">
                {formatPhase(step.phase)}
              </p>
            )}

            <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
              <h2 className="font-serif text-4xl font-semibold leading-none tracking-[-0.02em] text-[var(--rosary-ink)] sm:text-5xl">
                {prayer.title}
              </h2>
              {step.repeatTotal > 1 ? (
                <span className="rosary-repetition">
                  {repetition + 1} of {step.repeatTotal}
                  {repetitionLabel ? ` · ${repetitionLabel}` : ""}
                </span>
              ) : null}
            </div>

            <PrayerText text={prayer.text} />
          </div>
        ) : null}
      </div>

      <PrayerActions
        advanceLabel={getAdvanceLabel(step, repetition, stepIndex, totalSteps)}
        backDisabled={isAtStart}
        onAdvance={onAdvance}
        onBack={onBack}
      />
    </article>
  );
}

function MysteryMeditation({
  mystery,
  scriptureExcerpt,
}: {
  mystery: RosaryMystery;
  scriptureExcerpt?: string;
}) {
  return (
    <div className="rosary-mystery-meditation">
      <p className="rosary-current-mystery">Announce the mystery</p>
      <h2 className="mt-4 max-w-3xl font-serif text-4xl font-semibold leading-[1.04] tracking-[-0.025em] text-[var(--rosary-ink)] sm:text-6xl">
        {mystery.title}
      </h2>
      <p className="mt-4 text-sm font-bold uppercase tracking-[0.15em] text-[var(--rosary-blue)]">
        {mystery.scripture}
      </p>

      {scriptureExcerpt ? (
        <blockquote className="rosary-scripture-excerpt">
          “{scriptureExcerpt}”
        </blockquote>
      ) : null}

      <div className="rosary-silence" aria-label="Pause in silence">
        <span aria-hidden />
        <span>Silence</span>
        <span aria-hidden />
      </div>

      <p className="max-w-3xl font-serif text-xl leading-8 text-[var(--rosary-ink)] sm:text-2xl sm:leading-9">
        {mystery.meditation}
      </p>
      <p className="mt-6 inline-flex rounded-full border border-[var(--rosary-gold)]/45 bg-[var(--rosary-gold)]/10 px-4 py-2 text-sm font-semibold text-[var(--rosary-blue-deep)]">
        {mystery.fruit}
      </p>
    </div>
  );
}

function PrayerText({ text }: { text: string }) {
  return (
    <p className="rosary-prayer-text">
      {text.split(/(Jesus)/g).map((part, index) =>
        part === "Jesus" ? (
          <em className="rosary-holy-name" key={`${part}-${index}`}>
            {part}
          </em>
        ) : (
          part
        ),
      )}
    </p>
  );
}

function PrayerActions({
  backDisabled,
  advanceLabel,
  onBack,
  onAdvance,
}: {
  backDisabled: boolean;
  advanceLabel: string;
  onBack: () => void;
  onAdvance: () => void;
}) {
  return (
    <div className="rosary-prayer-actions">
      <button
        aria-label="Previous prayer or bead"
        className="rosary-back-action"
        disabled={backDisabled}
        onClick={onBack}
        type="button"
      >
        <ChevronLeft aria-hidden className="size-5" />
        <span className="hidden sm:inline">Back</span>
      </button>
      <button
        className="rosary-advance-action"
        onClick={onAdvance}
        type="button"
      >
        {advanceLabel}
        <ChevronRight aria-hidden className="size-5" />
      </button>
    </div>
  );
}

function CompletionPanel({
  onBack,
  onPrayAgain,
  onReturnToToday,
}: {
  onBack: () => void;
  onPrayAgain: () => void;
  onReturnToToday: () => void;
}) {
  return (
    <article className="rosary-completion">
      <span className="rosary-completion-seal" aria-hidden>
        <Check className="size-7" />
      </span>
      <p className="rosary-current-mystery mt-7">The Rosary is complete</p>
      <h2 className="mt-3 font-serif text-6xl font-semibold text-[var(--rosary-ink)] sm:text-7xl">
        Amen.
      </h2>
      <p className="mt-5 font-serif text-xl italic text-[var(--rosary-muted-ink)] sm:text-2xl">
        Remain with Mary before her Son.
      </p>

      <div className="mt-10 flex w-full max-w-lg flex-col gap-3 sm:flex-row">
        <button className="rosary-back-action flex-1" onClick={onBack} type="button">
          <ChevronLeft aria-hidden className="size-5" />
          Final prayer
        </button>
        <button
          className="rosary-advance-action flex-1"
          onClick={onPrayAgain}
          type="button"
        >
          <RotateCcw aria-hidden className="size-4" />
          Pray again
        </button>
      </div>
      <Link
        className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[var(--rosary-blue)] underline-offset-4 hover:underline"
        href="/"
        onClick={onReturnToToday}
      >
        Return to Today
      </Link>
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

function getAdvanceLabel(
  step: RosaryStep,
  repetition: number,
  stepIndex: number,
  totalSteps: number,
) {
  if (step.kind === "mystery") {
    return "Begin the decade";
  }

  if (stepIndex === totalSteps - 1) {
    return "Complete the Rosary";
  }

  if (step.repeatTotal > 1) {
    return repetition + 1 === step.repeatTotal ? "Amen · continue" : "Next bead";
  }

  return "Amen · continue";
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

function createInitialProgress(setId: MysterySetId): ProgressState {
  return {
    setId,
    stepIndex: 0,
    repetition: 0,
    includeFatimaPrayer: true,
    started: false,
    finished: false,
  };
}

function readStoredProgress(
  localDate: string,
  recommendedSetId: MysterySetId,
): ProgressState {
  try {
    const rawValue = window.localStorage.getItem(progressStorageKey);

    if (!rawValue) {
      return createInitialProgress(recommendedSetId);
    }

    const parsed = JSON.parse(rawValue) as Partial<ProgressState> & {
      version?: unknown;
      localDate?: unknown;
    };

    if (
      parsed.version !== 2 ||
      parsed.localDate !== localDate ||
      !isMysterySetId(parsed.setId)
    ) {
      return createInitialProgress(recommendedSetId);
    }

    const includeFatimaPrayer = parsed.includeFatimaPrayer !== false;
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

    return {
      setId: parsed.setId,
      includeFatimaPrayer,
      stepIndex: finished ? steps.length - 1 : stepIndex,
      repetition: finished
        ? steps.at(-1)?.repeatTotal ?? 1
        : Math.min(
            Math.max(0, requestedRepetition),
            Math.max(0, step.repeatTotal - 1),
          ),
      started: parsed.started === true,
      finished,
    };
  } catch {
    return createInitialProgress(recommendedSetId);
  }
}

function readStoredPreferences(): RosaryPreferences {
  try {
    const rawValue = window.localStorage.getItem(preferencesStorageKey);

    if (!rawValue) {
      return defaultPreferences;
    }

    const parsed = JSON.parse(rawValue) as Partial<RosaryPreferences> & {
      version?: unknown;
    };

    if (parsed.version !== 1) {
      return defaultPreferences;
    }

    return {
      haptics: parsed.haptics !== false,
      keepAwake: parsed.keepAwake !== false,
    };
  } catch {
    return defaultPreferences;
  }
}

function readStoredDesignId(): RosaryDesignId {
  try {
    const rawValue = window.localStorage.getItem(designStorageKey);

    if (!rawValue) {
      return DEFAULT_ROSARY_DESIGN_ID;
    }

    const parsed = JSON.parse(rawValue) as {
      version?: unknown;
      designId?: unknown;
    };

    return parsed.version === 1 && isRosaryDesignId(parsed.designId)
      ? parsed.designId
      : DEFAULT_ROSARY_DESIGN_ID;
  } catch {
    return DEFAULT_ROSARY_DESIGN_ID;
  }
}

function storeValue(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    return;
  }
}
