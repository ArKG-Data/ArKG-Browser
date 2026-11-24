import { useState, useEffect, useMemo } from "react";
import SearchBar from "./SearchBar";
import { sparqlQuery } from "./sparql";
import Map, { isMarkerVisible } from "./Map";
import type { MapPoint, BBox } from "./Map";
import { useNavigate } from "react-router-dom";
import {
  IconArrowsMove,
  IconRectangle,
  IconMapPin,
  IconInfoCircle,
  IconChevronDown,
} from "@tabler/icons-react";
import Slider from "rc-slider";
import "rc-slider/assets/index.css";
import "./map.css";

type TimeMode = "BCE/CE" | "BP";

// "Presente" fijo en 1950 (convención de fechados 14C).
// Eje interno del slider: año en escala BCE/CE (negativo = BCE). BP = PRESENT - año.
const PRESENT = 1950;

const MODE_LIMITS: Record<TimeMode, { min: number; max: number }> = {
  BP: { min: PRESENT - 14000, max: PRESENT }, // 14k BP → presente (0 BP)
  "BCE/CE": { min: -12000, max: PRESENT }, // 12k BCE → presente (1950 CE)
};

// Un fechado es 14C o TL (excluyentes).
//  - 14C: BP = 14C_age            → año BCE/CE = 1950 - 14C_age
//  - TL:  año BCE/CE = TL_Age_AC_DC → BP = 1950 - TL_Age_AC_DC
function parseYear(c14: string | undefined, tl: string | undefined): number | null {
  if (c14) {
    const age = parseFloat(c14);
    if (!isNaN(age)) return PRESENT - age;
  }
  if (tl) {
    const year = parseFloat(tl);
    if (!isNaN(year)) return year;
  }
  return null;
}

function formatYear(y: number, mode: TimeMode): string {
  if (y === PRESENT) return "Present";
  if (mode === "BCE/CE") {
    if (y === 0) return "0";
    return y < 0 ? `${Math.abs(y)} BCE` : `${y} CE`;
  }
  return `${PRESENT - y} BP (Uncal.)`;
}

const MARK_STYLE = {
  fontSize: "9px",
  color: "rgba(59,130,246,0.95)",
  fontWeight: 700,
  marginTop: "6px",
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
};

const MARK_STEP = 2000;

// Marcas en valores redondos de la escala de cada modo.
function generateMarks(mode: TimeMode) {
  const { min, max } = MODE_LIMITS[mode];
  const marks: Record<number, { style: typeof MARK_STYLE; label: string }> = {};
  const add = (pos: number, label: string) => {
    marks[pos] = { style: MARK_STYLE, label };
  };

  if (mode === "BP") {
    for (let bp = PRESENT - min; bp > 0; bp -= MARK_STEP) {
      add(PRESENT - bp, `${bp / 1000}k BP`);
    }
  } else {
    for (let y = min; y < max; y += MARK_STEP) {
      if (y === 0) add(y, "0");
      else add(y, y < 0 ? `${Math.abs(y) / 1000}k BCE` : `${y / 1000}k CE`);
    }
  }

  add(max, "Present");
  return marks;
}

