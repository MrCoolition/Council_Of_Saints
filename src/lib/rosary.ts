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

export type RosaryMystery = {
  id: string;
  title: string;
  scripture: string;
  fruit: string;
  meditation: string;
  typologicalNote?: string;
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

export const FRUIT_GUIDANCE =
  "The fruit is a traditional meditation aid, not a doctrinal definition.";

export const ROSARY_PRAYERS: Record<RosaryPrayerId, RosaryPrayer> = {
  sign_of_cross: {
    id: "sign_of_cross",
    title: "The Sign of the Cross",
    text: "In the name of the Father, and of the Son, and of the Holy Spirit. Amen.",
  },
  apostles_creed: {
    id: "apostles_creed",
    title: "The Apostles’ Creed",
    text: "I believe in God, the Father almighty, Creator of heaven and earth, and in Jesus Christ, His only Son, our Lord, who was conceived by the Holy Spirit, born of the Virgin Mary, suffered under Pontius Pilate, was crucified, died, and was buried. He descended into hell; on the third day He rose again from the dead. He ascended into heaven and is seated at the right hand of God the Father almighty; from there He will come to judge the living and the dead. I believe in the Holy Spirit, the holy Catholic Church, the communion of saints, the forgiveness of sins, the resurrection of the body, and life everlasting. Amen.",
  },
  our_father: {
    id: "our_father",
    title: "The Our Father",
    text: "Our Father, who art in heaven, hallowed be Thy name. Thy kingdom come; Thy will be done on earth as it is in heaven. Give us this day our daily bread, and forgive us our trespasses, as we forgive those who trespass against us; and lead us not into temptation, but deliver us from evil. Amen.",
  },
  hail_mary: {
    id: "hail_mary",
    title: "The Hail Mary",
    text: "Hail Mary, full of grace, the Lord is with thee. Blessed art thou among women, and blessed is the fruit of thy womb, Jesus. Holy Mary, Mother of God, pray for us sinners, now and at the hour of our death. Amen.",
  },
  glory_be: {
    id: "glory_be",
    title: "The Glory Be",
    text: "Glory be to the Father, and to the Son, and to the Holy Spirit, as it was in the beginning, is now, and ever shall be, world without end. Amen.",
  },
  fatima_prayer: {
    id: "fatima_prayer",
    title: "The Fatima Prayer",
    text: "O my Jesus, forgive us our sins, save us from the fires of hell, lead all souls to heaven, especially those in most need of Thy mercy. Amen.",
  },
  hail_holy_queen: {
    id: "hail_holy_queen",
    title: "The Hail, Holy Queen",
    text: "Hail, holy Queen, Mother of mercy, our life, our sweetness, and our hope. To thee do we cry, poor banished children of Eve. To thee do we send up our sighs, mourning and weeping in this valley of tears. Turn then, most gracious advocate, thine eyes of mercy toward us; and after this our exile, show unto us the blessed fruit of thy womb, Jesus. O clement, O loving, O sweet Virgin Mary.",
  },
  rosary_conclusion: {
    id: "rosary_conclusion",
    title: "The Concluding Prayer",
    text: "V. Pray for us, O holy Mother of God.\nR. That we may be made worthy of the promises of Christ.\n\nLet us pray. O God, whose only-begotten Son, by His life, death, and resurrection, has purchased for us the rewards of eternal life: grant, we beseech Thee, that while meditating upon these mysteries of the Most Holy Rosary of the Blessed Virgin Mary, we may imitate what they contain and obtain what they promise, through the same Christ our Lord. Amen.",
  },
};

export const MYSTERY_SETS: readonly RosaryMysterySet[] = [
  {
    id: "joyful",
    title: "The Joyful Mysteries",
    shortTitle: "Joyful",
    days: "Monday · Saturday",
    mysteries: [
      {
        id: "annunciation",
        title: "The Annunciation",
        scripture: "Luke 1:26–38",
        fruit: "Humility",
        meditation:
          "Gabriel announces God’s saving plan, and Mary receives the Word with humble freedom. Ask for the grace to answer God faithfully and without delay.",
      },
      {
        id: "visitation",
        title: "The Visitation",
        scripture: "Luke 1:39–56",
        fruit: "Love of neighbor",
        meditation:
          "Mary carries Christ to Elizabeth and lets received grace become generous service. Ask for charity that notices another’s need and moves toward it.",
      },
      {
        id: "nativity",
        title: "The Nativity",
        scripture: "Luke 2:1–20",
        fruit: "Poverty",
        meditation:
          "The eternal Son enters the world in poverty and is laid in a manger. Adore the humility of God and loosen your hold on whatever keeps you from Him.",
      },
      {
        id: "presentation",
        title: "The Presentation in the Temple",
        scripture: "Luke 2:21–38",
        fruit: "Purity of heart and body",
        meditation:
          "Mary and Joseph offer Jesus according to the Law, while Simeon recognizes the promised light. Place your whole life before God with an undivided heart.",
      },
      {
        id: "finding-in-temple",
        title: "The Finding in the Temple",
        scripture: "Luke 2:41–52",
        fruit: "Devotion to Jesus",
        meditation:
          "Mary and Joseph seek Jesus sorrowfully and find Him in His Father’s house. Ask for perseverance whenever Christ seems hidden and joy in finding Him again.",
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
        title: "The Baptism in the Jordan",
        scripture: "Matthew 3:13–17",
        fruit: "Openness to the Holy Spirit",
        meditation:
          "Christ enters the Jordan, the Father names His beloved Son, and the Spirit descends. Renew your baptismal belonging and welcome the Spirit’s work today.",
      },
      {
        id: "cana",
        title: "The Wedding Feast at Cana",
        scripture: "John 2:1–11",
        fruit: "To Jesus through Mary",
        meditation:
          "Mary notices the need and directs the servants to Jesus; their obedience makes room for His first sign. Entrust the lack to her intercession, then do what Christ asks.",
      },
      {
        id: "kingdom",
        title: "The Proclamation of the Kingdom",
        scripture: "Mark 1:14–15; Matthew 5–7",
        fruit: "Conversion",
        meditation:
          "Jesus announces God’s reign and calls every hearer to repent and believe. Let the Gospel change one concrete choice rather than remain only an admired idea.",
      },
      {
        id: "transfiguration",
        title: "The Transfiguration",
        scripture: "Matthew 17:1–8",
        fruit: "Desire for holiness",
        meditation:
          "Christ reveals His glory and strengthens the disciples before the Passion. Listen to the beloved Son and let His light prepare you for faithful endurance.",
      },
      {
        id: "eucharist",
        title: "The Institution of the Eucharist",
        scripture: "Matthew 26:26–29",
        fruit: "Adoration",
        meditation:
          "At the Last Supper, Christ gives His Body and Blood and entrusts this sacrament to the Church. Receive His self-gift with gratitude, reverence, and adoration.",
      },
    ],
  },
  {
    id: "sorrowful",
    title: "The Sorrowful Mysteries",
    shortTitle: "Sorrowful",
    days: "Tuesday · Friday",
    mysteries: [
      {
        id: "agony",
        title: "The Agony in the Garden",
        scripture: "Matthew 26:36–46",
        fruit: "Obedience to God’s will",
        meditation:
          "Jesus enters deep sorrow and freely conforms His human will to the Father. Stay awake with Him and surrender the burden you most want to control.",
      },
      {
        id: "scourging",
        title: "The Scourging at the Pillar",
        scripture: "Matthew 27:26; John 19:1",
        fruit: "Mortification",
        meditation:
          "The innocent body of Christ is torn by violence He does not return. Mourn sin honestly and ask for self-mastery ordered by love rather than contempt for the body.",
      },
      {
        id: "crowning-thorns",
        title: "The Crowning with Thorns",
        scripture: "Matthew 27:27–31",
        fruit: "Courage",
        meditation:
          "Soldiers mock the true King, yet His kingship is revealed through humility and self-giving love. Ask for courage that does not bend before ridicule or human respect.",
      },
      {
        id: "carrying-cross",
        title: "The Carrying of the Cross",
        scripture: "Mark 15:21–22; Luke 23:26–32",
        fruit: "Patience",
        meditation:
          "Jesus bears the Cross, and Simon is drawn into carrying it with Him. Accept today’s cross patiently and become willing to help carry another person’s burden.",
      },
      {
        id: "crucifixion",
        title: "The Crucifixion and Death of Jesus",
        scripture: "Luke 23:33–46; John 19:25–30",
        fruit: "Sorrow for our sins",
        meditation:
          "From the Cross, Jesus offers Himself, forgives, gives His mother, and entrusts His spirit to the Father. Let contrition open into gratitude for a love stronger than death.",
      },
    ],
  },
  {
    id: "glorious",
    title: "The Glorious Mysteries",
    shortTitle: "Glorious",
    days: "Wednesday · Sunday",
    mysteries: [
      {
        id: "resurrection",
        title: "The Resurrection",
        scripture: "Luke 24:1–12",
        fruit: "Faith",
        meditation:
          "The tomb is empty because Jesus is bodily risen and death has been conquered. Entrust yourself anew to the living Christ, even before every question is resolved.",
      },
      {
        id: "ascension",
        title: "The Ascension",
        scripture: "Mark 16:19; Acts 1:6–11",
        fruit: "Hope",
        meditation:
          "The risen Lord returns to the Father and sends His witnesses to the ends of the earth. Fix your hope on heaven while carrying out the mission placed before you.",
      },
      {
        id: "pentecost",
        title: "The Descent of the Holy Spirit",
        scripture: "Acts 2:1–13",
        fruit: "Wisdom",
        meditation:
          "The Holy Spirit descends upon Mary and the apostles and sends the Church out in bold witness. Ask for wisdom to recognize God’s will and courage to act on it.",
      },
      {
        id: "assumption",
        title: "The Assumption of Mary",
        scripture: "Luke 1:48–49; 1 Corinthians 15:20–23",
        fruit: "Devotion to Mary",
        meditation:
          "At the end of her earthly life, Mary is taken body and soul into heavenly glory. Rejoice in what Christ’s victory promises and ask her to keep your life turned toward her Son.",
        typologicalNote:
          "Scripture does not directly narrate the Assumption. These passages are meditative anchors: Mary’s blessedness and the resurrection promised in Christ illuminate the dogma received through Sacred Tradition.",
      },
      {
        id: "coronation",
        title: "The Coronation of Mary",
        scripture:
          "Revelation 12:1; Psalm 44:11–18 (modern 45:10–17)",
        fruit: "Grace of a happy death",
        meditation:
          "The Church contemplates Mary as Queen, sharing in her Son’s victory and interceding for His people. Ask for final perseverance and a death held within the mercy of Christ.",
        typologicalNote:
          "These are typological anchors, not a direct narrative of the Coronation. The woman clothed with the sun signifies the people of God and is also read in a Marian sense within Catholic tradition.",
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
      "Begin quietly and place yourself in the presence of the Triune God.",
    ),
    prayerStep(
      "opening-creed",
      "opening",
      "apostles_creed",
      "Holding the crucifix, profess the faith into which you were baptized.",
    ),
    prayerStep(
      "opening-our-father",
      "opening",
      "our_father",
      "On the first bead, pray the prayer Jesus taught His disciples.",
    ),
    {
      ...prayerStep(
        "opening-hail-marys",
        "opening",
        "hail_mary",
        "Pray three Hail Marys for an increase in the theological virtues.",
        3,
      ),
      repetitionLabels: ["for faith", "for hope", "for charity"],
    },
    prayerStep(
      "opening-glory",
      "opening",
      "glory_be",
      "Give glory to the Father, Son, and Holy Spirit.",
    ),
  ];

  mysterySet.mysteries.forEach((mystery, mysteryIndex) => {
    const decadeNumber = mysteryIndex + 1;

    steps.push({
      id: `mystery-${mystery.id}`,
      phase: "decade",
      kind: "mystery",
      title: mystery.title,
      instruction: `Announce the ${ordinal(decadeNumber)} ${mysterySet.shortTitle.toLowerCase()} mystery, read its anchor, and rest briefly in the scene.`,
      repeatTotal: 1,
      mysteryIndex,
    });
    steps.push(
      prayerStep(
        `decade-${decadeNumber}-our-father`,
        "decade",
        "our_father",
        "Pray the Our Father on the large bead.",
        1,
        mysteryIndex,
      ),
    );
    steps.push(
      prayerStep(
        `decade-${decadeNumber}-hail-marys`,
        "decade",
        "hail_mary",
        "Pray ten Hail Marys while contemplating this mystery of Christ.",
        10,
        mysteryIndex,
      ),
    );
    steps.push(
      prayerStep(
        `decade-${decadeNumber}-glory`,
        "decade",
        "glory_be",
        "Conclude the decade by giving glory to the Holy Trinity.",
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
          "Add the optional Fatima prayer after the decade.",
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
      "After the five decades, ask the Mother of Mercy for her intercession.",
    ),
  );
  steps.push(
    prayerStep(
      "closing-rosary-prayer",
      "closing",
      "rosary_conclusion",
      "Pray the traditional versicle and concluding prayer.",
    ),
  );
  steps.push(
    prayerStep(
      "closing-sign",
      "closing",
      "sign_of_cross",
      "Conclude the Rosary in the name of the Father, Son, and Holy Spirit.",
    ),
  );

  return steps;
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
