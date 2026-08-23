import {
  renderKindleMassCacheManifest,
  type KindleMassExplicitForm,
} from "@/lib/kindle-mass-html";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET(request: Request): Response {
  const url = new URL(request.url);
  const date = parseDate(url.searchParams.get("date"));
  const form = parseForm(url.searchParams.get("form"));

  if (!date || !form) {
    return new Response("CACHE MANIFEST\n# Invalid Sanctum Mass cache key\nNETWORK:\n*\n", {
      status: 400,
      headers: manifestHeaders,
    });
  }

  return new Response(renderKindleMassCacheManifest(date, form), {
    status: 200,
    headers: manifestHeaders,
  });
}

const manifestHeaders = {
  "Cache-Control": "no-cache, no-store, must-revalidate",
  "Content-Type": "text/cache-manifest; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
};

function parseDate(value: string | null): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/u.test(value)) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);
  const candidate = new Date(Date.UTC(year, month - 1, day));
  return candidate.toISOString().slice(0, 10) === value ? value : null;
}

function parseForm(value: string | null): KindleMassExplicitForm | null {
  return value === "daytime" || value === "anticipated" ? value : null;
}
