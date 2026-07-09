"use client";

import {
  BookOpen,
  Check,
  CircleSlash2,
  Clock3,
  Flame,
  MinusCircle,
  Moon,
  ShieldCheck,
  Sun,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  formatPrayerItem,
  type HabitStatus,
  type PrayerItemType,
} from "@/lib/domain";

type FormationConsoleProps = {
  localDate: string;
  defaultEnabledItems: PrayerItemType[];
  defaultDifficultyLevel: number;
  initialLog: Partial<Record<PrayerItemType, HabitStatus>>;
  initialHistory: Record<string, Partial<Record<PrayerItemType, HabitStatus>>>;
  initialSaveMode: SaveMode;
};

type RuleState = {
  enabledItems: PrayerItemType[];
  difficultyLevel: number;
};

type Counsel = {
  saintName: string;
  message: string;
  actionItem: string;
  virtueFocus: string;
  sacrifice: string;
};

type WeeklySummary = {
  completed: number;
  partial: number;
  missed: number;
  deferred: number;
  total: number;
};

type SaveMode = "account" | "device";

const ruleStorageKey = "sanctum-council:rule:v1";
const habitStoragePrefix = "sanctum-council:habit-log";

const selectableItems: Array<{
  value: PrayerItemType;
  label: string;
  detail: string;
  Icon: LucideIcon;
}> = [
  {
    value: "morning_prayer",
    label: "Morning Prayer",
    detail: "First anchor",
    Icon: Sun,
  },
  {
    value: "night_prayer",
    label: "Night Prayer",
    detail: "Closing anchor",
    Icon: Moon,
  },
  { value: "rosary", label: "Rosary", detail: "Marian devotion", Icon: Flame },
  { value: "mass", label: "Mass", detail: "Sacramental center", Icon: Flame },
  {
    value: "mental_prayer",
    label: "Mental Prayer",
    detail: "Silent interior prayer",
    Icon: ShieldCheck,
  },
  {
    value: "spiritual_reading",
    label: "Spiritual Reading",
    detail: "Formation reading",
    Icon: BookOpen,
  },
  { value: "study", label: "Study", detail: "Doctrine and truth", Icon: BookOpen },
  { value: "service", label: "Service", detail: "Charity in action", Icon: Check },
  { value: "sacrifice", label: "Sacrifice", detail: "Hidden offering", Icon: Flame },
];

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

