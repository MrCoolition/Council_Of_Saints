import type { Metadata } from "next";
import { HolyMassCompanion } from "@/components/holy-mass-companion";
import { getHolyMassPageData } from "@/server/holy-mass";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Holy Mass",
  description: "The Order of Mass, today's readings, responses, and postures.",
};

type HolyMassPageProps = {
  searchParams: Promise<{ form?: string | string[] }>;
};

export default async function HolyMassPage({
  searchParams,
}: HolyMassPageProps) {
  const params = await searchParams;
  const rawForm = Array.isArray(params.form) ? params.form[0] : params.form;
  const saturdayOverride =
    rawForm === "daytime" || rawForm === "anticipated" ? rawForm : "auto";
  const data = await getHolyMassPageData();
  return (
    <HolyMassCompanion
      data={data}
      saturdayOverride={saturdayOverride}
    />
  );
}
