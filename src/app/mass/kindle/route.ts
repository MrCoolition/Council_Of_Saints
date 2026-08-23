import {
  getKindleMassResponseHeaders,
  renderKindleMassHtml,
  renderKindleMassUnavailable,
  type KindleMassForm,
} from "@/lib/kindle-mass-html";
import { getHolyMassPageData } from "@/server/holy-mass";
import { getTodayPayload } from "@/server/today";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const form = parseForm(url.searchParams.get("form"));
  const offlineDate = parseDate(url.searchParams.get("offline"));

  try {
    const today = await getTodayPayload(request);
    const data = await getHolyMassPageData(today);
    const prepared =
      form !== "auto" && offlineDate !== null && offlineDate === data.civilDate;
    const html = renderKindleMassHtml(data, {
      basePath: "/mass/kindle",
      form,
      preparedDate: prepared ? offlineDate : undefined,
    });

    return new Response(html, {
      status: 200,
      headers: getKindleMassResponseHeaders({ prepared }),
    });
  } catch {
    return new Response(renderKindleMassUnavailable(), {
      status: 503,
      headers: getKindleMassResponseHeaders({ prepared: false }),
    });
  }
}

function parseDate(value: string | null): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/u.test(value)) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);
  const candidate = new Date(Date.UTC(year, month - 1, day));
  return candidate.toISOString().slice(0, 10) === value ? value : null;
}

function parseForm(value: string | null): KindleMassForm {
  return value === "daytime" || value === "anticipated" ? value : "auto";
}
