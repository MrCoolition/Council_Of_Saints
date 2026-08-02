export type MysterySetId =
  | "joyful"
  | "luminous"
  | "sorrowful"
  | "glorious";

export type RosaryPrayerId =
  | "sign_of_cross"
  | "apostles_creed"
  | "our_father"
  | "hail_mary"
  | "glory_be"
  | "fatima_prayer"
  | "hail_holy_queen"
  | "rosary_conclusion";

export type RosaryScripturePassage = {
  bookId: string;
  chapter: number;
  verseStart: number;
  verseEnd: number;
};

export type RosaryMystery = {
  id: string;
  title: string;
  scripture: string;
  scripturePassage: RosaryScripturePassage;
  fruit: string;
  meditation: string;
};

export type RosaryMysterySet = {
  id: MysterySetId;
  title: string;
  shortTitle: string;
  days: string;
  mysteries: readonly RosaryMystery[];
};

export type RosaryPrayer = {
  id: RosaryPrayerId;
  title: string;
  text: string;
};

export type RosaryStep = {
  id: string;
  phase: "opening" | "decade" | "closing";
  kind: "prayer" | "mystery";
  title: string;
  instruction: string;
  repeatTotal: number;
  prayerId?: RosaryPrayerId;
  mysteryIndex?: number;
  repetitionLabels?: readonly string[];
};

export const ROSARY_PRAYERS: Record<RosaryPrayerId, RosaryPrayer> = {
  sign_of_cross: {
    id: "sign_of_cross",
    title: "The Sign of the Cross",
    text: "In the name of the Father, and of the Son, and of the Holy Spirit. Amen.",
  },
  apostles_creed: {
    id: "apostles_creed",
    title: "The Apostles’ Creed",
    text: "I believe in God, the Father almighty, Creator of heaven and earth, and in Jesus Christ, his only Son, our Lord, who was conceived by the Holy Spirit, born of the Virgin Mary, suffered under Pontius Pilate, was crucified, died, and was buried; he descended into hell; on the third day he rose again from the dead; he ascended into heaven, and is seated at the right hand of God the Father almighty; from there he will come to judge the living and the dead. I believe in the Holy Spirit, the holy catholic Church, the communion of saints, the forgiveness of sins, the resurrection of the body, and life everlasting. Amen.",
  },
  our_father: {
    id: "our_father",
    title: "The Our Father",
    text: "Our Father, who art in heaven, hallowed be thy name; thy kingdom come; thy will be done on earth as it is in heaven. Give us this day our daily bread; and forgive us our trespasses, as we forgive those who trespass against us; and lead us not into temptation, but deliver us from evil. Amen.",
  },
  hail_mary: {
    id: "hail_mary",
    title: "The Hail Mary",
    text: "Hail Mary, full of grace, the Lord is with thee; blessed art thou among women, and blessed is the fruit of thy womb, Jesus. Holy Mary, Mother of God, pray for us sinners, now and at the hour of our death. Amen.",
  },
  glory_be: {
    id: "glory_be",
    title: "The Glory Be",
    text: "Glory be to the Father, and to the Son, and to the Holy Spirit; as it was in the beginning, is now, and ever shall be, world without end. Amen.",
  },
  fatima_prayer: {
    id: "fatima_prayer",
    title: "The Fatima Prayer",
    text: "O my Jesus, forgive us our sins, save us from the fires of hell; lead all souls to Heaven, especially those who have most need of thy mercy. Amen.",
  },
  hail_holy_queen: {
    id: "hail_holy_queen",
    title: "The Hail, Holy Queen",
    text: "Hail, holy Queen, Mother of mercy; hail, our life, our sweetness, and our hope. To thee do we cry, poor banished children of Eve; to thee do we send up our sighs, mourning and weeping in this valley of tears. Turn then, most gracious advocate, thine eyes of mercy toward us; and after this our exile, show unto us the blessed fruit of thy womb, Jesus. O clement, O loving, O sweet Virgin Mary. Amen.",
  },
  rosary_conclusion: {
    id: "rosary_conclusion",
    title: "The Concluding Prayer",
    text: "V. Pray for us, O holy Mother of God.\nR. That we may be made worthy of the promises of Christ.\n\nLet us pray.\nO God, whose Only Begotten Son, by his life, death, and resurrection, has purchased for us the rewards of eternal life, grant, we beseech thee, that while meditating upon these mysteries of the most holy Rosary of the Blessed Virgin Mary, we may imitate what they contain and obtain what they promise, through the same Christ our Lord. Amen.",
  },
};

