import { useEffect, useMemo, useRef, useState } from "react";
import type { MapPoint } from "./Map";

type SearchBarProps = {
  items: MapPoint[];
  onSelect: (site: MapPoint) => void;
};

const MAX_RESULTS = 10;

function normalize(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export default function SearchBar({ items, onSelect }: SearchBarProps) {
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);

  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const index = useMemo(
    () => items.map((m) => ({ site: m, norm: normalize(m.label) })),
    [items]
  );

  const results = useMemo(() => {
    const t = normalize(text.trim());
    if (t.length < 2) return [];

    const starts: MapPoint[] = [];
    const contains: MapPoint[] = [];
    for (const { site, norm } of index) {
      const pos = norm.indexOf(t);
      if (pos === 0) starts.push(site);
      else if (pos > 0) contains.push(site);
    }
    const byLabel = (a: MapPoint, b: MapPoint) => a.label.localeCompare(b.label, "es");
    return [...starts.sort(byLabel), ...contains.sort(byLabel)].slice(0, MAX_RESULTS);
  }, [text, index]);

  return (
    <div ref={wrapRef} className="searchWrap">
      <input
        className="searchInput"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Search site..."
        autoComplete="off"
      />

      {open && text.trim().length >= 2 && results.length === 0 && (
        <div className="searchStatus">No visible sites match</div>
      )}

      {open && results.length > 0 && (
        <ul className="searchDropdown">
          {results.map((site) => (
            <li
              key={site.id}
              className="searchItem"
              onClick={() => {
                setText(site.label);
                setOpen(false);
                onSelect(site);
              }}
            >
              {site.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}