const TIMELINE_DISCLAIMER = [
  "To include 14C and TL dates in a single timeline, some compromises were necessary.",
  "In both timelines, the present is set to 1950 CE.",
  "In the BP timeline: 14C dates are plotted using their \"14C_age\" values, without any calibration; TL dates are converted to BP by subtracting \"TL_Age_AC_DC\" from 1950. This BP value may differ from the BP value reported by the laboratory, as the latter is calculated using the reference year specified in the laboratory report.",
  "In the BCE/CE timeline: 14C dates are obtained by subtracting \"14C_age\" from 1950; TL dates are plotted using their \"TL_Age_AC_DC\" values directly.",
  "Given these compromises, the information shown is for reference purposes only. Dates near the limits of the selected time range may be excluded or misplaced, so results should be checked by the user.",
  "Because 14C ages are uncalibrated, their conversion to the BCE/CE scale represents only a change of scale and does not constitute a true calendar date.",
  "\"TL_Age_AC_DC\" is expressed in calendar years CE, with positive values corresponding to CE and negative values to BCE.",
];

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
      {uniq.map((y) => {
        const pct = ((y - min) / (max - min)) * 100;
        return (
          <div
            key={y}
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

const QUERY_PREFIXES = `PREFIX :      <https://arkg.cl/>
PREFIX arkgp: <https://arkg.cl/property/>
PREFIX wd:    <http://www.wikidata.org/entity/>
PREFIX wdt:   <http://www.wikidata.org/prop/direct/>
PREFIX rdfs:  <http://www.w3.org/2000/01/rdf-schema#>
PREFIX rdf:   <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX xsd:   <http://www.w3.org/2001/XMLSchema#>`;

const DATING_SELECT = `SELECT ?Site ?Dating ?Material ?Method ?MethodLabel ?14C_Age ?TL_Age ?SD (GROUP_CONCAT(DISTINCT ?Ref; separator=", ") AS ?References)`;

const DATING_GROUP_BY = `GROUP BY ?Site ?Dating ?Material ?Method ?MethodLabel ?14C_Age ?TL_Age ?SD`;

function datingPattern(minYear: number, maxYear: number): string {
  return `
    ?s rdf:type :Fechado ;
       rdfs:label ?Dating ;
       wdt:P9047 ?sitioURI .

    OPTIONAL { ?s arkgp:sd ?SD . }
    OPTIONAL { ?s wdt:P1343 ?Ref . }
    OPTIONAL {
      ?s wdt:P186 ?materialURI .
      ?materialURI rdfs:label ?Material .
    }
    OPTIONAL {
      ?s arkgp:dating_method ?Method .
      ?Method rdfs:label ?MethodLabel .
    }
    OPTIONAL { ?s arkgp:14C_age ?14C_Age . }
    OPTIONAL { ?s arkgp:TL_Age_AC_DC ?TL_Age . }

    BIND(${PRESENT} - ?14C_Age AS ?C14_Year)

    FILTER(
      (!BOUND(?14C_Age) && !BOUND(?TL_Age))
      ||
      (BOUND(?14C_Age) &&
        ?C14_Year >= xsd:decimal(${minYear}) &&
        ?C14_Year <= xsd:decimal(${maxYear}))
      ||
      (BOUND(?TL_Age) &&
        ?TL_Age >= xsd:decimal(${minYear}) &&
        ?TL_Age <= xsd:decimal(${maxYear}))
    )`;
}

export default function MapPage() {
  const navigate = useNavigate();

  const [allDatingYears, setAllDatingYears] = useState<number[]>([]);
  const [markers, setMarkers] = useState<MapPoint[]>([]);
  const [viewCenter, setViewCenter] = useState<[number, number] | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [interactionMode, setInteractionMode] = useState<"click" | "area">("click");

  const [timeMode, setTimeMode] = useState<TimeMode>("BP");
  const { min: MIN_LIMIT, max: MAX_LIMIT } = MODE_LIMITS[timeMode];

  const [dateRange, setDateRange] = useState<number[]>([MODE_LIMITS.BP.min, MODE_LIMITS.BP.max]);
  const [showDatesCount, setShowDatesCount] = useState(false);
  const [showEmptySites, setShowEmptySites] = useState(false);
  const [emptyMarkers, setEmptyMarkers] = useState<MapPoint[] | null>(null);
  const [loadingEmpty, setLoadingEmpty] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  const sliderMarks = useMemo(() => generateMarks(timeMode), [timeMode]);

  // Al cambiar de modo se mantiene el rango elegido, recortado a los límites del nuevo modo.
  // Si un extremo estaba en el borde del modo anterior, pasa al borde del nuevo.
  function handleTimeModeChange(next: TimeMode) {
    if (next === timeMode) return;
    const prev = MODE_LIMITS[timeMode];
    const lim = MODE_LIMITS[next];
    setDateRange(([lo, hi]) => [
      lo <= prev.min ? lim.min : Math.min(Math.max(lo, lim.min), lim.max),
      hi >= prev.max ? lim.max : Math.max(Math.min(hi, lim.max), lim.min),
    ]);
    setTimeMode(next);
  }

  useEffect(() => {
    async function loadAllSites() {
      const query = `
        PREFIX : <https://arkg.cl/>
        PREFIX arkgp: <https://arkg.cl/property/>
        PREFIX wdt: <http://www.wikidata.org/prop/direct/>
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

        SELECT ?sitioURI ?sitio ?x ?y ?a ?t
        WHERE {
          ?s a :Fechado ;
            wdt:P9047 ?sitioURI .
          ?sitioURI rdfs:label ?sitio ;
                    arkgp:x ?x ;
                    arkgp:y ?y .
          OPTIONAL { ?s arkgp:14C_age ?a . }
          OPTIONAL { ?s arkgp:TL_Age_AC_DC ?t . }
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

  useEffect(() => {
    if (!showEmptySites || emptyMarkers !== null || loadingEmpty) return;

    async function loadEmptySites() {
      setLoadingEmpty(true);
      const query = `
        PREFIX : <https://arkg.cl/>
        PREFIX arkgp: <https://arkg.cl/property/>
        PREFIX wdt: <http://www.wikidata.org/prop/direct/>
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

        SELECT ?sitioURI ?sitio ?x ?y
        WHERE {
          ?sitioURI a :ArchSite ;
                    rdfs:label ?sitio ;
                    arkgp:x ?x ;
                    arkgp:y ?y .
          FILTER NOT EXISTS { ?f a :Fechado ; wdt:P9047 ?sitioURI . }
        }
      `;

      try {
        const data = await sparqlQuery(query);
        const list: MapPoint[] = data.results.bindings
          .map((b: any, index: number) => ({
            lat: parseFloat(b.y.value),
            lng: parseFloat(b.x.value),
            label: b.sitio.value,
            iri: b.sitioURI.value,
            id: `empty-${index}`,
            years: [],
            dateCount: 0,
          }))
          .filter((m: MapPoint) => !isNaN(m.lat) && !isNaN(m.lng));
        setEmptyMarkers(list);
      } catch (e) {
        console.error("Error cargando sitios sin fechados:", e);
        setShowEmptySites(false);
      } finally {
        setLoadingEmpty(false);
      }
    }

    loadEmptySites();
  }, [showEmptySites, emptyMarkers, loadingEmpty]);

  const visibleMarkers = useMemo(
    () => (showEmptySites && emptyMarkers ? [...markers, ...emptyMarkers] : markers),
    [markers, emptyMarkers, showEmptySites]
  );

  const searchableMarkers = useMemo(
    () =>
      visibleMarkers.filter((m) =>
        isMarkerVisible(m, dateRange[0], dateRange[1], showDatesCount)
      ),
    [visibleMarkers, dateRange, showDatesCount]
  );

  function handleSelect(site: MapPoint) {
    if (!isNaN(site.lat) && !isNaN(site.lng)) setViewCenter([site.lat, site.lng]);
  }

  function handleShowSites() {
    setShowDatesCount(false);
  }

  function handleShowDatings() {
    setShowDatesCount(true);
    setShowEmptySites(false);
  }

  function handleToggleEmptySites() {
    const next = !showEmptySites;
    setShowEmptySites(next);
    if (next) setShowDatesCount(false);
  }

  function goToQueries(query: string) {
    const searchParams = new URLSearchParams();
    searchParams.set("action", "new");
    searchParams.set("code", query);
    navigate({ pathname: "/queries", search: `?${searchParams.toString()}` });
  }

  function handleViewInQueries(site: MapPoint, minYear: number, maxYear: number) {
    if (!site?.iri) return;

    if (!site.years || site.years.length === 0) {
      goToQueries(`${QUERY_PREFIXES}

SELECT ?Site ?Comuna ?Region ?x ?y ?mapLink
WHERE {
  BIND(<${site.iri}> AS ?SiteIRI)
  ?SiteIRI rdfs:label ?Site ;
           arkgp:x ?x ;
           arkgp:y ?y .
  OPTIONAL { ?SiteIRI wdt:P131 ?comunaURI . ?comunaURI rdfs:label ?Comuna . }
  OPTIONAL {
    ?SiteIRI wdt:P131+ ?regionURI .
    ?regionURI rdfs:label ?Region .
    FILTER(CONTAINS(?Region, "(región de Chile)"))
  }
  BIND(IRI(CONCAT("https://www.google.com/maps/search/?api=1&query=", STR(?y), ",", STR(?x))) AS ?mapLink)
}`);
      return;
    }

    goToQueries(`${QUERY_PREFIXES}

${DATING_SELECT}
WHERE {
  BIND(<${site.iri}> AS ?sitioURI)
  ?sitioURI rdfs:label ?Site .
${datingPattern(minYear, maxYear)}
}
${DATING_GROUP_BY}`);
  }

  function handleAreaSelect(bbox: BBox) {
    const { minLng, maxLng, minLat, maxLat } = bbox;
    const minYear = dateRange[0];
    const maxYear = dateRange[1];

    const includeEmpty = showEmptySites && !showDatesCount;

    const sitePattern = includeEmpty
      ? `
  {
${datingPattern(minYear, maxYear)}
  }
  UNION
  {
    ?sitioURI rdf:type :ArchSite .
    FILTER NOT EXISTS { ?f rdf:type :Fechado ; wdt:P9047 ?sitioURI . }
  }`
      : datingPattern(minYear, maxYear);

    goToQueries(`${QUERY_PREFIXES}

${DATING_SELECT}
WHERE {
  ?sitioURI rdf:type :ArchSite ;
            rdfs:label ?Site ;
            arkgp:x ?x ;
            arkgp:y ?y .

  FILTER(
    ?x >= xsd:decimal(${minLng}) &&
    ?x <= xsd:decimal(${maxLng}) &&
    ?y >= xsd:decimal(${minLat}) &&
    ?y <= xsd:decimal(${maxLat})
  )
${sitePattern}
}
${DATING_GROUP_BY}`);
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
          {(initialLoading || loadingEmpty) && (
            <div className="mapToast">
              {initialLoading ? "Loading sites..." : "Loading sites without datings..."}
            </div>
          )}

          <div className="mapTopbar">
            <div className="mapTopbarLeft">
              <SearchBar items={searchableMarkers} onSelect={handleSelect} />
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
                  onClick={handleShowSites}
                  title="Show by sites"
                >
                  <span className="modeBtnCircle" />
                  <span>Sites</span>
                </button>
                <button
                  className={`modeBtn ${showDatesCount ? "active" : ""}`}
                  onClick={handleShowDatings}
                  title="Show by datings"
                >
                  <span className="modeBtnSquare" />
                  <span>Datings</span>
                </button>
              </div>

              <div className="modeButtons">
                <button
                  className={`modeBtn ${showEmptySites ? "active" : ""}`}
                  onClick={handleToggleEmptySites}
                  title="Show sites without datings (CMN registry)"
                >
                  <IconMapPin size={16} />
                  <span>Empty sites</span>
                </button>
              </div>
            </div>
          </div>

          <div className="mapCanvas">
            <Map
              markers={visibleMarkers}
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
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span className="mapSliderLabel">TIME RANGE</span>
                <div className="modeButtons">
                  <button
                    className={`modeBtn ${timeMode === "BP" ? "active" : ""}`}
                    onClick={() => handleTimeModeChange("BP")}
                  >
                    BP
                  </button>
                  <button
                    className={`modeBtn ${timeMode === "BCE/CE" ? "active" : ""}`}
                    onClick={() => handleTimeModeChange("BCE/CE")}
                  >
                    BCE/CE
                  </button>
                </div>
              </div>
              <span className="mapSliderValue">
                {formatYear(dateRange[0], timeMode)} to {formatYear(dateRange[1], timeMode)}
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

            <button
              className="timelineInfoBtn"
              onClick={() => setShowDisclaimer((v) => !v)}
              aria-expanded={showDisclaimer}
              aria-controls="timeline-disclaimer"
            >
              <IconInfoCircle size={14} />
              <span>About the timeline</span>
              <IconChevronDown
                size={14}
                className={`timelineInfoChevron ${showDisclaimer ? "open" : ""}`}
              />
            </button>

            {showDisclaimer && (
              <div id="timeline-disclaimer" className="timelineDisclaimer">
                {TIMELINE_DISCLAIMER.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}