export const MYSTERY_SETS: readonly RosaryMysterySet[] = [
  {
    id: "joyful",
    title: "The Joyful Mysteries",
    shortTitle: "Joyful",
    days: "Monday · Saturday · Sundays of Advent",
    mysteries: [
      {
        id: "annunciation",
        title: "The Annunciation",
        scripture: "Luke 1:26–27",
        scripturePassage: passage("luke", 1, 26, 27),
        fruit: "Humility",
        meditation:
          "Gabriel announces God’s saving plan, and Mary receives the Word with humble freedom. Ask for the grace to answer God faithfully and without delay.",
      },
      {
        id: "visitation",
        title: "The Visitation",
        scripture: "Luke 1:39–42",
        scripturePassage: passage("luke", 1, 39, 42),
        fruit: "Love of Neighbor",
        meditation:
          "Mary carries Christ to Elizabeth and lets received grace become generous service. Ask for charity that notices another’s need and moves toward it.",
      },
      {
        id: "nativity",
        title: "The Nativity of Our Lord",
        scripture: "Luke 2:1–7",
        scripturePassage: passage("luke", 2, 6, 7),
        fruit: "Poverty",
        meditation:
          "The eternal Son enters the world in poverty and is laid in a manger. Adore the humility of God and loosen your hold on whatever keeps you from him.",
      },
      {
        id: "presentation",
        title: "The Presentation in the Temple",
        scripture: "Luke 2:21–24",
        scripturePassage: passage("luke", 2, 21, 24),
        fruit: "Purity of Heart and Body",
        meditation:
          "Mary and Joseph offer Jesus according to the Law. Place your whole life before God with an undivided heart.",
      },
      {
        id: "finding-in-temple",
        title: "The Finding of Jesus in the Temple",
        scripture: "Luke 2:41–47",
        scripturePassage: passage("luke", 2, 46, 47),
        fruit: "Devotion to Jesus",
        meditation:
          "Mary and Joseph seek Jesus sorrowfully and find him in his Father’s house. Ask for perseverance whenever Christ seems hidden and joy in finding him again.",
      },
    ],
  },
  {
    id: "luminous",
    title: "The Luminous Mysteries",
    shortTitle: "Luminous",
    days: "Thursday",
    mysteries: [
      {
        id: "baptism",
        title: "The Baptism of Jesus in the Jordan",
        scripture: "Matthew 3:16–17",
        scripturePassage: passage("matthew", 3, 16, 17),
        fruit: "Openness to the Holy Spirit",
        meditation:
          "Christ enters the Jordan, the Father names his beloved Son, and the Spirit descends. Renew your baptismal belonging and welcome the Spirit’s work today.",
      },
      {
        id: "cana",
        title: "The Wedding Feast at Cana",
        scripture: "John 2:1–5",
        scripturePassage: passage("john", 2, 3, 5),
        fruit: "To Jesus through Mary",
        meditation:
          "Mary notices the need and directs the servants to Jesus. Entrust the lack to her intercession, then do whatever Christ asks.",
      },
      {
        id: "kingdom",
        title: "The Proclamation of the Kingdom",
        scripture: "Mark 1:15",
        scripturePassage: passage("mark", 1, 15, 15),
        fruit: "Conversion",
        meditation:
          "Jesus announces God’s reign and calls every hearer to repent and believe. Let the Gospel change one concrete choice today.",
      },
      {
        id: "transfiguration",
        title: "The Transfiguration",
        scripture: "Matthew 17:1–2",
        scripturePassage: passage("matthew", 17, 1, 2),
        fruit: "Desire for Holiness",
        meditation:
          "Christ reveals his glory and strengthens the disciples before the Passion. Listen to the beloved Son and let his light prepare you for faithful endurance.",
      },
      {
        id: "eucharist",
        title: "The Institution of the Eucharist",
        scripture: "Matthew 26:26",
        scripturePassage: passage("matthew", 26, 26, 26),
        fruit: "Adoration",
        meditation:
          "At the Last Supper, Christ gives his Body and Blood to the Church. Receive his self-gift with gratitude, reverence, and adoration.",
      },
    ],
  },
  {
    id: "sorrowful",
    title: "The Sorrowful Mysteries",
    shortTitle: "Sorrowful",
    days: "Tuesday · Friday · Sundays of Lent",
    mysteries: [
      {
        id: "agony",
        title: "The Agony in the Garden",
        scripture: "Matthew 26:36–39",
        scripturePassage: passage("matthew", 26, 36, 39),
        fruit: "Obedience to God’s Will",
        meditation:
          "Jesus enters deep sorrow and freely conforms his human will to the Father. Stay awake with him and surrender the burden you most want to control.",
      },
      {
        id: "scourging",
        title: "The Scourging at the Pillar",
        scripture: "Matthew 27:26",
        scripturePassage: passage("matthew", 27, 26, 26),
        fruit: "Mortification",
        meditation:
          "The innocent body of Christ is torn by violence he does not return. Mourn sin honestly and ask for self-mastery ordered by love.",
      },
      {
        id: "crowning-thorns",
        title: "The Crowning with Thorns",
        scripture: "Matthew 27:27–29",
        scripturePassage: passage("matthew", 27, 27, 29),
        fruit: "Courage",
        meditation:
          "Soldiers mock the true King, yet his kingship is revealed through humility and self-giving love. Ask for courage that does not bend before ridicule.",
      },
      {
        id: "carrying-cross",
        title: "The Carrying of the Cross",
        scripture: "Mark 15:21–22",
        scripturePassage: passage("mark", 15, 21, 22),
        fruit: "Patience",
        meditation:
          "Jesus bears the Cross, and Simon is drawn into carrying it with him. Accept today’s cross patiently and help carry another person’s burden.",
      },
      {
        id: "crucifixion",
        title: "The Crucifixion and Death",
        scripture: "Luke 23:33–46",
        scripturePassage: passage("luke", 23, 44, 46),
        fruit: "Sorrow for our Sins",
        meditation:
          "From the Cross, Jesus offers himself, forgives, and entrusts his spirit to the Father. Let contrition open into gratitude for a love stronger than death.",
      },
    ],
  },
  {
    id: "glorious",
    title: "The Glorious Mysteries",
    shortTitle: "Glorious",
    days: "Wednesday · Sundays outside Advent and Lent",
    mysteries: [
      {
        id: "resurrection",
        title: "The Resurrection",
        scripture: "Luke 24:1–5",
        scripturePassage: passage("luke", 24, 3, 5),
        fruit: "Faith",
        meditation:
          "The tomb is empty because Jesus is risen and death has been conquered. Entrust yourself anew to the living Christ.",
      },
      {
        id: "ascension",
        title: "The Ascension",
        scripture: "Mark 16:19",
        scripturePassage: passage("mark", 16, 19, 19),
        fruit: "Hope",
        meditation:
          "The risen Lord returns to the Father and sends his witnesses to the ends of the earth. Fix your hope on heaven while carrying out the mission before you.",
      },
      {
        id: "pentecost",
        title: "The Descent of the Holy Spirit",
        scripture: "Acts 2:1–4",
        scripturePassage: passage("acts", 2, 1, 4),
        fruit: "Wisdom",
        meditation:
          "The Holy Spirit descends upon Mary and the apostles and sends the Church out in bold witness. Ask for wisdom to recognize God’s will and courage to act on it.",
      },
      {
        id: "assumption",
        title: "The Assumption of Mary",
        scripture: "Luke 1:48–49",
        scripturePassage: passage("luke", 1, 48, 49),
        fruit: "Devotion to Mary",
        meditation:
          "Mary is taken body and soul into heavenly glory. Rejoice in Christ’s victory and ask her to keep your life turned toward her Son.",
      },
      {
        id: "coronation",
        title: "The Coronation of Mary",
        scripture: "Revelation 12:1",
        scripturePassage: passage("revelation", 12, 1, 1),
        fruit: "Grace of a Happy Death",
        meditation:
          "The Church contemplates Mary as Queen, sharing in her Son’s victory and interceding for his people. Ask for final perseverance in the mercy of Christ.",
      },
    ],
  },
];

