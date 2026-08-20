import { Posting } from "../data/types";
import { Filters, EMPTY_FILTERS } from "../data/aggregate";
import { filterOptions } from "../state/useData";
import { CheckboxMultiSelect } from "./CheckboxMultiSelect";

interface Props { postings: Posting[]; filters: Filters; onChange: (f: Filters) => void; }

export function FilterBar({ postings, filters, onChange }: Props) {
  const opts = filterOptions(postings);
  const set = (k: keyof Filters, v: string[]) => onChange({ ...filters, [k]: v });
  return (
    <div className="filterbar">
      <CheckboxMultiSelect label="Company" options={opts.companies} selected={filters.companies} onChange={(v) => set("companies", v)} searchable />
      <CheckboxMultiSelect label="Craft" options={opts.crafts} selected={filters.crafts} onChange={(v) => set("crafts", v)} />
      <CheckboxMultiSelect label="Level" options={opts.levels} selected={filters.levels} onChange={(v) => set("levels", v)} />
      <CheckboxMultiSelect label="Modality" options={opts.modalities} selected={filters.modalities} onChange={(v) => set("modalities", v)} />
      <CheckboxMultiSelect label="Location" options={opts.locations} selected={filters.locations} onChange={(v) => set("locations", v)} />
      <CheckboxMultiSelect label="Currency" options={opts.currencies} selected={filters.currencies} onChange={(v) => set("currencies", v)} />
      <button onClick={() => onChange(EMPTY_FILTERS)}>Clear all</button>
    </div>
  );
}
