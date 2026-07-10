import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  CircleDot,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { RosaryGuide } from "@/components/rosary-guide";

export const metadata: Metadata = {
  title: "Guided Rosary",
  description:
    "Pray all four sets of Rosary mysteries with Scripture anchors, traditional fruits, and a bead-by-bead guide.",
};

export default function RosaryPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#fff7df_0%,#f6f4ee_42%,#eee7da_100%)] text-[var(--foreground)]">
      <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
        <nav aria-label="Breadcrumb">
          <Link
            className="inline-flex min-h-10 items-center gap-2 rounded-md border border-stone-300 bg-white/80 px-3 text-sm font-semibold text-stone-700 transition hover:border-[#12372c] hover:text-[#12372c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b9852b]"
            href="/"
          >
            <ArrowLeft aria-hidden className="size-4" />
            Return to Sanctum Council
          </Link>
        </nav>

        <header className="mt-5 overflow-hidden rounded-xl border border-[#12372c] bg-[#12372c] text-[#fff4d6] shadow-sm">
          <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.65fr)] lg:items-end lg:p-10">
            <div>
              <div className="flex items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-full border border-[#d8b66c]/60 bg-[#1b493a] text-xl text-[#f0d38b]">
                  <span aria-hidden>✠</span>
                </span>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#e7c978]">
                  The Most Holy Rosary
                </p>
              </div>
              <h1 className="mt-6 max-w-4xl font-serif text-4xl font-semibold leading-[1.05] text-[#fff8e7] sm:text-5xl lg:text-6xl">
                Contemplate the face of Christ with Mary.
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-7 text-[#e5dbc0] sm:text-lg sm:leading-8">
                Choose any mystery set, enter the scene through Scripture, and
                move prayer by prayer through all five decades. Your exact place
                is kept on this device so you can return without hurry.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <HeroNote
                Icon={BookOpen}
                label="Scripture-rooted"
                value="Every mystery carries a canonical anchor."
              />
              <HeroNote
                Icon={CircleDot}
                label="Bead by bead"
                value="Counters guide every repeated prayer."
              />
              <HeroNote
                Icon={ShieldCheck}
                label="Doctrinally clear"
                value="Tradition and typology are plainly labeled."
              />
            </div>
          </div>
          <div className="h-1.5 bg-[linear-gradient(90deg,#7f1d1d_0%,#b9852b_48%,#f0d38b_100%)]" />
        </header>

        <div className="mt-5">
          <RosaryGuide />
        </div>

        <footer className="mt-6 border-t border-stone-300 py-6 text-sm leading-6 text-stone-600">
          <p>
            Scripture references are citation-only. The short meditations are
            original formation text; fruits are identified as traditional aids.
            The Assumption and Coronation entries distinguish typological anchors
            from direct biblical narration.
          </p>
        </footer>
      </div>
    </main>
  );
}

function HeroNote({
  Icon,
  label,
  value,
}: {
  Icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="grid grid-cols-[2.5rem_1fr] gap-3 rounded-lg border border-[#315d4e] bg-[#183f34] p-3">
      <span className="flex size-10 items-center justify-center rounded-md bg-[#fff3cf] text-[#7f1d1d]">
        <Icon aria-hidden className="size-4" />
      </span>
      <span>
        <span className="block text-xs font-bold uppercase tracking-wide text-[#e7c978]">
          {label}
        </span>
        <span className="mt-1 block text-xs leading-5 text-[#e5dbc0]">
          {value}
        </span>
      </span>
    </div>
  );
}
