export function eur(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "—";
  return "€" + Math.round(n).toLocaleString("en-US");
}
export function eurK(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "—";
  return "€" + Math.round(n / 1000) + "k";
}

export function monthYear(year: number | null | undefined, month: number | null | undefined): string {
  if (year == null || month == null || month < 1 || month > 12) return "—";
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}
