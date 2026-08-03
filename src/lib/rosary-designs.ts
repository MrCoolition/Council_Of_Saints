export type RosaryDesignId =
  | "immaculate-pearl"
  | "lourdes-blue"
  | "sacred-hearts"
  | "guadalupe-rose"
  | "saint-benedict"
  | "eucharistic-crystal"
  | "bethlehem-olivewood"
  | "fatima-starlight";

export type RosaryBeadShape =
  | "pearl"
  | "round"
  | "oval"
  | "faceted"
  | "stone"
  | "crystal"
  | "wood"
  | "moonstone";

export type RosaryOurFatherShape =
  | "diamond-cut"
  | "grotto-cut"
  | "heart-cut"
  | "rose-cut"
  | "medal"
  | "chalice-cut"
  | "carved-cross"
  | "star-cut";

export type RosaryTexture =
  | "nacre"
  | "water-glass"
  | "polished-hematite"
  | "rose-quartz"
  | "satin-onyx"
  | "luminous-crystal"
  | "olivewood-grain"
  | "moonstone-fire";

export type RosaryCenterpieceStyle =
  | "marian-star"
  | "lourdes-grotto"
  | "twin-hearts"
  | "guadalupe-mandorla"
  | "benedict-medal"
  | "eucharistic-host"
  | "bethlehem-nativity"
  | "fatima-crown";

export type RosaryCenterMark =
  | "M"
  | "AVE"
  | "SC"
  | "✦"
  | "PAX"
  | "IHS"
  | "BETH"
  | "13";

export type RosaryCrucifixStyle =
  | "lily-filigree"
  | "grotto-silver"
  | "sacred-heart"
  | "radiant-rose"
  | "benedict-bronze"
  | "eucharistic-gold"
  | "olivewood-pilgrim"
  | "crowned-light";

export type RosaryDesignPalette = Readonly<{
  stageLight: string;
  stageMid: string;
  stageDark: string;
  aura: string;
  chainShadow: string;
  chainLow: string;
  chainHigh: string;
  beadHighlight: string;
  beadMid: string;
  beadShadow: string;
  paterHighlight: string;
  paterMid: string;
  paterShadow: string;
  completedHighlight: string;
  completedMid: string;
  completedShadow: string;
  metal: string;
  metalBright: string;
  active: string;
  centerFill: string;
  centerText: string;
}>;

export type RosaryDesign = Readonly<{
  id: RosaryDesignId;
  name: string;
  dedication: string;
  materials: string;
  finish: string;
  beadShape: RosaryBeadShape;
  ourFatherShape: RosaryOurFatherShape;
  texture: RosaryTexture;
  centerpieceStyle: RosaryCenterpieceStyle;
  centerMark: RosaryCenterMark;
  crucifixStyle: RosaryCrucifixStyle;
  palette: RosaryDesignPalette;
}>;

export const DEFAULT_ROSARY_DESIGN_ID: RosaryDesignId = "immaculate-pearl";

