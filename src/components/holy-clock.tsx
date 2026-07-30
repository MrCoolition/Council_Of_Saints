"use client";

import {
  AlarmClock,
  Bell,
  BellOff,
  CalendarPlus,
  RotateCcw,
  Volume2,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  formatHolyClockCountdown,
  getDefaultHolyClockPreferences,
  getDefaultHolyClockTimes,
  getDueHolyClockHour,
  getHolyClockState,
  HOLY_CLOCK_HOURS,
  HOLY_CLOCK_STORAGE_KEY,
  isHolyClockTime,
  readHolyClockPreferences,
  type HolyClockHour,
  type HolyClockHourId,
  type HolyClockPreferences,
} from "@/lib/liturgy-hours-clock";

const CLOCK_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
});

const CLOCK_SIZE = 320;
const CLOCK_CENTER = CLOCK_SIZE / 2;
const HOUR_RADIUS = 128;
const OUTER_CIRCUMFERENCE = 2 * Math.PI * 146;

type PermissionState = NotificationPermission | "unsupported";

export function HolyClock() {
  const [now, setNow] = useState<Date | null>(null);
  const [preferences, setPreferences] = useState<HolyClockPreferences>(
    getDefaultHolyClockPreferences,
  );
  const [hasLoadedPreferences, setHasLoadedPreferences] = useState(false);
  const [permission, setPermission] =
    useState<PermissionState>("unsupported");
  const [announcement, setAnnouncement] = useState("");
  const audioContextRef = useRef<AudioContext | null>(null);
  const serviceWorkerRegistrationRef =
    useRef<ServiceWorkerRegistration | null>(null);
  const lastReminderRef = useRef("");

  useEffect(() => {
    const initialTick = window.setTimeout(() => setNow(new Date()), 0);
    const timer = window.setInterval(() => setNow(new Date()), 1_000);

    return () => {
      window.clearTimeout(initialTick);
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const loadPreferences = window.setTimeout(() => {
      setPreferences(readSavedPreferences());
      setPermission(
        "Notification" in window ? Notification.permission : "unsupported",
      );
      setHasLoadedPreferences(true);
    }, 0);

    return () => window.clearTimeout(loadPreferences);
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
        // The local bell and device-calendar alarms remain available.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(
    () => () => {
      if (audioContextRef.current) {
        void audioContextRef.current.close();
      }
    },
    [],
  );

  const clockState = useMemo(
    () => (now ? getHolyClockState(now, preferences.times) : null),
    [now, preferences.times],
  );

  const persistPreferences = useCallback(
    (nextPreferences: HolyClockPreferences) => {
      setPreferences(nextPreferences);
      try {
        window.localStorage.setItem(
          HOLY_CLOCK_STORAGE_KEY,
          JSON.stringify(nextPreferences),
        );
      } catch {
        setAnnouncement(
          "The clock is updated for this visit, but this browser could not save it.",
        );
      }
    },
    [],
  );

  const getAudioContext = useCallback((): AudioContext | null => {
    if (typeof window.AudioContext !== "function") {
      return null;
    }

    if (!audioContextRef.current || audioContextRef.current.state === "closed") {
      audioContextRef.current = new AudioContext();
    }
    return audioContextRef.current;
  }, []);

  const ringBell = useCallback(async () => {
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

  const vibrate = useCallback(() => {
    if ("vibrate" in navigator) {
      navigator.vibrate([240, 120, 240, 120, 520]);
    }
  }, []);

  const testBell = useCallback(async () => {
    const bellSounded = await ringBell();
    vibrate();
    setAnnouncement(
      bellSounded
        ? "Prayer bell sounded."
        : "Vibration tested; audio is unavailable on this device.",
    );
  }, [ringBell, vibrate]);

  const deliverReminder = useCallback(
    (hour: HolyClockHour) => {
      void ringBell();
      vibrate();

      if ("Notification" in window && Notification.permission === "granted") {
        const serviceWorker =
          serviceWorkerRegistrationRef.current?.active ??
          navigator.serviceWorker?.controller;

        if (serviceWorker) {
          serviceWorker.postMessage({
            type: "SHOW_PRAYER_NOTIFICATION",
            title: `Time for ${hour.name}`,
            body: `${hour.traditionalName} · Open Sanctum Council and pray.`,
            url: `${window.location.origin}/${hour.anchor}`,
            tag: `sanctum-council:${hour.id}`,
          });
          setAnnouncement(
            `It is time for ${hour.name}, ${hour.traditionalName}.`,
          );
          return;
        }

        try {
          const notification = new Notification(`Time for ${hour.name}`, {
            body: `${hour.traditionalName} · Open Sanctum Council and pray.`,
            tag: `sanctum-council:${hour.id}`,
          });
          notification.onclick = () => {
            window.focus();
            window.location.hash = hour.anchor;
            notification.close();
          };
        } catch {
          // The local bell and vibration still carry the reminder.
        }
      }

      setAnnouncement(`It is time for ${hour.name}, ${hour.traditionalName}.`);
    },
    [ringBell, vibrate],
  );

  useEffect(() => {
    if (!now || !hasLoadedPreferences || !preferences.remindersEnabled) {
      return;
    }

    const dueHour = getDueHolyClockHour(now, preferences.times);
    if (!dueHour) {
      return;
    }

    const reminderKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}:${now.getHours()}:${now.getMinutes()}:${dueHour.id}`;
    if (lastReminderRef.current === reminderKey) {
      return;
    }

    lastReminderRef.current = reminderKey;
    deliverReminder(dueHour);
  }, [
    deliverReminder,
    hasLoadedPreferences,
    now,
    preferences.remindersEnabled,
    preferences.times,
  ]);

  const toggleReminders = useCallback(async () => {
    if (preferences.remindersEnabled) {
      persistPreferences({ ...preferences, remindersEnabled: false });
      setAnnouncement("Prayer reminders turned off.");
      return;
    }

    const context = getAudioContext();
    if (context?.state === "suspended") {
      try {
        await context.resume();
      } catch {
        // Notifications and vibration can still be enabled without audio.
      }
    }

    let nextPermission: PermissionState = "unsupported";
    if ("Notification" in window) {
      nextPermission = Notification.permission;
      if (nextPermission === "default") {
        try {
          nextPermission = await Notification.requestPermission();
        } catch {
          nextPermission = "default";
        }
      }
    }

    setPermission(nextPermission);
    persistPreferences({ ...preferences, remindersEnabled: true });
    setAnnouncement(
      nextPermission === "granted"
        ? "Prayer reminders enabled with bell, vibration, and notifications."
        : "Prayer reminders enabled with bell and vibration.",
    );
  }, [getAudioContext, persistPreferences, preferences]);

  const updateTime = useCallback(
    (hourId: HolyClockHourId, time: string) => {
      if (!isHolyClockTime(time)) {
        return;
      }

      persistPreferences({
        ...preferences,
        times: { ...preferences.times, [hourId]: time },
      });
    },
    [persistPreferences, preferences],
  );

  const restoreTraditionalTimes = useCallback(() => {
    persistPreferences({
      ...preferences,
      times: getDefaultHolyClockTimes(),
    });
    setAnnouncement("Traditional prayer times restored.");
  }, [persistPreferences, preferences]);

  const timeZone =
    now ? Intl.DateTimeFormat().resolvedOptions().timeZone : "Local time";
  const reminderLabel = preferences.remindersEnabled
    ? "Turn off reminders"
    : "Enable reminders";

  return (
    <section
      aria-labelledby="holy-clock-heading"
      className="scroll-mt-24 overflow-hidden rounded-[2rem] border border-emerald-950/15 bg-[var(--panel)] shadow-[0_24px_70px_rgba(7,59,46,0.12)]"
      id="holy-clock"
    >
      <div className="grid lg:grid-cols-[minmax(0,0.94fr)_minmax(24rem,1.06fr)]">
        <div className="relative isolate overflow-hidden bg-emerald-950 px-5 py-8 text-stone-50 sm:px-8 sm:py-10">
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_38%,rgba(217,180,94,0.18),transparent_34%),radial-gradient(circle_at_50%_120%,rgba(255,255,255,0.09),transparent_48%)]"
          />
          <header className="mx-auto max-w-lg text-center">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-amber-200">
              Sanctify the hours
            </p>
            <h2
              className="mt-3 font-serif text-3xl font-semibold sm:text-4xl"
              id="holy-clock-heading"
            >
              The Holy Clock
            </h2>
            <p className="mt-3 text-sm leading-6 text-emerald-50/75">
              Seven Hours keep the whole day turned toward God.
            </p>
          </header>

          <div className="relative mx-auto mt-5 aspect-square w-full max-w-[25rem]">
            {now && hasLoadedPreferences ? (
              <SacredDial
                currentHourId={clockState?.current.hour.id ?? null}
                dayProgress={clockState?.dayProgress ?? 0}
                nextHourId={clockState?.next.hour.id ?? null}
                times={preferences.times}
              />
            ) : (
              <div
                aria-hidden
                className="absolute inset-3 rounded-full border border-amber-200/20 bg-emerald-950/70"
              />
            )}
            <div className="pointer-events-none absolute inset-[27%] flex flex-col items-center justify-center rounded-full border border-amber-200/25 bg-emerald-950/90 text-center shadow-[0_0_45px_rgba(217,180,94,0.15)]">
              <span className="font-mono text-[clamp(1.45rem,6vw,2.5rem)] font-semibold tracking-[-0.04em] text-amber-100">
                {now ? CLOCK_FORMATTER.format(now) : "--:--:--"}
              </span>
              <span className="mt-1 px-2 text-[0.6rem] font-bold uppercase tracking-[0.18em] text-emerald-100/60 sm:text-[0.68rem]">
                24-hour · {timeZone}
              </span>
            </div>
          </div>

          <div className="mx-auto mt-3 grid max-w-lg grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-emerald-100/60">
                Present watch
              </p>
              <p className="mt-2 font-serif text-lg font-semibold text-amber-100">
                {clockState?.current.hour.traditionalName ?? "—"}
              </p>
              <p className="mt-1 text-xs text-emerald-50/65">
                {clockState?.current.hour.name ?? "Finding the hour"}
              </p>
            </div>
            <div className="rounded-2xl border border-amber-200/20 bg-amber-100/[0.08] p-4">
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-amber-100/65">
                Next bell
              </p>
              <p className="mt-2 font-mono text-lg font-bold text-amber-100">
                {clockState
                  ? formatHolyClockCountdown(clockState.secondsToNext)
                  : "--:--:--"}
              </p>
              <p className="mt-1 truncate text-xs text-emerald-50/65">
                {clockState
                  ? `${clockState.next.hour.traditionalName} · ${clockState.next.time}`
                  : "Preparing the schedule"}
              </p>
            </div>
          </div>
        </div>

        <div className="px-4 py-6 sm:px-7 sm:py-8">
          <div className="flex flex-col gap-4 border-b border-stone-200 pb-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent)]">
                Today&apos;s traditional rhythm
              </p>
              <p className="mt-2 font-serif text-2xl font-semibold text-stone-950">
                {now ? DATE_FORMATTER.format(now) : "The daily Hours"}
              </p>
              <p className="mt-1 text-sm text-stone-500">
                Times are saved on this device.
              </p>
            </div>
            <button
              aria-pressed={preferences.remindersEnabled}
              className={`inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition ${
                preferences.remindersEnabled
                  ? "bg-emerald-950 text-amber-100 hover:bg-emerald-900"
                  : "border border-emerald-900/25 bg-emerald-50 text-emerald-950 hover:border-emerald-900"
              }`}
              onClick={() => void toggleReminders()}
              type="button"
            >
              {preferences.remindersEnabled ? (
                <Bell aria-hidden className="size-4" />
              ) : (
                <BellOff aria-hidden className="size-4" />
              )}
              {reminderLabel}
            </button>
          </div>

          <ol aria-label="Liturgy of the Hours schedule" className="mt-4">
            {HOLY_CLOCK_HOURS.map((hour, index) => {
              const isCurrent = clockState?.current.hour.id === hour.id;
              const isNext = clockState?.next.hour.id === hour.id;

              return (
                <li
                  className={`grid grid-cols-[2.5rem_minmax(0,1fr)_5.75rem] items-center gap-3 border-b border-stone-200 py-3 last:border-b-0 ${
                    isCurrent ? "rounded-xl bg-emerald-50/80 px-2" : "px-2"
                  }`}
                  key={hour.id}
                >
                  <span
                    aria-hidden
                    className={`inline-flex size-9 items-center justify-center rounded-full font-mono text-[0.65rem] font-bold ${
                      isCurrent
                        ? "bg-emerald-950 text-amber-100"
                        : isNext
                          ? "border border-amber-500 bg-amber-50 text-amber-900"
                          : "border border-stone-300 bg-white text-stone-500"
                    }`}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <a
                    className="group min-w-0 rounded-md"
                    href={hour.anchor}
                  >
                    <span className="flex flex-wrap items-baseline gap-x-2">
                      <span className="font-serif text-lg font-semibold text-stone-950 group-hover:text-emerald-900">
                        {hour.traditionalName}
                      </span>
                      <span className="text-xs font-semibold text-stone-500">
                        {hour.name}
                      </span>
                      {isCurrent ? (
                        <span className="text-[0.62rem] font-bold uppercase tracking-[0.12em] text-emerald-800">
                          Current
                        </span>
                      ) : isNext ? (
                        <span className="text-[0.62rem] font-bold uppercase tracking-[0.12em] text-amber-800">
                          Next
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-0.5 block text-xs leading-5 text-stone-500">
                      {hour.canonicalWindow}
                    </span>
                  </a>
                  <label className="justify-self-end">
                    <span className="sr-only">
                      Reminder time for {hour.name}
                    </span>
                    <input
                      className="min-h-10 w-[5.75rem] rounded-lg border border-stone-300 bg-white px-2 font-mono text-sm font-bold text-stone-900 transition hover:border-emerald-800 focus:border-emerald-900"
                      onChange={(event) =>
                        updateTime(hour.id, event.currentTarget.value)
                      }
                      type="time"
                      value={preferences.times[hour.id]}
                    />
                  </label>
                </li>
              );
            })}
          </ol>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-4 text-sm font-bold text-stone-800 transition hover:border-amber-700 hover:bg-amber-50"
              onClick={() => void testBell()}
              type="button"
            >
              <Volume2 aria-hidden className="size-4 text-amber-800" />
              Test bell & vibration
            </button>
            <a
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-4 text-center text-sm font-bold text-stone-800 transition hover:border-emerald-800 hover:bg-emerald-50"
              href="/liturgy-hours.ics"
            >
              <CalendarPlus aria-hidden className="size-4 text-emerald-900" />
              Add device calendar alarms
            </a>
          </div>

          <div className="mt-4 flex flex-col gap-3 rounded-xl border border-stone-200 bg-[var(--panel-soft)] px-4 py-3 text-xs leading-5 text-stone-600 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-start gap-2">
              <AlarmClock
                aria-hidden
                className="mt-0.5 size-4 shrink-0 text-[var(--accent)]"
              />
              <span>
                {getReminderStatus(preferences.remindersEnabled, permission)}
              </span>
            </p>
            <button
              className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg px-3 font-bold text-emerald-900 transition hover:bg-white"
              onClick={restoreTraditionalTimes}
              type="button"
            >
              <RotateCcw aria-hidden className="size-3.5" />
              Restore times
            </button>
          </div>

          <p aria-live="polite" className="sr-only">
            {announcement}
          </p>
        </div>
      </div>
    </section>
  );
}

function SacredDial({
  currentHourId,
  dayProgress,
  nextHourId,
  times,
}: {
  currentHourId: HolyClockHourId | null;
  dayProgress: number;
  nextHourId: HolyClockHourId | null;
  times: HolyClockPreferences["times"];
}) {
  const handAngle = dayProgress * 360 - 90;
  const handEnd = polarPoint(handAngle, 108);

  return (
    <svg
      aria-hidden="true"
      className="size-full drop-shadow-[0_18px_30px_rgba(0,0,0,0.2)]"
      viewBox={`0 0 ${CLOCK_SIZE} ${CLOCK_SIZE}`}
    >
      <circle
        cx={CLOCK_CENTER}
        cy={CLOCK_CENTER}
        fill="rgba(3, 35, 27, 0.72)"
        r="150"
        stroke="rgba(245, 213, 139, 0.24)"
        strokeWidth="1"
      />
      <circle
        cx={CLOCK_CENTER}
        cy={CLOCK_CENTER}
        fill="none"
        r="140"
        stroke="rgba(245, 213, 139, 0.16)"
        strokeDasharray="2 7"
        strokeLinecap="round"
        strokeWidth="2"
      />
      <circle
        cx={CLOCK_CENTER}
        cy={CLOCK_CENTER}
        fill="none"
        r="146"
        stroke="rgba(245, 213, 139, 0.78)"
        strokeDasharray={OUTER_CIRCUMFERENCE}
        strokeDashoffset={OUTER_CIRCUMFERENCE * (1 - dayProgress)}
        strokeLinecap="round"
        strokeWidth="2.5"
        transform={`rotate(-90 ${CLOCK_CENTER} ${CLOCK_CENTER})`}
      />

      {Array.from({ length: 24 }, (_, index) => {
        const outer = polarPoint(index * 15 - 90, 140);
        const inner = polarPoint(index * 15 - 90, index % 3 === 0 ? 133 : 136);
        return (
          <line
            key={index}
            stroke={
              index % 3 === 0
                ? "rgba(245, 213, 139, 0.52)"
                : "rgba(255, 255, 255, 0.16)"
            }
            strokeWidth={index % 3 === 0 ? 1.6 : 1}
            x1={inner.x}
            x2={outer.x}
            y1={inner.y}
            y2={outer.y}
          />
        );
      })}

      <g opacity="0.16" stroke="#f5d58b" strokeLinecap="round">
        <line x1="160" x2="160" y1="102" y2="218" strokeWidth="5" />
        <line x1="132" x2="188" y1="137" y2="137" strokeWidth="5" />
      </g>

      <line
        stroke="rgba(255, 250, 231, 0.48)"
        strokeLinecap="round"
        strokeWidth="1.5"
        x1={CLOCK_CENTER}
        x2={handEnd.x}
        y1={CLOCK_CENTER}
        y2={handEnd.y}
      />
      <circle cx={CLOCK_CENTER} cy={CLOCK_CENTER} fill="#f5d58b" r="3.5" />

      {HOLY_CLOCK_HOURS.map((hour, index) => {
        const angle = (timeToMinutes(times[hour.id]) / 1_440) * 360 - 90;
        const point = polarPoint(angle, HOUR_RADIUS);
        const isCurrent = currentHourId === hour.id;
        const isNext = nextHourId === hour.id;

        return (
          <g key={hour.id}>
            {isCurrent ? (
              <circle
                cx={point.x}
                cy={point.y}
                fill="none"
                r="15"
                stroke="rgba(245, 213, 139, 0.38)"
                strokeWidth="6"
              />
            ) : null}
            <circle
              cx={point.x}
              cy={point.y}
              fill={isCurrent ? "#f5d58b" : isNext ? "#fff8dc" : "#0d5a46"}
              r={isCurrent ? 9.5 : 8}
              stroke={isCurrent || isNext ? "#f5d58b" : "rgba(245,213,139,.7)"}
              strokeWidth={isCurrent ? 3 : 1.5}
            />
            <text
              dominantBaseline="middle"
              fill={isCurrent ? "#063b2e" : "#fff8dc"}
              fontFamily="ui-monospace, monospace"
              fontSize="7"
              fontWeight="700"
              textAnchor="middle"
              x={point.x}
              y={point.y + 0.5}
            >
              {index + 1}
            </text>
          </g>
        );
      })}
    </svg>
  );
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

function getReminderStatus(
  remindersEnabled: boolean,
  permission: PermissionState,
) {
  if (!remindersEnabled) {
    return "Reminders are off. Enabling them activates the local bell and vibration.";
  }

  if (permission === "granted") {
    return "Reminders are on: bell, vibration, and browser notification while Sanctum is active.";
  }

  if (permission === "denied") {
    return "Bell and vibration are on; browser notifications are blocked on this device.";
  }

  return "Bell and vibration are on. Device calendar alarms continue when the app is closed.";
}

function polarPoint(angleInDegrees: number, radius: number) {
  const angleInRadians = (angleInDegrees * Math.PI) / 180;
  return {
    x: CLOCK_CENTER + radius * Math.cos(angleInRadians),
    y: CLOCK_CENTER + radius * Math.sin(angleInRadians),
  };
}

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function readSavedPreferences() {
  try {
    return readHolyClockPreferences(
      window.localStorage.getItem(HOLY_CLOCK_STORAGE_KEY),
    );
  } catch {
    return getDefaultHolyClockPreferences();
  }
}
