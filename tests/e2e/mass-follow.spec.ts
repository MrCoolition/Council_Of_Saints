import { expect, test, type Page } from "@playwright/test";

const FIXTURE_PATH = "/mass?fixture=speech-follow";
const REVEAL_TARGET_ID =
  "mass-follow-introductory-greeting-2-variant-form-a-line-0-chunk-0";
const REVEAL_TARGET_PHRASE =
  "The grace of our Lord Jesus Christ, and the love of God,";
const FLOW_START_TARGET_ID =
  "mass-follow-introductory-sign-of-the-cross-1-base-line-1-chunk-0";
const NEXT_TARGET_ID =
  "mass-follow-introductory-sign-of-the-cross-1-base-line-2-chunk-0";
const OUR_FATHER_TARGET_ID =
  "mass-follow-eucharist-our-father-11-base-line-1-chunk-0";

type RecognitionSnapshot = {
  aborts: number;
  config: {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    maxAlternatives: number;
    processLocally: boolean;
  };
  contextPhrases: Array<{
    boost: number;
    phrase: string;
  }>;
  resultEvents: Array<{
    alternativeCount: number;
    final: boolean;
    resultIndex: number;
    resultsLength: number;
  }>;
  starts: number;
  stops: number;
};

type SpeechHarnessSnapshot = {
  aliasesMatch: boolean;
  availabilityCalls: Array<{
    langs: string[];
    processLocally: boolean;
  }>;
  hasInstall: boolean;
  latest: RecognitionSnapshot | null;
  recognitions: RecognitionSnapshot[];
  wakeLock: {
    releases: number;
    requestTypes: string[];
    requests: number;
  };
};

type SpeechHarnessApi = {
  emitFinal: (alternatives: string[]) => void;
  emitInterim: (alternatives: string[]) => void;
  stats: () => SpeechHarnessSnapshot;
};

declare global {
  interface Window {
    __massSpeechTest: SpeechHarnessApi;
  }
}

test.use({ viewport: { height: 900, width: 1280 } });

test("requires consent, configures recognition, and acquires a hidden target from alternative two", async ({
  page,
}) => {
  await openFixture(page);

  await page.getByRole("button", { name: "Follow Mass" }).click();
  const disclosure = page.getByRole("dialog", {
    name: "Let the Mass follow along?",
  });
  await expect(disclosure).toBeVisible();
  expect((await speechStats(page)).recognitions).toHaveLength(0);

  await disclosure.getByRole("button", { name: "Allow microphone" }).click();
  await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();
  await expect.poll(async () => (await speechStats(page)).latest?.starts).toBe(1);

  const configured = await speechStats(page);
  expect(configured.aliasesMatch).toBe(true);
  expect(configured.hasInstall).toBe(false);
  expect(configured.latest?.config).toEqual({
    continuous: true,
    interimResults: true,
    lang: "en-US",
    maxAlternatives: 3,
    processLocally: false,
  });
  expect(configured.availabilityCalls).toEqual([
    { langs: ["en-US"], processLocally: true },
  ]);

  const target = page.locator("#" + REVEAL_TARGET_ID);
  await expect(target).toHaveCount(0);

  await emitInterim(page, ["music applause uh background noise"]);
  await expect(
    page.locator('[data-mass-follow-target][aria-current="true"]'),
  ).toHaveCount(0);

  await emitFinal(page, [
    "singing applause background chatter",
    makeNoisyTranscript(REVEAL_TARGET_PHRASE),
  ]);

  await expect(target).toHaveAttribute("aria-current", "true");
  await expect(target).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Liturgical Greeting/u }),
  ).toHaveAttribute("aria-expanded", "true");
  await expect(
    page.getByRole("radio", { exact: true, name: "Greeting I" }),
  ).toBeChecked();
  const contextPhrases = (await speechStats(page)).latest?.contextPhrases;
  expect(contextPhrases?.length ?? 0).toBeGreaterThan(0);
  expect(
    contextPhrases?.every(
      ({ boost, phrase }) =>
        boost > 0 &&
        boost <= 2 &&
        phrase.trim().split(/\s+/u).length >= 4,
    ),
  ).toBe(true);

  const resultEvents = (await speechStats(page)).latest?.resultEvents;
  expect(resultEvents).toEqual([
    {
      alternativeCount: 1,
      final: false,
      resultIndex: 0,
      resultsLength: 1,
    },
    {
      alternativeCount: 2,
      final: true,
      resultIndex: 0,
      resultsLength: 1,
    },
  ]);
});

