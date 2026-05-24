import * as React from "react";
import Map, {
  NavigationControl,
  MapRef,
  Source,
  Layer,
  MapLayerMouseEvent,
  Popup,
} from "react-map-gl/maplibre";
import type { SymbolLayer, CircleLayer } from "react-map-gl/maplibre";

const MAP_STYLE = `https://api.maptiler.com/maps/satellite/style.json?key=${(import.meta as any).env.VITE_MAPTILER_KEY}`;

const PADDING = 15;
// @ts-ignore
const SAFE_BOUNDS: [number, number, number, number] = [
  -73.9860855695 - PADDING,
  -41.8631914258 - PADDING / 2,
  -68.3666666666667 + PADDING,
  -29.7220055555556 + PADDING / 2,
];

export type MapPoint = {
  lat: number;
  lng: number;
  label: string;
  id: string;
  iri: string;
  years?: number[];
  dateCount: number;
};

export type BBox = {
  minLng: number;
  maxLng: number;
  minLat: number;
  maxLat: number;
};

type MapProps = {
  markers: MapPoint[];
  center: [number, number] | null;
  minYear: number;
  maxYear: number;
  showDatesCount: boolean;
  interactionMode: "click" | "area";
  onViewInQueries: (site: MapPoint, minYear: number, maxYear: number) => void;
  onAreaSelect: (bbox: BBox) => void;
};

type PopupInfo = {
  lat: number;
  lng: number;
  label: string;
  iri: string;
  id: string;
  years?: number[];
  dateCount: number;
};

type AreaPopupInfo = {
  lat: number;
  lng: number;
  bbox: BBox;
};

