"use client";

import {
  BookOpen,
  ChevronDown,
  Church,
  Cross,
  Expand,
  Minimize2,
  Music2,
  Users,
} from "lucide-react";
import { useId, useMemo, useState } from "react";
import {
  type MassFollowTargetRegistration,
  useMassFollowState,
  useMassFollowTargets,
} from "@/components/mass-follow-provider";
import type {
  MassDialogueLine,
  MassDialogueRole,
  MassDialogueVariant,
  MassOrderItem,
} from "@/lib/mass-order";
import { splitMassSpeechText } from "@/lib/mass-speech-following";

const ROLE_LABELS: Record<MassDialogueRole, string> = {
  priest: "Priest",
  deacon: "Deacon",
  reader: "Reader",
  cantor: "Cantor",
  minister: "Minister",
  people: "People",
  all: "All",
  rubric: "Rubric",
};

const SPOKEN_ROLES: readonly MassDialogueRole[] = [
  "priest",
  "deacon",
  "reader",
  "cantor",
  "minister",
  "people",
  "all",
];

export function MassDialogueOrder({
  followOrderBase = 0,
  items,
  idPrefix = "mass-dialogue",
  title,
}: {
  followOrderBase?: number;
  items: readonly MassOrderItem[];
  idPrefix?: string;
  title?: string;
}) {
  const dialogueItems = items;
  const reactId = useId();
  const baseId = `${toIdFragment(idPrefix)}-${toIdFragment(reactId)}`;
  const itemKeys = dialogueItems.map((item, index) =>
    getItemKey(item, index),
  );
  const expandableKeys = dialogueItems.flatMap((item, index) =>
    getRenderedLines(item, getDefaultVariant(item)).length > 0
      ? [getItemKey(item, index)]
      : [],
  );
  const [openItems, setOpenItems] = useState<ReadonlySet<string>>(() => {
    const defaults = dialogueItems.flatMap((item, index) =>
      item.defaultOpen ? [getItemKey(item, index)] : [],
    );
    return new Set(defaults);
  });
  const [selectedVariants, setSelectedVariants] = useState<
    Readonly<Record<string, string>>
  >(() =>
    Object.fromEntries(
      dialogueItems.flatMap((item, index) => {
        const selection = getDefaultVariant(item);
        return selection ? [[getItemKey(item, index), selection.id]] : [];
      }),
    ),
  );
  const { activeTargetId } = useMassFollowState();
  const followTargets = useMemo(
    () =>
      buildMassFollowTargets({
        followOrderBase,
        idPrefix,
        items: dialogueItems,
        revealItem: (itemKey, variantId) => {
          setOpenItems((current) => {
            if (current.has(itemKey)) {
              return current;
            }

            const next = new Set(current);
            next.add(itemKey);
            return next;
          });

          if (variantId) {
            setSelectedVariants((current) =>
              current[itemKey] === variantId
                ? current
                : { ...current, [itemKey]: variantId },
            );
          }
        },
      }),
    [
      dialogueItems,
      followOrderBase,
      idPrefix,
      setOpenItems,
      setSelectedVariants,
    ],
  );
  useMassFollowTargets(followTargets);
  const allOpen =
    expandableKeys.length > 0 &&
    expandableKeys.every((key) => openItems.has(key));
  const noneOpen = openItems.size === 0;
  const titleId = `${baseId}-title`;

  function toggleItem(key: string) {
    setOpenItems((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function selectVariant(key: string, variantId: string) {
    setSelectedVariants((current) => ({
      ...current,
      [key]: variantId,
    }));
  }

  return (
    <section
      aria-label={title ? undefined : "Order of Mass"}
      aria-labelledby={title ? titleId : undefined}
      className="space-y-5"
    >
      {title || itemKeys.length > 1 ? (
      <header className="flex flex-col gap-4 border-b border-[var(--line)] pb-5 sm:flex-row sm:items-end sm:justify-between">
        {title ? (
          <div>
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-[color:var(--liturgical-accent)]">
              The Order of Mass
            </p>
            <h3
              className="mt-1 font-serif text-3xl font-semibold tracking-tight text-[var(--foreground)]"
              id={titleId}
            >
              {title}
            </h3>
          </div>
        ) : (
          <span aria-hidden />
        )}

        <div className="grid grid-cols-2 gap-2 sm:flex" role="group" aria-label="Accordion controls">
          <button
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[var(--line)] bg-[var(--vellum)] px-4 text-xs font-bold text-[var(--foreground)] motion-safe:transition-colors hover:border-[color:var(--liturgical-accent)] hover:text-[color:var(--liturgical-accent)] disabled:cursor-not-allowed disabled:opacity-45"
            disabled={allOpen || expandableKeys.length === 0}
            onClick={() => setOpenItems(new Set(expandableKeys))}
            type="button"
          >
            <Expand aria-hidden className="size-4" />
            Expand all
          </button>
          <button
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[var(--line)] bg-[var(--vellum)] px-4 text-xs font-bold text-[var(--foreground)] motion-safe:transition-colors hover:border-[color:var(--liturgical-accent)] hover:text-[color:var(--liturgical-accent)] disabled:cursor-not-allowed disabled:opacity-45"
            disabled={noneOpen}
            onClick={() => setOpenItems(new Set())}
            type="button"
          >
            <Minimize2 aria-hidden className="size-4" />
            Close all
          </button>
        </div>
      </header>
      ) : null}

      <ol className="space-y-4">
        {dialogueItems.map((item, index) => {
          const key = getItemKey(item, index);
          const open = openItems.has(key);
          const triggerId = `${baseId}-${toIdFragment(item.id)}-${index}-trigger`;
          const panelId = `${baseId}-${toIdFragment(item.id)}-${index}-panel`;
          const selectedVariant = getSelectedVariant(
            item,
            selectedVariants[key],
          );
          const renderedLines = getRenderedLineEntries(item, selectedVariant);
          const lines = renderedLines.map((entry) => entry.line);
          const roles = getSpokenRoles(lines);
          const StaticHeading = title ? "h4" : "h3";

          if (lines.length === 0) {
            return (
              <li key={key}>
                <article className="rounded-3xl border border-[var(--line)] bg-[var(--panel)] px-5 py-5 shadow-[0_16px_48px_rgba(11,28,22,0.045)] sm:px-7 sm:py-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <PostureChip posture={item.posture} />
                    {item.subgroup ? (
                      <span className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">
                        {item.subgroup}
                      </span>
                    ) : null}
                  </div>
                  <StaticHeading className="mt-2 font-serif text-xl font-semibold leading-tight text-[var(--foreground)] sm:text-2xl">
                    {item.title}
                  </StaticHeading>
                </article>
              </li>
            );
          }

          return (
            <li key={key}>
              <article
                className={[
                  "overflow-hidden rounded-3xl border bg-[var(--panel)] shadow-[0_16px_48px_rgba(11,28,22,0.045)] motion-safe:transition-[border-color,box-shadow]",
                  open
                    ? "border-[color:var(--liturgical-accent)]/45 shadow-[0_20px_60px_rgba(11,28,22,0.075)]"
                    : "border-[var(--line)] hover:border-[color:var(--liturgical-accent)]/35",
                ].join(" ")}
              >
                {title ? <h4>
                  <button
                    aria-controls={panelId}
                    aria-expanded={open}
                    className="grid min-h-20 w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[color:var(--liturgical-accent)] sm:px-7 sm:py-5"
                    id={triggerId}
                    onClick={() => toggleItem(key)}
                    type="button"
                  >
                    <TriggerContent item={item} open={open} roles={roles} />
                  </button>
                </h4> : <h3>
                  <button
                    aria-controls={panelId}
                    aria-expanded={open}
                    className="grid min-h-20 w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[color:var(--liturgical-accent)] sm:px-7 sm:py-5"
                    id={triggerId}
                    onClick={() => toggleItem(key)}
                    type="button"
                  >
                    <TriggerContent item={item} open={open} roles={roles} />
                  </button>
                </h3>}

                <div
                  aria-labelledby={triggerId}
                  className="border-t border-[var(--line)]"
                  hidden={!open}
                  id={panelId}
                >
                  <div className="space-y-5 px-5 py-6 sm:px-7 sm:py-8">
                    {item.variants && item.variants.length > 0 ? (
                      <VariantChooser
                        baseId={`${baseId}-${toIdFragment(item.id)}-${index}`}
                        itemKey={key}
                        onChange={selectVariant}
                        selectedId={selectedVariant?.id ?? ""}
                        variants={item.variants}
                      />
                    ) : null}

                    <div className="relative space-y-3 before:absolute before:bottom-5 before:left-5 before:top-5 before:w-px before:bg-[var(--line)] sm:before:left-6">
                      {renderedLines.map(({ line, lineIndex, variantId }) => (
                        <DialogueBlock
                          activeTargetId={activeTargetId}
                          follow={{
                            idPrefix,
                            itemId: item.id,
                            itemIndex: index,
                            lineIndex,
                            variantId,
                          }}
                          key={`${variantId ?? "base"}:${line.role}:${line.label ?? ""}:${lineIndex}`}
                          line={line}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </article>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function TriggerContent({
  item,
  open,
  roles,
}: {
  item: MassOrderItem;
  open: boolean;
  roles: readonly MassDialogueRole[];
}) {
  return (
    <>
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-2">
          <PostureChip posture={item.posture} />
          {item.subgroup ? (
            <span className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">
              {item.subgroup}
            </span>
          ) : null}
        </span>
        <span className="mt-2 block font-serif text-xl font-semibold leading-tight text-[var(--foreground)] sm:text-2xl">
          {item.title}
        </span>
        {roles.length > 0 ? (
          <span className="mt-3 flex flex-wrap gap-1.5">
            {roles.map((role) => (
              <RoleChip key={role} role={role} />
            ))}
          </span>
        ) : null}
      </span>
      <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--vellum)] text-[color:var(--liturgical-accent)]">
        <ChevronDown
          aria-hidden
          className={[
            "size-5 motion-safe:transition-transform motion-safe:duration-200",
            open ? "rotate-180" : "",
          ].join(" ")}
        />
      </span>
    </>
  );
}

function VariantChooser({
  baseId,
  itemKey,
  onChange,
  selectedId,
  variants,
}: {
  baseId: string;
  itemKey: string;
  onChange: (itemKey: string, variantId: string) => void;
  selectedId: string;
  variants: readonly MassDialogueVariant[];
}) {
  return (
    <fieldset className="rounded-2xl border border-[var(--line)] bg-[var(--panel-soft)] p-3 sm:p-4">
      <legend className="px-2 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
        Choose the form you hear
      </legend>
      <div className="mt-1 grid gap-2 sm:flex sm:flex-wrap">
        {variants.map((variant, index) => {
          const inputId = `${baseId}-variant-${toIdFragment(variant.id)}-${index}`;
          return (
            <label
              className={[
                "inline-flex min-h-12 cursor-pointer items-center justify-center rounded-full border px-4 text-center text-sm font-bold motion-safe:transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[color:var(--liturgical-accent)]",
                selectedId === variant.id
                  ? "border-[color:var(--liturgical-accent)] bg-[color:var(--liturgical-accent)] text-white"
                  : "border-[var(--line)] bg-[var(--vellum)] text-[var(--foreground)] hover:border-[color:var(--liturgical-accent)]",
              ].join(" ")}
              htmlFor={inputId}
              key={variant.id}
            >
              <input
                checked={selectedId === variant.id}
                className="sr-only"
                id={inputId}
                name={`${baseId}-variant`}
                onChange={() => onChange(itemKey, variant.id)}
                type="radio"
                value={variant.id}
              />
              {variant.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

type DialogueFollowMetadata = {
  idPrefix: string;
  itemId: string;
  itemIndex: number;
  lineIndex: number;
  variantId: string | null;
};

function DialogueBlock({
  activeTargetId,
  follow,
  line,
}: {
  activeTargetId: string | null;
  follow: DialogueFollowMetadata;
  line: MassDialogueLine;
}) {
  if (line.role === "rubric") {
    return (
      <div className="relative z-10 ml-0 rounded-2xl border border-[color:var(--oxblood)]/20 bg-[var(--panel-soft)] px-5 py-4 sm:ml-4 sm:px-6">
        <div className="flex items-center gap-2 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-[var(--oxblood)]">
          <Cross aria-hidden className="size-3.5" />
          <span>Rubric</span>
          {line.label ? <span className="normal-case tracking-normal">· {line.label}</span> : null}
        </div>
        <p className="mt-2 font-serif text-base italic leading-7 text-[var(--oxblood)] sm:text-lg sm:leading-8">
          {line.text}
        </p>
      </div>
    );
  }

  const roleClass = getRoleBlockClass(line.role);
  const labelClass =
    line.role === "priest" ||
    line.role === "deacon" ||
    line.role === "minister"
      ? "text-[var(--gilt-light)]"
      : "text-[color:var(--liturgical-accent)]";
  const textClass =
    line.role === "people" || line.role === "all"
      ? "text-xl font-semibold leading-8 sm:text-2xl sm:leading-9"
      : "text-lg leading-8 sm:text-xl sm:leading-9";
  const chunks = splitMassSpeechText(line.text);

  return (
    <div className={`relative z-10 rounded-2xl border px-5 py-5 sm:px-7 sm:py-6 ${roleClass}`}>
      <div className="flex items-center gap-3">
        <RoleMedallion role={line.role} />
        <p className={`text-[0.68rem] font-bold uppercase tracking-[0.15em] ${labelClass}`}>
          {ROLE_LABELS[line.role]}
          {line.label ? (
            <span className="ml-2 normal-case tracking-normal opacity-80">
              · {line.label}
            </span>
          ) : null}
        </p>
      </div>
      <p className={`mt-3 font-serif ${textClass}`}>
        {chunks.map((chunk, chunkIndex) => {
          const targetId = getFollowTargetId({
            ...follow,
            chunkIndex,
          });
          const active = targetId === activeTargetId;

          return (
            <span
              className={
                active
                  ? "rounded-sm bg-[color:var(--gilt)]/30 motion-safe:transition-colors"
                  : "rounded-sm motion-safe:transition-colors"
              }
              data-mass-follow-target={targetId}
              id={targetId}
              key={targetId}
            >
              {chunk}
            </span>
          );
        })}
      </p>
    </div>
  );
}

function RoleMedallion({
  role,
}: {
  role: Exclude<MassDialogueRole, "rubric">;
}) {
  const iconClass = "size-4";
  const content =
    role === "priest" ? (
      <Church aria-hidden className={iconClass} />
    ) : role === "deacon" ? (
      <Cross aria-hidden className={iconClass} />
    ) : role === "reader" ? (
      <BookOpen aria-hidden className={iconClass} />
    ) : role === "cantor" ? (
      <Music2 aria-hidden className={iconClass} />
    ) : role === "minister" ? (
      <Cross aria-hidden className={iconClass} />
    ) : role === "people" ? (
      <span aria-hidden className="font-serif text-lg font-bold">℟</span>
    ) : (
      <Users aria-hidden className={iconClass} />
    );

  return (
    <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-current/20 bg-current/5">
      {content}
    </span>
  );
}

function RoleChip({ role }: { role: MassDialogueRole }) {
  return (
    <span
      className={[
        "inline-flex min-h-6 items-center rounded-full border px-2 text-[0.6rem] font-bold uppercase tracking-[0.1em]",
        role === "priest"
          ? "border-[var(--ecclesial-green)]/25 bg-[var(--ecclesial-green)]/8 text-[var(--ecclesial-green)]"
          : role === "deacon"
            ? "border-[var(--oxblood)]/25 bg-[var(--oxblood)]/8 text-[var(--oxblood)]"
            : role === "minister"
              ? "border-[var(--ecclesial-green)]/25 bg-[var(--ecclesial-green)]/8 text-[var(--ecclesial-green)]"
            : role === "people" || role === "all"
              ? "border-[var(--gilt)]/35 bg-[var(--gilt)]/10 text-[var(--liturgical-gold-ink)]"
              : "border-[var(--line)] bg-[var(--panel-soft)] text-[var(--muted)]",
      ].join(" ")}
    >
      {ROLE_LABELS[role]}
    </span>
  );
}

function PostureChip({ posture }: { posture: MassOrderItem["posture"] }) {
  return (
    <span className="inline-flex min-h-7 items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--vellum)] px-2.5 text-[0.62rem] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">
      <Church aria-hidden className="size-3 text-[color:var(--liturgical-accent)]" />
      {posture}
    </span>
  );
}

function getRoleBlockClass(role: Exclude<MassDialogueRole, "rubric">) {
  if (role === "priest") {
    return "border-[color:var(--gilt)]/35 bg-[var(--sanctuary-night)] text-[var(--vellum)] shadow-[inset_4px_0_0_var(--gilt)]";
  }
  if (role === "deacon") {
    return "border-[color:var(--gilt)]/25 bg-[var(--oxblood)] text-[var(--vellum)] shadow-[inset_4px_0_0_var(--gilt)]";
  }
  if (role === "minister") {
    return "border-[color:var(--gilt)]/30 bg-[var(--ecclesial-green)] text-[var(--vellum)] shadow-[inset_4px_0_0_var(--gilt)]";
  }
  if (role === "people") {
    return "border-[color:var(--gilt)]/45 bg-[var(--vellum)] text-[var(--foreground)] shadow-[inset_4px_0_0_var(--gilt),0_12px_32px_rgba(11,28,22,0.06)]";
  }
  if (role === "all") {
    return "border-[color:var(--gilt)]/55 bg-[linear-gradient(135deg,var(--vellum),var(--panel-soft))] text-[var(--foreground)] shadow-[inset_4px_0_0_var(--gilt),0_14px_36px_rgba(11,28,22,0.075)]";
  }
  return "border-[var(--line)] bg-[var(--panel-soft)] text-[var(--foreground)] shadow-[inset_4px_0_0_var(--liturgical-accent)]";
}

function getDefaultVariant(item: MassOrderItem) {
  if (!item.variants || item.variants.length === 0) {
    return null;
  }
  return item.variants.find(
    (variant) => variant.id === item.defaultVariantId,
  ) ?? null;
}

function getSelectedVariant(
  item: MassOrderItem,
  selectedId: string | undefined,
) {
  if (!item.variants || item.variants.length === 0) {
    return null;
  }
  return (
    item.variants.find((variant) => variant.id === selectedId) ??
    getDefaultVariant(item)
  );
}

function getRenderedLines(
  item: MassOrderItem,
  selectedVariant: MassDialogueVariant | null,
): readonly MassDialogueLine[] {
  const lines = [
    ...(item.lines ?? []),
    ...(selectedVariant?.lines ?? []),
  ];
  if (lines.length > 0) {
    return lines;
  }

  return [
    ...(item.cue
      ? [{ role: "rubric" as const, text: item.cue }]
      : []),
    ...(item.response
      ? [
          {
            role: "people" as const,
            text: item.response,
            label: item.responseLabel,
          },
        ]
      : []),
  ];
}

type RenderedDialogueLine = {
  line: MassDialogueLine;
  lineIndex: number;
  variantId: string | null;
};

function getRenderedLineEntries(
  item: MassOrderItem,
  selectedVariant: MassDialogueVariant | null,
): readonly RenderedDialogueLine[] {
  const baseLines = item.lines ?? [];
  const variantLines = selectedVariant?.lines ?? [];
  const rendered = [
    ...baseLines.map((line, lineIndex) => ({
      line,
      lineIndex,
      variantId: null,
    })),
    ...variantLines.map((line, variantLineIndex) => ({
      line,
      lineIndex: baseLines.length + variantLineIndex,
      variantId: selectedVariant?.id ?? null,
    })),
  ];

  if (rendered.length > 0) {
    return rendered;
  }

  return getFallbackLines(item).map((line, lineIndex) => ({
    line,
    lineIndex,
    variantId: null,
  }));
}

function buildMassFollowTargets({
  followOrderBase,
  idPrefix,
  items,
  revealItem,
}: {
  followOrderBase: number;
  idPrefix: string;
  items: readonly MassOrderItem[];
  revealItem: (itemKey: string, variantId: string | null) => void;
}): MassFollowTargetRegistration[] {
  return items.flatMap((item, itemIndex) => {
    const itemKey = getItemKey(item, itemIndex);
    const baseLines =
      item.lines && item.lines.length > 0
        ? item.lines
        : getFallbackLines(item);
    const baseTargets = buildLineTargets({
      followOrderBase,
      idPrefix,
      item,
      itemIndex,
      lines: baseLines,
      lineOffset: 0,
      reveal: () => revealItem(itemKey, null),
      variant: null,
    });
    const variantTargets = (item.variants ?? []).flatMap((variant) =>
      buildLineTargets({
        followOrderBase,
        idPrefix,
        item,
        itemIndex,
        lines: variant.lines,
        lineOffset: item.lines?.length ?? 0,
        reveal: () => revealItem(itemKey, variant.id),
        variant,
      }),
    );

    return [...baseTargets, ...variantTargets];
  });
}

function buildLineTargets({
  followOrderBase,
  idPrefix,
  item,
  itemIndex,
  lines,
  lineOffset,
  reveal,
  variant,
}: {
  followOrderBase: number;
  idPrefix: string;
  item: MassOrderItem;
  itemIndex: number;
  lines: readonly MassDialogueLine[];
  lineOffset: number;
  reveal: () => void;
  variant: MassDialogueVariant | null;
}): MassFollowTargetRegistration[] {
  return lines.flatMap((line, sourceLineIndex) => {
    if (line.role === "rubric") {
      return [];
    }

    const lineIndex = lineOffset + sourceLineIndex;
    return splitMassSpeechText(line.text).map((text, chunkIndex) => {
      const id = getFollowTargetId({
        chunkIndex,
        idPrefix,
        itemId: item.id,
        itemIndex,
        lineIndex,
        variantId: variant?.id ?? null,
      });

      return {
        elementId: id,
        id,
        label: [
          item.title,
          variant?.label,
          line.label ?? ROLE_LABELS[line.role],
        ].filter(Boolean).join(" · "),
        order:
          followOrderBase +
          itemIndex * 1_000 +
          lineIndex * 100 +
          chunkIndex,
        requiresUniqueMatch: variant !== null,
        reveal,
        text,
      };
    });
  });
}

function getFallbackLines(item: MassOrderItem): readonly MassDialogueLine[] {
  return [
    ...(item.cue
      ? [{ role: "rubric" as const, text: item.cue }]
      : []),
    ...(item.response
      ? [
          {
            role: "people" as const,
            text: item.response,
            label: item.responseLabel,
          },
        ]
      : []),
  ];
}

function getFollowTargetId({
  chunkIndex,
  idPrefix,
  itemId,
  itemIndex,
  lineIndex,
  variantId,
}: DialogueFollowMetadata & { chunkIndex: number }) {
  return [
    "mass-follow",
    toIdFragment(idPrefix),
    `${toIdFragment(itemId)}-${itemIndex}`,
    variantId ? `variant-${toIdFragment(variantId)}` : "base",
    `line-${lineIndex}`,
    `chunk-${chunkIndex}`,
  ].join("-");
}

function getSpokenRoles(lines: readonly MassDialogueLine[]) {
  const roles = new Set(lines.map((line) => line.role));
  return SPOKEN_ROLES.filter((role) => roles.has(role));
}

function getItemKey(item: MassOrderItem, index: number) {
  return `${item.id}:${index}`;
}

function toIdFragment(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "mass";
}