test("moves only forward and settles the next target inside the comfort band", async ({
  page,
}) => {
  await page.setViewportSize({ height: 844, width: 390 });
  await openFixture(page);
  await allowFollowing(page);

  const firstTarget = page.locator("#" + FLOW_START_TARGET_ID);
  const nextTarget = page.locator("#" + NEXT_TARGET_ID);
  const firstText = await readTargetText(firstTarget);
  const nextText = await readTargetText(nextTarget);

  await emitFinal(page, [firstText]);
  await expect(firstTarget).toHaveAttribute("aria-current", "true");
  await expect(firstTarget).toBeVisible();

  const metrics = await page.evaluate(
    async ({ targetId, transcript }) => {
      const target = document.getElementById(targetId);
      if (!target) {
        throw new Error("Missing follow target: " + targetId);
      }

      target.style.display = "block";
      target.style.marginTop = "115vh";
      const initialTopRatio =
        target.getBoundingClientRect().top / window.innerHeight;
      const startedAt = performance.now();

      return new Promise<{
        activeLatencyMs: number | null;
        initialTopRatio: number;
        settledLatencyMs: number | null;
        settledTopRatio: number | null;
      }>((resolve) => {
        let activeAt: number | null = null;

        const sample = () => {
          const now = performance.now();
          const rect = target.getBoundingClientRect();
          if (
            target.getAttribute("aria-current") === "true" &&
            activeAt === null
          ) {
            activeAt = now;
          }

          if (
            activeAt !== null &&
            rect.top >= window.innerHeight * 0.3 &&
            rect.bottom <= window.innerHeight * 0.48
          ) {
            resolve({
              activeLatencyMs: activeAt - startedAt,
              initialTopRatio,
              settledLatencyMs: now - startedAt,
              settledTopRatio: rect.top / window.innerHeight,
            });
            return;
          }

          if (now - startedAt >= 1_500) {
            resolve({
              activeLatencyMs:
                activeAt === null ? null : activeAt - startedAt,
              initialTopRatio,
              settledLatencyMs: null,
              settledTopRatio: null,
            });
            return;
          }

          window.requestAnimationFrame(sample);
        };

        window.__massSpeechTest.emitFinal([transcript]);
        window.requestAnimationFrame(sample);
      });
    },
    { targetId: NEXT_TARGET_ID, transcript: nextText },
  );

  expect(metrics.initialTopRatio).toBeGreaterThan(0.48);
  expect(metrics.activeLatencyMs).not.toBeNull();
  expect(metrics.activeLatencyMs ?? Number.POSITIVE_INFINITY).toBeLessThan(300);
  expect(metrics.settledLatencyMs).not.toBeNull();
  expect(metrics.settledLatencyMs ?? Number.POSITIVE_INFINITY).toBeLessThan(800);
  expect(metrics.settledTopRatio ?? 0).toBeGreaterThanOrEqual(0.3);
  expect(metrics.settledTopRatio ?? 1).toBeLessThanOrEqual(0.48);
  await expect(nextTarget).toHaveAttribute("aria-current", "true");
  const followControlGap = await page.evaluate((targetId) => {
    const activeTarget = document.getElementById(targetId);
    const followControl = document.querySelector<HTMLElement>(
      "[data-mass-follow-control] > div",
    );
    if (!activeTarget || !followControl) {
      throw new Error("Missing active target or follow control");
    }
    return (
      followControl.getBoundingClientRect().top -
      activeTarget.getBoundingClientRect().bottom
    );
  }, NEXT_TARGET_ID);
  expect(followControlGap).toBeGreaterThanOrEqual(0);

  await emitFinal(page, [firstText]);
  await page.waitForTimeout(200);
  await expect(nextTarget).toHaveAttribute("aria-current", "true");
  await expect(firstTarget).not.toHaveAttribute("aria-current", "true");
});

