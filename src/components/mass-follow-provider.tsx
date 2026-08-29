"use client";

import {
  AlertTriangle,
  Mic,
  MicOff,
  Pause,
  Play,
  ShieldCheck,
  Square,
} from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  findMassSpeechMatch,
  type MassSpeechCandidate,
} from "@/lib/mass-speech-following";

const MAX_ROLLING_WORDS = 24;
const MAX_CONSECUTIVE_RESTARTS = 3;
const GLOBAL_REACQUISITION_DELAY_MS = 15_000;
const INTERIM_CONFIRMATION_WINDOW_MS = 5_000;
const UNIQUE_TARGET_MIN_SCORE = 0.88;
const UNIQUE_TARGET_WINNER_MARGIN = 0.12;
const RESTART_DELAYS_MS = [250, 750, 1_500] as const;
const SPEECH_LANGUAGE = "en-US";

export type MassFollowStatus =
  | "idle"
  | "listening"
  | "paused"
  | "error"
  | "unsupported";

export type MassFollowServiceMode =
  | "unknown"
  | "on-device"
  | "browser-managed";

export type MassFollowWakeLockStatus =
  | "inactive"
  | "requesting"
  | "active"
  | "unavailable";

export type MassFollowActivity =
  | "idle"
  | "requesting"
  | "listening"
  | "following"
  | "retrying"
  | "paused"
  | "denied"
  | "unavailable";

export type MassFollowTargetRegistration = MassSpeechCandidate & {
  elementId: string;
  enabled?: boolean;
  requiresUniqueMatch?: boolean;
  reveal?: () => void;
};

export type MassFollowState = {
  status: MassFollowStatus;
  activeTargetId: string | null;
  activeTargetLabel: string | null;
  errorMessage: string | null;
  serviceMode: MassFollowServiceMode;
  wakeLockStatus: MassFollowWakeLockStatus;
  activity: MassFollowActivity;
  start: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
};

type SpeechRecognitionAlternativeLike = {
  readonly confidence: number;
  readonly transcript: string;
};

type SpeechRecognitionResultLike = {
  readonly isFinal: boolean;
  readonly length: number;
  readonly [index: number]: SpeechRecognitionAlternativeLike;
};

type SpeechRecognitionResultListLike = {
  readonly length: number;
  readonly [index: number]: SpeechRecognitionResultLike;
};

type SpeechRecognitionResultEventLike = Event & {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultListLike;
};

