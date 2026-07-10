import {
  CalendarDays,
  Flame,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import { FormationConsole } from "@/components/formation-console";
import { OfficeGuidePanels } from "@/components/office-guide-panels";
import type { TodayPayload } from "@/lib/demo-data";
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

        <PrayerMagnet today={today} />

        <FormationConsole
          defaultDifficultyLevel={today.prayerRule.difficultyLevel}
          defaultEnabledItems={today.prayerRule.enabledItems}
          initialHistory={today.habitHistory}
          initialLog={today.habitLog}
          initialSaveMode={today.mode === "database" ? "account" : "device"}
          localDate={today.localDate}
        />

        <OfficeGuidePanels
          guides={today.officeGuides}
          localDate={today.localDate}
        />
      </div>
    </main>
  );
}

function PrayerMagnet({ today }: { today: TodayPayload }) {
  const morningGuide = today.officeGuides.find(
    (guide) => guide.hourType === "morning_prayer",
  );
  const nightGuide = today.officeGuides.find(
    (guide) => guide.hourType === "night_prayer",
  );
  const primaryAnchor = morningGuide?.scriptureAnchors[0];
  const nightAnchor = nightGuide?.scriptureAnchors[0];

  return (
    <section className="rounded-lg border border-emerald-950 bg-emerald-950 p-5 text-amber-50 shadow-sm">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-center">
        <div>
          <p className="text-sm font-semibold uppercase text-amber-200">
            Divine intervention
          </p>
          <h2 className="mt-2 max-w-2xl text-3xl font-semibold leading-tight">
            Open the book. Let Scripture pull first.
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-amber-100">
            {primaryAnchor?.reflection ??
              "Begin with the appointed psalmody and let the hour give your soul its first words."}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <MagnetStep
            label="Book"
            value={`${today.breviary.currentVolume}, Week ${today.liturgicalDay.psalterWeek}`}
          />
          <MagnetStep
            label="Morning word"
            value={primaryAnchor?.citation ?? "Psalter"}
          />
          <MagnetStep
            label="Night guard"
            value={nightAnchor?.citation ?? "Night Prayer"}
          />
        </div>
      </div>

      {primaryAnchor?.text ? (
        <p className="mt-5 border-t border-emerald-800 pt-4 text-lg font-medium leading-8 text-amber-50">
          &quot;{primaryAnchor.text}&quot;
        </p>
      ) : null}
    </section>
  );
}

function MagnetStep({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-l border-emerald-800 pl-3">
      <p className="text-xs font-semibold uppercase text-amber-200">{label}</p>
      <p className="mt-2 text-sm font-semibold leading-6 text-amber-50">
        {value}
      </p>
    </div>
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
