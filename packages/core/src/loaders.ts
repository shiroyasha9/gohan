import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  type DayFile,
  type DietChart,
  dayFileSchema,
  dietChartSchema,
  type FoodsFile,
  foodsFileSchema,
  type MeasuresFile,
  measuresFileSchema,
  type Profile,
  profileSchema,
} from "./schemas.ts";

async function loadJson<T>(
  path: string,
  parse: (raw: unknown) => T
): Promise<T> {
  const raw = JSON.parse(await readFile(path, "utf8"));
  try {
    return parse(raw);
  } catch (error) {
    throw new Error(
      `Invalid data file ${path}: ${error instanceof Error ? error.message : error}`
    );
  }
}

export function loadDayFile(path: string): Promise<DayFile> {
  return loadJson(path, (raw) => dayFileSchema.parse(raw));
}

export function loadFoods(dataDir: string): Promise<FoodsFile> {
  return loadJson(join(dataDir, "foods.json"), (raw) =>
    foodsFileSchema.parse(raw)
  );
}

export function loadMeasures(dataDir: string): Promise<MeasuresFile> {
  return loadJson(join(dataDir, "measures.json"), (raw) =>
    measuresFileSchema.parse(raw)
  );
}

export function loadProfile(dataDir: string): Promise<Profile> {
  return loadJson(join(dataDir, "profile.json"), (raw) =>
    profileSchema.parse(raw)
  );
}

export async function loadDietCharts(dataDir: string): Promise<DietChart[]> {
  const dir = join(dataDir, "diet-chart");
  const files = (await readdir(dir).catch(() => [])).filter((f) =>
    f.endsWith(".json")
  );
  return Promise.all(
    files.map((f) =>
      loadJson(join(dir, f), (raw) => dietChartSchema.parse(raw))
    )
  );
}

export async function loadDaysInRange(
  dataDir: string,
  from: string,
  to: string
): Promise<DayFile[]> {
  const root = join(dataDir, "days");
  const days: DayFile[] = [];
  const years = await readdir(root).catch(() => []);
  for (const year of years) {
    const months = await readdir(join(root, year)).catch(() => []);
    for (const month of months) {
      const files = await readdir(join(root, year, month)).catch(() => []);
      for (const file of files.filter((f) => f.endsWith(".json"))) {
        const date = file.replace(".json", "");
        if (date >= from && date <= to) {
          days.push(await loadDayFile(join(root, year, month, file)));
        }
      }
    }
  }
  return days.sort((a, b) => a.date.localeCompare(b.date));
}
