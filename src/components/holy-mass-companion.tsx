"use client";

import {
  ArrowDown,
  BookOpen,
  Check,
  ChevronRight,
  Church,
  Clock3,
  Cross,
  Settings2,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import {
  GLORIA_TEXT,
  MASS_ORDER_SECTIONS,
  NICENE_CREED_TEXT,
  type MassOrderItem,
  type MassOrderSection,
  type MassPosture,
} from "@/lib/mass-order";
import {
  type HolyMassRiteKind,
  resolveSaturdayMassContext,
  type SaturdayMassMode,
  type SaturdayMassOverride,
} from "@/lib/holy-mass";
import {
  getScriptureHref,
  type ScriptureReturnSource,
} from "@/lib/scripture";
import type {
  HolyMassCelebrationView,
  HolyMassLoadedOption,
  HolyMassLoadedPsalm,
  HolyMassLoadedSelection,
  HolyMassPageData,
} from "@/server/holy-mass";

const DEFAULT_ANTICIPATED_CUTOFF = "16:00";
const SETTINGS_KEY = "sanctum.mass.settings.v1";
const PROGRESS_KEY_PREFIX = "sanctum.mass.progress.v1";

type MassSettings = {
  anticipatedCutoff: string;
};

const DEFAULT_SETTINGS: MassSettings = {
  anticipatedCutoff: DEFAULT_ANTICIPATED_CUTOFF,
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
          response: GLORIA_TEXT,
        },
        {
          id: "epistle-alleluia-gospel",
          title: "Epistle, Alleluia, and Gospel",
          posture: "Stand",
          cue: "Rise for the solemn Alleluia and the Gospel of the Resurrection.",
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
      ],
    },
    {
      id: "vigil-eucharist",
      title: "Liturgy of the Eucharist",
      items: MASS_ORDER_SECTIONS[2].items.concat(
        MASS_ORDER_SECTIONS[3].items,
      ),
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

  if (
    celebration.riteKind === "good-friday" ||
    celebration.riteKind === "holy-saturday" ||
    celebration.riteKind === "easter-vigil"
  ) {
    return (
      <SpecialLiturgyExperience
        celebration={celebration}
        key={celebration.id}
        saturdayControls={saturdayControls}
      />
    );
  }

  return (
    <MassExperience
      celebration={celebration}
      key={celebration.id}
      saturdayControls={saturdayControls}
    />
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

            <OrderItems items={section.items} />

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
  saturdayControls,
}: {
  celebration: HolyMassCelebrationView;
  saturdayControls: ReactNode;
}) {
  const massSections = useMemo(
    () => getMassSections(celebration.riteKind),
    [celebration.riteKind],
  );
  const [activeSection, setActiveSection] = useState(
    massSections[0].id,
  );
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
          nextSection={massSections[2]}
          section={massSections[1]}
        >
          <LiturgyOfTheWord celebration={celebration} />
        </RiteSection>

        <RiteSection
          accent={liturgicalAccent}
          nextSection={massSections[3]}
          section={massSections[2]}
        >
          <OrderItems items={MASS_ORDER_SECTIONS[2].items} />
        </RiteSection>

        <RiteSection
          accent={liturgicalAccent}
          nextSection={massSections[4]}
          section={massSections[3]}
        >
          <OrderItems items={MASS_ORDER_SECTIONS[3].items} />
        </RiteSection>

        <RiteSection
          accent={liturgicalAccent}
          nextSection={null}
          section={massSections[4]}
        >
          <OrderItems
            items={
              celebration.riteKind === "holy-thursday"
                ? HOLY_THURSDAY_TRANSFER_ITEMS
                : MASS_ORDER_SECTIONS[4].items
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
  nextSection,
  section,
}: {
  accent: string;
  children: ReactNode;
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
      <header className="mb-8 grid gap-4 sm:grid-cols-[4rem_minmax(0,1fr)] sm:items-center">
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
  const collectIndex = items.findIndex((item) => item.id === "collect");
  const ordered: MassOrderItem[] = items.map((item) =>
    item.id === "penitential-act" && sprinklingRite
      ? {
          ...item,
          title: "Penitential Act or Sprinkling Rite",
          cue: "Follow the rite chosen by the celebrant.",
        }
      : item,
  );
  if (riteKind === "palm-sunday") {
    ordered.unshift({
      id: "commemoration-entrance",
      title: "Commemoration of the Lord’s Entrance",
      posture: "Stand",
      cue: "Hold the blessed palm and join the procession or solemn entrance.",
      response: "Hosanna in the highest.",
    });
  }
  if (gloria) {
    ordered.splice(collectIndex, 0, {
      id: "gloria",
      title: "Gloria",
      posture: "Stand",
      response: GLORIA_TEXT,
    });
  }

  return <OrderItems items={ordered} />;
}

function LiturgyOfTheWord({
  celebration,
}: {
  celebration: HolyMassCelebrationView;
}) {
  const [optionId, setOptionId] = useState(celebration.options[0]?.id ?? "");
  const selectedOption =
    celebration.options.find((option) => option.id === optionId) ??
    celebration.options[0] ??
    null;

  return (
    <div className="space-y-8">
      {celebration.options.length > 1 ? (
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel-soft)] p-4">
          <label
            className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]"
            htmlFor="mass-reading-option"
          >
            Lectionary
          </label>
          <select
            className="mt-2 w-full rounded-xl border border-[var(--line)] bg-[var(--vellum)] px-4 text-sm font-semibold text-[var(--foreground)]"
            id="mass-reading-option"
            onChange={(event) => setOptionId(event.target.value)}
            value={selectedOption?.id ?? ""}
          >
            {celebration.options.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {selectedOption ? (
        <MassReadings
          option={selectedOption}
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
            The Word of God
          </h3>
          <a
            className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-full bg-[var(--sanctuary-night)] px-5 text-sm font-bold text-[var(--vellum)]"
            href={celebration.officialReadingsUrl}
            rel="noreferrer"
            target="_blank"
          >
            Today&apos;s readings
            <ChevronRight aria-hidden className="size-4" />
          </a>
        </section>
      )}

      <MassOrderCard
        item={{
          id: "homily",
          title: "Homily",
          posture: "Sit",
          cue: "Listen and receive the Word in silence.",
        }}
      />

      {celebration.riteKind === "holy-thursday" ? (
        <MassOrderCard
          item={{
            id: "washing-feet",
            title: "Washing of Feet",
            posture: "Sit",
            cue: "Join the chant and contemplate the Lord’s commandment of charity.",
          }}
        />
      ) : null}

      {celebration.profile.requirements.creed ? (
        <MassOrderCard
          item={{
            id: "creed",
            title: "Profession of Faith",
            posture: "Stand",
            cue: "Bow at the words of the Incarnation.",
            response: NICENE_CREED_TEXT,
          }}
        />
      ) : null}

      <MassOrderCard
        item={{
          id: "universal-prayer",
          title: "Universal Prayer",
          posture: "Stand",
          cue: "Respond with the invocation announced for each petition.",
        }}
      />
    </div>
  );
}

function MassReadings({
  option,
  requirements,
  returnSource,
}: {
  option: HolyMassLoadedOption;
  requirements: HolyMassCelebrationView["profile"]["requirements"];
  returnSource: ScriptureReturnSource;
}) {
  const [gospelIndex, setGospelIndex] = useState(0);
  const gospel = option.gospelChoices[gospelIndex] ?? option.gospelChoices[0];

  return (
    <div className="space-y-8">
      <ReadingCard
        after="Thanks be to God."
        posture="Sit"
        returnSource={returnSource}
        selection={option.firstReading}
      />

      <PsalmCard psalm={option.responsorialPsalm} />

      {requirements.secondReading && option.secondReading ? (
        <ReadingCard
          after="Thanks be to God."
          posture="Sit"
          returnSource={returnSource}
          selection={option.secondReading}
        />
      ) : null}

      {requirements.sequence !== "none" ? (
        <MassOrderCard
          item={{
            id: "sequence",
            title: "Sequence",
            posture: "Sit",
            cue:
              requirements.sequence === "required"
                ? "Join the sequence before the Gospel acclamation."
                : "Join the sequence when it is used.",
          }}
        />
      ) : null}

      <ReadingCard
        compact
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
          beforeResponses={[
            { label: "At the greeting", text: "And with your spirit." },
            { label: "At the announcement", text: "Glory to you, O Lord." },
          ]}
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
  beforeResponses,
  compact = false,
  posture,
  returnSource,
  selection,
}: {
  after?: string;
  beforeResponses?: { label: string; text: string }[];
  compact?: boolean;
  posture: MassPosture;
  returnSource: ScriptureReturnSource;
  selection: HolyMassLoadedSelection;
}) {
  return (
    <article className="illuminated-panel overflow-hidden rounded-3xl border border-[var(--line)] bg-[var(--panel)] shadow-[0_18px_56px_rgba(11,28,22,0.055)]">
      <header className="border-b border-[var(--line)] bg-[var(--panel-soft)] px-5 py-5 sm:px-8 sm:py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.13em] text-[color:var(--liturgical-accent)]">
              {selection.title}
            </p>
            <h3 className="mt-2 font-serif text-2xl font-semibold text-[var(--foreground)] sm:text-3xl">
              {selection.displayCitation}
            </h3>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <span className="inline-flex min-h-9 items-center rounded-full border border-[var(--line)] bg-[var(--vellum)] px-3 text-[0.68rem] font-bold uppercase tracking-[0.1em] text-[var(--muted)]">
              Douay-Rheims
            </span>
            <Posture posture={posture} />
          </div>
        </div>
      </header>

      <div className={compact ? "px-5 py-6 sm:px-8" : "px-5 py-8 sm:px-10 sm:py-10"}>
        {beforeResponses?.length ? (
          <div className="mb-8 space-y-4">
            {beforeResponses.map((response) => (
              <PeopleResponse key={response.label} label={response.label}>
                {response.text}
              </PeopleResponse>
            ))}
          </div>
        ) : null}

        <div className="space-y-7">
          {selection.segments.map((segment, segmentIndex) => (
            <div key={`${segment.reference}:${segmentIndex}`}>
              <div
                className={[
                  "space-y-4 font-serif text-[1.08rem] leading-8 text-[var(--foreground)] sm:text-xl sm:leading-9",
                  compact ? "italic" : "",
                ].join(" ")}
              >
                {segment.verses.map((verse) => (
                  <p key={`${segment.reference}:${verse.number}`}>
                    <span className="sr-only">Verse {verse.label}. </span>
                    {verse.text}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>

        {after ? (
          <div className="mt-8">
            <PeopleResponse label="People">{after}</PeopleResponse>
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
              {selection.segments[index]?.reference ?? "Open in Scripture"}
            </Link>
          ))}
        </div>
      </div>
    </article>
  );
}

function PsalmCard({ psalm }: { psalm: HolyMassLoadedPsalm }) {
  const refrain = psalm.refrains[0] ?? null;

  return (
    <article className="illuminated-panel overflow-hidden rounded-3xl border border-[var(--line)] bg-[var(--panel)] shadow-[0_18px_56px_rgba(11,28,22,0.055)]">
      <header className="border-b border-[var(--line)] bg-[var(--panel-soft)] px-5 py-5 sm:px-8 sm:py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.13em] text-[color:var(--liturgical-accent)]">
              Responsorial Psalm
            </p>
            <h3 className="mt-2 font-serif text-2xl font-semibold text-[var(--foreground)] sm:text-3xl">
              {psalm.displayCitation}
            </h3>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <span className="inline-flex min-h-9 items-center rounded-full border border-[var(--line)] bg-[var(--vellum)] px-3 text-[0.68rem] font-bold uppercase tracking-[0.1em] text-[var(--muted)]">
              Douay-Rheims
            </span>
            <Posture posture="Sit" />
          </div>
        </div>
      </header>
      <div className="px-5 py-8 sm:px-10 sm:py-10">
        {refrain ? (
          <blockquote className="mb-8 border-l-2 border-[color:var(--liturgical-accent)] pl-5 font-serif text-xl font-semibold italic leading-8 text-[var(--foreground)] sm:text-2xl sm:leading-9">
            <span className="mr-2 text-[color:var(--liturgical-accent)]">R.</span>
            {refrain}
          </blockquote>
        ) : null}

        <div className="space-y-7">
          {psalm.segments.map((segment, segmentIndex) => (
            <div
              className="space-y-4 font-serif text-[1.08rem] leading-8 text-[var(--foreground)] sm:text-xl sm:leading-9"
              key={`${segment.reference}:${segmentIndex}`}
            >
              {segment.verses.map((verse) => (
                <p key={`${segment.reference}:${verse.number}`}>
                  <span className="sr-only">Verse {verse.label}. </span>
                  {verse.text}
                </p>
              ))}
              {refrain ? (
                <p className="font-semibold italic text-[color:var(--liturgical-accent)]">
                  R. {refrain}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}

function OrderItems({ items }: { items: readonly MassOrderItem[] }) {
  return (
    <ol className="space-y-4">
      {items.map((item) => (
        <li key={item.id}>
          <MassOrderCard item={item} />
        </li>
      ))}
    </ol>
  );
}

function MassOrderCard({ item }: { item: MassOrderItem }) {
  return (
    <article className="group grid gap-4 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5 transition hover:border-[color:var(--liturgical-accent)]/50 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-6 sm:p-7">
      <div>
        <Posture posture={item.posture} />
      </div>
      <div>
        <h3 className="font-serif text-2xl font-semibold text-[var(--foreground)]">
          {item.title}
        </h3>
        {item.cue ? (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            {item.cue}
          </p>
        ) : null}
        {item.response ? (
          <div className="mt-5">
            <PeopleResponse label={item.responseLabel ?? "People"}>
              {item.response}
            </PeopleResponse>
          </div>
        ) : null}
      </div>
    </article>
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
    <div className="border-l-2 border-[color:var(--liturgical-accent)] pl-4 sm:pl-5">
      <p className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-[color:var(--liturgical-accent)]">
        {label}
      </p>
      <p className="mt-1 font-serif text-xl font-semibold leading-8 text-[var(--foreground)] sm:text-2xl sm:leading-9">
        {children}
      </p>
    </div>
  );
}

function Posture({ posture }: { posture: MassPosture }) {
  return (
    <span className="inline-flex min-h-9 items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--vellum)] px-3 text-[0.68rem] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">
      {posture === "Kneel" ? (
        <Sparkles aria-hidden className="size-3.5 text-[color:var(--liturgical-accent)]" />
      ) : posture === "Stand" ? (
        <Church aria-hidden className="size-3.5 text-[color:var(--liturgical-accent)]" />
      ) : (
        <Check aria-hidden className="size-3.5 text-[color:var(--liturgical-accent)]" />
      )}
      {posture}
    </span>
  );
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
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveMassSettings(settings: MassSettings) {
  if (!isClockTime(settings.anticipatedCutoff)) {
    return;
  }

  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  window.dispatchEvent(new Event(MASS_SETTINGS_EVENT));
}

function isClockTime(value: unknown): value is string {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}
