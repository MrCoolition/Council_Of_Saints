"use client";

import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  ChevronRight,
  Church,
  Clock3,
  Cross,
  Settings2,
} from "lucide-react";
import Link from "next/link";
import {
  type CSSProperties,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { AskFatherKoverman } from "@/components/father-koverman";
import {
  MassFollowProvider,
  type MassFollowTargetRegistration,
  useMassFollowState,
  useMassFollowTargets,
} from "@/components/mass-follow-provider";
import {
  APOSTLES_CREED_TEXT,
  GLORIA_TEXT,
  MASS_ORDER_SECTIONS,
  NICENE_CREED_TEXT,
  type MassOrderItem,
  type MassOrderSection,
  type MassPosture,
} from "@/lib/mass-order";
import { MassDialogueOrder } from "@/components/mass-dialogue-order";
import { splitMassSpeechText } from "@/lib/mass-speech-following";
import {
  type HolyMassRiteKind,
  resolveSaturdayMassContext,
  type SaturdayMassMode,
  type SaturdayMassOverride,
} from "@/lib/holy-mass";
import {
  getScriptureBook,
  getScriptureHref,
  parseScriptureReference,
  type ScriptureReturnSource,
} from "@/lib/scripture";
import type { UsccbLectionarySection } from "@/lib/usccb-lectionary";
import type {
  HolyMassCelebrationView,
  HolyMassLoadedOption,
  HolyMassLoadedPsalm,
  HolyMassLoadedSelection,
  HolyMassPageData,
  HolyMassReadingSet,
} from "@/server/holy-mass";

const DEFAULT_ANTICIPATED_CUTOFF = "16:00";
const SETTINGS_KEY = "sanctum.mass.settings.v1";
const PROGRESS_KEY_PREFIX = "sanctum.mass.progress.v1";

type MassSettings = {
  anticipatedCutoff: string;
  readingTranslation: MassReadingTranslation;
};

type MassReadingTranslation = "us-lectionary" | "douay-rheims";

const MASS_TRANSLATION_CHOICES: readonly {
  label: string;
  value: MassReadingTranslation;
}[] = [
  { label: "At Mass (U.S.)", value: "us-lectionary" },
  { label: "Douay-Rheims", value: "douay-rheims" },
];

const DEFAULT_SETTINGS: MassSettings = {
  anticipatedCutoff: DEFAULT_ANTICIPATED_CUTOFF,
  readingTranslation: "us-lectionary",
};

const MASS_SETTINGS_EVENT = "sanctum:mass-settings";
const SERVER_SETTINGS_SNAPSHOT = JSON.stringify(DEFAULT_SETTINGS);

type SpecialRiteKind = Extract<
  HolyMassRiteKind,
  "good-friday" | "holy-saturday" | "easter-vigil"
>;

type SpecialRiteSection = {
  id: string;
  title: string;
  readings?: boolean;
  items: readonly MassOrderItem[];
};

const SPECIAL_RITE_SECTIONS: Record<
  SpecialRiteKind,
  readonly SpecialRiteSection[]
> = {
  "good-friday": [
    {
      id: "silent-entrance",
      title: "Silent Entrance",
      items: [
        {
          id: "prostration",
          title: "Entrance and Prostration",
          posture: "Kneel",
          cue: "The ministers enter in silence. Kneel and pray in silence.",
        },
        {
          id: "opening-prayer",
          title: "Opening Prayer",
          posture: "Stand",
          response: "Amen.",
        },
      ],
    },
    {
      id: "passion-word",
      title: "Liturgy of the Word",
      readings: true,
      items: [
        {
          id: "passion-reading",
          title: "The Passion of the Lord",
          posture: "Stand",
          cue: "Listen to the Passion. Kneel in silence at the Lord’s death.",
        },
        {
          id: "homily-silence",
          title: "Homily and Sacred Silence",
          posture: "Sit",
        },
        {
          id: "solemn-intercessions",
          title: "Solemn Intercessions",
          posture: "Stand",
          cue: "Pray each intention; kneel and rise as directed.",
          response: "Amen.",
        },
      ],
    },
    {
      id: "adoration-cross",
      title: "Adoration of the Holy Cross",
      items: [
        {
          id: "showing-cross",
          title: "Showing of the Cross",
          posture: "Stand",
          response: "Come, let us adore.",
        },
        {
          id: "veneration-cross",
          title: "Veneration of the Cross",
          posture: "Stand",
          cue: "Approach and reverence the Cross by a genuflection, bow, or touch.",
        },
      ],
    },
    {
      id: "good-friday-communion",
      title: "Holy Communion",
      items: [
        {
          id: "lords-prayer",
          title: "The Lord’s Prayer",
          posture: "Stand",
          cue: "Pray with the whole assembly.",
        },
        {
          id: "communion-invitation",
          title: "Invitation to Communion",
          posture: "Kneel",
          response:
            "Lord, I am not worthy that you should enter under my roof, but only say the word and my soul shall be healed.",
        },
        {
          id: "communion-response",
          title: "Holy Communion",
          posture: "Stand",
          responseLabel: "The Body of Christ",
          response: "Amen.",
        },
      ],
    },
    {
      id: "departure-silence",
      title: "Departure in Silence",
      items: [
        {
          id: "prayer-after-communion",
          title: "Prayer after Communion",
          posture: "Stand",
          response: "Amen.",
        },
        {
          id: "prayer-over-people",
          title: "Prayer over the People",
          posture: "Kneel",
          response: "Amen.",
        },
        {
          id: "silent-departure",
          title: "Depart in Silence",
          posture: "Stand",
        },
      ],
    },
  ],
  "holy-saturday": [
    {
      id: "tomb",
      title: "At the Lord’s Tomb",
      items: [
        {
          id: "silence",
          title: "Sacred Silence",
          posture: "Sit or kneel",
          cue: "Remain with the Lord in his rest in the tomb.",
        },
        {
          id: "hours",
          title: "Liturgy of the Hours",
          posture: "Sit",
          cue: "Pray the Office of Readings and Morning Prayer.",
        },
      ],
    },
    {
      id: "waiting",
      title: "The Church Waits",
      items: [
        {
          id: "altar-bare",
          title: "Prayer and Fasting",
          posture: "Sit or kneel",
          cue: "The altar remains bare; Mass is not celebrated during the day.",
        },
      ],
    },
    {
      id: "vigil-choice",
      title: "Easter Vigil",
      items: [
        {
          id: "after-nightfall",
          title: "In the Holy Night",
          posture: "Stand",
          cue: "Enter the Vigil at the parish time, after nightfall.",
        },
      ],
    },
  ],
  "easter-vigil": [
    {
      id: "lucernarium",
      title: "The Solemn Beginning of the Vigil",
      items: [
        {
          id: "new-fire",
          title: "Blessing of the Fire and Paschal Candle",
          posture: "Stand",
        },
        {
          id: "light-christ",
          title: "Procession of the Paschal Candle",
          posture: "Stand",
          responseLabel: "The Light of Christ",
          response: "Thanks be to God.",
        },
        {
          id: "exsultet",
          title: "Easter Proclamation — Exsultet",
          posture: "Stand",
          cue: "Hold the lighted candle and receive the proclamation.",
        },
      ],
    },
    {
      id: "vigil-word",
      title: "Liturgy of the Word",
      readings: true,
      items: [
        {
          id: "old-testament",
          title: "Old Testament Readings and Psalms",
          posture: "Sit",
          cue: "Listen as salvation history unfolds; answer each psalm and prayer.",
        },
        {
          id: "vigil-gloria",
          title: "Gloria",
          posture: "Stand",
          lines: [{ role: "all", text: GLORIA_TEXT }],
        },
        {
          id: "vigil-collect",
          title: "Collect",
          posture: "Stand",
          lines: [
            { role: "priest", text: "Let us pray." },
            {
              role: "priest",
              text: "The priest proclaims the Collect of the Easter Vigil.",
            },
            { role: "people", text: "Amen." },
          ],
        },
        {
          id: "vigil-epistle",
          title: "Epistle",
          posture: "Sit",
          cue: "Receive the apostolic reading and answer: Thanks be to God.",
        },
        {
          id: "vigil-alleluia-gospel",
          title: "Solemn Alleluia and Gospel",
          posture: "Stand",
          cue: "Rise for the solemn Alleluia and the Gospel of the Resurrection.",
        },
        {
          id: "vigil-homily",
          title: "Homily",
          posture: "Sit",
          cue: "Receive the preaching of the Resurrection.",
        },
      ],
    },
    {
      id: "baptismal-liturgy",
      title: "Baptismal Liturgy",
      items: [
        {
          id: "saints-water",
          title: "Litany of the Saints and Blessing of Water",
          posture: "Stand",
        },
        {
          id: "baptism-renewal",
          title: "Baptism and Renewal of Baptismal Promises",
          posture: "Stand",
          cue: "Renounce sin, profess the faith, and receive the blessed water.",
        },
        {
          id: "vigil-universal-prayer",
          title: "Universal Prayer",
          posture: "Stand",
          cue: "Join the prayer of the newly baptized and the whole Church.",
        },
      ],
    },
    {
      id: "vigil-eucharist",
      title: "Liturgy of the Eucharist",
      items: MASS_ORDER_SECTIONS[2].items,
    },
    {
      id: "vigil-dismissal",
      title: "Easter Dismissal",
      items: [
        {
          id: "easter-blessing",
          title: "Solemn Blessing",
          posture: "Stand",
          response: "Amen.",
        },
        {
          id: "easter-dismissal",
          title: "Dismissal",
          posture: "Stand",
          response: "Thanks be to God, alleluia, alleluia.",
        },
      ],
    },
  ],
};

const HOLY_THURSDAY_TRANSFER_ITEMS: readonly MassOrderItem[] = [
  {
    id: "transfer-sacrament",
    title: "Transfer of the Most Blessed Sacrament",
    posture: "Stand",
    cue: "Join the procession to the place of repose.",
  },
  {
    id: "adoration-repose",
    title: "Adoration at the Place of Repose",
    posture: "Kneel",
    cue: "Remain with the Lord in prayer. The celebration ends in silence.",
  },
];

function getMassSections(riteKind: HolyMassRiteKind) {
  if (riteKind !== "holy-thursday") {
    return MASS_ORDER_SECTIONS;
  }

  return MASS_ORDER_SECTIONS.map((section) =>
    section.id === "dismissal"
      ? {
          ...section,
          title: "Transfer of the Most Blessed Sacrament",
          shortTitle: "Reposition",
        }
      : section,
  );
}

export function HolyMassCompanion({
  data,
  saturdayOverride,
}: {
  data: HolyMassPageData;
  saturdayOverride: SaturdayMassOverride;
}) {
  const settings = useMassSettings();
  const [localClock, setLocalClock] = useState({
    localDate: data.civilDate,
    localTime: data.civilTime,
  });

  useEffect(() => {
    const updateClock = () => {
      const localNow = getLocalDateTime(data.timezone);
      if (localNow.localDate !== data.civilDate) {
        window.location.reload();
        return;
      }
      setLocalClock(localNow);
    };

    const frame = window.requestAnimationFrame(updateClock);
    const timer = window.setInterval(updateClock, 30_000);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearInterval(timer);
    };
  }, [data.civilDate, data.timezone]);

  const holySaturday = data.daytime.riteKind === "holy-saturday";
  const mode: SaturdayMassMode = data.anticipated
    ? holySaturday
      ? saturdayOverride === "anticipated"
        ? "anticipated"
        : "daytime"
      : resolveSaturdayMassContext({
          civilDate: data.civilDate,
          civilTime: localClock.localTime,
          daytime: data.daytime,
          anticipated: data.anticipated,
          anticipatedCutoff: settings.anticipatedCutoff,
          override: saturdayOverride,
        }).mode
    : "daytime";

  const celebration =
    mode === "anticipated" && data.anticipated
      ? data.anticipated
      : data.daytime;

  const saturdayControls = data.anticipated ? (
    <SaturdayMassControls
      cutoff={settings.anticipatedCutoff}
      mode={saturdayOverride}
      onCutoffChange={(anticipatedCutoff) =>
        saveMassSettings({ ...settings, anticipatedCutoff })
      }
      vigil={holySaturday}
    />
  ) : null;

  const experience = (
    celebration.riteKind === "good-friday" ||
    celebration.riteKind === "holy-saturday" ||
    celebration.riteKind === "easter-vigil"
  ) ? (
      <SpecialLiturgyExperience
        celebration={celebration}
        saturdayControls={saturdayControls}
      />
  ) : (
    <MassExperience
      celebration={celebration}
      onReadingTranslationChange={(readingTranslation) =>
        saveMassSettings({ ...settings, readingTranslation })
      }
      readingTranslation={settings.readingTranslation}
      saturdayControls={saturdayControls}
    />
  );

  return (
    <MassFollowProvider key={celebration.id}>{experience}</MassFollowProvider>
  );
}

