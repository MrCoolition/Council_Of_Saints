import {
  CalendarDays,
  Flame,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import { FormationConsole } from "@/components/formation-console";
import { formatPrayerItem } from "@/lib/domain";
import type { OfficeGuide } from "@/lib/demo-data";
import { getTodayPayload } from "@/server/today";

export const dynamic = "force-dynamic";

export default async function Home() {
  const today = await getTodayPayload();
  const displayDate = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${today.localDate}T12:00:00`));

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-4 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-stone-300 pb-5 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-[var(--accent)]">
              Sanctum Council
            </p>
            <h1 className="max-w-3xl text-4xl font-semibold leading-[1.05] text-stone-950 sm:text-5xl">
              {today.motto}
            </h1>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm sm:flex sm:items-center">
            <StatusPill
              Icon={CalendarDays}
              label={displayDate}
              tone="light"
            />
            <StatusPill Icon={Flame} label={today.liturgicalDay.color} />
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(22rem,0.9fr)]">
          <div className="grid gap-4 md:grid-cols-3">
            <Metric
              label="Today"
              value={today.liturgicalDay.title}
              detail={`${today.liturgicalDay.rank} | ${today.liturgicalDay.season}`}
            />
            <Metric
              label="Psalter"
              value={`Week ${today.liturgicalDay.psalterWeek}`}
              detail={today.breviary.currentVolume}
            />
            <Metric
              label="Book"
              value={today.breviary.currentVolume}
              detail={today.breviary.title}
            />
          </div>

          <figure className="relative min-h-64 overflow-hidden rounded-lg border border-stone-300 bg-stone-900">
            <Image
              alt="Closed prayer book and candle on a quiet desk"
              className="object-cover"
              fill
              priority
              src="/devotional-desk.png"
            />
            <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-stone-950/80 to-transparent p-4 text-sm font-medium text-amber-50">
              A quiet rule of prayer, anchored in the rhythm of the Church.
            </figcaption>
          </figure>
        </section>

        <FormationConsole
          defaultDifficultyLevel={today.prayerRule.difficultyLevel}
          defaultEnabledItems={today.prayerRule.enabledItems}
          initialHistory={today.habitHistory}
          initialLog={today.habitLog}
          initialSaveMode={today.mode === "database" ? "account" : "device"}
          localDate={today.localDate}
        />

        <section className="grid gap-4 lg:grid-cols-2">
          {today.officeGuides.map((guide) => (
            <OfficeGuidePanel guide={guide} key={guide.hourType} />
          ))}
        </section>
      </div>
    </main>
  );
}

function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="min-h-36 rounded-lg border border-stone-300 bg-[var(--panel)] p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase text-[var(--accent)]">
        {label}
      </p>
      <p className="mt-3 text-2xl font-semibold leading-tight text-stone-950">
        {value}
      </p>
      <p className="mt-3 text-sm text-stone-600">{detail}</p>
    </div>
  );
}

function StatusPill({
  Icon,
  label,
  tone = "dark",
}: {
  Icon: LucideIcon;
  label: string;
  tone?: "dark" | "light";
}) {
  return (
    <span
      className={[
        "inline-flex h-10 min-w-0 items-center justify-center gap-2 rounded-md border px-3 text-sm font-semibold",
        tone === "light"
          ? "border-stone-300 bg-white text-stone-800"
          : "border-emerald-900 bg-emerald-950 text-amber-50",
      ].join(" ")}
    >
      <Icon aria-hidden className="size-4 shrink-0" />
      <span className="truncate">{label}</span>
    </span>
  );
}

function OfficeGuidePanel({ guide }: { guide: OfficeGuide }) {
  return (
    <section className="rounded-lg border border-stone-300 bg-[var(--panel)] p-5 shadow-sm">
      <div className="flex flex-col gap-3 border-b border-stone-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[var(--accent)]">
            {formatPrayerItem(guide.hourType)}
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-stone-950">
            {guide.volume} | Psalter Week {guide.psalterWeek}
          </h2>
        </div>
      </div>

      <p className="mt-4 text-sm leading-6 text-stone-700">
        {guide.generalNote}
      </p>

      <ol className="mt-4 space-y-3">
        {guide.steps.map((step) => (
          <li
            className="grid gap-3 border-t border-stone-200 pt-3 sm:grid-cols-[3rem_1fr]"
            key={step.order}
          >
            <span className="flex size-10 items-center justify-center rounded-md bg-stone-900 font-mono text-sm text-amber-50">
              {step.order}
            </span>
            <div>
              <p className="text-sm font-semibold capitalize text-stone-950">
                {step.sectionType.replaceAll("_", " ")}
              </p>
              <p className="mt-1 text-sm leading-6 text-stone-700">
                {step.instruction}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
