import type { Measure } from "./schemas.ts";

export function resolveGrams(
  amount: number,
  unit: string,
  measures: Measure[]
): { grams: number; basis: "weighed" | "measures" } | null {
  const normalized = unit.trim().toLowerCase();
  if (normalized === "g" || normalized === "gram" || normalized === "grams") {
    return { grams: amount, basis: "weighed" };
  }
  if (normalized === "kg") {
    return { grams: amount * 1000, basis: "weighed" };
  }
  const measure = measures.find((m) => m.unit.toLowerCase() === normalized);
  if (!measure) {
    return null;
  }
  return { grams: amount * measure.grams, basis: "measures" };
}
