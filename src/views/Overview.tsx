import { Posting } from "../data/types";
export function Overview({ postings }: { postings: Posting[] }) {
  return <div className="card">Overview — {postings.length} postings</div>;
}
