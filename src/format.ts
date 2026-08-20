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

const LEVEL_NAMES: Record<string, string> = {
  "IC-1": "Junior",
  "IC-2": "Mid-level",
  "IC-3": "Senior",
  "IC-4": "Staff",
  "IC-5": "Principal",
  "IC-6": "Senior Principal",
  "IC-7": "Distinguished",
  "IC-8": "Fellow",
  "M-1": "Team Lead",
  "M-2": "Manager",
  "M-3": "Senior Manager",
  "M-4": "Director",
  "M-5": "Senior Director",
  "M-6": "VP",
  "M-7": "Senior VP",
  "M-8": "CTO",
  "P-1": "Product Analyst",
  "P-2": "Product Owner",
  "P-3": "Senior Product Owner",
  "P-4": "Product Manager",
  "P-5": "Senior Product Manager",
  "P-6": "Product Lead",
  "P-7": "VP Product",
};

export function levelName(level: string): string {
  const normalized = level.trim().toUpperCase().replace(/^(IC|M|P)(\d+)$/, "$1-$2");
  return LEVEL_NAMES[normalized] ?? level;
}

export function levelGroup(level: string): string {
  const normalized = level.trim().toUpperCase();
  if (normalized.startsWith("IC-")) return "IC";
  if (normalized.startsWith("M-")) return "Management";
  if (normalized.startsWith("P-")) return "Product";
  return "Other";
}
