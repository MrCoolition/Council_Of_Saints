export type MassPosture = "Stand" | "Sit" | "Kneel" | "Sit or kneel";

export type MassDialogueRole =
  | "priest"
  | "deacon"
  | "reader"
  | "cantor"
  | "minister"
  | "people"
  | "all"
  | "rubric";

export type MassDialogueLine = {
  role: MassDialogueRole;
  text: string;
  label?: string;
};

export type MassDialogueVariant = {
  id: string;
  label: string;
  lines: readonly MassDialogueLine[];
};

export type MassOrderItem = {
  id: string;
  title: string;
  posture: MassPosture;
  cue?: string;
  response?: string;
  responseLabel?: string;
  lines?: readonly MassDialogueLine[];
  variants?: readonly MassDialogueVariant[];
  defaultVariantId?: string;
  defaultOpen?: boolean;
  subgroup?: string;
};

export type MassOrderSection = {
  id: "entrance" | "word" | "eucharist" | "dismissal";
  title: string;
  shortTitle: string;
  items: readonly MassOrderItem[];
};

export const GLORIA_TEXT =
  "Glory to God in the highest, and on earth peace to people of good will. We praise you, we bless you, we adore you, we glorify you, we give you thanks for your great glory, Lord God, heavenly King, O God, almighty Father. Lord Jesus Christ, Only Begotten Son, Lord God, Lamb of God, Son of the Father, you take away the sins of the world, have mercy on us; you take away the sins of the world, receive our prayer; you are seated at the right hand of the Father, have mercy on us. For you alone are the Holy One, you alone are the Lord, you alone are the Most High, Jesus Christ, with the Holy Spirit, in the glory of God the Father. Amen.";

export const NICENE_CREED_TEXT =
  "I believe in one God, the Father almighty, maker of heaven and earth, of all things visible and invisible. I believe in one Lord Jesus Christ, the Only Begotten Son of God, born of the Father before all ages. God from God, Light from Light, true God from true God, begotten, not made, consubstantial with the Father; through him all things were made. For us men and for our salvation he came down from heaven, and by the Holy Spirit was incarnate of the Virgin Mary, and became man. For our sake he was crucified under Pontius Pilate, he suffered death and was buried, and rose again on the third day in accordance with the Scriptures. He ascended into heaven and is seated at the right hand of the Father. He will come again in glory to judge the living and the dead and his kingdom will have no end. I believe in the Holy Spirit, the Lord, the giver of life, who proceeds from the Father and the Son, who with the Father and the Son is adored and glorified, who has spoken through the prophets. I believe in one, holy, catholic and apostolic Church. I confess one Baptism for the forgiveness of sins and I look forward to the resurrection of the dead and the life of the world to come. Amen.";

export const APOSTLES_CREED_TEXT =
  "I believe in God, the Father almighty, Creator of heaven and earth, and in Jesus Christ, his only Son, our Lord, who was conceived by the Holy Spirit, born of the Virgin Mary, suffered under Pontius Pilate, was crucified, died and was buried; he descended into hell; on the third day he rose again from the dead; he ascended into heaven, and is seated at the right hand of God the Father almighty; from there he will come to judge the living and the dead. I believe in the Holy Spirit, the holy catholic Church, the communion of saints, the forgiveness of sins, the resurrection of the body, and life everlasting. Amen.";

export const SANCTUS_TEXT =
  "Holy, Holy, Holy Lord God of hosts. Heaven and earth are full of your glory. Hosanna in the highest. Blessed is he who comes in the name of the Lord. Hosanna in the highest.";

const CONFITEOR_TEXT =
  "I confess to almighty God and to you, my brothers and sisters, that I have greatly sinned, in my thoughts and in my words, in what I have done and in what I have failed to do; through my fault, through my fault, through my most grievous fault; therefore I ask blessed Mary ever-Virgin, all the Angels and Saints, and you, my brothers and sisters, to pray for me to the Lord our God.";

