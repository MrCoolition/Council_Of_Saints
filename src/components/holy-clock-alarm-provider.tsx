"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  getDefaultHolyClockPreferences,
  getDueHolyClockHours,
  getHolyClockChime,
  isHolyClockStorageKey,
  HOLY_CLOCK_PREFERENCES_EVENT,
  readHolyClockPreferencesFromStorage,
  type HolyClockChimeId,
  type HolyClockHour,
  type HolyClockPreferences,
} from "@/lib/liturgy-hours-clock";

type HolyClockAlarmContextValue = {
  playingChimeId: HolyClockChimeId | null;
  playChime: (chimeId: HolyClockChimeId, volume: number) => Promise<boolean>;
  stopChime: () => void;
};

const HolyClockAlarmContext =
  createContext<HolyClockAlarmContextValue | null>(null);
const HOLY_CLOCK_REMINDER_CLAIM_KEY =
  "sanctum-council:holy-clock:last-reminder";
const HOLY_CLOCK_REMINDER_LOCK = "sanctum-council:holy-clock:alarm-lock";

export function useHolyClockAlarm() {
  const context = useContext(HolyClockAlarmContext);
  if (!context) {
    throw new Error(
      "useHolyClockAlarm must be used within HolyClockAlarmProvider",
    );
  }
  return context;
}

