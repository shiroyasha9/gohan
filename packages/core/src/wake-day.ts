export const WAKE_DAY_CUTOFF_HOUR = 4;

const LOCAL_DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):\d{2}/;

export function wakeDay(
  localDateTime: string,
  cutoffHour = WAKE_DAY_CUTOFF_HOUR
): string {
  const match = localDateTime.match(LOCAL_DATE_TIME);
  if (!match) {
    throw new Error(`Expected "YYYY-MM-DD HH:MM", got "${localDateTime}"`);
  }
  const [, year, month, day, hour] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (Number(hour) < cutoffHour) {
    date.setUTCDate(date.getUTCDate() - 1);
  }
  return date.toISOString().slice(0, 10);
}

export function dayFileRelativePath(date: string): string {
  const [year, month] = date.split("-");
  return `data/days/${year}/${month}/${date}.json`;
}
