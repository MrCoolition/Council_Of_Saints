import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Sanctum Council",
    short_name: "Sanctum",
    description:
      "A digital oratory for the Liturgy of the Hours, Scripture, and prayer.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f3efe5",
    theme_color: "#003b32",
    orientation: "any",
    categories: ["lifestyle"],
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
        purpose: "any",
      },
    ],
    shortcuts: [
      {
        name: "Office of Readings",
        short_name: "Readings",
        description: "Open the Office of Readings.",
        url: "/#office-office_readings",
      },
      {
        name: "Morning Prayer",
        short_name: "Lauds",
        description: "Open Morning Prayer.",
        url: "/#office-morning_prayer",
      },
      {
        name: "Midmorning Prayer",
        short_name: "Terce",
        description: "Open Midmorning Prayer.",
        url: "/#office-midmorning_prayer",
      },
      {
        name: "Midday Prayer",
        short_name: "Sext",
        description: "Open Midday Prayer.",
        url: "/#office-midday_prayer",
      },
      {
        name: "Midafternoon Prayer",
        short_name: "None",
        description: "Open Midafternoon Prayer.",
        url: "/#office-midafternoon_prayer",
      },
      {
        name: "Evening Prayer",
        short_name: "Vespers",
        description: "Open Evening Prayer.",
        url: "/#office-evening_prayer",
      },
      {
        name: "Night Prayer",
        short_name: "Compline",
        description: "Open Night Prayer.",
        url: "/#office-night_prayer",
      },
    ],
  };
}