export function HolyClockAlarmProvider({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [preferences, setPreferences] = useState<HolyClockPreferences>(
    getDefaultHolyClockPreferences,
  );
  const [hasLoadedPreferences, setHasLoadedPreferences] = useState(false);
  const [playingChimeId, setPlayingChimeId] =
    useState<HolyClockChimeId | null>(null);
  const chimeAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const chimeBufferCacheRef = useRef(new Map<HolyClockChimeId, AudioBuffer>());
  const chimeBufferPromiseRef = useRef(
    new Map<HolyClockChimeId, Promise<AudioBuffer | null>>(),
  );
  const activeBufferSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const activeGainRef = useRef<GainNode | null>(null);
  const serviceWorkerRegistrationRef =
    useRef<ServiceWorkerRegistration | null>(null);
  const claimedReminderKeysRef = useRef(new Set<string>());

  useEffect(() => {
    const loadPreferences = () => {
      setPreferences(readSavedPreferences());
      setHasLoadedPreferences(true);
    };
    const initialLoad = window.setTimeout(loadPreferences, 0);

    const handlePreferenceChange = (event: Event) => {
      const changedPreferences = (
        event as CustomEvent<HolyClockPreferences>
      ).detail;
      if (changedPreferences) {
        setPreferences(changedPreferences);
      } else {
        loadPreferences();
      }
    };
    const handleStorage = (event: StorageEvent) => {
      if (isHolyClockStorageKey(event.key)) {
        loadPreferences();
      }
    };

    window.addEventListener(
      HOLY_CLOCK_PREFERENCES_EVENT,
      handlePreferenceChange,
    );
    window.addEventListener("storage", handleStorage);
    return () => {
      window.clearTimeout(initialLoad);
      window.removeEventListener(
        HOLY_CLOCK_PREFERENCES_EVENT,
        handlePreferenceChange,
      );
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    let cancelled = false;
    void navigator.serviceWorker
      .register("/holy-clock-sw.js", {
        scope: "/",
        updateViaCache: "none",
      })
      .then((registration) => {
        if (!cancelled) {
          serviceWorkerRegistrationRef.current = registration;
        }
      })
      .catch(() => {
        // The in-app chime and device-calendar alarms remain available.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(
    () => () => {
      chimeAudioRef.current?.pause();
      try {
        activeBufferSourceRef.current?.stop();
      } catch {
        // The source may already have completed.
      }
      if (audioContextRef.current) {
        void audioContextRef.current.close();
      }
    },
    [],
  );

  const getAudioContext = useCallback(() => {
    if (typeof window.AudioContext !== "function") {
      return null;
    }

    if (!audioContextRef.current || audioContextRef.current.state === "closed") {
      audioContextRef.current = new AudioContext();
    }
    return audioContextRef.current;
  }, []);

  const loadChimeBuffer = useCallback(
    async (chimeId: HolyClockChimeId) => {
      const cached = chimeBufferCacheRef.current.get(chimeId);
      if (cached) {
        return cached;
      }

      const pending = chimeBufferPromiseRef.current.get(chimeId);
      if (pending) {
        return pending;
      }

      const context = getAudioContext();
      if (!context) {
        return null;
      }

      const request = (async () => {
        try {
          const response = await fetch(getHolyClockChime(chimeId).src);
          if (!response.ok) {
            return null;
          }
          const buffer = await context.decodeAudioData(
            await response.arrayBuffer(),
          );
          chimeBufferCacheRef.current.set(chimeId, buffer);
          return buffer;
        } catch {
          return null;
        } finally {
          chimeBufferPromiseRef.current.delete(chimeId);
        }
      })();

      chimeBufferPromiseRef.current.set(chimeId, request);
      return request;
    },
    [getAudioContext],
  );

  const ringFallbackBell = useCallback(async () => {
    const context = getAudioContext();
    if (!context) {
      return false;
    }
    if (context.state === "suspended") {
      try {
        await context.resume();
      } catch {
        return false;
      }
    }

    strikeBell(context, context.currentTime, 659.3);
    strikeBell(context, context.currentTime + 0.72, 784);
    return true;
  }, [getAudioContext]);

  const stopChime = useCallback(() => {
    const audio = chimeAudioRef.current;
    if (audio) {
      audio.pause();
      try {
        audio.currentTime = 0;
      } catch {
        // The source may not have loaded yet.
      }
    }
    try {
      activeBufferSourceRef.current?.stop();
    } catch {
      // The source may already have completed.
    }
    activeBufferSourceRef.current = null;
    activeGainRef.current = null;
    setPlayingChimeId(null);
  }, []);

  const playBufferedChime = useCallback(
    async (chimeId: HolyClockChimeId, volume: number) => {
      const context = getAudioContext();
      if (!context) {
        return false;
      }
      if (context.state === "suspended") {
        try {
          await context.resume();
        } catch {
          return false;
        }
      }

      const buffer = await loadChimeBuffer(chimeId);
      if (!buffer || context.state !== "running") {
        return false;
      }

      try {
        activeBufferSourceRef.current?.stop();
      } catch {
        // The previous source may already have completed.
      }
      const source = context.createBufferSource();
      const gain = context.createGain();
      const chime = getHolyClockChime(chimeId);
      source.buffer = buffer;
      gain.gain.value = Math.min(1, Math.max(0.1, volume) * chime.gain);
      source.connect(gain);
      gain.connect(context.destination);
      source.onended = () => {
        if (activeBufferSourceRef.current === source) {
          activeBufferSourceRef.current = null;
          activeGainRef.current = null;
          setPlayingChimeId(null);
        }
      };
      activeBufferSourceRef.current = source;
      activeGainRef.current = gain;
      source.start();
      setPlayingChimeId(chimeId);
      return true;
    },
    [getAudioContext, loadChimeBuffer],
  );

  const playChime = useCallback(
    async (chimeId: HolyClockChimeId, volume: number) => {
      const audio = chimeAudioRef.current;
      const chime = getHolyClockChime(chimeId);
      if (audio) {
        try {
          activeBufferSourceRef.current?.stop();
        } catch {
          // The previous source may already have completed.
        }
        activeBufferSourceRef.current = null;
        activeGainRef.current = null;
        audio.pause();
        if (audio.getAttribute("src") !== chime.src) {
          audio.src = chime.src;
        }
        audio.volume = Math.min(1, Math.max(0.1, volume) * chime.gain);
        try {
          audio.currentTime = 0;
          await audio.play();
          setPlayingChimeId(chimeId);
          return true;
        } catch {
          setPlayingChimeId(null);
        }
      }

      if (await playBufferedChime(chimeId, volume)) {
        return true;
      }
      return ringFallbackBell();
    },
    [playBufferedChime, ringFallbackBell],
  );

  useEffect(() => {
    const audio = chimeAudioRef.current;
    if (!audio || !playingChimeId) {
      return;
    }
    const chime = getHolyClockChime(playingChimeId);
    audio.volume = Math.min(1, preferences.soundVolume * chime.gain);
    if (activeGainRef.current) {
      activeGainRef.current.gain.value = Math.min(
        1,
        preferences.soundVolume * chime.gain,
      );
    }
  }, [playingChimeId, preferences.soundVolume]);

  useEffect(() => {
    if (
      !hasLoadedPreferences ||
      !preferences.remindersEnabled ||
      !preferences.soundEnabled
    ) {
      return;
    }

    void loadChimeBuffer(preferences.chimeId);
    const armAudio = () => {
      const context = getAudioContext();
      if (context?.state === "suspended") {
        void context.resume().catch(() => {
          // A later direct Preview gesture can still arm the chime.
        });
      }
      window.removeEventListener("pointerdown", armAudio, true);
      window.removeEventListener("keydown", armAudio, true);
    };

    window.addEventListener("pointerdown", armAudio, true);
    window.addEventListener("keydown", armAudio, true);
    return () => {
      window.removeEventListener("pointerdown", armAudio, true);
      window.removeEventListener("keydown", armAudio, true);
    };
  }, [
    getAudioContext,
    hasLoadedPreferences,
    loadChimeBuffer,
    preferences.chimeId,
    preferences.remindersEnabled,
    preferences.soundEnabled,
  ]);

  const deliverReminder = useCallback(
    (hour: HolyClockHour, currentPreferences: HolyClockPreferences) => {
      if (currentPreferences.soundEnabled) {
        void playChime(
          currentPreferences.chimeId,
          currentPreferences.soundVolume,
        );
      }

      if ("vibrate" in navigator) {
        navigator.vibrate([240, 120, 240, 120, 520]);
      }

      if ("Notification" in window && Notification.permission === "granted") {
        const serviceWorker =
          serviceWorkerRegistrationRef.current?.active ??
          navigator.serviceWorker?.controller;
        const title = `Time for ${hour.name}`;
        const body = `${hour.traditionalName} · Open Sanctum Council and pray.`;
        const url = `${window.location.origin}/${hour.anchor}`;
        const tag = `sanctum-council:${hour.id}`;

        if (serviceWorker) {
          serviceWorker.postMessage({
            type: "SHOW_PRAYER_NOTIFICATION",
            title,
            body,
            url,
            tag,
          });
          return;
        }

        try {
          const notification = new Notification(title, { body, tag });
          notification.onclick = () => {
            window.focus();
            window.location.href = url;
            notification.close();
          };
        } catch {
          // The in-app chime and vibration still carry the reminder.
        }
      }
    },
    [playChime],
  );

  useEffect(() => {
    if (!hasLoadedPreferences || !preferences.remindersEnabled) {
      return;
    }

    const checkForReminder = () => {
      const now = new Date();
      const dueHours = getDueHolyClockHours(now, preferences);
      if (dueHours.length === 0) {
        return;
      }

      const reminderMinute = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}:${now.getHours()}:${now.getMinutes()}`;
      for (const reminderKey of claimedReminderKeysRef.current) {
        if (!reminderKey.startsWith(`${reminderMinute}:`)) {
          claimedReminderKeysRef.current.delete(reminderKey);
        }
      }

      for (const dueHour of dueHours) {
        const reminderKey = `${reminderMinute}:${dueHour.id}`;
        if (claimedReminderKeysRef.current.has(reminderKey)) {
          continue;
        }

        claimedReminderKeysRef.current.add(reminderKey);
        void claimReminder(reminderKey).then((claimed) => {
          if (claimed) {
            deliverReminder(dueHour, preferences);
          }
        });
      }
    };

    checkForReminder();
    const timer = window.setInterval(checkForReminder, 1_000);
    return () => window.clearInterval(timer);
  }, [deliverReminder, hasLoadedPreferences, preferences]);

  const contextValue = useMemo(
    () => ({ playingChimeId, playChime, stopChime }),
    [playChime, playingChimeId, stopChime],
  );

  return (
    <HolyClockAlarmContext.Provider value={contextValue}>
      <audio
        aria-hidden="true"
        onEnded={() => setPlayingChimeId(null)}
        onError={() => setPlayingChimeId(null)}
        preload="none"
        ref={chimeAudioRef}
      />
      {children}
    </HolyClockAlarmContext.Provider>
  );
}

function readSavedPreferences() {
  try {
    return readHolyClockPreferencesFromStorage(window.localStorage);
  } catch {
    return getDefaultHolyClockPreferences();
  }
}

async function claimReminder(reminderKey: string) {
  if (navigator.locks) {
    try {
      return await navigator.locks.request(
        HOLY_CLOCK_REMINDER_LOCK,
        { ifAvailable: true, mode: "exclusive" },
        (lock) => (lock ? claimStoredReminder(reminderKey) : false),
      );
    } catch {
      // Fall through to the storage claim on browsers with partial lock support.
    }
  }

  return claimStoredReminder(reminderKey);
}

function claimStoredReminder(reminderKey: string) {
  try {
    const storedClaims = readStoredReminderClaims(
      window.localStorage.getItem(HOLY_CLOCK_REMINDER_CLAIM_KEY),
    );
    if (storedClaims.includes(reminderKey)) {
      return false;
    }

    const dayKey = reminderKey.slice(0, reminderKey.indexOf(":"));
    const currentDayClaims = storedClaims.filter((claim) =>
      claim.startsWith(`${dayKey}:`),
    );
    window.localStorage.setItem(
      HOLY_CLOCK_REMINDER_CLAIM_KEY,
      JSON.stringify([...currentDayClaims, reminderKey]),
    );
  } catch {
    // A single-tab in-memory guard still protects browsers without storage.
  }
  return true;
}

function readStoredReminderClaims(storedValue: string | null): string[] {
  if (!storedValue) {
    return [];
  }

  try {
    const value: unknown = JSON.parse(storedValue);
    if (Array.isArray(value)) {
      return value.filter((claim): claim is string => typeof claim === "string");
    }
  } catch {
    // The v1 claim format stored one reminder key as a plain string.
  }

  return [storedValue];
}

function strikeBell(context: AudioContext, startTime: number, pitch: number) {
  const partials = [
    { frequency: pitch, volume: 0.12, decay: 2.2 },
    { frequency: pitch * 1.5, volume: 0.055, decay: 1.65 },
    { frequency: pitch * 2.01, volume: 0.028, decay: 1.1 },
  ];

  for (const partial of partials) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(partial.frequency, startTime);
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(
      partial.volume,
      startTime + 0.018,
    );
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      startTime + partial.decay,
    );
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(startTime);
    oscillator.stop(startTime + partial.decay + 0.05);
  }
}
