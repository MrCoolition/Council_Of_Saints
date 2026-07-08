"use client";

import {
  Check,
  CircleSlash2,
  Clock3,
  MinusCircle,
  Moon,
  Sun,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  formatPrayerItem,
  type HabitStatus,
  type PrayerItemType,
} from "@/lib/domain";

type SyncState = "idle" | "saving" | "saved";

type HabitConsoleProps = {
  localDate: string;
  enabledItems: PrayerItemType[];
  initialLog: Partial<Record<PrayerItemType, HabitStatus>>;
};

const statusOptions: Array<{
  value: HabitStatus;
  label: string;
  Icon: LucideIcon;
}> = [
  { value: "done", label: "Done", Icon: Check },
  { value: "partial", label: "Partial", Icon: Clock3 },
  { value: "missed", label: "Missed", Icon: CircleSlash2 },
  { value: "deferred", label: "Deferred", Icon: MinusCircle },
];

const habitStatuses = new Set<HabitStatus>([
  "done",
  "partial",
  "missed",
  "impeded",
  "deferred",
]);

const storagePrefix = "sanctum-council:habit-log";

function getStorageKey(localDate: string) {
  return `${storagePrefix}:${localDate}`;
}

function readStoredHabits(
  storageKey: string,
  enabledItems: PrayerItemType[],
): Partial<Record<PrayerItemType, HabitStatus>> {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const rawValue = window.localStorage.getItem(storageKey);

    if (!rawValue) {
      return {};
    }

    const parsed = JSON.parse(rawValue) as Record<string, unknown>;
    const entries = Object.entries(parsed).filter(([itemType, status]) => {
      return (
        enabledItems.includes(itemType as PrayerItemType) &&
        habitStatuses.has(status as HabitStatus)
      );
    });

    return Object.fromEntries(entries) as Partial<
      Record<PrayerItemType, HabitStatus>
    >;
  } catch {
    return {};
  }
}

function persistHabits(
  storageKey: string,
  habits: Partial<Record<PrayerItemType, HabitStatus>>,
) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(habits));
  } catch {
    // The selected state still updates even when browser storage is unavailable.
  }
}

export function HabitConsole({
  localDate,
  enabledItems,
  initialLog,
}: HabitConsoleProps) {
  const storageKey = useMemo(() => getStorageKey(localDate), [localDate]);
  const [habits, setHabits] =
    useState<Partial<Record<PrayerItemType, HabitStatus>>>(initialLog);
  const [syncState, setSyncState] = useState<SyncState>("idle");

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const storedHabits = readStoredHabits(storageKey, enabledItems);

      if (Object.keys(storedHabits).length === 0) {
        return;
      }

      setHabits((current) => ({ ...current, ...storedHabits }));
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [enabledItems, storageKey]);

  async function setHabit(itemType: PrayerItemType, status: HabitStatus) {
    setHabits((current) => {
      const next = { ...current, [itemType]: status };
      persistHabits(storageKey, next);
      return next;
    });
    setSyncState("saving");

    try {
      await fetch("/api/habit-log", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ itemType, status, localDate }),
      });

      setSyncState("saved");
    } catch {
      setSyncState("saved");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex min-h-8 items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-stone-950">
          Prayer rule
        </h2>
        <span aria-live="polite" className="sr-only">
          {getSyncMessage(syncState)}
        </span>
      </div>

      <div className="divide-y divide-stone-200 border-y border-stone-200">
        {enabledItems.map((itemType) => {
          const currentStatus = habits[itemType];
          const ItemIcon = itemType === "night_prayer" ? Moon : Sun;

          return (
            <div
              className="grid gap-3 py-4"
              key={itemType}
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-emerald-950 text-amber-100">
                  <ItemIcon aria-hidden className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-stone-950">
                    {formatPrayerItem(itemType)}
                  </p>
                  <p className="text-xs text-stone-600">
                    {currentStatus ? formatStatus(currentStatus) : "Open"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {statusOptions.map(({ value, label, Icon }) => {
                  const selected = currentStatus === value;

                  return (
                    <button
                      aria-pressed={selected}
                      className={[
                        "inline-flex h-10 min-w-0 items-center justify-center gap-2 rounded-md border px-2 text-sm font-medium transition",
                        selected
                          ? "border-emerald-950 bg-emerald-950 text-amber-50"
                          : "border-stone-300 bg-white text-stone-800 hover:border-emerald-900 hover:text-emerald-950",
                      ].join(" ")}
                      key={value}
                      onClick={() => setHabit(itemType, value)}
                      title={`${label} ${formatPrayerItem(itemType)}`}
                      type="button"
                    >
                      <Icon aria-hidden className="size-4 shrink-0" />
                      <span className="truncate">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatStatus(status: HabitStatus) {
  switch (status) {
    case "done":
      return "Completed";
    case "partial":
      return "Partially completed";
    case "missed":
      return "Missed";
    case "impeded":
      return "Impeded";
    case "deferred":
      return "Deferred";
  }
}

function getSyncMessage(state: SyncState) {
  switch (state) {
    case "saving":
      return "Saving prayer status.";
    case "saved":
      return "Prayer status saved.";
    case "idle":
      return "";
  }
}