test("manual wheel navigation pauses and resume reacquires the wake lock", async ({
  page,
}) => {
  await openFixture(page);
  await allowFollowing(page);
  await expect(page.getByText("Awake", { exact: true })).toBeVisible();
  await expect
    .poll(async () => (await speechStats(page)).wakeLock)
    .toEqual({ releases: 0, requestTypes: ["screen"], requests: 1 });

  await page.mouse.move(200, 200);
  await page.mouse.wheel(0, 180);

  await expect(
    page.getByRole("button", { name: "Resume Following" }),
  ).toBeVisible();
  await expect(
    page.getByText("Following paused after manual navigation.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect
    .poll(async () => (await speechStats(page)).wakeLock.releases)
    .toBe(1);

  const paused = await speechStats(page);
  expect(paused.recognitions).toHaveLength(1);
  expect(paused.recognitions[0]?.aborts).toBe(1);

  await page.getByRole("button", { name: "Resume Following" }).click();
  await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();
  await expect(page.getByText("Awake", { exact: true })).toBeVisible();
  await expect
    .poll(async () => (await speechStats(page)).wakeLock)
    .toEqual({
      releases: 1,
      requestTypes: ["screen", "screen"],
      requests: 2,
    });

  const resumed = await speechStats(page);
  expect(resumed.recognitions).toHaveLength(2);
  expect(resumed.latest?.starts).toBe(1);
});

test("globally reacquires the distant Our Father only after eight seconds", async ({
  page,
}) => {
  const baseTime = new Date("2026-08-30T14:00:00.000Z");
  await installSpeechHarness(page);
  await page.clock.setFixedTime(baseTime);
  await page.goto(FIXTURE_PATH);
  await allowFollowing(page);

  const firstTarget = page.locator("#" + FLOW_START_TARGET_ID);
  const ourFatherTarget = page.locator("#" + OUR_FATHER_TARGET_ID);
  const firstText = await readTargetText(firstTarget);
  const ourFatherText = await readTargetText(ourFatherTarget);

  await emitFinal(page, [firstText]);
  await expect(firstTarget).toHaveAttribute("aria-current", "true");

  await emitFinal(page, [ourFatherText]);
  await page.waitForTimeout(100);
  await expect(ourFatherTarget).not.toHaveAttribute("aria-current", "true");
  await expect(firstTarget).toHaveAttribute("aria-current", "true");

  await page.clock.setFixedTime(new Date(baseTime.getTime() + 8_001));
  await emitFinal(page, [ourFatherText]);
  await emitFinal(page, [ourFatherText]);

  await expect(ourFatherTarget).toHaveAttribute("aria-current", "true");
  await expect(ourFatherTarget).toBeVisible();
  await expect(firstTarget).not.toHaveAttribute("aria-current", "true");
});

test("replays the benchmark Mass from homily holds through the final response", async ({
  page,
}) => {
  let clockTime = new Date("2026-08-30T14:00:00.000Z").getTime();
  await installSpeechHarness(page);
  await page.clock.setFixedTime(clockTime);
  await page.goto(FIXTURE_PATH);
  await allowFollowing(page);

  const signOfCross =
    "In the name of the Father, and of the Son, and of the Holy Spirit.";
  const creed =
    "I believe in one God, the Father almighty, maker of heaven and earth, of all things visible and invisible.";
  const orateFratres =
    "Pray, brethren, that my sacrifice and yours may be acceptable to God, the almighty Father.";
  const doxology =
    "almighty Father, in the unity of the Holy Spirit, all";
  const ourFather = await readTargetText(
    page.locator("#" + OUR_FATHER_TARGET_ID),
  );
  const communionInvitation =
    "Behold the Lamb of God, behold him who takes away the sins of the world";
  const blessing =
    "May almighty God bless you, the Father, and the Son, and the Holy Spirit.";
  const dismissal = "Go forth, the Mass is ended.";

  await emitFinal(page, [signOfCross]);
  const signTargetId = await expectActivePhrase(page, "In the name");

  for (const hold of [
    "if we allow Christ to renew our minds and guide our hearts",
    "following him is not a burden rather it leads to deepest joy",
    "[music] holy [singing] applause",
  ]) {
    await emitFinal(page, [hold]);
  }
  expect(await getActiveTargetId(page)).toBe(signTargetId);

  clockTime += 9_001;
  await page.clock.setFixedTime(clockTime);
  await emitFinal(page, [creed]);
  await page.waitForTimeout(100);
  expect(await getActiveTargetId(page)).toBe(signTargetId);

  clockTime += 6_001;
  await page.clock.setFixedTime(clockTime);
  await emitFinal(page, [creed]);
  await emitFinal(page, [creed]);
  const creedTargetId = await expectActivePhrase(
    page,
    "visible and invisible",
  );

  const acceptedTargetIds = [signTargetId, creedTargetId];
  const confirmAfterKnownGap = async (
    transcript: string,
    expectedPhrase: string,
  ) => {
    clockTime += 9_001;
    await page.clock.setFixedTime(clockTime);
    await emitFinal(page, [transcript]);
    await emitFinal(page, [transcript]);
    acceptedTargetIds.push(await expectActivePhrase(page, expectedPhrase));
  };

  await confirmAfterKnownGap(orateFratres, "Pray, brethren");
  const beforeMusic = await getActiveTargetId(page);
  await emitFinal(page, ["[music] holy holy [singing] applause"]);
  expect(await getActiveTargetId(page)).toBe(beforeMusic);

  await confirmAfterKnownGap(doxology, "almighty Father");
  await confirmAfterKnownGap(ourFather, "Our Father");
  await confirmAfterKnownGap(
    communionInvitation,
    "away the sins of the world",
  );

  const beforeAnnouncements = await getActiveTargetId(page);
  await emitFinal(page, [
    "after Mass the parish gathering begins beside the school entrance",
  ]);
  expect(await getActiveTargetId(page)).toBe(beforeAnnouncements);

  await confirmAfterKnownGap(blessing, "May almighty God bless you");
  await emitFinal(page, [dismissal]);
  await emitFinal(page, [dismissal]);
  acceptedTargetIds.push(await expectActivePhrase(page, "Go forth"));
  await emitFinal(page, ["Thanks be to God."]);
  acceptedTargetIds.push(await expectActivePhrase(page, "Thanks be to God"));

  expect(new Set(acceptedTargetIds).size).toBe(acceptedTargetIds.length);
  const finalTargetId = await getActiveTargetId(page);
  await emitFinal(page, [creed]);
  await emitFinal(page, ["[music] applause recessional singing"]);
  await page.waitForTimeout(100);
  expect(await getActiveTargetId(page)).toBe(finalTargetId);
});

async function openFixture(page: Page) {
  await installSpeechHarness(page);
  await page.goto(FIXTURE_PATH);
  await expect(
    page.getByRole("button", { name: "Follow Mass" }),
  ).toBeVisible();
}

async function allowFollowing(page: Page) {
  await page.getByRole("button", { name: "Follow Mass" }).click();
  await page
    .getByRole("dialog", { name: "Let the Mass follow along?" })
    .getByRole("button", { name: "Allow microphone" })
    .click();
  await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();
  await expect.poll(async () => (await speechStats(page)).latest?.starts).toBe(1);
}

async function readTargetText(target: ReturnType<Page["locator"]>) {
  await expect(target).toHaveCount(1);
  const text = (await target.textContent())?.replace(/\s+/gu, " ").trim();
  if (!text) {
    throw new Error("Mass follow target has no spoken text");
  }
  return text;
}

async function getActiveTargetId(page: Page) {
  const activeTarget = page.locator(
    '[data-mass-follow-target][aria-current="true"]',
  );
  await expect(activeTarget).toHaveCount(1);
  const targetId = await activeTarget.getAttribute("data-mass-follow-target");
  if (!targetId) {
    throw new Error("The active Mass follow target has no stable ID");
  }
  return targetId;
}

async function expectActivePhrase(page: Page, phrase: string) {
  const activeTarget = page.locator(
    '[data-mass-follow-target][aria-current="true"]',
  );
  await expect(activeTarget).toHaveCount(1);
  await expect(activeTarget).toContainText(phrase);
  return getActiveTargetId(page);
}

function makeNoisyTranscript(text: string) {
  const normalized = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}'’\s]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
  return "um " + normalized + " applause";
}

async function emitFinal(page: Page, alternatives: string[]) {
  await page.evaluate(
    (nextAlternatives) =>
      window.__massSpeechTest.emitFinal(nextAlternatives),
    alternatives,
  );
}

async function emitInterim(page: Page, alternatives: string[]) {
  await page.evaluate(
    (nextAlternatives) =>
      window.__massSpeechTest.emitInterim(nextAlternatives),
    alternatives,
  );
}

async function speechStats(page: Page) {
  return page.evaluate(() => window.__massSpeechTest.stats());
}

async function installSpeechHarness(page: Page) {
  await page.addInitScript(() => {
    type ResultAlternative = {
      confidence: number;
      transcript: string;
    };
    type MockResult = ResultAlternative[] & { isFinal: boolean };
    type ResultEvent = Event & {
      resultIndex: number;
      results: MockResult[];
    };

    const recognitions: MockSpeechRecognition[] = [];
    const availabilityCalls: Array<{
      langs: string[];
      processLocally: boolean;
    }> = [];
    const requestTypes: string[] = [];
    let wakeLockRequests = 0;
    let wakeLockReleases = 0;

    function createResult(
      alternatives: string[],
      final: boolean,
    ): MockResult {
      const result = alternatives.map((transcript, index) => ({
        confidence: Math.max(0.1, 0.95 - index * 0.1),
        transcript,
      })) as MockResult;
      result.isFinal = final;
      return result;
    }

    class MockSpeechRecognition {
      static async available(options: {
        langs: string[];
        processLocally: boolean;
      }) {
        availabilityCalls.push({
          langs: [...options.langs],
          processLocally: options.processLocally,
        });
        return "unavailable" as const;
      }

      abortCalls = 0;
      continuous = false;
      interimResults = false;
      lang = "";
      maxAlternatives = 1;
      onend: ((event: Event) => void) | null = null;
      onerror: ((event: Event & { error: string }) => void) | null = null;
      onresult: ((event: ResultEvent) => void) | null = null;
      onstart: ((event: Event) => void) | null = null;
      processLocally = false;
      phrases: MockSpeechRecognitionPhrase[] = [];
      resultEvents: RecognitionSnapshot["resultEvents"] = [];
      results: MockResult[] = [];
      startCalls = 0;
      started = false;
      stopCalls = 0;

      constructor() {
        recognitions.push(this);
      }

      abort() {
        this.abortCalls += 1;
        this.started = false;
      }

      start() {
        this.startCalls += 1;
        this.started = true;
        queueMicrotask(() => {
          if (this.started) {
            this.onstart?.(new Event("start"));
          }
        });
      }

      stop() {
        this.stopCalls += 1;
        this.started = false;
        queueMicrotask(() => this.onend?.(new Event("end")));
      }

      emit(alternatives: string[], final: boolean) {
        const result = createResult(alternatives, final);
        const lastIndex = this.results.length - 1;
        const replacesInterim =
          lastIndex >= 0 && this.results[lastIndex]?.isFinal === false;
        const resultIndex = replacesInterim
          ? lastIndex
          : this.results.length;
        if (replacesInterim) {
          this.results[resultIndex] = result;
        } else {
          this.results.push(result);
        }
        this.resultEvents.push({
          alternativeCount: alternatives.length,
          final,
          resultIndex,
          resultsLength: this.results.length,
        });
        this.onresult?.(
          Object.assign(new Event("result"), {
            resultIndex,
            results: this.results,
          }) as ResultEvent,
        );
      }
    }

    class MockSpeechRecognitionPhrase {
      constructor(
        readonly phrase: string,
        readonly boost = 1,
      ) {}
    }

    class MockWakeLockSentinel extends EventTarget {
      released = false;

      async release() {
        if (this.released) {
          return;
        }
        this.released = true;
        wakeLockReleases += 1;
        this.dispatchEvent(new Event("release"));
      }
    }

    const recognitionConstructor = MockSpeechRecognition as unknown as {
      new (): MockSpeechRecognition;
      available: typeof MockSpeechRecognition.available;
    };
    const speechWindow = window as typeof window & {
      SpeechRecognition: typeof recognitionConstructor;
      SpeechRecognitionPhrase: typeof MockSpeechRecognitionPhrase;
      webkitSpeechRecognition: typeof recognitionConstructor;
    };
    speechWindow.SpeechRecognition = recognitionConstructor;
    speechWindow.SpeechRecognitionPhrase = MockSpeechRecognitionPhrase;
    speechWindow.webkitSpeechRecognition = recognitionConstructor;

    Object.defineProperty(navigator, "wakeLock", {
      configurable: true,
      value: {
        async request(type: string) {
          wakeLockRequests += 1;
          requestTypes.push(type);
          return new MockWakeLockSentinel();
        },
      },
    });

    function snapshotRecognition(
      recognition: MockSpeechRecognition,
    ): RecognitionSnapshot {
      return {
        aborts: recognition.abortCalls,
        config: {
          continuous: recognition.continuous,
          interimResults: recognition.interimResults,
          lang: recognition.lang,
          maxAlternatives: recognition.maxAlternatives,
          processLocally: recognition.processLocally,
        },
        contextPhrases: recognition.phrases.map(({ boost, phrase }) => ({
          boost,
          phrase,
        })),
        resultEvents: recognition.resultEvents.map((event) => ({
          ...event,
        })),
        starts: recognition.startCalls,
        stops: recognition.stopCalls,
      };
    }

    window.__massSpeechTest = {
      emitFinal(alternatives) {
        const recognition = recognitions.at(-1);
        if (!recognition) {
          throw new Error("Speech recognition has not been constructed");
        }
        recognition.emit(alternatives, true);
      },
      emitInterim(alternatives) {
        const recognition = recognitions.at(-1);
        if (!recognition) {
          throw new Error("Speech recognition has not been constructed");
        }
        recognition.emit(alternatives, false);
      },
      stats() {
        const snapshots = recognitions.map(snapshotRecognition);
        return {
          aliasesMatch:
            speechWindow.SpeechRecognition ===
            speechWindow.webkitSpeechRecognition,
          availabilityCalls: availabilityCalls.map((call) => ({
            langs: [...call.langs],
            processLocally: call.processLocally,
          })),
          hasInstall: "install" in recognitionConstructor,
          latest: snapshots.at(-1) ?? null,
          recognitions: snapshots,
          wakeLock: {
            releases: wakeLockReleases,
            requestTypes: [...requestTypes],
            requests: wakeLockRequests,
          },
        };
      },
    };
  });
}
