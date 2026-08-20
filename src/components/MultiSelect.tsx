interface Props { label: string; options: string[]; selected: string[]; onChange: (v: string[]) => void; }

export function MultiSelect({ label, options, selected, onChange }: Props) {
  return (
    <label className="filter">
      <span>{label}{selected.length ? ` (${selected.length})` : ""}</span>
      <select
        multiple
        value={selected}
        onChange={(e) =>
          onChange(Array.from(e.target.selectedOptions, (o) => o.value))
        }
      >
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}
