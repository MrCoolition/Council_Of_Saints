import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BookOpen } from "lucide-react";
import { ScriptureReader } from "@/components/scripture-reader";
import {
  parseScripturePassage,
  parseScriptureReturnSource,
  type ScriptureReturnSource,
} from "@/lib/scripture";
import { loadScriptureBookData } from "@/server/scripture-passages";

export const metadata: Metadata = {
  title: "Sacred Scripture",
  description:
    "Read the complete Catholic canon in the local Original Douay-Rheims 1582–1610 edition.",
};

type ScripturePageSearchParams = {
  passage?: string | string[];
  from?: string | string[];
};

const returnLinks: Record<
  ScriptureReturnSource,
  { href: string; label: string }
> = {
  today: { href: "/", label: "Return to Today" },
  mass: { href: "/mass#rite-word", label: "Return to Holy Mass" },
  "mass-anticipated": {
    href: "/mass?form=anticipated#rite-word",
    label: "Return to Holy Mass",
  },
  "office-readings": {
    href: "/#office-office_readings",
    label: "Return to Office of Readings",
  },
  "office-morning": {
    href: "/#office-morning_prayer",
    label: "Return to Morning Prayer",
  },
  "office-midmorning": {
    href: "/#office-midmorning_prayer",
    label: "Return to Midmorning Prayer",
  },
  "office-midday": {
    href: "/#office-midday_prayer",
    label: "Return to Midday Prayer",
  },
  "office-midafternoon": {
    href: "/#office-midafternoon_prayer",
    label: "Return to Midafternoon Prayer",
  },
  "office-evening": {
    href: "/#office-evening_prayer",
    label: "Return to Evening Prayer",
  },
  "office-night": {
    href: "/#office-night_prayer",
    label: "Return to Night Prayer",
  },
};

export default async function ScripturePage({
  searchParams,
}: {
  searchParams: Promise<ScripturePageSearchParams>;
}) {
  const query = await searchParams;
  const initialPassage = parseScripturePassage(query.passage);
  const initialBookData = initialPassage
    ? await loadScriptureBookData(initialPassage.bookId)
    : null;
  const returnSource = parseScriptureReturnSource(query.from);
  const returnLink = returnSource
    ? returnLinks[returnSource]
    : { href: "/", label: "Today" };

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-hairline pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-[var(--accent)]">
              Sanctum Council
            </p>
          </div>

          <Link
            className="inline-flex h-10 w-fit items-center gap-2 rounded-md border border-hairline bg-vellum px-3 text-sm font-semibold text-foreground transition hover:border-ecclesial-green hover:text-ecclesial-green focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gilt focus-visible:ring-offset-2"
            href={returnLink.href}
          >
            <ArrowLeft aria-hidden className="size-4" />
            {returnLink.label}
          </Link>
        </header>

        <section className="overflow-hidden rounded-lg border border-sanctuary-night bg-sanctuary-night text-vellum shadow-sm">
          <div className="p-6 sm:p-8">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 text-[var(--gilt-light)]">
                <BookOpen aria-hidden className="size-5" />
                <p className="text-sm font-semibold uppercase tracking-wide">
                  Sacred Scripture
                </p>
              </div>
              <h1 className="mt-4 text-4xl font-semibold leading-[1.05] sm:text-5xl">
                Sacred Scripture
              </h1>
            </div>
          </div>
        </section>

        <ScriptureReader
          initialBookData={initialBookData}
          initialPassage={initialPassage}
          returnSource={returnSource}
        />

      </div>
    </main>
  );
}
