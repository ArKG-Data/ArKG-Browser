import { useState, useEffect, useMemo } from "react";
import SearchBar from "./SearchBar";
import { sparqlQuery } from "./sparql";
import type { MapPoint, BBox } from "./Map";
import { useNavigate } from "react-router-dom";
import { IconArrowsMove, IconRectangle } from "@tabler/icons-react";
import Slider from "rc-slider";
import "rc-slider/assets/index.css";
import Map from "./Map";
import "./map.css";

function parseYear(c14: string | undefined, tl: string | undefined): number | null {
  const years: number[] = [];
  if (c14) {
    const age = parseFloat(c14);
    if (!isNaN(age)) years.push(2026 - age);
  }
  if (tl) {
    const val = tl.toUpperCase();
    const match = val.match(/([\d\.]+)/);
    if (match) {
      let num = parseFloat(match[1]);
      if (val.includes("AC") || val.includes("BC") || val.includes("A.C")) num = -num;
      if (!isNaN(num)) years.push(num);
    }
  }
  if (years.length === 0) return null;
  return Math.min(...years);
}

const generateMarks = (min: number, max: number) => {
  const marks: Record<number, any> = {};
  const STEP = 2000;

  for (let i = Math.ceil(min / STEP) * STEP; i <= max; i += STEP) {
    const labelVal = Math.abs(i) >= 1000 ? `${Math.abs(i) / 1000}k` : Math.abs(i);
    const suffix = i < 0 ? "BCE" : i === 0 ? "" : "CE";

    if (i !== 2000) {
      marks[i] = {
        style: {
          fontSize: "9px",
          color: "rgba(59,130,246,0.95)",
          fontWeight: 700,
          marginTop: "6px",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        },
        label: `${labelVal}${suffix ? " " + suffix : ""}`,
      };
    }
  }
  
  marks[-11999] = {
    style: {
      fontSize: "9px",
      color: "rgba(59,130,246,0.95)",
      fontWeight: 700,
      marginTop: "6px",
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    },
    label: "12k BCE",
  };

  marks[max] = {
    style: {
      fontSize: "9px",
      color: "rgba(59,130,246,0.95)",
      fontWeight: 700,
      marginTop: "6px",
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    },
    label: "Present",
  };

  return marks;
};

function ToggleSwitch({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="mapToggle">
      <span className="mapToggleLabel">{label}</span>
      <span className={`mapToggleTrack ${checked ? "on" : ""}`}>
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="mapToggleInput"
        />
        <span className={`mapToggleDot ${checked ? "on" : ""}`} />
      </span>
    </label>
  );
}

