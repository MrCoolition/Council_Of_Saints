import type { CouncilSessionType, UserSignal } from "@/lib/domain";

export type CouncilPrompt = {
  saintId: string;
  saintName: string;
  sessionType: CouncilSessionType;
  message: string;
  actionItem: string;
  virtueFocus: string;
  sacrifice: string;
  generatedBy: "curated_template";
};

const prompts: Record<string, Omit<CouncilPrompt, "sessionType">> = {
  st_benedict: {
    saintId: "st_benedict",
    saintName: "St. Benedict",
    message:
      "Begin again with stability. Do not negotiate with the hour; give God the first faithful act that is in front of you.",
    actionItem: "Mark Morning Prayer and Night Prayer today.",
    virtueFocus: "Stability",
    sacrifice: "Leave one needless comfort untouched.",
    generatedBy: "curated_template",
  },
  st_ignatius_loyola: {
    saintId: "st_ignatius_loyola",
    saintName: "St. Ignatius of Loyola",
    message:
      "Name the movement of the day plainly. Consolation and desolation are not verdicts; they are material for discernment.",
    actionItem: "Record one grace and one attachment in encrypted form.",
    virtueFocus: "Discernment",
    sacrifice: "Pause before the next impulse to explain yourself.",
    generatedBy: "curated_template",
  },
  st_thomas_aquinas: {
    saintId: "st_thomas_aquinas",
    saintName: "St. Thomas Aquinas",
    message:
      "Order your mind toward truth with humility. A small, faithful study period is better than a grand plan left untouched.",
    actionItem: "Complete one focused study block before entertainment.",
    virtueFocus: "Studiousness",
    sacrifice: "Close one distracting tab.",
    generatedBy: "curated_template",
  },
  st_john_vianney: {
    saintId: "st_john_vianney",
    saintName: "St. John Vianney",
    message:
      "Let contrition be honest and simple. Bring sin into the light without dramatizing it or hiding from mercy.",
    actionItem: "Prepare a concise list for confession outside this app.",
    virtueFocus: "Contrition",
    sacrifice: "Make one act of reparation quietly.",
    generatedBy: "curated_template",
  },
  st_francis_de_sales: {
    saintId: "st_francis_de_sales",
    saintName: "St. Francis de Sales",
    message:
      "Do not measure the whole road at once. Return to God by the next gentle, faithful act.",
    actionItem: "Complete one small duty without self-reproach.",
    virtueFocus: "Gentleness",
    sacrifice: "Do one hidden kindness.",
    generatedBy: "curated_template",
  },
  st_joseph: {
    saintId: "st_joseph",
    saintName: "St. Joseph",
    message:
      "Guard the interior house quietly. Strength grows where attention is kept pure and work is offered.",
    actionItem: "Choose one concrete boundary before the vulnerable hour.",
    virtueFocus: "Chastity",
    sacrifice: "Put the phone away for one work block.",
    generatedBy: "curated_template",
  },
  blessed_virgin_mary: {
    saintId: "blessed_virgin_mary",
    saintName: "Blessed Virgin Mary",
    message:
      "Make the next fiat small and real. Surrender is not fog; it is obedience to the grace already given.",
    actionItem: "Pray one quiet act of surrender before the next task.",
    virtueFocus: "Humility",
    sacrifice: "Accept one interruption without complaint.",
    generatedBy: "curated_template",
  },
};

export function selectSaint(signal: UserSignal): string {
  switch (signal) {
    case "missed_prayer":
      return "st_benedict";
    case "confused_vocation":
      return "st_ignatius_loyola";
    case "needs_study":
      return "st_thomas_aquinas";
    case "preparing_confession":
      return "st_john_vianney";
    case "discouraged":
      return "st_francis_de_sales";
    case "needs_chastity":
      return "st_joseph";
    case "needs_surrender":
      return "blessed_virgin_mary";
    default:
      return "st_benedict";
  }
}

export function getCouncilPrompt(
  sessionType: CouncilSessionType = "morning",
  signal: UserSignal = "missed_prayer",
): CouncilPrompt {
  const saintId = selectSaint(signal);
  return {
    ...prompts[saintId],
    sessionType,
  };
}
