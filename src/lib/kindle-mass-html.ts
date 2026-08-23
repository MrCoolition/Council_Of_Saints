import {
  APOSTLES_CREED_TEXT,
  GLORIA_TEXT,
  MASS_ORDER_SECTIONS,
  NICENE_CREED_TEXT,
  type MassDialogueLine,
  type MassDialogueRole,
  type MassOrderItem,
} from "./mass-order";
import { resolveSaturdayMassContext } from "./holy-mass";
import { getScriptureBook, parseScriptureReference } from "./scripture";
import type {
  HolyMassCelebrationView,
  HolyMassLoadedOption,
  HolyMassLoadedPsalm,
  HolyMassLoadedSelection,
  HolyMassPageData,
} from "@/server/holy-mass";
import type {
  UsccbLectionaryItem,
  UsccbLectionarySection,
} from "./usccb-lectionary";

export type KindleMassForm = "auto" | "daytime" | "anticipated";

export type KindleMassExplicitForm = Exclude<KindleMassForm, "auto">;

export type KindleMassRenderOptions = {
  form: KindleMassForm;
  basePath?: string;
  preparedDate?: string;
};

export type KindleMassResponseHeaderOptions = {
  prepared: boolean;
};

type KindleMassSection = {
  id: string;
  shortTitle: string;
  title: string;
  body: string;
};

type SpecialRiteKind = Extract<
  HolyMassCelebrationView["riteKind"],
  "good-friday" | "holy-saturday" | "easter-vigil"
>;

type SpecialRiteSection = {
  id: string;
  title: string;
  readings?: boolean;
  items: readonly MassOrderItem[];
};

type ReadingKind =
  | "reading"
  | "psalm"
  | "sequence"
  | "acclamation"
  | "gospel";

const DEFAULT_BASE_PATH = "/mass/kindle";

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
          cue: "Listen to the Passion. Kneel in silence at the Lord's death.",
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
          title: "The Lord's Prayer",
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
      title: "At the Lord's Tomb",
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
          title: "Easter Proclamation - Exsultet",
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

/** Selects the civil-day or anticipated celebration without using browser state. */
export function resolveKindleMassView(
  data: HolyMassPageData,
  form: KindleMassForm,
): HolyMassCelebrationView {
  if (!data.anticipated) {
    return data.daytime;
  }

  const normalizedForm: KindleMassForm =
    form === "daytime" || form === "anticipated" ? form : "auto";

  // Holy Saturday has no daytime Mass. The modern app deliberately enters the
  // Vigil only after an explicit choice, rather than guessing from a clock.
  if (data.daytime.riteKind === "holy-saturday") {
    return normalizedForm === "anticipated"
      ? data.anticipated
      : data.daytime;
  }

  return resolveSaturdayMassContext({
    civilDate: data.civilDate,
    civilTime: data.civilTime,
    daytime: data.daytime,
    anticipated: data.anticipated,
    override: normalizedForm,
  }).context;
}

/** Renders a complete, self-contained Mass document for legacy browsers. */
export function renderKindleMassHtml(
  data: HolyMassPageData,
  options: KindleMassRenderOptions,
): string {
  const basePath = normalizeBasePath(options.basePath);
  const celebration = resolveKindleMassView(data, options.form);
  const preparedDate =
    options.preparedDate === data.civilDate &&
    isIsoCalendarDate(options.preparedDate)
      ? options.preparedDate
      : null;
  const readingCelebration = getReadingCelebration(data, celebration);
  const sections = isSpecialRite(celebration.riteKind)
    ? buildSpecialSections(celebration, readingCelebration)
    : buildOrdinarySections(celebration, readingCelebration);
  const header = renderCelebrationHeader(
    data,
    celebration,
    options.form,
    basePath,
    preparedDate,
  );
  const navigation = renderSectionNavigation(sections);
  const body = sections
    .map((section, index) => renderMassSection(section, index, sections))
    .join("");
  const preparedNotice = preparedDate
    ? `<p class="prepared-copy">Prepared for Mass on ${escapeHtml(
        celebration.dateLabel,
      )}. Keep this page open until Mass; the browser may also retain this dated copy for offline use.</p>`
    : "";

  return renderDocument({
    title: `${celebration.title} - Kindle Holy Mass`,
    manifestUrl: preparedDate
      ? buildManifestHref(preparedDate, celebration.mode)
      : null,
    body: [
      '<div id="page">',
      '<a class="skip" href="#mass-content">Skip to the Order of Mass</a>',
      header,
      preparedNotice,
      navigation,
      '<div id="mass-content">',
      body,
      "</div>",
      '<div class="finale"><p>Deo gratias.</p><p><a href="#top">Back to top</a></p></div>',
      "</div>",
    ].join(""),
  });
}

