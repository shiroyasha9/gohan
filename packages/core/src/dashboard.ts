import { dayTotals, type MacroTotals } from "./aggregate.ts";
import { chartForDate, deriveEnvelope } from "./chart.ts";
import type {
  Adherence,
  DayFile,
  DietChart,
  FoodEntry,
  Profile,
} from "./schemas.ts";

export interface DashboardWindow {
  from: string;
  to: string;
}

export interface DashboardDayEntry {
  adherence: Record<Adherence, number>;
  cheatSlots: string[];
  cheats: number;
  date: string;
  kcalByConfidence: { high: number; medium: number; low: number };
  logged: boolean;
  meals: number;
  totals: MacroTotals | null;
  treatment: string | null;
  weightKg: number | null;
  workoutMin: number;
}

export interface EnvelopeSegment {
  effectiveFrom: string;
  from: string;
  kcal: { min: number; max: number };
  protein: { min: number; max: number };
  to: string;
  unresolvedOptions: string[];
}

export interface DashboardDerived {
  avgKcal7d: number | null;
  calibrationBiasKcalPerDay: number | null;
  changeRateKgPerWeek: number | null;
  cheats: {
    total: number;
    bySlot: Record<string, number>;
    byWeekday: Record<string, number>;
  };
  consistency: {
    daysLogged: number;
    totalDays: number;
    pctLogged: number;
    avgMealsPerLoggedDay: number;
    currentStreak: number;
    longestStreak: number;
  };
  mifflinTdee: number | null;
  proteinGap: {
    targetSource: "envelope-min";
    targetG: number;
    hitDays: number;
    missDays: number;
    topFoods: string[];
  } | null;
  proteinPerKgAvg: number | null;
  tdee: number | null;
  weekend: {
    weekendAvgKcal: number;
    weekdayAvgKcal: number;
    deltaKcal: number;
  } | null;
  weightTrend: Array<{ date: string; kg: number }>;
}

export interface DashboardData {
  days: DashboardDayEntry[];
  derived: DashboardDerived;
  envelopes: EnvelopeSegment[];
  from: string;
  profile: {
    heightCm: number | null;
    startingWeightKg: number | null;
    latestWeightKg: number | null;
  };
  to: string;
}

