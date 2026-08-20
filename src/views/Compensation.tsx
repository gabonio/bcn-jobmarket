import { Posting } from "../data/types";
export function Compensation({ postings }: { postings: Posting[] }) {
  return <div className="card">Compensation — {postings.length} postings</div>;
}