const mysterySetById = Object.fromEntries(
  MYSTERY_SETS.map((set) => [set.id, set]),
) as Record<MysterySetId, RosaryMysterySet>;

const weekdayRecommendations: readonly MysterySetId[] = [
  "glorious",
  "joyful",
  "sorrowful",
  "glorious",
  "luminous",
  "sorrowful",
  "joyful",
];

export function getMysterySet(id: MysterySetId) {
  return mysterySetById[id];
}

export function isMysterySetId(value: unknown): value is MysterySetId {
  return (
    typeof value === "string" &&
    MYSTERY_SETS.some((mysterySet) => mysterySet.id === value)
  );
}

export function getRecommendedMysterySet(
  date: Date,
  liturgicalSeason?: string,
) {
  if (date.getDay() === 0) {
    const normalizedSeason = liturgicalSeason?.trim().toLowerCase();

    if (normalizedSeason?.includes("advent")) {
      return getMysterySet("joyful");
    }

    if (normalizedSeason?.includes("lent")) {
      return getMysterySet("sorrowful");
    }
  }

  return getMysterySet(weekdayRecommendations[date.getDay()]);
}

export function getWeekdayName(date: Date) {
  return new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(date);
}

export function buildRosarySteps(
  setId: MysterySetId,
  includeFatimaPrayer: boolean,
): RosaryStep[] {
  const mysterySet = getMysterySet(setId);
  const steps: RosaryStep[] = [
    prayerStep(
      "opening-sign",
      "opening",
      "sign_of_cross",
      "Make the Sign of the Cross.",
    ),
    prayerStep(
      "opening-creed",
      "opening",
      "apostles_creed",
      "Holding the crucifix, profess the Apostles’ Creed.",
    ),
    prayerStep(
      "opening-our-father",
      "opening",
      "our_father",
      "On the first bead.",
    ),
    {
      ...prayerStep(
        "opening-hail-marys",
        "opening",
        "hail_mary",
        "On the next three beads, pray for faith, hope, and charity.",
        3,
      ),
      repetitionLabels: ["for faith", "for hope", "for charity"],
    },
    prayerStep(
      "opening-glory",
      "opening",
      "glory_be",
      "Give glory to the Holy Trinity.",
    ),
  ];

  mysterySet.mysteries.forEach((mystery, mysteryIndex) => {
    const decadeNumber = mysteryIndex + 1;

    steps.push({
      id: `mystery-${mystery.id}`,
      phase: "decade",
      kind: "mystery",
      title: mystery.title,
      instruction: `The ${ordinal(decadeNumber)} ${mysterySet.shortTitle.toLowerCase()} mystery.`,
      repeatTotal: 1,
      mysteryIndex,
    });
    steps.push(
      prayerStep(
        `decade-${decadeNumber}-our-father`,
        "decade",
        "our_father",
        "On the large bead.",
        1,
        mysteryIndex,
      ),
    );
    steps.push(
      prayerStep(
        `decade-${decadeNumber}-hail-marys`,
        "decade",
        "hail_mary",
        "On each of the ten beads, contemplate the mystery.",
        10,
        mysteryIndex,
      ),
    );
    steps.push(
      prayerStep(
        `decade-${decadeNumber}-glory`,
        "decade",
        "glory_be",
        "At the end of the decade.",
        1,
        mysteryIndex,
      ),
    );

    if (includeFatimaPrayer) {
      steps.push(
        prayerStep(
          `decade-${decadeNumber}-fatima`,
          "decade",
          "fatima_prayer",
          "After the decade.",
          1,
          mysteryIndex,
        ),
      );
    }
  });

  steps.push(
    prayerStep(
      "closing-hail-holy-queen",
      "closing",
      "hail_holy_queen",
      "After the five decades.",
    ),
  );
  steps.push(
    prayerStep(
      "closing-rosary-prayer",
      "closing",
      "rosary_conclusion",
      "Pray the versicle and concluding prayer.",
    ),
  );
  steps.push(
    prayerStep(
      "closing-sign",
      "closing",
      "sign_of_cross",
      "Conclude with the Sign of the Cross.",
    ),
  );

  return steps;
}

function passage(
  bookId: string,
  chapter: number,
  verseStart: number,
  verseEnd: number,
): RosaryScripturePassage {
  return { bookId, chapter, verseStart, verseEnd };
}

function prayerStep(
  id: string,
  phase: RosaryStep["phase"],
  prayerId: RosaryPrayerId,
  instruction: string,
  repeatTotal = 1,
  mysteryIndex?: number,
): RosaryStep {
  return {
    id,
    phase,
    kind: "prayer",
    title: ROSARY_PRAYERS[prayerId].title,
    instruction,
    repeatTotal,
    prayerId,
    mysteryIndex,
  };
}

function ordinal(value: number) {
  switch (value) {
    case 1:
      return "first";
    case 2:
      return "second";
    case 3:
      return "third";
    case 4:
      return "fourth";
    case 5:
      return "fifth";
    default:
      return String(value);
  }
}
