export function eur(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "—";
  return "€" + Math.round(n).toLocaleString("en-US");
}
export function eurK(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "—";
  return "€" + Math.round(n / 1000) + "k";
}
