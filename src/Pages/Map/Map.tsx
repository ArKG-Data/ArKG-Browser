import * as React from "react";
import Map, {
  NavigationControl,
  MapRef,
  Source,
  Layer,
  MapLayerMouseEvent,
} from "react-map-gl/maplibre";
import type { SymbolLayer, CircleLayer } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

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

type MapProps = {
  markers: MapPoint[];
  center: [number, number] | null;
  minYear: number;
  maxYear: number;
  showDatesCount: boolean;
  onMarkerClick?: (site: MapPoint) => void;
};

export default function MapComponent({
  markers,
  center,
  minYear,
  maxYear,
  showDatesCount,
  onMarkerClick,
}: MapProps) {
  const mapRef = React.useRef<MapRef>(null);

  const filteredMarkers = React.useMemo(() => {
    return markers.filter((m) => {
      if (!m.years || !Array.isArray(m.years)) return false;
      return m.years.some(year => year >= minYear && year <= maxYear);
    });
  }, [markers, minYear, maxYear]);

  const geojson = React.useMemo(() => {
    return {
      type: "FeatureCollection",
      features: filteredMarkers.map((m) => ({
        type: "Feature",
        properties: {
          id: m.id,
          label: m.label,
          iri: m.iri,
          lat: m.lat,
          lng: m.lng,
          years: m.years,
          dateCount: m.dateCount,
        },
        geometry: {
          type: "Point",
          coordinates: [m.lng, m.lat],
        },
      })),
    };
  }, [filteredMarkers]);

  const countProperty = showDatesCount ? "dates_sum" : "point_count";

  const clusterLayer: CircleLayer = React.useMemo(
    () => ({
      id: "clusters",
      type: "circle",
      source: "sites",
      filter: ["has", "point_count"],
      paint: {
        "circle-color": [
          "step",
          ["get", countProperty],
          "#2c7899",
          showDatesCount ? 20 : 10,
          "#b3a124",
          showDatesCount ? 100 : 50,
          "#db65ad",
        ],
        "circle-radius": [
          "step",
          ["get", countProperty],
          20,
          showDatesCount ? 50 : 20,
          30,
          showDatesCount ? 500 : 100,
          40,
        ],
        "circle-stroke-width": 1,
        "circle-stroke-color": "#fff",
      },
    }),
    [showDatesCount, countProperty]
  );

  const clusterCountLayer: SymbolLayer = React.useMemo(
    () => ({
      id: "cluster-count",
      type: "symbol",
      source: "sites",
      filter: ["has", "point_count"],
      layout: {
        "text-field": showDatesCount
          ? ["to-string", ["get", "dates_sum"]]
          : "{point_count_abbreviated}",
        "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
        "text-size": 16,
      },
      paint: {
        "text-color": "#ffffff",
        "text-halo-color": "rgba(0, 0, 0, 0.5)",
        "text-halo-width": 1,
        "text-halo-blur": 0.5,
      },
    }),
    [showDatesCount]
  );

  const unclusteredPointCircleLayer: CircleLayer = React.useMemo(
    () => ({
      id: "unclustered-point-circle",
      type: "circle",
      source: "sites",
      filter: ["all", ["!", ["has", "point_count"]], ["==", ["get", "isSiteMode"], 1]],
      paint: {
        "circle-color": "#ea580c",
        "circle-radius": 8,
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
      const daterange = [minYear, maxYear];
      console.log(daterange);
      const pointData: MapPoint = {
        id: props?.id,
        label: props?.label,
        iri: props?.iri,
        lat: Number(props?.lat),
        lng: Number(props?.lng),
        years: Array.isArray(props?.years) ? props.years.map(Number) : undefined,
        dateCount: Number(props?.dateCount ?? 0),
      };

      if (onMarkerClick) onMarkerClick(pointData);

      mapRef.current.easeTo({
        center: [pointData.lng, pointData.lat],
        zoom: 16,
        duration: 900,
      });
    }
  };

  return (
    <div style={{ height: "100%", width: "100%", position: "relative" }}>
      
      <div className="mapLegend">
        <div className="mapLegendItem">
          <span className="legendCircle" />
          <span className="legendLabel">Sitios</span>
        </div>

        <div className="mapLegendItem">
          <span className="legendSquare">1</span>
          <span className="legendLabel">Fechados</span>
        </div>
      </div>
      
      <Map
        ref={mapRef}
        initialViewState={{
          longitude: -70.6693,
          latitude: -33.4489,
          zoom: 4,
        }}
        style={{ width: "100%", height: "100%" }}
        mapStyle={MAP_STYLE}
        // @ts-ignore
        maxBounds={SAFE_BOUNDS}
        onClick={onClick}
        interactiveLayerIds={[
          "clusters",
          "cluster-count",
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
          clusterProperties={{
            dates_sum: ["+", ["get", "dateCount"]],
          }}
        >
          <Layer {...clusterLayer} />
          <Layer {...clusterCountLayer} />

          {!showDatesCount && <Layer {...unclusteredPointCircleLayer} />}

          {showDatesCount && <Layer {...unclusteredPointSquareLayer} />}
        </Source>
      </Map>
    </div>
  );
}