function SpecialLiturgyExperience({
  celebration,
  saturdayControls,
}: {
  celebration: HolyMassCelebrationView;
  saturdayControls: ReactNode;
}) {
  const riteKind = celebration.riteKind as SpecialRiteKind;
  const sections = SPECIAL_RITE_SECTIONS[riteKind];
  const liturgicalAccent = getLiturgicalAccent(celebration.liturgicalColor);
  const style = {
    "--liturgical-accent": liturgicalAccent,
  } as CSSProperties;
  const label =
    riteKind === "good-friday"
      ? "Celebration of the Passion of the Lord"
      : riteKind === "holy-saturday"
        ? "Holy Saturday"
        : "Easter Vigil in the Holy Night";
  const beginLabel =
    riteKind === "good-friday"
      ? "Begin the Celebration"
      : riteKind === "holy-saturday"
        ? "Enter the Silence"
        : "Begin the Easter Vigil";

  return (
    <main
      className="min-h-screen bg-[var(--background)] text-[var(--foreground)]"
      style={style}
    >
      <section className="mass-sanctuary relative isolate overflow-hidden border-b border-[color:var(--gilt)]/30 bg-[var(--sanctuary-night)] text-[var(--vellum)]">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_18%,color-mix(in_srgb,var(--liturgical-accent)_25%,transparent),transparent_28rem)]"
        />
        <div aria-hidden className="mass-cross-watermark">
          <span />
        </div>
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-5 pb-14 pt-12 sm:px-8 sm:pb-20 sm:pt-16 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-end lg:px-10">
          <div className="max-w-4xl">
            <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--gilt-light)]">
              <span className="inline-flex items-center gap-2">
                <Cross aria-hidden className="size-4" />
                {label}
              </span>
              <span aria-hidden className="size-1 rounded-full bg-current opacity-60" />
              <time dateTime={celebration.localDate}>{celebration.dateLabel}</time>
            </div>
            <h1 className="mt-5 max-w-4xl font-serif text-4xl font-semibold leading-[1.02] tracking-[-0.025em] text-[var(--vellum)] sm:text-6xl lg:text-7xl">
              {celebration.title}
            </h1>
            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-[var(--parchment)]/80">
              <span>{celebration.rank}</span>
              <span>{celebration.liturgicalColor}</span>
            </div>
            <a
              className="mt-8 inline-flex min-h-13 items-center justify-center gap-3 rounded-full bg-[var(--gilt-light)] px-6 text-sm font-bold text-[var(--sanctuary-night)] shadow-[0_16px_34px_rgba(0,0,0,0.24)] transition hover:-translate-y-0.5 hover:bg-[var(--vellum)]"
              href={`#special-${sections[0].id}`}
            >
              {beginLabel}
              <ArrowDown aria-hidden className="size-4" />
            </a>
          </div>
          <div className="lg:justify-self-end">{saturdayControls}</div>
        </div>
      </section>

      <nav
        aria-label={label}
        className="sticky top-16 z-30 border-b border-[var(--line)] bg-[color:var(--vellum)]/94 shadow-[0_8px_28px_rgba(11,28,22,0.06)] backdrop-blur-xl"
      >
        <div className="mx-auto flex w-full max-w-5xl snap-x overflow-x-auto px-2 sm:px-6">
          {sections.map((section, index) => (
            <a
              className="flex min-h-16 min-w-[8rem] flex-1 snap-start items-center justify-center gap-2 whitespace-nowrap px-3 text-xs font-bold text-[var(--muted)] transition hover:text-[color:var(--liturgical-accent)]"
              href={`#special-${section.id}`}
              key={section.id}
            >
              <span className="inline-flex size-6 items-center justify-center rounded-full border border-[var(--line)] text-[0.65rem]">
                {index + 1}
              </span>
              {section.title}
            </a>
          ))}
        </div>
      </nav>

      <div className="mx-auto w-full max-w-5xl px-4 pb-24 pt-10 sm:px-6 sm:pt-16 lg:px-8">
        {sections.map((section, index) => (
          <section
            aria-labelledby={`special-${section.id}-heading`}
            className="scroll-mt-36 border-b border-[var(--line)] py-12 sm:py-16"
            id={`special-${section.id}`}
            key={section.id}
          >
            <header className="mb-8 grid gap-4 sm:grid-cols-[4rem_minmax(0,1fr)] sm:items-center">
              <span className="inline-flex size-14 items-center justify-center rounded-full border border-[color:var(--liturgical-accent)]/35 bg-[color:var(--liturgical-accent)]/8 font-serif text-xl text-[color:var(--liturgical-accent)]">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div>
                <div className="mb-2 h-px w-14 bg-[color:var(--liturgical-accent)]" />
                <h2
                  className="font-serif text-3xl font-semibold tracking-tight text-[var(--foreground)] sm:text-5xl"
                  id={`special-${section.id}-heading`}
                >
                  {section.title}
                </h2>
              </div>
            </header>

            {section.readings ? (
              <a
                className="mb-6 inline-flex min-h-12 items-center gap-2 rounded-full bg-[var(--sanctuary-night)] px-5 text-sm font-bold text-[var(--vellum)] transition hover:bg-[var(--ecclesial-green)]"
                href={celebration.officialReadingsUrl}
                rel="noreferrer"
                target="_blank"
              >
                <BookOpen aria-hidden className="size-4" />
                Sacred readings
              </a>
            ) : null}

            <OrderItems
              followOrderBase={index * 100_000}
              idPrefix={`special-${section.id}`}
              items={section.items}
            />

            {riteKind === "holy-saturday" &&
            section.id === "vigil-choice" ? (
              <Link
                className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-full bg-[var(--gilt-light)] px-5 text-sm font-bold text-[var(--sanctuary-night)]"
                href="/mass?form=anticipated"
              >
                Enter the Easter Vigil
                <ChevronRight aria-hidden className="size-4" />
              </Link>
            ) : null}
          </section>
        ))}
      </div>
    </main>
  );
}

