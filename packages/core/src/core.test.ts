import { describe, expect, test } from "bun:test";
import {
  adherenceStats,
  chartForDate,
  type DayFile,
  type DietChart,
  dayFileRelativePath,
  dayFileSchema,
  dayTotals,
  deriveEnvelope,
  type FoodEntry,
  type Measure,
  profileSchema,
  recomputeDay,
  resolveGrams,
  scaleTo,
  summarize,
  wakeDay,
} from "./index.ts";

function must<T>(value: T | undefined): T {
  if (value === undefined) {
    throw new Error("fixture value missing");
  }
  return value;
}

const paneer: FoodEntry = {
  id: "paneer-tikka-masala-home",
  name: "paneer tikka masala",
  context: "home",
  per100g: { kcal: 178, protein: 7.8, carbs: 6.1, fat: 13.9, fiber: 1.1 },
  servingG: 180,
  source: "indb:paneer_tikka_masala",
  resolvedAt: "2026-07-01",
};

const roti: FoodEntry = {
  id: "roti-home",
  name: "roti",
  context: "home",
  per100g: { kcal: 299, protein: 7.9, carbs: 46.1, fat: 8.7, fiber: 4.9 },
  servingG: 40,
  source: "usda:2343914",
  resolvedAt: "2026-07-01",
};

function makeDay(overrides: Partial<DayFile> = {}): DayFile {
  return {
    date: "2026-07-04",
    meals: [
      {
        slot: "lunch",
        time: "13:30",
        adherence: "on-plan",
        items: [
          {
            input: "1 katori paneer tikka masala",
            food: "paneer tikka masala",
            foodId: paneer.id,
            qty: { amount: 1, unit: "katori", grams: 180, basis: "measures" },
            nutrients: { kcal: 320, protein: 14, carbs: 11, fat: 25, fiber: 2 },
            source: "indb:paneer_tikka_masala",
            confidence: "high",
          },
          {
            input: "2 rotis",
            food: "roti",
            foodId: roti.id,
            qty: { amount: 2, unit: "roti", grams: 80, basis: "measures" },
            nutrients: {
              kcal: 239,
              protein: 6.3,
              carbs: 36.9,
              fat: 7,
              fiber: 3.9,
            },
            source: "usda:2343914",
            confidence: "high",
          },
        ],
      },
    ],
    ...overrides,
  };
}

describe("dayFileSchema", () => {
  test("accepts a valid day file", () => {
    expect(dayFileSchema.safeParse(makeDay()).success).toBe(true);
  });

  test("rejects unknown keys loudly", () => {
    const result = dayFileSchema.safeParse({ ...makeDay(), calories: 2000 });
    expect(result.success).toBe(false);
  });

  test("rejects an item missing core nutrients", () => {
    const day = makeDay();
    const item = must(must(day.meals[0]).items[0]) as unknown as Record<
      string,
      unknown
    >;
    item.nutrients = { kcal: 320, protein: 14 };
    expect(dayFileSchema.safeParse(day).success).toBe(false);
  });

  test("rejects a malformed date", () => {
    expect(
      dayFileSchema.safeParse(makeDay({ date: "04-07-2026" })).success
    ).toBe(false);
  });
});

describe("wakeDay", () => {
  test("daytime maps to same date", () => {
    expect(wakeDay("2026-07-04 13:30")).toBe("2026-07-04");
  });

  test("03:59 maps to previous date", () => {
    expect(wakeDay("2026-07-04 03:59")).toBe("2026-07-03");
  });

  test("04:00 maps to same date", () => {
    expect(wakeDay("2026-07-04 04:00")).toBe("2026-07-04");
  });

  test("crosses month boundary", () => {
    expect(wakeDay("2026-07-01 01:00")).toBe("2026-06-30");
  });

  test("honors a non-default cutoff", () => {
    expect(wakeDay("2026-07-04 05:30", 6)).toBe("2026-07-03");
    expect(wakeDay("2026-07-04 06:00", 6)).toBe("2026-07-04");
  });

  test("rejects garbage input", () => {
    expect(() => wakeDay("yesterday evening")).toThrow();
  });
});