export const ROSARY_DESIGNS = [
  {
    id: "immaculate-pearl",
    name: "Immaculate Pearl",
    dedication: "Clothed in grace",
    materials: "Mother-of-pearl · rhodium",
    finish: "Luminous silver",
    beadShape: "pearl",
    ourFatherShape: "diamond-cut",
    texture: "nacre",
    centerpieceStyle: "marian-star",
    centerMark: "M",
    crucifixStyle: "lily-filigree",
    palette: {
      stageLight: "#FFFDF6",
      stageMid: "#E7EEF0",
      stageDark: "#73858E",
      aura: "#E4F7FF",
      chainShadow: "#4B5960",
      chainLow: "#8B9AA0",
      chainHigh: "#F4FBFC",
      beadHighlight: "#FFFFFF",
      beadMid: "#E8E2D7",
      beadShadow: "#9BA8AC",
      paterHighlight: "#FFFFFF",
      paterMid: "#C9D6D9",
      paterShadow: "#65777F",
      completedHighlight: "#FFF9DC",
      completedMid: "#D8B95E",
      completedShadow: "#7B5A1C",
      metal: "#AEBCC1",
      metalBright: "#F7FFFF",
      active: "#F2C75C",
      centerFill: "#E8F1F2",
      centerText: "#324950",
    },
  },
  {
    id: "lourdes-blue",
    name: "Lourdes Blue",
    dedication: "At the grotto",
    materials: "Blue art glass · antique silver",
    finish: "Water-washed silver",
    beadShape: "round",
    ourFatherShape: "grotto-cut",
    texture: "water-glass",
    centerpieceStyle: "lourdes-grotto",
    centerMark: "AVE",
    crucifixStyle: "grotto-silver",
    palette: {
      stageLight: "#F4FCFF",
      stageMid: "#85BFD5",
      stageDark: "#123D5A",
      aura: "#7FE0FF",
      chainShadow: "#273D49",
      chainLow: "#718995",
      chainHigh: "#E5F7FF",
      beadHighlight: "#DDF9FF",
      beadMid: "#278DB9",
      beadShadow: "#10476E",
      paterHighlight: "#F1FDFF",
      paterMid: "#60BBD4",
      paterShadow: "#174A67",
      completedHighlight: "#FDF6D1",
      completedMid: "#D0AB49",
      completedShadow: "#72531A",
      metal: "#84959C",
      metalBright: "#EAF7FA",
      active: "#FFE18C",
      centerFill: "#236B8C",
      centerText: "#F6FDFF",
    },
  },
  {
    id: "sacred-hearts",
    name: "Sacred Hearts",
    dedication: "Love that burns",
    materials: "Hematite · ruby enamel · silver",
    finish: "Antique silver",
    beadShape: "oval",
    ourFatherShape: "heart-cut",
    texture: "polished-hematite",
    centerpieceStyle: "twin-hearts",
    centerMark: "SC",
    crucifixStyle: "sacred-heart",
    palette: {
      stageLight: "#EEE9E4",
      stageMid: "#635A5C",
      stageDark: "#180F12",
      aura: "#C32B3D",
      chainShadow: "#171214",
      chainLow: "#625C5E",
      chainHigh: "#D4CED0",
      beadHighlight: "#A49C9D",
      beadMid: "#3F3A3C",
      beadShadow: "#111012",
      paterHighlight: "#FF8991",
      paterMid: "#A6162B",
      paterShadow: "#460A14",
      completedHighlight: "#FFF0B4",
      completedMid: "#CE9F33",
      completedShadow: "#684615",
      metal: "#777173",
      metalBright: "#DDD7D8",
      active: "#F04455",
      centerFill: "#671322",
      centerText: "#FFF2E5",
    },
  },
  {
    id: "guadalupe-rose",
    name: "Guadalupe Rose",
    dedication: "Beneath her mantle",
    materials: "Rose quartz · rose gold",
    finish: "Warm rose gold",
    beadShape: "faceted",
    ourFatherShape: "rose-cut",
    texture: "rose-quartz",
    centerpieceStyle: "guadalupe-mandorla",
    centerMark: "✦",
    crucifixStyle: "radiant-rose",
    palette: {
      stageLight: "#FFF6F3",
      stageMid: "#E4A7A6",
      stageDark: "#63363D",
      aura: "#FFB6A8",
      chainShadow: "#6A3933",
      chainLow: "#AE6D62",
      chainHigh: "#FFD6C8",
      beadHighlight: "#FFF1EE",
      beadMid: "#D88D98",
      beadShadow: "#8A4858",
      paterHighlight: "#FFF5DE",
      paterMid: "#E0A56F",
      paterShadow: "#8F503D",
      completedHighlight: "#FFF2B7",
      completedMid: "#D8A13C",
      completedShadow: "#7B4F18",
      metal: "#B66E60",
      metalBright: "#FFD8CA",
      active: "#FFC84A",
      centerFill: "#C26C60",
      centerText: "#FFF9EC",
    },
  },
  {
    id: "saint-benedict",
    name: "Saint Benedict",
    dedication: "Peace through the Cross",
    materials: "Black onyx · aged bronze",
    finish: "Monastic bronze",
    beadShape: "stone",
    ourFatherShape: "medal",
    texture: "satin-onyx",
    centerpieceStyle: "benedict-medal",
    centerMark: "PAX",
    crucifixStyle: "benedict-bronze",
    palette: {
      stageLight: "#ECE5D4",
      stageMid: "#86755A",
      stageDark: "#211D18",
      aura: "#B88740",
      chainShadow: "#241A10",
      chainLow: "#725231",
      chainHigh: "#D2AE72",
      beadHighlight: "#6F6B64",
      beadMid: "#272725",
      beadShadow: "#090A09",
      paterHighlight: "#D5B071",
      paterMid: "#856032",
      paterShadow: "#392511",
      completedHighlight: "#F3D18A",
      completedMid: "#A66D24",
      completedShadow: "#4F2F0E",
      metal: "#8A6133",
      metalBright: "#DBB77A",
      active: "#E7B95D",
      centerFill: "#6F4A24",
      centerText: "#F7E7BF",
    },
  },
  {
    id: "eucharistic-crystal",
    name: "Eucharistic Crystal",
    dedication: "Remain in Him",
    materials: "White oval glass · gold",
    finish: "Satin altar gold",
    beadShape: "crystal",
    ourFatherShape: "chalice-cut",
    texture: "luminous-crystal",
    centerpieceStyle: "eucharistic-host",
    centerMark: "IHS",
    crucifixStyle: "eucharistic-gold",
    palette: {
      stageLight: "#FFFFF7",
      stageMid: "#E9DDAE",
      stageDark: "#6B5724",
      aura: "#FFE697",
      chainShadow: "#5F4515",
      chainLow: "#B78A31",
      chainHigh: "#FFF0A8",
      beadHighlight: "#FFFFFF",
      beadMid: "#F0EBD8",
      beadShadow: "#B9A871",
      paterHighlight: "#FFF9CB",
      paterMid: "#D6AE44",
      paterShadow: "#7D5918",
      completedHighlight: "#FFFFFF",
      completedMid: "#F0CD61",
      completedShadow: "#946A18",
      metal: "#C0902F",
      metalBright: "#FFE991",
      active: "#FFF0A3",
      centerFill: "#F5E8B7",
      centerText: "#674B13",
    },
  },
  {
    id: "bethlehem-olivewood",
    name: "Bethlehem Olivewood",
    dedication: "Near the Holy Family",
    materials: "Olivewood · hand-aged bronze",
    finish: "Pilgrim bronze",
    beadShape: "wood",
    ourFatherShape: "carved-cross",
    texture: "olivewood-grain",
    centerpieceStyle: "bethlehem-nativity",
    centerMark: "BETH",
    crucifixStyle: "olivewood-pilgrim",
    palette: {
      stageLight: "#F5E8CA",
      stageMid: "#9A6C37",
      stageDark: "#352315",
      aura: "#D6A65C",
      chainShadow: "#322015",
      chainLow: "#6B472A",
      chainHigh: "#C89355",
      beadHighlight: "#D7AF76",
      beadMid: "#9A6737",
      beadShadow: "#51311B",
      paterHighlight: "#E1BE82",
      paterMid: "#80512B",
      paterShadow: "#3C2515",
      completedHighlight: "#F0D292",
      completedMid: "#B27A30",
      completedShadow: "#5B3714",
      metal: "#80552F",
      metalBright: "#C7965A",
      active: "#E9BB69",
      centerFill: "#805029",
      centerText: "#F4DEB3",
    },
  },
  {
    id: "fatima-starlight",
    name: "Fatima Starlight",
    dedication: "A crown of light",
    materials: "Moonstone · crystal · gold",
    finish: "Celestial gold",
    beadShape: "moonstone",
    ourFatherShape: "star-cut",
    texture: "moonstone-fire",
    centerpieceStyle: "fatima-crown",
    centerMark: "13",
    crucifixStyle: "crowned-light",
    palette: {
      stageLight: "#F7F6FF",
      stageMid: "#9A9AC8",
      stageDark: "#22244D",
      aura: "#B9C5FF",
      chainShadow: "#40351D",
      chainLow: "#A17F32",
      chainHigh: "#FFE98E",
      beadHighlight: "#FFFFFF",
      beadMid: "#C5C8E7",
      beadShadow: "#666B9B",
      paterHighlight: "#FFF9CB",
      paterMid: "#DDBB4F",
      paterShadow: "#80601D",
      completedHighlight: "#FDF3FF",
      completedMid: "#BBA8DB",
      completedShadow: "#5B4E82",
      metal: "#BF9637",
      metalBright: "#FFE58A",
      active: "#FFF2A8",
      centerFill: "#6669A5",
      centerText: "#FFFBEF",
    },
  },
] as const satisfies readonly RosaryDesign[];

export function isRosaryDesignId(value: unknown): value is RosaryDesignId {
  return (
    typeof value === "string" &&
    ROSARY_DESIGNS.some((design) => design.id === value)
  );
}

export function getRosaryDesign(
  id: string | null | undefined,
): RosaryDesign {
  if (isRosaryDesignId(id)) {
    return (
      ROSARY_DESIGNS.find((design) => design.id === id) ??
      ROSARY_DESIGNS[0]
    );
  }

  return ROSARY_DESIGNS[0];
}
