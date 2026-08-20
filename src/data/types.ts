export type RawRow = string[];

export type Modality = "In Office" | "Hybrid" | "Remote" | "Unknown";
export type LevelFamily = "IC" | "Manager" | "Product" | "Other";

export const FX: Record<string, number> = { USD: 0.92, GBP: 1.17, EUR: 1 };

export interface Posting {
  date: Date | null;
  year: number | null;
  month: number | null; // 1-12
  company: string;
  role: string;
  craft: string;
  level: string;
  levelFamily: LevelFamily;
  levelRank: number | null;
  location: string;
  modality: Modality;
  currency: string; // original, normalized code (EUR/USD/GBP)
  lowEur?: number;
  midEur?: number;
  highEur?: number;
  origLow?: number;
  origMid?: number;
  origHigh?: number;
  rsu: boolean;
  bonus: string;
}
