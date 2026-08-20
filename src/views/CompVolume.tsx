import { Posting } from "../data/types";
export function CompVolume({ postings }: { postings: Posting[] }) {
  return <div className="card">Comp & Volume — {postings.length} postings</div>;
}