function MassExperience({
  celebration,
  onReadingTranslationChange,
  readingTranslation,
  saturdayControls,
}: {
  celebration: HolyMassCelebrationView;
  onReadingTranslationChange: (translation: MassReadingTranslation) => void;
  readingTranslation: MassReadingTranslation;
  saturdayControls: ReactNode;
}) {
  const massSections = useMemo(
    () => getMassSections(celebration.riteKind),
    [celebration.riteKind],
  );
  const [activeSection, setActiveSection] = useState(
    massSections[0].id,
  );
  const [readingSetId, setReadingSetId] = useState<string | null>(
    celebration.readingSets[0]?.id ?? celebration.options[0]?.id ?? null,
  );
  const selectedReadingSet =
    celebration.readingSets.find((readingSet) => readingSet.id === readingSetId) ??
    celebration.readingSets[0] ??
    null;
  const selectedReadingOption = selectedReadingSet
    ? celebration.options.find(
        (option) => option.id === selectedReadingSet.douayOptionId,
      ) ?? null
    : celebration.options.find((option) => option.id === readingSetId) ??
      celebration.options[0] ??
      null;
  const selectedContextReadingId =
    selectedReadingSet?.id ?? selectedReadingOption?.id ?? null;
  const liturgicalAccent = getLiturgicalAccent(
    celebration.liturgicalColor,
  );
  const style = {
    "--liturgical-accent": liturgicalAccent,
  } as CSSProperties;

  useEffect(() => {
    const progressKey = `${PROGRESS_KEY_PREFIX}:${celebration.id}`;
    const storedSection = window.localStorage.getItem(progressKey);
    const validSection = massSections.find(
      (section) => section.id === storedSection,
    );

    const storedProgressFrame = validSection
      ? window.requestAnimationFrame(() => setActiveSection(validSection.id))
      : null;

    const elements = massSections.map((section) =>
      document.getElementById(`rite-${section.id}`),
    ).filter((element): element is HTMLElement => Boolean(element));
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio)
          .at(0);

        if (!visible) {
          return;
        }

        const sectionId = visible.target.id.replace("rite-", "");
        const section = massSections.find(
          (candidate) => candidate.id === sectionId,
        );
        if (!section) {
          return;
        }

        setActiveSection(section.id);
        window.localStorage.setItem(progressKey, section.id);
      },
      { rootMargin: "-28% 0px -58% 0px", threshold: [0.05, 0.3, 0.7] },
    );

    elements.forEach((element) => observer.observe(element));
    return () => {
      if (storedProgressFrame !== null) {
        window.cancelAnimationFrame(storedProgressFrame);
      }
      observer.disconnect();
    };
  }, [celebration.id, massSections]);

  const currentIndex = massSections.findIndex(
    (section) => section.id === activeSection,
  );
  const progress = ((Math.max(currentIndex, 0) + 1) / massSections.length) * 100;
  const hasProgress = activeSection !== massSections[0].id;

  function beginMass() {
    const target = document.getElementById(`rite-${activeSection}`);
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <main
      className="min-h-screen bg-[var(--background)] text-[var(--foreground)]"
      style={style}
    >
      <section className="mass-sanctuary relative isolate overflow-hidden border-b border-[color:var(--gilt)]/30 bg-[var(--sanctuary-night)] text-[var(--vellum)]">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_18%,color-mix(in_srgb,var(--liturgical-accent)_25%,transparent),transparent_28rem),linear-gradient(145deg,transparent_20%,rgba(255,255,255,0.025)_50%,transparent_80%)]"
        />
        <div aria-hidden className="mass-cross-watermark">
          <span />
        </div>

        <div className="mx-auto grid w-full max-w-7xl gap-10 px-5 pb-14 pt-12 sm:px-8 sm:pb-20 sm:pt-16 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-end lg:px-10">
          <div className="max-w-4xl">
            <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--gilt-light)]">
              <span className="inline-flex items-center gap-2">
                <Church aria-hidden className="size-4" />
                {celebration.mode === "anticipated"
                  ? "Sunday anticipated"
                  : "Holy Mass"}
              </span>
              <span aria-hidden className="size-1 rounded-full bg-current opacity-60" />
              <time dateTime={celebration.localDate}>{celebration.dateLabel}</time>
            </div>

            <h1 className="mt-5 max-w-4xl font-serif text-4xl font-semibold leading-[1.02] tracking-[-0.025em] text-[var(--vellum)] sm:text-6xl lg:text-7xl">
              {celebration.title}
            </h1>

            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-[var(--parchment)]/80">
              <span className="inline-flex items-center gap-2">
                <span
                  aria-hidden
                  className="size-2.5 rounded-full border border-white/30 bg-[color:var(--liturgical-accent)] shadow-[0_0_0_4px_rgba(255,255,255,0.06)]"
                />
                {celebration.liturgicalColor}
              </span>
              <span>{celebration.rank}</span>
              {celebration.cycleLabel ? <span>{celebration.cycleLabel}</span> : null}
              {celebration.lectionaryNumbers.length > 0 ? (
                <span>Lectionary {celebration.lectionaryNumbers.join(" / ")}</span>
              ) : null}
            </div>

            <button
              className="mt-8 inline-flex min-h-13 items-center justify-center gap-3 rounded-full bg-[var(--gilt-light)] px-6 text-sm font-bold text-[var(--sanctuary-night)] shadow-[0_16px_34px_rgba(0,0,0,0.24)] transition hover:-translate-y-0.5 hover:bg-[var(--vellum)]"
              onClick={beginMass}
              type="button"
            >
              {hasProgress ? "Continue Holy Mass" : "Begin Holy Mass"}
              <ArrowDown aria-hidden className="size-4" />
            </button>
          </div>

          <div className="lg:justify-self-end">{saturdayControls}</div>
        </div>
      </section>

      <MassRiteRail
        activeSection={activeSection}
        progress={progress}
        sections={massSections}
      />

      <div className="mx-auto w-full max-w-5xl px-4 pb-24 pt-10 sm:px-6 sm:pt-16 lg:px-8">
        <RiteSection
          accent={liturgicalAccent}
          fatherContext={{
            kind: "mass",
            localDate: celebration.localDate,
            mode: celebration.mode,
            sectionId: massSections[0].id,
            readingOptionId: selectedContextReadingId,
            readingTranslation,
          }}
          nextSection={massSections[1]}
          section={massSections[0]}
        >
          <IntroductoryRites
            gloria={celebration.profile.requirements.gloria}
            items={MASS_ORDER_SECTIONS[0].items}
            riteKind={celebration.riteKind}
            sprinklingRite={celebration.profile.requirements.sprinklingRite}
          />
        </RiteSection>

        <RiteSection
          accent={liturgicalAccent}
          fatherContext={{
            kind: "mass",
            localDate: celebration.localDate,
            mode: celebration.mode,
            sectionId: massSections[1].id,
            readingOptionId: selectedContextReadingId,
            readingTranslation,
          }}
          nextSection={massSections[2]}
          section={massSections[1]}
        >
          <LiturgyOfTheWord
            celebration={celebration}
            onReadingSetChange={setReadingSetId}
            onReadingTranslationChange={onReadingTranslationChange}
            readingOption={selectedReadingOption}
            readingSet={selectedReadingSet}
            readingTranslation={readingTranslation}
          />
        </RiteSection>

        <RiteSection
          accent={liturgicalAccent}
          fatherContext={{
            kind: "mass",
            localDate: celebration.localDate,
            mode: celebration.mode,
            sectionId: massSections[2].id,
            readingOptionId: selectedContextReadingId,
            readingTranslation,
          }}
          nextSection={massSections[3]}
          section={massSections[2]}
        >
          <OrderItems
            followOrderBase={300_000}
            idPrefix="eucharist"
            items={MASS_ORDER_SECTIONS[2].items}
            title="Sacrifice and Sacred Banquet"
          />
        </RiteSection>

        <RiteSection
          accent={liturgicalAccent}
          fatherContext={{
            kind: "mass",
            localDate: celebration.localDate,
            mode: celebration.mode,
            sectionId: massSections[3].id,
            readingOptionId: selectedContextReadingId,
            readingTranslation,
          }}
          nextSection={null}
          section={massSections[3]}
        >
          <OrderItems
            followOrderBase={400_000}
            idPrefix="concluding"
            items={
              celebration.riteKind === "holy-thursday"
                ? HOLY_THURSDAY_TRANSFER_ITEMS
                : MASS_ORDER_SECTIONS[3].items
            }
            title={
              celebration.riteKind === "holy-thursday"
                ? "The Sacrament Is Carried to Repose"
                : "Sent Forth in Peace"
            }
          />
        </RiteSection>

        <div className="mx-auto mt-16 flex max-w-xl flex-col items-center border-t border-[var(--line)] pt-10 text-center">
          <Cross aria-hidden className="size-6 text-[color:var(--liturgical-accent)]" />
          <p className="mt-4 font-serif text-2xl italic text-[var(--foreground)]">
            Deo gratias.
          </p>
        </div>
      </div>
    </main>
  );
}

function SaturdayMassControls({
  cutoff,
  mode,
  onCutoffChange,
  vigil = false,
}: {
  cutoff: string;
  mode: SaturdayMassOverride;
  onCutoffChange: (value: string) => void;
  vigil?: boolean;
}) {
  const choices: {
    href: string;
    label: string;
    value: SaturdayMassOverride;
  }[] = [
    { href: "/mass", label: "Auto", value: "auto" },
    { href: "/mass?form=daytime", label: "Saturday", value: "daytime" },
    {
      href: "/mass?form=anticipated",
      label: vigil ? "Vigil" : "Sunday",
      value: "anticipated",
    },
  ];

  return (
    <div className="w-full max-w-sm rounded-2xl border border-white/15 bg-black/20 p-3 shadow-2xl backdrop-blur-md">
      <div aria-label="Saturday Mass" className="grid grid-cols-3 gap-1" role="group">
        {choices.map((choice) => (
          <Link
            aria-current={mode === choice.value ? "page" : undefined}
            className={[
              "flex min-h-11 items-center justify-center rounded-xl px-2 text-xs font-bold transition",
              mode === choice.value
                ? "bg-[var(--gilt-light)] text-[var(--sanctuary-night)]"
                : "text-[var(--parchment)] hover:bg-white/10",
            ].join(" ")}
            href={choice.href}
            key={choice.value}
          >
            {choice.label}
          </Link>
        ))}
      </div>

      {!vigil ? <details className="group mt-2">
        <summary className="flex min-h-11 cursor-pointer items-center justify-between rounded-xl px-3 text-xs font-semibold text-[var(--parchment)]/75 hover:bg-white/5">
          <span className="inline-flex items-center gap-2">
            <Clock3 aria-hidden className="size-4" />
            Parish Mass {formatClockTime(cutoff)}
          </span>
          <Settings2 aria-hidden className="size-4" />
        </summary>
        <label className="mt-1 flex items-center justify-between gap-4 rounded-xl bg-black/20 px-3 py-2 text-xs text-[var(--parchment)]">
          Parish time
          <input
            className="min-h-10 rounded-lg border border-white/15 bg-white/10 px-2 text-sm text-white"
            onChange={(event) => onCutoffChange(event.target.value)}
            type="time"
            value={cutoff}
          />
        </label>
      </details> : null}
    </div>
  );
}

function MassRiteRail({
  activeSection,
  progress,
  sections,
}: {
  activeSection: MassOrderSection["id"];
  progress: number;
  sections: readonly MassOrderSection[];
}) {
  return (
    <div className="sticky top-16 z-30 border-b border-[var(--line)] bg-[color:var(--vellum)]/94 shadow-[0_8px_28px_rgba(11,28,22,0.06)] backdrop-blur-xl">
      <div
        aria-hidden
        className="h-0.5 origin-left bg-[color:var(--liturgical-accent)] transition-transform duration-500"
        style={{ transform: `scaleX(${progress / 100})` }}
      />
      <nav
        aria-label="Order of Mass"
        className="mx-auto flex w-full max-w-5xl snap-x overflow-x-auto px-2 sm:justify-center sm:px-6"
      >
        {sections.map((section, index) => {
          const active = section.id === activeSection;
          return (
            <a
              aria-current={active ? "step" : undefined}
              className={[
                "relative flex min-h-16 min-w-[7rem] snap-start items-center justify-center gap-2 whitespace-nowrap px-3 text-xs font-bold transition sm:min-w-0 sm:flex-1",
                active
                  ? "text-[color:var(--liturgical-accent)]"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]",
              ].join(" ")}
              href={`#rite-${section.id}`}
              key={section.id}
            >
              <span
                aria-hidden
                className={[
                  "inline-flex size-6 items-center justify-center rounded-full border text-[0.65rem]",
                  active
                    ? "border-[color:var(--liturgical-accent)] bg-[color:var(--liturgical-accent)] text-white"
                    : "border-[var(--line)]",
                ].join(" ")}
              >
                {index + 1}
              </span>
              {section.shortTitle}
            </a>
          );
        })}
      </nav>
    </div>
  );
}

function RiteSection({
  accent,
  children,
  fatherContext,
  nextSection,
  section,
}: {
  accent: string;
  children: ReactNode;
  fatherContext: {
    kind: "mass";
    localDate: string;
    mode: "daytime" | "anticipated";
    sectionId: string;
    readingOptionId: string | null;
    readingTranslation: MassReadingTranslation;
  };
  nextSection: MassOrderSection | null;
  section: MassOrderSection;
}) {
  return (
    <section
      aria-labelledby={`rite-${section.id}-heading`}
      className="scroll-mt-36 border-b border-[var(--line)] py-12 sm:py-16"
      id={`rite-${section.id}`}
      style={{ "--section-accent": accent } as CSSProperties}
    >
      <header className="mb-8 grid gap-4 sm:grid-cols-[4rem_minmax(0,1fr)_auto] sm:items-center">
        <span className="inline-flex size-14 items-center justify-center rounded-full border border-[color:var(--section-accent)]/35 bg-[color:var(--section-accent)]/8 font-serif text-xl text-[color:var(--section-accent)]">
          {String(
            MASS_ORDER_SECTIONS.findIndex(
              (candidate) => candidate.id === section.id,
            ) + 1,
          ).padStart(2, "0")}
        </span>
        <div>
          <div className="mb-2 h-px w-14 bg-[color:var(--section-accent)]" />
          <h2
            className="font-serif text-3xl font-semibold tracking-tight text-[var(--foreground)] sm:text-5xl"
            id={`rite-${section.id}-heading`}
          >
            {section.title}
          </h2>
        </div>
        <AskFatherKoverman
          className="sm:justify-self-end"
          context={fatherContext}
          label={`Ask about ${section.shortTitle}`}
        />
      </header>

      {children}

      {nextSection ? (
        <div className="mt-10 flex justify-end">
          <a
            className="inline-flex min-h-12 items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--vellum)] px-5 text-sm font-bold text-[var(--foreground)] transition hover:border-[color:var(--section-accent)] hover:text-[color:var(--section-accent)]"
            href={`#rite-${nextSection.id}`}
          >
            {nextSection.shortTitle}
            <ChevronRight aria-hidden className="size-4" />
          </a>
        </div>
      ) : null}
    </section>
  );
}

