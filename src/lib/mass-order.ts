export type MassPosture = "Stand" | "Sit" | "Kneel" | "Sit or kneel";

export type MassOrderItem = {
  id: string;
  title: string;
  posture: MassPosture;
  cue?: string;
  response?: string;
  responseLabel?: string;
};

export type MassOrderSection = {
  id: "entrance" | "word" | "eucharist" | "communion" | "dismissal";
  title: string;
  shortTitle: string;
  items: readonly MassOrderItem[];
};

export const GLORIA_TEXT =
  "Glory to God in the highest, and on earth peace to people of good will. We praise you, we bless you, we adore you, we glorify you, we give you thanks for your great glory, Lord God, heavenly King, O God, almighty Father. Lord Jesus Christ, Only Begotten Son, Lord God, Lamb of God, Son of the Father, you take away the sins of the world, have mercy on us; you take away the sins of the world, receive our prayer; you are seated at the right hand of the Father, have mercy on us. For you alone are the Holy One, you alone are the Lord, you alone are the Most High, Jesus Christ, with the Holy Spirit, in the glory of God the Father. Amen.";

export const NICENE_CREED_TEXT =
  "I believe in one God, the Father almighty, maker of heaven and earth, of all things visible and invisible. I believe in one Lord Jesus Christ, the Only Begotten Son of God, born of the Father before all ages. God from God, Light from Light, true God from true God, begotten, not made, consubstantial with the Father; through him all things were made. For us men and for our salvation he came down from heaven, and by the Holy Spirit was incarnate of the Virgin Mary, and became man. For our sake he was crucified under Pontius Pilate, he suffered death and was buried, and rose again on the third day in accordance with the Scriptures. He ascended into heaven and is seated at the right hand of the Father. He will come again in glory to judge the living and the dead and his kingdom will have no end. I believe in the Holy Spirit, the Lord, the giver of life, who proceeds from the Father and the Son, who with the Father and the Son is adored and glorified, who has spoken through the prophets. I believe in one, holy, catholic and apostolic Church. I confess one Baptism for the forgiveness of sins and I look forward to the resurrection of the dead and the life of the world to come. Amen.";

export const SANCTUS_TEXT =
  "Holy, Holy, Holy Lord God of hosts. Heaven and earth are full of your glory. Hosanna in the highest. Blessed is he who comes in the name of the Lord. Hosanna in the highest.";

