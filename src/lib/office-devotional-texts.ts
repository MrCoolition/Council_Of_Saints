import type { OfficeHourType } from "@/lib/office-psalter";

/**
 * Copyright-safe material for personal prayer alongside the canonical hours.
 *
 * This module intentionally contains no current ICEL Liturgy of the Hours text
 * and no MAGNIFICAT editorial text. A hymn's inclusion is a devotional
 * recommendation, not a claim that it is the proper hymn for a date or office.
 */

export const DEVOTIONAL_OFFICE_HOUR_KEYS = [
  "office_readings",
  "morning_prayer",
  "midmorning_prayer",
  "midday_prayer",
  "midafternoon_prayer",
  "evening_prayer",
  "night_prayer",
] as const satisfies readonly OfficeHourType[];

export type DevotionalOfficeHourKey =
  (typeof DEVOTIONAL_OFFICE_HOUR_KEYS)[number];

export type PublicDomainTextProvenance = {
  status: "public_domain";
  officialStatus: "traditional_alternative";
  notOfficialLiturgyOfTheHours: true;
  note: string;
};

export type OriginalDevotionalProvenance = {
  status: "original_devotional";
  officialStatus: "not_official_icel";
  author: "Sanctum Council";
  notOfficialLiturgyOfTheHours: true;
  note: string;
};

export type HymnStanza = {
  number: number;
  lines: readonly string[];
};

export type PublicDomainHymn = {
  contentType: "hymn";
  title: string;
  originalTitle: string | null;
  author: string;
  translator: string | null;
  source: string;
  firstPublished: string;
  license: "Public domain in the United States";
  traditionalAssociation: string;
  textEditionNote: string;
  stanzas: readonly HymnStanza[];
  provenance: PublicDomainTextProvenance;
};

export type DevotionalPetition = {
  id: string;
  text: string;
};

export type OriginalDevotionalIntercessions = {
  contentType: "intercessions";
  title: string;
  response: string;
  petitions: readonly DevotionalPetition[];
  placementNote: string;
  provenance: OriginalDevotionalProvenance;
};

export type OriginalConcludingPrayerPrompt = {
  contentType: "concluding_prayer_prompt";
  title: string;
  prompt: string;
  endingSuggestion: string;
  provenance: OriginalDevotionalProvenance;
};

export type OfficeDevotionalTexts = {
  hourKey: DevotionalOfficeHourKey;
  hourLabel: string;
  traditionalName: string;
  suggestedTime: string;
  hymn: PublicDomainHymn;
  intercessions: OriginalDevotionalIntercessions;
  concludingPrayer: OriginalConcludingPrayerPrompt;
};

export const DEVOTIONAL_TEXT_BOUNDARY = {
  status: "devotional_alternative",
  personalUse: true,
  notOfficialIcel: true,
  notMagnificatEditorialText: true,
  notice:
    "These built-in texts are copyright-safe aids for personal prayer. They neither reproduce nor replace the current ICEL Liturgy of the Hours, and they do not reproduce MAGNIFICAT editorial material.",
  structureNote:
    "In the Roman Liturgy of the Hours, intercessions belong especially to Morning and Evening Prayer. Petitions supplied at the other hours here are optional personal devotions outside the official structure.",
} as const;

const PUBLIC_DOMAIN_HYMN_PROVENANCE = {
  status: "public_domain",
  officialStatus: "traditional_alternative",
  notOfficialLiturgyOfTheHours: true,
  note:
    "Historic public-domain English text. Its placement here is a devotional alternative, not an official or date-specific assignment.",
} as const satisfies PublicDomainTextProvenance;

const ORIGINAL_DEVOTIONAL_PROVENANCE = {
  status: "original_devotional",
  officialStatus: "not_official_icel",
  author: "Sanctum Council",
  notOfficialLiturgyOfTheHours: true,
  note:
    "Original Sanctum Council devotional writing; not official ICEL text and not presented as part of the promulgated Liturgy of the Hours.",
} as const satisfies OriginalDevotionalProvenance;

