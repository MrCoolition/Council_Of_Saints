"use client";

import {
  BookOpen,
  Check,
  ChevronDown,
  ListOrdered,
  Save,
  ScrollText,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { OfficeGuide, OfficeGuideStep } from "@/lib/demo-data";
import { formatPrayerItem } from "@/lib/domain";

type OfficeGuidePanelsProps = {
  guides: OfficeGuide[];
  localDate: string;
};

type PageDraft = {
  pageStart: string;
  pageEnd: string;
};

type SaveStatus =
  | "idle"
  | "saving"
  | "account"
  | "device"
  | "invalid"
  | "error";

type ValidPageDraft = {
  pageStart: number;
  pageEnd: number | null;
};

const pageStoragePrefix = "sanctum-council:large-print-pages";

export function OfficeGuidePanels({ guides, localDate }: OfficeGuidePanelsProps) {
  const [drafts, setDrafts] = useState<Record<string, PageDraft>>(() =>
    getInitialDrafts(guides),
  );
  const [saveStatuses, setSaveStatuses] = useState<Record<string, SaveStatus>>(
    {},
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      try {
        const rawValue = window.localStorage.getItem(
          getPageStorageKey(localDate),
        );

        if (!rawValue) {
          return;
        }

        const stored = JSON.parse(rawValue) as Record<string, PageDraft>;
        setDrafts((current) => ({ ...current, ...stored }));
      } catch {
        return;
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [localDate]);

  function updateDraft(key: string, field: keyof PageDraft, value: string) {
    setDrafts((current) => ({
      ...current,
      [key]: {
        ...(current[key] ?? { pageStart: "", pageEnd: "" }),
        [field]: value.replace(/[^\d]/g, "").slice(0, 4),
      },
    }));
    setSaveStatuses((current) => ({ ...current, [key]: "idle" }));
  }

  async function saveReference(guide: OfficeGuide, step: OfficeGuideStep) {
    const key = getReferenceKey(guide.hourType, step);
    const draft = drafts[key];
    const validDraft = validatePageDraft(draft);

    if (!validDraft) {
      setSaveStatuses((current) => ({ ...current, [key]: "invalid" }));
      return;
    }

    const { pageStart, pageEnd } = validDraft;

    const nextDrafts = {
      ...drafts,
      [key]: {
        pageStart: String(pageStart),
        pageEnd: pageEnd ? String(pageEnd) : "",
      },
    };

    setDrafts(nextDrafts);
    writePageStorage(localDate, nextDrafts);
    setSaveStatuses((current) => ({ ...current, [key]: "saving" }));

    try {
      const response = await fetch("/api/book-reference", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          localDate,
          hourType: guide.hourType,
          sectionType: step.sectionType,
          stepOrder: step.order,
          pageStart,
          pageEnd,
        }),
      });

      if (!response.ok) {
        throw new Error(`Book reference save failed with ${response.status}`);
      }

      const result = (await response.json()) as { mode?: string };
      const saveMode = result.mode;

      if (saveMode !== "account" && saveMode !== "device") {
        throw new Error("Book reference save returned an invalid mode");
      }

      setSaveStatuses((current) => ({
        ...current,
        [key]: saveMode,
      }));
    } catch {
      setSaveStatuses((current) => ({ ...current, [key]: "error" }));
    }
  }

  return (
    <section
      aria-labelledby="office-guides-heading"
      className="scroll-mt-24"
      id="office"
    >
      <header className="mb-5 max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent)]">
          Divine Office
        </p>
        <h2
          className="mt-2 text-3xl font-semibold text-stone-950 sm:text-4xl"
          id="office-guides-heading"
        >
          Pray the hours with the Church
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-600 sm:text-base">
          Begin with the appointed Scripture. Open the book guide only when you
          need the physical-page path.
        </p>
      </header>

      <div className="grid gap-5 xl:grid-cols-2">
        {guides.map((guide) => (
          <article
            aria-labelledby={`office-${guide.hourType}-heading`}
            className="rounded-2xl border border-stone-300/90 bg-[var(--panel)] p-4 shadow-[0_16px_42px_rgba(44,39,31,0.06)] sm:p-6"
            key={guide.hourType}
          >
            <div className="flex items-start justify-between gap-4 border-b border-stone-200 pb-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent)]">
                  {formatPrayerItem(guide.hourType)}
                </p>
                <h3
                  className="mt-2 text-2xl font-semibold text-stone-950 sm:text-3xl"
                  id={`office-${guide.hourType}-heading`}
                >
                  {guide.volume} · Psalter Week {guide.psalterWeek}
                </h3>
              </div>
              <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-emerald-950 text-amber-100 shadow-sm">
                <BookOpen aria-hidden className="size-5" />
              </span>
            </div>

            <p className="mt-4 font-serif text-lg leading-7 text-stone-800">
              {guide.generalNote}
            </p>
            <p className="mt-2 text-xs font-semibold uppercase leading-5 tracking-wide text-stone-500">
              {guide.bookReferenceNote}
            </p>

            <div className="mt-5 rounded-xl border border-stone-200 bg-white/60 p-4">
              <div className="flex items-center gap-2">
                <ScrollText aria-hidden className="size-4 text-[var(--accent)]" />
                <p className="text-sm font-bold text-stone-950">Scripture</p>
              </div>
              <div className="mt-4 space-y-4">
                {guide.scriptureAnchors.map((anchor) => (
                  <blockquote
                    className="border-l-2 border-amber-500 pl-4"
                    key={`${guide.hourType}:${anchor.title}:${anchor.citation}`}
                  >
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <p className="text-sm font-semibold text-stone-950">
                        {anchor.title}
                      </p>
                      <p className="font-mono text-xs text-stone-500">
                        {anchor.citation}
                      </p>
                    </div>
                    {anchor.text ? (
                      <p className="mt-2 font-serif text-lg leading-7 text-stone-800">
                        “{anchor.text}”
                      </p>
                    ) : null}
                    <p className="mt-2 text-sm leading-6 text-stone-600">
                      {anchor.reflection}
                    </p>
                    <cite className="mt-1 block text-xs not-italic text-stone-500">
                      {anchor.sourceLabel}
                    </cite>
                  </blockquote>
                ))}
              </div>
            </div>

            <details className="group mt-4 rounded-xl border border-stone-300 bg-[var(--panel-soft)]">
              <summary className="flex min-h-14 cursor-pointer items-center justify-between gap-3 rounded-xl px-4 py-3 text-left text-stone-950 transition hover:bg-white/70">
                <span className="flex min-w-0 items-center gap-3">
                  <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-stone-900 text-amber-50">
                    <ListOrdered aria-hidden className="size-4" />
                  </span>
                  <span>
                    <span className="block text-sm font-bold">Book guide</span>
                    <span className="block text-xs leading-5 text-stone-500">
                      {guide.steps.length} steps with page references
                    </span>
                  </span>
                </span>
                <ChevronDown
                  aria-hidden
                  className="size-5 shrink-0 text-stone-500 transition-transform group-open:rotate-180"
                />
              </summary>

              <ol className="space-y-4 border-t border-stone-200 p-4">
                {guide.steps.map((step) => {
                  const key = getReferenceKey(guide.hourType, step);
                  const draft = drafts[key] ?? { pageStart: "", pageEnd: "" };
                  const saveStatus = saveStatuses[key] ?? "idle";
                  const canSave = draft.pageStart.length > 0;
                  const statusId = `${key}:status`;

                  return (
                    <li
                      className="grid gap-3 rounded-xl border border-stone-200 bg-white/80 p-3 sm:grid-cols-[2.75rem_1fr] sm:p-4"
                      key={key}
                    >
                      <span className="flex size-11 items-center justify-center rounded-xl bg-emerald-950 font-mono text-sm text-amber-50">
                        {step.order}
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0 sm:max-w-xs">
                            <p className="text-sm font-bold capitalize text-stone-950">
                              {step.sectionType.replaceAll("_", " ")}
                            </p>
                            <p className="mt-1 text-sm leading-6 text-stone-700">
                              {step.instruction}
                            </p>
                          </div>

                          <div className="grid w-full grid-cols-[minmax(0,1fr)_minmax(0,1fr)_2.75rem] items-end gap-2 sm:w-64">
                            <label
                              className="grid gap-1 text-xs font-semibold text-stone-600"
                              htmlFor={`${key}:start`}
                            >
                              Start page
                              <input
                                aria-describedby={statusId}
                                aria-invalid={saveStatus === "invalid"}
                                className="min-h-11 min-w-0 rounded-xl border border-stone-300 bg-white px-3 text-sm text-stone-950 outline-none transition focus:border-emerald-900"
                                id={`${key}:start`}
                                inputMode="numeric"
                                onChange={(event) =>
                                  updateDraft(
                                    key,
                                    "pageStart",
                                    event.target.value,
                                  )
                                }
                                placeholder="Page"
                                value={draft.pageStart}
                              />
                            </label>
                            <label
                              className="grid gap-1 text-xs font-semibold text-stone-600"
                              htmlFor={`${key}:end`}
                            >
                              End page
                              <input
                                aria-describedby={statusId}
                                aria-invalid={saveStatus === "invalid"}
                                className="min-h-11 min-w-0 rounded-xl border border-stone-300 bg-white px-3 text-sm text-stone-950 outline-none transition focus:border-emerald-900"
                                id={`${key}:end`}
                                inputMode="numeric"
                                onChange={(event) =>
                                  updateDraft(
                                    key,
                                    "pageEnd",
                                    event.target.value,
                                  )
                                }
                                placeholder="End"
                                value={draft.pageEnd}
                              />
                            </label>
                            <button
                              aria-describedby={statusId}
                              aria-label={`Save page for ${step.sectionType}`}
                              className={[
                                "inline-flex size-11 items-center justify-center rounded-xl border transition",
                                canSave
                                  ? "border-emerald-950 bg-emerald-950 text-amber-50 shadow-sm hover:bg-emerald-900"
                                  : "border-stone-300 bg-stone-100 text-stone-400",
                              ].join(" ")}
                              disabled={!canSave || saveStatus === "saving"}
                              onClick={() => saveReference(guide, step)}
                              type="button"
                            >
                              {saveStatus === "account" ||
                              saveStatus === "device" ? (
                                <Check aria-hidden className="size-4" />
                              ) : (
                                <Save aria-hidden className="size-4" />
                              )}
                            </button>
                          </div>
                        </div>

                        <p
                          aria-live="polite"
                          className={[
                            "mt-2 text-xs",
                            saveStatus === "invalid" || saveStatus === "error"
                              ? "font-semibold text-red-800"
                              : "text-stone-500",
                          ].join(" ")}
                          id={statusId}
                          role="status"
                        >
                          {getSaveStatusLabel(saveStatus)}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </details>
          </article>
        ))}
      </div>
    </section>
  );
}

function getInitialDrafts(guides: OfficeGuide[]) {
  const drafts: Record<string, PageDraft> = {};

  for (const guide of guides) {
    for (const step of guide.steps) {
      const pageStart = step.userPageStart ?? step.pageStart;
      const pageEnd = step.userPageEnd ?? step.pageEnd;

      drafts[getReferenceKey(guide.hourType, step)] = {
        pageStart: pageStart ? String(pageStart) : "",
        pageEnd: pageEnd ? String(pageEnd) : "",
      };
    }
  }

  return drafts;
}

function getReferenceKey(hourType: OfficeGuide["hourType"], step: OfficeGuideStep) {
  return `${hourType}:${step.sectionType}:${step.order}`;
}

function getPageStorageKey(localDate: string) {
  return `${pageStoragePrefix}:${localDate}`;
}

function writePageStorage(localDate: string, drafts: Record<string, PageDraft>) {
  try {
    window.localStorage.setItem(getPageStorageKey(localDate), JSON.stringify(drafts));
  } catch {
    return;
  }
}

function validatePageDraft(draft?: PageDraft): ValidPageDraft | null {
  if (!draft?.pageStart) {
    return null;
  }

  const pageStart = Number(draft.pageStart);
  const pageEnd = draft.pageEnd ? Number(draft.pageEnd) : null;

  if (
    !Number.isInteger(pageStart) ||
    pageStart < 1 ||
    pageStart > 5000 ||
    (pageEnd !== null &&
      (!Number.isInteger(pageEnd) ||
        pageEnd < pageStart ||
        pageEnd > 5000))
  ) {
    return null;
  }

  return { pageStart, pageEnd };
}

function getSaveStatusLabel(status: SaveStatus) {
  switch (status) {
    case "saving":
      return "Saving page...";
    case "account":
      return "Account page saved.";
    case "device":
      return "Device page saved.";
    case "invalid":
      return "Use pages 1–5000; the end cannot precede the start.";
    case "error":
      return "Account save failed. Check the pages and try again.";
    case "idle":
      return "Large-print page reference.";
  }
}