const OUR_FATHER_TEXT =
  "Our Father, who art in heaven, hallowed be thy name; thy kingdom come; thy will be done on earth as it is in heaven. Give us this day our daily bread; and forgive us our trespasses, as we forgive those who trespass against us; and lead us not into temptation, but deliver us from evil.";

const MASS_ORDER_SECTIONS_VALUE: readonly MassOrderSection[] = [
  {
    id: "entrance",
    title: "Introductory Rites",
    shortTitle: "Entrance",
    items: [
      {
        id: "entrance-procession",
        title: "Entrance and Reverence of the Altar",
        posture: "Stand",
        defaultOpen: true,
        lines: [
          {
            role: "rubric",
            text: "The Entrance Chant begins. The ministers process to the sanctuary and reverence the altar.",
          },
          {
            role: "all",
            text: "Join the Entrance Chant.",
          },
        ],
      },
      {
        id: "sign-of-the-cross",
        title: "Sign of the Cross",
        posture: "Stand",
        lines: [
          {
            role: "rubric",
            text: "Make the Sign of the Cross with the priest.",
          },
          {
            role: "priest",
            text: "In the name of the Father, and of the Son, and of the Holy Spirit.",
          },
          { role: "people", text: "Amen." },
        ],
      },
      {
        id: "greeting",
        title: "Liturgical Greeting",
        posture: "Stand",
        defaultVariantId: "form-c",
        variants: [
          {
            id: "form-a",
            label: "Greeting I",
            lines: [
              {
                role: "priest",
                text: "The grace of our Lord Jesus Christ, and the love of God, and the communion of the Holy Spirit be with you all.",
              },
              { role: "people", text: "And with your spirit." },
            ],
          },
          {
            id: "form-b",
            label: "Greeting II",
            lines: [
              {
                role: "priest",
                text: "Grace to you and peace from God our Father and the Lord Jesus Christ.",
              },
              { role: "people", text: "And with your spirit." },
            ],
          },
          {
            id: "form-c",
            label: "Greeting III",
            lines: [
              { role: "priest", text: "The Lord be with you." },
              { role: "people", text: "And with your spirit." },
            ],
          },
        ],
      },
      {
        id: "penitential-act",
        title: "Penitential Act",
        posture: "Stand",
        lines: [
          {
            role: "priest",
            text: "Brethren, let us acknowledge our sins, and so prepare ourselves to celebrate the sacred mysteries.",
          },
          { role: "rubric", text: "A brief silence follows." },
        ],
        defaultVariantId: "form-a",
        variants: [
          {
            id: "form-a",
            label: "Form A",
            lines: [
              {
                role: "all",
                text: CONFITEOR_TEXT,
                label: "The Confiteor",
              },
              {
                role: "rubric",
                text: "Strike your breast at: through my fault, through my fault, through my most grievous fault.",
              },
              {
                role: "priest",
                text: "May almighty God have mercy on us, forgive us our sins, and bring us to everlasting life.",
              },
              { role: "people", text: "Amen." },
            ],
          },
          {
            id: "form-b",
            label: "Form B",
            lines: [
              { role: "priest", text: "Have mercy on us, O Lord." },
              { role: "people", text: "For we have sinned against you." },
              { role: "priest", text: "Show us, O Lord, your mercy." },
              { role: "people", text: "And grant us your salvation." },
              {
                role: "priest",
                text: "May almighty God have mercy on us, forgive us our sins, and bring us to everlasting life.",
              },
              { role: "people", text: "Amen." },
            ],
          },
          {
            id: "form-c",
            label: "Form C",
            lines: [
              {
                role: "priest",
                text: "The priest or deacon proclaims three invocations naming the mercy of Christ.",
              },
              { role: "people", text: "Lord, have mercy." },
              { role: "people", text: "Christ, have mercy." },
              { role: "people", text: "Lord, have mercy." },
              {
                role: "priest",
                text: "May almighty God have mercy on us, forgive us our sins, and bring us to everlasting life.",
              },
              { role: "people", text: "Amen." },
            ],
          },
        ],
      },
      {
        id: "kyrie",
        title: "Kyrie",
        posture: "Stand",
        lines: [
          {
            role: "rubric",
            text: "Pray the Kyrie when it has not already formed part of the Penitential Act.",
          },
        ],
        defaultVariantId: "english",
        variants: [
          {
            id: "english",
            label: "English",
            lines: [
              { role: "priest", text: "Lord, have mercy." },
              { role: "people", text: "Lord, have mercy." },
              { role: "priest", text: "Christ, have mercy." },
              { role: "people", text: "Christ, have mercy." },
              { role: "priest", text: "Lord, have mercy." },
              { role: "people", text: "Lord, have mercy." },
            ],
          },
          {
            id: "greek",
            label: "Greek",
            lines: [
              { role: "priest", text: "Kyrie, eleison." },
              { role: "people", text: "Kyrie, eleison." },
              { role: "priest", text: "Christe, eleison." },
              { role: "people", text: "Christe, eleison." },
              { role: "priest", text: "Kyrie, eleison." },
              { role: "people", text: "Kyrie, eleison." },
            ],
          },
        ],
      },
      {
        id: "collect",
        title: "Collect",
        posture: "Stand",
        lines: [
          { role: "priest", text: "Let us pray." },
          {
            role: "rubric",
            text: "Pray silently. The priest then proclaims the Collect appointed for this celebration.",
          },
          { role: "people", text: "Amen." },
        ],
      },
    ],
  },
  {
    id: "word",
    title: "Liturgy of the Word",
    shortTitle: "The Word",
    items: [
      {
        id: "homily",
        title: "Homily",
        posture: "Sit",
        lines: [
          {
            role: "rubric",
            text: "Sit and receive the preaching of the Word. Sacred silence may follow.",
          },
        ],
      },
      {
        id: "universal-prayer",
        title: "Universal Prayer",
        posture: "Stand",
        lines: [
          {
            role: "priest",
            text: "The priest introduces the prayer of the faithful.",
          },
          {
            role: "reader",
            text: "The deacon or reader announces each intention.",
            label: "Deacon or Reader",
          },
          {
            role: "people",
            text: "Respond with the invocation announced for each intention.",
          },
          {
            role: "priest",
            text: "The priest concludes the Universal Prayer.",
          },
          { role: "people", text: "Amen." },
        ],
      },
    ],
  },
  {
    id: "eucharist",
    title: "Liturgy of the Eucharist",
    shortTitle: "Eucharist",
    items: [
      {
        id: "preparation-of-gifts",
        title: "Preparation of the Altar and the Gifts",
        posture: "Sit",
        subgroup: "Preparation of the Gifts",
        defaultOpen: true,
        lines: [
          {
            role: "rubric",
            text: "The altar is prepared. Bread and wine are brought forward while the Offertory Chant may be sung.",
          },
          {
            role: "all",
            text: "Offer your life, work, suffering, and thanksgiving with the gifts placed upon the altar.",
          },
        ],
      },
      {
        id: "presentation-of-gifts",
        title: "Blessing of the Bread and Wine",
        posture: "Sit",
        subgroup: "Preparation of the Gifts",
        lines: [
          {
            role: "rubric",
            text: "The people respond when either blessing is spoken aloud.",
          },
          {
            role: "priest",
            text: "Blessed are you, Lord God of all creation, for through your goodness we have received the bread we offer you: fruit of the earth and work of human hands, it will become for us the bread of life.",
          },
          { role: "people", text: "Blessed be God for ever." },
          {
            role: "priest",
            text: "Blessed are you, Lord God of all creation, for through your goodness we have received the wine we offer you: fruit of the vine and work of human hands, it will become our spiritual drink.",
          },
          { role: "people", text: "Blessed be God for ever." },
        ],
      },
      {
        id: "pray-brethren",
        title: "Invitation to Prayer",
        posture: "Stand",
        subgroup: "Preparation of the Gifts",
        lines: [
          {
            role: "priest",
            text: "Pray, brethren, that my sacrifice and yours may be acceptable to God, the almighty Father.",
          },
          {
            role: "people",
            text: "May the Lord accept the sacrifice at your hands, for the praise and glory of his name, for our good and the good of all his holy Church.",
          },
        ],
      },
      {
        id: "prayer-over-offerings",
        title: "Prayer over the Offerings",
        posture: "Stand",
        subgroup: "Preparation of the Gifts",
        lines: [
          {
            role: "priest",
            text: "The priest proclaims the Prayer over the Offerings appointed for this celebration.",
          },
          { role: "people", text: "Amen." },
        ],
      },
      {
        id: "preface-dialogue",
        title: "Preface Dialogue",
        posture: "Stand",
        subgroup: "Eucharistic Prayer",
        lines: [
          { role: "priest", text: "The Lord be with you." },
          { role: "people", text: "And with your spirit." },
          { role: "priest", text: "Lift up your hearts." },
          { role: "people", text: "We lift them up to the Lord." },
          { role: "priest", text: "Let us give thanks to the Lord our God." },
          { role: "people", text: "It is right and just." },
        ],
      },
      {
        id: "proper-preface",
        title: "Preface",
        posture: "Stand",
        subgroup: "Eucharistic Prayer",
        lines: [
          {
            role: "priest",
            text: "The priest proclaims the Preface appointed for the day, giving thanks to the Father through Christ.",
          },
        ],
      },
      {
        id: "sanctus",
        title: "Holy, Holy, Holy",
        posture: "Stand",
        subgroup: "Eucharistic Prayer",
        lines: [{ role: "all", text: SANCTUS_TEXT }],
      },
      {
        id: "eucharistic-prayer",
        title: "Thanksgiving, Epiclesis, and Consecration",
        posture: "Kneel",
        subgroup: "Eucharistic Prayer",
        lines: [
          {
            role: "rubric",
            text: "Kneel. The priest alone proclaims the Eucharistic Prayer in the name of the whole Church.",
          },
          {
            role: "priest",
            text: "He gives thanks, invokes the Holy Spirit over the gifts, and proclaims the institution narrative and Consecration.",
          },
          {
            role: "rubric",
            text: "At each elevation, look upon the Lord and adore in silence.",
          },
        ],
        variants: [
          {
            id: "eucharistic-prayer-i",
            label: "Eucharistic Prayer I",
            lines: [
              {
                role: "priest",
                text: "The Roman Canon continues through its intercessions for the Church, the living, the Saints, the Consecration, remembrance of the dead, and final praise.",
              },
            ],
          },
          {
            id: "eucharistic-prayer-ii",
            label: "Eucharistic Prayer II",
            lines: [
              {
                role: "priest",
                text: "Eucharistic Prayer II continues from its proper or appointed Preface through the Consecration, offering, and intercessions.",
              },
            ],
          },
          {
            id: "eucharistic-prayer-iii",
            label: "Eucharistic Prayer III",
            lines: [
              {
                role: "priest",
                text: "Eucharistic Prayer III continues through the Consecration, the Church's offering, and intercession for the living and the dead.",
              },
            ],
          },
          {
            id: "eucharistic-prayer-iv",
            label: "Eucharistic Prayer IV",
            lines: [
              {
                role: "priest",
                text: "Eucharistic Prayer IV continues from its proper Preface through salvation history, the Consecration, offering, and intercessions.",
              },
            ],
          },
        ],
      },
      {
        id: "mystery-of-faith",
        title: "Mystery of Faith",
        posture: "Kneel",
        subgroup: "Eucharistic Prayer",
        lines: [{ role: "priest", text: "The mystery of faith." }],
        defaultVariantId: "acclamation-a",
        variants: [
          {
            id: "acclamation-a",
            label: "We proclaim",
            lines: [
              {
                role: "people",
                text: "We proclaim your Death, O Lord, and profess your Resurrection until you come again.",
              },
            ],
          },
          {
            id: "acclamation-b",
            label: "When we eat",
            lines: [
              {
                role: "people",
                text: "When we eat this Bread and drink this Cup, we proclaim your Death, O Lord, until you come again.",
              },
            ],
          },
          {
            id: "acclamation-c",
            label: "Save us",
            lines: [
              {
                role: "people",
                text: "Save us, Saviour of the world, for by your Cross and Resurrection you have set us free.",
              },
            ],
          },
        ],
      },
      {
        id: "anamnesis-intercessions",
        title: "Anamnesis, Offering, and Intercessions",
        posture: "Kneel",
        subgroup: "Eucharistic Prayer",
        lines: [
          {
            role: "priest",
            text: "The priest recalls the saving Passion, Resurrection, and Ascension of Christ; offers the holy and living Sacrifice; and intercedes for the Church, the living, and the dead.",
          },
        ],
      },
      {
        id: "great-amen",
        title: "Doxology and Great Amen",
        posture: "Kneel",
        subgroup: "Eucharistic Prayer",
        lines: [
          {
            role: "priest",
            text: "Through him, and with him, and in him, O God, almighty Father, in the unity of the Holy Spirit, all glory and honor is yours, for ever and ever.",
          },
          { role: "people", text: "Amen.", label: "The Great Amen" },
        ],
      },
      {
        id: "our-father",
        title: "The Lord's Prayer",
        posture: "Stand",
        subgroup: "Communion Rite",
        lines: [
          {
            role: "priest",
            text: "At the Savior's command and formed by divine teaching, we dare to say:",
          },
          { role: "all", text: OUR_FATHER_TEXT },
        ],
      },
      {
        id: "embolism-doxology",
        title: "Embolism and Doxology",
        posture: "Stand",
        subgroup: "Communion Rite",
        lines: [
          {
            role: "priest",
            text: "The priest asks the Father to deliver us from evil and grant peace in our days.",
          },
          {
            role: "people",
            text: "For the kingdom, the power and the glory are yours now and for ever.",
          },
        ],
      },
      {
        id: "sign-of-peace",
        title: "Rite of Peace",
        posture: "Stand",
        subgroup: "Communion Rite",
        lines: [
          {
            role: "priest",
            text: "Lord Jesus Christ, who said to your Apostles: Peace I leave you, my peace I give you; look not on our sins, but on the faith of your Church, and graciously grant her peace and unity in accordance with your will. Who live and reign for ever and ever.",
          },
          { role: "people", text: "Amen." },
          { role: "priest", text: "The peace of the Lord be with you always." },
          { role: "people", text: "And with your spirit." },
          {
            role: "minister",
            text: "Let us offer each other the sign of peace.",
            label: "Deacon or Priest",
          },
          {
            role: "rubric",
            text: "When invited, offer a sober sign of peace to those nearby.",
          },
        ],
      },
      {
        id: "fraction",
        title: "Fraction and Lamb of God",
        posture: "Stand",
        subgroup: "Communion Rite",
        lines: [
          {
            role: "all",
            text: "Lamb of God, you take away the sins of the world, have mercy on us.",
          },
          {
            role: "rubric",
            text: "Repeat as needed while the bread is broken. The final invocation asks for peace.",
          },
          {
            role: "all",
            text: "Lamb of God, you take away the sins of the world, grant us peace.",
          },
        ],
      },
      {
        id: "invitation-to-communion",
        title: "Invitation to Holy Communion",
        posture: "Kneel",
        subgroup: "Communion Rite",
        lines: [
          {
            role: "priest",
            text: "Behold the Lamb of God, behold him who takes away the sins of the world. Blessed are those called to the supper of the Lamb.",
          },
          {
            role: "all",
            text: "Lord, I am not worthy that you should enter under my roof, but only say the word and my soul shall be healed.",
          },
        ],
      },
      {
        id: "holy-communion",
        title: "Communion Procession",
        posture: "Stand",
        subgroup: "Communion Rite",
        lines: [
          {
            role: "rubric",
            text: "Join the Communion Chant. Approach reverently and bow the head before receiving.",
          },
          { role: "minister", text: "The Body of Christ." },
          { role: "people", text: "Amen.", label: "Communicant" },
        ],
        defaultVariantId: "host-only",
        variants: [
          {
            id: "host-only",
            label: "Body of Christ",
            lines: [
              {
                role: "rubric",
                text: "Return to your place in prayer after receiving the consecrated Host.",
              },
            ],
          },
          {
            id: "both-kinds",
            label: "Body and Blood of Christ",
            lines: [
              { role: "minister", text: "The Blood of Christ." },
              { role: "people", text: "Amen.", label: "Communicant" },
            ],
          },
        ],
      },
      {
        id: "thanksgiving",
        title: "Sacred Silence",
        posture: "Sit or kneel",
        subgroup: "Communion Rite",
        lines: [
          {
            role: "rubric",
            text: "Remain with Christ in thanksgiving. A psalm, hymn, or canticle of praise may be sung.",
          },
        ],
      },
      {
        id: "prayer-after-communion",
        title: "Prayer after Communion",
        posture: "Stand",
        subgroup: "Communion Rite",
        lines: [
          { role: "priest", text: "Let us pray." },
          {
            role: "priest",
            text: "The priest proclaims the Prayer after Communion appointed for this celebration.",
          },
          { role: "people", text: "Amen." },
        ],
      },
    ],
  },
  {
    id: "dismissal",
    title: "Concluding Rites",
    shortTitle: "Dismissal",
    items: [
      {
        id: "announcements",
        title: "Announcements",
        posture: "Sit",
        lines: [
          {
            role: "rubric",
            text: "Brief announcements may be made when needed.",
          },
        ],
      },
      {
        id: "final-blessing",
        title: "Greeting and Blessing",
        posture: "Stand",
        lines: [
          { role: "priest", text: "The Lord be with you." },
          { role: "people", text: "And with your spirit." },
        ],
        defaultVariantId: "simple",
        variants: [
          {
            id: "simple",
            label: "Simple blessing",
            lines: [
              {
                role: "priest",
                text: "May almighty God bless you, the Father, and the Son, and the Holy Spirit.",
              },
              { role: "people", text: "Amen." },
            ],
          },
          {
            id: "solemn",
            label: "Solemn blessing",
            lines: [
              {
                role: "rubric",
                text: "Bow your head. The priest proclaims the appointed invocations; answer Amen to each, then receive the Trinitarian blessing.",
              },
              { role: "people", text: "Amen." },
            ],
          },
          {
            id: "people",
            label: "Prayer over the People",
            lines: [
              {
                role: "deacon",
                text: "Bow down for the blessing.",
              },
              {
                role: "priest",
                text: "The priest proclaims the appointed Prayer over the People and gives the Trinitarian blessing.",
              },
              { role: "people", text: "Amen." },
            ],
          },
        ],
      },
      {
        id: "dismissal",
        title: "Dismissal",
        posture: "Stand",
        defaultVariantId: "go-forth",
        variants: [
          {
            id: "go-forth",
            label: "Go forth",
            lines: [
              {
                role: "minister",
                text: "Go forth, the Mass is ended.",
                label: "Deacon or Priest",
              },
              { role: "people", text: "Thanks be to God." },
            ],
          },
          {
            id: "announce-gospel",
            label: "Announce the Gospel",
            lines: [
              {
                role: "minister",
                text: "Go and announce the Gospel of the Lord.",
                label: "Deacon or Priest",
              },
              { role: "people", text: "Thanks be to God." },
            ],
          },
          {
            id: "peace-glorifying",
            label: "Glorifying the Lord",
            lines: [
              {
                role: "minister",
                text: "Go in peace, glorifying the Lord by your life.",
                label: "Deacon or Priest",
              },
              { role: "people", text: "Thanks be to God." },
            ],
          },
          {
            id: "peace",
            label: "Go in peace",
            lines: [
              {
                role: "minister",
                text: "Go in peace.",
                label: "Deacon or Priest",
              },
              { role: "people", text: "Thanks be to God." },
            ],
          },
        ],
      },
      {
        id: "recessional",
        title: "Veneration and Recessional",
        posture: "Stand",
        lines: [
          {
            role: "rubric",
            text: "The priest and deacon reverence the altar and depart with the ministers. Join the Recessional Chant.",
          },
        ],
      },
    ],
  },
] as const;

export const MASS_ORDER_SECTIONS = MASS_ORDER_SECTIONS_VALUE;
