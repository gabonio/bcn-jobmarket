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

const INDIVIDUAL_CONTRIBUTOR_LEVELS = new Set([
  "Junior", "Mid-level", "Senior", "Staff", "Principal", "Senior Principal", "Distinguished", "Fellow",
]);
const MANAGEMENT_LEVELS = new Set([
  "Team Lead", "Manager", "Senior Manager", "Director", "Senior Director", "VP", "CTO",
]);
const PRODUCT_LEVELS = new Set([
  "Product Analyst", "Product Owner", "Senior Product Owner", "Product Manager",
  "Senior Product Manager", "Product Lead", "VP Product",
]);

const LEVEL_GROUP_ORDER: Record<string, number> = {
  "Individual contributors": 0,
  Management: 1,
  Product: 2,
  Other: 3,
};

const LEVEL_ORDER: Record<string, number> = {
  Junior: 0,
  "Mid-level": 1,
  Senior: 2,
  Staff: 3,
  Principal: 4,
  "Senior Principal": 5,
  Distinguished: 6,
  Fellow: 7,
  "Team Lead": 0,
  Manager: 1,
  "Senior Manager": 2,
  Director: 3,
  "Senior Director": 4,
  VP: 5,
  CTO: 6,
  "Product Analyst": 0,
  "Product Owner": 1,
  "Senior Product Owner": 2,
  "Product Manager": 3,
  "Senior Product Manager": 4,
  "Product Lead": 5,
  "VP Product": 6,
};

export function levelGroup(level: string): string {
  const displayName = levelName(level);
  if (INDIVIDUAL_CONTRIBUTOR_LEVELS.has(displayName)) return "Individual contributors";
  if (MANAGEMENT_LEVELS.has(displayName)) return "Management";
  if (PRODUCT_LEVELS.has(displayName)) return "Product";
  return "Other";
}

export function levelSort(a: string, b: string): number {
  const aGroup = levelGroup(a);
  const bGroup = levelGroup(b);
  const groupComparison = LEVEL_GROUP_ORDER[aGroup] - LEVEL_GROUP_ORDER[bGroup];
  if (groupComparison !== 0) return groupComparison;

  const aName = levelName(a);
  const bName = levelName(b);
  const levelComparison = (LEVEL_ORDER[aName] ?? Number.MAX_SAFE_INTEGER) -
    (LEVEL_ORDER[bName] ?? Number.MAX_SAFE_INTEGER);
  return levelComparison || aName.localeCompare(bName, undefined, { sensitivity: "base" });
}
