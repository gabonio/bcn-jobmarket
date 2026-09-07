import { useEffect, useState } from "react";
import { loadPostings, LoadResult } from "../data/load";
import { Posting } from "../data/types";
import { distinct } from "../data/aggregate";
import { levelSort } from "../format";

export function filterOptions(postings: Posting[]) {
  const s = (arr: string[]) => [...arr].sort((a, b) => a.localeCompare(b));
  return {
    companies: s(distinct(postings, (p) => p.company)),
    crafts: s(distinct(postings, (p) => p.craft)),
    levels: distinct(postings, (p) => p.level).sort(levelSort),
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
