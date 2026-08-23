import {
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
  HolyMassPageData,
} from "@/server/holy-mass";
import type { UsccbLectionarySection } from "./usccb-lectionary";

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

  // Holy Saturday has no daytime Mass, so its one Mass is the Easter Vigil.
  if (data.daytime.riteKind === "holy-saturday") {
    return data.anticipated ?? data.daytime;
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
    basePath,
    preparedDate,
  );
  const navigation = renderSectionNavigation(sections);
  const body = sections
    .map((section, index) => renderMassSection(section, index, sections))
    .join("");
  const preparedNotice = preparedDate
    ? `<p class="prepared-copy">Ready for church - ${escapeHtml(
        celebration.dateLabel,
      )}.</p>`
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
        { role: "all", text: NICENE_CREED_TEXT },
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
        renderReadings(readingCelebration),
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
        ? renderReadings(readingCelebration)
        : "",
      renderOrderItems(section.items),
    ].join(""),
  }));
}

function buildIntroductoryItems(
  celebration: HolyMassCelebrationView,
): MassOrderItem[] {
  const items = MASS_ORDER_SECTIONS[0].items;
  const penitential = items.find((item) => item.id === "penitential-act");
  const kyrie = items.find((item) => item.id === "kyrie");
  const penitentialForm =
    penitential?.variants?.find(
      (variant) => variant.id === penitential.defaultVariantId,
    ) ?? penitential?.variants?.[0];
  const kyrieForm =
    kyrie?.variants?.find((variant) => variant.id === kyrie.defaultVariantId) ??
    kyrie?.variants?.[0];
  const ordered: MassOrderItem[] = items.flatMap((item) => {
    if (item.id === "kyrie") {
      return [];
    }
    if (item.id !== "penitential-act") {
      return [item];
    }

    return [
      {
        ...item,
        title: "Penitential Act and Kyrie",
        lines: [
          ...(item.lines ?? []),
          ...(penitentialForm?.lines ?? []),
          { role: "rubric" as const, text: "The Kyrie follows." },
          ...(kyrieForm?.lines ?? []),
        ],
        defaultVariantId: undefined,
        variants: undefined,
      },
    ];
  });

  if (celebration.riteKind === "palm-sunday") {
    const collect = ordered.find((item) => item.id === "collect");
    return [
      {
        id: "commemoration-entrance",
        title: "Commemoration of the Lord's Entrance",
        posture: "Stand",
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
  basePath: string,
  preparedDate: string | null,
) {
  const details = [
    celebration.rank,
    celebration.season,
    celebration.liturgicalColor,
    celebration.cycleLabel,
  ].filter((value): value is string => Boolean(value));
  const prepareLink = preparedDate
    ? ""
    : `<p><a class="action" href="${escapeAttribute(
        buildInternalHref(basePath, {
          form: celebration.mode,
          offline: data.civilDate,
        }),
      )}">Prepare for Mass</a></p>`;

  return [
    '<div class="masthead" id="top">',
    '<p class="eyebrow">Holy Mass</p>',
    `<p class="date"><time datetime="${escapeAttribute(
      celebration.localDate,
    )}">${escapeHtml(celebration.dateLabel)}</time></p>`,
    `<h1>${escapeHtml(celebration.title)}</h1>`,
    `<p class="facts">${details.map(escapeHtml).join(" | ")}</p>`,
    prepareLink,
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
  const selectedVariant =
    variants.find((variant) => variant.id === item.defaultVariantId) ??
    variants[0] ??
    null;
  const dialogueLines = [
    ...commonLines,
    ...(selectedVariant?.lines ?? []),
  ];

  return [
    `<div class="order-item" id="item-${escapeAttribute(safeId(item.id))}-${index}">`,
    `<p class="posture">${escapeHtml(item.posture)}</p>`,
    item.subgroup
      ? `<p class="subgroup">${escapeHtml(item.subgroup)}</p>`
      : "",
    `<h3>${escapeHtml(item.title)}</h3>`,
    dialogueLines.length > 0
      ? `<div class="dialogue">${dialogueLines
          .map(renderDialogueLine)
          .join("")}</div>`
      : "",
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

function renderReadings(celebration: HolyMassCelebrationView) {
  const appointed =
    celebration.massLectionary ??
    celebration.readingSets.find((set) => set.sourceKind === "daily")?.item ??
    celebration.readingSets[0]?.item ??
    null;

  if (!appointed) {
    return [
      '<div class="readings" id="readings">',
      "<p><strong>Readings unavailable.</strong></p>",
      "</div>",
    ].join("");
  }

  return [
    '<div class="readings" id="readings">',
    '<div class="reading-set primary-set" id="appointed-readings">',
    appointed.sections
      .filter(isPrimaryReadingSection)
      .map((section, index) => renderUsccbSection(section, index))
      .join(""),
    "</div>",
    "</div>",
  ].join("");
}

function isPrimaryReadingSection(section: UsccbLectionarySection) {
  const title = section.title.trim();
  return (
    !/^alternate gospel$/iu.test(title) &&
    !/\s+option\s+\d+$/iu.test(title)
  );
}

function renderUsccbSection(
  section: UsccbLectionarySection,
  index: number,
) {
  const kind = getReadingKind(section.title);
  const primaryReference = section.citation
    .split(",", 1)[0]
    .trim()
    .replace(/(\d)[a-z]$/iu, "$1");
  const parsedReference = parseScriptureReference(primaryReference);
  const scriptureBookId = parsedReference.ok ? parsedReference.book.id : null;
  const opening = renderReadingOpening(kind, scriptureBookId);
  const closing = renderReadingClosing(kind);

  return [
    `<div class="reading reading-${kind}" id="reading-${escapeAttribute(
      safeId(section.id),
    )}-${index}">`,
    `<p class="posture">${escapeHtml(getReadingPosture(kind))}</p>`,
    `<h5>${escapeHtml(section.title)}</h5>`,
    `<p class="citation">${escapeHtml(section.citation)}</p>`,
    opening,
    '<div class="reading-text">',
    section.lines.map((line) => `<p>${escapeHtml(line)}</p>`).join(""),
    "</div>",
    closing,
    "</div>",
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
body { margin: 0; padding: 0; background: #e9e4d7; color: #111111; font-family: Georgia, "Times New Roman", serif; font-size: 20px; line-height: 1.58; }
#page { width: 92%; max-width: 46em; margin: 0 auto; background: #ffffff; border-left: 1px solid #777777; border-right: 1px solid #777777; }
a { color: #111111; text-decoration: underline; }
a:visited { color: #333333; }
a:focus, a:hover { color: #ffffff; background: #111111; }
.skip { display: block; padding: 0.75em 7%; background: #ffffff; border-bottom: 1px solid #777777; }
.masthead { padding: 2.2em 7%; color: #ffffff; background: #111111; border-bottom: 6px double #ffffff; }
.masthead a { color: #ffffff; }
.masthead a:focus, .masthead a:hover { color: #111111; background: #ffffff; }
.eyebrow, .posture, .subgroup, .role-label, .section-number { margin: 0 0 0.35em; font-family: Arial, Helvetica, sans-serif; font-size: 0.7em; font-weight: bold; letter-spacing: 0.08em; text-transform: uppercase; }
.masthead h1 { margin: 0.2em 0; font-size: 2.25em; line-height: 1.12; }
.date, .facts { margin: 0.7em 0; }
.action { display: inline-block; padding: 0.65em 0.85em; border: 2px solid #ffffff; font-family: Arial, Helvetica, sans-serif; font-weight: bold; }
.prepared-copy { margin: 0; padding: 0.8em 7%; background: #ffffff; border-bottom: 3px double #111111; font-style: italic; }
.navigation { padding: 1.25em 7%; background: #f4f1e8; border-bottom: 3px double #111111; }
.navigation p { margin: 0 0 0.5em; }
.navigation ol { margin: 0; padding-left: 1.5em; }
.navigation li { margin: 0.45em 0; }
.mass-section { padding: 2em 7%; border-bottom: 5px double #111111; }
.mass-section h2 { margin: 0.15em 0 1em; font-size: 1.8em; line-height: 1.18; }
.section-number { display: inline-block; padding: 0.2em 0.55em; color: #ffffff; background: #111111; }
.order-item { margin: 0; padding: 1.4em 0; border-bottom: 1px solid #888888; page-break-inside: avoid; }
.order-item h3, .reading h5 { margin: 0.2em 0 0.75em; line-height: 1.2; }
.order-item h3 { font-size: 1.35em; }
.reading-set { margin: 0; padding: 0; }
.reading { margin: 0; padding: 1.6em 0; border-bottom: 3px double #777777; page-break-inside: avoid; }
.reading h5 { font-size: 1.25em; }
.citation, .segment-reference { font-weight: bold; }
.reading-text { margin: 1em 0; font-size: 1.08em; line-height: 1.65; }
.reading-text p { margin: 0.85em 0; }
.dialogue { margin: 0.8em 0; }
.line { margin: 0.65em 0; padding: 0.75em 4%; border-left: 5px solid #777777; background: #f4f1e8; }
.line p { margin: 0.25em 0; }
.role-priest, .role-deacon, .role-minister { color: #ffffff; background: #222222; border-left-color: #999999; }
.role-people, .role-all { background: #ffffff; border: 2px solid #111111; border-left-width: 7px; font-weight: bold; }
.role-rubric { background: #eeeeee; border-left-color: #555555; font-style: italic; }
.back { margin-top: 1.8em; text-align: right; }
.finale { padding: 2em 7%; text-align: center; background: #f4f1e8; }
.finale p:first-child { font-size: 1.5em; font-style: italic; }
@media print {
  html, body { background: #ffffff; }
  #page { width: auto; max-width: none; border: 0; }
  .skip, .action, .back { display: none; }
  .masthead { color: #111111; background: #ffffff; border-color: #111111; }
  .masthead a { color: #111111; }
  .role-priest, .role-deacon, .role-minister { color: #111111; background: #ffffff; border: 2px solid #111111; border-left-width: 7px; }
}
`;
