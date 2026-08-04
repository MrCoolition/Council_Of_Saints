"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  DailyOfficeDevotionalPayload,
  DailyOfficeDevotionalResponse,
} from "@/lib/ai/contracts";
import type {
  DevotionalOfficeHourKey,
  OriginalConcludingPrayerPrompt,
  OriginalDevotionalIntercessions,
} from "@/lib/office-devotional-texts";

type DailyOfficeDevotionalState = {
  devotional: DailyOfficeDevotionalPayload | null;
  status: "loading" | "ai" | "fallback";
};

const DailyOfficeDevotionalContext =
  createContext<DailyOfficeDevotionalState | null>(null);

export function DailyOfficeDevotionalProvider({
  children,
  localDate,
}: {
  children: ReactNode;
  localDate: string;
}) {
  const [state, setState] = useState<DailyOfficeDevotionalState>({
    devotional: null,
    status: "loading",
  });

  useEffect(() => {
    const controller = new AbortController();

    async function prepareDevotional() {
      try {
        const response = await fetch(
          `/api/ai/office-devotional?localDate=${encodeURIComponent(localDate)}`,
          { cache: "no-store", signal: controller.signal },
        );
        const body: DailyOfficeDevotionalResponse = await response.json();

        if (!controller.signal.aborted && response.ok && body.mode === "ai") {
          setState({ devotional: body.devotional, status: "ai" });
          return;
        }

        if (!controller.signal.aborted) {
          setState({ devotional: null, status: "fallback" });
        }
      } catch {
        if (!controller.signal.aborted) {
          setState({ devotional: null, status: "fallback" });
        }
      }
    }

    void prepareDevotional();
    return () => controller.abort();
  }, [localDate]);

  const value = useMemo(() => state, [state]);

  return (
    <DailyOfficeDevotionalContext.Provider value={value}>
      {children}
    </DailyOfficeDevotionalContext.Provider>
  );
}

export function DailyOfficeDevotionalSections({
  fallbackConclusion,
  fallbackIntentions,
  hourLabel,
  hourType,
}: {
  fallbackConclusion: OriginalConcludingPrayerPrompt;
  fallbackIntentions: OriginalDevotionalIntercessions;
  hourLabel: string;
  hourType: DevotionalOfficeHourKey;
}) {
  const state = useContext(DailyOfficeDevotionalContext);
  const generated = state?.devotional?.hours[hourType] ?? null;
  const intentions = generated?.intentions ?? fallbackIntentions;
  const conclusion = generated?.conclude ?? fallbackConclusion;
  const status = state?.status ?? "fallback";

  return (
    <>
      <section className="mt-5 rounded-xl border border-ecclesial-green/20 bg-ecclesial-green/5 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-ecclesial-green">
            Intentions
          </p>
          <DevotionalStatus status={status} />
        </div>
        <h3 className="mt-2 font-serif text-xl font-semibold text-foreground">
          {intentions.title}
        </h3>
        <p className="mt-2 font-serif text-lg font-semibold text-foreground">
          Response: {intentions.response}
        </p>
        <ul className="mt-4 grid gap-3 lg:grid-cols-2">
          {intentions.petitions.map((petition) => (
            <li
              className="rounded-xl border border-ecclesial-green/15 bg-vellum/70 p-4 text-sm leading-6 text-muted"
              key={petition.id}
            >
              {petition.text}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs leading-5 text-muted">
          Original personal devotional material—not official ICEL text. At
          Hours other than Morning and Evening Prayer, these intentions are an
          optional devotion outside the official structure.
        </p>
      </section>

      <section
        aria-label={`${hourLabel} conclusion`}
        className="mt-5 rounded-xl border border-hairline bg-[var(--panel-soft)] p-4 sm:p-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-ecclesial-green">
            Conclude
          </p>
          {generated?.scriptureReferences.length ? (
            <p className="text-xs text-muted">
              Drawn from {generated.scriptureReferences.join(" · ")}
            </p>
          ) : null}
        </div>
        <div className="mt-3 rounded-xl border border-hairline bg-vellum/70 p-4">
          <h3 className="font-serif text-xl font-semibold text-foreground">
            {conclusion.title}
          </h3>
          <p className="mt-2 text-sm leading-6 text-muted">
            {conclusion.prompt}
          </p>
          <p className="mt-2 text-sm italic leading-6 text-muted">
            {conclusion.endingSuggestion}
          </p>
        </div>
      </section>
    </>
  );
}

function DevotionalStatus({
  status,
}: {
  status: DailyOfficeDevotionalState["status"];
}) {
  const label =
    status === "ai"
      ? "AI-assisted · today"
      : status === "loading"
        ? "Preparing today · curated text shown"
        : "Curated fallback";

  return (
    <span className="rounded-full border border-gilt/35 bg-vellum/80 px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-[0.1em] text-muted">
      {label}
    </span>
  );
}
