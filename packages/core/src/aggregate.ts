import type { Adherence, DayFile, Nutrients } from "./schemas.ts";

export type MacroTotals = Pick<
  Nutrients,
  "kcal" | "protein" | "carbs" | "fat" | "fiber"
>;

const EMPTY_TOTALS: MacroTotals = {
  kcal: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  fiber: 0,
};

function addTotals(a: MacroTotals, b: MacroTotals): MacroTotals {
  return {
    kcal: a.kcal + b.kcal,
    protein: a.protein + b.protein,
    carbs: a.carbs + b.carbs,
    fat: a.fat + b.fat,
    fiber: a.fiber + b.fiber,
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function roundTotals(t: MacroTotals): MacroTotals {
  return {
    kcal: Math.round(t.kcal),
    protein: round1(t.protein),
    carbs: round1(t.carbs),
    fat: round1(t.fat),
    fiber: round1(t.fiber),
  };
}

export function dayTotals(day: DayFile): MacroTotals {
  const total = day.meals
    .flatMap((meal) => meal.items)
    .reduce((acc, item) => addTotals(acc, item.nutrients), EMPTY_TOTALS);
  return roundTotals(total);
}

export interface AdherenceStats {
  cheatPct: number;
  counts: Record<Adherence, number>;
  meals: number;
  onPlanPct: number;
}

export function adherenceStats(days: DayFile[]): AdherenceStats {
  const counts: Record<Adherence, number> = {
    "on-plan": 0,
    variation: 0,
    cheat: 0,
  };
  let meals = 0;
  for (const day of days) {
    for (const meal of day.meals) {
      counts[meal.adherence] += 1;
      meals += 1;
    }
  }
  const pct = (n: number) => (meals === 0 ? 0 : Math.round((n / meals) * 100));
  return {
    meals,
    counts,
    onPlanPct: pct(counts["on-plan"]),
    cheatPct: pct(counts.cheat),
  };
}

export interface PeriodSummary {
  adherence: AdherenceStats;
  averages: MacroTotals;
  daysLogged: number;
  from: string;
  to: string;
  treatmentSessions: string[];
  weight: { first: number; last: number; changeKg: number } | null;
  workouts: {
    sessions: number;
    totalMin: number;
    totalEstimatedBurnKcal: number;
  };
}

export function summarize(days: DayFile[]): PeriodSummary {
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
  const daysLogged = sorted.length;
  const totalOfTotals = sorted.reduce(
    (acc, day) => addTotals(acc, dayTotals(day)),
    EMPTY_TOTALS
  );
  const averages =
    daysLogged === 0
      ? EMPTY_TOTALS
      : roundTotals({
          kcal: totalOfTotals.kcal / daysLogged,
          protein: totalOfTotals.protein / daysLogged,
          carbs: totalOfTotals.carbs / daysLogged,
          fat: totalOfTotals.fat / daysLogged,
          fiber: totalOfTotals.fiber / daysLogged,
        });

  const weighIns = sorted.flatMap((d) =>
    d.body?.weightKg === undefined ? [] : [d.body.weightKg]
  );
  const firstWeighIn = weighIns[0];
  const lastWeighIn = weighIns.at(-1);
  const weight =
    firstWeighIn === undefined || lastWeighIn === undefined
      ? null
      : {
          first: firstWeighIn,
          last: lastWeighIn,
          changeKg: round1(lastWeighIn - firstWeighIn),
        };

  const workoutList = sorted.flatMap((d) => d.activity ?? []);
  const workouts = {
    sessions: workoutList.length,
    totalMin: workoutList.reduce((acc, w) => acc + w.durationMin, 0),
    totalEstimatedBurnKcal: workoutList.reduce(
      (acc, w) => acc + (w.estimatedBurnKcal ?? 0),
      0
    ),
  };

  const treatmentSessions = sorted
    .filter((d) => d.body?.treatment !== undefined)
    .map((d) => d.date);

  return {
    from: sorted[0]?.date ?? "",
    to: sorted.at(-1)?.date ?? "",
    daysLogged,
    averages,
    adherence: adherenceStats(sorted),
    weight,
    workouts,
    treatmentSessions,
  };
}