function shiftDate(date: string, delta: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

function datesBetween(from: string, to: string): string[] {
  const dates: string[] = [];
  for (let date = from; date <= to; date = shiftDate(date, 1)) {
    dates.push(date);
  }
  return dates;
}

function dayEntry(date: string, day: DayFile | undefined): DashboardDayEntry {
  if (!day || day.meals.length === 0) {
    return {
      date,
      logged: false,
      totals: null,
      adherence: { "on-plan": 0, variation: 0, cheat: 0 },
      kcalByConfidence: { high: 0, medium: 0, low: 0 },
      meals: 0,
      cheats: 0,
      cheatSlots: [],
      weightKg: day?.body?.weightKg ?? null,
      treatment: day?.body?.treatment ?? null,
      workoutMin: (day?.activity ?? []).reduce(
        (acc, w) => acc + w.durationMin,
        0
      ),
    };
  }
  const kcalByConfidence = { high: 0, medium: 0, low: 0 };
  const adherence: Record<Adherence, number> = {
    "on-plan": 0,
    variation: 0,
    cheat: 0,
  };
  for (const meal of day.meals) {
    adherence[meal.adherence] += 1;
    for (const item of meal.items) {
      kcalByConfidence[item.confidence] += item.nutrients.kcal;
    }
  }
  const cheatSlots = day.meals
    .filter((m) => m.adherence === "cheat")
    .map((m) => m.slot);
  return {
    date,
    logged: true,
    totals: dayTotals(day),
    adherence,
    kcalByConfidence: {
      high: Math.round(kcalByConfidence.high),
      medium: Math.round(kcalByConfidence.medium),
      low: Math.round(kcalByConfidence.low),
    },
    meals: day.meals.length,
    cheats: cheatSlots.length,
    cheatSlots,
    weightKg: day.body?.weightKg ?? null,
    treatment: day.body?.treatment ?? null,
    workoutMin: (day.activity ?? []).reduce((acc, w) => acc + w.durationMin, 0),
  };
}

const EMA_ALPHA = 0.1;
const KCAL_PER_KG = 7700;
const MIN_PAIRED_DAYS = 14;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

interface WeightAnalysis {
  changeRateKgPerWeek: number | null;
  trend: Array<{ date: string; kg: number }>;
  trendRaw: number[];
}

function weightAnalysis(series: DashboardDayEntry[]): WeightAnalysis {
  const weighIns = series.flatMap((d, i) =>
    d.weightKg === null ? [] : [{ index: i, kg: d.weightKg }]
  );
  const first = weighIns[0];
  const last = weighIns.at(-1);
  if (!(first && last)) {
    return { trend: [], trendRaw: [], changeRateKgPerWeek: null };
  }

  const interpolated: number[] = [];
  for (let w = 0; w < weighIns.length - 1; w++) {
    const a = weighIns[w];
    const b = weighIns[w + 1];
    if (!(a && b)) {
      continue;
    }
    const span = b.index - a.index;
    for (let i = 0; i < span; i++) {
      interpolated.push(a.kg + ((b.kg - a.kg) * i) / span);
    }
  }
  interpolated.push(last.kg);

  const trendRaw: number[] = [];
  for (const kg of interpolated) {
    const prev = trendRaw.at(-1);
    trendRaw.push(prev === undefined ? kg : prev + EMA_ALPHA * (kg - prev));
  }

  const trend = trendRaw.map((kg, i) => {
    const entry = series[first.index + i];
    return { date: entry?.date ?? "", kg: round2(kg) };
  });

  const spanDays = last.index - first.index;
  const firstTrend = trendRaw[0];
  const lastTrend = trendRaw.at(-1);
  const changeRateKgPerWeek =
    spanDays > 0 && firstTrend !== undefined && lastTrend !== undefined
      ? round2(((lastTrend - firstTrend) / spanDays) * 7)
      : null;

  return { trend, trendRaw, changeRateKgPerWeek };
}

function backCalcTdee(
  series: DashboardDayEntry[],
  analysis: WeightAnalysis
): number | null {
  const weighIndices = series.flatMap((d, i) =>
    d.weightKg === null ? [] : [i]
  );
  const firstIndex = weighIndices[0];
  const lastIndex = weighIndices.at(-1);
  if (firstIndex === undefined || lastIndex === undefined) {
    return null;
  }
  const spanDays = lastIndex - firstIndex;
  const pairedDays = series
    .slice(firstIndex, lastIndex + 1)
    .filter((d) => d.logged);
  if (pairedDays.length < MIN_PAIRED_DAYS || spanDays === 0) {
    return null;
  }
  const avgIntake =
    pairedDays.reduce((acc, d) => acc + (d.totals?.kcal ?? 0), 0) /
    pairedDays.length;
  const firstTrend = analysis.trendRaw[0];
  const lastTrend = analysis.trendRaw.at(-1);
  if (firstTrend === undefined || lastTrend === undefined) {
    return null;
  }
  const trendDelta = lastTrend - firstTrend;
  return Math.round(avgIntake - (trendDelta * KCAL_PER_KG) / spanDays);
}

const MIFFLIN_ACTIVITY = 1.4;
const PROTEIN_TOP_FOODS = 3;

function avgKcalLast7(series: DashboardDayEntry[]): number | null {
  const logged = series.slice(-7).filter((d) => d.logged);
  if (logged.length === 0) {
    return null;
  }
  return Math.round(
    logged.reduce((acc, d) => acc + (d.totals?.kcal ?? 0), 0) / logged.length
  );
}

function proteinPerKg(
  loggedDays: DashboardDayEntry[],
  referenceKg: number | null
): number | null {
  if (loggedDays.length === 0 || referenceKg === null) {
    return null;
  }
  const avgProtein =
    loggedDays.reduce((acc, d) => acc + (d.totals?.protein ?? 0), 0) /
    loggedDays.length;
  return round2(avgProtein / referenceKg);
}

function mifflinTdee(
  profile: Profile,
  referenceKg: number | null,
  asOf: string
): number | null {
  const sex = profile.gender?.trim().toLowerCase();
  const isMale = sex === "male" || sex === "m";
  const isFemale = sex === "female" || sex === "f";
  if (
    referenceKg === null ||
    profile.heightCm === undefined ||
    profile.birthYear === undefined ||
    !(isMale || isFemale)
  ) {
    return null;
  }
  const sexOffset = isMale ? 5 : -161;
  const age = Number(asOf.slice(0, 4)) - profile.birthYear;
  const bmr = 10 * referenceKg + 6.25 * profile.heightCm - 5 * age + sexOffset;
  return Math.round(bmr * MIFFLIN_ACTIVITY);
}

function proteinGapFact(
  series: DashboardDayEntry[],
  byDate: Map<string, DayFile>,
  envelopes: EnvelopeSegment[]
): DashboardDerived["proteinGap"] {
  const targetFor = (date: string) =>
    envelopes.find((s) => s.from <= date && date <= s.to)?.protein.min ?? null;

  let hitDays = 0;
  let missDays = 0;
  let lastTarget: number | null = null;
  const foodCounts = new Map<string, number>();
  for (const day of series) {
    const target = targetFor(day.date);
    if (!day.logged || day.totals === null || target === null || target <= 0) {
      continue;
    }
    lastTarget = target;
    if (day.totals.protein >= target) {
      hitDays += 1;
      const foods = new Set(
        (byDate.get(day.date)?.meals ?? [])
          .flatMap((m) => m.items)
          .map((i) => i.food)
      );
      for (const food of foods) {
        foodCounts.set(food, (foodCounts.get(food) ?? 0) + 1);
      }
    } else {
      missDays += 1;
    }
  }
  if (lastTarget === null || hitDays + missDays === 0) {
    return null;
  }
  const topFoods = [...foodCounts.entries()]
    .filter(([, count]) => count >= hitDays / 2)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, PROTEIN_TOP_FOODS)
    .map(([food]) => food);
  return {
    targetSource: "envelope-min",
    targetG: lastTarget,
    hitDays,
    missDays,
    topFoods,
  };
}

