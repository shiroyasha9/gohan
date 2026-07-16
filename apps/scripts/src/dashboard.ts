import {
  buildDashboardData,
  loadDaysInRange,
  loadDietCharts,
  loadFoods,
  loadProfile,
} from "@gohan/core";

function isoToday(timeZone: string): string {
  return new Date().toLocaleDateString("en-CA", { timeZone });
}

function shiftDays(date: string, delta: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

const args = new Map<string, string>();
for (let i = 2; i < process.argv.length; i += 2) {
  const flag = process.argv[i];
  if (!flag) {
    break;
  }
  args.set(flag.replace(/^--/, ""), process.argv[i + 1] ?? "");
}

const profile = await loadProfile("data");
const to = args.get("to") ?? isoToday(profile.timezone);
const from = args.get("from") ?? shiftDays(to, -29);

const days = await loadDaysInRange("data", from, to);
const foods = await loadFoods("data").catch(() => ({ foods: [] }));
const charts = await loadDietCharts("data");

const data = buildDashboardData(days, charts, foods.foods, profile, {
  from,
  to,
});

console.log(
  JSON.stringify({ ...data, generatedAt: isoToday(profile.timezone) }, null, 2)
);
