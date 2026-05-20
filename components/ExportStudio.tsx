"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  Code2,
  Download,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Loader2,
  Map as MapIcon,
  Navigation,
  X
} from "lucide-react";
import type { FeatureCollection, LineString } from "geojson";
import { ensureMapboxRtlPlugin } from "./mapboxRtl";
import {
  type CornerPosition,
  type ExportPresetKey,
  type ExportSettings,
  MAP_STYLES,
  type ManualRoute,
  type NorthArrowStyle,
  type RouteMetadata,
  type RouteMetrics,
  type ScaleBarUnits,
  type Waypoint,
  type WaypointGroup,
  useMapStore
} from "@/store/useMapStore";

type ExportStudioProps = {
  isOpen: boolean;
  routeDistance: number;
  terrainSplit: {
    tarmac: number;
    offRoad: number;
  };
  routeMetrics: RouteMetrics;
  onClose: () => void;
  onNavigationHandoff: () => void;
};

type ExportPreset = {
  key: ExportPresetKey;
  label: string;
  sizeLabel: string;
  width: number;
  height: number;
};

const exportPresets: ExportPreset[] = [
  { key: "presentation", label: "Presentation", sizeLabel: "16:9", width: 1600, height: 900 },
  { key: "a4-portrait", label: "A4 Portrait", sizeLabel: "Print", width: 1240, height: 1754 },
  { key: "a4-landscape", label: "A4 Landscape", sizeLabel: "Print", width: 1754, height: 1240 },
  { key: "website-embed", label: "Website Embed", sizeLabel: "Wide", width: 1440, height: 720 },
  { key: "square", label: "Square", sizeLabel: "Social", width: 1080, height: 1080 },
  { key: "custom", label: "Custom", sizeLabel: "Manual", width: 1600, height: 1000 }
];

const getPreset = (settings: ExportSettings) => {
  const preset = exportPresets.find((item) => item.key === settings.preset) ?? exportPresets[0];

  if (settings.preset !== "custom") {
    return preset;
  }

  return {
    ...preset,
    width: settings.customWidth,
    height: settings.customHeight
  };
};

const formatKm = (value: number) => `${Math.round(value) || "--"} km`;

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const coord = (value: number) => Number(value.toFixed(6));

const slugify = (value: string) =>
  value.trim().replace(/\s+/g, "-").toLowerCase() || "nicemaps";

const downloadTextFile = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

type RouteGroupExport = {
  name: string;
  waypoints: Waypoint[];
  line: [number, number][];
};

const collectRouteGroups = (
  groups: WaypointGroup[],
  waypoints: Waypoint[],
  routeDataByGroup: Record<string, FeatureCollection<LineString>>
): RouteGroupExport[] =>
  groups
    .map((group) => ({
      name: group.name,
      waypoints: waypoints.filter((waypoint) => waypoint.groupId === group.id),
      line: (routeDataByGroup[group.id]?.features ?? []).flatMap(
        (feature) => feature.geometry.coordinates as [number, number][]
      )
    }))
    .filter((group) => group.waypoints.length > 0 || group.line.length > 0);

