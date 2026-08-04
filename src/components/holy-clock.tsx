"use client";

import {
  Bell,
  BellOff,
  CalendarPlus,
  LocateFixed,
  RefreshCw,
  RotateCcw,
  Sunrise,
  Sunset,
  Volume2,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useHolyClockAlarm } from "@/components/holy-clock-alarm-provider";
import { createHolyClockCalendar } from "@/lib/liturgy-hours-calendar";
import {
  formatHolyClockCountdown,
  getDefaultHolyClockPreferences,
  getDefaultHolyClockTimes,
  getHolyClockChime,
  getHolyClockState,
  HOLY_CLOCK_CHIMES,
  HOLY_CLOCK_HOURS,
  HOLY_CLOCK_LEGACY_STORAGE_KEYS,
  HOLY_CLOCK_PREFERENCES_EVENT,
  HOLY_CLOCK_STORAGE_KEY,
  isHolyClockSolarHour,
  isHolyClockStorageKey,
  isHolyClockTime,
  readHolyClockPreferencesFromStorage,
  type HolyClockChimeId,
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
type LocationState = "idle" | "locating" | "error";

export function HolyClock() {
  const [now, setNow] = useState<Date | null>(null);
  const [preferences, setPreferences] = useState<HolyClockPreferences>(
    getDefaultHolyClockPreferences,
  );
  const [hasLoadedPreferences, setHasLoadedPreferences] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [locationState, setLocationState] = useState<LocationState>("idle");
  const [locationMessage, setLocationMessage] = useState("");
  const preferencesRef = useRef(preferences);
  const { playingChimeId, playChime, stopChime } = useHolyClockAlarm();

  useEffect(() => {
    const initialTick = window.setTimeout(() => setNow(new Date()), 0);
    const timer = window.setInterval(() => setNow(new Date()), 1_000);

    return () => {
      window.clearTimeout(initialTick);
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const loadPreferences = () => {
      const savedPreferences = readSavedPreferences();
      preferencesRef.current = savedPreferences;
      setPreferences(savedPreferences);
      setHasLoadedPreferences(true);
    };
    const initialLoad = window.setTimeout(loadPreferences, 0);

    const handlePreferenceChange = (event: Event) => {
      const changedPreferences = (
        event as CustomEvent<HolyClockPreferences>
      ).detail;
      if (changedPreferences) {
        preferencesRef.current = changedPreferences;
        setPreferences(changedPreferences);
        setHasLoadedPreferences(true);
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

  const clockState = useMemo(
    () => (now ? getHolyClockState(now, preferences) : null),
    [now, preferences],
  );
  const effectiveSchedule = clockState?.effectiveSchedule;

  const persistPreferences = useCallback(
    (nextPreferences: HolyClockPreferences) => {
      preferencesRef.current = nextPreferences;
      setPreferences(nextPreferences);
      try {
        window.localStorage.setItem(
          HOLY_CLOCK_STORAGE_KEY,
          JSON.stringify(nextPreferences),
        );
        for (const key of HOLY_CLOCK_LEGACY_STORAGE_KEYS) {
          window.localStorage.removeItem(key);
        }
      } catch {
        setAnnouncement(
          "The clock is updated for this visit, but this browser could not save it.",
        );
      }
      window.dispatchEvent(
        new CustomEvent(HOLY_CLOCK_PREFERENCES_EVENT, {
          detail: nextPreferences,
        }),
      );
    },
    [],
  );

  const previewSelectedChime = useCallback(async () => {
    if (playingChimeId) {
      stopChime();
      setAnnouncement("Prayer chime stopped.");
      return;
    }

    const chime = getHolyClockChime(preferences.chimeId);
    const chimeSounded = await playChime(
      chime.id,
      preferences.soundVolume,
    );
    if (chimeSounded) {
      setAnnouncement(`${chime.label} previewing.`);
      return;
    }

    setAnnouncement("Audio is unavailable on this device.");
  }, [
    playChime,
    playingChimeId,
    preferences.chimeId,
    preferences.soundVolume,
    stopChime,
  ]);

  const toggleReminders = useCallback(async () => {
    if (preferences.remindersEnabled) {
      persistPreferences({ ...preferences, remindersEnabled: false });
      setAnnouncement("Prayer reminders turned off.");
      return;
    }

    if (preferences.soundEnabled) {
      void playChime(preferences.chimeId, preferences.soundVolume);
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

    persistPreferences({ ...preferences, remindersEnabled: true });
    const soundDescription = preferences.soundEnabled
      ? "chime, vibration"
      : "vibration";
    setAnnouncement(
      nextPermission === "granted"
        ? `Prayer reminders enabled with ${soundDescription}, and notifications.`
        : `Prayer reminders enabled with ${soundDescription}.`,
    );
  }, [persistPreferences, playChime, preferences]);

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
      solar: { ...preferences.solar, enabled: false },
    });
    setAnnouncement("Traditional fixed prayer times restored.");
  }, [persistPreferences, preferences]);

  const alignWithDaylight = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setLocationState("error");
      setLocationMessage("Location is unavailable on this device.");
      setAnnouncement("Location is unavailable on this device.");
      return;
    }

    setLocationState("locating");
    setLocationMessage("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const currentPreferences = preferencesRef.current;
        const resolvedTimeZone =
          Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
        const latitude = Number(position.coords.latitude.toFixed(5));
        const longitude = Number(position.coords.longitude.toFixed(5));
        persistPreferences({
          ...currentPreferences,
          solar: {
            ...currentPreferences.solar,
            enabled: true,
            latitude,
            longitude,
            accuracyMeters: Number.isFinite(position.coords.accuracy)
              ? Math.round(position.coords.accuracy)
              : null,
            timeZone: resolvedTimeZone,
            capturedAt: new Date(position.timestamp || Date.now()).toISOString(),
          },
        });
        setLocationState("idle");
        setLocationMessage("");
        setAnnouncement(
          `The Hours now follow local daylight. Office of Readings begins ${currentPreferences.solar.officeReadingsLeadMinutes} minutes before sunrise.`,
        );
      },
      (error) => {
        const message =
          error.code === error.PERMISSION_DENIED
            ? "Allow location to align the Hours with sunrise and sunset."
            : "The sun could not be located. Try again in a moment.";
        setLocationState("error");
        setLocationMessage(message);
        setAnnouncement(message);
      },
      {
        enableHighAccuracy: false,
        maximumAge: 6 * 60 * 60 * 1_000,
        timeout: 15_000,
      },
    );
  }, [persistPreferences]);

  const toggleDaylightAlignment = useCallback(() => {
    if (
      preferences.solar.latitude === null ||
      preferences.solar.longitude === null
    ) {
      alignWithDaylight();
      return;
    }

    const enabled = !preferences.solar.enabled;
    persistPreferences({
      ...preferences,
      solar: { ...preferences.solar, enabled },
    });
    setAnnouncement(
      enabled
        ? "The Hours follow local daylight."
        : "The Hours use your fixed times.",
    );
  }, [alignWithDaylight, persistPreferences, preferences]);

  const updateOfficeReadingsLead = useCallback(
    (officeReadingsLeadMinutes: number) => {
      persistPreferences({
        ...preferences,
        solar: {
          ...preferences.solar,
          officeReadingsLeadMinutes,
        },
      });
      setAnnouncement(
        `Office of Readings will ring ${officeReadingsLeadMinutes} minutes before sunrise.`,
      );
    },
    [persistPreferences, preferences],
  );

  const toggleChimeSound = useCallback(() => {
    const soundEnabled = !preferences.soundEnabled;
    if (!soundEnabled) {
      stopChime();
    } else if (preferences.remindersEnabled) {
      void playChime(preferences.chimeId, preferences.soundVolume);
    }
    persistPreferences({ ...preferences, soundEnabled });
    setAnnouncement(`Prayer chime ${soundEnabled ? "on" : "off"}.`);
  }, [persistPreferences, playChime, preferences, stopChime]);

  const selectChime = useCallback(
    (chimeId: HolyClockChimeId) => {
      stopChime();
      persistPreferences({ ...preferences, chimeId });
      setAnnouncement(`${getHolyClockChime(chimeId).label} selected.`);
    },
    [persistPreferences, preferences, stopChime],
  );

  const updateChimeVolume = useCallback(
    (volume: number) => {
      const soundVolume = Math.min(1, Math.max(0.1, volume));
      persistPreferences({ ...preferences, soundVolume });
    },
    [persistPreferences, preferences],
  );

  const timeZone =
    now ? Intl.DateTimeFormat().resolvedOptions().timeZone : "Local time";
  const reminderLabel = preferences.remindersEnabled
    ? "Turn off reminders"
    : "Enable reminders";
  const downloadCalendarAlarms = useCallback(() => {
    const calendar = createHolyClockCalendar(
      now ?? new Date(),
      preferences,
      timeZone,
      window.location.origin,
    );
    const url = URL.createObjectURL(
      new Blob([calendar], { type: "text/calendar;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "sanctum-council-holy-hours.ics";
    link.hidden = true;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    setAnnouncement("Device calendar alarms prepared.");
  }, [now, preferences, timeZone]);

  return (
    <section
      aria-labelledby="holy-clock-heading"
      className="scroll-mt-24 overflow-hidden rounded-[2rem] border border-sanctuary-night/15 bg-[var(--panel)] shadow-[var(--shadow-raised)]"
      id="holy-clock"
    >
      <div className="grid lg:grid-cols-[minmax(0,0.94fr)_minmax(24rem,1.06fr)]">
        <div className="relative isolate overflow-hidden bg-sanctuary-night px-5 py-8 text-vellum sm:px-8 sm:py-10">
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_38%,rgba(217,180,94,0.18),transparent_34%),radial-gradient(circle_at_50%_120%,rgba(255,255,255,0.09),transparent_48%)]"
          />
          <header className="mx-auto max-w-lg text-center">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--gilt-light)]">
              Sanctify the hours
            </p>
            <h2
              className="mt-3 font-serif text-3xl font-semibold sm:text-4xl"
              id="holy-clock-heading"
            >
              The Holy Clock
            </h2>
            <p className="mt-3 text-sm leading-6 text-vellum/75">
              Seven Hours keep the whole day turned toward God.
            </p>
          </header>

          <div className="relative mx-auto mt-5 aspect-square w-full max-w-[25rem]">
            {now && hasLoadedPreferences ? (
              <HolyClockDial
                currentHourId={clockState?.current.hour.id ?? null}
                dayProgress={clockState?.dayProgress ?? 0}
                nextHourId={clockState?.next.hour.id ?? null}
                times={effectiveSchedule?.times ?? preferences.times}
              />
            ) : (
              <div
                aria-hidden
                className="absolute inset-3 rounded-full border border-gilt/30 bg-sanctuary-night/70"
              />
            )}
            <div className="pointer-events-none absolute inset-[27%] flex flex-col items-center justify-center rounded-full border border-gilt/35 bg-sanctuary-night/90 text-center shadow-[0_0_45px_rgb(198_161_91/0.15)]">
              <span className="font-mono text-[clamp(1.45rem,6vw,2.5rem)] font-semibold tracking-[-0.04em] text-[var(--gilt-light)]">
                {now ? CLOCK_FORMATTER.format(now) : "--:--:--"}
              </span>
              <span className="mt-1 px-2 text-[0.6rem] font-bold uppercase tracking-[0.18em] text-vellum/60 sm:text-[0.68rem]">
                24-hour · {timeZone}
              </span>
            </div>
          </div>

          <div className="mx-auto mt-3 grid max-w-lg grid-cols-2 gap-3">
            <div className="rounded-2xl border border-vellum/10 bg-vellum/[0.06] p-4">
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-vellum/60">
                Present watch
              </p>
              <p className="mt-2 font-serif text-lg font-semibold text-[var(--gilt-light)]">
                {clockState?.current.hour.traditionalName ?? "—"}
              </p>
              <p className="mt-1 text-xs text-vellum/65">
                {clockState?.current.hour.name ?? "Finding the hour"}
              </p>
            </div>
            <div className="rounded-2xl border border-gilt/30 bg-gilt/[0.08] p-4">
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-gilt/80">
                Next bell
              </p>
              <p className="mt-2 font-mono text-lg font-bold text-[var(--gilt-light)]">
                {clockState
                  ? formatHolyClockCountdown(clockState.secondsToNext)
                  : "--:--:--"}
              </p>
              <p className="mt-1 truncate text-xs text-vellum/65">
                {clockState
                  ? `${clockState.next.hour.traditionalName} · ${clockState.next.time}`
                  : "Preparing the schedule"}
              </p>
            </div>
          </div>
        </div>

        <div className="px-4 py-6 sm:px-7 sm:py-8">
          <div className="flex flex-col gap-4 border-b border-hairline pb-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent)]">
                {effectiveSchedule?.solarAligned
                  ? "Today follows sacred light"
                  : "Today’s traditional rhythm"}
              </p>
              <p className="mt-2 font-serif text-2xl font-semibold text-foreground">
                {now ? DATE_FORMATTER.format(now) : "The daily Hours"}
              </p>
            </div>
            <button
              aria-pressed={preferences.remindersEnabled}
              className={`inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition ${
                preferences.remindersEnabled
                  ? "bg-sanctuary-night text-[var(--gilt-light)] hover:bg-ecclesial-green"
                  : "border border-ecclesial-green/25 bg-ecclesial-green/5 text-ecclesial-green hover:border-ecclesial-green"
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

          <section className="relative mt-5 overflow-hidden rounded-2xl border border-gilt/35 bg-sanctuary-night p-4 text-vellum shadow-[0_16px_40px_rgb(10_32_26/0.14)] sm:p-5">
            <div
              aria-hidden
              className="absolute inset-0 bg-[radial-gradient(circle_at_82%_0%,rgba(244,208,126,0.22),transparent_42%),linear-gradient(120deg,transparent,rgba(255,255,255,0.035))]"
            />
            <div className="relative">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-gilt/40 bg-gilt/10 text-[var(--gilt-light)]">
                    <Sunrise aria-hidden className="size-5" />
                  </span>
                  <div>
                    <p className="text-[0.62rem] font-bold uppercase tracking-[0.2em] text-gilt">
                      Sacred light
                    </p>
                    <h3 className="mt-1 font-serif text-xl font-semibold text-vellum">
                      Dawn orders the Hours
                    </h3>
                  </div>
                </div>
                {effectiveSchedule?.solarAligned ? (
                  <span className="rounded-full border border-gilt/35 bg-gilt/10 px-3 py-1 text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[var(--gilt-light)]">
                    Aligned
                  </span>
                ) : null}
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                <SolarMoment
                  icon={<LocateFixed aria-hidden className="size-3.5" />}
                  label="Pre-dawn"
                  time={
                    effectiveSchedule?.times.office_readings ??
                    preferences.times.office_readings
                  }
                />
                <SolarMoment
                  icon={<Sunrise aria-hidden className="size-3.5" />}
                  label="Sunrise"
                  time={effectiveSchedule?.sunrise ?? "—"}
                />
                <SolarMoment
                  icon={<Sunset aria-hidden className="size-3.5" />}
                  label="Sunset"
                  time={effectiveSchedule?.sunset ?? "—"}
                />
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                <label className="block">
                  <span className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-vellum/60">
                    Office begins before sunrise
                  </span>
                  <select
                    className="mt-1.5 min-h-11 w-full rounded-xl border border-vellum/15 bg-vellum/[0.08] px-3 text-sm font-bold text-vellum outline-none transition focus:border-gilt"
                    onChange={(event) =>
                      updateOfficeReadingsLead(Number(event.currentTarget.value))
                    }
                    value={preferences.solar.officeReadingsLeadMinutes}
                  >
                    {[30, 45, 60, 90].map((minutes) => (
                      <option className="bg-sanctuary-night" key={minutes} value={minutes}>
                        {minutes} minutes before
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex gap-2">
                  <button
                    aria-pressed={
                      preferences.solar.enabled &&
                      effectiveSchedule?.solarStatus !== "timezone-mismatch"
                    }
                    className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--gilt-light)] px-4 text-sm font-bold text-sanctuary-night transition hover:bg-white sm:flex-none"
                    disabled={locationState === "locating"}
                    onClick={
                      effectiveSchedule?.solarStatus === "timezone-mismatch" ||
                      effectiveSchedule?.solarStatus === "unconfigured"
                        ? alignWithDaylight
                        : toggleDaylightAlignment
                    }
                    type="button"
                  >
                    {locationState === "locating" ? (
                      <RefreshCw aria-hidden className="size-4 animate-spin" />
                    ) : (
                      <LocateFixed aria-hidden className="size-4" />
                    )}
                    {locationState === "locating"
                      ? "Finding dawn"
                      : effectiveSchedule?.solarStatus === "timezone-mismatch"
                        ? "Refresh location"
                        : preferences.solar.enabled
                          ? "Use fixed times"
                          : "Follow daylight"}
                  </button>
                  {preferences.solar.latitude !== null &&
                  preferences.solar.longitude !== null &&
                  effectiveSchedule?.solarAligned ? (
                    <button
                      aria-label="Refresh daylight location"
                      className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl border border-vellum/20 text-vellum/75 transition hover:border-gilt hover:text-[var(--gilt-light)]"
                      disabled={locationState === "locating"}
                      onClick={alignWithDaylight}
                      title="Refresh location"
                      type="button"
                    >
                      <RefreshCw aria-hidden className="size-4" />
                    </button>
                  ) : null}
                </div>
              </div>

              {effectiveSchedule?.solarStatus === "polar-day" ||
              effectiveSchedule?.solarStatus === "polar-night" ? (
                <p className="mt-3 text-xs leading-5 text-vellum/65">
                  The sun does not cross the horizon today; fixed Hours remain.
                </p>
              ) : locationState === "error" && locationMessage ? (
                <p className="mt-3 text-xs leading-5 text-[var(--gilt-light)]">
                  {locationMessage}
                </p>
              ) : effectiveSchedule?.solarAligned ? (
                <p className="mt-3 text-xs leading-5 text-vellum/65">
                  Officium lectionis rings {preferences.solar.officeReadingsLeadMinutes} minutes before dawn. Lauds rises with the sun; Vespers greets its setting.
                </p>
              ) : (
                <p className="mt-3 text-xs leading-5 text-vellum/65">
                  Use this device’s location once; the sun is calculated here each day.
                </p>
              )}
            </div>
          </section>

          <ol aria-label="Liturgy of the Hours schedule" className="mt-4">
            {HOLY_CLOCK_HOURS.map((hour, index) => {
              const isCurrent = clockState?.current.hour.id === hour.id;
              const isNext = clockState?.next.hour.id === hour.id;
              const isSolarControlled =
                effectiveSchedule?.solarAligned &&
                isHolyClockSolarHour(hour.id);

              return (
                <li
                  className={`grid grid-cols-[2.5rem_minmax(0,1fr)_5.75rem] items-center gap-3 border-b border-hairline py-3 last:border-b-0 ${
                    isCurrent ? "rounded-xl bg-ecclesial-green/5 px-2" : "px-2"
                  }`}
                  key={hour.id}
                >
                  <span
                    aria-hidden
                    className={`inline-flex size-9 items-center justify-center rounded-full font-mono text-[0.65rem] font-bold ${
                      isCurrent
                        ? "bg-sanctuary-night text-[var(--gilt-light)]"
                        : isNext
                          ? "border border-gilt bg-gilt/15 text-oxblood"
                          : "border border-hairline bg-vellum text-muted"
                    }`}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <a
                    className="group min-w-0 rounded-md"
                    href={hour.anchor}
                  >
                    <span className="flex flex-wrap items-baseline gap-x-2">
                      <span className="font-serif text-lg font-semibold text-foreground group-hover:text-ecclesial-green">
                        {hour.traditionalName}
                      </span>
                      <span className="text-xs font-semibold text-muted">
                        {hour.name}
                      </span>
                      {isCurrent ? (
                        <span className="text-[0.62rem] font-bold uppercase tracking-[0.12em] text-ecclesial-green">
                          Current
                        </span>
                      ) : isNext ? (
                        <span className="text-[0.62rem] font-bold uppercase tracking-[0.12em] text-oxblood">
                          Next
                        </span>
                      ) : null}
                      {isSolarControlled ? (
                        <span className="text-[0.58rem] font-bold uppercase tracking-[0.12em] text-oxblood">
                          Sun
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-0.5 block text-xs leading-5 text-muted">
                      {hour.canonicalWindow}
                    </span>
                  </a>
                  <label className="justify-self-end">
                    <span className="sr-only">
                      Reminder time for {hour.name}
                    </span>
                    <input
                      className="min-h-10 w-[5.75rem] rounded-lg border border-hairline bg-vellum px-2 font-mono text-sm font-bold text-foreground transition hover:border-ecclesial-green focus:border-ecclesial-green disabled:cursor-not-allowed disabled:border-gilt/30 disabled:bg-gilt/[0.08] disabled:text-oxblood"
                      disabled={Boolean(isSolarControlled)}
                      onChange={(event) =>
                        updateTime(hour.id, event.currentTarget.value)
                      }
                      type="time"
                      value={
                        effectiveSchedule?.times[hour.id] ??
                        preferences.times[hour.id]
                      }
                    />
                  </label>
                </li>
              );
            })}
          </ol>

          <fieldset className="mt-5 rounded-2xl border border-gilt/30 bg-gilt/[0.06] p-4 sm:p-5">
            <legend className="sr-only">Prayer chime</legend>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="inline-flex size-10 items-center justify-center rounded-full bg-sanctuary-night text-[var(--gilt-light)]">
                  <Volume2 aria-hidden className="size-4" />
                </span>
                <div>
                  <h3 className="font-serif text-lg font-semibold text-foreground">
                    Prayer chime
                  </h3>
                  <p className="text-xs text-muted">
                    {getHolyClockChime(preferences.chimeId).label}
                  </p>
                </div>
              </div>
              <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl px-2 text-xs font-bold text-foreground focus-within:ring-2 focus-within:ring-ecclesial-green/40 focus-within:ring-offset-2">
                <input
                  checked={preferences.soundEnabled}
                  className="sr-only"
                  onChange={toggleChimeSound}
                  role="switch"
                  type="checkbox"
                />
                <span
                  aria-hidden
                  className={`relative h-6 w-11 rounded-full border transition ${
                    preferences.soundEnabled
                      ? "border-ecclesial-green bg-ecclesial-green"
                      : "border-hairline bg-vellum"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 size-5 rounded-full bg-white shadow-sm transition-transform ${
                      preferences.soundEnabled
                        ? "translate-x-[1.15rem]"
                        : "translate-x-0.5"
                    }`}
                  />
                </span>
                {preferences.soundEnabled ? "Sound on" : "Sound off"}
              </label>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              {HOLY_CLOCK_CHIMES.map((chime) => {
                const isSelected = preferences.chimeId === chime.id;
                return (
                  <label
                    className={`cursor-pointer rounded-xl border p-3 transition focus-within:ring-2 focus-within:ring-ecclesial-green/40 ${
                      isSelected
                        ? "border-ecclesial-green bg-ecclesial-green/[0.07]"
                        : "border-hairline bg-[var(--panel)] hover:border-gilt"
                    }`}
                    key={chime.id}
                  >
                    <input
                      checked={isSelected}
                      className="sr-only"
                      name="holy-clock-chime"
                      onChange={() => selectChime(chime.id)}
                      type="radio"
                      value={chime.id}
                    />
                    <span className="flex items-center gap-2">
                      <span
                        aria-hidden
                        className={`size-2.5 rounded-full border ${
                          isSelected
                            ? "border-ecclesial-green bg-ecclesial-green ring-2 ring-ecclesial-green/20"
                            : "border-muted"
                        }`}
                      />
                      <span className="text-sm font-bold text-foreground">
                        {chime.label}
                      </span>
                    </span>
                    <span className="mt-1 block pl-[1.125rem] text-[0.68rem] leading-4 text-muted">
                      {chime.description}
                    </span>
                  </label>
                );
              })}
            </div>

            <div className="mt-4 grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
              <label className="block">
                <span className="flex items-center justify-between text-xs font-bold text-foreground">
                  Volume
                  <span className="font-mono text-muted">
                    {Math.round(preferences.soundVolume * 100)}%
                  </span>
                </span>
                <input
                  aria-label="Prayer chime volume"
                  className="mt-2 h-2 w-full cursor-pointer accent-ecclesial-green disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={!preferences.soundEnabled}
                  max="100"
                  min="10"
                  onChange={(event) =>
                    updateChimeVolume(Number(event.currentTarget.value) / 100)
                  }
                  step="5"
                  type="range"
                  value={Math.round(preferences.soundVolume * 100)}
                />
              </label>
              <button
                aria-pressed={playingChimeId !== null}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-gilt/40 bg-[var(--panel)] px-5 text-sm font-bold text-foreground transition hover:border-gilt hover:bg-gilt/15 disabled:cursor-not-allowed disabled:opacity-45"
                disabled={!preferences.soundEnabled}
                onClick={() => void previewSelectedChime()}
                type="button"
              >
                <Volume2 aria-hidden className="size-4 text-oxblood" />
                {playingChimeId ? "Stop" : "Preview"}
              </button>
            </div>

            <p className="mt-3 text-[0.68rem] leading-5 text-muted">
              For closed-screen alerts, add device calendar alarms.
            </p>
          </fieldset>

          <div className="mt-3">
            <button
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-hairline bg-vellum px-4 text-center text-sm font-bold text-foreground transition hover:border-ecclesial-green hover:bg-ecclesial-green/5"
              onClick={downloadCalendarAlarms}
              type="button"
            >
              <CalendarPlus aria-hidden className="size-4 text-ecclesial-green" />
              Add device calendar alarms
            </button>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg px-3 text-xs font-bold text-ecclesial-green transition hover:bg-vellum"
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

function SolarMoment({
  icon,
  label,
  time,
}: {
  icon: React.ReactNode;
  label: string;
  time: string;
}) {
  return (
    <div className="rounded-xl border border-vellum/10 bg-vellum/[0.055] px-3 py-2.5">
      <span className="flex items-center gap-1.5 text-[0.58rem] font-bold uppercase tracking-[0.13em] text-vellum/55">
        {icon}
        {label}
      </span>
      <span className="mt-1.5 block font-mono text-base font-bold text-[var(--gilt-light)]">
        {time}
      </span>
    </div>
  );
}

export function HolyClockDial({
  currentHourId,
  dayProgress,
  holographic = false,
  nextHourId,
  times,
}: {
  currentHourId: HolyClockHourId | null;
  dayProgress: number;
  holographic?: boolean;
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
        fill="var(--sanctuary-night)"
        fillOpacity={holographic ? 0.16 : 0.72}
        r="150"
        stroke="var(--gilt-light)"
        strokeOpacity={holographic ? 0.42 : 0.24}
        strokeWidth="1"
      />
      <circle
        cx={CLOCK_CENTER}
        cy={CLOCK_CENTER}
        fill="none"
        r="140"
        stroke="var(--gilt-light)"
        strokeDasharray="2 7"
        strokeLinecap="round"
        strokeOpacity="0.16"
        strokeWidth="2"
      />
      <circle
        cx={CLOCK_CENTER}
        cy={CLOCK_CENTER}
        fill="none"
        r="146"
        stroke="var(--gilt-light)"
        strokeDasharray={OUTER_CIRCUMFERENCE}
        strokeDashoffset={OUTER_CIRCUMFERENCE * (1 - dayProgress)}
        strokeLinecap="round"
        strokeOpacity="0.78"
        strokeWidth="2.5"
        transform={`rotate(-90 ${CLOCK_CENTER} ${CLOCK_CENTER})`}
      />

      {Array.from({ length: 24 }, (_, index) => {
        const outer = polarPoint(index * 15 - 90, 140);
        const inner = polarPoint(index * 15 - 90, index % 3 === 0 ? 133 : 136);
        return (
          <line
            key={index}
            stroke={index % 3 === 0 ? "var(--gilt-light)" : "var(--vellum)"}
            strokeOpacity={index % 3 === 0 ? 0.52 : 0.16}
            strokeWidth={index % 3 === 0 ? 1.6 : 1}
            x1={inner.x}
            x2={outer.x}
            y1={inner.y}
            y2={outer.y}
          />
        );
      })}

      <g opacity="0.16" stroke="var(--gilt-light)" strokeLinecap="round">
        <line x1="160" x2="160" y1="102" y2="218" strokeWidth="5" />
        <line x1="132" x2="188" y1="137" y2="137" strokeWidth="5" />
      </g>

      <line
        stroke="var(--vellum)"
        strokeLinecap="round"
        strokeOpacity="0.48"
        strokeWidth="1.5"
        x1={CLOCK_CENTER}
        x2={handEnd.x}
        y1={CLOCK_CENTER}
        y2={handEnd.y}
      />
      <circle
        cx={CLOCK_CENTER}
        cy={CLOCK_CENTER}
        fill="var(--gilt-light)"
        r="3.5"
      />

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
                stroke="var(--gilt-light)"
                strokeOpacity="0.38"
                strokeWidth="6"
              />
            ) : null}
            <circle
              cx={point.x}
              cy={point.y}
              fill={
                isCurrent
                  ? "var(--gilt-light)"
                  : isNext
                    ? "var(--vellum)"
                    : "var(--ecclesial-green)"
              }
              r={isCurrent ? 9.5 : 8}
              stroke="var(--gilt-light)"
              strokeOpacity={isCurrent || isNext ? 1 : 0.7}
              strokeWidth={isCurrent ? 3 : 1.5}
            />
            <text
              dominantBaseline="middle"
              fill={isCurrent ? "var(--sanctuary-night)" : "var(--vellum)"}
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

function polarPoint(angleInDegrees: number, radius: number) {
  const angleInRadians = (angleInDegrees * Math.PI) / 180;
  return {
    x: Number((CLOCK_CENTER + radius * Math.cos(angleInRadians)).toFixed(4)),
    y: Number((CLOCK_CENTER + radius * Math.sin(angleInRadians)).toFixed(4)),
  };
}

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function readSavedPreferences() {
  try {
    return readHolyClockPreferencesFromStorage(window.localStorage);
  } catch {
    return getDefaultHolyClockPreferences();
  }
}
