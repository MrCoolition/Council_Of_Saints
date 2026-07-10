import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BookOpen, LibraryBig, ScrollText } from "lucide-react";
import { ScriptureReader } from "@/components/scripture-reader";
import {
  NEW_TESTAMENT_BOOKS,
  OLD_TESTAMENT_BOOKS,
  parseScripturePassage,
  parseScriptureReturnSource,
  SCRIPTURE_BOOKS,
  type ScriptureReturnSource,
} from "@/lib/scripture";

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
  today: { href: "/#daily-scripture", label: "Return to Today’s passage" },
  "office-morning": {
    href: "/#office-morning_prayer",
    label: "Return to Morning Prayer",
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
  const returnSource = parseScriptureReturnSource(query.from);
  const returnLink = returnSource
    ? returnLinks[returnSource]
    : { href: "/", label: "Today" };

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-stone-300 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-[var(--accent)]">
              Sanctum Council
            </p>
            <p className="mt-1 text-sm text-stone-600">
              The Word, ready for prayer and study.
            </p>
          </div>

          <Link
            className="inline-flex h-10 w-fit items-center gap-2 rounded-md border border-stone-300 bg-white px-3 text-sm font-semibold text-stone-800 transition hover:border-emerald-900 hover:text-emerald-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
            href={returnLink.href}
          >
            <ArrowLeft aria-hidden className="size-4" />
            {returnLink.label}
          </Link>
        </header>

        <section className="overflow-hidden rounded-lg border border-emerald-950 bg-emerald-950 text-amber-50 shadow-sm">
          <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 text-amber-200">
                <BookOpen aria-hidden className="size-5" />
                <p className="text-sm font-semibold uppercase tracking-wide">
                  Sacred Scripture
                </p>
              </div>
              <h1 className="mt-4 text-4xl font-semibold leading-[1.05] sm:text-5xl">
                The whole Catholic canon, close at hand.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-amber-100 sm:text-lg sm:leading-8">
                Browse every book, open a reference directly, and return to the
                chapter where prayer or study left off. The text stays local and
                remains available without an account.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <CanonMetric
                label="Canon"
                value={`${SCRIPTURE_BOOKS.length} books`}
              />
              <CanonMetric
                label="Old"
                value={`${OLD_TESTAMENT_BOOKS.length} books`}
              />
              <CanonMetric
                label="New"
                value={`${NEW_TESTAMENT_BOOKS.length} books`}
              />
            </div>
          </div>

          <div className="grid border-t border-emerald-800 sm:grid-cols-3 sm:divide-x sm:divide-emerald-800">
            <FeatureNote
              Icon={LibraryBig}
              detail="Modern catalog names with Original Douay-Rheims book titles preserved."
              title="Catholic canon"
            />
            <FeatureNote
              Icon={ScrollText}
              detail="Open John 3:16—or any available chapter—without leaving the reader."
              title="Reference ready"
            />
            <FeatureNote
              Icon={BookOpen}
              detail="Resume, bookmarks, and reading size are saved on this device."
              title="Built for prayer"
            />
          </div>
        </section>

        <ScriptureReader
          initialPassage={initialPassage}
          returnSource={returnSource}
        />

        <footer className="flex flex-col gap-2 border-t border-stone-300 py-5 text-xs leading-5 text-stone-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            Original Douay-Rheims (1582–1610), imported locally under CC0 1.0.
          </p>
          <div className="flex items-center gap-4">
            <a
              className="font-semibold text-[var(--accent)] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              href="/data/douay-rheims/SOURCE.md"
            >
              Source notes
            </a>
            <a
              className="font-semibold text-[var(--accent)] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              href="/data/douay-rheims/LICENSE.txt"
            >
              CC0 license
            </a>
          </div>
        </footer>
      </div>
    </main>
  );
}

function CanonMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md border border-emerald-700 bg-emerald-900 px-3 py-3 text-center sm:min-w-24">
      <p className="truncate font-mono text-sm font-semibold text-amber-50 sm:text-base">
        {value}
      </p>
      <p className="mt-1 text-xs font-medium text-amber-200">{label}</p>
    </div>
  );
}

function FeatureNote({
  Icon,
  detail,
  title,
}: {
  Icon: typeof BookOpen;
  detail: string;
  title: string;
}) {
  return (
    <div className="flex gap-3 border-t border-emerald-800 px-6 py-4 first:border-t-0 sm:border-t-0">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-amber-100 text-emerald-950">
        <Icon aria-hidden className="size-4" />
      </span>
      <div>
        <p className="text-sm font-semibold text-amber-50">{title}</p>
        <p className="mt-1 text-xs leading-5 text-amber-100">{detail}</p>
      </div>
    </div>
  );
}