const buildGpx = (title: string, routeGroups: RouteGroupExport[]) => {
  const wpts = routeGroups
    .flatMap((group) => group.waypoints)
    .map(
      (waypoint) =>
        `  <wpt lat="${coord(waypoint.coordinates[1])}" lon="${coord(
          waypoint.coordinates[0]
        )}"><name>${escapeHtml(waypoint.name)}</name></wpt>`
    )
    .join("\n");

  const trks = routeGroups
    .filter((group) => group.line.length >= 2)
    .map((group) => {
      const pts = group.line
        .map(([lng, lat]) => `      <trkpt lat="${coord(lat)}" lon="${coord(lng)}" />`)
        .join("\n");
      return `  <trk><name>${escapeHtml(
        group.name
      )}</name><trkseg>\n${pts}\n    </trkseg></trk>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="NiceMaps" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata><name>${escapeHtml(title)}</name></metadata>
${[wpts, trks].filter(Boolean).join("\n")}
</gpx>`;
};

const buildKml = (title: string, routeGroups: RouteGroupExport[]) => {
  const folders = routeGroups
    .map((group) => {
      const placemarks = group.waypoints
        .map(
          (waypoint) =>
            `      <Placemark><name>${escapeHtml(
              waypoint.name
            )}</name><Point><coordinates>${coord(
              waypoint.coordinates[0]
            )},${coord(waypoint.coordinates[1])}</coordinates></Point></Placemark>`
        )
        .join("\n");
      const lineString =
        group.line.length >= 2
          ? `\n      <Placemark><name>${escapeHtml(
              group.name
            )} route</name><LineString><tessellate>1</tessellate><coordinates>${group.line
              .map(([lng, lat]) => `${coord(lng)},${coord(lat)}`)
              .join(" ")}</coordinates></LineString></Placemark>`
          : "";
      return `    <Folder><name>${escapeHtml(
        group.name
      )}</name>\n${placemarks}${lineString}\n    </Folder>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document><name>${escapeHtml(title)}</name>
${folders}
  </Document>
</kml>`;
};

const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? "MAPBOX_ACCESS_TOKEN";

const getRouteCoordinates = (routeDataByGroup: Record<string, FeatureCollection<LineString>>) =>
  Object.values(routeDataByGroup).flatMap((collection) =>
    collection.features.flatMap((feature) => feature.geometry.coordinates)
  );

const getCoordinateBounds = (
  waypoints: Waypoint[],
  manualRoutes: ManualRoute[],
  routeDataByGroup: Record<string, FeatureCollection<LineString>>
) => {
  const coordinates = [
    ...waypoints.map((waypoint) => waypoint.coordinates),
    ...manualRoutes.flatMap((route) => route.coordinates),
    ...getRouteCoordinates(routeDataByGroup)
  ];

  if (coordinates.length === 0) {
    return null;
  }

  const lngs = coordinates.map(([lng]) => lng);
  const lats = coordinates.map(([, lat]) => lat);

  return {
    minLng: Math.min(...lngs),
    maxLng: Math.max(...lngs),
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats)
  };
};

const getGroupColor = (groups: WaypointGroup[], groupId: string, fallback: string) =>
  groups.find((group) => group.id === groupId)?.color ?? fallback;

const getStaticMapStylePath = (mapStyle: string) => {
  const normalizedStyle = Object.values(MAP_STYLES).includes(mapStyle)
    ? mapStyle
    : MAP_STYLES["editorial-alpine"];

  return normalizedStyle.replace("mapbox://styles/", "");
};

// Web Mercator y in normalized units (radians-of-Mercator). The basemap uses
// Web Mercator; routes overlaid in equirectangular space drift off the map
// outside the equator. Project lat through this to align with the basemap.
const mercatorY = (latDeg: number) => {
  const clamped = Math.max(-85.05112878, Math.min(85.05112878, latDeg));
  return Math.log(Math.tan(Math.PI / 4 + (clamped * Math.PI) / 360));
};
const inverseMercatorY = (m: number) =>
  ((Math.atan(Math.exp(m)) * 2 - Math.PI / 2) * 180) / Math.PI;

const LABEL_LAYERS_TO_HIDE = [
  "country-label",
  "state-label",
  "settlement-major-label",
  "settlement-minor-label",
  "settlement-subdivision-label",
  "place-label",
  "poi-label",
  "airport-label",
  "natural-point-label",
  "natural-line-label",
  "water-point-label",
  "water-line-label",
  "waterway-label",
  "road-label",
  "contour-label"
];

const getStaticMapUrl = ({
  paddedBounds,
  mapStyle,
  width,
  height,
  showLabels
}: {
  paddedBounds: { minLng: number; minLat: number; maxLng: number; maxLat: number } | null;
  mapStyle: string;
  width: number;
  height: number;
  showLabels: boolean;
}) => {
  if (!paddedBounds || mapboxToken === "MAPBOX_ACCESS_TOKEN") {
    return "";
  }

  const bbox = [
    paddedBounds.minLng,
    paddedBounds.minLat,
    paddedBounds.maxLng,
    paddedBounds.maxLat
  ].join(",");
  const aspect = width > 0 && height > 0 ? width / height : 16 / 9;
  let imageWidth = Math.round(width);
  let imageHeight = Math.round(height);
  // Mapbox static API caps each side at 1280. Scale down proportionally so the aspect ratio is preserved.
  const maxSide = Math.max(imageWidth, imageHeight);
  if (maxSide > 1280) {
    const scale = 1280 / maxSide;
    imageWidth = Math.round(imageWidth * scale);
    imageHeight = Math.round(imageHeight * scale);
  }
  imageWidth = Math.max(320, imageWidth);
  imageHeight = Math.max(320, imageHeight);
  // Re-check aspect if minimum-clamp distorted it
  if (Math.abs(imageWidth / imageHeight - aspect) > 0.01) {
    if (aspect > 1) {
      imageHeight = Math.round(imageWidth / aspect);
    } else {
      imageWidth = Math.round(imageHeight * aspect);
    }
  }
  const baseUrl = `https://api.mapbox.com/styles/v1/${getStaticMapStylePath(mapStyle)}/static/[${bbox}]/${imageWidth}x${imageHeight}@2x`;
  const params = new URLSearchParams();
  params.set("access_token", mapboxToken);
  params.set("attribution", "false");
  params.set("logo", "false");

  let query = params.toString();
  if (!showLabels) {
    const labelParams = LABEL_LAYERS_TO_HIDE.flatMap((layerId) => [
      `setlayoutproperty=${encodeURIComponent("visibility,none")}`,
      `layer_id=${encodeURIComponent(layerId)}`
    ]).join("&");
    query = `${query}&${labelParams}`;
  }

  return `${baseUrl}?${query}`;
};

const cornerStyles: Record<CornerPosition, string> = {
  tl: "top-3 left-3",
  tr: "top-3 right-3",
  bl: "bottom-3 left-3",
  br: "bottom-3 right-3"
};

function NorthArrowGlyph({ style }: { style: NorthArrowStyle }) {
  if (style === "none") return null;
  if (style === "minimal") {
    return (
      <svg viewBox="0 0 40 40" className="h-9 w-9">
        <polygon points="20,4 26,30 20,24 14,30" fill="#171B18" />
        <text x="20" y="38" textAnchor="middle" fontSize="9" fontWeight="700" fill="#171B18">N</text>
      </svg>
    );
  }
  if (style === "classic") {
    return (
      <svg viewBox="0 0 40 40" className="h-10 w-10">
        <circle cx="20" cy="20" r="17" fill="#F8F3E6" stroke="#171B18" strokeWidth="1.4" />
        <polygon points="20,5 25,22 20,18 15,22" fill="#DC6432" />
        <polygon points="20,35 15,18 20,22 25,18" fill="#171B18" />
        <text x="20" y="13" textAnchor="middle" fontSize="7" fontWeight="700" fill="#171B18">N</text>
      </svg>
    );
  }
  // compass rose
  return (
    <svg viewBox="0 0 48 48" className="h-12 w-12">
      <circle cx="24" cy="24" r="20" fill="#F8F3E6" stroke="#171B18" strokeWidth="1.2" />
      <g stroke="#171B18" strokeWidth="0.8">
        <line x1="24" y1="6" x2="24" y2="42" />
        <line x1="6" y1="24" x2="42" y2="24" />
        <line x1="11" y1="11" x2="37" y2="37" opacity="0.4" />
        <line x1="37" y1="11" x2="11" y2="37" opacity="0.4" />
      </g>
      <polygon points="24,6 28,24 24,21 20,24" fill="#DC6432" />
      <polygon points="24,42 20,24 24,27 28,24" fill="#171B18" />
      <text x="24" y="16" textAnchor="middle" fontSize="7" fontWeight="700" fill="#171B18">N</text>
    </svg>
  );
}

function ScaleBar({
  units,
  bounds,
  mapWidth
}: {
  units: ScaleBarUnits;
  bounds: { minLng: number; maxLng: number; minLat: number; maxLat: number } | null;
  mapWidth: number;
}) {
  if (units === "off" || !bounds) return null;
  const midLat = (bounds.minLat + bounds.maxLat) / 2;
  const lngSpanDeg = Math.max(bounds.maxLng - bounds.minLng, 0.0001);
  const kmPerDeg = 111.32 * Math.cos((midLat * Math.PI) / 180);
  // bounds is the actual visible extent of the basemap.
  const visibleKm = lngSpanDeg * kmPerDeg;
  const targetKm = visibleKm * 0.18;
  const niceValues = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000];
  let chosenKm = niceValues[0]!;
  for (const value of niceValues) {
    if (value <= targetKm) chosenKm = value;
  }
  const isImperial = units === "imperial";
  const displayValue = isImperial ? chosenKm * 0.621371 : chosenKm;
  const niceImperial = [0.1, 0.25, 0.5, 1, 2, 5, 10, 25, 50, 100, 250, 500, 1000];
  const labelValue = isImperial
    ? niceImperial.reduce((closest, value) =>
        Math.abs(value - displayValue) < Math.abs(closest - displayValue) ? value : closest
      , niceImperial[0]!)
    : chosenKm;
  const actualKm = isImperial ? labelValue / 0.621371 : labelValue;
  const widthFraction = actualKm / visibleKm;
  const widthPx = Math.max(48, Math.min(220, widthFraction * mapWidth));
  const unitLabel = isImperial ? "mi" : "km";
  return (
    <div className="pointer-events-none flex flex-col items-start gap-1 rounded-md bg-[#F8F3E6]/85 px-2 py-1.5 text-[10px] font-bold text-ink shadow-[0_4px_12px_rgba(23,27,24,0.12)]">
      <div className="flex h-2 items-stretch overflow-hidden rounded-sm border border-ink/70" style={{ width: widthPx }}>
        <div className="flex-1 bg-ink" />
        <div className="flex-1 bg-[#F8F3E6]" />
        <div className="flex-1 bg-ink" />
        <div className="flex-1 bg-[#F8F3E6]" />
      </div>
      <div className="flex w-full justify-between text-[9px]">
        <span>0</span>
        <span>{labelValue} {unitLabel}</span>
      </div>
    </div>
  );
}

function AttributionBadge({ style }: { style: "light" | "dark" }) {
  const isLight = style === "light";
  return (
    <div
      className={`pointer-events-none rounded-sm px-1 py-[1px] text-[6px] font-medium leading-tight tracking-wide opacity-70 ${
        isLight ? "bg-[#F8F3E6]/70 text-ink" : "bg-ink/70 text-paper"
      }`}
    >
      © Mapbox · OSM
    </div>
  );
}

function ElevationProfileStrip({
  routeDataByGroup,
  groups,
  brandColor
}: {
  routeDataByGroup: Record<string, FeatureCollection<LineString>>;
  groups: WaypointGroup[];
  brandColor: string;
}) {
  const entries = Object.entries(routeDataByGroup).filter(
    ([, fc]) => fc.features.length > 0
  );
  if (entries.length === 0) return null;
  const sparkPaths = entries.map(([groupId, fc]) => {
    const coords = fc.features.flatMap((feature) => feature.geometry.coordinates);
    const sampleCount = Math.min(48, Math.max(8, coords.length));
    const step = Math.max(1, Math.floor(coords.length / sampleCount));
    const samples = coords.filter((_, idx) => idx % step === 0);
    if (samples.length < 2) return null;
    // Use latitude proxy as pseudo-elevation (placeholder until real terrain sampling).
    const lats = samples.map((coord) => coord[1] ?? 0);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const range = Math.max(maxLat - minLat, 0.0001);
    const points = samples
      .map((coord, idx) => {
        const x = (idx / (samples.length - 1)) * 100;
        const y = 100 - (((coord[1] ?? minLat) - minLat) / range) * 100;
        return `${idx === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" ");
    const color = groups.find((group) => group.id === groupId)?.color ?? brandColor;
    return { groupId, points, color };
  });

  return (
    <div className="border-t border-ink/12 px-[5.5%] pb-[2%] pt-[1.5%]">
      <p className="text-[clamp(9px,0.78cqw,12px)] font-bold uppercase tracking-[0.2em] text-olive/65">
        Elevation profile
      </p>
      <svg viewBox="0 0 100 26" preserveAspectRatio="none" className="mt-2 h-12 w-full">
        {sparkPaths.map((spark) =>
          spark ? (
            <path
              key={spark.groupId}
              d={spark.points}
              fill="none"
              stroke={spark.color}
              strokeWidth="0.9"
              vectorEffect="non-scaling-stroke"
              opacity="0.85"
              transform="scale(1 0.26)"
            />
          ) : null
        )}
      </svg>
    </div>
  );
}

function ExportMapArtwork({
  routeName,
  waypoints,
  groups,
  manualRoutes,
  routeDataByGroup,
  mapStyle,
  routeDistance,
  terrainSplit,
  settings,
  mapWidth,
  mapHeight,
  metadata,
  showMapLabels
}: {
  routeName: string;
  waypoints: Waypoint[];
  groups: WaypointGroup[];
  manualRoutes: ManualRoute[];
  routeDataByGroup: Record<string, FeatureCollection<LineString>>;
  mapStyle: string;
  routeDistance: number;
  terrainSplit: ExportStudioProps["terrainSplit"];
  settings: ExportSettings;
  mapWidth: number;
  mapHeight: number;
  metadata: RouteMetadata;
  showMapLabels: boolean;
}) {
  const mapSectionRef = useRef<HTMLElement | null>(null);
  const [mapSectionSize, setMapSectionSize] = useState<{ width: number; height: number }>(() => ({
    width: Math.max(1, mapWidth * 0.89),
    height: Math.max(1, mapHeight * 0.55)
  }));

  useLayoutEffect(() => {
    const node = mapSectionRef.current;
    if (!node) return;
    const update = () => {
      // Use offsetWidth/offsetHeight (unscaled layout size) rather than
      // getBoundingClientRect, which returns the visually-scaled rect
      // because the artboard wraps this node in a CSS transform: scale(...).
      // We want the true preset-resolution dimensions so the Mapbox static
      // image is fetched at full resolution and html2canvas captures it crisply.
      const width = node.offsetWidth;
      const height = node.offsetHeight;
      if (width > 0 && height > 0) {
        setMapSectionSize({ width, height });
      }
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, [mapWidth, mapHeight]);

  const rawBounds = useMemo(
    () => getCoordinateBounds(waypoints, manualRoutes, routeDataByGroup),
    [manualRoutes, routeDataByGroup, waypoints]
  );
  const groupedWaypoints = useMemo(
    () =>
      groups.map((group) => ({
        group,
        waypoints: waypoints.filter((waypoint) => waypoint.groupId === group.id)
      })),
    [groups, waypoints]
  );

  // Expand the geographic bounds so its aspect ratio matches the on-screen
  // map section in Web Mercator space (the projection mapbox-gl and the
  // Static Images API both use), so both the basemap AND the SVG overlay
  // cover the exact same rendered area. Using km-aspect here would misalign
  // the route line from the basemap because Mercator stretches vertically
  // with latitude.
  const paddedBounds = useMemo(() => {
    if (!rawBounds) return null;
    const padFraction = 0.06;
    const lngSpan = Math.max(rawBounds.maxLng - rawBounds.minLng, 0.001);
    const latSpan = Math.max(rawBounds.maxLat - rawBounds.minLat, 0.001);
    let minLng = rawBounds.minLng - lngSpan * padFraction;
    let maxLng = rawBounds.maxLng + lngSpan * padFraction;
    let minLat = rawBounds.minLat - latSpan * padFraction;
    let maxLat = rawBounds.maxLat + latSpan * padFraction;
    // Clamp lat to Web Mercator's valid range.
    minLat = Math.max(-85.05112878, Math.min(85.05112878, minLat));
    maxLat = Math.max(-85.05112878, Math.min(85.05112878, maxLat));

    // Aspect math must use consistent units. mercatorY() returns radians,
    // so convert the longitude span to radians too, otherwise bboxAspect
    // ends up as (degrees / radians) — orders of magnitude wrong — which
    // pushes the lat correction to the ±85° clamp and produces a
    // world-spanning bbox (the "globe view" bug).
    const degToRad = Math.PI / 180;
    const mercWidth = (maxLng - minLng) * degToRad;
    const mercHeight = mercatorY(maxLat) - mercatorY(minLat);
    const bboxAspect = mercWidth / Math.max(mercHeight, 1e-9);
    const sectionAspect = mapSectionSize.width / mapSectionSize.height;

    if (bboxAspect < sectionAspect) {
      // bbox too tall in mercator; widen it (lng-extra is linear, so we
      // convert back from radians to degrees).
      const targetMercWidth = mercHeight * sectionAspect;
      const extraLngDeg = (targetMercWidth - mercWidth) / degToRad;
      minLng -= extraLngDeg / 2;
      maxLng += extraLngDeg / 2;
    } else if (bboxAspect > sectionAspect) {
      // bbox too wide in mercator; make it taller (in mercator radians).
      const targetMercHeight = mercWidth / sectionAspect;
      const midMerc = (mercatorY(maxLat) + mercatorY(minLat)) / 2;
      minLat = inverseMercatorY(midMerc - targetMercHeight / 2);
      maxLat = inverseMercatorY(midMerc + targetMercHeight / 2);
    }
    return { minLng, maxLng, minLat, maxLat };
  }, [rawBounds, mapSectionSize.width, mapSectionSize.height]);

  const staticMapUrl = useMemo(
    () =>
      getStaticMapUrl({
        paddedBounds,
        mapStyle,
        width: mapSectionSize.width,
        height: mapSectionSize.height,
        showLabels: showMapLabels
      }),
    [paddedBounds, mapStyle, mapSectionSize.width, mapSectionSize.height, showMapLabels]
  );

  // Render the basemap with mapbox-gl-js client-side so we can honor the
  // showMapLabels toggle (the Mapbox Static Images API does not support
  // runtime style modifications via URL parameters). The hidden map renders
  // into an offscreen canvas; we snapshot it as a data URL and use that as
  // the image src so html2canvas can capture it on PNG export.
  const hiddenMapContainerRef = useRef<HTMLDivElement | null>(null);
  const visibleBasemapCanvasRef = useRef<HTMLCanvasElement | null>(null);
  // Hold the mapbox-gl map after it's fully loaded/fitted so we can re-paint
  // the visible canvas (basemap + routes drawn via map.project) whenever
  // route data changes, without recreating the map instance.
  const mapInstanceRef = useRef<import("mapbox-gl").Map | null>(null);
  // Latest repaintCanvas callback. The map-lifecycle effect calls it via
  // ref so it doesn't need to depend on (and therefore re-run for) any of
  // the route-data inputs.
  const repaintCanvasRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (!hiddenMapContainerRef.current || !paddedBounds) return;
    if (mapboxToken === "MAPBOX_ACCESS_TOKEN") return;
    if (mapSectionSize.width < 2 || mapSectionSize.height < 2) return;

    let cancelled = false;

    let mapInstance: import("mapbox-gl").Map | null = null;

    (async () => {
      const mapboxgl = (await import("mapbox-gl")).default;
      if (cancelled || !hiddenMapContainerRef.current) return;
      ensureMapboxRtlPlugin(mapboxgl);
      mapboxgl.accessToken = mapboxToken;

      const map = new mapboxgl.Map({
        container: hiddenMapContainerRef.current,
        style: mapStyle,
        // mapbox-gl v3 defaults to globe projection, which renders the earth
        // as a sphere and makes fitBounds behave very differently. Force
        // Mercator so the rendered basemap matches our Mercator-projected
        // route SVG overlay exactly.
        projection: { name: "mercator" },
        interactive: false,
        attributionControl: false,
        preserveDrawingBuffer: true,
        bounds: [
          [paddedBounds.minLng, paddedBounds.minLat],
          [paddedBounds.maxLng, paddedBounds.maxLat]
        ],
        fitBoundsOptions: { padding: 0, animate: false }
      });
      // Defensive: also call setProjection in case the style overrides it.
      try {
        map.setProjection("mercator");
      } catch {
        // older mapbox-gl versions silently ignore.
      }
      mapInstance = map;

      const applyLabelVisibility = () => {
        const visibility = showMapLabels ? "visible" : "none";
        const style = map.getStyle();
        if (!style?.layers) return;
        for (const layer of style.layers) {
          if (layer.type === "symbol" && /label$/.test(layer.id)) {
            try {
              map.setLayoutProperty(layer.id, "visibility", visibility);
            } catch {
              // Layer may have been removed mid-style-load; ignore.
            }
          }
        }
      };

      const onIdle = () => {
        if (cancelled) return;
        // Publish the loaded map so the repaintCanvas effect can use
        // map.project() to draw basemap + routes onto the visible canvas.
        mapInstanceRef.current = map;
        repaintCanvasRef.current();
      };

      map.once("load", () => {
        // Mapbox styles (outdoors-v12, streets-v12, etc.) declare globe in
        // their style spec, which can override the constructor's projection
        // option. Re-assert Mercator now that the style is loaded.
        try {
          map.setProjection("mercator");
        } catch {
          // ignore
        }
        // Re-fit bounds explicitly after style load — constructor `bounds`
        // can race with the style swap, and we need the final view to match
        // paddedBounds exactly for the SVG overlay to align.
        map.fitBounds(
          [
            [paddedBounds.minLng, paddedBounds.minLat],
            [paddedBounds.maxLng, paddedBounds.maxLat]
          ],
          { padding: 0, animate: false, duration: 0 }
        );
        applyLabelVisibility();
        // Wait one idle tick after applying visibility so the change is
        // reflected in the rendered canvas before we snapshot it.
        map.once("idle", onIdle);
      });
    })();

    return () => {
      cancelled = true;
      if (mapInstanceRef.current === mapInstance) {
        mapInstanceRef.current = null;
      }
      mapInstance?.remove();
    };
  }, [
    paddedBounds?.minLng,
    paddedBounds?.minLat,
    paddedBounds?.maxLng,
    paddedBounds?.maxLat,
    mapStyle,
    showMapLabels,
    mapSectionSize.width,
    mapSectionSize.height
  ]);

  // Returns coordinates in [0, 100] x [0, 100] — used as CSS percentages for
  // DOM-positioned markers/labels. Routes are not projected through this
  // function anymore: they're drawn directly onto the basemap canvas via
  // mapbox-gl's map.project() in repaintCanvas, giving pixel-perfect
  // alignment that survives the html2canvas export.
  const project = (coordinate: [number, number]) => {
    if (!paddedBounds) {
      return { x: 50, y: 52 };
    }
    const lngSpan = Math.max(paddedBounds.maxLng - paddedBounds.minLng, 0.001);
    const minMerc = mercatorY(paddedBounds.minLat);
    const maxMerc = mercatorY(paddedBounds.maxLat);
    const mercSpan = Math.max(maxMerc - minMerc, 1e-9);
    return {
      x: ((coordinate[0] - paddedBounds.minLng) / lngSpan) * 100,
      y: 100 - ((mercatorY(coordinate[1]) - minMerc) / mercSpan) * 100
    };
  };

  // Repaint the visible canvas: copy basemap pixels from the offscreen
  // mapbox-gl canvas, then stroke every route polyline on top using
  // map.project() so the route is pixel-perfect aligned with the rendered
  // basemap. html2canvas captures <canvas> via drawImage with no
  // aspect/projection logic, so anything we bake into these pixels survives
  // the PNG export intact. This is the only path that guarantees the
  // exported image matches the preview.
  const repaintCanvas = useCallback(() => {
    const map = mapInstanceRef.current;
    const target = visibleBasemapCanvasRef.current;
    if (!map || !target) return;
    const source = map.getCanvas();
    if (source.width === 0 || source.height === 0) return;

    if (target.width !== source.width || target.height !== source.height) {
      target.width = source.width;
      target.height = source.height;
    }
    const ctx = target.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, target.width, target.height);
    try {
      ctx.drawImage(source, 0, 0);
    } catch {
      // WebGL context loss; abort silently.
      return;
    }

    // source.width is the canvas internal-pixel width; the map container's
    // CSS width is mapSectionSize.width, so this ratio is effectively dpr.
    const dpr = source.width / Math.max(1, mapSectionSize.width);

    const strokePolyline = (
      coordinates: [number, number][],
      stroke: string,
      widthCssPx: number,
      dashCssPx?: number[]
    ) => {
      if (coordinates.length < 2) return;
      ctx.beginPath();
      for (let i = 0; i < coordinates.length; i++) {
        const coord = coordinates[i]!;
        const p = map.project([coord[0], coord[1]]);
        const x = p.x * dpr;
        const y = p.y * dpr;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = stroke;
      ctx.lineWidth = Math.max(0.5, widthCssPx * dpr);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.setLineDash(dashCssPx ? dashCssPx.map((v) => v * dpr) : []);
      ctx.stroke();
    };

    // Group routes (and connector fallback when no actual route data exists)
    for (const group of groups) {
      const routeFeatures = routeDataByGroup[group.id]?.features ?? [];
      const groupManualRoutes = manualRoutes.filter(
        (route) => route.groupId === group.id
      );
      const manualEndpointIds = new Set(
        groupManualRoutes.flatMap((route) => route.endpointWaypointIds)
      );
      const groupWaypoints = waypoints.filter(
        (waypoint) => waypoint.groupId === group.id
      );
      const connectorWaypoints = groupWaypoints.filter(
        (waypoint) =>
          !manualEndpointIds.has(waypoint.id) || groupManualRoutes.length === 0
      );
      const pathSegments: [number, number][][] =
        routeFeatures.length > 0
          ? routeFeatures.map(
              (feature) => feature.geometry.coordinates as [number, number][]
            )
          : groupManualRoutes.length === 0 && connectorWaypoints.length >= 2
            ? [connectorWaypoints.map((w) => w.coordinates as [number, number])]
            : [];

      for (const segment of pathSegments) {
        strokePolyline(segment, "#F8F3E6", settings.routeThickness + 2.6);
        strokePolyline(segment, group.color, settings.routeThickness);
      }
    }

    // Manual (dashed) routes
    for (const route of manualRoutes) {
      if (route.coordinates.length < 2) continue;
      const color = getGroupColor(groups, route.groupId, settings.brandColor);
      strokePolyline(
        route.coordinates as [number, number][],
        "#F8F3E6",
        settings.routeThickness + 2.2
      );
      strokePolyline(
        route.coordinates as [number, number][],
        color,
        settings.routeThickness,
        [1.3, 1.5]
      );
    }
  }, [
    mapSectionSize.width,
    groups,
    routeDataByGroup,
    manualRoutes,
    waypoints,
    settings.routeThickness,
    settings.brandColor
  ]);

  // Re-paint whenever the inputs to the route drawing change. The map
  // instance itself only gets recreated by the effect above when the
  // basemap inputs (bounds, style, labels, section size) change.
  useEffect(() => {
    repaintCanvasRef.current = repaintCanvas;
    repaintCanvas();
  }, [repaintCanvas]);

  const title = settings.title.trim() || routeName || "Untitled map";
  const subtitle = settings.subtitle.trim();
  const showDetailedLabels = settings.showLabels && settings.labelDensity !== "clean";
  const mapOnly = settings.chromeMode === "map-only";
  const hiddenWaypointIds = new Set(settings.hiddenWaypointIds);

  return (
    <div className="h-full w-full overflow-hidden bg-[#F8F3E6] text-ink [container-type:inline-size]">
      {/* Offscreen mapbox-gl map used to render the basemap with label
          visibility honored, then snapshotted into <img> below. Kept in the
          DOM (mapbox-gl requires a sized container) but visually hidden. */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          left: "-99999px",
          top: 0,
          width: Math.max(2, Math.round(mapSectionSize.width)),
          height: Math.max(2, Math.round(mapSectionSize.height)),
          pointerEvents: "none"
        }}
      >
        <div ref={hiddenMapContainerRef} style={{ width: "100%", height: "100%" }} />
      </div>
      <div className={`grid h-full ${mapOnly ? "grid-rows-[1fr]" : "grid-rows-[auto_1fr_auto]"}`}>
        {mapOnly ? null : (
        <header className="grid grid-cols-[1fr_auto] gap-8 border-b border-ink/12 px-[5.5%] py-[4%]">
          <div className="min-w-0">
            <p className="text-[clamp(11px,1cqw,16px)] font-bold uppercase tracking-[0.22em] text-olive/65">
              {settings.brandName.trim() || "NiceMaps"}
            </p>
            <h1 className="mt-[1.2%] max-w-[14ch] font-display text-[clamp(44px,6cqw,118px)] leading-[0.88] tracking-[-0.035em]">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-[2%] max-w-[48ch] text-[clamp(14px,1.45cqw,24px)] font-semibold leading-[1.45] text-olive">
                {subtitle}
              </p>
            ) : null}
          </div>

          {settings.showSummary ? (
            <div className="grid min-w-[240px] content-start gap-3 border-l border-ink/12 pl-6 text-right">
              {metadata.destination ? (
                <div>
                  <p className="text-[clamp(9px,0.85cqw,13px)] font-bold uppercase tracking-[0.2em] text-olive/60">
                    Destination
                  </p>
                  <p className="mt-1 text-[clamp(13px,1.2cqw,20px)] font-bold leading-[1.2]">
                    {metadata.destination}
                  </p>
                </div>
              ) : null}
              {metadata.durationDays ? (
                <div>
                  <p className="text-[clamp(9px,0.85cqw,13px)] font-bold uppercase tracking-[0.2em] text-olive/60">
                    Duration
                  </p>
                  <p className="mt-1 text-[clamp(13px,1.2cqw,20px)] font-bold leading-[1.2]">
                    {metadata.durationDays} {metadata.durationDays === 1 ? "day" : "days"}
                  </p>
                </div>
              ) : null}
              <div>
                <p className="text-[clamp(9px,0.85cqw,13px)] font-bold uppercase tracking-[0.2em] text-olive/60">
                  Distance
                </p>
                <p className="mt-1 font-mono text-[clamp(24px,3cqw,54px)] leading-none">
                  {formatKm(routeDistance)}
                </p>
              </div>
              <div>
                <p className="text-[clamp(9px,0.85cqw,13px)] font-bold uppercase tracking-[0.2em] text-olive/60">
                  Surface
                </p>
                <p className="mt-1 text-[clamp(12px,1.15cqw,18px)] font-bold leading-[1.25]">
                  {terrainSplit.tarmac}% tarmac / {terrainSplit.offRoad}% off-road
                </p>
              </div>
              {metadata.difficulty || metadata.season || metadata.audience ? (
                <div>
                  <p className="text-[clamp(9px,0.85cqw,13px)] font-bold uppercase tracking-[0.2em] text-olive/60">
                    Itinerary
                  </p>
                  <p className="mt-1 text-[clamp(11px,1cqw,15px)] font-semibold leading-[1.35] text-olive">
                    {[metadata.difficulty, metadata.season, metadata.audience]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}
        </header>
        )}

        <section
          ref={mapSectionRef}
          className={`relative overflow-hidden bg-[#EFE6CE] ${
            mapOnly
              ? ""
              : "mx-[5.5%] my-[3.2%] border border-ink/12 shadow-[0_28px_90px_rgba(23,27,24,0.14)]"
          }`}
        >
          {/* Always render the basemap canvas; html2canvas captures canvas
              pixels directly via drawImage, which avoids the object-fit / image
              stretching issues that misalign the basemap from the SVG route
              overlay in the downloaded PNG. The placeholder grid stays behind
              as a fallback before the basemap paints. */}
          <div className="absolute inset-0 bg-[#EFE6CE] [background-image:linear-gradient(rgba(23,27,24,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(23,27,24,0.07)_1px,transparent_1px)] [background-size:54px_54px]" />
          <canvas
            ref={visibleBasemapCanvasRef}
            className="absolute inset-0 h-full w-full"
            style={{ display: "block" }}
          />
          <div className="absolute inset-0 bg-[#F8F3E6]/10" />
          {/* Route polylines are drawn directly onto the basemap canvas above
              (see repaintCanvas) using mapbox-gl map.project() so they stay
              pixel-perfect aligned with the rendered basemap in both the
              preview and the downloaded PNG. We avoid an SVG overlay here
              because html2canvas's SVG renderer doesn't reliably honor
              preserveAspectRatio="none", which previously caused the route
              to drift off the basemap in the exported image. */}

          {waypoints.map((waypoint, index) => {
            if (hiddenWaypointIds.has(waypoint.id)) {
              return null;
            }
            const point = project(waypoint.coordinates);
            const color = getGroupColor(groups, waypoint.groupId, settings.brandColor);
            const isDot = settings.markerStyle === "dot";

            return (
              <div
                key={waypoint.id}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${point.x}%`, top: `${point.y}%` }}
              >
                <div
                  className={`flex items-center justify-center border-2 border-[#F8F3E6] font-mono font-bold text-white shadow-[0_10px_26px_rgba(23,27,24,0.18)] ${
                    isDot
                      ? "h-5 w-5 rounded-full text-[0px]"
                      : settings.markerStyle === "pin"
                        ? "h-9 w-9 rounded-[50%_50%_50%_12%] rotate-45 text-[0px]"
                        : "h-9 w-9 rounded-full text-[12px]"
                  }`}
                  style={{ backgroundColor: color }}
                >
                  {settings.markerStyle === "numbered" ? index + 1 : null}
                </div>
                {showDetailedLabels ? (
                  <p className="mt-2 max-w-[150px] rounded-[9px] border border-ink/10 bg-[#F8F3E6]/92 px-2 py-1 text-[clamp(10px,0.85cqw,13px)] font-bold leading-tight text-ink shadow-[0_8px_22px_rgba(23,27,24,0.1)]">
                    {settings.labelDensity === "detailed" ? `${index + 1}. ` : ""}
                    {waypoint.name}
                  </p>
                ) : null}
              </div>
            );
          })}

          {waypoints.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center text-center">
              <p className="max-w-[34ch] font-display text-[clamp(38px,5cqw,92px)] leading-[0.92] text-ink/30">
                Add stops to compose a map.
              </p>
            </div>
          ) : null}

          {settings.northArrow !== "none" ? (
            <div className={`pointer-events-none absolute ${cornerStyles[settings.northArrowPosition]}`}>
              <NorthArrowGlyph style={settings.northArrow} />
            </div>
          ) : null}

          {settings.scaleBar !== "off" ? (
            <div className={`absolute ${cornerStyles[settings.scaleBarPosition]}`}>
              <ScaleBar units={settings.scaleBar} bounds={paddedBounds} mapWidth={mapSectionSize.width} />
            </div>
          ) : null}

          <div className={`absolute ${cornerStyles[settings.attributionPosition]}`}>
            <AttributionBadge style={settings.attributionStyle} />
          </div>
        </section>

        {mapOnly ? null : (
        <div>
          {settings.showElevationProfile ? (
            <ElevationProfileStrip
              routeDataByGroup={routeDataByGroup}
              groups={groups}
              brandColor={settings.brandColor}
            />
          ) : null}
        <footer className="grid grid-cols-[1fr_auto] items-end gap-8 border-t border-ink/12 px-[5.5%] py-[2.5%]">
          <p className="max-w-[72ch] text-[clamp(11px,1cqw,16px)] font-semibold leading-[1.55] text-olive">
            {settings.notes.trim() || "Export-ready route map composed in NiceMaps."}
          </p>
          {settings.showLegend ? (
            <div
              className={`grid justify-end gap-x-5 gap-y-2 ${
                settings.legendColumns === 2 ? "grid-cols-2" : "grid-cols-1"
              }`}
            >
              {groups.length > 0 ? (
                groups
                  .filter((group) => !settings.legendHiddenGroupIds.includes(group.id))
                  .map((group) => (
                    <div
                      key={group.id}
                      className="flex items-center justify-end gap-2 text-[clamp(10px,0.9cqw,14px)] font-bold text-ink"
                    >
                      <span className="h-3 w-7 rounded-full" style={{ backgroundColor: group.color }} />
                      {settings.legendLabelOverrides[group.id]?.trim() || group.name}
                    </div>
                  ))
              ) : (
                <div className="flex items-center justify-end gap-2 text-[clamp(10px,0.9cqw,14px)] font-bold text-ink">
                  <span className="h-3 w-7 rounded-full" style={{ backgroundColor: settings.brandColor }} />
                  Route
                </div>
              )}
            </div>
          ) : null}
        </footer>
        </div>
        )}
      </div>
    </div>
  );
}