export const OFFICE_DEVOTIONAL_TEXTS: Readonly<
  Record<OfficeHourType, OfficeDevotionalTexts>
> = {
  office_readings: {
    hourKey: "office_readings",
    hourLabel: "Office of Readings",
    traditionalName: "Matins",
    suggestedTime:
      "At any suitable time; traditionally during the night or before dawn",
    hymn: {
      contentType: "hymn",
      title: "Our God, Our Help in Ages Past",
      originalTitle: null,
      author: "Isaac Watts (1674–1748)",
      translator: null,
      source:
        'Isaac Watts, The Psalms of David Imitated in the Language of the New Testament (1719), Psalm 90, Part I, “Man Frail, and God Eternal.”',
      firstPublished: "1719",
      license: "Public domain in the United States",
      traditionalAssociation:
        "A metrical Psalm 90 suitable as a devotional opening before extended sacred reading.",
      textEditionNote:
        "Complete original nine-stanza Watts text; it retains “Our God,” before John Wesley’s later “O God” alteration.",
      stanzas: [
        {
          number: 1,
          lines: [
            "Our God, our help in ages past,",
            "Our hope for years to come,",
            "Our shelter from the stormy blast,",
            "And our eternal home.",
          ],
        },
        {
          number: 2,
          lines: [
            "Under the shadow of Thy throne",
            "Still may we dwell secure;",
            "Sufficient is Thine arm alone,",
            "And our defence is sure.",
          ],
        },
        {
          number: 3,
          lines: [
            "Before the hills in order stood,",
            "Or earth received her frame,",
            "From everlasting Thou art God,",
            "To endless years the same.",
          ],
        },
        {
          number: 4,
          lines: [
            "Thy word commands our flesh to dust,",
            "“Return, ye sons of men:”",
            "All nations rose from earth at first,",
            "And turn to earth again.",
          ],
        },
        {
          number: 5,
          lines: [
            "A thousand ages in Thy sight",
            "Are like an evening gone;",
            "Short as the watch that ends the night",
            "Before the rising sun.",
          ],
        },
        {
          number: 6,
          lines: [
            "The busy tribes of flesh and blood,",
            "With all their lives and cares,",
            "Are carried downward by Thy flood,",
            "And lost in following years.",
          ],
        },
        {
          number: 7,
          lines: [
            "Time, like an ever-rolling stream,",
            "Bears all its sons away;",
            "They fly forgotten, as a dream",
            "Dies at the opening day.",
          ],
        },
        {
          number: 8,
          lines: [
            "Like flowery fields the nations stand,",
            "Pleased with the morning light;",
            "The flowers beneath the mower’s hand",
            "Lie withering ere ’tis night.",
          ],
        },
        {
          number: 9,
          lines: [
            "Our God, our help in ages past,",
            "Our hope for years to come,",
            "Be Thou our guard while troubles last,",
            "And our eternal home.",
          ],
        },
      ],
      provenance: PUBLIC_DOMAIN_HYMN_PROVENANCE,
    },
    intercessions: {
      contentType: "intercessions",
      title: "Petitions after sacred reading",
      response: "Lord, form us by Your truth.",
      petitions: [
        {
          id: "church-hears-word",
          text:
            "For the Church, that listening to the word of God may renew her courage, humility, and love.",
        },
        {
          id: "teachers-and-students",
          text:
            "For teachers, preachers, scholars, and students, that learning may become service rather than pride.",
        },
        {
          id: "burdened-minds",
          text:
            "For those whose minds are burdened by confusion, fear, or despair, that light may reach them through faithful companions.",
        },
        {
          id: "obedient-reading",
          text:
            "For us, that what we have read may pass from memory into obedience and from obedience into charity.",
        },
      ],
      placementNote:
        "Optional personal petitions after the readings; not an official element of the Office of Readings.",
      provenance: ORIGINAL_DEVOTIONAL_PROVENANCE,
    },
    concludingPrayer: {
      contentType: "concluding_prayer_prompt",
      title: "Gather the reading into prayer",
      prompt:
        "Name before God one truth that consoled or challenged you. Ask for the grace to carry that truth into one concrete act of obedience today.",
      endingSuggestion:
        "Conclude in your own words with praise of the Father, through Christ, in the Holy Spirit.",
      provenance: ORIGINAL_DEVOTIONAL_PROVENANCE,
    },
  },

  morning_prayer: {
    hourKey: "morning_prayer",
    hourLabel: "Morning Prayer",
    traditionalName: "Lauds",
    suggestedTime: "At daybreak or at the beginning of the day",
    hymn: {
      contentType: "hymn",
      title: "Now That the Daylight Fills the Sky",
      originalTitle: "Jam lucis orto sidere",
      author:
        "Traditional Latin office hymn, historically attributed to St. Ambrose",
      translator: "John Mason Neale (1818–1866)",
      source:
        "John Mason Neale and Thomas Helmore, The Hymnal Noted (1852), “Jam lucis orto sidere.”",
      firstPublished: "English translation published 1852",
      license: "Public domain in the United States",
      traditionalAssociation:
        "Traditional morning hymn, historically associated with Prime.",
      textEditionNote:
        "Complete five-stanza traditional English form; capitalization and punctuation are lightly normalized.",
      stanzas: [
        {
          number: 1,
          lines: [
            "Now that the daylight fills the sky,",
            "We lift our hearts to God on high,",
            "That He, in all we do or say,",
            "Would keep us free from harm today:",
          ],
        },
        {
          number: 2,
          lines: [
            "Would guard our hearts and tongues from strife;",
            "From anger’s din would hide our life;",
            "From all ill sights would turn our eyes;",
            "Would close our ears from vanities:",
          ],
        },
        {
          number: 3,
          lines: [
            "Would keep our inmost conscience pure;",
            "Our souls from folly would secure;",
            "Would bid us check the pride of sense",
            "With due and holy abstinence.",
          ],
        },
        {
          number: 4,
          lines: [
            "So we, when this new day is gone,",
            "And night in turn is drawing on,",
            "With conscience by the world unstained,",
            "Shall praise His Name for victory gained.",
          ],
        },
        {
          number: 5,
          lines: [
            "All laud to God the Father be;",
            "All praise, eternal Son, to Thee;",
            "All glory, as is ever meet,",
            "To God the Holy Paraclete.",
          ],
        },
      ],
      provenance: PUBLIC_DOMAIN_HYMN_PROVENANCE,
    },
    intercessions: {
      contentType: "intercessions",
      title: "Morning petitions",
      response: "Order this day in Your peace.",
      petitions: [
        {
          id: "first-thought",
          text:
            "May our first choices be shaped by gratitude, and may every later choice return to love of God and neighbor.",
        },
        {
          id: "work-and-study",
          text:
            "Strengthen all who begin work, study, caregiving, or travel; make their labor honest, patient, and fruitful.",
        },
        {
          id: "homes-and-families",
          text:
            "Guard our homes and families from contempt and haste; teach us to speak truth with gentleness.",
        },
        {
          id: "temptation",
          text:
            "When temptation comes, awaken our conscience quickly and give us freedom to choose what is good.",
        },
      ],
      placementNote:
        "Original devotional petitions suitable for personal Morning Prayer; not the official daily intercessions.",
      provenance: ORIGINAL_DEVOTIONAL_PROVENANCE,
    },
    concludingPrayer: {
      contentType: "concluding_prayer_prompt",
      title: "Offer the day",
      prompt:
        "Place the hours ahead before God: the work you know, the interruptions you cannot foresee, and the person you most need grace to love well.",
      endingSuggestion:
        "Ask that every task become an offering through Jesus Christ, then remain silent for one breath.",
      provenance: ORIGINAL_DEVOTIONAL_PROVENANCE,
    },
  },

  midmorning_prayer: {
    hourKey: "midmorning_prayer",
    hourLabel: "Midmorning Prayer",
    traditionalName: "Terce",
    suggestedTime: "Around the third hour of daylight, traditionally 9:00 a.m.",
    hymn: {
      contentType: "hymn",
      title: "Come, Holy Ghost, Who Ever One",
      originalTitle: "Nunc Sancte nobis Spiritus",
      author:
        "Traditional Ambrosian office hymn, historically attributed to St. Ambrose",
      translator: "John Henry Newman (1801–1890)",
      source:
        "John Henry Newman, Tracts for the Times, no. 75 (1836), translation of “Nunc Sancte nobis Spiritus.”",
      firstPublished: "English translation published 1836",
      license: "Public domain in the United States",
      traditionalAssociation:
        "Traditional hymn for Terce, invoking the Holy Spirit in the morning’s work.",
      textEditionNote:
        "Complete three-stanza Newman translation; capitalization and punctuation are lightly normalized.",
      stanzas: [
        {
          number: 1,
          lines: [
            "Come, Holy Ghost, Who ever One",
            "Art with the Father and the Son;",
            "Come, Holy Ghost, our souls possess",
            "With Thy full flood of holiness.",
          ],
        },
        {
          number: 2,
          lines: [
            "In will and deed, by heart and tongue,",
            "With all our powers, Thy praise be sung;",
            "And love light up our mortal frame,",
            "Till others catch the living flame.",
          ],
        },
        {
          number: 3,
          lines: [
            "Almighty Father, hear our cry",
            "Through Jesus Christ our Lord most high,",
            "Who with the Holy Ghost and Thee",
            "Doth live and reign eternally.",
          ],
        },
      ],
      provenance: PUBLIC_DOMAIN_HYMN_PROVENANCE,
    },
    intercessions: {
      contentType: "intercessions",
      title: "Midmorning petitions",
      response: "Holy Spirit, keep us faithful.",
      petitions: [
        {
          id: "renewed-attention",
          text:
            "Renew our attention where it has scattered, and keep small frustrations from ruling the heart.",
        },
        {
          id: "workers",
          text:
            "Support those whose labor is hidden, repetitive, dangerous, or poorly rewarded; let their dignity be honored.",
        },
        {
          id: "interrupted",
          text:
            "Give patience to everyone interrupted by another person’s need, and wisdom to know when love must change the plan.",
        },
        {
          id: "next-choice",
          text:
            "Guide the next choice before us, especially where convenience and conscience pull in different directions.",
        },
      ],
      placementNote:
        "Optional original petitions for a personal pause after Terce; the official daytime hour does not ordinarily include intercessions.",
      provenance: ORIGINAL_DEVOTIONAL_PROVENANCE,
    },
    concludingPrayer: {
      contentType: "concluding_prayer_prompt",
      title: "Consecrate the work at hand",
      prompt:
        "Name the task directly in front of you. Ask the Holy Spirit for the one virtue it now requires: attention, courage, patience, honesty, or mercy.",
      endingSuggestion:
        "Return to the task deliberately, carrying the chosen virtue into its first action.",
      provenance: ORIGINAL_DEVOTIONAL_PROVENANCE,
    },
  },

  midday_prayer: {
    hourKey: "midday_prayer",
    hourLabel: "Midday Prayer",
    traditionalName: "Sext",
    suggestedTime: "Around the sixth hour of daylight, traditionally noon",
    hymn: {
      contentType: "hymn",
      title: "O God of Truth, O Lord of Might",
      originalTitle: "Rector potens, verax Deus",
      author:
        "Traditional Ambrosian office hymn, historically attributed to St. Ambrose",
      translator: "John Mason Neale (1818–1866)",
      source:
        "John Mason Neale, The Hymnal Noted (1852), translation of “Rector potens, verax Deus”; text follows an early public-domain hymnal form.",
      firstPublished: "English translation published 1852",
      license: "Public domain in the United States",
      traditionalAssociation: "Traditional hymn for Sext, the midday hour.",
      textEditionNote:
        "Complete three-stanza public-domain English form; capitalization and punctuation are lightly normalized.",
      stanzas: [
        {
          number: 1,
          lines: [
            "O God of truth, O Lord of might,",
            "Who, ordering time and change aright,",
            "Sendest the early morning ray,",
            "Kindling the glow of perfect day;",
          ],
        },
        {
          number: 2,
          lines: [
            "Extinguish Thou each sinful fire,",
            "And banish every ill desire;",
            "And, keeping all the body whole,",
            "Shed forth Thy peace upon the soul.",
          ],
        },
        {
          number: 3,
          lines: [
            "Almighty Father, hear our cry",
            "Through Jesus Christ our Lord most high,",
            "Who with the Holy Ghost and Thee",
            "Doth live and reign eternally.",
          ],
        },
      ],
      provenance: PUBLIC_DOMAIN_HYMN_PROVENANCE,
    },
    intercessions: {
      contentType: "intercessions",
      title: "Midday petitions",
      response: "Christ, be our peace at the heart of the day.",
      petitions: [
        {
          id: "weary-and-hungry",
          text:
            "Remember those who are weary, hungry, overheated, displaced, or without safe rest; move us toward practical mercy.",
        },
        {
          id: "public-trust",
          text:
            "Give integrity to those entrusted with public power, money, judgment, or the safety of others.",
        },
        {
          id: "conflict",
          text:
            "Where conflict has hardened, loosen the grip of pride and make room for truth, repentance, and repair.",
        },
        {
          id: "half-day-examen",
          text:
            "Show us where the morning bore good fruit and where we need to begin again without discouragement.",
        },
      ],
      placementNote:
        "Optional original petitions for personal use after Sext; not official ICEL intercessions or an official element of the daytime hour.",
      provenance: ORIGINAL_DEVOTIONAL_PROVENANCE,
    },
    concludingPrayer: {
      contentType: "concluding_prayer_prompt",
      title: "Begin the day again",
      prompt:
        "Review the morning briefly: give thanks for one grace, admit one failure without excuse, and place the remaining work under God’s mercy.",
      endingSuggestion:
        "Ask Christ to make the rest of the day more truthful, peaceful, and attentive than the first half.",
      provenance: ORIGINAL_DEVOTIONAL_PROVENANCE,
    },
  },

  midafternoon_prayer: {
    hourKey: "midafternoon_prayer",
    hourLabel: "Midafternoon Prayer",
    traditionalName: "None (Ninth Hour)",
    suggestedTime: "Around the ninth hour of daylight, traditionally 3:00 p.m.",
    hymn: {
      contentType: "hymn",
      title: "O God, Creation’s Secret Force",
      originalTitle: "Rerum Deus tenax vigor",
      author:
        "Traditional Ambrosian office hymn, historically attributed to St. Ambrose",
      translator: "John Mason Neale (1818–1866)",
      source:
        "John Mason Neale, The Hymnal Noted (1852), translation of “Rerum Deus tenax vigor.”",
      firstPublished: "English translation published 1852",
      license: "Public domain in the United States",
      traditionalAssociation:
        "Traditional hymn for None, the midafternoon hour.",
      textEditionNote:
        "Complete three-stanza public-domain English form; capitalization and punctuation are lightly normalized.",
      stanzas: [
        {
          number: 1,
          lines: [
            "O God, creation’s secret force,",
            "Thyself unmoved, all motion’s source,",
            "Who, from the morn till evening’s ray,",
            "Through all its changes guidest the day:",
          ],
        },
        {
          number: 2,
          lines: [
            "Grant us, when this short life is past,",
            "The glorious evening that shall last;",
            "That, by a holy death attained,",
            "Eternal glory may be gained.",
          ],
        },
        {
          number: 3,
          lines: [
            "Almighty Father, hear our cry",
            "Through Jesus Christ our Lord most high,",
            "Who with the Holy Ghost and Thee",
            "Doth live and reign eternally.",
          ],
        },
      ],
      provenance: PUBLIC_DOMAIN_HYMN_PROVENANCE,
    },
    intercessions: {
      contentType: "intercessions",
      title: "Midafternoon petitions",
      response: "Stay with us, Lord, and make our labor fruitful.",
      petitions: [
        {
          id: "endurance",
          text:
            "Give endurance to those nearing the limit of their strength, and teach us to receive needed rest without shame.",
        },
        {
          id: "suffering",
          text:
            "Be near to the injured, the grieving, the imprisoned, and all who experience this hour as abandonment.",
        },
        {
          id: "hidden-service",
          text:
            "Bless work that will never be praised and acts of service that no one else will notice.",
        },
        {
          id: "finish-well",
          text:
            "Keep haste from making us careless; help us finish what should be finished and release what must wait.",
        },
      ],
      placementNote:
        "Optional original petitions for a personal pause after None; not official ICEL intercessions or an official element of the daytime hour.",
      provenance: ORIGINAL_DEVOTIONAL_PROVENANCE,
    },
    concludingPrayer: {
      contentType: "concluding_prayer_prompt",
      title: "Persevere without hardening",
      prompt:
        "Bring God the fatigue, resistance, or disappointment of this hour. Ask for steady faithfulness without resentment or self-reliance.",
      endingSuggestion:
        "Choose one remaining duty to complete with care, and one burden to leave in God’s hands.",
      provenance: ORIGINAL_DEVOTIONAL_PROVENANCE,
    },
  },

  evening_prayer: {
    hourKey: "evening_prayer",
    hourLabel: "Evening Prayer",
    traditionalName: "Vespers",
    suggestedTime: "Near sunset or at the close of the day’s work",
    hymn: {
      contentType: "hymn",
      title: "O Blest Creator of the Light",
      originalTitle: "Lucis Creator optime",
      author:
        "Traditional Latin office hymn, often attributed to St. Gregory the Great",
      translator: "John Mason Neale (1818–1866)",
      source:
        "John Mason Neale, The Hymnal Noted, Part I (1851), translation of “Lucis Creator optime.”",
      firstPublished: "English translation published 1851",
      license: "Public domain in the United States",
      traditionalAssociation:
        "Traditional Sunday Vespers hymn in the older Western office tradition.",
      textEditionNote:
        "Complete five-stanza Neale translation; capitalization and punctuation are lightly normalized.",
      stanzas: [
        {
          number: 1,
          lines: [
            "O blest Creator of the light,",
            "Who mak’st the day with radiance bright,",
            "And o’er the forming world didst call",
            "The light from chaos first of all.",
          ],
        },
        {
          number: 2,
          lines: [
            "Whose wisdom joined in meet array",
            "The morn and eve, and named them day:",
            "Night comes with all its darkling fears;",
            "Regard Thy people’s prayers and tears.",
          ],
        },
        {
          number: 3,
          lines: [
            "Lest, sunk in sin, and whelmed with strife,",
            "They lose the gift of endless life;",
            "While thinking but the thoughts of time,",
            "They weave new chains of woe and crime.",
          ],
        },
        {
          number: 4,
          lines: [
            "But grant them grace that they may strain",
            "The heavenly gate and prize to gain:",
            "Each harmful lure aside to cast,",
            "And purge away each error past.",
          ],
        },
        {
          number: 5,
          lines: [
            "O Father, that we ask be done,",
            "Through Jesus Christ, Thine only Son;",
            "Who, with the Holy Ghost and Thee,",
            "Doth live and reign eternally.",
          ],
        },
      ],
      provenance: PUBLIC_DOMAIN_HYMN_PROVENANCE,
    },
    intercessions: {
      contentType: "intercessions",
      title: "Evening petitions",
      response: "Receive our thanks and gather us into mercy.",
      petitions: [
        {
          id: "thanksgiving",
          text:
            "For every grace received today, especially the good we failed to notice when it arrived, we give thanks.",
        },
        {
          id: "pardon-and-repair",
          text:
            "For our sins and failures, give us honest repentance and the courage to repair what can still be repaired.",
        },
        {
          id: "homes",
          text:
            "Bring peace to homes marked by tension, absence, or fear; protect children and all who are vulnerable.",
        },
        {
          id: "lonely-sick-dying",
          text:
            "Remain with the lonely, the sick, the dying, and those who wait beside them through the evening.",
        },
      ],
      placementNote:
        "Original devotional petitions suitable for personal Evening Prayer; not the official daily intercessions.",
      provenance: ORIGINAL_DEVOTIONAL_PROVENANCE,
    },
    concludingPrayer: {
      contentType: "concluding_prayer_prompt",
      title: "Return the day to God",
      prompt:
        "Recall one gift, one sorrow, one sin, and one person from the day. Give thanks, ask mercy, and entrust each of them to God without trying to control the outcome.",
      endingSuggestion:
        "Ask for a peaceful evening and a heart ready to serve again tomorrow through Christ.",
      provenance: ORIGINAL_DEVOTIONAL_PROVENANCE,
    },
  },

  night_prayer: {
    hourKey: "night_prayer",
    hourLabel: "Night Prayer",
    traditionalName: "Compline",
    suggestedTime: "Immediately before sleep",
    hymn: {
      contentType: "hymn",
      title: "Before the Ending of the Day",
      originalTitle: "Te lucis ante terminum",
      author:
        "Traditional anonymous Latin office hymn, formerly attributed to St. Ambrose",
      translator: "John Mason Neale (1818–1866)",
      source:
        "John Mason Neale, The Hymnal Noted (1852), translation of “Te lucis ante terminum.”",
      firstPublished: "English translation published 1852",
      license: "Public domain in the United States",
      traditionalAssociation: "Traditional hymn for Compline.",
      textEditionNote:
        "Complete three-stanza traditional English form; capitalization, spelling, and punctuation are lightly normalized.",
      stanzas: [
        {
          number: 1,
          lines: [
            "Before the ending of the day,",
            "Creator of the world, we pray,",
            "That with Thy wonted favour Thou",
            "Wouldst be our guard and keeper now.",
          ],
        },
        {
          number: 2,
          lines: [
            "From all ill dreams defend our eyes,",
            "From nightly fears and fantasies;",
            "Tread under foot our ghostly foe,",
            "That no pollution we may know.",
          ],
        },
        {
          number: 3,
          lines: [
            "O Father, that we ask be done,",
            "Through Jesus Christ, Thine only Son;",
            "Who, with the Holy Ghost and Thee,",
            "Doth live and reign eternally.",
          ],
        },
      ],
      provenance: PUBLIC_DOMAIN_HYMN_PROVENANCE,
    },
    intercessions: {
      contentType: "intercessions",
      title: "Night petitions",
      response: "Into Your hands, Lord, we rest.",
      petitions: [
        {
          id: "examen",
          text:
            "Receive the whole truth of this day: what was faithful, what was wounded, what was sinful, and what remains unfinished.",
        },
        {
          id: "forgiveness",
          text:
            "Grant forgiveness where we have failed, and free us from rehearsing either our own offenses or the offenses of others.",
        },
        {
          id: "night-watch",
          text:
            "Protect all who work, travel, serve, watch, or wake in danger while others sleep.",
        },
        {
          id: "departed",
          text:
            "Remember the dead, especially those known to us, and comfort everyone who carries fresh grief into the night.",
        },
      ],
      placementNote:
        "Optional original petitions for personal use at Compline; not official ICEL intercessions or an official element of Night Prayer.",
      provenance: ORIGINAL_DEVOTIONAL_PROVENANCE,
    },
    concludingPrayer: {
      contentType: "concluding_prayer_prompt",
      title: "Entrust the night",
      prompt:
        "Place your body, mind, home, unfinished concerns, and the people you love into God’s care. Release each one by name.",
      endingSuggestion:
        "Ask for protection through the night, readiness for death, and grateful awakening if another day is given.",
      provenance: ORIGINAL_DEVOTIONAL_PROVENANCE,
    },
  },
};

export function isDevotionalOfficeHourKey(
  value: unknown,
): value is DevotionalOfficeHourKey {
  return (
    typeof value === "string" &&
    DEVOTIONAL_OFFICE_HOUR_KEYS.includes(value as DevotionalOfficeHourKey)
  );
}

export function getOfficeDevotionalTexts(
  hourKey: DevotionalOfficeHourKey,
): OfficeDevotionalTexts {
  return OFFICE_DEVOTIONAL_TEXTS[hourKey];
}
