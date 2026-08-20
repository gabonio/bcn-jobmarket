import { useMemo, useState } from "react";
import "./styles.css";
import { useData } from "./state/useData";
import { FilterBar } from "./components/FilterBar";
import { Filters, EMPTY_FILTERS, applyFilters } from "./data/aggregate";
import { Overview } from "./views/Overview";
import { CompVolume } from "./views/CompVolume";
import { Companies } from "./views/Companies";
import { RolesCrafts } from "./views/RolesCrafts";
import { Compensation } from "./views/Compensation";

const TABS = ["Overview", "Comp & Volume", "Companies", "Roles & Crafts", "Compensation"] as const;
type Tab = typeof TABS[number];

export default function App() {
  const { loading, result } = useData();
  const [tab, setTab] = useState<Tab>("Comp & Volume");
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const all = result?.postings ?? [];
  const filtered = useMemo(() => applyFilters(all, filters), [all, filters]);

  if (loading) return <div className="loading">Loading job market data…</div>;

  return (
    <div className="app">
      <header>
        <h1>BCN Tech Job Market</h1>
        {result?.source === "cache" && (
          <div className="banner">Showing cached data (live fetch failed: {result.error})</div>
        )}
        <nav>{TABS.map((t) => (
          <button key={t} className={t === tab ? "active" : ""} onClick={() => setTab(t)}>{t}</button>
        ))}</nav>
      </header>
      <FilterBar postings={all} filters={filters} onChange={setFilters} />
      <p className="muted">{filtered.length} of {all.length} postings match ·
        time axes reflect the sheet's monthly snapshot cadence, not live posting flow.</p>
      <main>
        {tab === "Overview" && <Overview postings={filtered} />}
        {tab === "Comp & Volume" && <CompVolume postings={filtered} />}
        {tab === "Companies" && <Companies postings={filtered} />}
        {tab === "Roles & Crafts" && <RolesCrafts postings={filtered} />}
        {tab === "Compensation" && <Compensation postings={filtered} />}
      </main>
    </div>
  );
}