describe("profileSchema", () => {
  test("requires timezone", () => {
    expect(profileSchema.safeParse({}).success).toBe(false);
  });

  test("defaults wakeDayCutoffHour to 4", () => {
    const parsed = profileSchema.parse({ timezone: "Asia/Kolkata" });
    expect(parsed.wakeDayCutoffHour).toBe(4);
  });
});

describe("dayFileRelativePath", () => {
  test("shards by year/month with full date filename", () => {
    expect(dayFileRelativePath("2026-07-04")).toBe(
      "data/days/2026/07/2026-07-04.json"
    );
  });
});

describe("resolveGrams", () => {
  const measures: Measure[] = [
    { unit: "katori", grams: 150 },
    { unit: "roti", grams: 40 },
  ];

  test("grams pass through as weighed", () => {
    expect(resolveGrams(100, "g", measures)).toEqual({
      grams: 100,
      basis: "weighed",
    });
  });

  test("calibrated unit multiplies out", () => {
    expect(resolveGrams(2, "roti", measures)).toEqual({
      grams: 80,
      basis: "measures",
    });
  });

  test("unit lookup is case-insensitive", () => {
    expect(resolveGrams(1, "Katori", measures)).toEqual({
      grams: 150,
      basis: "measures",
    });
  });

  test("unknown unit returns null", () => {
    expect(resolveGrams(1, "bowl", measures)).toBeNull();
  });
});

describe("dayTotals", () => {
  test("sums items across meals", () => {
    expect(dayTotals(makeDay())).toEqual({
      kcal: 559,
      protein: 20.3,
      carbs: 47.9,
      fat: 32,
      fiber: 5.9,
    });
  });
});

describe("adherenceStats", () => {
  test("counts labels and computes percentages", () => {
    const days = [
      makeDay(),
      makeDay({
        date: "2026-07-05",
        meals: [
          { ...must(makeDay().meals[0]), adherence: "cheat" },
          {
            ...must(makeDay().meals[0]),
            slot: "dinner",
            adherence: "variation",
          },
        ],
      }),
    ];
    const stats = adherenceStats(days);
    expect(stats.meals).toBe(3);
    expect(stats.counts).toEqual({ "on-plan": 1, variation: 1, cheat: 1 });
    expect(stats.onPlanPct).toBe(33);
    expect(stats.cheatPct).toBe(33);
  });
});

describe("summarize", () => {
  test("averages, weight change, workouts, treatment annotations", () => {
    const days = [
      makeDay({
        body: { weightKg: 82.4 },
        activity: [{ type: "gym", durationMin: 60, estimatedBurnKcal: 300 }],
      }),
      makeDay({
        date: "2026-07-05",
        body: { weightKg: 82.1, treatment: "session 4" },
      }),
    ];
    const summary = summarize(days);
    expect(summary.daysLogged).toBe(2);
    expect(summary.averages.kcal).toBe(559);
    expect(summary.weight).toEqual({ first: 82.4, last: 82.1, changeKg: -0.3 });
    expect(summary.workouts).toEqual({
      sessions: 1,
      totalMin: 60,
      totalEstimatedBurnKcal: 300,
    });
    expect(summary.treatmentSessions).toEqual(["2026-07-05"]);
  });

  test("empty input yields zeroes", () => {
    const summary = summarize([]);
    expect(summary.daysLogged).toBe(0);
    expect(summary.weight).toBeNull();
  });
});

