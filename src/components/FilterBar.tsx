import { Posting } from "../data/types";
import { Filters, EMPTY_FILTERS } from "../data/aggregate";
import { filterOptions } from "../state/useData";
import { CheckboxMultiSelect } from "./CheckboxMultiSelect";
import { levelGroup, levelName, monthYear } from "../format";

interface Props { postings: Posting[]; filters: Filters; onChange: (f: Filters) => void; }

type TimePreset = "all" | "last1" | "last3" | "last6" | "custom" | string;

function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function monthIndex(value: string): number | null {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  return month >= 1 && month <= 12 ? year * 12 + month - 1 : null;
}

function addMonths(value: string, offset: number): string {
  const index = monthIndex(value);
  if (index == null) return value;
  const year = Math.floor((index + offset) / 12);
  const month = ((index + offset) % 12 + 12) % 12 + 1;
  return monthKey(year, month);
}

function monthLabel(value: string): string {
  const [year, month] = value.split("-").map(Number);
  return monthYear(year, month);
}

function availableMonths(postings: Posting[]): string[] {
  const indexes = postings
    .filter((p) => p.year != null && p.month != null)
    .map((p) => p.year! * 12 + p.month! - 1);
  if (indexes.length === 0) return [];
  const first = Math.min(...indexes);
  const last = Math.max(...indexes);
  return Array.from({ length: last - first + 1 }, (_, offset) => {
    const index = first + offset;
    return monthKey(Math.floor(index / 12), (index % 12) + 1);
  });
}

export function FilterBar({ postings, filters, onChange }: Props) {
  const opts = filterOptions(postings);
  const months = availableMonths(postings);
  const years = [...new Set(months.map((value) => value.slice(0, 4)))].sort((a, b) => b.localeCompare(a));
  const latestMonth = months[months.length - 1] ?? "";
  const presets: { value: TimePreset; label: string }[] = [
    { value: "all", label: "All time" },
    { value: "last6", label: "Last 6 months" },
    { value: "last3", label: "Last 3 months" },
    { value: "last1", label: "Last month" },
    ...years.map((year) => ({ value: year, label: year })),
  ];
  const set = (k: keyof Filters, v: string[]) => onChange({ ...filters, [k]: v });
  const setTimePreset = (preset: TimePreset) => {
    if (preset === "all") return onChange({ ...filters, dateFrom: "", dateTo: "" });
    if (preset === "last1" || preset === "last3" || preset === "last6") {
      const count = preset === "last1" ? 1 : preset === "last3" ? 3 : 6;
      const from = latestMonth ? addMonths(latestMonth, -(count - 1)) : "";
      return onChange({ ...filters, dateFrom: from, dateTo: latestMonth });
    }
    if (/^\d{4}$/.test(preset)) {
      return onChange({ ...filters, dateFrom: `${preset}-01`, dateTo: `${preset}-12` });
    }
    onChange({ ...filters, dateFrom: "", dateTo: "" });
  };
  const selectedPreset = filters.dateFrom === "" && filters.dateTo === ""
    ? "all"
    : presets.find((preset) => {
      if (preset.value === "last1" || preset.value === "last3" || preset.value === "last6") {
        const count = preset.value === "last1" ? 1 : preset.value === "last3" ? 3 : 6;
        return filters.dateTo === latestMonth && filters.dateFrom === addMonths(latestMonth, -(count - 1));
      }
      return /^\d{4}$/.test(preset.value) &&
        filters.dateFrom === `${preset.value}-01` && filters.dateTo === `${preset.value}-12`;
    })?.value ?? "custom";
  const setDateBound = (bound: "dateFrom" | "dateTo", value: string) => {
    const next = { ...filters, [bound]: value };
    if (bound === "dateFrom" && value && filters.dateTo && value > filters.dateTo) next.dateTo = value;
    if (bound === "dateTo" && value && filters.dateFrom && value < filters.dateFrom) next.dateFrom = value;
    onChange(next);
  };
  return (
    <div className="filterbar">
      <div className="filterbar-dimensions">
        <CheckboxMultiSelect label="Company" options={opts.companies} selected={filters.companies} onChange={(v) => set("companies", v)} searchable />
        <CheckboxMultiSelect label="Craft" options={opts.crafts} selected={filters.crafts} onChange={(v) => set("crafts", v)} />
        <CheckboxMultiSelect label="Level" options={opts.levels} selected={filters.levels} onChange={(v) => set("levels", v)} formatOption={levelName} groupOption={levelGroup} />
        <CheckboxMultiSelect label="Modality" options={opts.modalities} selected={filters.modalities} onChange={(v) => set("modalities", v)} />
        <CheckboxMultiSelect label="Location" options={opts.locations} selected={filters.locations} onChange={(v) => set("locations", v)} />
        <CheckboxMultiSelect label="Currency" options={opts.currencies} selected={filters.currencies} onChange={(v) => set("currencies", v)} />
        <button type="button" className="clear-filters-button" onClick={() => onChange(EMPTY_FILTERS)}>Clear all</button>
      </div>
      <div className="time-filterbar" aria-label="Time filters">
        <span className="time-filter-title">Time</span>
        <label className="filter time-filter">
          Preset
          <select aria-label="Time preset" value={selectedPreset} onChange={(e) => setTimePreset(e.target.value)}>
            {presets.map((preset) => <option key={preset.value} value={preset.value}>{preset.label}</option>)}
            {selectedPreset === "custom" && <option value="custom">Custom range</option>}
          </select>
        </label>
        <label className="filter time-filter">
          From
          <select aria-label="Time range start" value={filters.dateFrom} onChange={(e) => setDateBound("dateFrom", e.target.value)}>
            <option value="">Any month</option>
            {months.map((value) => <option key={value} value={value}>{monthLabel(value)}</option>)}
          </select>
        </label>
        <label className="filter time-filter">
          To
          <select aria-label="Time range end" value={filters.dateTo} onChange={(e) => setDateBound("dateTo", e.target.value)}>
            <option value="">Any month</option>
            {months.map((value) => <option key={value} value={value}>{monthLabel(value)}</option>)}
          </select>
        </label>
      </div>
    </div>
  );
}