/** Renders a dependency-free failure page for the same legacy endpoint. */
export function renderKindleMassUnavailable(): string {
  return renderDocument({
    title: "Holy Mass - Sanctum Council",
    manifestUrl: null,
    body: [
      '<div id="page">',
      '<div class="masthead" id="top">',
      '<p class="eyebrow">Sanctum Council</p>',
      "<h1>Holy Mass</h1>",
      "<p>The Holy Mass could not be prepared. Please try again.</p>",
      `<p><a class="action" href="${escapeAttribute(DEFAULT_BASE_PATH)}">Try again</a></p>`,
      "</div>",
      "</div>",
    ].join(""),
  });
}

/** Response headers shared by the live and browser-prepared views. */
export function getKindleMassResponseHeaders({
  prepared,
}: KindleMassResponseHeaderOptions): Record<string, string> {
  return {
    "Cache-Control": prepared
      ? "private, max-age=86400, immutable"
      : "private, no-store, max-age=0",
    "Content-Language": "en",
    "Content-Security-Policy":
      "default-src 'self'; script-src 'none'; object-src 'none'; frame-src 'none'; img-src 'none'; font-src 'none'; style-src 'unsafe-inline'; connect-src 'self'; manifest-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
    "Content-Type": "text/html; charset=utf-8",
    "Referrer-Policy": "no-referrer",
    "Vary": "Cookie",
    "X-Content-Type-Options": "nosniff",
  };
}

/** Legacy HTML5 AppCache manifest for a dated, explicitly selected Mass. */
export function renderKindleMassCacheManifest(
  date: string,
  explicitForm: KindleMassExplicitForm,
): string {
  if (!isIsoCalendarDate(date)) {
    throw new RangeError(`Invalid Kindle Mass cache date: ${date}`);
  }
  if (explicitForm !== "daytime" && explicitForm !== "anticipated") {
    throw new RangeError(`Invalid explicit Kindle Mass form: ${explicitForm}`);
  }

  const preparedUrl = buildInternalHref(DEFAULT_BASE_PATH, {
    form: explicitForm,
    offline: date,
  });

  return [
    "CACHE MANIFEST",
    `# Sanctum Council Holy Mass ${date} ${explicitForm}`,
    "CACHE:",
    preparedUrl,
    "NETWORK:",
    "*",
    "",
  ].join("\n");
}