type SpeechRecognitionErrorEventLike = Event & {
  readonly error: string;
  readonly message?: string;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  processLocally?: boolean;
  onend: ((event: Event) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onresult: ((event: SpeechRecognitionResultEventLike) => void) | null;
  onstart: ((event: Event) => void) | null;
  abort: () => void;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionAvailability =
  | "available"
  | "downloadable"
  | "downloading"
  | "unavailable";

type SpeechRecognitionConstructorLike = {
  new (): SpeechRecognitionLike;
  available?: (options: {
    langs: string[];
    processLocally: boolean;
  }) => Promise<SpeechRecognitionAvailability>;
};

type SpeechRecognitionWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructorLike;
  webkitSpeechRecognition?: SpeechRecognitionConstructorLike;
};

type WakeLockNavigator = Navigator & {
  wakeLock?: WakeLock;
};

type TargetRegistryContextValue = {
  registerTargets: (
    owner: symbol,
    targets: readonly MassFollowTargetRegistration[],
  ) => () => void;
};

type TranscriptOption = {
  transcript: string;
  final: boolean;
};

type PendingInterimMatch = {
  count: number;
  observedAt: number;
  targetKey: string;
};

const TargetRegistryContext = createContext<TargetRegistryContextValue | null>(
  null,
);
const MassFollowStateContext = createContext<MassFollowState | null>(null);

export function MassFollowProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<MassFollowStatus>("idle");
  const [activeTargetId, setActiveTargetId] = useState<string | null>(null);
  const [activeTargetLabel, setActiveTargetLabel] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [serviceMode, setServiceMode] =
    useState<MassFollowServiceMode>("unknown");
  const [wakeLockStatus, setWakeLockStatus] =
    useState<MassFollowWakeLockStatus>("inactive");
  const [activity, setActivity] = useState<MassFollowActivity>("idle");
  const [disclosureOpen, setDisclosureOpen] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);
  const [pauseReason, setPauseReason] = useState<string | null>(null);

  const statusRef = useRef<MassFollowStatus>("idle");
  const activeTargetIdRef = useRef<string | null>(null);
  const mountedRef = useRef(false);
  const targetOwnersRef = useRef(
    new Map<symbol, readonly MassFollowTargetRegistration[]>(),
  );
  const targetsRef = useRef<readonly MassFollowTargetRegistration[]>([]);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const wantsListeningRef = useRef(false);
  const sessionGenerationRef = useRef(0);
  const restartAttemptsRef = useRef(0);
  const restartTimerRef = useRef<number | null>(null);
  const rollingWordsRef = useRef<readonly string[]>([]);
  const currentOrderRef = useRef<number | null>(null);
  const lastAcceptedMatchAtRef = useRef(0);
  const pendingInterimMatchRef = useRef<PendingInterimMatch | null>(null);
  const lastScrolledTargetRef = useRef<string | null>(null);
  const scrollFrameRef = useRef<number | null>(null);
  const wakeLockSentinelRef = useRef<WakeLockSentinel | null>(null);
  const wakeLockReleaseListenerRef = useRef<{
    listener: () => void;
    sentinel: WakeLockSentinel;
  } | null>(null);
  const wakeLockGenerationRef = useRef(0);

  const updateStatus = useCallback((nextStatus: MassFollowStatus) => {
    statusRef.current = nextStatus;
    setStatus(nextStatus);
  }, []);

  const rebuildTargets = useCallback(() => {
    const nextTargets = Array.from(targetOwnersRef.current.values())
      .flat()
      .filter((target) => target.enabled !== false)
      .sort((left, right) => left.order - right.order);
    targetsRef.current = nextTargets;

    const currentId = activeTargetIdRef.current;
    if (
      currentId &&
      !nextTargets.some((target) => target.id === currentId) &&
      statusRef.current !== "listening"
    ) {
      activeTargetIdRef.current = null;
      setActiveTargetId(null);
      setActiveTargetLabel(null);
      lastScrolledTargetRef.current = null;
    }
  }, []);

  const registerTargets = useCallback(
    (
      owner: symbol,
      targets: readonly MassFollowTargetRegistration[],
    ) => {
      targetOwnersRef.current.set(owner, targets);
      rebuildTargets();

      return () => {
        if (targetOwnersRef.current.get(owner) !== targets) {
          return;
        }
        targetOwnersRef.current.delete(owner);
        rebuildTargets();
      };
    },
    [rebuildTargets],
  );

  const clearRestartTimer = useCallback(() => {
    if (restartTimerRef.current === null) {
      return;
    }
    window.clearTimeout(restartTimerRef.current);
    restartTimerRef.current = null;
  }, []);

  const cancelPendingScroll = useCallback(() => {
    if (scrollFrameRef.current !== null) {
      window.cancelAnimationFrame(scrollFrameRef.current);
      scrollFrameRef.current = null;
    }
  }, []);

  const disposeCurrentRecognition = useCallback(() => {
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    if (!recognition) {
      return;
    }

    recognition.onstart = null;
    recognition.onresult = null;
    recognition.onerror = null;
    recognition.onend = null;
    try {
      recognition.abort();
    } catch {
      // Some engines throw when an already-ended recognizer is aborted.
    }
  }, []);

  const releaseWakeLock = useCallback(() => {
    wakeLockGenerationRef.current += 1;
    const sentinel = wakeLockSentinelRef.current;
    const releaseListener = wakeLockReleaseListenerRef.current;
    wakeLockSentinelRef.current = null;
    wakeLockReleaseListenerRef.current = null;

    if (releaseListener) {
      releaseListener.sentinel.removeEventListener(
        "release",
        releaseListener.listener,
      );
    }
    if (mountedRef.current) {
      setWakeLockStatus("inactive");
    }
    if (sentinel && !sentinel.released) {
      void sentinel.release().catch(() => {
        // A failed release does not affect speech recognition or user controls.
      });
    }
  }, []);

  const acquireWakeLock = useCallback(async () => {
    if (
      !mountedRef.current ||
      !wantsListeningRef.current ||
      isDocumentHidden()
    ) {
      return;
    }

    const currentSentinel = wakeLockSentinelRef.current;
    if (currentSentinel && !currentSentinel.released) {
      setWakeLockStatus("active");
      return;
    }

    const wakeLock = getScreenWakeLock();
    if (!wakeLock) {
      setWakeLockStatus("unavailable");
      return;
    }

    const generation = wakeLockGenerationRef.current + 1;
    wakeLockGenerationRef.current = generation;
    setWakeLockStatus("requesting");

    let sentinel: WakeLockSentinel;
    try {
      sentinel = await wakeLock.request("screen");
    } catch {
      if (
        mountedRef.current &&
        generation === wakeLockGenerationRef.current &&
        wantsListeningRef.current &&
        !isDocumentHidden()
      ) {
        setWakeLockStatus("unavailable");
      }
      return;
    }

    if (
      !mountedRef.current ||
      generation !== wakeLockGenerationRef.current ||
      !wantsListeningRef.current ||
      isDocumentHidden()
    ) {
      void sentinel.release().catch(() => {
        // This request was superseded; the stale sentinel is safe to discard.
      });
      return;
    }

    const handleRelease = () => {
      if (wakeLockSentinelRef.current !== sentinel) {
        return;
      }
      wakeLockGenerationRef.current += 1;
      wakeLockSentinelRef.current = null;
      wakeLockReleaseListenerRef.current = null;
      if (!mountedRef.current) {
        return;
      }
      setWakeLockStatus(
        wantsListeningRef.current && !isDocumentHidden()
          ? "unavailable"
          : "inactive",
      );
    };

    sentinel.addEventListener("release", handleRelease);
    wakeLockSentinelRef.current = sentinel;
    wakeLockReleaseListenerRef.current = {
      listener: handleRelease,
      sentinel,
    };
    setWakeLockStatus("active");
  }, []);

  const pause = useCallback(
    (reason = "Following is paused.") => {
      if (statusRef.current !== "listening") {
        return;
      }
      sessionGenerationRef.current += 1;
      wantsListeningRef.current = false;
      clearRestartTimer();
      disposeCurrentRecognition();
      releaseWakeLock();
      rollingWordsRef.current = [];
      pendingInterimMatchRef.current = null;
      setPauseReason(reason);
      setActivity("paused");
      updateStatus("paused");
    },
    [
      clearRestartTimer,
      disposeCurrentRecognition,
      releaseWakeLock,
      updateStatus,
    ],
  );

  const stop = useCallback(() => {
    sessionGenerationRef.current += 1;
    wantsListeningRef.current = false;
    clearRestartTimer();
    disposeCurrentRecognition();
    releaseWakeLock();
    cancelPendingScroll();
    restartAttemptsRef.current = 0;
    rollingWordsRef.current = [];
    currentOrderRef.current = null;
    lastAcceptedMatchAtRef.current = 0;
    pendingInterimMatchRef.current = null;
    lastScrolledTargetRef.current = null;
    activeTargetIdRef.current = null;
    setActiveTargetId(null);
    setActiveTargetLabel(null);
    setErrorMessage(null);
    setPauseReason(null);
    setServiceMode("unknown");
    const supported = Boolean(getSpeechRecognitionConstructor());
    setActivity(supported ? "idle" : "unavailable");
    updateStatus(supported ? "idle" : "unsupported");
  }, [
    cancelPendingScroll,
    clearRestartTimer,
    disposeCurrentRecognition,
    releaseWakeLock,
    updateStatus,
  ]);

  const revealAndScroll = useCallback(
    (target: MassFollowTargetRegistration) => {
      activeTargetIdRef.current = target.id;
      setActiveTargetId(target.id);
      setActiveTargetLabel(target.label ?? null);
      setActivity("following");

      const targetKey = `${target.id}:${target.order}`;
      if (lastScrolledTargetRef.current === targetKey) {
        return;
      }
      lastScrolledTargetRef.current = targetKey;

      try {
        target.reveal?.();
      } catch {
        // A missing reveal is recoverable if the target is already in the DOM.
      }

      cancelPendingScroll();
      let attempts = 0;
      let revealedTarget = target;

      const revealCurrentTargetAndScroll = () => {
        scrollFrameRef.current = window.requestAnimationFrame(() => {
          scrollFrameRef.current = null;
          const currentTarget = targetsRef.current.find(
            (candidate) =>
              candidate.id === target.id && candidate.order === target.order,
          );
          if (currentTarget && currentTarget !== revealedTarget) {
            revealedTarget = currentTarget;
            try {
              currentTarget.reveal?.();
            } catch {
              // The element may already be visible even if its reveal failed.
            }
          }

          const element = document.getElementById(target.elementId);
          if ((!element || element.closest("[hidden]")) && attempts < 6) {
            attempts += 1;
            revealCurrentTargetAndScroll();
            return;
          }
          if (!element) {
            return;
          }

          const reducedMotion = window.matchMedia(
            "(prefers-reduced-motion: reduce)",
          ).matches;
          element.scrollIntoView({
            behavior: reducedMotion ? "auto" : "smooth",
            block: "center",
          });
        });
      };

      revealCurrentTargetAndScroll();
    },
    [cancelPendingScroll],
  );

  const considerTranscripts = useCallback(
    (transcripts: readonly TranscriptOption[]) => {
      const targets = targetsRef.current;
      if (targets.length === 0) {
        return;
      }

      const candidates: readonly MassSpeechCandidate[] = targets;
      const now = Date.now();
      const allowGlobal =
        currentOrderRef.current === null ||
        now - lastAcceptedMatchAtRef.current >=
          GLOBAL_REACQUISITION_DELAY_MS;
      let bestSelection: {
        final: boolean;
        match: NonNullable<ReturnType<typeof findMassSpeechMatch>>;
        transcript: string;
      } | null = null;
      for (const option of transcripts) {
        const match = findMassSpeechMatch({
          transcript: option.transcript,
          candidates,
          currentOrder: currentOrderRef.current ?? undefined,
          allowGlobal,
        });
        if (
          match &&
          (!bestSelection ||
            match.score > bestSelection.match.score ||
            (match.score === bestSelection.match.score &&
              option.final &&
              !bestSelection.final))
        ) {
          bestSelection = {
            final: option.final,
            match,
            transcript: option.transcript,
          };
        }
      }

      if (!bestSelection) {
        pendingInterimMatchRef.current = null;
        return;
      }
      const bestMatch = bestSelection.match;
      const matchedCandidate = bestMatch.candidate;
      const target = targets.find(
        (candidate) =>
          candidate.id === matchedCandidate.id &&
          candidate.order === matchedCandidate.order,
      );
      if (!target) {
        pendingInterimMatchRef.current = null;
        return;
      }

      if (
        target.requiresUniqueMatch &&
        bestMatch.score < UNIQUE_TARGET_MIN_SCORE
      ) {
        pendingInterimMatchRef.current = null;
        return;
      }
      if (target.requiresUniqueMatch) {
        const competingMatch = findMassSpeechMatch({
          transcript: bestSelection.transcript,
          candidates: candidates.filter(
            (candidate) =>
              candidate.id !== matchedCandidate.id ||
              candidate.order !== matchedCandidate.order,
          ),
          currentOrder: currentOrderRef.current ?? undefined,
          allowGlobal,
        });
        if (
          competingMatch &&
          bestMatch.score - competingMatch.score <
            UNIQUE_TARGET_WINNER_MARGIN
        ) {
          pendingInterimMatchRef.current = null;
          return;
        }
      }

      if (!bestSelection.final) {
        const targetKey = `${target.id}:${target.order}`;
        const pending = pendingInterimMatchRef.current;
        const count =
          pending &&
          pending.targetKey === targetKey &&
          now - pending.observedAt <= INTERIM_CONFIRMATION_WINDOW_MS
            ? pending.count + 1
            : 1;
        pendingInterimMatchRef.current = {
          count,
          observedAt: now,
          targetKey,
        };
        if (count < 2) {
          return;
        }
      }

      pendingInterimMatchRef.current = null;
      lastAcceptedMatchAtRef.current = now;
      currentOrderRef.current = bestMatch.candidate.order;
      revealAndScroll(target);
    },
    [revealAndScroll],
  );

  const handleSpeechResult = useCallback(
    (event: SpeechRecognitionResultEventLike) => {
      restartAttemptsRef.current = 0;
      const rollingWords = [...rollingWordsRef.current];
      const transcriptOptions: TranscriptOption[] = [];

      for (let resultIndex = event.resultIndex; resultIndex < event.results.length; resultIndex += 1) {
        const result = event.results[resultIndex];
        if (!result) {
          continue;
        }

        const alternatives = Array.from(
          { length: Math.min(result.length, 3) },
          (_, alternativeIndex) => result[alternativeIndex]?.transcript ?? "",
        ).filter(Boolean);

        for (const alternative of alternatives) {
          const transcript = appendToWordWindow(
            rollingWords,
            alternative,
          ).join(" ");
          if (
            !transcriptOptions.some(
              (option) =>
                option.transcript === transcript &&
                option.final === result.isFinal,
            )
          ) {
            transcriptOptions.push({
              final: result.isFinal,
              transcript,
            });
          }
        }

        if (result.isFinal && alternatives[0]) {
          rollingWords.splice(
            0,
            rollingWords.length,
            ...appendToWordWindow(rollingWords, alternatives[0]),
          );
        }
      }

      rollingWordsRef.current = rollingWords.slice(-MAX_ROLLING_WORDS);
      if (transcriptOptions.length > 0) {
        considerTranscripts(transcriptOptions);
      }
    },
    [considerTranscripts],
  );

  function failRecognition(message: string, denied = false) {
    sessionGenerationRef.current += 1;
    wantsListeningRef.current = false;
    clearRestartTimer();
    disposeCurrentRecognition();
    releaseWakeLock();
    setErrorMessage(message);
    setPauseReason(null);
    setActivity(denied ? "denied" : "retrying");
    updateStatus("error");
  }

  function startRecognitionInstance(recognition: SpeechRecognitionLike) {
    if (
      !mountedRef.current ||
      !wantsListeningRef.current ||
      document.visibilityState === "hidden"
    ) {
      return;
    }

    try {
      recognition.start();
      updateStatus("listening");
    } catch {
      scheduleRestart(recognition);
    }
  }

  function scheduleRestart(recognition: SpeechRecognitionLike) {
    if (
      !mountedRef.current ||
      !wantsListeningRef.current ||
      recognitionRef.current !== recognition ||
      restartTimerRef.current !== null
    ) {
      return;
    }

    const attempt = restartAttemptsRef.current + 1;
    if (attempt > MAX_CONSECUTIVE_RESTARTS) {
      failRecognition(
        "The browser stopped listening repeatedly. Check the microphone and try again.",
      );
      return;
    }

    restartAttemptsRef.current = attempt;
    setActivity("retrying");
    setErrorMessage((current) => current ?? "Reconnecting to the browser speech service.");
    const delay =
      RESTART_DELAYS_MS[attempt - 1] ??
      RESTART_DELAYS_MS[RESTART_DELAYS_MS.length - 1];
    restartTimerRef.current = window.setTimeout(() => {
      restartTimerRef.current = null;
      startRecognitionInstance(recognition);
    }, delay);
  }

  async function beginListening() {
    const Recognition = getSpeechRecognitionConstructor();
    if (!Recognition) {
      setActivity("unavailable");
      updateStatus("unsupported");
      return;
    }

    sessionGenerationRef.current += 1;
    const generation = sessionGenerationRef.current;
    wantsListeningRef.current = false;
    clearRestartTimer();
    disposeCurrentRecognition();
    wantsListeningRef.current = true;
    void acquireWakeLock();
    restartAttemptsRef.current = 0;
    rollingWordsRef.current = [];
    pendingInterimMatchRef.current = null;
    lastAcceptedMatchAtRef.current = Date.now();
    setErrorMessage(null);
    setPauseReason(null);
    setServiceMode("browser-managed");
    setActivity("requesting");
    updateStatus("listening");

    let recognition: SpeechRecognitionLike;
    try {
      recognition = new Recognition();
      recognition.lang = SPEECH_LANGUAGE;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 3;
    } catch {
      failRecognition(
        "The browser could not initialize its speech service. Check microphone access and try again.",
      );
      return;
    }

    if (
      "processLocally" in recognition &&
      typeof Recognition.available === "function"
    ) {
      try {
        const availability = await Recognition.available({
          langs: [SPEECH_LANGUAGE],
          processLocally: true,
        });
        if (availability === "available") {
          recognition.processLocally = true;
          if (mountedRef.current && generation === sessionGenerationRef.current) {
            setServiceMode("on-device");
          }
        }
        // Deliberately do not call install(): following must never force a model download.
      } catch {
        // Fall through to the disclosed browser-managed speech service.
      }
    }

    if (
      !mountedRef.current ||
      generation !== sessionGenerationRef.current ||
      !wantsListeningRef.current
    ) {
      try {
        recognition.abort();
      } catch {
        // The recognizer has not necessarily entered a startable state yet.
      }
      return;
    }

    recognition.onstart = () => {
      if (wantsListeningRef.current) {
        setErrorMessage(null);
        setActivity("listening");
        updateStatus("listening");
      }
    };
    recognition.onresult = (event) => {
      setErrorMessage(null);
      if (!activeTargetIdRef.current) {
        setActivity("listening");
      }
      handleSpeechResult(event);
    };
    recognition.onerror = (event) => {
      if (event.error === "aborted") {
        return;
      }
      if (event.error === "no-speech") {
        setActivity("retrying");
        setErrorMessage("No speech was heard. Listening will resume automatically.");
        return;
      }
      if (event.error === "network") {
        setActivity("retrying");
        setErrorMessage("The browser speech service lost its connection. Reconnecting.");
        return;
      }
      const denied =
        event.error === "not-allowed" ||
        event.error === "service-not-allowed";
      failRecognition(getSpeechRecognitionErrorMessage(event.error), denied);
    };
    recognition.onend = () => {
      if (wantsListeningRef.current) {
        scheduleRestart(recognition);
      }
    };

    recognitionRef.current = recognition;
    startRecognitionInstance(recognition);
  }

  function requestStart() {
    if (statusRef.current === "unsupported") {
      return;
    }
    if (!consentGiven) {
      setDisclosureOpen(true);
      return;
    }
    void beginListening();
  }

  function resume() {
    if (!consentGiven) {
      setDisclosureOpen(true);
      return;
    }
    void beginListening();
  }

  function confirmConsentAndStart() {
    setConsentGiven(true);
    setDisclosureOpen(false);
    void beginListening();
  }

  useEffect(() => {
    mountedRef.current = true;
    let unsupportedFrame: number | null = null;
    if (!getSpeechRecognitionConstructor()) {
      unsupportedFrame = window.requestAnimationFrame(() => {
        setActivity("unavailable");
        updateStatus("unsupported");
      });
    }

    return () => {
      mountedRef.current = false;
      if (unsupportedFrame !== null) {
        window.cancelAnimationFrame(unsupportedFrame);
      }
      sessionGenerationRef.current += 1;
      wantsListeningRef.current = false;
      releaseWakeLock();
      if (restartTimerRef.current !== null) {
        window.clearTimeout(restartTimerRef.current);
        restartTimerRef.current = null;
      }
      if (scrollFrameRef.current !== null) {
        window.cancelAnimationFrame(scrollFrameRef.current);
      }
      const recognition = recognitionRef.current;
      recognitionRef.current = null;
      if (recognition) {
        recognition.onstart = null;
        recognition.onresult = null;
        recognition.onerror = null;
        recognition.onend = null;
        try {
          recognition.abort();
        } catch {
          // The component is already unmounting, so no recovery is needed.
        }
      }
    };
  }, [releaseWakeLock, updateStatus]);

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") {
        const shouldPause =
          wantsListeningRef.current && statusRef.current === "listening";
        if (shouldPause) {
          pause("Following paused because this page is hidden.");
        } else {
          releaseWakeLock();
        }
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [pause, releaseWakeLock]);

  useEffect(() => {
    function isFollowControlEvent(event: Event) {
      return (
        event.target instanceof Element &&
        Boolean(event.target.closest("[data-mass-follow-control]"))
      );
    }

    function pauseForPointerNavigation(event: Event) {
      if (!isFollowControlEvent(event)) {
        pause("Following paused after manual navigation.");
      }
    }

    function pauseForKeyboardNavigation(event: KeyboardEvent) {
      const navigationKeys = new Set([
        " ",
        "Spacebar",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "End",
        "Home",
        "PageDown",
        "PageUp",
      ]);
      if (
        !navigationKeys.has(event.key) ||
        isFollowControlEvent(event)
      ) {
        return;
      }
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement ||
        (event.target instanceof HTMLElement && event.target.isContentEditable)
      ) {
        return;
      }
      pause("Following paused after keyboard navigation.");
    }

    window.addEventListener("wheel", pauseForPointerNavigation, {
      capture: true,
      passive: true,
    });
    window.addEventListener("touchstart", pauseForPointerNavigation, {
      capture: true,
      passive: true,
    });
    window.addEventListener("pointerdown", pauseForPointerNavigation, true);
    window.addEventListener("keydown", pauseForKeyboardNavigation, true);
    return () => {
      window.removeEventListener("wheel", pauseForPointerNavigation, true);
      window.removeEventListener("touchstart", pauseForPointerNavigation, true);
      window.removeEventListener("pointerdown", pauseForPointerNavigation, true);
      window.removeEventListener("keydown", pauseForKeyboardNavigation, true);
    };
  }, [pause]);

  const registryValue = useMemo(
    () => ({ registerTargets }),
    [registerTargets],
  );
  const state: MassFollowState = {
    status,
    activeTargetId,
    activeTargetLabel,
    errorMessage,
    serviceMode,
    wakeLockStatus,
    activity,
    start: requestStart,
    pause: () => pause(),
    resume,
    stop,
  };

  return (
    <TargetRegistryContext.Provider value={registryValue}>
      <MassFollowStateContext.Provider value={state}>
        {children}
        <MassFollowControl
          activeTargetLabel={activeTargetLabel}
          activity={activity}
          disclosureOpen={disclosureOpen}
          errorMessage={errorMessage}
          onCancelDisclosure={() => setDisclosureOpen(false)}
          onConfirmDisclosure={confirmConsentAndStart}
          onPause={() => pause()}
          onResume={resume}
          onStart={requestStart}
          onStop={stop}
          pauseReason={pauseReason}
          serviceMode={serviceMode}
          status={status}
          wakeLockStatus={wakeLockStatus}
        />
      </MassFollowStateContext.Provider>
    </TargetRegistryContext.Provider>
  );
}