describe("chartForDate", () => {
  const chartV1: DietChart = {
    effectiveFrom: "2026-06-01",
    slots: [
      {
        slot: "lunch",
        options: [{ id: "1", description: "grilled chicken + salad" }],
      },
    ],
  };
  const chartV2: DietChart = { ...chartV1, effectiveFrom: "2026-07-01" };

  test("picks the latest chart effective on or before the date", () => {
    expect(chartForDate([chartV2, chartV1], "2026-06-15")).toBe(chartV1);
    expect(chartForDate([chartV2, chartV1], "2026-07-04")).toBe(chartV2);
  });

  test("returns null before any chart", () => {
    expect(chartForDate([chartV1], "2026-05-01")).toBeNull();
  });
});

describe("deriveEnvelope", () => {
  test("sums per-slot min/max across resolved options", () => {
    const chart: DietChart = {
      effectiveFrom: "2026-07-01",
      slots: [
        {
          slot: "lunch",
          options: [
            {
              id: "1",
              description: "paneer tikka masala",
              foodIds: [paneer.id],
            },
            { id: "2", description: "2 rotis worth", foodIds: [roti.id] },
          ],
        },
      ],
    };
    const envelope = deriveEnvelope(chart, [paneer, roti]);
    expect(envelope.kcal.min).toBe(120);
    expect(envelope.kcal.max).toBe(320);
    expect(envelope.unresolvedOptions).toEqual([]);
  });

  test("reports unresolved options instead of guessing", () => {
    const chart: DietChart = {
      effectiveFrom: "2026-07-01",
      slots: [
        {
          slot: "breakfast",
          options: [
            { id: "1", description: "poha" },
            { id: "2", description: "mystery", foodIds: ["not-in-cache"] },
          ],
        },
      ],
    };
    const envelope = deriveEnvelope(chart, [paneer]);
    expect(envelope.unresolvedOptions).toEqual(["breakfast/1", "breakfast/2"]);
    expect(envelope.kcal).toEqual({ min: 0, max: 0 });
  });
});

describe("recomputeDay", () => {
  test("re-derives nutrients from corrected cache entries", () => {
    const correctedPaneer: FoodEntry = {
      ...paneer,
      per100g: { kcal: 200, protein: 8, carbs: 7, fat: 16, fiber: 1 },
    };
    const result = recomputeDay(makeDay(), [correctedPaneer, roti]);
    expect(result.changed).toBe(true);
    expect(result.changedItems).toEqual(["lunch/paneer tikka masala"]);
    expect(result.day.meals[0]?.items[0]?.nutrients.kcal).toBe(360);
    expect(result.day.meals[0]?.items[1]?.nutrients.kcal).toBe(239);
  });

  test("no-op when cache matches logged values", () => {
    const day = makeDay();
    must(must(day.meals[0]).items[0]).nutrients = scaleTo(paneer.per100g, 180);
    must(must(day.meals[0]).items[1]).nutrients = scaleTo(roti.per100g, 80);
    const result = recomputeDay(day, [paneer, roti]);
    expect(result.changed).toBe(false);
    expect(result.day).toBe(day);
  });

  test("items without foodId are untouched", () => {
    const day = makeDay();
    const { foodId: _omitted, ...withoutFoodId } = must(
      must(day.meals[0]).items[0]
    );
    must(day.meals[0]).items[0] = withoutFoodId;
    const result = recomputeDay(day, [
      {
        ...paneer,
        per100g: { kcal: 999, protein: 1, carbs: 1, fat: 1, fiber: 1 },
      },
      roti,
    ]);
    expect(result.day.meals[0]?.items[0]?.nutrients.kcal).toBe(320);
  });
});

describe("scaleTo", () => {
  test("scales per-100g including micros", () => {
    const scaled = scaleTo(
      {
        kcal: 100,
        protein: 10,
        carbs: 5,
        fat: 2,
        fiber: 1,
        micros: { iron_mg: 4 },
      },
      50
    );
    expect(scaled).toEqual({
      kcal: 50,
      protein: 5,
      carbs: 2.5,
      fat: 1,
      fiber: 0.5,
      micros: { iron_mg: 2 },
    });
  });
});
