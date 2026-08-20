import { Posting } from "../data/types";
export function RolesCrafts({ postings }: { postings: Posting[] }) {
  return <div className="card">Roles & Crafts — {postings.length} postings</div>;
}
