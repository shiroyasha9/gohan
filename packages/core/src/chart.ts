import type { DietChart, FoodEntry } from "./schemas.ts";

export function chartForDate(
  charts: DietChart[],
  date: string
): DietChart | null {
  const active = charts
    .filter((c) => c.effectiveFrom <= date)
    .sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));
  return active.at(-1) ?? null;
}

export interface Envelope {
  kcal: { min: number; max: number };
  protein: { min: number; max: number };
  unresolvedOptions: string[];
}

export function deriveEnvelope(chart: DietChart, foods: FoodEntry[]): Envelope {
  const byId = new Map(foods.map((f) => [f.id, f]));
  const envelope: Envelope = {
    kcal: { min: 0, max: 0 },
    protein: { min: 0, max: 0 },
    unresolvedOptions: [],
  };

  for (const slot of chart.slots) {
    const resolved: Array<{ kcal: number; protein: number }> = [];
    for (const option of slot.options) {
      if (!option.foodIds?.length) {
        envelope.unresolvedOptions.push(`${slot.slot}/${option.id}`);
        continue;
      }
      const entries = option.foodIds.flatMap((id) => {
        const food = byId.get(id);
        return food ? [food] : [];
      });
      if (entries.length !== option.foodIds.length) {
        envelope.unresolvedOptions.push(`${slot.slot}/${option.id}`);
        continue;
      }
      resolved.push({
        kcal: entries.reduce((acc, e) => acc + servingNutrient(e, "kcal"), 0),
        protein: entries.reduce(
          (acc, e) => acc + servingNutrient(e, "protein"),
          0
        ),
      });
    }
    if (resolved.length === 0) {
      continue;
    }
    envelope.kcal.min += Math.min(...resolved.map((r) => r.kcal));
    envelope.kcal.max += Math.max(...resolved.map((r) => r.kcal));
    envelope.protein.min += Math.min(...resolved.map((r) => r.protein));
    envelope.protein.max += Math.max(...resolved.map((r) => r.protein));
  }

  envelope.kcal.min = Math.round(envelope.kcal.min);
  envelope.kcal.max = Math.round(envelope.kcal.max);
  envelope.protein.min = Math.round(envelope.protein.min);
  envelope.protein.max = Math.round(envelope.protein.max);
  return envelope;
}

function servingNutrient(food: FoodEntry, key: "kcal" | "protein"): number {
  const grams = food.servingG ?? 100;
  return (food.per100g[key] * grams) / 100;
}