function IntroductoryRites({
  gloria,
  items,
  riteKind,
  sprinklingRite,
}: {
  gloria: boolean;
  items: readonly MassOrderItem[];
  riteKind: HolyMassRiteKind;
  sprinklingRite: boolean;
}) {
  const kyrie = items.find((item) => item.id === "kyrie");
  const ordered: MassOrderItem[] = items
    .filter((item) => item.id !== "kyrie")
    .map((item) => {
      if (item.id !== "penitential-act") {
        return item;
      }

      const penitentialVariants = (item.variants ?? []).flatMap((variant) => {
        const actLines = [...(item.lines ?? []), ...variant.lines];
        if (variant.id === "form-c") {
          return [{ ...variant, lines: actLines }];
        }

        return (kyrie?.variants ?? []).map((kyrieVariant) => ({
          id: `${variant.id}-${kyrieVariant.id}`,
          label: `${variant.label} + ${kyrieVariant.label} Kyrie`,
          lines: [
            ...actLines,
            {
              role: "rubric" as const,
              text: "The Kyrie follows.",
            },
            ...kyrieVariant.lines,
          ],
        }));
      });

      return {
        ...item,
        title: sprinklingRite
          ? "Penitential Act, Kyrie, or Sprinkling Rite"
          : "Penitential Act and Kyrie",
        lines: [],
        defaultVariantId: "form-a-english",
        variants: sprinklingRite
          ? [
              ...penitentialVariants,
              {
                id: "sprinkling",
                label: "Sprinkling Rite",
                lines: [
                  {
                    role: "rubric" as const,
                    text: "The priest blesses the water and sprinkles the assembly in remembrance of Baptism.",
                  },
                  { role: "people" as const, text: "Amen." },
                  {
                    role: "all" as const,
                    text: "Join the appointed antiphon or song while the assembly is sprinkled.",
                  },
                ],
              },
            ]
          : penitentialVariants,
      };
    });
  if (riteKind === "palm-sunday") {
    const collect = ordered.find((item) => item.id === "collect");
    ordered.splice(0, ordered.length, {
      id: "commemoration-entrance",
      title: "Commemoration of the Lord's Entrance",
      posture: "Stand",
      defaultVariantId: "procession",
      variants: [
        {
          id: "procession",
          label: "Procession",
          lines: [
            {
              role: "rubric",
              text: "Gather at the appointed place with palms. The priest greets the people, blesses the branches, and proclaims the prayer.",
            },
            { role: "people", text: "And with your spirit." },
            { role: "people", text: "Amen." },
            {
              role: "deacon",
              text: "The Gospel of the Lord's entrance into Jerusalem is proclaimed.",
            },
            { role: "people", text: "Glory to you, O Lord." },
            { role: "people", text: "Praise to you, Lord Jesus Christ." },
            {
              role: "rubric",
              text: "Join the procession to the church, acclaiming Christ the King. Mass continues with the Collect.",
            },
          ],
        },
        {
          id: "solemn-entrance",
          label: "Solemn Entrance",
          lines: [
            {
              role: "rubric",
              text: "At the church entrance, hold the blessed palm and join the antiphon. The blessing and Gospel are celebrated without a procession from another place.",
            },
            { role: "people", text: "Hosanna in the highest." },
            {
              role: "rubric",
              text: "The ministers enter the sanctuary. Mass continues with the Collect.",
            },
          ],
        },
        {
          id: "simple-entrance",
          label: "Simple Entrance",
          lines: [
            {
              role: "rubric",
              text: "Join the entrance antiphon and follow the simple entrance used by the parish. Mass continues with the Collect.",
            },
            { role: "people", text: "Hosanna in the highest." },
          ],
        },
      ],
    }, ...(collect ? [collect] : []));
  }
  if (gloria) {
    const collectIndex = ordered.findIndex((item) => item.id === "collect");
    ordered.splice(collectIndex, 0, {
      id: "gloria",
      title: "Gloria",
      posture: "Stand",
      lines: [{ role: "all", text: GLORIA_TEXT }],
    });
  }

  return (
    <OrderItems
      followOrderBase={0}
      idPrefix="introductory"
      items={ordered}
      title="Gathered in the Name of the Lord"
    />
  );
}

function LiturgyOfTheWord({
  celebration,
  onReadingSetChange,
  onReadingTranslationChange,
  readingOption,
  readingSet,
  readingTranslation,
}: {
  celebration: HolyMassCelebrationView;
  onReadingSetChange: (readingSetId: string) => void;
  onReadingTranslationChange: (translation: MassReadingTranslation) => void;
  readingOption: HolyMassLoadedOption | null;
  readingSet: HolyMassReadingSet | null;
  readingTranslation: MassReadingTranslation;
}) {
  const wordRites: MassOrderItem[] = [MASS_ORDER_SECTIONS[1].items[0]];

  if (celebration.riteKind === "holy-thursday") {
    wordRites.push({
      id: "washing-feet",
      title: "Washing of Feet (when celebrated)",
      posture: "Sit",
      lines: [
        {
          role: "rubric",
          text: "Join the chant and contemplate the Lord's commandment of charity.",
        },
      ],
    });
  }

  if (celebration.profile.requirements.creed) {
    wordRites.push({
      id: "creed",
      title: "Profession of Faith",
      posture: "Stand",
      lines: [
        {
          role: "rubric",
          text: "Bow profoundly at the words of the Incarnation.",
        },
      ],
      defaultVariantId: "nicene",
      variants: [
        {
          id: "nicene",
          label: "Nicene Creed",
          lines: [{ role: "all", text: NICENE_CREED_TEXT }],
        },
        {
          id: "apostles",
          label: "Apostles' Creed",
          lines: [{ role: "all", text: APOSTLES_CREED_TEXT }],
        },
      ],
    });
  }

  wordRites.push(MASS_ORDER_SECTIONS[1].items[1]);

  const alternateReadingSetTargets = useMemo(
    () => {
      if (readingTranslation === "us-lectionary") {
        return celebration.readingSets.flatMap((candidateSet) => {
          if (candidateSet.id === readingSet?.id) {
            return [];
          }

          const revealSet = () => onReadingSetChange(candidateSet.id);
          return candidateSet.item.sections.flatMap((section, sectionIndex) =>
            section.lines.flatMap((line, lineIndex) =>
              createMassFollowTargets({
                idPrefix: `usccb-${candidateSet.id}-${section.id}-line-${lineIndex}`,
                label: `${candidateSet.label} · ${section.title}`,
                orderBase: 100_000 + sectionIndex * 10_000 + 100 + lineIndex * 100,
                reveal: revealSet,
                text: line,
              }).map((target) => ({
                ...target,
                requiresUniqueMatch: true,
              })),
            ),
          );
        });
      }

      return celebration.readingSets.flatMap((candidateSet) => {
        if (candidateSet.id === readingSet?.id || !candidateSet.douayOptionId) {
          return [];
        }

        const candidateOption = celebration.options.find(
          (option) => option.id === candidateSet.douayOptionId,
        );
        if (!candidateOption) {
          return [];
        }

        return createDouayOptionFollowTargets({
          followIdPrefix: `douay-${candidateOption.id}`,
          followOrderBase: 100_000,
          option: candidateOption,
          reveal: () => onReadingSetChange(candidateSet.id),
        });
      });
    },
    [
      celebration.options,
      celebration.readingSets,
      onReadingSetChange,
      readingSet?.id,
      readingTranslation,
    ],
  );
  useMassFollowTargets(alternateReadingSetTargets);

  return (
    <div className="space-y-8">
      <MassReadingSetSelector
        onChange={onReadingSetChange}
        readingSets={celebration.readingSets}
        selectedReadingSet={readingSet}
      />

      <MassTranslationToggle
        onChange={onReadingTranslationChange}
        value={readingTranslation}
      />

      <div hidden={readingTranslation !== "us-lectionary"}>
        {readingSet ? (
          <UsccbMassReadings
            followEnabled={readingTranslation === "us-lectionary"}
            followIdPrefix={`usccb-${readingSet.id}`}
            followOrderBase={100_000}
            item={readingSet.item}
            readingSet={readingSet}
            requirements={celebration.profile.requirements}
          />
        ) : celebration.massLectionary &&
          (!readingOption ||
            readingOption.id === "weekday" ||
            readingOption.id === "appointed") ? (
          <UsccbMassReadings
            followEnabled={readingTranslation === "us-lectionary"}
            followIdPrefix={`usccb-${celebration.massLectionary.localDate}`}
            followOrderBase={100_000}
            item={celebration.massLectionary}
            requirements={celebration.profile.requirements}
          />
        ) : readingOption ? (
          <div className="space-y-8">
            <SelectedOfficialReadingSet option={readingOption} />
            <MassReadings
              followEnabled={readingTranslation === "us-lectionary"}
              followIdPrefix={`us-fallback-douay-${readingOption.id}`}
              followOrderBase={100_000}
              key={`us-fallback-${readingOption.id}`}
              option={readingOption}
              requirements={celebration.profile.requirements}
              returnSource={
                celebration.mode === "anticipated"
                  ? "mass-anticipated"
                  : "mass"
              }
            />
          </div>
        ) : (
          <section className="illuminated-panel rounded-3xl border border-[var(--line)] bg-[var(--panel)] p-6 text-center sm:p-10">
            <BookOpen
              aria-hidden
              className="mx-auto size-7 text-[color:var(--liturgical-accent)]"
            />
            <h3 className="mt-4 font-serif text-3xl text-[var(--foreground)]">
              U.S. Lectionary
            </h3>
            <a
              className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-full bg-[var(--sanctuary-night)] px-5 text-sm font-bold text-[var(--vellum)]"
              href={celebration.officialReadingsUrl}
              rel="noreferrer"
              target="_blank"
            >
              Open at USCCB
              <ChevronRight aria-hidden className="size-4" />
            </a>
          </section>
        )}
      </div>

      <div className="space-y-8" hidden={readingTranslation !== "douay-rheims"}>
        {readingOption ? (
          <MassReadings
            followEnabled={readingTranslation === "douay-rheims"}
            followIdPrefix={`douay-${readingOption.id}`}
            followOrderBase={100_000}
            key={`douay-${readingOption.id}`}
            option={readingOption}
            requirements={celebration.profile.requirements}
            returnSource={
              celebration.mode === "anticipated" ? "mass-anticipated" : "mass"
            }
          />
        ) : (
          <section className="illuminated-panel rounded-3xl border border-[var(--line)] bg-[var(--panel)] p-6 text-center sm:p-10">
            <BookOpen
              aria-hidden
              className="mx-auto size-7 text-[color:var(--liturgical-accent)]"
            />
            <h3 className="mt-4 font-serif text-3xl text-[var(--foreground)]">
              Douay-Rheims
            </h3>
            <button
              className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-full bg-[var(--sanctuary-night)] px-5 text-sm font-bold text-[var(--vellum)]"
              onClick={() => onReadingTranslationChange("us-lectionary")}
              type="button"
            >
              Use At Mass (U.S.)
              <ChevronRight aria-hidden className="size-4" />
            </button>
          </section>
        )}
      </div>

      <OrderItems
        followOrderBase={200_000}
        idPrefix="word-response"
        items={wordRites}
        title="Receive, Profess, and Pray"
      />
    </div>
  );
}