export function ExportStudio({
  isOpen,
  routeDistance,
  terrainSplit,
  routeMetrics,
  onClose,
  onNavigationHandoff
}: ExportStudioProps) {
  const {
    routeName,
    waypoints,
    waypointGroups,
    manualRoutes,
    routeDataByGroup,
    mapStyle,
    exportSettings,
    updateExportSettings,
    metadata,
    updateMetadata,
    groupVocabulary,
    setGroupVocabulary,
    showMapLabels
  } = useMapStore();
  const artboardRef = useRef<HTMLDivElement | null>(null);
  const [exportStatus, setExportStatus] = useState<"idle" | "rendering" | "copied" | "error">("idle");
  const [isMetadataOpen, setIsMetadataOpen] = useState(false);
  const preset = getPreset(exportSettings);
  const artboardScale = Math.min(1, 760 / preset.width, 520 / preset.height);

  if (!isOpen) {
    return null;
  }

  const update = (settings: Partial<ExportSettings>) => updateExportSettings(settings);

  const waitForArtboardImages = async () => {
    const images = Array.from(artboardRef.current?.querySelectorAll("img") ?? []);

    await Promise.all(
      images.map(
        (image) =>
          image.complete
            ? Promise.resolve()
            : new Promise<void>((resolve) => {
                image.onload = () => resolve();
                image.onerror = () => resolve();
              })
      )
    );
  };

  const renderPngDataUrl = async () => {
    if (!artboardRef.current) {
      throw new Error("Export artboard is not available.");
    }

    const html2canvas = (await import("html2canvas")).default;
    const previousTransform = artboardRef.current.style.transform;

    artboardRef.current.style.transform = "none";

    try {
      await waitForArtboardImages();
      if (typeof document !== "undefined" && document.fonts?.ready) {
        await document.fonts.ready;
      }

      const canvas = await html2canvas(artboardRef.current, {
        backgroundColor: "#F8F3E6",
        ignoreElements: (element) =>
          element.classList.contains("mapboxgl-canvas") ||
          element.classList.contains("mapboxgl-map"),
        scale: 2,
        useCORS: true
      });

      return canvas.toDataURL("image/png");
    } finally {
      artboardRef.current.style.transform = previousTransform;
    }
  };

  const handleDownloadPng = async () => {
    setExportStatus("rendering");

    try {
      const dataUrl = await renderPngDataUrl();
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `${(exportSettings.title || routeName || "nicemaps").trim().replace(/\s+/g, "-").toLowerCase()}-map.png`;
      link.click();
      setExportStatus("idle");
    } catch {
      setExportStatus("error");
    }
  };

  const handleDownloadPdf = async () => {
    setExportStatus("rendering");

    try {
      const dataUrl = await renderPngDataUrl();
      const printWindow = window.open("", "_blank", "noopener,noreferrer");

      if (!printWindow) {
        throw new Error("Unable to open print window.");
      }

      const safeTitle = escapeHtml(exportSettings.title || routeName || "NiceMaps export");
      const orientation = preset.width > preset.height ? "landscape" : "portrait";
      printWindow.document.write(`<!doctype html>
        <html>
          <head>
            <title>${safeTitle}</title>
            <style>
              @page { size: ${orientation}; margin: 0; }
              html, body { margin: 0; width: 100%; height: 100%; background: #F8F3E6; }
              img { display: block; width: 100vw; height: 100vh; object-fit: contain; }
            </style>
          </head>
          <body>
            <img src="${escapeHtml(dataUrl)}" alt="NiceMaps export" />
            <script>window.onload = () => { window.focus(); window.print(); };</script>
          </body>
        </html>`);
      printWindow.document.close();
      setExportStatus("idle");
    } catch {
      setExportStatus("error");
    }
  };

  const handleDownloadSvg = async () => {
    setExportStatus("rendering");

    try {
      if (!artboardRef.current) {
        throw new Error("Export artboard is not available.");
      }
      await waitForArtboardImages();
      const previousTransform = artboardRef.current.style.transform;
      artboardRef.current.style.transform = "none";
      try {
        const node = artboardRef.current;
        const width = preset.width;
        const height = preset.height;
        // Serialize the artboard DOM into an SVG <foreignObject>.
        const serializer = new XMLSerializer();
        const cloned = node.cloneNode(true) as HTMLElement;
        cloned.style.transform = "none";
        const html = serializer.serializeToString(cloned);
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml" style="width:${width}px;height:${height}px;">${html}</div></foreignObject></svg>`;
        const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${(exportSettings.title || routeName || "nicemaps").trim().replace(/\s+/g, "-").toLowerCase()}-map.svg`;
        link.click();
        URL.revokeObjectURL(url);
      } finally {
        artboardRef.current.style.transform = previousTransform;
      }
      setExportStatus("idle");
    } catch {
      setExportStatus("error");
    }
  };

  const handleCopyEmbed = async () => {
    setExportStatus("rendering");

    try {
      const dataUrl = await renderPngDataUrl();
      const embedAlt = escapeHtml(exportSettings.title || routeName || "NiceMaps route map");
      const embed = `<img src="${escapeHtml(dataUrl)}" alt="${embedAlt}" style="width:100%;height:auto;display:block;" />`;

      await navigator.clipboard.writeText(embed);
      setExportStatus("copied");
      window.setTimeout(() => setExportStatus("idle"), 1800);
    } catch {
      setExportStatus("error");
    }
  };

  const handleDownloadGeo = (format: "gpx" | "kml") => {
    try {
      const routeGroups = collectRouteGroups(waypointGroups, waypoints, routeDataByGroup);
      if (routeGroups.length === 0) {
        setExportStatus("error");
        return;
      }
      const title = exportSettings.title || routeName || "NiceMaps route";
      const base = slugify(exportSettings.title || routeName || "nicemaps");
      if (format === "gpx") {
        downloadTextFile(
          buildGpx(title, routeGroups),
          `${base}.gpx`,
          "application/gpx+xml"
        );
      } else {
        downloadTextFile(
          buildKml(title, routeGroups),
          `${base}.kml`,
          "application/vnd.google-earth.kml+xml"
        );
      }
      setExportStatus("idle");
    } catch {
      setExportStatus("error");
    }
  };

  return (
    <div
      className="fixed inset-0 z-20 grid grid-cols-1 bg-field/55 p-3 text-ink backdrop-blur-2xl backdrop-saturate-150 lg:grid-cols-[420px_1fr]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-studio-title"
    >
      <aside className="nice-scrollbar flex min-h-0 flex-col overflow-y-auto rounded-[18px] border border-border/90 bg-paper shadow-command">
        <header className="sticky top-0 z-10 border-b border-border/80 bg-paper/95 px-5 py-5 backdrop-blur-xl">
          <div className="flex items-start justify-between gap-5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-rust">
                Export Studio
              </p>
              <h2 id="export-studio-title" className="mt-2 font-display text-4xl leading-none">
                Compose output
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close export studio"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-border/90 bg-[#FBF8EF]/55 text-olive transition hover:border-rust/35 hover:text-rust focus:outline-none focus:ring-2 focus:ring-rust/30"
            >
              <X size={17} strokeWidth={1.9} />
            </button>
          </div>
        </header>

        <div className="grid gap-5 px-5 py-5">
          <section>
            <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-olive/65">
              Preset
            </h3>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {exportPresets.map((item) => {
                const isActive = item.key === exportSettings.preset;

                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => update({ preset: item.key })}
                    className={`min-h-[58px] rounded-[10px] border px-3 py-2 text-left transition focus:outline-none focus:ring-2 focus:ring-rust/30 ${
                      isActive
                        ? "border-rust/55 bg-rust text-white shadow-[0_10px_28px_rgba(220,100,50,0.22)]"
                        : "border-border/85 bg-[#FBF8EF]/45 hover:border-rust/35 hover:bg-[#FBF8EF]/80"
                    }`}
                  >
                    <span className="block text-xs font-bold">{item.label}</span>
                    <span className={`mt-1 block text-[10px] font-semibold ${isActive ? "text-white/72" : "text-olive/58"}`}>
                      {item.sizeLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {exportSettings.preset === "custom" ? (
            <section className="grid grid-cols-2 gap-2">
              <label>
                <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-olive/60">
                  Width
                </span>
                <input
                  type="number"
                  min={640}
                  max={3200}
                  value={exportSettings.customWidth}
                  onChange={(event) => update({ customWidth: Number(event.target.value) })}
                  className="h-10 w-full rounded-[9px] border border-border/90 bg-[#FBF8EF]/62 px-3 text-sm font-bold outline-none focus:border-rust/65 focus:ring-2 focus:ring-rust/15"
                />
              </label>
              <label>
                <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-olive/60">
                  Height
                </span>
                <input
                  type="number"
                  min={480}
                  max={3200}
                  value={exportSettings.customHeight}
                  onChange={(event) => update({ customHeight: Number(event.target.value) })}
                  className="h-10 w-full rounded-[9px] border border-border/90 bg-[#FBF8EF]/62 px-3 text-sm font-bold outline-none focus:border-rust/65 focus:ring-2 focus:ring-rust/15"
                />
              </label>
            </section>
          ) : null}

          <section className="grid gap-3">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-olive/65">
              Composition
            </h3>
            <label>
              <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-olive/60">
                Title
              </span>
              <input
                value={exportSettings.title}
                onChange={(event) => update({ title: event.target.value })}
                className="h-10 w-full rounded-[9px] border border-border/90 bg-[#FBF8EF]/62 px-3 text-sm font-bold outline-none focus:border-rust/65 focus:ring-2 focus:ring-rust/15"
              />
            </label>
            <label>
              <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-olive/60">
                Subtitle
              </span>
              <input
                value={exportSettings.subtitle}
                onChange={(event) => update({ subtitle: event.target.value })}
                className="h-10 w-full rounded-[9px] border border-border/90 bg-[#FBF8EF]/62 px-3 text-sm font-bold outline-none focus:border-rust/65 focus:ring-2 focus:ring-rust/15"
              />
            </label>
            <label>
              <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-olive/60">
                Notes
              </span>
              <textarea
                value={exportSettings.notes}
                onChange={(event) => update({ notes: event.target.value })}
                className="min-h-20 w-full resize-none rounded-[9px] border border-border/90 bg-[#FBF8EF]/62 px-3 py-2 text-sm font-semibold leading-5 outline-none focus:border-rust/65 focus:ring-2 focus:ring-rust/15"
              />
            </label>
          </section>

          <section className="grid gap-3">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-olive/65">
              Brand and map
            </h3>
            <div className="grid grid-cols-[1fr_72px] gap-2">
              <label>
                <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-olive/60">
                  Brand
                </span>
                <input
                  value={exportSettings.brandName}
                  onChange={(event) => update({ brandName: event.target.value })}
                  className="h-10 w-full rounded-[9px] border border-border/90 bg-[#FBF8EF]/62 px-3 text-sm font-bold outline-none focus:border-rust/65 focus:ring-2 focus:ring-rust/15"
                />
              </label>
              <label>
                <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-olive/60">
                  Color
                </span>
                <input
                  type="color"
                  value={exportSettings.brandColor}
                  onChange={(event) => update({ brandColor: event.target.value })}
                  className="h-10 w-full cursor-pointer rounded-[9px] border border-border/90 bg-[#FBF8EF]/62 p-1"
                />
              </label>
            </div>

            <label>
              <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-olive/60">
                Marker style
              </span>
              <select
                value={exportSettings.markerStyle}
                onChange={(event) => update({ markerStyle: event.target.value as ExportSettings["markerStyle"] })}
                className="h-10 w-full rounded-[9px] border border-border/90 bg-[#FBF8EF]/62 px-3 text-sm font-bold outline-none focus:border-rust/65 focus:ring-2 focus:ring-rust/15"
              >
                <option value="numbered">Numbered</option>
                <option value="pin">Pin</option>
                <option value="dot">Dot</option>
              </select>
            </label>

            <label>
              <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-olive/60">
                Route thickness
              </span>
              <input
                type="range"
                min={3}
                max={10}
                value={exportSettings.routeThickness}
                onChange={(event) => update({ routeThickness: Number(event.target.value) })}
                className="w-full accent-[#DC6432]"
              />
            </label>

            <label>
              <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-olive/60">
                Label density
              </span>
              <select
                value={exportSettings.labelDensity}
                onChange={(event) => update({ labelDensity: event.target.value as ExportSettings["labelDensity"] })}
                className="h-10 w-full rounded-[9px] border border-border/90 bg-[#FBF8EF]/62 px-3 text-sm font-bold outline-none focus:border-rust/65 focus:ring-2 focus:ring-rust/15"
              >
                <option value="clean">Clean</option>
                <option value="standard">Standard</option>
                <option value="detailed">Detailed</option>
              </select>
            </label>

            <div className="grid grid-cols-2 gap-2">
              {[
                ["showLegend", "Legend"],
                ["showSummary", "Summary"],
                ["showLabels", "Labels"]
              ].map(([key, label]) => (
                <label
                  key={key}
                  className="flex min-h-10 items-center gap-2 rounded-[9px] border border-border/85 bg-[#FBF8EF]/45 px-3 text-xs font-bold"
                >
                  <input
                    type="checkbox"
                    checked={Boolean(exportSettings[key as keyof ExportSettings])}
                    onChange={(event) => update({ [key]: event.target.checked } as Partial<ExportSettings>)}
                    className="accent-[#DC6432]"
                  />
                  {label}
                </label>
              ))}
            </div>
          </section>

          <section className="grid gap-3 border-t border-border/80 pt-4">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-olive/65">
              Output
            </h3>
            <label>
              <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-olive/60">
                Export contents
              </span>
              <select
                value={exportSettings.chromeMode}
                onChange={(event) =>
                  update({ chromeMode: event.target.value as ExportSettings["chromeMode"] })
                }
                className="h-10 w-full rounded-[9px] border border-border/90 bg-[#FBF8EF]/62 px-3 text-sm font-bold outline-none focus:border-rust/65 focus:ring-2 focus:ring-rust/15"
              >
                <option value="framed">Framed composition</option>
                <option value="map-only">Map only</option>
              </select>
            </label>

            {waypoints.length > 0 ? (
              <div className="grid gap-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-olive/60">
                  Stops shown on map
                </span>
                <p className="text-[11px] font-semibold leading-snug text-olive/70">
                  Hide a stop to declutter the map. The route line stays exactly the same.
                </p>
                <div className="grid max-h-52 gap-1.5 overflow-y-auto pr-1">
                  {waypoints.map((waypoint, index) => {
                    const hidden = exportSettings.hiddenWaypointIds.includes(waypoint.id);
                    return (
                      <label
                        key={waypoint.id}
                        className="flex min-h-9 items-center gap-2 rounded-[9px] border border-border/85 bg-[#FBF8EF]/45 px-3 text-xs font-bold"
                      >
                        <input
                          type="checkbox"
                          checked={!hidden}
                          onChange={() =>
                            update({
                              hiddenWaypointIds: hidden
                                ? exportSettings.hiddenWaypointIds.filter(
                                    (id) => id !== waypoint.id
                                  )
                                : [...exportSettings.hiddenWaypointIds, waypoint.id]
                            })
                          }
                          className="accent-[#DC6432]"
                        />
                        <span className="truncate">
                          {index + 1}. {waypoint.name}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </section>

          <section className="grid gap-3 border-t border-border/80 pt-4">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-olive/65">
              Cartographic
            </h3>
            <label>
              <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-olive/60">
                North arrow
              </span>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={exportSettings.northArrow}
                  onChange={(event) => update({ northArrow: event.target.value as NorthArrowStyle })}
                  className="h-10 rounded-[9px] border border-border/90 bg-[#FBF8EF]/62 px-3 text-sm font-bold outline-none focus:border-rust/65 focus:ring-2 focus:ring-rust/15"
                >
                  <option value="none">None</option>
                  <option value="minimal">Minimal</option>
                  <option value="classic">Classic</option>
                  <option value="compass">Compass</option>
                </select>
                <select
                  value={exportSettings.northArrowPosition}
                  onChange={(event) => update({ northArrowPosition: event.target.value as CornerPosition })}
                  className="h-10 rounded-[9px] border border-border/90 bg-[#FBF8EF]/62 px-3 text-sm font-bold outline-none focus:border-rust/65 focus:ring-2 focus:ring-rust/15"
                >
                  <option value="tl">Top left</option>
                  <option value="tr">Top right</option>
                  <option value="bl">Bottom left</option>
                  <option value="br">Bottom right</option>
                </select>
              </div>
            </label>
            <label>
              <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-olive/60">
                Scale bar
              </span>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={exportSettings.scaleBar}
                  onChange={(event) => update({ scaleBar: event.target.value as ScaleBarUnits })}
                  className="h-10 rounded-[9px] border border-border/90 bg-[#FBF8EF]/62 px-3 text-sm font-bold outline-none focus:border-rust/65 focus:ring-2 focus:ring-rust/15"
                >
                  <option value="off">Off</option>
                  <option value="metric">Metric (km)</option>
                  <option value="imperial">Imperial (mi)</option>
                </select>
                <select
                  value={exportSettings.scaleBarPosition}
                  onChange={(event) => update({ scaleBarPosition: event.target.value as CornerPosition })}
                  className="h-10 rounded-[9px] border border-border/90 bg-[#FBF8EF]/62 px-3 text-sm font-bold outline-none focus:border-rust/65 focus:ring-2 focus:ring-rust/15"
                >
                  <option value="tl">Top left</option>
                  <option value="tr">Top right</option>
                  <option value="bl">Bottom left</option>
                  <option value="br">Bottom right</option>
                </select>
              </div>
            </label>
            <label>
              <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-olive/60">
                Attribution
              </span>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={exportSettings.attributionStyle}
                  onChange={(event) =>
                    update({ attributionStyle: event.target.value as "light" | "dark" })
                  }
                  className="h-10 rounded-[9px] border border-border/90 bg-[#FBF8EF]/62 px-3 text-sm font-bold outline-none focus:border-rust/65 focus:ring-2 focus:ring-rust/15"
                >
                  <option value="light">Light chip</option>
                  <option value="dark">Dark chip</option>
                </select>
                <select
                  value={exportSettings.attributionPosition}
                  onChange={(event) =>
                    update({ attributionPosition: event.target.value as CornerPosition })
                  }
                  className="h-10 rounded-[9px] border border-border/90 bg-[#FBF8EF]/62 px-3 text-sm font-bold outline-none focus:border-rust/65 focus:ring-2 focus:ring-rust/15"
                >
                  <option value="tl">Top left</option>
                  <option value="tr">Top right</option>
                  <option value="bl">Bottom left</option>
                  <option value="br">Bottom right</option>
                </select>
              </div>
            </label>
            <label className="flex min-h-10 items-center gap-2 rounded-[9px] border border-border/85 bg-[#FBF8EF]/45 px-3 text-xs font-bold">
              <input
                type="checkbox"
                checked={exportSettings.showElevationProfile}
                onChange={(event) => update({ showElevationProfile: event.target.checked })}
                className="accent-[#DC6432]"
              />
              Elevation profile strip
            </label>
          </section>

          {waypointGroups.length > 0 && exportSettings.showLegend ? (
            <section className="grid gap-3 border-t border-border/80 pt-4">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-olive/65">
                Legend
              </h3>
              <label>
                <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-olive/60">
                  Columns
                </span>
                <select
                  value={exportSettings.legendColumns}
                  onChange={(event) =>
                    update({ legendColumns: Number(event.target.value) as 1 | 2 })
                  }
                  className="h-10 w-full rounded-[9px] border border-border/90 bg-[#FBF8EF]/62 px-3 text-sm font-bold outline-none focus:border-rust/65 focus:ring-2 focus:ring-rust/15"
                >
                  <option value={1}>1 column</option>
                  <option value={2}>2 columns</option>
                </select>
              </label>
              <div className="grid gap-1.5">
                {waypointGroups.map((group) => {
                  const hidden = exportSettings.legendHiddenGroupIds.includes(group.id);
                  return (
                    <div
                      key={group.id}
                      className="grid grid-cols-[auto_1fr_auto] items-center gap-2 rounded-[9px] border border-border/80 bg-[#FBF8EF]/45 px-2 py-1.5"
                    >
                      <span
                        className="h-3 w-6 rounded-full"
                        style={{ backgroundColor: group.color }}
                      />
                      <input
                        type="text"
                        placeholder={group.name}
                        value={exportSettings.legendLabelOverrides[group.id] ?? ""}
                        onChange={(event) =>
                          update({
                            legendLabelOverrides: {
                              ...exportSettings.legendLabelOverrides,
                              [group.id]: event.target.value
                            }
                          })
                        }
                        className="h-8 rounded-[7px] border border-border/80 bg-paper/70 px-2 text-xs font-semibold outline-none focus:border-rust/65"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          update({
                            legendHiddenGroupIds: hidden
                              ? exportSettings.legendHiddenGroupIds.filter((id) => id !== group.id)
                              : [...exportSettings.legendHiddenGroupIds, group.id]
                          })
                        }
                        className={`rounded-[7px] px-2 py-1 text-[10px] font-bold transition ${
                          hidden
                            ? "bg-ink/10 text-olive"
                            : "bg-rust/10 text-rust hover:bg-rust/20"
                        }`}
                      >
                        {hidden ? "Show" : "Hide"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}

          <section className="grid gap-3 border-t border-border/80 pt-4">
            <button
              type="button"
              onClick={() => setIsMetadataOpen((open) => !open)}
              aria-expanded={isMetadataOpen}
              className="flex items-center justify-between gap-2 text-left focus:outline-none"
            >
              <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-olive/65">
                Itinerary metadata
              </h3>
              <ChevronDown
                size={14}
                strokeWidth={2.2}
                className={`text-olive/60 transition-transform duration-200 ${
                  isMetadataOpen ? "rotate-180" : ""
                }`}
              />
            </button>
            {isMetadataOpen ? (
              <>
            <div className="grid grid-cols-2 gap-2">
              <label>
                <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-olive/60">
                  Vocabulary
                </span>
                <select
                  value={groupVocabulary}
                  onChange={(event) =>
                    setGroupVocabulary(event.target.value as "day" | "stage")
                  }
                  className="h-10 w-full rounded-[9px] border border-border/90 bg-[#FBF8EF]/62 px-3 text-sm font-bold outline-none focus:border-rust/65 focus:ring-2 focus:ring-rust/15"
                >
                  <option value="day">Days</option>
                  <option value="stage">Stages</option>
                </select>
              </label>
              <label>
                <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-olive/60">
                  Duration (days)
                </span>
                <input
                  type="number"
                  min={0}
                  value={metadata.durationDays ?? ""}
                  onChange={(event) =>
                    updateMetadata({
                      durationDays: event.target.value === "" ? null : Number(event.target.value)
                    })
                  }
                  className="h-10 w-full rounded-[9px] border border-border/90 bg-[#FBF8EF]/62 px-3 text-sm font-bold outline-none focus:border-rust/65 focus:ring-2 focus:ring-rust/15"
                />
              </label>
            </div>
            <label>
              <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-olive/60">
                Destination
              </span>
              <input
                value={metadata.destination}
                onChange={(event) => updateMetadata({ destination: event.target.value })}
                placeholder="Patagonia, Argentina"
                className="h-10 w-full rounded-[9px] border border-border/90 bg-[#FBF8EF]/62 px-3 text-sm font-bold outline-none focus:border-rust/65 focus:ring-2 focus:ring-rust/15"
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label>
                <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-olive/60">
                  Difficulty
                </span>
                <select
                  value={metadata.difficulty}
                  onChange={(event) =>
                    updateMetadata({
                      difficulty: event.target.value as RouteMetadata["difficulty"]
                    })
                  }
                  className="h-10 w-full rounded-[9px] border border-border/90 bg-[#FBF8EF]/62 px-3 text-sm font-bold outline-none focus:border-rust/65 focus:ring-2 focus:ring-rust/15"
                >
                  <option value="">—</option>
                  <option value="easy">Easy</option>
                  <option value="moderate">Moderate</option>
                  <option value="challenging">Challenging</option>
                  <option value="expert">Expert</option>
                </select>
              </label>
              <label>
                <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-olive/60">
                  Season
                </span>
                <input
                  value={metadata.season}
                  onChange={(event) => updateMetadata({ season: event.target.value })}
                  placeholder="Nov – Mar"
                  className="h-10 w-full rounded-[9px] border border-border/90 bg-[#FBF8EF]/62 px-3 text-sm font-bold outline-none focus:border-rust/65 focus:ring-2 focus:ring-rust/15"
                />
              </label>
            </div>
            <label>
              <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-olive/60">
                Audience
              </span>
              <input
                value={metadata.audience}
                onChange={(event) => updateMetadata({ audience: event.target.value })}
                placeholder="Self-guided, fit hikers"
                className="h-10 w-full rounded-[9px] border border-border/90 bg-[#FBF8EF]/62 px-3 text-sm font-bold outline-none focus:border-rust/65 focus:ring-2 focus:ring-rust/15"
              />
            </label>
              </>
            ) : null}
          </section>

          <section className="grid gap-2 border-t border-border/80 pt-4">
            <button
              type="button"
              onClick={handleDownloadPng}
              className="flex h-11 items-center justify-center gap-2 rounded-[10px] bg-rust px-4 text-sm font-bold text-white transition hover:bg-brassLight active:translate-y-px focus:outline-none focus:ring-2 focus:ring-rust/35"
            >
              {exportStatus === "rendering" ? <Loader2 size={16} className="animate-spin" /> : <ImageIcon size={16} />}
              Download PNG
            </button>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={handleDownloadPdf}
                className="flex h-11 items-center justify-center gap-2 rounded-[10px] border border-border/90 bg-[#FBF8EF]/62 px-3 text-xs font-bold transition hover:border-rust/35 hover:bg-[#FBF8EF]/90 focus:outline-none focus:ring-2 focus:ring-rust/30"
              >
                <FileText size={15} />
                PDF
              </button>
              <button
                type="button"
                onClick={handleDownloadSvg}
                className="flex h-11 items-center justify-center gap-2 rounded-[10px] border border-border/90 bg-[#FBF8EF]/62 px-3 text-xs font-bold transition hover:border-rust/35 hover:bg-[#FBF8EF]/90 focus:outline-none focus:ring-2 focus:ring-rust/30"
              >
                <FileText size={15} />
                SVG
              </button>
              <button
                type="button"
                onClick={handleCopyEmbed}
                className="flex h-11 items-center justify-center gap-2 rounded-[10px] border border-border/90 bg-[#FBF8EF]/62 px-3 text-xs font-bold transition hover:border-rust/35 hover:bg-[#FBF8EF]/90 focus:outline-none focus:ring-2 focus:ring-rust/30"
              >
                {exportStatus === "copied" ? <Check size={15} /> : <Code2 size={15} />}
                Embed
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleDownloadGeo("gpx")}
                disabled={waypoints.length === 0}
                className="flex h-11 items-center justify-center gap-2 rounded-[10px] border border-border/90 bg-[#FBF8EF]/62 px-3 text-xs font-bold transition hover:border-rust/35 hover:bg-[#FBF8EF]/90 disabled:cursor-not-allowed disabled:opacity-45 focus:outline-none focus:ring-2 focus:ring-rust/30"
              >
                <MapIcon size={15} />
                GPX
              </button>
              <button
                type="button"
                onClick={() => handleDownloadGeo("kml")}
                disabled={waypoints.length === 0}
                className="flex h-11 items-center justify-center gap-2 rounded-[10px] border border-border/90 bg-[#FBF8EF]/62 px-3 text-xs font-bold transition hover:border-rust/35 hover:bg-[#FBF8EF]/90 disabled:cursor-not-allowed disabled:opacity-45 focus:outline-none focus:ring-2 focus:ring-rust/30"
              >
                <MapIcon size={15} />
                KML
              </button>
            </div>
            <button
              type="button"
              onClick={onNavigationHandoff}
              disabled={waypoints.length === 0}
              className="flex h-10 items-center justify-center gap-2 rounded-[10px] border border-border/90 bg-transparent px-3 text-xs font-bold text-olive transition hover:border-rust/35 hover:text-rust disabled:cursor-not-allowed disabled:opacity-45 focus:outline-none focus:ring-2 focus:ring-rust/30"
            >
              <Navigation size={14} />
              Navigation handoff
              <ExternalLink size={13} />
            </button>
            {exportStatus === "copied" ? (
              <p className="text-center text-xs font-bold text-olive">Embed snippet copied.</p>
            ) : null}
            {exportStatus === "error" ? (
              <p className="text-center text-xs font-bold text-danger">
                Export failed. Try a smaller size or allow popups for PDF.
              </p>
            ) : null}
          </section>
        </div>
      </aside>

      <main className="nice-scrollbar min-h-0 overflow-auto px-3 py-4 lg:px-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-ink">
          <div className="rounded-full border border-ink/10 bg-paper/70 px-4 py-1.5 shadow-map backdrop-blur-xl">
            <p className="text-xs font-bold">Clean export preview</p>
            <p className="text-[11px] font-semibold text-olive/75">
              {preset.width} x {preset.height}px
            </p>
          </div>
          <button
            type="button"
            onClick={handleDownloadPng}
            disabled={exportStatus === "rendering"}
            className="flex items-center gap-2 rounded-full border border-ink/10 bg-rust px-4 py-1.5 text-xs font-bold text-white shadow-map transition hover:bg-brassLight active:translate-y-px focus:outline-none focus:ring-2 focus:ring-rust/35 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {exportStatus === "rendering" ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Download size={13} />
            )}
            Download
          </button>
        </div>
        <div className="flex min-h-[calc(100dvh-76px)] items-start justify-center">
          <div
            ref={artboardRef}
            className="origin-top overflow-hidden shadow-[0_40px_120px_rgba(0,0,0,0.35)]"
            style={{
              width: preset.width,
              height: preset.height,
              transform: `scale(${artboardScale})`
            }}
          >
            <ExportMapArtwork
              routeName={routeName}
              waypoints={waypoints}
              groups={waypointGroups}
              manualRoutes={manualRoutes}
              routeDataByGroup={routeDataByGroup}
              mapStyle={mapStyle}
              routeDistance={routeDistance || routeMetrics.distanceKm}
              terrainSplit={terrainSplit}
              settings={exportSettings}
              mapWidth={preset.width}
              mapHeight={preset.height}
              metadata={metadata}
              showMapLabels={showMapLabels}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