export default function MapComponent({
  markers,
  center,
  minYear,
  maxYear,
  showDatesCount,
  interactionMode,
  onViewInQueries,
  onAreaSelect,
}: MapProps) {
  const mapRef = React.useRef<MapRef>(null);
  const [popupInfo, setPopupInfo] = React.useState<PopupInfo | null>(null);
  const [areaPopup, setAreaPopup] = React.useState<AreaPopupInfo | null>(null);

  const dragRef = React.useRef<{
    active: boolean;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);
  const [selectionRect, setSelectionRect] = React.useState<{
    left: number; top: number; width: number; height: number;
  } | null>(null);
  const [frozenRect, setFrozenRect] = React.useState<{
    left: number; top: number; width: number; height: number;
  } | null>(null);
  const overlayRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (interactionMode === "area") setPopupInfo(null);
    if (interactionMode === "click") { setAreaPopup(null); setFrozenRect(null); }
  }, [interactionMode]);

  const filteredMarkers = React.useMemo(() => {
    return markers.filter((m) => {
      if (!m.years || !Array.isArray(m.years)) return false;
      return m.years.some(year => year >= minYear && year <= maxYear);
    });
  }, [markers, minYear, maxYear]);

  const geojson = React.useMemo(() => {
    return {
      type: "FeatureCollection",
      features: filteredMarkers.map((m) => {
        const filteredCount = m.years
          ? m.years.filter(y => y >= minYear && y <= maxYear).length
          : 0;
        return {
          type: "Feature",
          properties: {
            id: m.id,
            label: m.label,
            iri: m.iri,
            lat: m.lat,
            lng: m.lng,
            years: m.years,
            dateCount: filteredCount,
          },
          geometry: {
            type: "Point",
            coordinates: [m.lng, m.lat],
          },
        };
      }),
    };
  }, [filteredMarkers, minYear, maxYear]);

  const clusterLayer: SymbolLayer = React.useMemo(
    () => ({
      id: "clusters",
      type: "symbol",
      source: "sites",
      filter: ["has", "point_count"],
      layout: {
        "icon-image": "circle",
        "icon-allow-overlap": true,
        "icon-size": [
          "step",
          ["get", "point_count"],
          4.0,
          20, 5.6,
          100, 7.0,
        ] as any,
        "text-field": "{point_count_abbreviated}",
        "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
        "text-size": 18,
        "text-allow-overlap": true,
        "text-offset": [0, 0],
      },
      paint: {
        "icon-color": [
          "step",
          ["get", "point_count"],
          "#2c7899",
          10, "#b3a124",
          50, "#db65ad",
        ] as any,
        "icon-halo-color": "#ffffff",
        "icon-halo-width": 1,
        "text-color": "#ffffff",
        "text-halo-color": "rgba(0, 0, 0, 0.5)",
        "text-halo-width": 1,
      },
    }),
    []
  );

  const clusterSquareLayer: SymbolLayer = React.useMemo(
    () => ({
      id: "clusters-square",
      type: "symbol",
      source: "sites",
      filter: ["has", "point_count"],
      layout: {
        "icon-image": "square",
        "icon-allow-overlap": true,
        "icon-size": [
          "step",
          ["get", "dates_sum"],
          5.0,
          50, 7.0,
          500, 9.0,
        ] as any,
        "text-field": ["to-string", ["get", "dates_sum"]],  // ← aquí
        "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
        "text-size": 18,
        "text-allow-overlap": true,
        "text-offset": [0, 0],
      },
      paint: {
        "icon-color": [
          "step",
          ["get", "dates_sum"],
          "#2c7899",
          20, "#b3a124",
          100, "#db65ad",
        ] as any,
        "icon-halo-color": "#ffffff",
        "icon-halo-width": 1,
        "text-color": "#ffffff",
        "text-halo-color": "rgba(0, 0, 0, 0.5)",
        "text-halo-width": 1,
      },
    }),
    []
  );

  const unclusteredPointCircleLayer: CircleLayer = React.useMemo(
    () => ({
      id: "unclustered-point-circle",
      type: "circle",
      source: "sites",
      filter: ["all", ["!", ["has", "point_count"]], ["==", ["get", "isSiteMode"], 1]],
      paint: {
        "circle-color": "#ea580c",
        "circle-radius": 10,
        "circle-stroke-width": 1,
        "circle-stroke-color": "#fff",
      },
    }),
    []
  );

  const unclusteredPointSquareLayer: SymbolLayer = React.useMemo(
    () => ({
      id: "unclustered-point-square",
      type: "symbol",
      source: "sites",
      filter: ["all", ["!", ["has", "point_count"]], ["==", ["get", "isSiteMode"], 0]],
      layout: {
        "icon-image": "square",
        "icon-allow-overlap": true,
        "text-allow-overlap": true,

        "icon-size": 2.8,

        "text-field": ["to-string", ["get", "dateCount"]],
        "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
        "text-size": 14,
        "text-offset": [0, 0],
      },
      paint: {
        "icon-color": "#ea580c",
        "icon-halo-color": "#ffffff",
        "icon-halo-width": 1,

        "text-color": "#ffffff",
        "text-halo-color": "rgba(0, 0, 0, 0.55)",
        "text-halo-width": 1,
        "text-halo-blur": 0.5,
      },
    }),
    []
  );

  const dataWithMode = React.useMemo(() => {
    return {
      ...geojson,
      features: geojson.features.map((f: any) => ({
        ...f,
        properties: {
          ...f.properties,
          isSiteMode: showDatesCount ? 0 : 1,
        },
      })),
    };
  }, [geojson, showDatesCount]);

  React.useEffect(() => {
    if (center && mapRef.current) {
      mapRef.current.flyTo({
        center: [center[1], center[0]],
        zoom: 14,
        speed: 1.2,
        curve: 1,
      });
    }
  }, [center]);

  const onMapLoad = React.useCallback(() => {
    if (!mapRef.current) return;
    const map = mapRef.current.getMap();
    const size = 64;

    const c = document.createElement("canvas");
    c.width = size; c.height = size;
    const ctx1 = c.getContext("2d")!;
    ctx1.fillStyle = "#ffffff";
    ctx1.beginPath();
    ctx1.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx1.fill();
    map.addImage("circle", ctx1.getImageData(0, 0, size, size));

    const s = document.createElement("canvas");
    s.width = size; s.height = size;
    const ctx2 = s.getContext("2d")!;
    ctx2.fillStyle = "#ffffff";
    ctx2.fillRect(0, 0, size, size);
    map.addImage("square", ctx2.getImageData(0, 0, size, size));
  }, []);

  const onClick = (event: MapLayerMouseEvent) => {
    if (!mapRef.current) return;
    const feature = event.features?.[0];
    if (!feature) return;

    const clusterId = feature.properties?.cluster_id;

    if (clusterId) {
      const geometry = feature.geometry as any;
      const coordinates = geometry.coordinates;
      const currentZoom = mapRef.current.getZoom();
      const MAX_ZOOM = 18;
      const targetZoom = Math.min(currentZoom + 2, MAX_ZOOM);

      mapRef.current.easeTo({
        center: [coordinates[0], coordinates[1]],
        zoom: targetZoom,
        duration: 500,
      });
      return;
    }

    const id = feature.layer?.id;
    const isUnclustered =
      id === "unclustered-point-circle" || id === "unclustered-point-square";

    if (isUnclustered) {
      const props: any = feature.properties;
      const pointData: PopupInfo = {
        id: props?.id,
        label: props?.label,
        iri: props?.iri,
        lat: Number(props?.lat),
        lng: Number(props?.lng),
        years: Array.isArray(props?.years) ? props.years.map(Number) : undefined,
        dateCount: Number(props?.dateCount ?? 0),
      };
      setPopupInfo(pointData);
      mapRef.current.easeTo({
        center: [pointData.lng, pointData.lat],
        zoom: 16,
        duration: 900,
      });
    }
  };
  const handleOverlayMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!overlayRef.current || !mapRef.current) return;
    e.preventDefault();
    setAreaPopup(null);
    setFrozenRect(null);
    mapRef.current.getMap().dragPan.enable();
    const rect = overlayRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    dragRef.current = { active: true, startX: x, startY: y, currentX: x, currentY: y };
    mapRef.current.getMap().dragPan.disable();
    mapRef.current.getMap().scrollZoom.disable();
  };

  const handleOverlayMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!dragRef.current?.active || !overlayRef.current) return;
    const rect = overlayRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    dragRef.current.currentX = x;
    dragRef.current.currentY = y;
    setSelectionRect({
      left: Math.min(dragRef.current.startX, x),
      top: Math.min(dragRef.current.startY, y),
      width: Math.abs(x - dragRef.current.startX),
      height: Math.abs(y - dragRef.current.startY),
    });
  };

  const handleOverlayMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!dragRef.current?.active || !mapRef.current || !overlayRef.current) return;
    mapRef.current.getMap().dragPan.enable();
    mapRef.current.getMap().scrollZoom.enable();

    const rect = overlayRef.current.getBoundingClientRect();
    const x2 = e.clientX - rect.left;
    const y2 = e.clientY - rect.top;
    const { startX, startY } = dragRef.current;
    dragRef.current = null;
    setSelectionRect(null);

    if (Math.abs(x2 - startX) < 5 && Math.abs(y2 - startY) < 5) return;

    const map = mapRef.current.getMap();
    const sw = map.unproject([Math.min(startX, x2), Math.max(startY, y2)]);
    const ne = map.unproject([Math.max(startX, x2), Math.min(startY, y2)]);

    const bbox: BBox = { minLng: sw.lng, maxLng: ne.lng, minLat: sw.lat, maxLat: ne.lat };

    mapRef.current.getMap().dragPan.disable();

    setFrozenRect({
      left: Math.min(startX, x2),
      top: Math.min(startY, y2),
      width: Math.abs(x2 - startX),
      height: Math.abs(y2 - startY),
    });

    setAreaPopup({
      lng: ne.lng,
      lat: (sw.lat + ne.lat) / 2,
      bbox,
    });
  };

  const handleOverlayMouseLeave = () => {
    if (!dragRef.current?.active || !mapRef.current) return;
    mapRef.current.getMap().dragPan.enable();
    mapRef.current.getMap().scrollZoom.enable();
    dragRef.current = null;
    setSelectionRect(null);
  };

  return (
    <div style={{ height: "100%", width: "100%", position: "relative" }}>

      {interactionMode === "area" && (
        <div
          ref={overlayRef}
          onMouseDown={handleOverlayMouseDown}
          onMouseMove={handleOverlayMouseMove}
          onMouseUp={handleOverlayMouseUp}
          onMouseLeave={handleOverlayMouseLeave}
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 5,
            cursor: areaPopup ? "default" : "crosshair",
            pointerEvents: areaPopup ? "none" : "auto",
          }}
        >
          {selectionRect && (
            <div
              style={{
                position: "absolute",
                left: selectionRect.left,
                top: selectionRect.top,
                width: selectionRect.width,
                height: selectionRect.height,
                border: "2px dashed rgba(147, 197, 253, 0.9)",
                background: "rgba(59, 130, 246, 0.12)",
                pointerEvents: "none",
                borderRadius: 2,
              }}
            />
          )}
        </div>
      )}

      {frozenRect && areaPopup && (
        <div
          style={{
            position: "absolute",
            left: frozenRect.left,
            top: frozenRect.top,
            width: frozenRect.width,
            height: frozenRect.height,
            border: "2px dashed rgba(147, 197, 253, 0.6)",
            background: "rgba(59, 130, 246, 0.06)",
            pointerEvents: "none",
            zIndex: 2,
            borderRadius: 2,
          }}
        />
      )}

      <div className="mapLegend">
        <div className="mapLegendItem">
          <span className="legendCircle" />
          <span className="legendLabel">Sites</span>
        </div>
        <div className="mapLegendItem">
          <span className="legendSquare">1</span>
          <span className="legendLabel">Datings</span>
        </div>
      </div>

      <Map
        ref={mapRef}
        onLoad={onMapLoad}
        fadeDuration={0}
        initialViewState={{ longitude: -70.6693, latitude: -33.4489, zoom: 4 }}
        style={{ width: "100%", height: "100%" }}
        mapStyle={MAP_STYLE}
        // @ts-ignore
        maxBounds={SAFE_BOUNDS}
        onClick={onClick}
        interactiveLayerIds={[
          "clusters",
          "clusters-square",
          "unclustered-point-circle",
          "unclustered-point-square",
        ]}
      >
        <NavigationControl position="top-right" />

        <Source
          id="sites"
          type="geojson"
          // @ts-ignore
          data={dataWithMode}
          cluster={true}
          clusterMaxZoom={14}
          clusterRadius={50}
          clusterProperties={{ dates_sum: ["+", ["get", "dateCount"]] }}
        >
          {!showDatesCount && <Layer {...clusterLayer} />}
          {showDatesCount && <Layer {...clusterSquareLayer} />}
          {!showDatesCount && <Layer {...unclusteredPointCircleLayer} />}
          {showDatesCount && <Layer {...unclusteredPointSquareLayer} />}
        </Source>

        {popupInfo && (
          <Popup
            longitude={popupInfo.lng}
            latitude={popupInfo.lat}
            anchor="bottom"
            onClose={() => setPopupInfo(null)}
            closeOnClick={false}
            className="sitePopup"
            offset={12}
          >
            <div className="popupInner">
              <div className="popupSiteName">{popupInfo.label}</div>
              <div className="popupMeta">
                {popupInfo.dateCount} dating{popupInfo.dateCount !== 1 ? "s" : ""} in range
              </div>
              <button
                className="popupQueryBtn"
                onClick={() =>
                  onViewInQueries(
                    {
                      id: popupInfo.id,
                      label: popupInfo.label,
                      iri: popupInfo.iri,
                      lat: popupInfo.lat,
                      lng: popupInfo.lng,
                      years: popupInfo.years,
                      dateCount: popupInfo.dateCount,
                    },
                    minYear,
                    maxYear
                  )
                }
              >
                View in Queries
              </button>
            </div>
          </Popup>
        )}

        {areaPopup && (
          <Popup
            longitude={areaPopup.lng}
            latitude={areaPopup.lat}
            anchor="left"
            onClose={() => { setAreaPopup(null); setFrozenRect(null); mapRef.current?.getMap().dragPan.enable(); }}
            closeOnClick={false}
            className="sitePopup"
            offset={12}
          >
            <div className="popupInner">
              <div className="popupSiteName">Selected Area</div>
              <div className="popupMeta">Query all sites within this region</div>
              <button
                className="popupQueryBtn"
                onClick={() => {
                  mapRef.current?.getMap().dragPan.enable();
                  onAreaSelect(areaPopup.bbox);
                  setAreaPopup(null);
                  setFrozenRect(null);
                }}
              >
                View in Queries
              </button>
            </div>
          </Popup>
        )}
      </Map>
    </div>
  );
}
