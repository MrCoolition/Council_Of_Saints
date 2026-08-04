import "server-only";

type ModerationDecision = "allow" | "crisis" | "block";

type ModerationResult = {
  decision: ModerationDecision;
};

export async function moderateFatherMessage(
  text: string,
): Promise<ModerationResult> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    return { decision: "allow" };
  }

  try {
    const response = await fetch("https://api.openai.com/v1/moderations", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "omni-moderation-latest",
        input: text,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      return { decision: "allow" };
    }

    const payload: unknown = await response.json();
    const result = getFirstModerationResult(payload);

    if (!result) {
      return { decision: "allow" };
    }

    if (
      result.categories["self-harm/intent"] ||
      result.categories["self-harm/instructions"]
    ) {
      return { decision: "crisis" };
    }

    if (
      result.categories["sexual/minors"] ||
      result.categories["illicit/violent"]
    ) {
      return { decision: "block" };
    }

    return { decision: "allow" };
  } catch {
    return { decision: "allow" };
  }
}

function getFirstModerationResult(value: unknown) {
  if (!isRecord(value) || !Array.isArray(value.results)) {
    return null;
  }

  const result = value.results[0];

  if (!isRecord(result) || !isRecord(result.categories)) {
    return null;
  }

  return {
    categories: result.categories as Record<string, boolean>,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