function buildOrdinarySections(
  celebration: HolyMassCelebrationView,
  readingCelebration: HolyMassCelebrationView,
): KindleMassSection[] {
  const requirements = celebration.profile.requirements;
  const wordItems: MassOrderItem[] = [MASS_ORDER_SECTIONS[1].items[0]];

  if (celebration.riteKind === "holy-thursday") {
    wordItems.push({
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

  if (requirements.creed) {
    wordItems.push({
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

  wordItems.push(MASS_ORDER_SECTIONS[1].items[1]);

  const dismissalTitle =
    celebration.riteKind === "holy-thursday"
      ? "Transfer of the Most Blessed Sacrament"
      : MASS_ORDER_SECTIONS[3].title;
  const dismissalItems =
    celebration.riteKind === "holy-thursday"
      ? HOLY_THURSDAY_TRANSFER_ITEMS
      : MASS_ORDER_SECTIONS[3].items;

  return [
    {
      id: "entrance",
      shortTitle: "Entrance",
      title: MASS_ORDER_SECTIONS[0].title,
      body: renderOrderItems(buildIntroductoryItems(celebration)),
    },
    {
      id: "word",
      shortTitle: "The Word",
      title: MASS_ORDER_SECTIONS[1].title,
      body: [
        renderReadings(readingCelebration, requirements),
        renderOrderItems(wordItems),
      ].join(""),
    },
    {
      id: "eucharist",
      shortTitle: "Eucharist",
      title: MASS_ORDER_SECTIONS[2].title,
      body: renderOrderItems(MASS_ORDER_SECTIONS[2].items),
    },
    {
      id: "dismissal",
      shortTitle:
        celebration.riteKind === "holy-thursday" ? "Reposition" : "Dismissal",
      title: dismissalTitle,
      body: renderOrderItems(dismissalItems),
    },
  ];
}

function buildSpecialSections(
  celebration: HolyMassCelebrationView,
  readingCelebration: HolyMassCelebrationView,
): KindleMassSection[] {
  if (!isSpecialRite(celebration.riteKind)) {
    return [];
  }

  const source = SPECIAL_RITE_SECTIONS[celebration.riteKind];

  return source.map((section) => ({
    id: section.id,
    shortTitle: section.title,
    title: section.title,
    body: [
      section.readings
        ? renderReadings(readingCelebration, celebration.profile.requirements)
        : "",
      renderOrderItems(section.items),
    ].join(""),
  }));
}

function buildIntroductoryItems(
  celebration: HolyMassCelebrationView,
): MassOrderItem[] {
  const items = MASS_ORDER_SECTIONS[0].items;
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
            { role: "rubric" as const, text: "The Kyrie follows." },
            ...kyrieVariant.lines,
          ],
        }));
      });

      return {
        ...item,
        title: celebration.profile.requirements.sprinklingRite
          ? "Penitential Act, Kyrie, or Sprinkling Rite"
          : "Penitential Act and Kyrie",
        lines: [],
        defaultVariantId: "form-a-english",
        variants: celebration.profile.requirements.sprinklingRite
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

  if (celebration.riteKind === "palm-sunday") {
    const collect = ordered.find((item) => item.id === "collect");
    return [
      {
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
              {
                role: "people",
                text: "Praise to you, Lord Jesus Christ.",
              },
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
      },
      ...(collect ? [collect] : []),
    ];
  }

  if (celebration.profile.requirements.gloria) {
    const collectIndex = ordered.findIndex((item) => item.id === "collect");
    ordered.splice(Math.max(collectIndex, 0), 0, {
      id: "gloria",
      title: "Gloria",
      posture: "Stand",
      lines: [{ role: "all", text: GLORIA_TEXT }],
    });
  }

  return ordered;
}

function renderCelebrationHeader(
  data: HolyMassPageData,
  celebration: HolyMassCelebrationView,
  form: KindleMassForm,
  basePath: string,
  preparedDate: string | null,
) {
  const details = [
    celebration.rank,
    celebration.season,
    celebration.liturgicalColor,
    celebration.cycleLabel,
    celebration.lectionaryNumbers.length > 0
      ? `Lectionary ${celebration.lectionaryNumbers.join(" / ")}`
      : null,
  ].filter((value): value is string => Boolean(value));
  const modeControls = data.anticipated
    ? renderMassFormControls(data, celebration, form, basePath, preparedDate)
    : "";
  const prepareLink = preparedDate
    ? ""
    : `<p><a class="action" href="${escapeAttribute(
        buildInternalHref(basePath, {
          form: celebration.mode,
          offline: data.civilDate,
        }),
      )}">Prepare for Mass</a></p><p class="source-note">Open the prepared page before leaving your connection, then keep it open for Mass.</p>`;

  return [
    '<div class="masthead" id="top">',
    '<p class="eyebrow">Sanctum Council - Holy Mass</p>',
    `<p class="date"><time datetime="${escapeAttribute(
      celebration.localDate,
    )}">${escapeHtml(celebration.dateLabel)}</time></p>`,
    `<h1>${escapeHtml(celebration.title)}</h1>`,
    `<p class="facts">${details.map(escapeHtml).join(" - ")}</p>`,
    modeControls,
    prepareLink,
    "</div>",
  ].join("");
}

function renderMassFormControls(
  data: HolyMassPageData,
  celebration: HolyMassCelebrationView,
  form: KindleMassForm,
  basePath: string,
  preparedDate: string | null,
) {
  if (preparedDate) {
    return `<p class="mode">${
      celebration.mode === "anticipated"
        ? "Anticipated Sunday Mass"
        : data.daytime.riteKind === "holy-saturday"
          ? "Holy Saturday daytime"
          : "Saturday daytime Mass"
    }</p>`;
  }

  const choices: { form: KindleMassForm; label: string }[] = [
    { form: "auto", label: "Auto" },
    { form: "daytime", label: "Saturday" },
    {
      form: "anticipated",
      label:
        data.daytime.riteKind === "holy-saturday" ? "Easter Vigil" : "Sunday",
    },
  ];

  return [
    '<div class="mode"><strong>Saturday Mass:</strong> ',
    choices
      .map((choice) => {
        const active = choice.form === form;
        const href = buildInternalHref(basePath, { form: choice.form });
        return `<a${active ? ' class="current"' : ""} href="${escapeAttribute(
          href,
        )}">${escapeHtml(choice.label)}</a>`;
      })
      .join(" | "),
    "</div>",
  ].join("");
}

function renderSectionNavigation(sections: readonly KindleMassSection[]) {
  return [
    '<div class="navigation" id="order"><p><strong>Order of the Celebration</strong></p><ol>',
    sections
      .map(
        (section) =>
          `<li><a href="#rite-${escapeAttribute(safeId(section.id))}">${escapeHtml(
            section.shortTitle,
          )}</a></li>`,
      )
      .join(""),
    "</ol></div>",
  ].join("");
}

function renderMassSection(
  section: KindleMassSection,
  index: number,
  sections: readonly KindleMassSection[],
) {
  const next = sections[index + 1] ?? null;
  const nextLink = next
    ? ` | <a href="#rite-${escapeAttribute(safeId(next.id))}">Next: ${escapeHtml(
        next.shortTitle,
      )}</a>`
    : "";

  return [
    `<div class="mass-section" id="rite-${escapeAttribute(safeId(section.id))}">`,
    `<p class="section-number">${index + 1}</p>`,
    `<h2>${escapeHtml(section.title)}</h2>`,
    section.body,
    `<p class="back"><a href="#order">Back to the Order</a>${nextLink}</p>`,
    "</div>",
  ].join("");
}

function renderOrderItems(items: readonly MassOrderItem[]) {
  return `<div class="order-items">${items.map(renderOrderItem).join("")}</div>`;
}

function renderOrderItem(item: MassOrderItem, index: number) {
  const commonLines = getCommonLines(item);
  const variants = item.variants ?? [];
  const content = [
    commonLines.length > 0
      ? `<div class="dialogue">${commonLines.map(renderDialogueLine).join("")}</div>`
      : "",
    variants.length > 0
      ? [
          '<div class="variants"><p class="variant-heading">Forms that may be heard</p>',
          variants
            .map((variant) => {
              const defaultLabel =
                variant.id === item.defaultVariantId
                  ? '<span class="usual">Usual form</span>'
                  : "";
              return [
                '<div class="variant">',
                `<h4>${escapeHtml(variant.label)} ${defaultLabel}</h4>`,
                '<div class="dialogue">',
                variant.lines.map(renderDialogueLine).join(""),
                "</div></div>",
              ].join("");
            })
            .join(""),
          "</div>",
        ].join("")
      : "",
  ].join("");

  return [
    `<div class="order-item" id="item-${escapeAttribute(safeId(item.id))}-${index}">`,
    `<p class="posture">${escapeHtml(item.posture)}</p>`,
    item.subgroup
      ? `<p class="subgroup">${escapeHtml(item.subgroup)}</p>`
      : "",
    `<h3>${escapeHtml(item.title)}</h3>`,
    content,
    "</div>",
  ].join("");
}

function getCommonLines(item: MassOrderItem): readonly MassDialogueLine[] {
  if (item.lines && item.lines.length > 0) {
    return item.lines;
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

function renderDialogueLine(line: MassDialogueLine) {
  const label = line.label
    ? `${ROLE_LABELS[line.role]} - ${line.label}`
    : ROLE_LABELS[line.role];
  return [
    `<div class="line role-${escapeAttribute(line.role)}">`,
    `<p class="role-label">${escapeHtml(label)}</p>`,
    `<p>${escapeHtml(line.text)}</p>`,
    "</div>",
  ].join("");
}

function renderReadings(
  readingCelebration: HolyMassCelebrationView,
  requirements: HolyMassCelebrationView["profile"]["requirements"],
) {
  const usReadings = renderUsccbReadings(readingCelebration);
  const douayReadings = renderDouayReadings(readingCelebration, requirements);
  return [
    '<div class="readings" id="readings">',
    '<p class="eyebrow">The Sacred Readings</p>',
    usReadings,
    douayReadings,
    "</div>",
  ].join("");
}

function renderUsccbReadings(celebration: HolyMassCelebrationView) {
  if (celebration.readingSets.length > 0) {
    return [
      '<div class="translation" id="us-lectionary">',
      "<h3>At Mass - U.S. Lectionary</h3>",
      celebration.readingSets
        .map((set, index) =>
          renderUsccbReadingItem(set.item, {
            description: set.description,
            id: set.id,
            label: set.label,
            lectionaryNumber: set.lectionaryNumber,
            primary: index === 0,
          }),
        )
        .join(""),
      "</div>",
    ].join("");
  }

  if (celebration.massLectionary) {
    return [
      '<div class="translation" id="us-lectionary">',
      "<h3>At Mass - U.S. Lectionary</h3>",
      renderUsccbReadingItem(celebration.massLectionary, {
        id: "daily-lectionary",
        label: "Daily Lectionary set",
        primary: true,
      }),
      "</div>",
    ].join("");
  }

  const officialUrl = getSafeUsccbUrl(celebration.officialReadingsUrl);
  return [
    '<div class="translation" id="us-lectionary">',
    "<h3>At Mass - U.S. Lectionary</h3>",
    '<p><strong>Readings unavailable.</strong></p>',
    officialUrl
      ? `<p><a href="${escapeAttribute(officialUrl)}">Open the official daily readings</a></p>`
      : "",
    "</div>",
  ].join("");
}

function renderUsccbReadingItem(
  item: UsccbLectionaryItem,
  context: {
    description?: string;
    id: string;
    label: string;
    lectionaryNumber?: number | null;
    primary: boolean;
  },
) {
  const officialUrl = getSafeUsccbUrl(item.link);
  return [
    `<div class="reading-set${context.primary ? " primary-set" : ""}" id="us-set-${escapeAttribute(
      safeId(context.label),
    )}">`,
    `<p class="set-label">${escapeHtml(context.label)}${
      context.lectionaryNumber
        ? ` - Lectionary ${context.lectionaryNumber}`
        : ""
    }</p>`,
    `<h4>${escapeHtml(item.title)}</h4>`,
    context.description
      ? `<p class="source-note">${escapeHtml(context.description)}</p>`
      : "",
    item.sections
      .map((section, index) => renderUsccbSection(section, index, context.id))
      .join(""),
    officialUrl
      ? `<p><a href="${escapeAttribute(officialUrl)}">Official USCCB readings</a></p>`
      : "",
    "</div>",
  ].join("");
}

function renderUsccbSection(
  section: UsccbLectionarySection,
  index: number,
  setId: string,
) {
  const kind = getReadingKind(section.title);
  const officialUrl = getSafeUsccbUrl(section.officialUrl);
  const primaryReference = section.citation
    .split(",", 1)[0]
    .trim()
    .replace(/(\d)[a-z]$/iu, "$1");
  const parsedReference = parseScriptureReference(primaryReference);
  const scriptureBookId = parsedReference.ok ? parsedReference.book.id : null;
  const opening = renderReadingOpening(kind, scriptureBookId);
  const closing = renderReadingClosing(kind);

  return [
    `<div class="reading reading-${kind}" id="us-reading-${escapeAttribute(
      safeId(setId),
    )}-${escapeAttribute(safeId(section.id))}-${index}">`,
    `<p class="posture">${escapeHtml(getReadingPosture(kind))}</p>`,
    `<h5>${escapeHtml(section.title)}</h5>`,
    `<p class="citation">${escapeHtml(section.citation)}</p>`,
    opening,
    '<div class="reading-text">',
    section.lines.map((line) => `<p>${escapeHtml(line)}</p>`).join(""),
    "</div>",
    closing,
    officialUrl
      ? `<p class="source-link"><a href="${escapeAttribute(officialUrl)}">USCCB source</a></p>`
      : "",
    "</div>",
  ].join("");
}

function renderDouayReadings(
  celebration: HolyMassCelebrationView,
  requirements: HolyMassCelebrationView["profile"]["requirements"],
) {
  if (celebration.options.length === 0) {
    return "";
  }

  return [
    '<div class="translation" id="douay-rheims">',
    "<h3>Douay-Rheims</h3>",
    celebration.options
      .map((option, index) =>
        renderDouayOption(option, requirements, index === 0),
      )
      .join(""),
    "</div>",
  ].join("");
}

function renderDouayOption(
  option: HolyMassLoadedOption,
  requirements: HolyMassCelebrationView["profile"]["requirements"],
  primary: boolean,
) {
  const officialUrl = getSafeUsccbUrl(option.officialUrl);
  return [
    `<div class="reading-set${primary ? " primary-set" : ""}" id="douay-set-${escapeAttribute(
      safeId(option.id),
    )}">`,
    `<p class="set-label">${escapeHtml(option.label)}</p>`,
    option.description
      ? `<p class="source-note">${escapeHtml(option.description)}</p>`
      : "",
    renderDouaySelection(option.firstReading, "reading"),
    renderDouayPsalm(option.responsorialPsalm),
    requirements.secondReading && option.secondReading
      ? renderDouaySelection(option.secondReading, "reading")
      : "",
    requirements.sequence !== "none"
      ? renderOrderItem(
          {
            id: `sequence-${option.id}`,
            title: "Sequence",
            posture: "Sit",
            cue:
              requirements.sequence === "required"
                ? "Join the sequence before the Gospel acclamation."
                : "Join the sequence when it is used.",
          },
          0,
        )
      : "",
    renderDouaySelection(option.gospelAcclamation, "acclamation"),
    option.gospelChoices
      .map((gospel) => renderDouaySelection(gospel, "gospel"))
      .join(""),
    officialUrl
      ? `<p><a href="${escapeAttribute(officialUrl)}">Official USCCB reading set</a></p>`
      : "",
    "</div>",
  ].join("");
}

function renderDouaySelection(
  selection: HolyMassLoadedSelection,
  kind: Exclude<ReadingKind, "psalm" | "sequence">,
) {
  return [
    `<div class="reading reading-${kind}">`,
    `<p class="posture">${escapeHtml(getReadingPosture(kind))}</p>`,
    `<h5>${escapeHtml(selection.title)}</h5>`,
    `<p class="citation">${escapeHtml(selection.displayCitation)}</p>`,
    renderReadingOpening(kind, selection.passages[0]?.bookId ?? null),
    '<div class="reading-text">',
    selection.segments
      .map(
        (segment) =>
          `<div><p class="segment-reference">${escapeHtml(
            segment.reference,
          )}</p>${segment.verses
            .map(
              (verse) =>
                `<p><span class="verse">${escapeHtml(verse.label)}</span> ${escapeHtml(
                  verse.text,
                )}</p>`,
            )
            .join("")}</div>`,
      )
      .join(""),
    "</div>",
    renderReadingClosing(kind),
    "</div>",
  ].join("");
}

function renderDouayPsalm(psalm: HolyMassLoadedPsalm) {
  const refrain = psalm.refrains[0] ?? null;
  return [
    '<div class="reading reading-psalm">',
    '<p class="posture">Sit</p>',
    "<h5>Responsorial Psalm</h5>",
    `<p class="citation">${escapeHtml(psalm.displayCitation)}</p>`,
    refrain
      ? `<div class="line role-people"><p class="role-label">Response</p><p>${escapeHtml(
          refrain,
        )}</p></div>`
      : "",
    '<div class="reading-text">',
    psalm.segments
      .map(
        (segment) =>
          `<div><p class="segment-reference">${escapeHtml(
            segment.reference,
          )}</p>${segment.verses
            .map(
              (verse) =>
                `<p><span class="verse">${escapeHtml(verse.label)}</span> ${escapeHtml(
                  verse.text,
                )}</p>`,
            )
            .join("")}${
            refrain
              ? `<p class="refrain"><strong>Response:</strong> ${escapeHtml(refrain)}</p>`
              : ""
          }</div>`,
      )
      .join(""),
    "</div></div>",
  ].join("");
}

function renderReadingOpening(kind: ReadingKind, bookId: string | null) {
  if (kind === "gospel") {
    return [
      '<div class="dialogue gospel-dialogue">',
      renderDialogueLine({ role: "priest", text: "The Lord be with you." }),
      renderDialogueLine({ role: "people", text: "And with your spirit." }),
      renderDialogueLine({
        role: "priest",
        label: "Deacon or Priest",
        text: `A reading from the holy Gospel according to ${getGospelBookName(
          bookId,
        )}.`,
      }),
      renderDialogueLine({ role: "people", text: "Glory to you, O Lord." }),
      renderDialogueLine({
        role: "rubric",
        text: "Trace the Cross on your forehead, lips, and heart.",
      }),
      "</div>",
    ].join("");
  }

  const introduction = kind === "reading" ? getReadingIntroduction(bookId) : null;
  return introduction
    ? `<div class="dialogue reading-dialogue">${renderDialogueLine({
        role: "reader",
        text: introduction,
      })}</div>`
    : "";
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

function renderReadingClosing(kind: ReadingKind) {
  if (kind === "gospel") {
    return [
      '<div class="dialogue gospel-dialogue">',
      renderDialogueLine({
        role: "priest",
        label: "Deacon or Priest",
        text: "The Gospel of the Lord.",
      }),
      renderDialogueLine({
        role: "people",
        text: "Praise to you, Lord Jesus Christ.",
      }),
      "</div>",
    ].join("");
  }

  if (kind === "reading") {
    return [
      '<div class="dialogue reading-dialogue">',
      renderDialogueLine({ role: "reader", text: "The word of the Lord." }),
      renderDialogueLine({ role: "people", text: "Thanks be to God." }),
      "</div>",
    ].join("");
  }

  return "";
}

function getReadingKind(title: string): ReadingKind {
  const normalized = title.toLowerCase();
  if (
    normalized.includes("gospel") &&
    !normalized.includes("acclamation") &&
    !normalized.includes("verse before")
  ) {
    return "gospel";
  }
  if (normalized.includes("psalm")) {
    return "psalm";
  }
  if (normalized.includes("sequence")) {
    return "sequence";
  }
  if (
    normalized.includes("alleluia") ||
    normalized.includes("acclamation") ||
    normalized.includes("verse before")
  ) {
    return "acclamation";
  }
  return "reading";
}

function getReadingPosture(kind: ReadingKind) {
  return kind === "gospel" || kind === "acclamation" ? "Stand" : "Sit";
}

function getReadingCelebration(
  data: HolyMassPageData,
  celebration: HolyMassCelebrationView,
) {
  if (
    celebration.riteKind === "easter-vigil" &&
    celebration.readingSets.length === 0 &&
    celebration.options.length === 0 &&
    celebration.massLectionary === null
  ) {
    return data.daytime;
  }

  return celebration;
}

function isSpecialRite(
  riteKind: HolyMassCelebrationView["riteKind"],
): riteKind is SpecialRiteKind {
  return (
    riteKind === "good-friday" ||
    riteKind === "holy-saturday" ||
    riteKind === "easter-vigil"
  );
}

function renderDocument({
  title,
  body,
  manifestUrl,
}: {
  title: string;
  body: string;
  manifestUrl: string | null;
}) {
  const manifestAttribute = manifestUrl
    ? ` manifest="${escapeAttribute(manifestUrl)}"`
    : "";

  return [
    "<!doctype html>",
    `<html${manifestAttribute} lang="en"><head>`,
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${escapeHtml(title)}</title>`,
    `<style>${KINDLE_CSS}</style>`,
    "</head><body>",
    body,
    "</body></html>",
  ].join("");
}

function buildManifestHref(
  date: string,
  explicitForm: KindleMassExplicitForm,
) {
  return buildInternalHref(`${DEFAULT_BASE_PATH}/offline.appcache`, {
    date,
    form: explicitForm,
  });
}

function isIsoCalendarDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value);
  if (!match) {
    return false;
  }
  const candidate = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
  );
  return candidate.toISOString().slice(0, 10) === value;
}

function normalizeBasePath(value: string | undefined) {
  if (!value || !/^\/[a-z0-9/_-]*$/iu.test(value)) {
    return DEFAULT_BASE_PATH;
  }
  return value.replace(/\/+$/u, "") || DEFAULT_BASE_PATH;
}

function buildInternalHref(
  basePath: string,
  values: Readonly<Record<string, string>>,
) {
  const query = new URLSearchParams(values).toString();
  return query ? `${basePath}?${query}` : basePath;
}

function getSafeUsccbUrl(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    const allowedHost =
      url.hostname === "bible.usccb.org" ||
      url.hostname === "www.usccb.org" ||
      url.hostname === "usccb.org";
    if (url.protocol !== "https:" || !allowedHost) {
      return null;
    }
    url.username = "";
    url.password = "";
    return url.toString();
  } catch {
    return null;
  }
}

function safeId(value: string) {
  return (
    value
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/gu, "")
      .replace(/[^a-z0-9_-]+/gu, "-")
      .replace(/^-+|-+$/gu, "") || "mass"
  );
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/gu, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

function escapeAttribute(value: string) {
  return escapeHtml(value);
}

const KINDLE_CSS = `
html { background: #e9e4d7; color: #111111; }
body { margin: 0; padding: 0; background: #e9e4d7; color: #111111; font-family: Georgia, "Times New Roman", serif; font-size: 20px; line-height: 1.55; }
#page { width: 92%; max-width: 46em; margin: 0 auto; background: #ffffff; border-left: 1px solid #777777; border-right: 1px solid #777777; }
a { color: #111111; text-decoration: underline; }
a:visited { color: #333333; }
a:focus, a:hover { color: #ffffff; background: #111111; }
.skip { display: block; padding: 0.75em 1em; background: #ffffff; border-bottom: 1px solid #777777; }
.masthead { padding: 2.2em 7%; color: #ffffff; background: #111111; border-bottom: 6px double #ffffff; }
.masthead a { color: #ffffff; }
.masthead a:focus, .masthead a:hover { color: #111111; background: #ffffff; }
.eyebrow, .posture, .subgroup, .set-label, .role-label, .section-number, .variant-heading { margin: 0 0 0.35em; font-family: Arial, Helvetica, sans-serif; font-size: 0.7em; font-weight: bold; letter-spacing: 0.08em; text-transform: uppercase; }
.masthead h1 { margin: 0.2em 0; font-size: 2.25em; line-height: 1.12; }
.date, .facts, .mode { margin: 0.7em 0; }
.current { font-weight: bold; border-bottom: 3px double #ffffff; }
.action { display: inline-block; padding: 0.65em 0.85em; border: 2px solid #ffffff; font-family: Arial, Helvetica, sans-serif; font-weight: bold; }
.prepared-copy { margin: 0; padding: 1em 7%; background: #ffffff; border-bottom: 3px double #111111; font-style: italic; }
.navigation { padding: 1.25em 7%; background: #f4f1e8; border-bottom: 3px double #111111; }
.navigation p { margin: 0 0 0.5em; }
.navigation ol { margin: 0; padding-left: 1.5em; }
.navigation li { margin: 0.45em 0; }
.mass-section { padding: 2em 7%; border-bottom: 5px double #111111; }
.mass-section h2 { margin: 0.15em 0 0.9em; font-size: 1.8em; line-height: 1.18; }
.section-number { display: inline-block; padding: 0.2em 0.55em; color: #ffffff; background: #111111; }
.order-item, .reading-set { margin: 1.4em 0; padding: 1em 4%; border: 1px solid #555555; background: #ffffff; page-break-inside: avoid; }
.order-item h3, .translation h3, .reading-set h4, .reading h5 { margin: 0.2em 0 0.75em; line-height: 1.2; }
.order-item h3 { font-size: 1.35em; }
.translation { margin: 1.5em 0; padding-top: 0.8em; border-top: 4px double #111111; }
.translation h3 { font-size: 1.5em; }
.reading-set h4 { font-size: 1.3em; }
.primary-set { border-width: 3px; }
.source-note, .source-link { font-size: 0.85em; }
.reading { margin: 1.3em 0; padding: 1em 4%; background: #f8f6f0; border-left: 5px solid #111111; }
.reading h5 { font-size: 1.2em; }
.citation, .segment-reference { font-weight: bold; }
.reading-text { margin: 1em 0; font-size: 1.08em; line-height: 1.65; }
.reading-text p { margin: 0.85em 0; }
.verse { font-family: Arial, Helvetica, sans-serif; font-size: 0.72em; font-weight: bold; vertical-align: super; }
.refrain { padding: 0.7em; border: 1px solid #555555; }
.dialogue { margin: 0.8em 0; }
.line { margin: 0.65em 0; padding: 0.75em 4%; border-left: 5px solid #777777; background: #f4f1e8; }
.line p { margin: 0.25em 0; }
.role-priest, .role-deacon, .role-minister { color: #ffffff; background: #222222; border-left-color: #999999; }
.role-people, .role-all { background: #ffffff; border: 2px solid #111111; border-left-width: 7px; font-weight: bold; }
.role-rubric { background: #eeeeee; border-left-color: #555555; font-style: italic; }
.variants { margin: 1em 0 0; padding-top: 0.8em; border-top: 1px dashed #555555; }
.variant { margin: 1em 0; padding: 0.8em 3%; border: 1px dotted #555555; }
.variant h4 { margin: 0 0 0.6em; font-size: 1.05em; }
.usual { padding: 0.2em 0.4em; font-family: Arial, Helvetica, sans-serif; font-size: 0.62em; text-transform: uppercase; border: 1px solid #555555; }
.back { margin-top: 1.8em; text-align: right; }
.finale { padding: 2em 7%; text-align: center; background: #f4f1e8; }
.finale p:first-child { font-size: 1.5em; font-style: italic; }
@media print {
  html, body { background: #ffffff; }
  #page { width: auto; max-width: none; border: 0; }
  .skip, .action, .mode, .back { display: none; }
  .masthead { color: #111111; background: #ffffff; border-color: #111111; }
  .masthead a { color: #111111; }
  .role-priest, .role-deacon, .role-minister { color: #111111; background: #ffffff; border: 2px solid #111111; border-left-width: 7px; }
}
`;
