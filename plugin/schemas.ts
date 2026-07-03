import { z } from "zod";

export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const hhmm = z.string().regex(/^\d{2}:\d{2}$/);

export const nutrientsSchema = z.strictObject({
  kcal: z.number().nonnegative(),
  protein: z.number().nonnegative(),
  carbs: z.number().nonnegative(),
  fat: z.number().nonnegative(),
  fiber: z.number().nonnegative(),
  micros: z.record(z.string(), z.number()).optional(),
});

export const qtyBasisSchema = z.enum(["weighed", "measures", "estimate"]);

export const qtySchema = z.strictObject({
  amount: z.number().positive(),
  unit: z.string().min(1),
  grams: z.number().positive(),
  basis: qtyBasisSchema,
});

export const confidenceSchema = z.enum(["high", "medium", "low"]);

export const itemSchema = z.strictObject({
  input: z.string().min(1),
  food: z.string().min(1),
  foodId: z.string().min(1).optional(),
  qty: qtySchema,
  nutrients: nutrientsSchema,
  source: z.string().min(1),
  confidence: confidenceSchema,
  notes: z.string().optional(),
});

export const adherenceSchema = z.enum(["on-plan", "variation", "cheat"]);

export const mealSchema = z.strictObject({
  slot: z.string().min(1),
  time: hhmm.optional(),
  adherence: adherenceSchema,
  items: z.array(itemSchema).min(1),
  notes: z.string().optional(),
});

export const workoutSchema = z.strictObject({
  type: z.string().min(1),
  durationMin: z.number().positive(),
  estimatedBurnKcal: z.number().nonnegative().optional(),
  notes: z.string().optional(),
});

export const bodySchema = z.strictObject({
  weightKg: z.number().positive().optional(),
  treatment: z.string().optional(),
  notes: z.string().optional(),
});

export const dayFileSchema = z.strictObject({
  date: isoDate,
  meals: z.array(mealSchema),
  body: bodySchema.optional(),
  activity: z.array(workoutSchema).optional(),
  notes: z.string().optional(),
});

export const foodContextSchema = z.enum(["home", "outside"]);

export const foodEntrySchema = z.strictObject({
  id: z.string().min(1),
  name: z.string().min(1),
  context: foodContextSchema,
  per100g: nutrientsSchema,
  servingG: z.number().positive().optional(),
  aliases: z.array(z.string()).optional(),
  source: z.string().min(1),
  resolvedAt: isoDate,
  notes: z.string().optional(),
});

export const foodsFileSchema = z.strictObject({
  foods: z.array(foodEntrySchema),
});

export const measureSchema = z.strictObject({
  unit: z.string().min(1),
  grams: z.number().positive(),
  weighedOn: isoDate.optional(),
  notes: z.string().optional(),
});

export const measuresFileSchema = z.strictObject({
  measures: z.array(measureSchema),
});

export const profileSchema = z.strictObject({
  heightCm: z.number().positive().optional(),
  startingWeightKg: z.number().positive().optional(),
  birthYear: z.number().int().optional(),
  timezone: z.string().min(1),
  wakeDayCutoffHour: z.number().int().min(0).max(23).default(4),
  notes: z.string().optional(),
});

export const chartOptionSchema = z.strictObject({
  id: z.string().min(1),
  description: z.string().min(1),
  foodIds: z.array(z.string()).optional(),
});

export const chartSlotSchema = z.strictObject({
  slot: z.string().min(1),
  time: hhmm.optional(),
  options: z.array(chartOptionSchema).min(1),
});

export const dietChartSchema = z.strictObject({
  effectiveFrom: isoDate,
  slots: z.array(chartSlotSchema).min(1),
  notes: z.string().optional(),
});

export type Nutrients = z.infer<typeof nutrientsSchema>;
export type Qty = z.infer<typeof qtySchema>;
export type Item = z.infer<typeof itemSchema>;
export type Meal = z.infer<typeof mealSchema>;
export type Workout = z.infer<typeof workoutSchema>;
export type DayFile = z.infer<typeof dayFileSchema>;
export type FoodEntry = z.infer<typeof foodEntrySchema>;
export type FoodsFile = z.infer<typeof foodsFileSchema>;
export type Measure = z.infer<typeof measureSchema>;
export type MeasuresFile = z.infer<typeof measuresFileSchema>;
export type Profile = z.infer<typeof profileSchema>;
export type ChartOption = z.infer<typeof chartOptionSchema>;
export type ChartSlot = z.infer<typeof chartSlotSchema>;
export type DietChart = z.infer<typeof dietChartSchema>;
export type Adherence = z.infer<typeof adherenceSchema>;