export function useMassFollowTargets(
  targets: readonly MassFollowTargetRegistration[],
) {
  const registry = useContext(TargetRegistryContext);
  const ownerRef = useRef(Symbol("mass-follow-target-owner"));

  useEffect(() => {
    if (!registry) {
      throw new Error("useMassFollowTargets must be used inside MassFollowProvider.");
    }
    return registry.registerTargets(ownerRef.current, targets);
  }, [registry, targets]);
}

export function useMassFollowState() {
  const state = useContext(MassFollowStateContext);
  if (!state) {
    throw new Error("useMassFollowState must be used inside MassFollowProvider.");
  }
  return state;
}

function MassFollowControl({
  activeTargetLabel,
  activity,
  disclosureOpen,
  errorMessage,
  onCancelDisclosure,
  onConfirmDisclosure,
  onPause,
  onResume,
  onStart,
  onStop,
  pauseReason,
  serviceMode,
  status,
  wakeLockStatus,
}: {
  activeTargetLabel: string | null;
  activity: MassFollowActivity;
  disclosureOpen: boolean;
  errorMessage: string | null;
  onCancelDisclosure: () => void;
  onConfirmDisclosure: () => void;
  onPause: () => void;
  onResume: () => void;
  onStart: () => void;
  onStop: () => void;
  pauseReason: string | null;
  serviceMode: MassFollowServiceMode;
  status: MassFollowStatus;
  wakeLockStatus: MassFollowWakeLockStatus;
}) {
  const showMobileDetail =
    activity === "requesting" ||
    activity === "retrying" ||
    activity === "paused" ||
    activity === "denied" ||
    activity === "unavailable" ||
    wakeLockStatus === "unavailable";
  const statusDetail = getStatusDetail({
    activity,
    errorMessage,
    pauseReason,
    serviceMode,
    wakeLockStatus,
  });

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[70]"
      data-mass-follow-control
      style={{
        paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))",
        paddingLeft: "max(0.5rem, env(safe-area-inset-left))",
        paddingRight: "max(0.5rem, env(safe-area-inset-right))",
      }}
    >
      <div
        className={[
          "pointer-events-auto mx-auto border text-[var(--vellum)] backdrop-blur-md",
          disclosureOpen
            ? "max-w-xl overflow-y-auto overscroll-contain rounded-3xl border-[color:var(--gilt)]/45 bg-[color:var(--sanctuary-night)]/95 p-3 shadow-[0_20px_70px_rgba(0,0,0,0.32)] sm:p-4"
            : "max-w-lg rounded-2xl border-white/15 bg-[color:var(--sanctuary-night)]/88 p-2 shadow-[0_10px_32px_rgba(0,0,0,0.22)]",
        ].join(" ")}
        style={
          disclosureOpen
            ? {
                maxHeight:
                  "calc(100dvh - max(1rem, env(safe-area-inset-top)) - max(1rem, env(safe-area-inset-bottom)))",
              }
            : undefined
        }
      >
        {disclosureOpen ? (
          <div aria-labelledby="mass-follow-disclosure-title" role="dialog">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-[color:var(--gilt)]/15 text-[var(--gilt-light)]">
                <ShieldCheck aria-hidden className="size-5" />
              </span>
              <div>
                <h2
                  className="font-serif text-lg font-semibold"
                  id="mass-follow-disclosure-title"
                >
                  Let the Mass follow along?
                </h2>
                <p className="mt-1 text-sm leading-5 text-[color:var(--vellum)]/75">
                  With your permission, the browser will listen through this
                  device&apos;s microphone. An already-installed on-device English
                  model is preferred; otherwise the browser may send audio to its
                  speech service. This app does not store or log audio or transcripts,
                  and it will not download a speech model. While following, the app
                  will also ask the browser to keep this screen awake.
                </p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                className="min-h-11 rounded-full border border-white/20 px-4 text-sm font-bold text-[var(--vellum)]"
                onClick={onCancelDisclosure}
                type="button"
              >
                Not now
              </button>
              <button
                className="min-h-11 rounded-full bg-[var(--gilt-light)] px-4 text-sm font-bold text-[var(--sanctuary-night)]"
                onClick={onConfirmDisclosure}
                type="button"
              >
                Allow microphone
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <StatusIcon status={status} />
            <div className="min-w-0 flex-1">
              <p className="flex min-w-0 items-center gap-1.5 text-[0.78rem] font-bold sm:text-sm">
                <span className="truncate">
                  {getStatusTitle(activity, activeTargetLabel)}
                </span>
                <WakeLockBadge
                  status={status}
                  wakeLockStatus={wakeLockStatus}
                />
              </p>
              <p
                className={`${showMobileDetail ? "block" : "hidden sm:block"} truncate text-[0.68rem] text-[color:var(--vellum)]/60`}
              >
                {statusDetail}
              </p>
              <p aria-live="polite" className="sr-only">
                {getActivityAnnouncement(activity, wakeLockStatus)}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {status === "idle" ? (
                <ControlButton icon={<Mic aria-hidden className="size-4" />} onClick={onStart}>
                  Follow Mass
                </ControlButton>
              ) : null}
              {status === "listening" ? (
                <>
                  <ControlButton
                    icon={<Pause aria-hidden className="size-4" />}
                    onClick={onPause}
                  >
                    Pause
                  </ControlButton>
                  <IconButton label="Stop following" onClick={onStop}>
                    <Square aria-hidden className="size-4" />
                  </IconButton>
                </>
              ) : null}
              {status === "paused" ? (
                <>
                  <ControlButton
                    icon={<Play aria-hidden className="size-4" />}
                    onClick={onResume}
                  >
                    Resume Following
                  </ControlButton>
                  <IconButton label="Stop following" onClick={onStop}>
                    <Square aria-hidden className="size-4" />
                  </IconButton>
                </>
              ) : null}
              {status === "error" ? (
                <>
                  <ControlButton
                    icon={<Play aria-hidden className="size-4" />}
                    onClick={onResume}
                  >
                    Try again
                  </ControlButton>
                  <IconButton label="Stop following" onClick={onStop}>
                    <Square aria-hidden className="size-4" />
                  </IconButton>
                </>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: MassFollowStatus }) {
  const className =
    "inline-flex size-8 shrink-0 items-center justify-center rounded-full";
  if (status === "listening") {
    return (
      <span
        className={`${className} bg-emerald-400/15 text-emerald-200 motion-safe:animate-pulse`}
      >
        <Mic aria-hidden className="size-4" />
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className={`${className} bg-red-400/15 text-red-200`}>
        <AlertTriangle aria-hidden className="size-4" />
      </span>
    );
  }
  if (status === "paused") {
    return (
      <span className={`${className} bg-amber-300/15 text-amber-100`}>
        <Pause aria-hidden className="size-4" />
      </span>
    );
  }
  return (
    <span className={`${className} bg-white/10 text-[color:var(--vellum)]/75`}>
      <MicOff aria-hidden className="size-4" />
    </span>
  );
}

function WakeLockBadge({
  status,
  wakeLockStatus,
}: {
  status: MassFollowStatus;
  wakeLockStatus: MassFollowWakeLockStatus;
}) {
  if (status !== "listening") {
    return null;
  }
  if (wakeLockStatus === "active") {
    return (
      <span className="shrink-0 whitespace-nowrap rounded-full bg-emerald-400/15 px-1.5 py-0.5 text-[0.62rem] font-semibold text-emerald-200">
        Awake
      </span>
    );
  }
  if (wakeLockStatus === "unavailable") {
    return (
      <span
        className="shrink-0 whitespace-nowrap rounded-full bg-amber-300/15 px-1.5 py-0.5 text-[0.62rem] font-semibold text-amber-100"
        title="This browser or device did not grant a screen wake lock. Voice following will keep working."
      >
        Awake unavailable
      </span>
    );
  }
  return null;
}

function ControlButton({
  children,
  icon,
  onClick,
}: {
  children: ReactNode;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full bg-[var(--gilt-light)] px-3 text-xs font-bold text-[var(--sanctuary-night)]"
      onClick={onClick}
      type="button"
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}

function IconButton({
  children,
  label,
  onClick,
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      className="inline-flex size-11 items-center justify-center rounded-full border border-white/20 text-[var(--vellum)]"
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}

function getSpeechRecognitionConstructor() {
  if (typeof window === "undefined") {
    return null;
  }
  const speechWindow = window as SpeechRecognitionWindow;
  return (
    speechWindow.SpeechRecognition ??
    speechWindow.webkitSpeechRecognition ??
    null
  );
}

function getScreenWakeLock() {
  if (typeof navigator === "undefined") {
    return null;
  }
  return (navigator as WakeLockNavigator).wakeLock ?? null;
}

function isDocumentHidden() {
  return document.visibilityState === "hidden";
}

function appendToWordWindow(
  currentWords: readonly string[],
  transcript: string,
) {
  return [...currentWords, ...transcript.trim().split(/\s+/u).filter(Boolean)].slice(
    -MAX_ROLLING_WORDS,
  );
}

function getSpeechRecognitionErrorMessage(error: string) {
  switch (error) {
    case "not-allowed":
    case "service-not-allowed":
      return "Microphone or speech permission was denied. Allow it in browser settings, then try again.";
    case "audio-capture":
      return "No working microphone is available to the browser.";
    case "language-not-supported":
      return "This browser cannot recognize English speech on this device.";
    case "bad-grammar":
      return "The browser could not initialize speech recognition.";
    default:
      return "Speech recognition stopped unexpectedly. Check the microphone and try again.";
  }
}

function getStatusTitle(
  activity: MassFollowActivity,
  activeTargetLabel: string | null,
) {
  switch (activity) {
    case "requesting":
      return "Requesting microphone access";
    case "listening":
      return "Listening for the Mass";
    case "following":
      return activeTargetLabel
        ? `Following: ${activeTargetLabel}`
        : "Following the Mass";
    case "retrying":
      return "Reconnecting voice following";
    case "paused":
      return "Following paused";
    case "denied":
      return "Microphone access denied";
    case "unavailable":
      return "Voice following is unavailable";
    default:
      return "Voice follow is off";
  }
}

function getStatusDetail({
  activity,
  errorMessage,
  pauseReason,
  serviceMode,
  wakeLockStatus,
}: {
  activity: MassFollowActivity;
  errorMessage: string | null;
  pauseReason: string | null;
  serviceMode: MassFollowServiceMode;
  wakeLockStatus: MassFollowWakeLockStatus;
}) {
  if (activity === "unavailable") {
    return "Use the Mass navigation controls in this browser.";
  }
  if (activity === "denied" || activity === "retrying") {
    return errorMessage ?? "Try again when the microphone is ready.";
  }
  if (activity === "paused") {
    return pauseReason ?? "Resume when you are ready.";
  }
  if (activity === "requesting") {
    return "Your browser may show a microphone permission prompt.";
  }
  if (activity === "listening" || activity === "following") {
    if (wakeLockStatus === "unavailable") {
      return "Screen awake mode is unavailable; voice following still works.";
    }
    if (serviceMode === "on-device") {
      return "Using an installed on-device English speech model.";
    }
    return "Using the browser-managed speech service.";
  }
  return "Tap Follow Mass to hear and follow the spoken text.";
}

function getActivityAnnouncement(
  activity: MassFollowActivity,
  wakeLockStatus: MassFollowWakeLockStatus,
) {
  let announcement: string;
  switch (activity) {
    case "requesting":
      announcement = "Microphone permission requested.";
      break;
    case "listening":
      announcement = "Voice following is listening.";
      break;
    case "following":
      announcement = "Voice following found the current Mass moment.";
      break;
    case "retrying":
      announcement = "Voice following is reconnecting.";
      break;
    case "paused":
      announcement = "Voice following paused.";
      break;
    case "denied":
      announcement = "Microphone access denied.";
      break;
    case "unavailable":
      announcement = "Voice following is unavailable in this browser.";
      break;
    default:
      announcement = "Voice following is off.";
      break;
  }

  if (
    activity === "requesting" ||
    activity === "listening" ||
    activity === "following" ||
    activity === "retrying"
  ) {
    if (wakeLockStatus === "active") {
      return `${announcement} Screen awake mode is active.`;
    }
    if (wakeLockStatus === "unavailable") {
      return `${announcement} Screen awake mode is unavailable.`;
    }
  }
  return announcement;
}