export function FormationConsole({
  localDate,
  defaultEnabledItems,
  defaultDifficultyLevel,
  initialLog,
  initialHistory,
  initialSaveMode,
}: FormationConsoleProps) {
  const [rule, setRule] = useState<RuleState>({
    enabledItems: defaultEnabledItems,
    difficultyLevel: defaultDifficultyLevel,
  });
  const [habits, setHabits] =
    useState<Partial<Record<PrayerItemType, HabitStatus>>>(initialLog);
  const [activeTab, setActiveTab] = useState<"today" | "rule" | "week">(
    "today",
  );
  const [saveMode, setSaveMode] = useState<SaveMode>(initialSaveMode);

  const habitStorageKey = useMemo(
    () => getHabitStorageKey(localDate),
    [localDate],
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const storedRule = readStoredRule(
        defaultEnabledItems,
        defaultDifficultyLevel,
      );
      const storedHabits = readStoredHabits(
        habitStorageKey,
        storedRule.enabledItems,
      );

      setRule(storedRule);

      if (Object.keys(storedHabits).length > 0) {
        setHabits((current) => ({ ...current, ...storedHabits }));
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [defaultDifficultyLevel, defaultEnabledItems, habitStorageKey]);

  const visibleHabits = useMemo(() => {
    return Object.fromEntries(
      Object.entries(habits).filter(([itemType]) =>
        rule.enabledItems.includes(itemType as PrayerItemType),
      ),
    ) as Partial<Record<PrayerItemType, HabitStatus>>;
  }, [habits, rule.enabledItems]);

  const todayStats = useMemo(() => {
    const done = rule.enabledItems.filter(
      (itemType) => visibleHabits[itemType] === "done",
    ).length;
    const partial = rule.enabledItems.filter(
      (itemType) => visibleHabits[itemType] === "partial",
    ).length;
    const missed = rule.enabledItems.filter(
      (itemType) => visibleHabits[itemType] === "missed",
    ).length;

    return {
      done,
      partial,
      missed,
      open: rule.enabledItems.length - done - partial - missed,
      total: rule.enabledItems.length,
    };
  }, [rule.enabledItems, visibleHabits]);

  const weeklySummary = useMemo(
    () =>
      getWeeklySummary(
        localDate,
        rule.enabledItems,
        visibleHabits,
        initialHistory,
      ),
    [initialHistory, localDate, rule.enabledItems, visibleHabits],
  );

  const counsel = useMemo(
    () => getCounsel(rule.enabledItems, visibleHabits, weeklySummary),
    [rule.enabledItems, visibleHabits, weeklySummary],
  );

  function persistRule(nextRule: RuleState) {
    setRule(nextRule);
    writeStorage(ruleStorageKey, nextRule);
    void saveRule(nextRule);
  }

  function toggleRuleItem(itemType: PrayerItemType) {
    const isEnabled = rule.enabledItems.includes(itemType);
    const nextEnabledItems = isEnabled
      ? rule.enabledItems.filter((item) => item !== itemType)
      : [...rule.enabledItems, itemType];

    persistRule({
      ...rule,
      enabledItems:
        nextEnabledItems.length > 0 ? nextEnabledItems : ["morning_prayer"],
    });
  }

  function updateDifficulty(value: number) {
    persistRule({
      ...rule,
      difficultyLevel: value,
    });
  }

  async function setHabit(itemType: PrayerItemType, status: HabitStatus) {
    const nextHabits = { ...habits, [itemType]: status };

    setHabits(nextHabits);
    writeStorage(habitStorageKey, nextHabits);

    try {
      const response = await fetch("/api/habit-log", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ itemType, status, localDate }),
      });
      const result = (await response.json()) as { mode?: string };
      setSaveMode(result.mode === "account" ? "account" : "device");
    } catch {
      setSaveMode("device");
    }
  }

  async function saveRule(nextRule: RuleState) {
    try {
      const response = await fetch("/api/prayer-rule", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(nextRule),
      });
      const result = (await response.json()) as { mode?: string };
      setSaveMode(result.mode === "account" ? "account" : "device");
    } catch {
      setSaveMode("device");
    }
  }

  return (
    <section className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
      <div className="rounded-lg border border-stone-300 bg-[var(--panel)] p-5 shadow-sm">
        <div className="flex flex-col gap-4 border-b border-stone-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-[var(--accent)]">
              Rule of life
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-stone-950">
              {todayStats.done} of {todayStats.total} anchors kept
            </h2>
            <p className="mt-2 text-xs font-semibold uppercase text-stone-500">
              {saveMode === "account" ? "Account saved" : "Device saved"}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <DailyStat label="Open" value={todayStats.open} />
            <DailyStat label="Partial" value={todayStats.partial} />
            <DailyStat label="Missed" value={todayStats.missed} />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <TabButton
            active={activeTab === "today"}
            label="Today"
            onClick={() => setActiveTab("today")}
          />
          <TabButton
            active={activeTab === "rule"}
            label="Rule"
            onClick={() => setActiveTab("rule")}
          />
          <TabButton
            active={activeTab === "week"}
            label="Week"
            onClick={() => setActiveTab("week")}
          />
        </div>

        <div className="mt-5">
          {activeTab === "today" ? (
            <TodayRule
              enabledItems={rule.enabledItems}
              habits={visibleHabits}
              onSetHabit={setHabit}
            />
          ) : null}

          {activeTab === "rule" ? (
            <RuleBuilder
              difficultyLevel={rule.difficultyLevel}
              enabledItems={rule.enabledItems}
              onDifficultyChange={updateDifficulty}
              onToggleItem={toggleRuleItem}
            />
          ) : null}

          {activeTab === "week" ? (
            <WeeklyExamen
              enabledCount={rule.enabledItems.length}
              summary={weeklySummary}
            />
          ) : null}
        </div>
      </div>

      <CouncilPanel counsel={counsel} />
    </section>
  );
}

