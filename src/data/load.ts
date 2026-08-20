import Papa from "papaparse";
import { normalizeRows } from "./normalize";
import { Posting } from "./types";
import { SNAPSHOT_CSV } from "./snapshot";

const SHEET_ID = "1GIOcNdlraQDV-qD45deFCRNfPDVIkELE5RGAeq7gQPA";
const GID = "1472483134";
export const SHEET_CSV_URL =
  `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${GID}`;

export function parseCsv(text: string): string[][] {
  return Papa.parse<string[]>(text, { skipEmptyLines: false }).data;
}

export interface LoadResult {
  postings: Posting[];
  source: "live" | "cache";
  error?: string;
}

export async function loadPostings(fetcher: typeof fetch = fetch): Promise<LoadResult> {
  try {
    const resp = await fetcher(SHEET_CSV_URL);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const text = await resp.text();
    const postings = normalizeRows(parseCsv(text));
    if (postings.length === 0) throw new Error("empty live data");
    return { postings, source: "live" };
  } catch (e) {
    return {
      postings: normalizeRows(parseCsv(SNAPSHOT_CSV)),
      source: "cache",
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
