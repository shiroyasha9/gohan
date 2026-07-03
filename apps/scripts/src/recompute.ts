import { writeFile } from "node:fs/promises";
import { loadDayFile, loadFoods, recomputeDay } from "@gohan/core";
import { Glob } from "bun";

const [from = "0000-00-00", to = "9999-99-99"] = process.argv.slice(2);

const foods = await loadFoods("data");
const paths = [...new Glob("data/days/**/*.json").scanSync(".")].filter((p) => {
  const date = p.split("/").pop()?.replace(".json", "") ?? "";
  return date >= from && date <= to;
});

let changedFiles = 0;
for (const path of paths.sort()) {
  const day = await loadDayFile(path);
  const result = recomputeDay(day, foods.foods);
  if (!result.changed) {
    continue;
  }
  await writeFile(path, `${JSON.stringify(result.day, null, 2)}\n`);
  changedFiles += 1;
  console.log(`${path}: ${result.changedItems.join(", ")}`);
}

console.log(`${paths.length} day(s) checked, ${changedFiles} updated`);
