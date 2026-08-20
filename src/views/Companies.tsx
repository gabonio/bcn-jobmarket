import { Posting } from "../data/types";
export function Companies({ postings }: { postings: Posting[] }) {
  return <div className="card">Companies — {postings.length} postings</div>;
}
