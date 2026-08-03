"use client";

import { BellRing } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { HolyClockDial } from "@/components/holy-clock";
import {
  formatHolyClockCountdown,
  getDefaultHolyClockPreferences,
  getHolyClockState,
  HOLY_CLOCK_LEGACY_STORAGE_KEY,
  HOLY_CLOCK_PREFERENCES_EVENT,
  HOLY_CLOCK_STORAGE_KEY,
  readHolyClockPreferences,
  type HolyClockPreferences,
} from "@/lib/liturgy-hours-clock";

const MINI_CLOCK_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

export function MiniHolyClock() {
  const [now, setNow] = useState<Date | null>(null);
  const [preferences, setPreferences] = useState<HolyClockPreferences>(
    getDefaultHolyClockPreferences,
  );

  useEffect(() => {
    const loadPreferences = () => setPreferences(readSavedPreferences());
    const initialTick = window.setTimeout(() => {
      setNow(new Date());
      loadPreferences();
    }, 0);
    const timer = window.setInterval(() => setNow(new Date()), 1_000);

    const handlePreferenceChange = (event: Event) => {
      const changedPreferences = (
        event as CustomEvent<HolyClockPreferences>
      ).detail;
      setPreferences(changedPreferences ?? readSavedPreferences());
    };
    const handleStorage = (event: StorageEvent) => {
      if (
        event.key === HOLY_CLOCK_STORAGE_KEY ||
        event.key === HOLY_CLOCK_LEGACY_STORAGE_KEY
      ) {
        loadPreferences();
      }
    };

    window.addEventListener(
      HOLY_CLOCK_PREFERENCES_EVENT,
      handlePreferenceChange,
    );
    window.addEventListener("storage", handleStorage);

    return () => {
      window.clearTimeout(initialTick);
      window.clearInterval(timer);
      window.removeEventListener(
        HOLY_CLOCK_PREFERENCES_EVENT,
        handlePreferenceChange,
      );
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const clockState = useMemo(
    () => (now ? getHolyClockState(now, preferences.times) : null),
    [now, preferences.times],
  );
  const currentHour = clockState?.current.hour;
  const nextHour = clockState?.next.hour;

  return (
    <a
      aria-label={
        currentHour && nextHour
          ? `Open the Holy Clock. Present watch: ${currentHour.name}. Next bell: ${nextHour.name} at ${clockState.next.time}.`
          : "Open the Holy Clock"
      }
      className="group absolute right-10 top-1/2 z-10 hidden w-72 -translate-y-1/2 rounded-[2rem] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gilt-light)] focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--sanctuary-night)] xl:block"
      href="#holy-clock"
    >
      <div className="relative isolate aspect-square overflow-hidden rounded-full border border-[var(--gilt)]/35 bg-[rgba(7,25,19,0.34)] p-2 shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_24px_70px_rgba(0,0,0,0.28),0_0_60px_rgba(211,177,99,0.09)] backdrop-blur-[3px] transition duration-500 group-hover:border-[var(--gilt-light)]/65 group-hover:bg-[rgba(7,25,19,0.43)] group-hover:shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_28px_78px_rgba(0,0,0,0.32),0_0_72px_rgba(211,177,99,0.16)]">
        <div
          aria-hidden
          className="absolute inset-[9%] -z-10 rounded-full bg-[radial-gradient(circle_at_50%_38%,rgba(255,244,202,0.11),rgba(211,177,99,0.035)_38%,transparent_68%)] motion-safe:animate-[pulse_6s_ease-in-out_infinite]"
        />
        <div
          aria-hidden
          className="absolute inset-[6%] rounded-full border-t border-r border-[var(--gilt-light)]/20 motion-safe:animate-[spin_48s_linear_infinite]"
        />

        <HolyClockDial
          currentHourId={clockState?.current.hour.id ?? null}
          dayProgress={clockState?.dayProgress ?? 0}
          holographic
          nextHourId={clockState?.next.hour.id ?? null}
          times={preferences.times}
        />

        <div className="pointer-events-none absolute inset-[27%] flex flex-col items-center justify-center rounded-full border border-[var(--gilt)]/30 bg-[rgba(5,22,16,0.67)] px-2 text-center shadow-[inset_0_0_28px_rgba(211,177,99,0.08),0_0_34px_rgba(211,177,99,0.1)] backdrop-blur-md">
          <span className="text-[0.52rem] font-bold uppercase tracking-[0.2em] text-[var(--gilt-light)]/70">
            Present watch
          </span>
          <span className="mt-1 max-w-[7rem] text-balance font-serif text-[1.05rem] font-semibold leading-5 text-[var(--vellum)]">
            {currentHour?.traditionalName ?? "Sacred time"}
          </span>
          <time
            className="mt-1 font-mono text-[0.68rem] font-semibold tabular-nums tracking-[0.08em] text-[var(--parchment)]/75"
            dateTime={now?.toISOString()}
          >
            {now ? MINI_CLOCK_FORMATTER.format(now) : "--:--:--"}
          </time>
        </div>
      </div>

      <div className="relative mx-auto -mt-7 grid w-[90%] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-white/12 bg-[rgba(5,22,16,0.62)] px-4 py-3 text-[var(--vellum)] shadow-[0_18px_42px_rgba(0,0,0,0.24)] backdrop-blur-lg transition duration-300 group-hover:border-[var(--gilt)]/45">
        <span className="inline-flex size-9 items-center justify-center rounded-full border border-[var(--gilt)]/30 bg-[var(--gilt)]/10 text-[var(--gilt-light)]">
          <BellRing aria-hidden className="size-4" />
        </span>
        <span className="min-w-0">
          <span className="block text-[0.54rem] font-bold uppercase tracking-[0.18em] text-[var(--gilt-light)]/70">
            Next bell
          </span>
          <span className="mt-0.5 block truncate font-serif text-sm font-semibold">
            {nextHour
              ? `${nextHour.traditionalName} · ${clockState.next.time}`
              : "Preparing the Hours"}
          </span>
        </span>
        <span className="font-mono text-[0.65rem] font-bold tabular-nums text-[var(--parchment)]/75">
          {clockState
            ? formatHolyClockCountdown(clockState.secondsToNext)
            : "--:--:--"}
        </span>
      </div>
    </a>
  );
}

function readSavedPreferences() {
  try {
    return readHolyClockPreferences(
      window.localStorage.getItem(HOLY_CLOCK_STORAGE_KEY) ??
        window.localStorage.getItem(HOLY_CLOCK_LEGACY_STORAGE_KEY),
    );
  } catch {
    return getDefaultHolyClockPreferences();
  }
}
