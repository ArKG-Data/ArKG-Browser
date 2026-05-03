import { useState, useEffect, useMemo } from "react";
import SearchBar from "./SearchBar";
import { sparqlQuery } from "./sparql";
import type { MapPoint } from "./Map";

import DownloadCSVButton from "./DownloadCsv";
import InyectQuery from "./InyectQuery";

import Slider from "rc-slider";
import "rc-slider/assets/index.css";

import Map from "./Map";
import "./map.css";

type FechadoData = {
  label: string;
  reference: string;
  material: string;
  pointOfTime: string;
  method: string;
  age: string;
  tlAge: string;
};

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

    if (i == 2000) {
      console.log("sin marca");
    }
    else {
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
  const [allDatingYears, setAllDatingYears] = useState<number[]>([]);

  const [markers, setMarkers] = useState<MapPoint[]>([]);
  const [viewCenter, setViewCenter] = useState<[number, number] | null>(null);

  const [selectedSiteName, setSelectedSiteName] = useState<string | null>(null);
  const [selectedSite, setSelectedSite] = useState<MapPoint | null>(null);
  const [fechados, setFechados] = useState<FechadoData[]>([]);
  const [loadingFechados, setLoadingFechados] = useState(false);

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const MIN_LIMIT = -12000;
  const MAX_LIMIT = 2026;

  const [dateRange, setDateRange] = useState<number[]>([MIN_LIMIT, MAX_LIMIT]);
  const [showDatesCount, setShowDatesCount] = useState(false);

  const formatYear = (y: number) => (y < 0 ? `${Math.abs(y)} BCE` : `${y} CE`);

  const sliderMarks = useMemo(
    () => generateMarks(MIN_LIMIT, MAX_LIMIT),
    [MIN_LIMIT, MAX_LIMIT]
  );

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
          .map((site, index) => {
            return {
              lat: site.lat,
              lng: site.lng,
              label: site.label,
              iri: site.iri,
              id: `site-${index}`,
              years: site.years,
              dateCount: site.years.length,
            };
          })
          .filter((m) => !isNaN(m.lat) && !isNaN(m.lng) && (Array.isArray(m.years) ? m.years.length > 0 : false));

        setMarkers(siteMarkers);
      } catch (e) {
        console.error("Error cargando sitios:", e);
      } finally {
        setInitialLoading(false);
      }
    }

    loadAllSites();
  }, []);

  async function handleMapClick(site: MapPoint) {
    const minYear = dateRange[0];
    const maxYear = dateRange[1];

    setSelectedSite(site);
    setSelectedSiteName(site.label);
    setFechados([]);
    setLoadingFechados(true);

    const query = `
      PREFIX :    <https://arkg.cl/>
      PREFIX wd:  <http://www.wikidata.org/entity/>
      PREFIX wdt: <http://www.wikidata.org/prop/direct/>
      PREFIX rdfs:<http://www.w3.org/2000/01/rdf-schema#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

      SELECT DISTINCT ?f ?r ?m ?d ?a ?t
      WHERE {
        ?s wdt:P9047 <${site.iri}> .
        ?s rdfs:label ?f .
        ?s rdf:type :Fechado .

        OPTIONAL { ?s wdt:P1343 ?r . }
        OPTIONAL {
          ?s wdt:P186 ?materialURI .
          ?materialURI rdfs:label ?m .
        }
        OPTIONAL { ?s :dating_method ?d . }
        OPTIONAL { ?s :14C_age ?a . }
        OPTIONAL { ?s :TL_Age_AC_DC ?t . }

        FILTER(
          (!BOUND(?a) && !BOUND(?t))
          ||
          (
            (BOUND(?a) &&
              (xsd:decimal(2026) - xsd:decimal(?a)) >= xsd:decimal(${minYear}) &&
              (xsd:decimal(2026) - xsd:decimal(?a)) <= xsd:decimal(${maxYear})
            )
            ||
            (BOUND(?t) &&
              xsd:decimal(?t) >= xsd:decimal(${minYear}) &&
              xsd:decimal(?t) <= xsd:decimal(${maxYear})
            )
          )
        )
      }
    `;

    try {
      const data = await sparqlQuery(query);
      const results: FechadoData[] = data.results.bindings.map((b: any) => ({
        label: b.f?.value || "Sin etiqueta",
        reference: b.r?.value || "-",
        material: b.m?.value || "-",
        method: b.d?.value || "-",
        age: b.a?.value || "-",
        tlAge: b.t?.value || "-",
      }));
      setFechados(results);
    } catch (error) {
      console.error("Error trayendo fechados", error);
    } finally {
      setLoadingFechados(false);
    }
  }


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
      console.error(e);
    } finally {
      setLoading(false);
    }
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
              <ToggleSwitch
                label="Show dating counts"
                checked={showDatesCount}
                onChange={setShowDatesCount}
              />
            </div>
          </div>

          <div className="mapCanvas">
            <Map
              markers={markers}
              center={viewCenter}
              onMarkerClick={handleMapClick}
              minYear={dateRange[0]}
              maxYear={dateRange[1]}
              showDatesCount={showDatesCount}
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

        <aside className="mapCardSide">
          <div className="sideTitle">Site Details</div>

          {!selectedSiteName ? (
            <div className="sideEmpty">Click a marker to view its datings.</div>
          ) : (
            <>
              <div className="sideSiteName">{selectedSiteName}</div>

              {loadingFechados ? (
                <div className="sideLoading">Fetching datings...</div>
              ) : fechados.length > 0 ? (
                <div className="sideTableContainer">
                  <div className="sideTableWrap">
                    <div className="buttonGroup">
                      <div className="downloadCSVButtonContainer">
                        <DownloadCSVButton fechados={fechados} selectedSiteName={selectedSiteName}/>
                      </div>
                      <div className="inyectQuerieButtonContainer">
                        <InyectQuery 
                          site={selectedSite}
                          minYear={dateRange[0]}
                          maxYear={dateRange[1]}
                        />
                      </div>
                    </div>
                    <div className="sideTableScroll">
                      <table className="sideTable">
                        <thead>
                          <tr>
                            <th>Datings</th>
                            <th>Material</th>
                            <th>Method</th>
                            <th>14C Age</th>
                            <th>TL Age</th>
                            <th>Ref</th>
                          </tr>
                        </thead>
                        <tbody>
                          {fechados.map((item, i) => (
                            <tr key={i}>
                              <td>{item.label}</td>
                              <td>{item.material}</td>
                              <td>{item.method}</td>
                              <td>{item.age}</td>
                              <td>{item.tlAge}</td>
                              <td className="sideRef">{item.reference}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="sideEmpty">No hay fechados registrados.</div>
              )}
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
