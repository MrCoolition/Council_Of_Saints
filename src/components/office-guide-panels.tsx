"use client";

import { BookOpen, Check, Save, ScrollText } from "lucide-react";
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

type SaveStatus = "idle" | "saving" | "account" | "device" | "invalid";

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
  }

  async function saveReference(guide: OfficeGuide, step: OfficeGuideStep) {
    const key = getReferenceKey(guide.hourType, step);
    const draft = drafts[key];
    const pageStart = Number(draft?.pageStart);
    const pageEnd = draft?.pageEnd ? Number(draft.pageEnd) : null;

    if (!Number.isInteger(pageStart) || pageStart < 1) {
      setSaveStatuses((current) => ({ ...current, [key]: "invalid" }));
      return;
    }

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
      const result = (await response.json()) as { mode?: string };

      setSaveStatuses((current) => ({
        ...current,
        [key]: result.mode === "account" ? "account" : "device",
      }));
    } catch {
      setSaveStatuses((current) => ({ ...current, [key]: "device" }));
    }
  }

  return (
    <section className="grid gap-4 lg:grid-cols-2">
      {guides.map((guide) => (
        <article
          className="rounded-lg border border-stone-300 bg-[var(--panel)] p-5 shadow-sm"
          key={guide.hourType}
        >
          <div className="flex flex-col gap-3 border-b border-stone-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-[var(--accent)]">
                {formatPrayerItem(guide.hourType)}
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-stone-950">
                {guide.volume} | Psalter Week {guide.psalterWeek}
              </h2>
            </div>
            <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-md bg-emerald-950 text-amber-100">
              <BookOpen aria-hidden className="size-5" />
            </span>
          </div>

          <p className="mt-4 text-sm leading-6 text-stone-700">
            {guide.generalNote}
          </p>
          <p className="mt-2 text-xs font-semibold uppercase text-stone-500">
            {guide.bookReferenceNote}
          </p>

          <div className="mt-5 border-y border-stone-200 py-4">
            <div className="flex items-center gap-2">
              <ScrollText aria-hidden className="size-4 text-[var(--accent)]" />
              <p className="text-sm font-semibold text-stone-950">
                Scripture
              </p>
            </div>
            <div className="mt-3 space-y-3">
              {guide.scriptureAnchors.map((anchor) => (
                <div
                  className="border-l-2 border-amber-500 pl-3"
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
                    <p className="mt-2 text-sm font-medium leading-6 text-stone-800">
                      &quot;{anchor.text}&quot;
                    </p>
                  ) : null}
                  <p className="mt-2 text-sm leading-6 text-stone-600">
                    {anchor.reflection}
                  </p>
                  <p className="mt-1 text-xs text-stone-500">
                    {anchor.sourceLabel}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <ol className="mt-4 space-y-3">
            {guide.steps.map((step) => {
              const key = getReferenceKey(guide.hourType, step);
              const draft = drafts[key] ?? { pageStart: "", pageEnd: "" };
              const saveStatus = saveStatuses[key] ?? "idle";
              const canSave = Number(draft.pageStart) > 0;

              return (
                <li
                  className="grid gap-3 border-t border-stone-200 pt-3 sm:grid-cols-[3rem_1fr]"
                  key={key}
                >
                  <span className="flex size-10 items-center justify-center rounded-md bg-stone-900 font-mono text-sm text-amber-50">
                    {step.order}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold capitalize text-stone-950">
                          {step.sectionType.replaceAll("_", " ")}
                        </p>
                        <p className="mt-1 text-sm leading-6 text-stone-700">
                          {step.instruction}
                        </p>
                      </div>

                      <div className="grid grid-cols-[minmax(4.5rem,1fr)_minmax(4.5rem,1fr)_2.5rem] gap-2 sm:w-56">
                        <label className="sr-only" htmlFor={`${key}:start`}>
                          Start page
                        </label>
                        <input
                          className="h-10 min-w-0 rounded-md border border-stone-300 bg-white px-2 text-sm text-stone-950 outline-none focus:border-emerald-900"
                          id={`${key}:start`}
                          inputMode="numeric"
                          onChange={(event) =>
                            updateDraft(key, "pageStart", event.target.value)
                          }
                          placeholder="Page"
                          value={draft.pageStart}
                        />
                        <label className="sr-only" htmlFor={`${key}:end`}>
                          End page
                        </label>
                        <input
                          className="h-10 min-w-0 rounded-md border border-stone-300 bg-white px-2 text-sm text-stone-950 outline-none focus:border-emerald-900"
                          id={`${key}:end`}
                          inputMode="numeric"
                          onChange={(event) =>
                            updateDraft(key, "pageEnd", event.target.value)
                          }
                          placeholder="End"
                          value={draft.pageEnd}
                        />
                        <button
                          aria-label={`Save page for ${step.sectionType}`}
                          className={[
                            "inline-flex h-10 items-center justify-center rounded-md border transition",
                            canSave
                              ? "border-emerald-950 bg-emerald-950 text-amber-50 hover:bg-emerald-900"
                              : "border-stone-300 bg-stone-100 text-stone-400",
                          ].join(" ")}
                          disabled={!canSave || saveStatus === "saving"}
                          onClick={() => saveReference(guide, step)}
                          title="Save page"
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

                    <p className="mt-2 text-xs text-stone-500">
                      {getSaveStatusLabel(saveStatus)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </article>
      ))}
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

function getSaveStatusLabel(status: SaveStatus) {
  switch (status) {
    case "saving":
      return "Saving page...";
    case "account":
      return "Account page saved.";
    case "device":
      return "Device page saved.";
    case "invalid":
      return "Enter a start page.";
    case "idle":
      return "Large-print page reference.";
  }
}