const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

function weekdayName(date: string): string {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return WEEKDAY_NAMES[day] ?? "";
}

function isWeekend(date: string): boolean {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return day === 0 || day === 6;
}

function weekendSplit(
  loggedDays: DashboardDayEntry[]
): DashboardDerived["weekend"] {
  const avg = (entries: DashboardDayEntry[]) =>
    entries.reduce((acc, d) => acc + (d.totals?.kcal ?? 0), 0) / entries.length;
  const weekend = loggedDays.filter((d) => isWeekend(d.date));
  const weekday = loggedDays.filter((d) => !isWeekend(d.date));
  if (weekend.length === 0 || weekday.length === 0) {
    return null;
  }
  const weekendAvgKcal = Math.round(avg(weekend));
  const weekdayAvgKcal = Math.round(avg(weekday));
  return {
    weekendAvgKcal,
    weekdayAvgKcal,
    deltaKcal: weekendAvgKcal - weekdayAvgKcal,
  };
}

function cheatClusters(
  loggedDays: DashboardDayEntry[]
): DashboardDerived["cheats"] {
  const bySlot: Record<string, number> = {};
  const byWeekday: Record<string, number> = {};
  let total = 0;
  for (const day of loggedDays) {
    for (const slot of day.cheatSlots) {
      bySlot[slot] = (bySlot[slot] ?? 0) + 1;
      total += 1;
    }
    if (day.cheats > 0) {
      const name = weekdayName(day.date);
      byWeekday[name] = (byWeekday[name] ?? 0) + day.cheats;
    }
  }
  return { total, bySlot, byWeekday };
}

function consistencyStats(
  series: DashboardDayEntry[]
): DashboardDerived["consistency"] {
  const loggedDays = series.filter((d) => d.logged);
  let longestStreak = 0;
  let run = 0;
  for (const day of series) {
    run = day.logged ? run + 1 : 0;
    longestStreak = Math.max(longestStreak, run);
  }
  let currentStreak = 0;
  for (let i = series.length - 1; i >= 0 && series[i]?.logged; i--) {
    currentStreak += 1;
  }
  const meals = loggedDays.reduce((acc, d) => acc + d.meals, 0);
  return {
    daysLogged: loggedDays.length,
    totalDays: series.length,
    pctLogged:
      series.length === 0
        ? 0
        : Math.round((loggedDays.length / series.length) * 100),
    avgMealsPerLoggedDay:
      loggedDays.length === 0
        ? 0
        : Math.round((meals / loggedDays.length) * 10) / 10,
    currentStreak,
    longestStreak,
  };
}

function envelopeSegments(
  dates: string[],
  charts: DietChart[],
  foods: FoodEntry[]
): EnvelopeSegment[] {
  const segments: EnvelopeSegment[] = [];
  for (const date of dates) {
    const chart = chartForDate(charts, date);
    if (!chart) {
      continue;
    }
    const last = segments.at(-1);
    if (last && last.effectiveFrom === chart.effectiveFrom) {
      last.to = date;
      continue;
    }
    const envelope = deriveEnvelope(chart, foods);
    segments.push({
      from: date,
      to: date,
      effectiveFrom: chart.effectiveFrom,
      ...envelope,
    });
  }
  return segments;
}

export function buildDashboardData(
  days: DayFile[],
  charts: DietChart[],
  foods: FoodEntry[],
  profile: Profile,
  window: DashboardWindow
): DashboardData {
  const byDate = new Map(days.map((d) => [d.date, d]));
  const dates = datesBetween(window.from, window.to);
  const series = dates.map((date) => dayEntry(date, byDate.get(date)));

  const loggedDays = series.filter((d) => d.logged);
  const weights = weightAnalysis(series);
  const latestWeighIn = series.findLast((d) => d.weightKg !== null);
  const referenceKg =
    weights.trend.at(-1)?.kg ??
    latestWeighIn?.weightKg ??
    profile.startingWeightKg ??
    null;
  const envelopes = envelopeSegments(dates, charts, foods);
  const tdee = backCalcTdee(series, weights);
  const mifflin = mifflinTdee(profile, referenceKg, window.to);

  return {
    from: window.from,
    to: window.to,
    days: series,
    envelopes,
    derived: {
      weightTrend: weights.trend,
      changeRateKgPerWeek: weights.changeRateKgPerWeek,
      tdee,
      mifflinTdee: mifflin,
      calibrationBiasKcalPerDay:
        tdee !== null && mifflin !== null ? mifflin - tdee : null,
      avgKcal7d: avgKcalLast7(series),
      proteinPerKgAvg: proteinPerKg(loggedDays, referenceKg),
      weekend: weekendSplit(loggedDays),
      cheats: cheatClusters(loggedDays),
      consistency: consistencyStats(series),
      proteinGap: proteinGapFact(series, byDate, envelopes),
    },
    profile: {
      heightCm: profile.heightCm ?? null,
      startingWeightKg: profile.startingWeightKg ?? null,
      latestWeightKg: latestWeighIn?.weightKg ?? null,
    },
  };
}