function DatingTicks({ years, min, max }: { years: number[], min: number, max: number }) {
  const uniq = Array.from(new Set(years)).filter(y => y >= min && y <= max);
  
  return (
    <div style={{ 
      position: "absolute",
      left: 0,
      right: 0,
      top: "10px",
      height: "15px",
      pointerEvents: "none",
      zIndex: 2
    }}>
      {uniq.map((y, i) => {
        const pct = ((y - min) / (max - min)) * 100;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${pct}%`,
              top: 0,
              bottom: 0,
              width: 1,
              background: "rgba(255,255,255,0.5)",
              pointerEvents: "none",
            }}
          />
        );
      })}
    </div>
  );
}

export default function MapPage() {
  const navigate = useNavigate();

  const [allDatingYears, setAllDatingYears] = useState<number[]>([]);
  const [markers, setMarkers] = useState<MapPoint[]>([]);
  const [viewCenter, setViewCenter] = useState<[number, number] | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [interactionMode, setInteractionMode] = useState<"click" | "area">("click");

  const MIN_LIMIT = -12000;
  const MAX_LIMIT = 2026;

  const [dateRange, setDateRange] = useState<number[]>([MIN_LIMIT, MAX_LIMIT]);
  const [showDatesCount, setShowDatesCount] = useState(false);

  const formatYear = (y: number) => (y < 0 ? `${Math.abs(y)} BCE` : `${y} CE`);

  const sliderMarks = useMemo(() => generateMarks(MIN_LIMIT, MAX_LIMIT), []);

  useEffect(() => {
    async function loadAllSites() {
      const query = `
        PREFIX : <https://arkg.cl/>
        PREFIX wd: <http://www.wikidata.org/entity/>
        PREFIX wdt: <http://www.wikidata.org/prop/direct/>
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>

        SELECT ?sitioURI ?sitio ?x ?y ?a ?t
        WHERE {
          ?s wdt:P9047 ?sitioURI .
          ?sitioURI rdfs:label ?sitio .
          ?sitioURI :x ?x .
          ?sitioURI :y ?y .
          OPTIONAL { ?s :14C_age ?a . }
          OPTIONAL { ?s :TL_Age_AC_DC ?t . }
        }
      `;

      try {
        const data = await sparqlQuery(query);
        const bindings = data.results.bindings;

        const sitesMap: Record<
          string,
          { lat: number; lng: number; label: string; iri: string; years: number[] }
        > = {};

        const allYears: number[] = [];

        bindings.forEach((b: any) => {
          const iri = b.sitioURI.value;

          if (!sitesMap[iri]) {
            sitesMap[iri] = {
              lat: parseFloat(b.y.value),
              lng: parseFloat(b.x.value),
              label: b.sitio.value,
              iri,
              years: [],
            };
          }

          const year = parseYear(b.a?.value, b.t?.value);
          if (year !== null) {
            sitesMap[iri].years.push(year);
            allYears.push(year);
          }
        });

        setAllDatingYears(allYears);

        const siteMarkers: MapPoint[] = Object.values(sitesMap)
          .map((site, index) => ({
            lat: site.lat,
            lng: site.lng,
            label: site.label,
            iri: site.iri,
            id: `site-${index}`,
            years: site.years,
            dateCount: site.years.length,
          }))
          .filter(
            (m) =>
              !isNaN(m.lat) &&
              !isNaN(m.lng) &&
              Array.isArray(m.years) &&
              m.years.length > 0
          );
 
        setMarkers(siteMarkers);
      } catch (e) {
        console.error("Error cargando sitios:", e);
      } finally {
        setInitialLoading(false);
      }
    }
 
    loadAllSites();
  }, []);

  async function handleSelect(iri: string) {
    setLoading(true);

    const query = `
      PREFIX : <https://arkg.cl/>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>

      SELECT DISTINCT ?x ?y
      WHERE {
        <${iri}> :x ?x .
        <${iri}> :y ?y .
      }
    `;

    try {
      const data = await sparqlQuery(query);
      const bindings = data.results.bindings;
      if (bindings.length > 0) {
        const result = bindings[0];
        const lat = parseFloat(result.y.value);
        const lng = parseFloat(result.x.value);
        if (!isNaN(lat) && !isNaN(lng)) setViewCenter([lat, lng]);
      }
    } catch (e) {
      console.error("Error al centrar el mapa:", e);
    } finally {
      setLoading(false);
    }
  }

  function handleViewInQueries(site: MapPoint, minYear: number, maxYear: number) {
    if (!site?.iri) return;

    const query = `
      PREFIX :    <https://arkg.cl/>
      PREFIX wd:  <http://www.wikidata.org/entity/>
      PREFIX wdt: <http://www.wikidata.org/prop/direct/>
      PREFIX rdfs:<http://www.w3.org/2000/01/rdf-schema#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
      
      SELECT DISTINCT ?Dating ?Material ?Method ?14C_Age ?TL_Age ?Ref
      WHERE {
        ?s wdt:P9047 <${site.iri}> .
        ?s rdfs:label ?Dating .
        ?s rdf:type :Fechado .
      
        OPTIONAL { ?s wdt:P1343 ?Ref . }
        OPTIONAL {
          ?s wdt:P186 ?materialURI .
          ?materialURI rdfs:label ?Material .
        }
        OPTIONAL { ?s :dating_method ?Method . }
        OPTIONAL { ?s :14C_age ?14C_Age . }
        OPTIONAL { ?s :TL_Age_AC_DC ?TL_Age . }
      
        FILTER(
          (!BOUND(?14C_Age) && !BOUND(?TL_Age))
          ||
          (
            (BOUND(?14C_Age) &&
              (xsd:decimal(2026) - xsd:decimal(?14C_Age)) >= xsd:decimal(${minYear}) &&
              (xsd:decimal(2026) - xsd:decimal(?14C_Age)) <= xsd:decimal(${maxYear})
            )
            ||
            (BOUND(?TL_Age) &&
              xsd:decimal(?TL_Age) >= xsd:decimal(${minYear}) &&
              xsd:decimal(?TL_Age) <= xsd:decimal(${maxYear})
            )
          )
        )
      }`;

      const searchParams = new URLSearchParams();
      searchParams.set("action", "new");
      searchParams.set("code", query);

      navigate({
        pathname: "/queries",
        search: `?${searchParams.toString()}`,
      });
  }

  function handleAreaSelect(bbox: BBox) {
    const { minLng, maxLng, minLat, maxLat } = bbox;
    const minYear = dateRange[0];
    const maxYear = dateRange[1];

    const query = `PREFIX :    <https://arkg.cl/>
PREFIX wd:  <http://www.wikidata.org/entity/>
PREFIX wdt: <http://www.wikidata.org/prop/direct/>
PREFIX rdfs:<http://www.w3.org/2000/01/rdf-schema#>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

SELECT DISTINCT ?Site ?Dating ?Material ?Method ?14C_Age ?TL_Age ?Ref
WHERE {
  ?s wdt:P9047 ?sitioURI .
  ?sitioURI rdfs:label ?Site .
  ?sitioURI :x ?x .
  ?sitioURI :y ?y .
  ?s rdfs:label ?Dating .
  ?s rdf:type :Fechado .

  OPTIONAL { ?s wdt:P1343 ?Ref . }
  OPTIONAL {
    ?s wdt:P186 ?materialURI .
    ?materialURI rdfs:label ?Material .
  }
  OPTIONAL { ?s :dating_method ?Method . }
  OPTIONAL { ?s :14C_age ?14C_Age . }
  OPTIONAL { ?s :TL_Age_AC_DC ?TL_Age . }

  FILTER(
    xsd:decimal(?x) >= xsd:decimal(${minLng}) &&
    xsd:decimal(?x) <= xsd:decimal(${maxLng}) &&
    xsd:decimal(?y) >= xsd:decimal(${minLat}) &&
    xsd:decimal(?y) <= xsd:decimal(${maxLat})
  )

  FILTER(
    (!BOUND(?14C_Age) && !BOUND(?TL_Age))
    ||
    (
      (BOUND(?14C_Age) &&
        (xsd:decimal(2026) - xsd:decimal(?14C_Age)) >= xsd:decimal(${minYear}) &&
        (xsd:decimal(2026) - xsd:decimal(?14C_Age)) <= xsd:decimal(${maxYear})
      )
      ||
      (BOUND(?TL_Age) &&
        xsd:decimal(?TL_Age) >= xsd:decimal(${minYear}) &&
        xsd:decimal(?TL_Age) <= xsd:decimal(${maxYear})
      )
    )
  )
}`;

    const searchParams = new URLSearchParams();
    searchParams.set("action", "new");
    searchParams.set("code", query);
    navigate({ pathname: "/queries", search: `?${searchParams.toString()}` });
  }

  return (
    <div className="mapRoot">
      <div className="mapHeader">
        <div className="mapHeaderTitle">
          <div className="mapHeaderH1">Map Visualizer</div>
          <div className="mapHeaderSub">Explore archaeological sites and filter by date range.</div>
        </div>
      </div>

      <div className="mapGrid">
        <section className="mapCard mapCardMain">
          {(loading || initialLoading) && (
            <div className="mapToast">{initialLoading ? "Loading sites..." : "Positioning..."}</div>
          )}

          <div className="mapTopbar">
            <div className="mapTopbarLeft">
              <SearchBar onSelect={handleSelect} />
              <div className="mapHint">Search for a site to center the map.</div>
            </div>

            <div className="mapTopbarRight">
              <div className="modeButtons">
                <button
                  className={`modeBtn ${interactionMode === "click" ? "active" : ""}`}
                  onClick={() => setInteractionMode("click")}
                  title="Click mode"
                >
                  <IconArrowsMove size={16} />
                  <span>Move</span>
                </button>
                <button
                  className={`modeBtn ${interactionMode === "area" ? "active" : ""}`}
                  onClick={() => setInteractionMode("area")}
                  title="Area mode"
                >
                  <IconRectangle size={16} />
                  <span>Area</span>
                </button>
              </div>

              <div className="modeButtons">
                <button
                  className={`modeBtn ${!showDatesCount ? "active" : ""}`}
                  onClick={() => setShowDatesCount(false)}
                  title="Show by sites"
                >
                  <span className="modeBtnCircle" />
                  <span>Sites</span>
                </button>
                <button
                  className={`modeBtn ${showDatesCount ? "active" : ""}`}
                  onClick={() => setShowDatesCount(true)}
                  title="Show by datings"
                >
                  <span className="modeBtnSquare" />
                  <span>Datings</span>
                </button>
              </div>
            </div>
          </div>

          <div className="mapCanvas">
            <Map
              markers={markers}
              center={viewCenter}
              minYear={dateRange[0]}
              maxYear={dateRange[1]}
              showDatesCount={showDatesCount}
              interactionMode={interactionMode}
              onViewInQueries={handleViewInQueries}
              onAreaSelect={handleAreaSelect}
            />
          </div>

          <div className="mapSliderCard">
            <div className="mapSliderRow">
              <span className="mapSliderLabel">TIME RANGE</span>
              <span className="mapSliderValue">
                {formatYear(dateRange[0])} — {formatYear(dateRange[1])}
              </span>
            </div>

            <div className="mapSliderWrap">
              <div className="mapSliderInner">
                <DatingTicks years={allDatingYears} min={MIN_LIMIT} max={MAX_LIMIT} />
                <Slider
                  range
                  min={MIN_LIMIT}
                  max={MAX_LIMIT}
                  step={50}
                  marks={sliderMarks}
                  value={dateRange as any}
                  onChange={(val) => setDateRange(val as number[])}
                />
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
