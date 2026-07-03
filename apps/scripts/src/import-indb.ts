import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readFile as readWorkbook, utils, type WorkBook } from "xlsx";

const INDB_URL =
  "https://www.anuvaad.org.in/wp-content/uploads/2020/07/Anuvaad_INDB_2024.11.xlsx";
const OUT = "data/reference/indb.json";

const PARENTHETICAL = /\(([^)]*)\)/g;
const NON_ALPHANUMERIC = /[^a-z0-9]+/g;
const EDGE_DASHES = /^-+|-+$/g;

type Row = Record<string, unknown>;

const MICRO_FIELDS = [
  "freesugar_g",
  "sfa_mg",
  "mufa_mg",
  "pufa_mg",
  "cholesterol_mg",
  "calcium_mg",
  "phosphorus_mg",
  "magnesium_mg",
  "sodium_mg",
  "potassium_mg",
  "iron_mg",
  "copper_mg",
  "selenium_ug",
  "chromium_mg",
  "manganese_mg",
  "molybdenum_mg",
  "zinc_mg",
  "vita_ug",
  "vite_mg",
  "vitd2_ug",
  "vitd3_ug",
  "vitk1_ug",
  "vitk2_ug",
  "folate_ug",
  "vitb1_mg",
  "vitb2_mg",
  "vitb3_mg",
  "vitb5_mg",
  "vitb6_mg",
  "vitb7_ug",
  "vitb9_ug",
  "vitc_mg",
  "carotenoids_ug",
] as const;

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(PARENTHETICAL, "")
    .replace(NON_ALPHANUMERIC, "-")
    .replace(EDGE_DASHES, "");
}

function aliasesOf(name: string): string[] {
  return [...name.matchAll(PARENTHETICAL)]
    .map((m) => (m[1] ?? "").trim().toLowerCase())
    .filter((a) => a.length > 0);
}

function round(value: unknown, dp = 3): number {
  const f = 10 ** dp;
  return Math.round(Number(value) * f) / f;
}

function micros(row: Row, prefix: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const field of MICRO_FIELDS) {
    const value = row[`${prefix}${field}`];
    if (value != null) {
      out[field] = round(value);
    }
  }
  return out;
}

function nutrients(row: Row, prefix: string) {
  return {
    kcal: round(row[`${prefix}energy_kcal`]),
    protein: round(row[`${prefix}protein_g`]),
    carbs: round(row[`${prefix}carb_g`]),
    fat: round(row[`${prefix}fat_g`]),
    fiber: round(row[`${prefix}fibre_g`]),
    micros: micros(row, prefix),
  };
}

async function loadWorkbook(): Promise<WorkBook> {
  const localPath = process.argv[2];
  if (localPath) {
    return readWorkbook(localPath);
  }
  const response = await fetch(INDB_URL);
  if (!response.ok) {
    throw new Error(`INDB download failed: ${response.status} ${INDB_URL}`);
  }
  const xlsxPath = join(tmpdir(), "Anuvaad_INDB.xlsx");
  await writeFile(xlsxPath, new Uint8Array(await response.arrayBuffer()));
  return readWorkbook(xlsxPath);
}

const workbook = await loadWorkbook();
const sheet = workbook.Sheets.Sheet1;
if (!sheet) {
  throw new Error("Expected a sheet named Sheet1 in the INDB workbook");
}
const rows: Row[] = utils.sheet_to_json(sheet, {
  raw: true,
  defval: null,
});

const idCounts = new Map<string, number>();
const entries = rows.map((row) => {
  const name = String(row.food_name);
  const baseId = slugify(name);
  const count = idCounts.get(baseId) ?? 0;
  idCounts.set(baseId, count + 1);

  const hasServing =
    row.unit_serving_energy_kcal != null && Number(row.energy_kcal) > 0;

  return {
    id: count > 0 ? `${baseId}-${count + 1}` : baseId,
    foodCode: String(row.food_code),
    name,
    aliases: aliasesOf(name),
    source: String(row.primarysource),
    servingUnit: row.servings_unit == null ? null : String(row.servings_unit),
    servingSizeG: hasServing
      ? round(
          (Number(row.unit_serving_energy_kcal) / Number(row.energy_kcal)) *
            100,
          1
        )
      : null,
    per100g: nutrients(row, ""),
    perServing: hasServing ? nutrients(row, "unit_serving_") : null,
  };
});

await mkdir("data/reference", { recursive: true });
await writeFile(OUT, `${JSON.stringify(entries, null, 2)}\n`);
console.log(`Wrote ${entries.length} entries to ${OUT}`);
