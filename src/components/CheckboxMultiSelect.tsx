import { useEffect, useRef, useState } from "react";

interface Props {
  label: string;
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
  searchable?: boolean;
}

export function toggleValue(selected: string[], value: string): string[] {
  return selected.includes(value)
    ? selected.filter((v) => v !== value)
    : [...selected, value];
}

export function filterOptions(list: string[], query: string): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return list;
  return list.filter((o) => o.toLowerCase().includes(q));
}

export function CheckboxMultiSelect({ label, options, selected, onChange, searchable }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const visibleOptions = searchable ? filterOptions(options, query) : options;

  return (
    <div className="filter checkbox-filter" ref={rootRef}>
      <button
        type="button"
        className="checkbox-filter-toggle"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        {label}{selected.length ? ` (${selected.length})` : ""}
      </button>
      {open && (
        <div className="checkbox-filter-panel">
          {searchable && (
            <input
              type="text"
              className="checkbox-filter-search"
              placeholder={`Search ${label.toLowerCase()}…`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
          )}
          <div className="checkbox-filter-actions">
            <button type="button" className="checkbox-filter-clear" onClick={() => onChange([])}>
              Clear
            </button>
          </div>
          <div className="checkbox-filter-list">
            {visibleOptions.map((o) => (
              <label key={o} className={selected.includes(o) ? "checkbox-row selected" : "checkbox-row"}>
                <input
                  type="checkbox"
                  checked={selected.includes(o)}
                  onChange={() => onChange(toggleValue(selected, o))}
                />
                <span>{o}</span>
              </label>
            ))}
            {visibleOptions.length === 0 && (
              <div className="checkbox-filter-empty">No matches</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
