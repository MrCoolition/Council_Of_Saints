"use client";

import { ArrowUp } from "lucide-react";

export function OfficeHourCollapseControl({
  detailsId,
  hourLabel,
  summaryId,
}: {
  detailsId: string;
  hourLabel: string;
  summaryId: string;
}) {
  function collapseAndReturn() {
    const details = document.getElementById(detailsId);
    const summary = document.getElementById(summaryId);

    if (!(details instanceof HTMLDetailsElement) || !summary) {
      return;
    }

    details.open = false;
    window.requestAnimationFrame(() => {
      summary.focus({ preventScroll: true });
      summary.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
        block: "start",
      });
    });
  }

  return (
    <div className="mt-6 flex justify-center border-t border-hairline pt-6">
      <button
        aria-label={`Collapse ${hourLabel} and return to its heading`}
        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-ecclesial-green/30 bg-vellum px-5 text-sm font-bold text-ecclesial-green shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 hover:border-ecclesial-green hover:bg-[var(--panel-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ecclesial-green"
        onClick={collapseAndReturn}
        type="button"
      >
        <ArrowUp aria-hidden className="size-4" />
        Collapse and return to top
      </button>
    </div>
  );
}
