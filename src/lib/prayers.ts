export const prayerCategories = [
  "Essential",
  "Daily rhythm",
  "Marian",
  "Holy Spirit",
  "Eucharistic",
  "Reconciliation",
  "Saints & angels",
  "Discernment",
] as const;

export type PrayerCategory = (typeof prayerCategories)[number];

export type Prayer = {
  slug: string;
  title: string;
  category: PrayerCategory;
  summary: string;
  whenToPray: string;
  source: string;
  text: string[];
};

export const formationGuideCategories = [
  "Scripture prayer",
  "Daily review",
  "Sacramental preparation",
  "Eucharistic devotion",
  "Passion devotion",
  "Daily rule",
] as const;

export type FormationGuideCategory =
  (typeof formationGuideCategories)[number];

export type DevotionGuideStep = {
  title: string;
  instruction: string;
  scripture?: string;
};

export type DevotionGuide = {
  slug: string;
  title: string;
  category: FormationGuideCategory;
  eyebrow: string;
  summary: string;
  duration: string;
  provenance: string;
  pastoralNote?: string;
  steps: DevotionGuideStep[];
};

export const prayers: Prayer[] = [
  {
    slug: "sign-of-the-cross",
    title: "Sign of the Cross",
    category: "Essential",
    summary: "Begin and end prayer in the name of the Holy Trinity.",
    whenToPray: "At the beginning and end of prayer",
    source: "Traditional Catholic prayer; public-domain English form",
    text: [
      "In the name of the Father, and of the Son, and of the Holy Ghost. Amen.",
    ],
  },
  {
    slug: "our-father",
    title: "Our Father",
    category: "Essential",
    summary: "The prayer Jesus taught his disciples.",
    whenToPray: "At any time; especially in the Rosary and the liturgy",
    source: "Matthew 6:9-13; traditional public-domain English form",
    text: [
      "Our Father, who art in heaven, hallowed be Thy name. Thy kingdom come. Thy will be done on earth as it is in heaven.",
      "Give us this day our daily bread; and forgive us our trespasses, as we forgive those who trespass against us; and lead us not into temptation, but deliver us from evil. Amen.",
    ],
  },
  {
    slug: "hail-mary",
    title: "Hail Mary",
    category: "Essential",
    summary: "A biblical greeting joined to a request for Mary's intercession.",
    whenToPray: "At any time; especially in the Rosary and Angelus",
    source: "Luke 1:28, 42; traditional public-domain English form",
    text: [
      "Hail Mary, full of grace, the Lord is with thee; blessed art thou amongst women, and blessed is the fruit of thy womb, Jesus.",
      "Holy Mary, Mother of God, pray for us sinners, now and at the hour of our death. Amen.",
    ],
  },
  {
    slug: "glory-be",
    title: "Glory Be",
    category: "Essential",
    summary: "A brief doxology of praise to the Holy Trinity.",
    whenToPray: "After psalms, Rosary decades, and personal prayer",
    source: "Traditional Christian doxology; public-domain English form",
    text: [
      "Glory be to the Father, and to the Son, and to the Holy Ghost; as it was in the beginning, is now, and ever shall be, world without end. Amen.",
    ],
  },
  {
    slug: "apostles-creed",
    title: "Apostles' Creed",
    category: "Essential",
    summary: "A compact profession of the faith received at Baptism.",
    whenToPray: "At the opening of the Rosary or in daily profession of faith",
    source: "Ancient baptismal creed; public-domain English form",
    text: [
      "I believe in God, the Father almighty, Creator of heaven and earth; and in Jesus Christ, His only Son, our Lord; who was conceived by the Holy Ghost, born of the Virgin Mary; suffered under Pontius Pilate, was crucified, dead, and buried. He descended into hell; the third day He rose again from the dead; He ascended into heaven, and sitteth at the right hand of God the Father almighty; from thence He shall come to judge the living and the dead.",
      "I believe in the Holy Ghost, the holy Catholic Church, the communion of saints, the forgiveness of sins, the resurrection of the body, and life everlasting. Amen.",
    ],
  },
  {
    slug: "jesus-prayer",
    title: "Jesus Prayer",
    category: "Essential",
    summary: "Call on the holy name of Jesus with humility and trust.",
    whenToPray: "In silence, while walking, or whenever attention returns to God",
    source: "Ancient Eastern Christian prayer; traditional English form",
    text: ["Lord Jesus Christ, Son of God, have mercy on me, a sinner."],
  },
  {
    slug: "act-of-faith",
    title: "Act of Faith",
    category: "Essential",
    summary: "Entrust the mind to God, who is Truth itself.",
    whenToPray: "Morning prayer, before study, or in times of doubt",
    source: "Traditional Catholic prayer; public-domain English form",
    text: [
      "O my God, I firmly believe that Thou art one God in three divine Persons, Father, Son, and Holy Ghost. I believe that Thy divine Son became man and died for our sins, and that He will come to judge the living and the dead. I believe these and all the truths which the holy Catholic Church teaches, because Thou hast revealed them, who canst neither deceive nor be deceived. Amen.",
    ],
  },
  {
    slug: "act-of-hope",
    title: "Act of Hope",
    category: "Essential",
    summary: "Place every need within God's power, mercy, and promises.",
    whenToPray: "When discouraged, afraid, or beginning again",
    source: "Traditional Catholic prayer; public-domain English form",
    text: [
      "O my God, relying on Thy almighty power and infinite mercy and promises, I hope to obtain pardon of my sins, the help of Thy grace, and life everlasting through the merits of Jesus Christ, my Lord and Redeemer. Amen.",
    ],
  },
  {
    slug: "act-of-charity",
    title: "Act of Charity",
    category: "Essential",
    summary: "Renew love of God and neighbor, forgiveness, and repentance.",
    whenToPray: "Morning prayer, after conflict, or before a work of mercy",
    source: "Traditional Catholic prayer; public-domain English form",
    text: [
      "O my God, I love Thee above all things with my whole heart and soul, because Thou art all-good and worthy of all my love. I love my neighbor as myself for love of Thee. I forgive all who have injured me, and I ask pardon of all whom I have injured. Amen.",
    ],
  },
  {
    slug: "morning-offering",
    title: "Morning Offering",
    category: "Daily rhythm",
    summary: "Offer the whole day to Jesus in union with the Mass.",
    whenToPray: "Soon after waking, before the day's work begins",
    source:
      "Traditional Morning Offering associated with Fr. François-Xavier Gautrelet; public-domain English form",
    text: [
      "O Jesus, through the Immaculate Heart of Mary, I offer Thee my prayers, works, joys, and sufferings of this day for all the intentions of Thy Sacred Heart, in union with the Holy Sacrifice of the Mass throughout the world, in reparation for sins, for the intentions of our bishops and of the Pope, and for our special intentions. Amen.",
    ],
  },
  {
    slug: "grace-before-meals",
    title: "Grace Before Meals",
    category: "Daily rhythm",
    summary: "Receive food and fellowship as gifts from God's bounty.",
    whenToPray: "Before eating",
    source: "Traditional Catholic blessing; public-domain English form",
    text: [
      "Bless us, O Lord, and these Thy gifts, which we are about to receive from Thy bounty, through Christ our Lord. Amen.",
    ],
  },
  {
    slug: "grace-after-meals",
    title: "Grace After Meals",
    category: "Daily rhythm",
    summary: "Give thanks for God's benefits and remember the faithful departed.",
    whenToPray: "After eating",
    source: "Traditional Catholic thanksgiving; public-domain English form",
    text: [
      "We give Thee thanks, Almighty God, for all Thy benefits, who livest and reignest world without end. Amen.",
      "And may the souls of the faithful departed, through the mercy of God, rest in peace. Amen.",
    ],
  },
  {
    slug: "nunc-dimittis",
    title: "Canticle of Simeon",
    category: "Daily rhythm",
    summary: "Entrust the night and the end of life to the salvation seen in Christ.",
    whenToPray: "At night prayer or before sleep",
    source: "Luke 2:29-32; Nunc Dimittis in public-domain English",
    text: [
      "Lord, now lettest Thou Thy servant depart in peace, according to Thy word: for mine eyes have seen Thy salvation, which Thou hast prepared before the face of all people; a light to lighten the Gentiles, and the glory of Thy people Israel. Amen.",
    ],
  },
  {
    slug: "hail-holy-queen",
    title: "Hail, Holy Queen",
    category: "Marian",
    summary: "Ask the Mother of Mercy to turn her compassionate gaze toward us.",
    whenToPray: "At the close of the Rosary or in times of exile and sorrow",
    source: "Salve Regina; traditional public-domain English form",
    text: [
      "Hail, holy Queen, Mother of mercy; our life, our sweetness, and our hope. To thee do we cry, poor banished children of Eve; to thee do we send up our sighs, mourning and weeping in this vale of tears.",
      "Turn then, most gracious Advocate, thine eyes of mercy toward us; and after this our exile, show unto us the blessed fruit of thy womb, Jesus. O clement, O loving, O sweet Virgin Mary. Amen.",
    ],
  },
  {
    slug: "memorare",
    title: "Memorare",
    category: "Marian",
    summary: "Approach Mary with confidence in her maternal intercession.",
    whenToPray: "For urgent needs, perseverance, or another person's intention",
    source: "Traditional Marian prayer; public-domain English form",
    text: [
      "Remember, O most gracious Virgin Mary, that never was it known that anyone who fled to thy protection, implored thy help, or sought thy intercession was left unaided.",
      "Inspired by this confidence, I fly unto thee, O Virgin of virgins, my Mother. To thee do I come; before thee I stand, sinful and sorrowful. O Mother of the Word Incarnate, despise not my petitions, but in thy mercy hear and answer me. Amen.",
    ],
  },
  {
    slug: "angelus",
    title: "The Angelus",
    category: "Marian",
    summary: "Pause within the day to remember the Incarnation.",
    whenToPray: "Traditionally at morning, noon, and evening outside Eastertide",
    source: "Traditional Catholic devotion; public-domain English form",
    text: [
      "V. The Angel of the Lord declared unto Mary. R. And she conceived by the Holy Ghost.",
      "Pray one Hail Mary.",
      "V. Behold the handmaid of the Lord. R. Be it done unto me according to thy word.",
      "Pray one Hail Mary.",
      "V. And the Word was made flesh. R. And dwelt among us.",
      "Pray one Hail Mary.",
      "V. Pray for us, O holy Mother of God. R. That we may be made worthy of the promises of Christ.",
      "Let us pray. Pour forth, we beseech Thee, O Lord, Thy grace into our hearts; that we, to whom the Incarnation of Christ, Thy Son, was made known by the message of an angel, may, by His Passion and Cross, be brought to the glory of His Resurrection. Through the same Christ our Lord. Amen.",
    ],
  },
  {
    slug: "regina-caeli",
    title: "Regina Caeli",
    category: "Marian",
    summary: "Rejoice with Mary in the Resurrection of her Son.",
    whenToPray: "During Eastertide in place of the Angelus",
    source: "Traditional Marian antiphon; public-domain English form",
    text: [
      "Queen of Heaven, rejoice, alleluia; for He whom thou wast worthy to bear, alleluia, hath risen as He said, alleluia. Pray for us to God, alleluia.",
      "V. Rejoice and be glad, O Virgin Mary, alleluia. R. For the Lord is truly risen, alleluia.",
      "Let us pray. O God, who by the Resurrection of Thy Son, our Lord Jesus Christ, didst vouchsafe to make glad the whole world; grant, we beseech Thee, that through the intercession of the Virgin Mary, His Mother, we may attain the joys of everlasting life. Through the same Christ our Lord. Amen.",
    ],
  },
  {
    slug: "sub-tuum-praesidium",
    title: "We Fly to Thy Patronage",
    category: "Marian",
    summary: "Take refuge under the protection of the Mother of God.",
    whenToPray: "In danger, anxiety, or need",
    source: "Sub Tuum Praesidium; ancient prayer in public-domain English",
    text: [
      "We fly to thy patronage, O holy Mother of God; despise not our petitions in our necessities, but deliver us always from all dangers, O glorious and blessed Virgin. Amen.",
    ],
  },
  {
    slug: "come-holy-spirit",
    title: "Come, Holy Spirit",
    category: "Holy Spirit",
    summary: "Ask the Holy Spirit to renew the heart and the face of the earth.",
    whenToPray: "Before prayer, work, study, discernment, or difficult conversation",
    source: "Traditional Catholic prayer; public-domain English form",
    text: [
      "Come, Holy Spirit, fill the hearts of Thy faithful and kindle in them the fire of Thy love.",
      "V. Send forth Thy Spirit and they shall be created. R. And Thou shalt renew the face of the earth.",
      "Let us pray. O God, who didst teach the hearts of the faithful by the light of the Holy Spirit, grant that by the gift of the same Spirit we may be truly wise and ever rejoice in His consolation. Through Christ our Lord. Amen.",
    ],
  },
  {
    slug: "o-heavenly-king",
    title: "O Heavenly King",
    category: "Holy Spirit",
    summary: "Welcome the Spirit of truth, giver of life, into the whole person.",
    whenToPray: "At the beginning of prayer or when seeking purification",
    source: "Ancient Byzantine prayer; public-domain English form",
    text: [
      "O Heavenly King, the Comforter, the Spirit of truth, who art everywhere present and fillest all things, Treasury of blessings and Giver of life: come and abide in us, and cleanse us from every stain, and save, O Good One, our souls. Amen.",
    ],
  },
  {
    slug: "anima-christi",
    title: "Anima Christi",
    category: "Eucharistic",
    summary: "Seek complete union and refuge in Christ's saving Passion.",
    whenToPray: "After Holy Communion or during Eucharistic adoration",
    source: "Medieval Eucharistic prayer; public-domain English form",
    text: [
      "Soul of Christ, sanctify me. Body of Christ, save me. Blood of Christ, inebriate me. Water from the side of Christ, wash me. Passion of Christ, strengthen me. O good Jesus, hear me.",
      "Within Thy wounds hide me. Suffer me not to be separated from Thee. From the malignant enemy defend me. In the hour of my death call me, and bid me come unto Thee, that with Thy saints I may praise Thee, for ever and ever. Amen.",
    ],
  },
  {
    slug: "spiritual-communion",
    title: "Act of Spiritual Communion",
    category: "Eucharistic",
    summary: "Express desire for union with Christ when not receiving sacramentally.",
    whenToPray: "During adoration, a streamed Mass, or whenever unable to receive",
    source:
      "Traditional prayer attributed to St. Alphonsus Liguori; public-domain English form",
    text: [
      "My Jesus, I believe that Thou art present in the Most Holy Sacrament. I love Thee above all things, and I desire to receive Thee into my soul. Since I cannot now receive Thee sacramentally, come at least spiritually into my heart.",
      "I embrace Thee as if Thou wert already there, and unite myself wholly to Thee. Never permit me to be separated from Thee. Amen.",
    ],
  },
  {
    slug: "divine-praises",
    title: "The Divine Praises",
    category: "Eucharistic",
    summary: "Bless God in reparation and praise after Benediction or adoration.",
    whenToPray: "Traditionally after Benediction of the Blessed Sacrament",
    source: "Traditional Laudes Divinae; common English form",
    text: [
      "Blessed be God. Blessed be His holy Name. Blessed be Jesus Christ, true God and true Man. Blessed be the Name of Jesus. Blessed be His most Sacred Heart. Blessed be His most Precious Blood.",
      "Blessed be Jesus in the most holy Sacrament of the altar. Blessed be the Holy Spirit, the Paraclete. Blessed be the great Mother of God, Mary most holy. Blessed be her holy and Immaculate Conception. Blessed be her glorious Assumption.",
      "Blessed be the name of Mary, Virgin and Mother. Blessed be Saint Joseph, her most chaste spouse. Blessed be God in His Angels and in His Saints.",
    ],
  },
  {
    slug: "act-of-contrition",
    title: "Act of Contrition",
    category: "Reconciliation",
    summary: "Express sorrow for sin and resolve to confess, do penance, and amend.",
    whenToPray: "During an examen, before Confession, or after recognizing sin",
    source: "Traditional Catholic prayer; public-domain English form",
    text: [
      "O my God, I am heartily sorry for having offended Thee, and I detest all my sins because of Thy just punishments,",
      "but most of all because they offend Thee, my God, who art all-good and deserving of all my love.",
      "I firmly resolve, with the help of Thy grace, to confess my sins, to do penance, and to amend my life. Amen.",
    ],
  },
  {
    slug: "confiteor",
    title: "Confiteor",
    category: "Reconciliation",
    summary: "Acknowledge sin and ask the communion of saints for prayer.",
    whenToPray: "During examination of conscience or penitential prayer",
    source: "Traditional Roman Confiteor; older public-domain English form",
    text: [
      "I confess to Almighty God, to blessed Mary ever Virgin, to blessed Michael the Archangel, to blessed John the Baptist, to the holy Apostles Peter and Paul, and to all the Saints, that I have sinned exceedingly in thought, word, and deed: through my fault, through my fault, through my most grievous fault.",
      "Therefore I beseech blessed Mary ever Virgin, blessed Michael the Archangel, blessed John the Baptist, the holy Apostles Peter and Paul, and all the Saints, to pray to the Lord our God for me. Amen.",
    ],
  },
  {
    slug: "guardian-angel",
    title: "Prayer to One's Guardian Angel",
    category: "Saints & angels",
    summary: "Ask the angel entrusted with your care to light, guard, rule, and guide.",
    whenToPray: "Morning, evening, before travel, or in danger",
    source: "Angele Dei; traditional public-domain English form",
    text: [
      "Angel of God, my guardian dear, to whom God's love commits me here, ever this day be at my side, to light and guard, to rule and guide. Amen.",
    ],
  },
  {
    slug: "saint-michael",
    title: "Prayer to Saint Michael",
    category: "Saints & angels",
    summary: "Ask the Archangel's protection in spiritual battle.",
    whenToPray: "In temptation, danger, or prayer for the Church",
    source: "Pope Leo XIII prayer; public-domain English form",
    text: [
      "Saint Michael the Archangel, defend us in battle; be our protection against the wickedness and snares of the devil. May God rebuke him, we humbly pray;",
      "and do Thou, O Prince of the heavenly host, by the power of God, thrust into hell Satan and all the evil spirits who prowl about the world seeking the ruin of souls. Amen.",
    ],
  },
  {
    slug: "direct-our-actions",
    title: "Direct Our Actions",
    category: "Discernment",
    summary: "Place the beginning, progress, and completion of every work in God.",
    whenToPray: "Before a decision, project, meeting, or journey",
    source: "Actiones nostras; traditional Roman collect in public-domain English",
    text: [
      "Direct, we beseech Thee, O Lord, our actions by Thy holy inspirations, and carry them on by Thy gracious assistance; that every prayer and work of ours may begin always with Thee, and through Thee be happily ended. Amen.",
    ],
  },
];

