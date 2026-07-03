import type { DayFile, FoodEntry, Nutrients } from "./schemas.ts";

export interface RecomputeResult {
  changed: boolean;
  changedItems: string[];
  day: DayFile;
}

export function recomputeDay(
  day: DayFile,
  foods: FoodEntry[]
): RecomputeResult {
  const byId = new Map(foods.map((f) => [f.id, f]));
  let changed = false;
  const changedItems: string[] = [];

  const meals = day.meals.map((meal) => ({
    ...meal,
    items: meal.items.map((item) => {
      if (!item.foodId) {
        return item;
      }
      const food = byId.get(item.foodId);
      if (!food) {
        return item;
      }
      const nutrients = scaleTo(food.per100g, item.qty.grams);
      if (nutrientsEqual(nutrients, item.nutrients)) {
        return item;
      }
      changed = true;
      changedItems.push(`${meal.slot}/${item.food}`);
      return { ...item, nutrients, source: food.source };
    }),
  }));

  return { day: changed ? { ...day, meals } : day, changed, changedItems };
}

export function scaleTo(per100g: Nutrients, grams: number): Nutrients {
  const factor = grams / 100;
  const scaled: Nutrients = {
    kcal: Math.round(per100g.kcal * factor),
    protein: round1(per100g.protein * factor),
    carbs: round1(per100g.carbs * factor),
    fat: round1(per100g.fat * factor),
    fiber: round1(per100g.fiber * factor),
  };
  if (per100g.micros) {
    scaled.micros = Object.fromEntries(
      Object.entries(per100g.micros).map(([k, v]) => [k, round1(v * factor)])
    );
  }
  return scaled;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function nutrientsEqual(a: Nutrients, b: Nutrients): boolean {
  return (
    a.kcal === b.kcal &&
    a.protein === b.protein &&
    a.carbs === b.carbs &&
    a.fat === b.fat &&
    a.fiber === b.fiber
  );
}
