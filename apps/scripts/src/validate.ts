import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import {
  dayFileSchema,
  dietChartSchema,
  foodsFileSchema,
  measuresFileSchema,
  profileSchema,
} from "@gohan/core";
import { Glob } from "bun";

interface Validator {
  safeParse: (raw: unknown) =>
    | { success: true }
    | {
        success: false;
        error: { issues: Array<{ path: PropertyKey[]; message: string }> };
      };
}

function schemaFor(path: string): Validator | null {
  if (path.includes("data/days/")) {
    return dayFileSchema;
  }
  if (path.includes("data/diet-chart/")) {
    return dietChartSchema;
  }
  const name = basename(path);
  if (name === "foods.json") {
    return foodsFileSchema;
  }
  if (name === "measures.json") {
    return measuresFileSchema;
  }
  if (name === "profile.json") {
    return profileSchema;
  }
  return null;
}

async function validate(path: string): Promise<string | null> {
  const schema = schemaFor(path);
  if (!schema) {
    return `${path}: no schema mapped to this path`;
  }
  const raw = JSON.parse(await readFile(path, "utf8"));
  const result = schema.safeParse(raw);
  if (result.success) {
    return null;
  }
  return `${path}:\n${result.error.issues
    .map((i) => `  ${i.path.join(".") || "(root)"}: ${i.message}`)
    .join("\n")}`;
}

const args = process.argv.slice(2);
const paths = args.length
  ? args
  : [
      ...new Glob("data/days/**/*.json").scanSync("."),
      ...new Glob("data/diet-chart/*.json").scanSync("."),
      ...["data/foods.json", "data/measures.json", "data/profile.json"].filter(
        (p) => existsSync(p)
      ),
    ];

const failures = (await Promise.all(paths.map(validate))).filter(
  (f): f is string => f !== null
);

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(`${paths.length} file(s) valid`);
