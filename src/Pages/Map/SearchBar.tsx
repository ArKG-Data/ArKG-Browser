import { useEffect, useRef, useState } from "react";
import { sparqlQuery } from "./sparql";

type SearchBarProps = {
  onSelect: (iri: string) => void;
};

type ResultItem = {
  subject: { value: string };
  label: { value: string };
};

export default function SearchBar({ onSelect }: SearchBarProps) {
  const [text, setText] = useState("");
  const [results, setResults] = useState<ResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);

  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) {
        setResults([]);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    if (isSelecting) return;

    const t = text.trim();

    if (t.length < 2) {
      setResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      setLoading(true);

      const escaped = t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      const query = `
        PREFIX : <https://arkg.cl/>
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>

        SELECT DISTINCT ?subject ?label
        WHERE {
          ?subject rdfs:label ?label .
          ?subject rdf:type :ArchSite .
          ?subject :x ?x .
          FILTER(REGEX(STR(?label), "${escaped}", "i"))
        }
        LIMIT 10
      `.trim();

      if (!query) {
        console.warn("SPARQL query vacía, no se enviará");
        setLoading(false);
        return;
      }

      try {
        const data = await sparqlQuery(query);
        setResults(data?.results?.bindings ?? []);
      } catch (e) {
        console.error(e);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timeout);
  }, [text, isSelecting]);

  return (
    <div ref={wrapRef} className="searchWrap">
      <input
        className="searchInput"
        value={text}
        onChange={(e) => {
          setIsSelecting(false);
          setText(e.target.value);
        }}
        placeholder="Buscar sitio..."
        autoComplete="off"
      />

      {loading && <div className="searchStatus">Buscando…</div>}

      {results.length > 0 && (
        <ul className="searchDropdown">
          {results.map((r, i) => (
            <li
              key={`${r.subject?.value ?? "s"}-${i}`}
              className="searchItem"
              onClick={() => {
                setIsSelecting(true);
                setText(r.label.value);
                setResults([]);
                onSelect(r.subject.value);
              }}
            >
              {r.label.value}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
