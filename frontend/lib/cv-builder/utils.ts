import { nanoid } from "nanoid";

export function newId() {
  return nanoid(10);
}

export function formatDateRange(
  start: string,
  end: string,
  current: boolean
): string {
  if (!start) return "";
  const s = formatDate(start);
  const e = current ? "Present" : end ? formatDate(end) : "";
  return e ? `${s} – ${e}` : s;
}

function formatDate(iso: string): string {
  if (!iso) return "";
  // Accepts YYYY-MM or YYYY-MM-DD
  const [year, month] = iso.split("-");
  if (!month) return year;
  const d = new Date(Number(year), Number(month) - 1);
  return d.toLocaleString("default", { month: "short", year: "numeric" });
}

export function completenessPercent(
  values: (string | boolean | undefined | null)[]
): number {
  const filled = values.filter((v) => !!v && v !== "").length;
  return Math.round((filled / values.length) * 100);
}
