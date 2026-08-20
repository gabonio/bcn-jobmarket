import { useEffect, useState } from "react";
import { loadPostings, LoadResult } from "../data/load";
import { Posting } from "../data/types";
import { distinct } from "../data/aggregate";

export function filterOptions(postings: Posting[]) {
  const s = (arr: string[]) => [...arr].sort((a, b) => a.localeCompare(b));
  return {
    companies: s(distinct(postings, (p) => p.company)),
    crafts: s(distinct(postings, (p) => p.craft)),
    levels: s(distinct(postings, (p) => p.level)),
    levelFamilies: s(distinct(postings, (p) => p.levelFamily)),
    modalities: s(distinct(postings, (p) => p.modality)),
    locations: s(distinct(postings, (p) => p.location)),
    currencies: s(distinct(postings, (p) => p.currency)),
  };
}

export function useData(): { loading: boolean; result: LoadResult | null } {
  const [result, setResult] = useState<LoadResult | null>(null);
  useEffect(() => {
    let alive = true;
    loadPostings().then((r) => alive && setResult(r));
    return () => { alive = false; };
  }, []);
  return { loading: result === null, result };
}
