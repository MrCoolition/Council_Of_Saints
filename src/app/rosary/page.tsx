import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { RosaryGuide } from "@/components/rosary-guide";

export const metadata: Metadata = {
  title: "Guided Rosary",
  description:
    "Pray all four sets of Rosary mysteries with Scripture anchors, traditional fruits, and a bead-by-bead guide.",
};

export default function RosaryPage() {
  return (
    <main className="min-h-screen bg-parchment text-foreground">
      <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
        <nav aria-label="Breadcrumb">
          <Link
            className="inline-flex min-h-10 items-center gap-2 rounded-md border border-hairline bg-vellum/80 px-3 text-sm font-semibold text-muted transition hover:border-ecclesial-green hover:text-ecclesial-green focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gilt"
            href="/"
          >
            <ArrowLeft aria-hidden className="size-4" />
            Return to Sanctum Council
          </Link>
        </nav>

        <header className="sacred-surface mt-5 overflow-hidden rounded-xl border border-gilt/35 bg-sanctuary-night text-vellum shadow-[var(--shadow-sanctuary)]">
          <div className="p-6 sm:p-8 lg:p-10">
            <div className="max-w-4xl">
              <div className="flex items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-full border border-gilt/60 bg-ecclesial-green text-xl text-[var(--gilt-light)]">
                  <span aria-hidden>✠</span>
                </span>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-gilt">
                  The Most Holy Rosary
                </p>
              </div>
              <h1 className="mt-6 max-w-4xl font-serif text-4xl font-semibold leading-[1.05] text-vellum sm:text-5xl lg:text-6xl">
                Contemplate the face of Christ with Mary.
              </h1>
            </div>
          </div>
          <div className="h-1.5 bg-[linear-gradient(90deg,var(--oxblood)_0%,var(--gilt)_48%,var(--gilt-light)_100%)]" />
        </header>

        <div className="mt-5">
          <RosaryGuide />
        </div>
      </div>
    </main>
  );
}