function MassTranslationToggle({
  onChange,
  value,
}: {
  onChange: (translation: MassReadingTranslation) => void;
  value: MassReadingTranslation;
}) {
  return (
    <fieldset className="rounded-2xl border border-[color:var(--gilt)]/35 bg-[var(--panel-soft)] p-2 shadow-[0_12px_34px_rgba(11,28,22,0.04)]">
      <legend className="sr-only">Scripture text</legend>
      <div className="grid grid-cols-2 gap-2">
        {MASS_TRANSLATION_CHOICES.map((choice) => {
          const selected = value === choice.value;
          return (
            <label
              className={[
                "flex min-h-12 cursor-pointer items-center justify-center rounded-xl border px-3 text-center text-sm font-bold transition focus-within:outline-none focus-within:ring-2 focus-within:ring-[color:var(--liturgical-accent)]",
                selected
                  ? "border-[color:var(--gilt)] bg-[var(--sanctuary-night)] text-[var(--vellum)] shadow-[0_10px_24px_rgba(11,28,22,0.14)]"
                  : "border-transparent bg-[var(--vellum)] text-[var(--muted)] hover:border-[var(--line)] hover:text-[var(--foreground)]",
              ].join(" ")}
              key={choice.value}
            >
              <input
                aria-label={
                  choice.value === "us-lectionary"
                    ? "At Mass, English used in the United States"
                    : "Douay-Rheims, traditional English translation"
                }
                checked={selected}
                className="sr-only"
                name="mass-scripture-translation"
                onChange={() => onChange(choice.value)}
                type="radio"
                value={choice.value}
              />
              {choice.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function MassReadingSetSelector({
  onChange,
  readingSets,
  selectedReadingSet,
}: {
  onChange: (readingSetId: string) => void;
  readingSets: HolyMassReadingSet[];
  selectedReadingSet: HolyMassReadingSet | null;
}) {
  if (readingSets.length <= 1) {
    return null;
  }

  return (
    <fieldset className="rounded-3xl border border-[color:var(--gilt)]/45 bg-[var(--panel)] p-4 shadow-[0_18px_56px_rgba(11,28,22,0.055)] sm:p-6">
      <legend className="px-2 font-serif text-2xl font-semibold text-[var(--foreground)]">
        Readings being proclaimed
      </legend>
      <p className="mt-1 px-2 text-sm leading-6 text-[var(--muted)]">
        A memorial may use its proper readings or the weekday cycle. Choose the
        set your parish is proclaiming now.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {readingSets.map((readingSet) => {
          const selected = readingSet.id === selectedReadingSet?.id;
          return (
            <button
              aria-pressed={selected}
              className={`rounded-2xl border p-4 text-left transition ${
                selected
                  ? "border-[color:var(--gilt)] bg-[var(--sanctuary-night)] text-[var(--vellum)] shadow-[0_12px_30px_rgba(11,28,22,0.16)]"
                  : "border-[var(--line)] bg-[var(--panel-soft)] text-[var(--foreground)] hover:border-[color:var(--gilt)]"
              }`}
              key={readingSet.id}
              onClick={() => onChange(readingSet.id)}
              type="button"
            >
              <span className="block text-sm font-extrabold">
                {readingSet.label}
              </span>
              <span
                className={`mt-2 block text-xs leading-5 ${
                  selected ? "text-[var(--parchment)]/80" : "text-[var(--muted)]"
                }`}
              >
                {readingSet.firstReadingCitation ?? "Official first reading"}
                {readingSet.gospelCitations.length > 0
                  ? ` · ${readingSet.gospelCitations.join(" or ")}`
                  : ""}
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function SelectedOfficialReadingSet({
  option,
}: {
  option: HolyMassLoadedOption;
}) {
  return (
    <section className="rounded-3xl border border-[color:var(--gilt)]/45 bg-[var(--panel-soft)] p-5 sm:p-7">
      <p className="text-xs font-bold uppercase tracking-[0.13em] text-[color:var(--liturgical-accent)]">
        Selected for this Mass
      </p>
      <h3 className="mt-2 font-serif text-3xl font-semibold text-[var(--foreground)]">
        {option.label}
      </h3>
      <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
        {option.description}
      </p>
      <dl className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-[var(--line)] bg-[var(--vellum)] p-4">
          <dt className="text-[0.68rem] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">
            First reading
          </dt>
          <dd className="mt-1 font-serif text-lg font-semibold text-[var(--foreground)]">
            {option.firstReading.displayCitation}
          </dd>
        </div>
        <div className="rounded-xl border border-[var(--line)] bg-[var(--vellum)] p-4">
          <dt className="text-[0.68rem] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">
            Gospel
          </dt>
          <dd className="mt-1 font-serif text-lg font-semibold text-[var(--foreground)]">
            {option.gospelChoices
              .map((gospel) => gospel.displayCitation)
              .join(" or ")}
          </dd>
        </div>
      </dl>
      {option.officialUrl ? (
        <a
          className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--sanctuary-night)] px-4 text-xs font-bold text-[var(--vellum)]"
          href={option.officialUrl}
          rel="noreferrer"
          target="_blank"
        >
          Verify at USCCB
          <ChevronRight aria-hidden className="size-4" />
        </a>
      ) : null}
      <p className="mt-4 text-xs leading-5 text-[var(--muted)]">
        The Scripture text below is the public-domain Douay-Rheims; the
        citations follow the selected U.S. Lectionary option.
      </p>
    </section>
  );
}

function UsccbMassReadings({
  followEnabled,
  followIdPrefix,
  followOrderBase,
  item,
  readingSet,
  requirements,
}: {
  followEnabled: boolean;
  followIdPrefix: string;
  followOrderBase: number;
  item: NonNullable<HolyMassCelebrationView["massLectionary"]>;
  readingSet?: HolyMassReadingSet;
  requirements: HolyMassCelebrationView["profile"]["requirements"];
}) {
  const hasFeedSequence = item.sections.some(
    (section) => getUsccbSectionKind(section) === "sequence",
  );

  return (
    <div className="space-y-8">
      {readingSet ? (
        <section className="rounded-3xl border border-[color:var(--gilt)]/45 bg-[var(--panel-soft)] p-5 sm:p-7">
          <p className="text-xs font-bold uppercase tracking-[0.13em] text-[color:var(--liturgical-accent)]">
            Readings being proclaimed
          </p>
          <h3 className="mt-2 font-serif text-3xl font-semibold text-[var(--foreground)]">
            {readingSet.label}
          </h3>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            {readingSet.description}
          </p>
          <a
            className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--sanctuary-night)] px-4 text-xs font-bold text-[var(--vellum)]"
            href={readingSet.officialUrl}
            rel="noreferrer"
            target="_blank"
          >
            Verify at USCCB
            <ChevronRight aria-hidden className="size-4" />
          </a>
        </section>
      ) : null}
      {item.sections.map((section, index) => {
        const kind = getUsccbSectionKind(section);
        return (
          <div className="space-y-8" key={section.id}>
            {kind === "acclamation" &&
            requirements.sequence !== "none" &&
            !hasFeedSequence ? (
              <OrderItems
                followOrderBase={followOrderBase + index * 10_000 - 1_000}
                idPrefix={`${followIdPrefix}-sequence`}
                items={[{
                  id: "sequence",
                  title: "Sequence",
                  posture: "Sit",
                  cue:
                    requirements.sequence === "required"
                      ? "Join the sequence before the Gospel acclamation."
                      : "Join the sequence when it is used.",
                }]}
              />
            ) : null}
            <UsccbReadingCard
              defaultOpen={index === 0}
              followEnabled={followEnabled}
              followIdPrefix={`${followIdPrefix}-${section.id}`}
              followOrderBase={followOrderBase + index * 10_000}
              kind={kind}
              section={section}
            />
          </div>
        );
      })}

      <details className="rounded-2xl border border-[var(--line)] bg-[var(--panel-soft)] px-5 py-4 text-xs text-[var(--muted)]">
        <summary className="cursor-pointer font-bold uppercase tracking-[0.11em] text-[color:var(--liturgical-accent)]">
          USCCB · U.S. Lectionary
        </summary>
        <p className="mt-3 leading-6">{item.copyright}</p>
        <a
          className="mt-3 inline-flex min-h-10 items-center gap-2 font-bold text-[color:var(--liturgical-accent)]"
          href={item.link}
          rel="noreferrer"
          target="_blank"
        >
          Official readings
          <ChevronRight aria-hidden className="size-4" />
        </a>
      </details>
    </div>
  );
}

type UsccbSectionKind =
  | "reading"
  | "psalm"
  | "sequence"
  | "acclamation"
  | "gospel";

function UsccbReadingCard({
  defaultOpen,
  followEnabled,
  followIdPrefix,
  followOrderBase,
  kind,
  section,
}: {
  defaultOpen: boolean;
  followEnabled: boolean;
  followIdPrefix: string;
  followOrderBase: number;
  kind: UsccbSectionKind;
  section: UsccbLectionarySection;
}) {
  const disclosureId = useId();
  const [open, setOpen] = useState(defaultOpen);
  const disclosureButtonRef = useRef<HTMLButtonElement>(null);
  const revealReading = useCallback(() => setOpen(true), []);
  const primaryReference = section.citation
    .split(",", 1)[0]
    .trim()
    .replace(/(\d)[a-z]$/iu, "$1");
  const parsedReference = parseScriptureReference(primaryReference);
  const scriptureBookId = parsedReference.ok ? parsedReference.book.id : null;
  const gospelBook = getGospelBookName(scriptureBookId);
  const readingIntroduction = getReadingIntroduction(scriptureBookId);
  const posture: MassPosture =
    kind === "gospel" || kind === "acclamation" ? "Stand" : "Sit";
  const after =
    kind === "gospel"
      ? "Praise to you, Lord Jesus Christ."
      : kind === "reading"
        ? "Thanks be to God."
        : null;

  return (
    <article className="illuminated-panel overflow-hidden rounded-3xl border border-[var(--line)] bg-[var(--panel)] shadow-[0_18px_56px_rgba(11,28,22,0.055)]">
      <header className="border-b border-[var(--line)] bg-[var(--panel-soft)]">
        <button
          aria-controls={disclosureId}
          aria-expanded={open}
          className="scroll-mt-36 flex min-h-24 w-full flex-wrap items-center justify-between gap-3 px-5 py-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[color:var(--liturgical-accent)] sm:px-8 sm:py-6"
          onClick={() => setOpen((current) => !current)}
          ref={disclosureButtonRef}
          type="button"
        >
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.13em] text-[color:var(--liturgical-accent)]">
              {section.title}
            </p>
            <h3 className="mt-2 font-serif text-2xl font-semibold text-[var(--foreground)] sm:text-3xl">
              {section.citation}
            </h3>
          </div>
          <span className="flex flex-wrap items-center justify-end gap-2">
            <span className="inline-flex min-h-9 items-center rounded-full border border-[color:var(--gilt)]/35 bg-[var(--sanctuary-night)] px-3 text-[0.68rem] font-bold uppercase tracking-[0.1em] text-[var(--vellum)]">
              U.S. Lectionary
            </span>
            <Posture posture={posture} />
            <span className="inline-flex size-10 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--vellum)] text-[color:var(--liturgical-accent)]">
              <ChevronRight
                aria-hidden
                className={`size-4 motion-safe:transition-transform ${open ? "rotate-90" : ""}`}
              />
            </span>
          </span>
        </button>
      </header>

      <div
        className="px-5 py-8 sm:px-10 sm:py-10"
        hidden={!open}
        id={disclosureId}
      >
        {kind === "gospel" ? (
          <div className="mb-8 space-y-3">
            <MinisterLine label="Deacon or Priest">
              <MassFollowText
                enabled={followEnabled}
                idPrefix={`${followIdPrefix}-gospel-greeting-priest`}
                label={section.title}
                orderBase={followOrderBase}
                reveal={revealReading}
                text="The Lord be with you."
              />
            </MinisterLine>
            <PeopleResponse label="People">
              <MassFollowText
                enabled={followEnabled}
                idPrefix={`${followIdPrefix}-gospel-greeting-people`}
                label={section.title}
                orderBase={followOrderBase + 10}
                reveal={revealReading}
                text="And with your spirit."
              />
            </PeopleResponse>
            <MinisterLine label="Deacon or Priest">
              <MassFollowText
                enabled={followEnabled}
                idPrefix={`${followIdPrefix}-gospel-introduction`}
                label={section.title}
                orderBase={followOrderBase + 20}
                reveal={revealReading}
                text={`A reading from the holy Gospel according to ${gospelBook}.`}
              />
            </MinisterLine>
            <PeopleResponse label="People">
              <MassFollowText
                enabled={followEnabled}
                idPrefix={`${followIdPrefix}-gospel-acclamation`}
                label={section.title}
                orderBase={followOrderBase + 30}
                reveal={revealReading}
                text="Glory to you, O Lord."
              />
            </PeopleResponse>
            <p className="rounded-xl border border-[color:var(--oxblood)]/20 bg-[var(--panel-soft)] px-4 py-3 font-serif text-sm italic leading-6 text-[var(--oxblood)]">
              Trace the Cross on your forehead, lips, and heart.
            </p>
          </div>
        ) : null}

        {kind === "reading" && readingIntroduction ? (
          <div className="mb-8">
            <MinisterLine label="Reader">
              <MassFollowText
                enabled={followEnabled}
                idPrefix={`${followIdPrefix}-introduction`}
                label={section.title}
                orderBase={followOrderBase}
                reveal={revealReading}
                text={readingIntroduction}
              />
            </MinisterLine>
          </div>
        ) : null}

        <div className="font-serif text-[1.08rem] leading-8 text-[var(--foreground)] sm:text-xl sm:leading-9">
          {section.lines.map((line, index) => (
            <p
              className={
                line.trimStart().startsWith("R.")
                  ? "mt-5 font-semibold italic text-[color:var(--liturgical-accent)] first:mt-0"
                  : kind === "acclamation"
                    ? "italic"
                    : undefined
              }
              key={`${section.id}:${index}`}
            >
              <MassFollowText
                enabled={followEnabled}
                idPrefix={`${followIdPrefix}-line-${index}`}
                label={section.title}
                orderBase={followOrderBase + 100 + index * 100}
                reveal={revealReading}
                text={line}
              />
            </p>
          ))}
        </div>

        {after ? (
          <div className="mt-8 space-y-3">
            <MinisterLine label={kind === "gospel" ? "Deacon or Priest" : "Reader"}>
              <MassFollowText
                enabled={followEnabled}
                idPrefix={`${followIdPrefix}-conclusion-minister`}
                label={section.title}
                orderBase={followOrderBase + 9_000}
                reveal={revealReading}
                text={
                  kind === "gospel"
                    ? "The Gospel of the Lord."
                    : "The word of the Lord."
                }
              />
            </MinisterLine>
            <PeopleResponse label="People">
              <MassFollowText
                enabled={followEnabled}
                idPrefix={`${followIdPrefix}-conclusion-people`}
                label={section.title}
                orderBase={followOrderBase + 9_010}
                reveal={revealReading}
                text={after}
              />
            </PeopleResponse>
          </div>
        ) : null}

        {section.officialUrl ? (
          <a
            className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--line)] px-4 text-xs font-bold text-[var(--muted)] transition hover:border-[color:var(--liturgical-accent)] hover:text-[color:var(--liturgical-accent)]"
            href={section.officialUrl}
            rel="noreferrer"
            target="_blank"
          >
            <BookOpen aria-hidden className="size-4" />
            USCCB
          </a>
        ) : null}

        <ReadingCollapseControl
          onCollapse={() =>
            collapseReadingAndReturn(disclosureButtonRef, setOpen)
          }
        />
      </div>
    </article>
  );
}

function getUsccbSectionKind(section: UsccbLectionarySection): UsccbSectionKind {
  const title = section.title.toLowerCase();
  if (
    title.includes("gospel") &&
    !title.includes("acclamation") &&
    !title.includes("verse before")
  ) {
    return "gospel";
  }
  if (title.includes("psalm")) {
    return "psalm";
  }
  if (title.includes("sequence")) {
    return "sequence";
  }
  if (
    title.includes("alleluia") ||
    title.includes("acclamation") ||
    title.includes("verse before")
  ) {
    return "acclamation";
  }
  return "reading";
}

function MassReadings({
  followEnabled,
  followIdPrefix,
  followOrderBase,
  option,
  requirements,
  returnSource,
}: {
  followEnabled: boolean;
  followIdPrefix: string;
  followOrderBase: number;
  option: HolyMassLoadedOption;
  requirements: HolyMassCelebrationView["profile"]["requirements"];
  returnSource: ScriptureReturnSource;
}) {
  const { activeTargetId } = useMassFollowState();
  const [gospelIndex, setGospelIndex] = useState(() => {
    const matchedIndex = option.gospelChoices.findIndex((_, choiceIndex) =>
      activeTargetId?.startsWith(
        `${getMassFollowTargetIdPrefix(`${followIdPrefix}-gospel-${choiceIndex}`)}-`,
      ),
    );
    return matchedIndex >= 0 ? matchedIndex : 0;
  });
  const gospel = option.gospelChoices[gospelIndex] ?? option.gospelChoices[0];
  const alternateGospelTargets = useMemo(
    () =>
      option.gospelChoices.flatMap((choice, choiceIndex) => {
        if (!followEnabled || choiceIndex === gospelIndex) {
          return [];
        }

        const revealGospel = () => setGospelIndex(choiceIndex);
        return choice.segments.flatMap((segment, segmentIndex) =>
          segment.verses.flatMap((verse, verseIndex) =>
            createMassFollowTargets({
              idPrefix: `${followIdPrefix}-gospel-${choiceIndex}-segment-${segmentIndex}-verse-${verse.number}`,
              label: choice.title,
              orderBase:
                followOrderBase +
                80_000 +
                100 +
                segmentIndex * 5_000 +
                verseIndex * 100,
              reveal: revealGospel,
              text: verse.text,
            }).map((target) => ({
              ...target,
              requiresUniqueMatch: true,
            })),
          ),
        );
      }),
    [
      followEnabled,
      followIdPrefix,
      followOrderBase,
      gospelIndex,
      option.gospelChoices,
    ],
  );
  useMassFollowTargets(alternateGospelTargets);

  return (
    <div className="space-y-8">
      <ReadingCard
        after="Thanks be to God."
        followEnabled={followEnabled}
        followIdPrefix={`${followIdPrefix}-first-reading`}
        followOrderBase={followOrderBase}
        kind="reading"
        posture="Sit"
        returnSource={returnSource}
        selection={option.firstReading}
      />

      <PsalmCard
        followEnabled={followEnabled}
        followIdPrefix={`${followIdPrefix}-psalm`}
        followOrderBase={followOrderBase + 20_000}
        psalm={option.responsorialPsalm}
      />

      {requirements.secondReading && option.secondReading ? (
        <ReadingCard
          after="Thanks be to God."
          followEnabled={followEnabled}
          followIdPrefix={`${followIdPrefix}-second-reading`}
          followOrderBase={followOrderBase + 40_000}
          kind="reading"
          posture="Sit"
          returnSource={returnSource}
          selection={option.secondReading}
        />
      ) : null}

      {requirements.sequence !== "none" ? (
        <OrderItems
          followOrderBase={followOrderBase + 60_000}
          idPrefix={`${followIdPrefix}-sequence`}
          items={[{
            id: "sequence",
            title: "Sequence",
            posture: "Sit",
            cue:
              requirements.sequence === "required"
                ? "Join the sequence before the Gospel acclamation."
                : "Join the sequence when it is used.",
          }]}
        />
      ) : null}

      <ReadingCard
        compact
        followEnabled={followEnabled}
        followIdPrefix={`${followIdPrefix}-acclamation`}
        followOrderBase={followOrderBase + 70_000}
        kind="acclamation"
        posture="Stand"
        returnSource={returnSource}
        selection={{
          ...option.gospelAcclamation,
          title:
            requirements.gospelAcclamation === "alleluia"
              ? "Alleluia"
              : "Verse before the Gospel",
        }}
      />

      {option.gospelChoices.length > 1 ? (
        <div
          aria-label="Gospel"
          className="flex flex-wrap gap-2"
          role="group"
        >
          {option.gospelChoices.map((choice, index) => (
            <button
              aria-pressed={gospelIndex === index}
              className={[
                "min-h-11 rounded-full border px-4 text-sm font-bold transition",
                gospelIndex === index
                  ? "border-[color:var(--liturgical-accent)] bg-[color:var(--liturgical-accent)] text-white"
                  : "border-[var(--line)] bg-[var(--vellum)] text-[var(--foreground)]",
              ].join(" ")}
              key={choice.displayCitation}
              onClick={() => setGospelIndex(index)}
              type="button"
            >
              {choice.displayCitation}
            </button>
          ))}
        </div>
      ) : null}

      {gospel ? (
        <ReadingCard
          after="Praise to you, Lord Jesus Christ."
          followEnabled={followEnabled}
          followIdPrefix={`${followIdPrefix}-gospel-${gospelIndex}`}
          followOrderBase={followOrderBase + 80_000}
          kind="gospel"
          posture="Stand"
          returnSource={returnSource}
          selection={gospel}
        />
      ) : null}
    </div>
  );
}

function ReadingCard({
  after,
  compact = false,
  followEnabled,
  followIdPrefix,
  followOrderBase,
  kind,
  posture,
  returnSource,
  selection,
}: {
  after?: string;
  compact?: boolean;
  followEnabled: boolean;
  followIdPrefix: string;
  followOrderBase: number;
  kind: "reading" | "acclamation" | "gospel";
  posture: MassPosture;
  returnSource: ScriptureReturnSource;
  selection: HolyMassLoadedSelection;
}) {
  const scriptureBookId = selection.passages[0]?.bookId ?? null;
  const gospelBook = getGospelBookName(scriptureBookId);
  const readingIntroduction = getReadingIntroduction(scriptureBookId);
  const disclosureId = useId();
  const [open, setOpen] = useState(selection.title === "First Reading");
  const disclosureButtonRef = useRef<HTMLButtonElement>(null);
  const revealReading = useCallback(() => setOpen(true), []);

  return (
    <article className="illuminated-panel overflow-hidden rounded-3xl border border-[var(--line)] bg-[var(--panel)] shadow-[0_18px_56px_rgba(11,28,22,0.055)]">
      <header className="border-b border-[var(--line)] bg-[var(--panel-soft)]">
        <button
          aria-controls={disclosureId}
          aria-expanded={open}
          className="scroll-mt-36 flex min-h-24 w-full flex-wrap items-center justify-between gap-3 px-5 py-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[color:var(--liturgical-accent)] sm:px-8 sm:py-6"
          onClick={() => setOpen((current) => !current)}
          ref={disclosureButtonRef}
          type="button"
        >
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.13em] text-[color:var(--liturgical-accent)]">
              {selection.title}
            </p>
            <h3 className="mt-2 font-serif text-2xl font-semibold text-[var(--foreground)] sm:text-3xl">
              {selection.displayCitation}
            </h3>
          </div>
          <span className="flex flex-wrap items-center justify-end gap-2">
            <span className="inline-flex min-h-9 items-center rounded-full border border-[var(--line)] bg-[var(--vellum)] px-3 text-[0.68rem] font-bold uppercase tracking-[0.1em] text-[var(--muted)]">
              Douay-Rheims
            </span>
            <Posture posture={posture} />
            <span className="inline-flex size-10 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--vellum)] text-[color:var(--liturgical-accent)]">
              <ChevronRight
                aria-hidden
                className={`size-4 motion-safe:transition-transform ${open ? "rotate-90" : ""}`}
              />
            </span>
          </span>
        </button>
      </header>

      <div
        className={compact ? "px-5 py-6 sm:px-8" : "px-5 py-8 sm:px-10 sm:py-10"}
        hidden={!open}
        id={disclosureId}
      >
        {kind === "gospel" ? (
          <div className="mb-8 space-y-3">
            <MinisterLine label="Deacon or Priest">
              <MassFollowText
                enabled={followEnabled}
                idPrefix={`${followIdPrefix}-gospel-greeting-priest`}
                label={selection.title}
                orderBase={followOrderBase}
                reveal={revealReading}
                text="The Lord be with you."
              />
            </MinisterLine>
            <PeopleResponse label="People">
              <MassFollowText
                enabled={followEnabled}
                idPrefix={`${followIdPrefix}-gospel-greeting-people`}
                label={selection.title}
                orderBase={followOrderBase + 10}
                reveal={revealReading}
                text="And with your spirit."
              />
            </PeopleResponse>
            <MinisterLine label="Deacon or Priest">
              <MassFollowText
                enabled={followEnabled}
                idPrefix={`${followIdPrefix}-gospel-introduction`}
                label={selection.title}
                orderBase={followOrderBase + 20}
                reveal={revealReading}
                text={`A reading from the holy Gospel according to ${gospelBook}.`}
              />
            </MinisterLine>
            <PeopleResponse label="People">
              <MassFollowText
                enabled={followEnabled}
                idPrefix={`${followIdPrefix}-gospel-acclamation`}
                label={selection.title}
                orderBase={followOrderBase + 30}
                reveal={revealReading}
                text="Glory to you, O Lord."
              />
            </PeopleResponse>
            <p className="rounded-xl border border-[color:var(--oxblood)]/20 bg-[var(--panel-soft)] px-4 py-3 font-serif text-sm italic leading-6 text-[var(--oxblood)]">
              Trace the Cross on your forehead, lips, and heart.
            </p>
          </div>
        ) : null}

        {kind === "reading" && readingIntroduction ? (
          <div className="mb-8">
            <MinisterLine label="Reader">
              <MassFollowText
                enabled={followEnabled}
                idPrefix={`${followIdPrefix}-introduction`}
                label={selection.title}
                orderBase={followOrderBase}
                reveal={revealReading}
                text={readingIntroduction}
              />
            </MinisterLine>
          </div>
        ) : null}

        <div className="space-y-7">
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.15em] text-[color:var(--liturgical-accent)]">
            {kind === "gospel"
              ? "Deacon or Priest"
              : kind === "acclamation"
                ? "Cantor and People"
                : "Reader"}
          </p>
          {selection.segments.map((segment, segmentIndex) => (
            <div key={`${segment.reference}:${segmentIndex}`}>
              <div
                className={[
                  "space-y-4 font-serif text-[1.08rem] leading-8 text-[var(--foreground)] sm:text-xl sm:leading-9",
                  compact ? "italic" : "",
                ].join(" ")}
              >
                {segment.verses.map((verse, verseIndex) => (
                  <p key={`${segment.reference}:${verse.number}`}>
                    <span className="sr-only">Verse {verse.label}. </span>
                    <MassFollowText
                      enabled={followEnabled}
                      idPrefix={`${followIdPrefix}-segment-${segmentIndex}-verse-${verse.number}`}
                      label={selection.title}
                      orderBase={
                        followOrderBase +
                        100 +
                        segmentIndex * 5_000 +
                        verseIndex * 100
                      }
                      reveal={revealReading}
                      text={verse.text}
                    />
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>

        {after ? (
          <div className="mt-8 space-y-3">
            <MinisterLine label={kind === "gospel" ? "Deacon or Priest" : "Reader"}>
              <MassFollowText
                enabled={followEnabled}
                idPrefix={`${followIdPrefix}-conclusion-minister`}
                label={selection.title}
                orderBase={followOrderBase + 19_000}
                reveal={revealReading}
                text={
                  kind === "gospel"
                    ? "The Gospel of the Lord."
                    : "The word of the Lord."
                }
              />
            </MinisterLine>
            <PeopleResponse label="People">
              <MassFollowText
                enabled={followEnabled}
                idPrefix={`${followIdPrefix}-conclusion-people`}
                label={selection.title}
                orderBase={followOrderBase + 19_010}
                reveal={revealReading}
                text={after}
              />
            </PeopleResponse>
          </div>
        ) : null}

        <div className="mt-7 flex flex-wrap gap-2">
          {selection.passages.map((passage, index) => (
            <Link
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--line)] px-4 text-xs font-bold text-[var(--muted)] transition hover:border-[color:var(--liturgical-accent)] hover:text-[color:var(--liturgical-accent)]"
              href={getScriptureHref(passage, returnSource)}
              key={`${passage.bookId}:${passage.chapter}:${passage.verseStart}:${passage.verseEnd}`}
            >
              <BookOpen aria-hidden className="size-4" />
              {selection.segments[index]?.reference
                ? `Douay Bible · ${selection.segments[index].reference}`
                : "Open Douay Bible"}
            </Link>
          ))}
        </div>

        <ReadingCollapseControl
          onCollapse={() =>
            collapseReadingAndReturn(disclosureButtonRef, setOpen)
          }
        />
      </div>
    </article>
  );
}

function PsalmCard({
  followEnabled,
  followIdPrefix,
  followOrderBase,
  psalm,
}: {
  followEnabled: boolean;
  followIdPrefix: string;
  followOrderBase: number;
  psalm: HolyMassLoadedPsalm;
}) {
  const refrain = psalm.refrains[0] ?? null;
  const disclosureId = useId();
  const [open, setOpen] = useState(false);
  const disclosureButtonRef = useRef<HTMLButtonElement>(null);
  const revealReading = useCallback(() => setOpen(true), []);

  return (
    <article className="illuminated-panel overflow-hidden rounded-3xl border border-[var(--line)] bg-[var(--panel)] shadow-[0_18px_56px_rgba(11,28,22,0.055)]">
      <header className="border-b border-[var(--line)] bg-[var(--panel-soft)]">
        <button
          aria-controls={disclosureId}
          aria-expanded={open}
          className="scroll-mt-36 flex min-h-24 w-full flex-wrap items-center justify-between gap-3 px-5 py-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[color:var(--liturgical-accent)] sm:px-8 sm:py-6"
          onClick={() => setOpen((current) => !current)}
          ref={disclosureButtonRef}
          type="button"
        >
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.13em] text-[color:var(--liturgical-accent)]">
              Responsorial Psalm
            </p>
            <h3 className="mt-2 font-serif text-2xl font-semibold text-[var(--foreground)] sm:text-3xl">
              {psalm.displayCitation}
            </h3>
          </div>
          <span className="flex flex-wrap items-center justify-end gap-2">
            <span className="inline-flex min-h-9 items-center rounded-full border border-[var(--line)] bg-[var(--vellum)] px-3 text-[0.68rem] font-bold uppercase tracking-[0.1em] text-[var(--muted)]">
              Douay-Rheims
            </span>
            <Posture posture="Sit" />
            <span className="inline-flex size-10 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--vellum)] text-[color:var(--liturgical-accent)]">
              <ChevronRight
                aria-hidden
                className={`size-4 motion-safe:transition-transform ${open ? "rotate-90" : ""}`}
              />
            </span>
          </span>
        </button>
      </header>
      <div
        className="px-5 py-8 sm:px-10 sm:py-10"
        hidden={!open}
        id={disclosureId}
      >
        {refrain ? (
          <div className="mb-8 rounded-2xl border border-[color:var(--gilt)]/45 bg-[var(--vellum)] px-5 py-4 shadow-[inset_4px_0_0_var(--gilt)] sm:px-6">
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-[color:var(--liturgical-accent)]">
              People
            </p>
            <blockquote className="mt-2 font-serif text-xl font-semibold italic leading-8 text-[var(--foreground)] sm:text-2xl sm:leading-9">
              <span className="mr-2 text-[color:var(--liturgical-accent)]">R.</span>
              <MassFollowText
                enabled={followEnabled}
                idPrefix={`${followIdPrefix}-refrain-opening`}
                label="Responsorial Psalm"
                orderBase={followOrderBase}
                reveal={revealReading}
                text={refrain}
              />
            </blockquote>
          </div>
        ) : null}

        <div className="space-y-7">
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.15em] text-[color:var(--liturgical-accent)]">
            Cantor
          </p>
          {psalm.segments.map((segment, segmentIndex) => (
            <div
              className="space-y-4 font-serif text-[1.08rem] leading-8 text-[var(--foreground)] sm:text-xl sm:leading-9"
              key={`${segment.reference}:${segmentIndex}`}
            >
              {segment.verses.map((verse, verseIndex) => (
                <p key={`${segment.reference}:${verse.number}`}>
                  <span className="sr-only">Verse {verse.label}. </span>
                  <MassFollowText
                    enabled={followEnabled}
                    idPrefix={`${followIdPrefix}-segment-${segmentIndex}-verse-${verse.number}`}
                    label="Responsorial Psalm"
                    orderBase={
                      followOrderBase +
                      100 +
                      segmentIndex * 5_000 +
                      verseIndex * 100
                    }
                    reveal={revealReading}
                    text={verse.text}
                  />
                </p>
              ))}
              {refrain ? (
                <p className="font-semibold italic text-[color:var(--liturgical-accent)]">
                  <span className="mr-2">R.</span>
                  <MassFollowText
                    enabled={followEnabled}
                    idPrefix={`${followIdPrefix}-segment-${segmentIndex}-refrain`}
                    label="Responsorial Psalm"
                    orderBase={
                      followOrderBase + segmentIndex * 5_000 + 4_900
                    }
                    reveal={revealReading}
                    text={refrain}
                  />
                </p>
              ) : null}
            </div>
          ))}
        </div>

        <ReadingCollapseControl
          onCollapse={() =>
            collapseReadingAndReturn(disclosureButtonRef, setOpen)
          }
        />
      </div>
    </article>
  );
}

function ReadingCollapseControl({
  onCollapse,
}: {
  onCollapse: () => void;
}) {
  return (
    <div className="mt-10 flex justify-center border-t border-[var(--line)] pt-7">
      <button
        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[color:var(--liturgical-accent)]/35 bg-[var(--vellum)] px-5 text-sm font-bold text-[color:var(--liturgical-accent)] shadow-[0_10px_28px_rgba(11,28,22,0.06)] transition hover:-translate-y-0.5 hover:border-[color:var(--liturgical-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--liturgical-accent)]"
        onClick={onCollapse}
        type="button"
      >
        <ArrowUp aria-hidden className="size-4" />
        Collapse and return to top
      </button>
    </div>
  );
}

function collapseReadingAndReturn(
  disclosureButtonRef: React.RefObject<HTMLButtonElement | null>,
  setOpen: React.Dispatch<React.SetStateAction<boolean>>,
) {
  setOpen(false);

  window.requestAnimationFrame(() => {
    const disclosureButton = disclosureButtonRef.current;
    if (!disclosureButton) {
      return;
    }

    disclosureButton.focus({ preventScroll: true });
    disclosureButton.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "start",
    });
  });
}

function MassFollowText({
  enabled = true,
  idPrefix,
  label,
  orderBase,
  reveal,
  text,
}: {
  enabled?: boolean;
  idPrefix: string;
  label: string;
  orderBase: number;
  reveal?: () => void;
  text: string;
}) {
  const targets = useMemo(
    () =>
      createMassFollowTargets({
        enabled,
        idPrefix,
        label,
        orderBase,
        reveal,
        text,
      }),
    [enabled, idPrefix, label, orderBase, reveal, text],
  );
  useMassFollowTargets(targets);
  const { activeTargetId } = useMassFollowState();

  return (
    <>
      {targets.map((target) => {
        const active = target.id === activeTargetId;
        return (
          <span
            aria-current={active ? "true" : undefined}
            className={
              active
                ? "scroll-mt-40 rounded-md bg-[color:var(--gilt)]/25 px-1 ring-2 ring-[color:var(--gilt)]/55 ring-offset-2 ring-offset-[var(--panel)] transition-colors"
                : "scroll-mt-40 transition-colors"
            }
            data-mass-follow-target={target.id}
            id={target.elementId}
            key={target.id}
          >
            {target.text}
          </span>
        );
      })}
    </>
  );
}

function createMassFollowTargets({
  enabled = true,
  idPrefix,
  label,
  orderBase,
  reveal,
  text,
}: {
  enabled?: boolean;
  idPrefix: string;
  label: string;
  orderBase: number;
  reveal?: () => void;
  text: string;
}): MassFollowTargetRegistration[] {
  return splitMassSpeechText(text).map((chunk, index) => {
    const id = getMassFollowTargetId(idPrefix, index);
    return {
      elementId: id,
      enabled,
      id,
      label,
      order: orderBase + index,
      reveal,
      text: chunk,
    };
  });
}

function createDouayOptionFollowTargets({
  followIdPrefix,
  followOrderBase,
  option,
  reveal,
}: {
  followIdPrefix: string;
  followOrderBase: number;
  option: HolyMassLoadedOption;
  reveal: () => void;
}) {
  const selectionTargets = (
    selection: HolyMassLoadedSelection,
    idPrefix: string,
    orderBase: number,
  ) =>
    selection.segments.flatMap((segment, segmentIndex) =>
      segment.verses.flatMap((verse, verseIndex) =>
        createMassFollowTargets({
          idPrefix: `${idPrefix}-segment-${segmentIndex}-verse-${verse.number}`,
          label: selection.title,
          orderBase: orderBase + 100 + segmentIndex * 5_000 + verseIndex * 100,
          reveal,
          text: verse.text,
        }).map((target) => ({
          ...target,
          requiresUniqueMatch: true,
        })),
      ),
    );

  const targets: MassFollowTargetRegistration[] = [
    ...selectionTargets(
      option.firstReading,
      `${followIdPrefix}-first-reading`,
      followOrderBase,
    ),
    ...option.responsorialPsalm.segments.flatMap((segment, segmentIndex) =>
      segment.verses.flatMap((verse, verseIndex) =>
        createMassFollowTargets({
          idPrefix: `${followIdPrefix}-psalm-segment-${segmentIndex}-verse-${verse.number}`,
          label: "Responsorial Psalm",
          orderBase:
            followOrderBase +
            20_000 +
            100 +
            segmentIndex * 5_000 +
            verseIndex * 100,
          reveal,
          text: verse.text,
        }).map((target) => ({
          ...target,
          requiresUniqueMatch: true,
        })),
      ),
    ),
  ];

  if (option.secondReading) {
    targets.push(
      ...selectionTargets(
        option.secondReading,
        `${followIdPrefix}-second-reading`,
        followOrderBase + 40_000,
      ),
    );
  }

  targets.push(
    ...selectionTargets(
      option.gospelAcclamation,
      `${followIdPrefix}-acclamation`,
      followOrderBase + 70_000,
    ),
    ...option.gospelChoices.flatMap((gospel, gospelIndex) =>
      selectionTargets(
        gospel,
        `${followIdPrefix}-gospel-${gospelIndex}`,
        followOrderBase + 80_000,
      ),
    ),
  );

  return targets;
}

function getMassFollowTargetId(idPrefix: string, chunkIndex: number) {
  return `${getMassFollowTargetIdPrefix(idPrefix)}-${chunkIndex}`;
}

function getMassFollowTargetIdPrefix(idPrefix: string) {
  const normalizedPrefix =
    idPrefix
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/gu, "-")
      .replace(/^-+|-+$/gu, "") || "mass";
  return `mass-follow-${normalizedPrefix}`;
}

function OrderItems({
  followOrderBase,
  idPrefix,
  items,
  title,
}: {
  followOrderBase?: number;
  idPrefix?: string;
  items: readonly MassOrderItem[];
  title?: string;
}) {
  return (
    <MassDialogueOrder
      followOrderBase={followOrderBase}
      idPrefix={idPrefix}
      items={items}
      title={title}
    />
  );
}

function PeopleResponse({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <div className="rounded-2xl border border-[color:var(--gilt)]/45 bg-[var(--vellum)] px-5 py-4 shadow-[inset_4px_0_0_var(--gilt)] sm:px-6">
      <p className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-[color:var(--liturgical-accent)]">
        {label}
      </p>
      <p className="mt-2 font-serif text-xl font-semibold leading-8 text-[var(--foreground)] sm:text-2xl sm:leading-9">
        {children}
      </p>
    </div>
  );
}

function MinisterLine({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <div className="rounded-2xl border border-[color:var(--gilt)]/35 bg-[var(--sanctuary-night)] px-5 py-4 text-[var(--vellum)] shadow-[inset_4px_0_0_var(--gilt)] sm:px-6">
      <p className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-[var(--gilt-light)]">
        {label}
      </p>
      <p className="mt-2 font-serif text-lg leading-8 sm:text-xl sm:leading-9">
        {children}
      </p>
    </div>
  );
}

function Posture({ posture }: { posture: MassPosture }) {
  return (
    <span className="inline-flex min-h-9 items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--vellum)] px-3 text-[0.68rem] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">
      <Church aria-hidden className="size-3.5 text-[color:var(--liturgical-accent)]" />
      {posture}
    </span>
  );
}

function getGospelBookName(bookId: string | null) {
  const names: Record<string, string> = {
    matthew: "Matthew",
    mark: "Mark",
    luke: "Luke",
    john: "John",
  };
  return (bookId && names[bookId]) || "the Evangelist";
}

function getReadingIntroduction(bookId: string | null) {
  if (!bookId) {
    return null;
  }

  const newTestamentIntroductions: Record<string, string> = {
    acts: "A reading from the Acts of the Apostles.",
    romans: "A reading from the Letter of Saint Paul to the Romans.",
    "1-corinthians":
      "A reading from the first Letter of Saint Paul to the Corinthians.",
    "2-corinthians":
      "A reading from the second Letter of Saint Paul to the Corinthians.",
    galatians: "A reading from the Letter of Saint Paul to the Galatians.",
    ephesians: "A reading from the Letter of Saint Paul to the Ephesians.",
    philippians:
      "A reading from the Letter of Saint Paul to the Philippians.",
    colossians: "A reading from the Letter of Saint Paul to the Colossians.",
    "1-thessalonians":
      "A reading from the first Letter of Saint Paul to the Thessalonians.",
    "2-thessalonians":
      "A reading from the second Letter of Saint Paul to the Thessalonians.",
    "1-timothy":
      "A reading from the first Letter of Saint Paul to Timothy.",
    "2-timothy":
      "A reading from the second Letter of Saint Paul to Timothy.",
    titus: "A reading from the Letter of Saint Paul to Titus.",
    philemon: "A reading from the Letter of Saint Paul to Philemon.",
    hebrews: "A reading from the Letter to the Hebrews.",
    james: "A reading from the Letter of Saint James.",
    "1-peter": "A reading from the first Letter of Saint Peter.",
    "2-peter": "A reading from the second Letter of Saint Peter.",
    "1-john": "A reading from the first Letter of Saint John.",
    "2-john": "A reading from the second Letter of Saint John.",
    "3-john": "A reading from the third Letter of Saint John.",
    jude: "A reading from the Letter of Saint Jude.",
    revelation: "A reading from the Book of Revelation.",
  };
  if (newTestamentIntroductions[bookId]) {
    return newTestamentIntroductions[bookId];
  }

  const book = getScriptureBook(bookId);
  if (!book || book.testament !== "old") {
    return null;
  }

  const prophets = new Set([
    "isaiah",
    "jeremiah",
    "baruch",
    "ezekiel",
    "daniel",
    "hosea",
    "joel",
    "amos",
    "obadiah",
    "jonah",
    "micah",
    "nahum",
    "habakkuk",
    "zephaniah",
    "haggai",
    "zechariah",
    "malachi",
  ]);
  if (prophets.has(bookId)) {
    return `A reading from the Book of the Prophet ${book.name}.`;
  }
  if (bookId === "song-of-songs") {
    return "A reading from the Song of Songs.";
  }
  return `A reading from the Book of ${book.name}.`;
}

function getLiturgicalAccent(color: string) {
  const normalized = color.toLowerCase();
  if (normalized.includes("violet") || normalized.includes("purple")) {
    return "var(--liturgical-violet)";
  }
  if (normalized.includes("red")) {
    return "var(--liturgical-red)";
  }
  if (normalized.includes("rose")) {
    return "var(--liturgical-rose-ink)";
  }
  if (normalized.includes("white") || normalized.includes("gold")) {
    return "var(--liturgical-gold-ink)";
  }
  if (normalized.includes("black")) {
    return "var(--liturgical-black)";
  }
  if (normalized.includes("silver")) {
    return "var(--liturgical-silver-ink)";
  }
  return "var(--liturgical-green)";
}

function getLocalDateTime(timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return {
    localDate: `${values.year}-${values.month}-${values.day}`,
    localTime: `${values.hour}:${values.minute}`,
  };
}

function formatClockTime(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(2026, 0, 1, hours, minutes)));
}

function useMassSettings() {
  const snapshot = useSyncExternalStore(
    subscribeToMassSettings,
    getMassSettingsSnapshot,
    getServerMassSettingsSnapshot,
  );

  return useMemo(() => parseMassSettings(snapshot), [snapshot]);
}

function subscribeToMassSettings(onStoreChange: () => void) {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === SETTINGS_KEY) {
      onStoreChange();
    }
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(MASS_SETTINGS_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(MASS_SETTINGS_EVENT, onStoreChange);
  };
}

function getMassSettingsSnapshot() {
  return window.localStorage.getItem(SETTINGS_KEY) ?? SERVER_SETTINGS_SNAPSHOT;
}

function getServerMassSettingsSnapshot() {
  return SERVER_SETTINGS_SNAPSHOT;
}

function parseMassSettings(value: string): MassSettings {
  try {
    const parsed = JSON.parse(value) as Partial<MassSettings>;
    return {
      anticipatedCutoff: isClockTime(parsed.anticipatedCutoff)
        ? parsed.anticipatedCutoff
        : DEFAULT_ANTICIPATED_CUTOFF,
      readingTranslation: isMassReadingTranslation(parsed.readingTranslation)
        ? parsed.readingTranslation
        : DEFAULT_SETTINGS.readingTranslation,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveMassSettings(settings: MassSettings) {
  if (
    !isClockTime(settings.anticipatedCutoff) ||
    !isMassReadingTranslation(settings.readingTranslation)
  ) {
    return;
  }

  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  window.dispatchEvent(new Event(MASS_SETTINGS_EVENT));
}

function isClockTime(value: unknown): value is string {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function isMassReadingTranslation(
  value: unknown,
): value is MassReadingTranslation {
  return value === "us-lectionary" || value === "douay-rheims";
}
