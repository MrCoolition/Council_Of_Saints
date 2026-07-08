"use client";

import {
  Check,
  CircleSlash2,
  Clock3,
  Loader2,
  MinusCircle,
  Moon,
  Sun,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import {
  formatPrayerItem,
  type HabitStatus,
  type PrayerItemType,
} from "@/lib/domain";

type SyncState = "idle" | "saving" | "synced" | "local";

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

export function HabitConsole({
  localDate,
  enabledItems,
  initialLog,
}: HabitConsoleProps) {
  const [habits, setHabits] =
    useState<Partial<Record<PrayerItemType, HabitStatus>>>(initialLog);
  const [syncState, setSyncState] = useState<SyncState>("idle");

  async function setHabit(itemType: PrayerItemType, status: HabitStatus) {
    setHabits((current) => ({ ...current, [itemType]: status }));
    setSyncState("saving");

    try {
      const response = await fetch("/api/habit-log", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ itemType, status, localDate }),
      });

      setSyncState(response.ok ? "synced" : "local");
    } catch {
      setSyncState("local");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex min-h-8 items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-stone-950">
          Prayer rule
        </h2>
        <SyncIndicator state={syncState} />
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

function SyncIndicator({ state }: { state: SyncState }) {
  if (state === "saving") {
    return (
      <span className="inline-flex h-8 items-center gap-2 rounded-md border border-stone-300 px-2 text-xs font-medium text-stone-700">
        <Loader2 aria-hidden className="size-3.5 animate-spin" />
        Saving
      </span>
    );
  }

  if (state === "synced") {
    return (
      <span className="inline-flex h-8 items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-2 text-xs font-medium text-emerald-900">
        <Check aria-hidden className="size-3.5" />
        Synced
      </span>
    );
  }

  if (state === "local") {
    return (
      <span className="inline-flex h-8 items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-2 text-xs font-medium text-amber-900">
        <MinusCircle aria-hidden className="size-3.5" />
        Local
      </span>
    );
  }

  return (
    <span className="inline-flex h-8 items-center rounded-md border border-stone-200 px-2 text-xs font-medium text-stone-600">
      Ready
    </span>
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