export const devotionGuides: DevotionGuide[] = [
  {
    slug: "lectio-divina",
    title: "Lectio Divina",
    category: "Scripture prayer",
    eyebrow: "Praying with the Word",
    summary:
      "Receive a short passage slowly, answer God from the heart, and rest in his presence.",
    duration: "20-30 minutes",
    provenance:
      "Original Sanctum Council formation guide; the four traditional movements are preserved.",
    pastoralNote:
      "Lectio Divina is prayer, not a method for forcing a private interpretation. Read Scripture within the faith of the Church.",
    steps: [
      {
        title: "1. Arrive",
        instruction:
          "Silence notifications, sit attentively, and make the Sign of the Cross. Ask the Holy Spirit for a listening heart rather than a quick insight.",
        scripture: "Psalm 119:18",
      },
      {
        title: "2. Read — Lectio",
        instruction:
          "Read a short passage aloud, slowly, two or three times. Notice a word, image, action, or phrase that quietly draws your attention.",
      },
      {
        title: "3. Meditate — Meditatio",
        instruction:
          "Stay with what stood out. Ask what the text reveals about God, the human heart, and the concrete circumstances of your life.",
      },
      {
        title: "4. Pray — Oratio",
        instruction:
          "Answer God honestly: praise, repent, give thanks, intercede, or ask for grace. Let the passage supply the language of your prayer.",
      },
      {
        title: "5. Contemplate — Contemplatio",
        instruction:
          "Release the need to produce more thoughts. Rest quietly before God; when distracted, return gently to the word you received.",
      },
      {
        title: "6. Carry — Actio",
        instruction:
          "Name one small, observable response for today. Close with an Our Father and write the word or resolution where you will see it.",
      },
    ],
  },
  {
    slug: "daily-examen",
    title: "Daily Examen",
    category: "Daily review",
    eyebrow: "Finding God in the day",
    summary:
      "Review the day with gratitude, truth, mercy, and one grace for tomorrow.",
    duration: "10-15 minutes",
    provenance:
      "Original Sanctum Council formation guide shaped by the Ignatian examen.",
    pastoralNote:
      "The examen is a prayerful review, not an exercise in self-accusation. Receive conviction with hope and bring persistent concerns to a wise confessor.",
    steps: [
      {
        title: "1. Enter God's presence",
        instruction:
          "Become still, make the Sign of the Cross, and remember that you are seen by the Father with complete truth and steadfast love.",
      },
      {
        title: "2. Give thanks",
        instruction:
          "Recall two or three concrete gifts from the day: a person, provision, beauty, work completed, protection, or grace received.",
      },
      {
        title: "3. Ask for light",
        instruction:
          "Ask the Holy Spirit to show the day as God sees it, without excuse, exaggeration, or fear.",
        scripture: "Psalm 139:23-24",
      },
      {
        title: "4. Review the day",
        instruction:
          "Move from waking to this moment. Notice where faith, hope, and love grew, and where you resisted grace in thought, word, deed, or omission.",
      },
      {
        title: "5. Receive mercy",
        instruction:
          "Thank God for every cooperation with grace. Name sins simply, ask forgiveness, and pray an Act of Contrition without rehearsing forgiven failures.",
      },
      {
        title: "6. Look toward tomorrow",
        instruction:
          "Preview the next day. Ask for one needed grace and choose one modest response: an apology, boundary, act of service, or avoided occasion of sin.",
      },
      {
        title: "7. Rest in trust",
        instruction:
          "Entrust unfinished work and the people you love to God. Close with the Our Father or the Canticle of Simeon.",
      },
    ],
  },
  {
    slug: "confession-preparation",
    title: "Prepare for Confession",
    category: "Sacramental preparation",
    eyebrow: "A calm examination of conscience",
    summary:
      "Prepare an honest, concise confession rooted in mercy and a real purpose of amendment.",
    duration: "15-30 minutes",
    provenance:
      "Original Sanctum Council formation guide; sacramental counsel belongs to a priest.",
    pastoralNote:
      "This guide does not replace a confessor. If you are unsure whether a sin was grave or fully chosen, say so calmly to the priest; do not treat temptation, intrusive thought, emotion, or mere accident as deliberate consent.",
    steps: [
      {
        title: "1. Begin with mercy",
        instruction:
          "Make the Sign of the Cross. Ask the Holy Spirit for honesty and trust, then remember that Christ came to call sinners and desires your return.",
        scripture: "Luke 15:11-24",
      },
      {
        title: "2. Recall the last confession",
        instruction:
          "Note roughly when it was, whether you completed the assigned penance, and whether you intentionally withheld any grave sin. Bring uncertainty to the priest.",
      },
      {
        title: "3. Review love of God",
        instruction:
          "Consider prayer, Sunday and holy day Mass, reverence for God's name, reception of the sacraments, trust, gratitude, and any superstition or idolatry.",
      },
      {
        title: "4. Review love of neighbor",
        instruction:
          "Consider family and vocational duties, truthfulness, anger, forgiveness, sexuality, use of possessions, justice, speech, envy, and care for vulnerable people.",
      },
      {
        title: "5. Notice omissions and patterns",
        instruction:
          "Ask what love required that you knowingly left undone. Notice recurring occasions, habits, or environments that need a practical change.",
      },
      {
        title: "6. Name freedom and gravity honestly",
        instruction:
          "Mortal sin involves grave matter, full knowledge, and deliberate consent together. Avoid minimizing chosen sin or magnifying what was not freely chosen.",
      },
      {
        title: "7. Awaken contrition",
        instruction:
          "Look to the Crucified Lord, express sorrow for offending God, and ask for grace to turn away from sin. Pray the Act of Contrition slowly.",
      },
      {
        title: "8. Prepare a concise confession",
        instruction:
          "List unconfessed grave sins by kind and approximate number; add venial sins that reveal patterns. Leave out names, unnecessary detail, self-defense, and long backstory.",
      },
      {
        title: "9. Receive and respond",
        instruction:
          "Listen to the priest, make your Act of Contrition, receive absolution, and complete the penance promptly. Thank God and carry out one concrete amendment.",
      },
    ],
  },
  {
    slug: "eucharistic-adoration",
    title: "A Holy Hour of Adoration",
    category: "Eucharistic devotion",
    eyebrow: "Remain with Christ",
    summary:
      "A spacious pattern for adoration, thanksgiving, reparation, petition, and silence before the Blessed Sacrament.",
    duration: "30-60 minutes",
    provenance:
      "Original Sanctum Council formation guide; included prayers are found separately in the traditional library.",
    pastoralNote:
      "Eucharistic adoration properly means prayer before the Blessed Sacrament reserved in a tabernacle or exposed in a monstrance. Follow the parish's directions and adapt posture to your health.",
    steps: [
      {
        title: "1. Arrive and adore",
        instruction:
          "Enter quietly, genuflect if able, make the Sign of the Cross, and acknowledge Jesus Christ truly present. Let the first minutes be unhurried.",
      },
      {
        title: "2. Offer praise",
        instruction:
          "Adore God for who he is before asking for anything. Pray the Glory Be, Anima Christi, or simple words of worship.",
      },
      {
        title: "3. Give thanks",
        instruction:
          "Thank Christ for the Eucharist, the Cross, the Church, particular people, and graces from the last day. Name gifts concretely.",
      },
      {
        title: "4. Listen to the Gospel",
        instruction:
          "Read a short Gospel scene slowly. Imagine yourself near Jesus and let his words lead you into prayer rather than analysis.",
        scripture: "John 6:35-40 or John 15:1-11",
      },
      {
        title: "5. Speak heart to heart",
        instruction:
          "Tell Christ what is true: sin, longing, fear, gratitude, confusion, and love. Ask forgiveness and make a simple act of reparation.",
      },
      {
        title: "6. Keep silence",
        instruction:
          "Remain still for a set span without measuring the prayer by feelings. When distracted, return with the name of Jesus or a brief phrase from Scripture.",
      },
      {
        title: "7. Intercede",
        instruction:
          "Pray for the Church, the Pope and bishops, priests and vocations, the suffering, the dead, your enemies, and the people entrusted to you.",
      },
      {
        title: "8. Offer yourself and depart",
        instruction:
          "Pray an Act of Spiritual Communion if you are not receiving sacramentally. Choose one act of charity, close with the Divine Praises, and leave reverently.",
      },
    ],
  },
  {
    slug: "stations-of-the-cross",
    title: "Stations of the Cross",
    category: "Passion devotion",
    eyebrow: "The traditional fourteen stations",
    summary:
      "Walk with Christ from condemnation to burial through Scripture, repentance, gratitude, and intercession.",
    duration: "30-45 minutes",
    provenance:
      "Original Sanctum Council meditations using the traditional station titles.",
    pastoralNote:
      "At each station, announce the title, read the anchor, behold Christ, ask for one grace, and optionally pray an Our Father, Hail Mary, and Glory Be. The three falls, the meeting with Mary, and Veronica are traditional devotional stations not narrated explicitly in the Gospels; their anchors are identified accordingly.",
    steps: [
      {
        title: "1. Jesus is condemned to death",
        instruction:
          "Behold the innocent Christ accepting an unjust sentence without abandoning truth or love. Repent of cowardly judgments and ask for courage to defend the innocent.",
        scripture: "Mark 15:1-15",
      },
      {
        title: "2. Jesus takes up his Cross",
        instruction:
          "See Jesus receive the instrument of suffering as the path of self-giving love. Place today's unavoidable burden beside his and ask to carry it without bitterness.",
        scripture: "John 19:16-17",
      },
      {
        title: "3. Jesus falls the first time",
        instruction:
          "The first fall is a traditional meditation. Contemplate Christ sharing human weakness and ask for humility to rise quickly after failure.",
        scripture: "Traditional station; Psalm 38:7-9",
      },
      {
        title: "4. Jesus meets his Mother",
        instruction:
          "This meeting is held in Christian memory though not separately narrated in the Passion. Stand with Mary in faithful sorrow and pray for families who suffer helplessly together.",
        scripture: "Traditional station; Luke 2:34-35",
      },
      {
        title: "5. Simon of Cyrene helps Jesus",
        instruction:
          "Notice how an imposed burden becomes service to Christ. Pray to recognize him in another person's need and to accept help when pride would refuse it.",
        scripture: "Mark 15:21",
      },
      {
        title: "6. Veronica wipes the face of Jesus",
        instruction:
          "Veronica belongs to the devotional tradition. Ask for a compassionate heart that moves toward suffering and seeks the face of Christ in those the world overlooks.",
        scripture: "Traditional station; Psalm 27:8-9",
      },
      {
        title: "7. Jesus falls the second time",
        instruction:
          "Remain with Christ under the repeated weight of the Cross. Bring him the habit or wound that keeps returning and ask for patient perseverance rather than despair.",
        scripture: "Traditional station; Isaiah 53:4-6",
      },
      {
        title: "8. Jesus meets the women of Jerusalem",
        instruction:
          "Hear Jesus turn compassion toward repentance and the suffering to come. Ask for sorrow that bears fruit in conversion and works of mercy.",
        scripture: "Luke 23:27-31",
      },
      {
        title: "9. Jesus falls the third time",
        instruction:
          "The third fall is a traditional meditation. Bring Christ what feels exhausted beyond recovery and ask for the grace to take the next faithful step.",
        scripture: "Traditional station; Psalm 37:23-24",
      },
      {
        title: "10. Jesus is stripped of his garments",
        instruction:
          "Contemplate Christ exposed and dispossessed. Repent of every violation of dignity and ask for freedom from the possessions or approval that possess you.",
        scripture: "John 19:23-24",
      },
      {
        title: "11. Jesus is nailed to the Cross",
        instruction:
          "Remain before the love that does not withdraw when escape is gone. Pray for victims of violence and for the conversion of those who inflict it.",
        scripture: "Luke 23:33-34",
      },
      {
        title: "12. Jesus dies on the Cross",
        instruction:
          "Keep a full moment of silence. Adore Christ who completes his self-offering, entrust the dying to him, and surrender what you cannot control.",
        scripture: "John 19:28-30",
      },
      {
        title: "13. Jesus is taken down from the Cross",
        instruction:
          "Receive the silent weight of Christ with Mary and Joseph of Arimathea. Pray for the bereaved and for tenderness toward every wounded body.",
        scripture: "Mark 15:42-46",
      },
      {
        title: "14. Jesus is laid in the tomb",
        instruction:
          "Enter the stillness of Holy Saturday without rushing past grief. Place every buried hope with Christ and wait for the Father in trust.",
        scripture: "John 19:38-42",
      },
    ],
  },
  {
    slug: "morning-evening-rule",
    title: "A Sustainable Morning & Evening Rule",
    category: "Daily rule",
    eyebrow: "Small, stable, and faithful",
    summary:
      "Bookend the day with Scripture, offering, examen, and rest without building a rule you cannot keep.",
    duration: "8-12 minutes morning and evening",
    provenance:
      "Original Sanctum Council formation guide; adapt it with a pastor or spiritual director.",
    pastoralNote:
      "Consistency matters more than intensity. Keep the ordinary rule modest for four weeks before adding anything; on hard days, use the minimum rule instead of quitting.",
    steps: [
      {
        title: "Morning — arrive",
        instruction:
          "Before messages or news, stand or sit at the same place, make the Sign of the Cross, and keep one minute of silence.",
      },
      {
        title: "Morning — offer",
        instruction:
          "Pray the Morning Offering. Name the people, work, suffering, and joy you expect today and place them within that offering.",
      },
      {
        title: "Morning — receive the Word",
        instruction:
          "Read one Gospel paragraph or a psalm for three to five minutes. Keep one phrase; do not turn this small rule into a study session.",
      },
      {
        title: "Morning — ask and resolve",
        instruction:
          "Intercede briefly for those entrusted to you, ask for the day's needed grace, and choose one concrete act of fidelity.",
      },
      {
        title: "Evening — return",
        instruction:
          "At a repeatable time, put the phone away, make the Sign of the Cross, and thank God for bringing you to the close of the day.",
      },
      {
        title: "Evening — review",
        instruction:
          "Use the short Examen: gratitude, light, review, sorrow, mercy, and one grace for tomorrow. Keep the review gentle and specific.",
      },
      {
        title: "Evening — entrust",
        instruction:
          "Pray an Act of Contrition when needed, commend the living and the dead to God, and close with the Canticle of Simeon.",
      },
      {
        title: "The minimum rule",
        instruction:
          "When sick, traveling, or overwhelmed: morning means the Sign of the Cross, Morning Offering, and one Gospel verse; evening means the Sign of the Cross, one gratitude, one honest sorrow, and an Our Father.",
      },
    ],
  },
];