function TodayRule({
  enabledItems,
  habits,
  onSetHabit,
}: {
  enabledItems: PrayerItemType[];
  habits: Partial<Record<PrayerItemType, HabitStatus>>;
  onSetHabit: (itemType: PrayerItemType, status: HabitStatus) => void;
}) {
  return (
    <div className="divide-y divide-stone-200 border-y border-stone-200">
      {enabledItems.map((itemType) => {
        const currentStatus = habits[itemType];
        const item = getSelectableItem(itemType);
        const ItemIcon = item.Icon;

        return (
          <div className="grid gap-3 py-4" key={itemType}>
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
                    onClick={() => onSetHabit(itemType, value)}
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
  );
}

function RuleBuilder({
  difficultyLevel,
  enabledItems,
  onDifficultyChange,
  onToggleItem,
}: {
  difficultyLevel: number;
  enabledItems: PrayerItemType[];
  onDifficultyChange: (value: number) => void;
  onToggleItem: (itemType: PrayerItemType) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-stone-950">
            Commitments
          </h3>
          <span className="text-xs font-semibold text-stone-500">
            {enabledItems.length} active
          </span>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {selectableItems.map(({ value, label, detail, Icon }) => {
            const selected = enabledItems.includes(value);

            return (
              <button
                aria-pressed={selected}
                className={[
                  "grid min-h-16 grid-cols-[2.25rem_1fr] items-center gap-3 rounded-md border px-3 text-left transition",
                  selected
                    ? "border-emerald-950 bg-emerald-950 text-amber-50"
                    : "border-stone-300 bg-white text-stone-800 hover:border-emerald-900",
                ].join(" ")}
                key={value}
                onClick={() => onToggleItem(value)}
                type="button"
              >
                <span
                  className={[
                    "flex size-9 items-center justify-center rounded-md",
                    selected
                      ? "bg-amber-100 text-emerald-950"
                      : "bg-stone-900 text-amber-50",
                  ].join(" ")}
                >
                  <Icon aria-hidden className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">
                    {label}
                  </span>
                  <span
                    className={[
                      "block truncate text-xs",
                      selected ? "text-amber-100" : "text-stone-500",
                    ].join(" ")}
                  >
                    {detail}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="border-t border-stone-200 pt-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-stone-950">Intensity</h3>
          <span className="text-xs font-semibold text-stone-500">
            Level {difficultyLevel}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {[1, 2, 3].map((value) => (
            <button
              aria-pressed={difficultyLevel === value}
              className={[
                "h-10 rounded-md border text-sm font-semibold transition",
                difficultyLevel === value
                  ? "border-emerald-950 bg-emerald-950 text-amber-50"
                  : "border-stone-300 bg-white text-stone-800 hover:border-emerald-900",
              ].join(" ")}
              key={value}
              onClick={() => onDifficultyChange(value)}
              type="button"
            >
              {getDifficultyLabel(value)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function WeeklyExamen({
  enabledCount,
  summary,
}: {
  enabledCount: number;
  summary: WeeklySummary;
}) {
  const possible = enabledCount * 7;
  const keptRate = possible > 0 ? Math.round((summary.completed / possible) * 100) : 0;
  const nextStep = getWeeklyNextStep(summary);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <WeeklyStat label="Kept" value={summary.completed} />
        <WeeklyStat label="Partial" value={summary.partial} />
        <WeeklyStat label="Missed" value={summary.missed} />
        <WeeklyStat label="Deferred" value={summary.deferred} />
      </div>

      <div className="rounded-lg border border-stone-300 bg-white p-4">
        <p className="text-xs font-semibold uppercase text-[var(--accent)]">
          Weekly examen
        </p>
        <p className="mt-3 text-3xl font-semibold text-stone-950">
          {keptRate}%
        </p>
        <p className="mt-2 text-sm leading-6 text-stone-700">{nextStep}</p>
      </div>
    </div>
  );
}

function CouncilPanel({ counsel }: { counsel: Counsel }) {
  return (
    <section className="rounded-lg border border-emerald-950 bg-emerald-950 p-5 text-amber-50 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-amber-200">
            Council prompt
          </p>
          <h2 className="mt-2 text-2xl font-semibold">{counsel.saintName}</h2>
        </div>
        <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-md bg-amber-100 text-emerald-950">
          <ShieldCheck aria-hidden className="size-5" />
        </span>
      </div>

      <p className="mt-5 text-lg leading-8 text-amber-50">{counsel.message}</p>

      <div className="mt-5 grid gap-3 border-y border-emerald-800 py-4 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-emerald-800">
        <PromptStat label="Action" value={counsel.actionItem} />
        <PromptStat label="Virtue" value={counsel.virtueFocus} />
        <PromptStat label="Sacrifice" value={counsel.sacrifice} />
      </div>

      <p className="mt-5 text-sm leading-6 text-amber-100">
        Formation prompts inspired by the lives and charisms of the saints.
      </p>
    </section>
  );
}

function DailyStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-16 rounded-md border border-stone-200 bg-white px-3 py-2">
      <p className="text-lg font-semibold leading-none text-stone-950">{value}</p>
      <p className="mt-1 text-xs font-medium text-stone-500">{label}</p>
    </div>
  );
}

function WeeklyStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-stone-300 bg-white p-3">
      <p className="text-2xl font-semibold leading-none text-stone-950">{value}</p>
      <p className="mt-2 text-xs font-medium text-stone-500">{label}</p>
    </div>
  );
}

function TabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-pressed={active}
      className={[
        "h-10 rounded-md border text-sm font-semibold transition",
        active
          ? "border-emerald-950 bg-emerald-950 text-amber-50"
          : "border-stone-300 bg-white text-stone-800 hover:border-emerald-900",
      ].join(" ")}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function PromptStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-h-24 px-0 sm:px-4">
      <p className="text-xs font-semibold uppercase text-amber-200">{label}</p>
      <p className="mt-2 text-sm leading-6 text-amber-50">{value}</p>
    </div>
  );
}

function getHabitStorageKey(localDate: string) {
  return `${habitStoragePrefix}:${localDate}`;
}

function readStoredRule(
  defaultEnabledItems: PrayerItemType[],
  defaultDifficultyLevel: number,
): RuleState {
  const fallback = {
    enabledItems: defaultEnabledItems,
    difficultyLevel: defaultDifficultyLevel,
  };

  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const rawValue = window.localStorage.getItem(ruleStorageKey);

    if (!rawValue) {
      return fallback;
    }

    const parsed = JSON.parse(rawValue) as Partial<RuleState>;
    const enabledItems = Array.isArray(parsed.enabledItems)
      ? parsed.enabledItems.filter(isSelectablePrayerItem)
      : fallback.enabledItems;
    const difficultyLevel =
      typeof parsed.difficultyLevel === "number" &&
      parsed.difficultyLevel >= 1 &&
      parsed.difficultyLevel <= 3
        ? parsed.difficultyLevel
        : fallback.difficultyLevel;

    return {
      enabledItems:
        enabledItems.length > 0 ? enabledItems : fallback.enabledItems,
      difficultyLevel,
    };
  } catch {
    return fallback;
  }
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

function writeStorage(key: string, value: unknown) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    return;
  }
}

function getWeeklySummary(
  localDate: string,
  enabledItems: PrayerItemType[],
  todayHabits: Partial<Record<PrayerItemType, HabitStatus>>,
  initialHistory: Record<string, Partial<Record<PrayerItemType, HabitStatus>>>,
): WeeklySummary {
  const summary: WeeklySummary = {
    completed: 0,
    partial: 0,
    missed: 0,
    deferred: 0,
    total: 0,
  };

  for (let offset = 0; offset < 7; offset += 1) {
    const date = shiftIsoDate(localDate, -offset);
    const serverLog = initialHistory[date] ?? {};
    const storedLog = readStoredHabits(getHabitStorageKey(date), enabledItems);
    const log =
      offset === 0
        ? todayHabits
        : {
            ...serverLog,
            ...storedLog,
          };

    for (const itemType of enabledItems) {
      const status = log[itemType];

      if (!status) {
        continue;
      }

      summary.total += 1;

      if (status === "done") {
        summary.completed += 1;
      } else if (status === "partial") {
        summary.partial += 1;
      } else if (status === "missed") {
        summary.missed += 1;
      } else if (status === "deferred") {
        summary.deferred += 1;
      }
    }
  }

  return summary;
}

function shiftIsoDate(localDate: string, offsetDays: number) {
  const date = new Date(`${localDate}T12:00:00`);
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

function getCounsel(
  enabledItems: PrayerItemType[],
  habits: Partial<Record<PrayerItemType, HabitStatus>>,
  weeklySummary: WeeklySummary,
): Counsel {
  const hasMissed = enabledItems.some((itemType) => habits[itemType] === "missed");
  const hasPartial = enabledItems.some(
    (itemType) => habits[itemType] === "partial" || habits[itemType] === "deferred",
  );
  const allDone =
    enabledItems.length > 0 &&
    enabledItems.every((itemType) => habits[itemType] === "done");
  const openCount = enabledItems.filter((itemType) => !habits[itemType]).length;
  const needsStudy =
    enabledItems.includes("study") &&
    habits.study !== "done" &&
    habits.study !== "partial";

  if (allDone) {
    return {
      saintName: "Blessed Virgin Mary",
      message:
        "Receive the kept rule with humility. Let gratitude guard the grace instead of turning success into self-measurement.",
      actionItem: "Make one quiet act of thanksgiving before the next task.",
      virtueFocus: "Humility",
      sacrifice: "Leave the victory unannounced.",
    };
  }

  if (hasMissed) {
    return {
      saintName: "St. Benedict",
      message:
        "Begin again with stability. Do not argue with the missed hour; return to the next faithful act in front of you.",
      actionItem: "Choose the smallest open anchor and keep it today.",
      virtueFocus: "Stability",
      sacrifice: "Let one needless comfort go unanswered.",
    };
  }

  if (needsStudy) {
    return {
      saintName: "St. Thomas Aquinas",
      message:
        "Order the mind toward truth with a small, honest block of attention. Light grows by faithful study, not by grand intention.",
      actionItem: "Give fifteen undistracted minutes to study.",
      virtueFocus: "Studiousness",
      sacrifice: "Close one distraction before beginning.",
    };
  }

  if (hasPartial || weeklySummary.deferred > weeklySummary.completed) {
    return {
      saintName: "St. Francis de Sales",
      message:
        "Do not make gentleness small. A partial return can still be a real return when it is offered without self-reproach.",
      actionItem: "Finish one deferred anchor gently and plainly.",
      virtueFocus: "Gentleness",
      sacrifice: "Refuse harsh speech toward yourself.",
    };
  }

  if (openCount > 0) {
    return {
      saintName: "St. Joseph",
      message:
        "Guard the next quiet duty. The rule becomes real when attention is protected before the day scatters it.",
      actionItem: "Keep the next open anchor before entertainment.",
      virtueFocus: "Custody of heart",
      sacrifice: "Put the phone away for one focused block.",
    };
  }

  return {
    saintName: "St. Ignatius of Loyola",
    message:
      "Name the movement of the day plainly. Consolation and desolation are not verdicts; they are material for discernment.",
    actionItem: "Name one grace and one attachment tonight.",
    virtueFocus: "Discernment",
    sacrifice: "Pause before the next impulse to explain yourself.",
  };
}

function getWeeklyNextStep(summary: WeeklySummary) {
  if (summary.total === 0) {
    return "Begin with one anchor and let the week take shape from a faithful first act.";
  }

  if (summary.missed > summary.completed) {
    return "Simplify the rule for tomorrow. Protect one anchor until stability returns.";
  }

  if (summary.deferred > 0 || summary.partial > 0) {
    return "Keep the same rule, but move the hardest anchor earlier in the day.";
  }

  return "The rule is becoming steady. Add nothing today; deepen the offering.";
}

function getDifficultyLabel(value: number) {
  switch (value) {
    case 1:
      return "Simple";
    case 2:
      return "Steady";
    case 3:
      return "Strong";
    default:
      return "Simple";
  }
}

function getSelectableItem(itemType: PrayerItemType) {
  return (
    selectableItems.find((item) => item.value === itemType) ?? {
      value: itemType,
      label: formatPrayerItem(itemType),
      detail: "Daily anchor",
      Icon: Check,
    }
  );
}

function isSelectablePrayerItem(value: unknown): value is PrayerItemType {
  return (
    typeof value === "string" &&
    selectableItems.some((item) => item.value === value)
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