export const MASS_ORDER_SECTIONS: readonly MassOrderSection[] = [
  {
    id: "entrance",
    title: "Introductory Rites",
    shortTitle: "Entrance",
    items: [
      {
        id: "entrance-procession",
        title: "Entrance",
        posture: "Stand",
        cue: "Join the entrance chant.",
      },
      {
        id: "sign-of-the-cross",
        title: "Sign of the Cross",
        posture: "Stand",
        response: "Amen.",
      },
      {
        id: "greeting",
        title: "Greeting",
        posture: "Stand",
        response: "And with your spirit.",
      },
      {
        id: "penitential-act",
        title: "Penitential Act",
        posture: "Stand",
        cue: "Call to mind your sins. Follow the form begun by the celebrant.",
        response: "Amen.",
      },
      {
        id: "kyrie",
        title: "Kyrie",
        posture: "Stand",
        cue: "Pray it here when it has not formed part of the Penitential Act.",
        response: "Lord, have mercy. Christ, have mercy. Lord, have mercy.",
      },
      {
        id: "collect",
        title: "Collect",
        posture: "Stand",
        cue: "Pray in silence, then listen to the prayer of the Church.",
        response: "Amen.",
      },
    ],
  },
  {
    id: "word",
    title: "Liturgy of the Word",
    shortTitle: "Word",
    items: [
      {
        id: "first-reading",
        title: "First Reading",
        posture: "Sit",
        responseLabel: "After the reading",
        response: "Thanks be to God.",
      },
      {
        id: "responsorial-psalm",
        title: "Responsorial Psalm",
        posture: "Sit",
        cue: "Answer with the assembly after each verse.",
      },
      {
        id: "gospel-acclamation",
        title: "Gospel Acclamation",
        posture: "Stand",
        cue: "Rise and join the acclamation.",
      },
      {
        id: "gospel",
        title: "Holy Gospel",
        posture: "Stand",
        cue: "Trace the Cross on your forehead, lips, and heart.",
        responseLabel: "At the announcement",
        response: "Glory to you, O Lord.",
      },
      {
        id: "homily",
        title: "Homily",
        posture: "Sit",
        cue: "Listen and receive the Word in silence.",
      },
      {
        id: "universal-prayer",
        title: "Universal Prayer",
        posture: "Stand",
        cue: "Respond with the invocation announced for each petition.",
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
        title: "Preparation of the Gifts",
        posture: "Sit",
        cue: "Offer your life with the bread and wine.",
      },
      {
        id: "presentation-of-gifts",
        title: "Presentation of the Bread and Wine",
        posture: "Sit",
        cue: "When the prayers are spoken aloud.",
        response: "Blessed be God for ever.",
      },
      {
        id: "pray-brethren",
        title: "Invitation to Prayer",
        posture: "Stand",
        response:
          "May the Lord accept the sacrifice at your hands, for the praise and glory of his name, for our good and the good of all his holy Church.",
      },
      {
        id: "prayer-over-offerings",
        title: "Prayer over the Offerings",
        posture: "Stand",
        response: "Amen.",
      },
      {
        id: "preface-dialogue",
        title: "Preface Dialogue",
        posture: "Stand",
        response:
          "And with your spirit. We lift them up to the Lord. It is right and just.",
      },
      {
        id: "sanctus",
        title: "Holy, Holy, Holy",
        posture: "Stand",
        response: SANCTUS_TEXT,
      },
      {
        id: "eucharistic-prayer",
        title: "Eucharistic Prayer",
        posture: "Kneel",
        cue: "Adore Christ made present. At each elevation, look upon the Lord.",
      },
      {
        id: "mystery-of-faith",
        title: "Mystery of Faith",
        posture: "Kneel",
        cue: "Follow the acclamation begun: We proclaim your Death / When we eat this Bread / Save us, Saviour.",
      },
      {
        id: "great-amen",
        title: "Great Amen",
        posture: "Kneel",
        response: "Amen.",
      },
    ],
  },
  {
    id: "communion",
    title: "Communion Rite",
    shortTitle: "Communion",
    items: [
      {
        id: "our-father",
        title: "The Lord's Prayer",
        posture: "Stand",
        response:
          "Our Father, who art in heaven, hallowed be thy name; thy kingdom come; thy will be done on earth as it is in heaven. Give us this day our daily bread; and forgive us our trespasses, as we forgive those who trespass against us; and lead us not into temptation, but deliver us from evil.",
      },
      {
        id: "doxology",
        title: "Doxology",
        posture: "Stand",
        response:
          "For the kingdom, the power and the glory are yours now and for ever.",
      },
      {
        id: "prayer-for-peace",
        title: "Prayer for Peace",
        posture: "Stand",
        response: "Amen.",
      },
      {
        id: "sign-of-peace",
        title: "Sign of Peace",
        posture: "Stand",
        responseLabel: "To the celebrant",
        response: "And with your spirit.",
      },
      {
        id: "fraction",
        title: "Lamb of God",
        posture: "Stand",
        cue: "Repeat during the fraction; the final invocation asks for peace.",
        response:
          "Lamb of God, you take away the sins of the world, have mercy on us.",
      },
      {
        id: "fraction-final",
        title: "Final Invocation",
        posture: "Stand",
        response:
          "Lamb of God, you take away the sins of the world, grant us peace.",
      },
      {
        id: "invitation-to-communion",
        title: "Invitation to Communion",
        posture: "Kneel",
        response:
          "Lord, I am not worthy that you should enter under my roof, but only say the word and my soul shall be healed.",
      },
      {
        id: "holy-communion",
        title: "Holy Communion",
        posture: "Stand",
        cue: "Approach reverently and bow the head before receiving.",
        responseLabel: "The Body of Christ",
        response: "Amen.",
      },
      {
        id: "thanksgiving",
        title: "Sacred Silence",
        posture: "Sit or kneel",
        cue: "Remain with Christ in thanksgiving.",
      },
      {
        id: "prayer-after-communion",
        title: "Prayer after Communion",
        posture: "Stand",
        response: "Amen.",
      },
    ],
  },
  {
    id: "dismissal",
    title: "Concluding Rites",
    shortTitle: "Dismissal",
    items: [
      {
        id: "final-blessing",
        title: "Final Blessing",
        posture: "Stand",
        response: "And with your spirit. Amen.",
      },
      {
        id: "dismissal",
        title: "Dismissal",
        posture: "Stand",
        response: "Thanks be to God.",
      },
      {
        id: "recessional",
        title: "Recessional",
        posture: "Stand",
        cue: "Join the recessional chant, then go in peace.",
      },
    ],
  },
] as const;
