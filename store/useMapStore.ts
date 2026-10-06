import { create } from "zustand";
import type { FeatureCollection, LineString } from "geojson";

export type Waypoint = {
  id: string;
  name: string;
  coordinates: [number, number];
  groupId: string;
};

export type MapStyleKey =
  | "editorial-alpine"
  | "minimal-brochure"
  | "dark-expedition"
  | "neon-nights"
  | "satellite-explorer"
  | "bright"
  | "camouflage"
  | "swiss-ski"
  | "vintage"
  | "whaam"
  | "klokantech-basic"
  | "dark-matter"
  | "fiord-color"
  | "klokantech-3d"
  | "klokantech-terrain"
  | "osm-bright"
  | "osm-liberty"
  | "positron"
  | "toner";
export type MapStyleProvider = "mapbox" | "openfreemap" | "third-party";
export type RoutePaletteKey = "orange" | "olive" | "sand" | "mono";
export type ExportPresetKey =
  | "presentation"
  | "a4-portrait"
  | "a4-landscape"
  | "website-embed"
  | "square"
  | "custom";

export type CornerPosition = "tl" | "tr" | "bl" | "br";
export type NorthArrowStyle = "none" | "minimal" | "classic" | "compass";
export type ScaleBarUnits = "off" | "metric" | "imperial";
export type LegendColumns = 1 | 2;

export type ExportSettings = {
  preset: ExportPresetKey;
  title: string;
  subtitle: string;
  notes: string;
  brandName: string;
  brandColor: string;
  showLegend: boolean;
  showSummary: boolean;
  showLabels: boolean;
  markerStyle: "numbered" | "pin" | "dot";
  routeThickness: number;
  labelDensity: "clean" | "standard" | "detailed";
  customWidth: number;
  customHeight: number;
  northArrow: NorthArrowStyle;
  northArrowPosition: CornerPosition;
  scaleBar: ScaleBarUnits;
  scaleBarPosition: CornerPosition;
  attributionPosition: CornerPosition;
  attributionStyle: "light" | "dark";
  legendColumns: LegendColumns;
  legendHiddenGroupIds: string[];
  legendLabelOverrides: Record<string, string>;
  showElevationProfile: boolean;
  hiddenWaypointIds: string[];
  chromeMode: "framed" | "map-only";
};

export type RouteMetadata = {
  destination: string;
  durationDays: number | null;
  difficulty: "easy" | "moderate" | "challenging" | "expert" | "";
  season: string;
  departureMonths: string[];
  audience: string;
};

export const defaultRouteMetadata: RouteMetadata = {
  destination: "",
  durationDays: null,
  difficulty: "",
  season: "",
  departureMonths: [],
  audience: ""
};

export type GroupVocabulary = "day" | "stage";

export type RouteMetrics = {
  distanceKm: number;
  tarmacKm: number;
  offRoadKm: number;
};

export type MapTool = "point" | "draw-unpaved";

export type ManualRoute = {
  id: string;
  name: string;
  groupId: string;
  mode: "unpaved";
  coordinates: [number, number][];
  endpointWaypointIds: [string, string];
  generatedEndpointWaypointIds?: string[];
};

export type WaypointGroup = {
  id: string;
  name: string;
  color: string;
};

export type SavedRoute = {
  id: string;
  name: string;
  waypoints: Waypoint[];
  waypointGroups: WaypointGroup[];
  manualRoutes: ManualRoute[];
  mapStyle: string;
  mapStyleKey?: MapStyleKey;
  routePalette: RoutePaletteKey;
  exportSettings?: ExportSettings;
  metadata?: RouteMetadata;
  groupVocabulary?: GroupVocabulary;
  createdAt: string;
  updatedAt: string;
};

export type MapStyleDefinition = {
  key: MapStyleKey;
  label: string;
  url: string;
  provider: MapStyleProvider;
  requiresMapboxToken: boolean;
  supportsStaticApi: boolean;
  attribution: string;
  tone: string;
  knownWarnings?: string[];
};

export const MAP_STYLE_DEFINITIONS: Record<MapStyleKey, MapStyleDefinition> = {
  "editorial-alpine": {
    key: "editorial-alpine",
    label: "Editorial Alpine",
    url: "mapbox://styles/mapbox/outdoors-v12",
    provider: "mapbox",
    requiresMapboxToken: true,
    supportsStaticApi: true,
    attribution: "Mapbox / OpenStreetMap",
    tone: "bg-[#DC6432]"
  },
  "minimal-brochure": {
    key: "minimal-brochure",
    label: "Minimal Brochure",
    url: "mapbox://styles/mapbox/light-v11",
    provider: "mapbox",
    requiresMapboxToken: true,
    supportsStaticApi: true,
    attribution: "Mapbox / OpenStreetMap",
    tone: "bg-[#EEE0B6]"
  },
  "dark-expedition": {
    key: "dark-expedition",
    label: "Dark Expedition",
    url: "mapbox://styles/mapbox/dark-v11",
    provider: "mapbox",
    requiresMapboxToken: true,
    supportsStaticApi: true,
    attribution: "Mapbox / OpenStreetMap",
    tone: "bg-[#171B18]"
  },
  "satellite-explorer": {
    key: "satellite-explorer",
    label: "Satellite Explorer",
    url: "mapbox://styles/mapbox/satellite-streets-v12",
    provider: "mapbox",
    requiresMapboxToken: true,
    supportsStaticApi: true,
    attribution: "Mapbox / OpenStreetMap",
    tone: "bg-[#4A6B3A]"
  },
  "neon-nights": {
    key: "neon-nights",
    label: "Neon Nights",
    url: "/styles/neon.json",
    provider: "third-party",
    requiresMapboxToken: true,
    supportsStaticApi: false,
    attribution: "Mapbox / OpenStreetMap",
    tone: "bg-[#19D3DA]",
    knownWarnings: ["External sprite icons may be missing until the style is fully ported."]
  },
  bright: {
    key: "bright",
    label: "Daylight Atlas",
    url: "/styles/bright.json",
    provider: "mapbox",
    requiresMapboxToken: true,
    supportsStaticApi: false,
    attribution: "Mapbox / OpenStreetMap",
    tone: "bg-[#F2D7A0]"
  },
  camouflage: {
    key: "camouflage",
    label: "Field Olive",
    url: "/styles/camouflage.json",
    provider: "third-party",
    requiresMapboxToken: true,
    supportsStaticApi: false,
    attribution: "Mapbox / OpenStreetMap",
    tone: "bg-[#6B6F4A]"
  },
  "swiss-ski": {
    key: "swiss-ski",
    label: "Alpine Powder",
    url: "/styles/swiss-ski.json",
    provider: "third-party",
    requiresMapboxToken: true,
    supportsStaticApi: false,
    attribution: "Mapbox / OpenStreetMap",
    tone: "bg-[#BFD8E6]"
  },
  vintage: {
    key: "vintage",
    label: "Heritage Press",
    url: "/styles/vintage.json",
    provider: "third-party",
    requiresMapboxToken: true,
    supportsStaticApi: false,
    attribution: "Mapbox / OpenStreetMap",
    tone: "bg-[#C7A87A]"
  },
  whaam: {
    key: "whaam",
    label: "Comic Pop",
    url: "/styles/whaam.json",
    provider: "third-party",
    requiresMapboxToken: true,
    supportsStaticApi: false,
    attribution: "Mapbox / OpenStreetMap",
    tone: "bg-[#E8413A]"
  },
  "klokantech-basic": {
    key: "klokantech-basic",
    label: "Studio Neutral",
    url: "/styles/klokantech-basic.json",
    provider: "openfreemap",
    requiresMapboxToken: false,
    supportsStaticApi: false,
    attribution: "OpenFreeMap / OpenMapTiles / OpenStreetMap",
    tone: "bg-[#E4E0D8]"
  },
  "dark-matter": {
    key: "dark-matter",
    label: "Midnight Atlas",
    url: "/styles/dark-matter.json",
    provider: "openfreemap",
    requiresMapboxToken: false,
    supportsStaticApi: false,
    attribution: "OpenFreeMap / OpenMapTiles / OpenStreetMap",
    tone: "bg-[#0F1620]"
  },
  "fiord-color": {
    key: "fiord-color",
    label: "Nordic Fjord",
    url: "/styles/fiord-color.json",
    provider: "openfreemap",
    requiresMapboxToken: false,
    supportsStaticApi: false,
    attribution: "OpenFreeMap / OpenMapTiles / OpenStreetMap",
    tone: "bg-[#2E3B4E]"
  },
  "klokantech-3d": {
    key: "klokantech-3d",
    label: "Skyline 3D",
    url: "/styles/klokantech-3d.json",
    provider: "openfreemap",
    requiresMapboxToken: false,
    supportsStaticApi: false,
    attribution: "OpenFreeMap / OpenMapTiles / OpenStreetMap",
    tone: "bg-[#D8D4C8]"
  },
  "klokantech-terrain": {
    key: "klokantech-terrain",
    label: "Backcountry Relief",
    url: "/styles/klokantech-terrain.json",
    provider: "openfreemap",
    requiresMapboxToken: false,
    supportsStaticApi: false,
    attribution: "OpenFreeMap / OpenMapTiles / OpenStreetMap",
    tone: "bg-[#A9B98C]"
  },
  "osm-bright": {
    key: "osm-bright",
    label: "Wayfarer Bright",
    url: "/styles/osm-bright.json",
    provider: "openfreemap",
    requiresMapboxToken: false,
    supportsStaticApi: false,
    attribution: "OpenFreeMap / OpenMapTiles / OpenStreetMap",
    tone: "bg-[#F0E6C8]"
  },
  "osm-liberty": {
    key: "osm-liberty",
    label: "Open Road",
    url: "/styles/osm-liberty.json",
    provider: "openfreemap",
    requiresMapboxToken: false,
    supportsStaticApi: false,
    attribution: "OpenFreeMap / OpenMapTiles / OpenStreetMap",
    tone: "bg-[#D9CFC0]"
  },
  positron: {
    key: "positron",
    label: "Paper Light",
    url: "/styles/positron.json",
    provider: "openfreemap",
    requiresMapboxToken: false,
    supportsStaticApi: false,
    attribution: "OpenFreeMap / OpenMapTiles / OpenStreetMap",
    tone: "bg-[#F3F3F1]"
  },
  toner: {
    key: "toner",
    label: "Ink & Paper",
    url: "/styles/toner.json",
    provider: "openfreemap",
    requiresMapboxToken: false,
    supportsStaticApi: false,
    attribution: "OpenFreeMap / OpenMapTiles / OpenStreetMap",
    tone: "bg-[#1A1A1A]"
  }
};

export const MAP_STYLES = Object.fromEntries(
  Object.entries(MAP_STYLE_DEFINITIONS).map(([key, definition]) => [key, definition.url])
) as Record<MapStyleKey, string>;

const isRoutePaletteKey = (value: unknown): value is RoutePaletteKey =>
  value === "orange" || value === "olive" || value === "sand" || value === "mono";

const isMapStyleValue = (value: unknown): value is string =>
  typeof value === "string" && Object.values(MAP_STYLES).includes(value);

export const getGeneratedEndpointIds = (route: ManualRoute | undefined): string[] => {
  if (!route) return [];
  if (route.generatedEndpointWaypointIds) return route.generatedEndpointWaypointIds;

  return route.endpointWaypointIds.filter(
    (id) => id === `${route.id}-start` || id === `${route.id}-end`
  );
};

const SAVED_ROUTES_KEY = "nicemaps.savedRoutes";

export const defaultExportSettings: ExportSettings = {
  preset: "presentation",
  title: "Untitled map",
  subtitle: "Client-ready route map",
  notes: "Designed in NiceMaps",
  brandName: "NiceMaps",
  brandColor: "#DC6432",
  showLegend: true,
  showSummary: true,
  showLabels: true,
  markerStyle: "numbered",
  routeThickness: 5,
  labelDensity: "standard",
  customWidth: 1600,
  customHeight: 1000,
  northArrow: "minimal",
  northArrowPosition: "tr",
  scaleBar: "metric",
  scaleBarPosition: "bl",
  attributionPosition: "br",
  attributionStyle: "light",
  legendColumns: 1,
  legendHiddenGroupIds: [],
  legendLabelOverrides: {},
  showElevationProfile: false,
  hiddenWaypointIds: [],
  chromeMode: "framed"
};

const isRouteDerivedExportTitle = (title: string, routeName: string) => {
  const normalizedTitle = title.trim();
  const normalizedRouteName = getRouteName(routeName);

  return (
    normalizedTitle === "" ||
    normalizedTitle === defaultExportSettings.title ||
    normalizedTitle === normalizedRouteName
  );
};

const syncRouteDerivedExportTitle = (
  exportSettings: ExportSettings,
  nextRouteName: string,
  previousRouteName: string
): ExportSettings => {
  if (!isRouteDerivedExportTitle(exportSettings.title, previousRouteName)) {
    return exportSettings;
  }

  return {
    ...exportSettings,
    title: getRouteName(nextRouteName)
  };
};

const mergeSavedExportSettings = (
  routeName: string,
  exportSettings?: ExportSettings
): ExportSettings => {
  const merged = {
    ...defaultExportSettings,
    ...(exportSettings ?? {})
  };

  if (!exportSettings || isRouteDerivedExportTitle(merged.title, routeName)) {
    return {
      ...merged,
      title: routeName
    };
  }

  return merged;
};

type MapStore = {
  currentRouteId: string | null;
  routeName: string;
  savedRoutes: SavedRoute[];
  waypoints: Waypoint[];
  waypointGroups: WaypointGroup[];
  mapStyle: string;
  routePalette: RoutePaletteKey;
  routeMetricsByGroup: Record<string, RouteMetrics>;
  routeDataByGroup: Record<string, FeatureCollection<LineString>>;
  selectedAddGroupId: string;
  activeMapTool: MapTool;
  manualRoutes: ManualRoute[];
  exportSettings: ExportSettings;
  metadata: RouteMetadata;
  groupVocabulary: GroupVocabulary;
  showMapLabels: boolean;
  setShowMapLabels: (value: boolean) => void;
  hydrateSavedRoutes: () => void;
  updateMetadata: (updates: Partial<RouteMetadata>) => void;
  setGroupVocabulary: (vocab: GroupVocabulary) => void;
  importBundle: (bundle: {
    groupName?: string;
    waypoints: Array<{ name: string; coordinates: [number, number] }>;
    line?: [number, number][];
  }) => void;
  setRouteName: (name: string) => void;
  saveCurrentRoute: () => SavedRoute | null;
  createNewRoute: (name?: string) => void;
  loadSavedRoute: (routeId: string) => void;
  deleteSavedRoute: (routeId: string) => void;
  addWaypoint: (waypoint?: Waypoint) => void;
  addWaypointGroup: () => void;
  deleteWaypointGroup: (id: string) => void;
  updateWaypointGroup: (id: string, updates: Partial<Pick<WaypointGroup, "name" | "color">>) => void;
  assignWaypointToGroup: (waypointId: string, groupId: string) => void;
  moveWaypointToGroup: (waypointId: string, groupId: string, groupIndex: number) => void;
  updateWaypointName: (waypointId: string, name: string) => void;
  updateWaypointCoordinates: (waypointId: string, coordinates: [number, number]) => void;
  removeWaypoint: (id: string) => void;
  reorderWaypoints: (startIndex: number, endIndex: number) => void;
  setMapStyle: (style: string) => void;
  setRoutePalette: (palette: RoutePaletteKey) => void;
  updateExportSettings: (settings: Partial<ExportSettings>) => void;
  setRouteMetricsByGroup: (metrics: Record<string, RouteMetrics>) => void;
  setRouteDataByGroup: (routes: Record<string, FeatureCollection<LineString>>) => void;
  setSelectedAddGroupId: (groupId: string) => void;
  setActiveMapTool: (tool: MapTool) => void;
  addManualRoute: (route: Omit<ManualRoute, "id" | "groupId" | "name"> & { id?: string; groupId?: string; name?: string }) => void;
  updateManualRouteName: (routeId: string, name: string) => void;
  removeManualRoute: (routeId: string) => void;
  clearManualRoutesForGroup: (groupId: string) => void;
};

const groupColors = ["#DC6432", "#645A32", "#3F7652", "#D96758", "#596247"];

const getRouteName = (name: string) => name.trim() || "Untitled route";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isCoordinate = (value: unknown): value is [number, number] =>
  Array.isArray(value) &&
  value.length === 2 &&
  typeof value[0] === "number" &&
  typeof value[1] === "number" &&
  Number.isFinite(value[0]) &&
  Number.isFinite(value[1]) &&
  value[0] >= -180 &&
  value[0] <= 180 &&
  value[1] >= -90 &&
  value[1] <= 90;

const isMapStyleKey = (value: unknown): value is MapStyleKey =>
  typeof value === "string" && value in MAP_STYLES;

const sanitizeWaypoint = (value: unknown): Waypoint | null => {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.name !== "string") {
    return null;
  }

  if (typeof value.groupId !== "string" || !isCoordinate(value.coordinates)) {
    return null;
  }

  return {
    id: value.id,
    name: value.name,
    coordinates: value.coordinates,
    groupId: value.groupId
  };
};

const sanitizeWaypointGroup = (value: unknown): WaypointGroup | null => {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.name !== "string" ||
    typeof value.color !== "string"
  ) {
    return null;
  }

  return {
    id: value.id,
    name: value.name,
    color: value.color
  };
};

const sanitizeManualRoute = (value: unknown): ManualRoute | null => {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.name !== "string" ||
    typeof value.groupId !== "string" ||
    value.mode !== "unpaved" ||
    !Array.isArray(value.coordinates) ||
    !Array.isArray(value.endpointWaypointIds) ||
    value.endpointWaypointIds.length !== 2 ||
    typeof value.endpointWaypointIds[0] !== "string" ||
    typeof value.endpointWaypointIds[1] !== "string"
  ) {
    return null;
  }

  const coordinates = value.coordinates.filter(isCoordinate);

  if (coordinates.length < 2) {
    return null;
  }

  const generatedEndpointWaypointIds = Array.isArray(value.generatedEndpointWaypointIds)
    ? value.generatedEndpointWaypointIds.filter((id): id is string => typeof id === "string")
    : undefined;

  return {
    id: value.id,
    name: value.name,
    groupId: value.groupId,
    mode: "unpaved",
    coordinates,
    endpointWaypointIds: [value.endpointWaypointIds[0], value.endpointWaypointIds[1]],
    ...(generatedEndpointWaypointIds ? { generatedEndpointWaypointIds } : {})
  };
};

const sanitizeExportSettings = (value: unknown, routeName: string): ExportSettings => {
  if (!isRecord(value)) {
    return { ...defaultExportSettings, title: routeName };
  }

  return {
    ...defaultExportSettings,
    title: routeName,
    ...value,
    legendHiddenGroupIds: Array.isArray(value.legendHiddenGroupIds)
      ? value.legendHiddenGroupIds.filter((id): id is string => typeof id === "string")
      : [],
    legendLabelOverrides: isRecord(value.legendLabelOverrides)
      ? Object.fromEntries(
          Object.entries(value.legendLabelOverrides).filter(
            ([, label]) => typeof label === "string"
          )
        )
      : {},
    hiddenWaypointIds: Array.isArray(value.hiddenWaypointIds)
      ? value.hiddenWaypointIds.filter((id): id is string => typeof id === "string")
      : []
  } as ExportSettings;
};

const sanitizeMetadata = (value: unknown): RouteMetadata => {
  if (!isRecord(value)) {
    return { ...defaultRouteMetadata };
  }

  return {
    destination: typeof value.destination === "string" ? value.destination : "",
    durationDays: typeof value.durationDays === "number" ? value.durationDays : null,
    difficulty:
      value.difficulty === "easy" ||
      value.difficulty === "moderate" ||
      value.difficulty === "challenging" ||
      value.difficulty === "expert"
        ? value.difficulty
        : "",
    season: typeof value.season === "string" ? value.season : "",
    departureMonths: Array.isArray(value.departureMonths)
      ? value.departureMonths.filter((month): month is string => typeof month === "string")
      : [],
    audience: typeof value.audience === "string" ? value.audience : ""
  };
};

const sanitizeSavedRoute = (value: unknown): SavedRoute | null => {
  if (!isRecord(value) || typeof value.id !== "string") {
    return null;
  }

  const name = typeof value.name === "string" ? getRouteName(value.name) : "Untitled route";
  const waypoints = Array.isArray(value.waypoints)
    ? value.waypoints.map(sanitizeWaypoint).filter((waypoint): waypoint is Waypoint => waypoint !== null)
    : [];
  const waypointGroups = Array.isArray(value.waypointGroups)
    ? value.waypointGroups
        .map(sanitizeWaypointGroup)
        .filter((group): group is WaypointGroup => group !== null)
    : [];
  const manualRoutes = Array.isArray(value.manualRoutes)
    ? value.manualRoutes
        .map(sanitizeManualRoute)
        .filter((route): route is ManualRoute => route !== null)
    : [];
  const mapStyleKey = isMapStyleKey(value.mapStyleKey)
    ? value.mapStyleKey
    : (Object.entries(MAP_STYLES).find(([, style]) => style === value.mapStyle)?.[0] as
        | MapStyleKey
        | undefined);
  const mapStyle = isMapStyleValue(value.mapStyle)
    ? value.mapStyle
    : MAP_STYLES[mapStyleKey ?? "editorial-alpine"];

  return {
    id: value.id,
    name,
    waypoints,
    waypointGroups,
    manualRoutes,
    mapStyle,
    mapStyleKey: mapStyleKey ?? "editorial-alpine",
    routePalette: isRoutePaletteKey(value.routePalette) ? value.routePalette : "orange",
    exportSettings: sanitizeExportSettings(value.exportSettings, name),
    metadata: sanitizeMetadata(value.metadata),
    groupVocabulary: value.groupVocabulary === "stage" ? "stage" : "day",
    createdAt: typeof value.createdAt === "string" ? value.createdAt : new Date().toISOString(),
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : new Date().toISOString()
  };
};

const getStorage = () => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

const readSavedRoutes = (): SavedRoute[] => {
  const storage = getStorage();
  if (!storage) {
    return [];
  }

  try {
    const rawRoutes = storage.getItem(SAVED_ROUTES_KEY);

    if (!rawRoutes) {
      return [];
    }

    const parsedRoutes = JSON.parse(rawRoutes);

    return Array.isArray(parsedRoutes)
      ? parsedRoutes
          .map(sanitizeSavedRoute)
          .filter((route): route is SavedRoute => route !== null)
      : [];
  } catch {
    return [];
  }
};

const writeSavedRoutes = (routes: SavedRoute[]) => {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  try {
    storage.setItem(SAVED_ROUTES_KEY, JSON.stringify(routes));
  } catch {
    // localStorage can be unavailable, blocked, or over quota; keep in-memory state.
  }
};

const createWaypointGroup = (
  groupNumber: number,
  id = `group-${Date.now()}`,
  vocab: GroupVocabulary = "day"
): WaypointGroup => ({
  id,
  name: `${vocab === "stage" ? "Stage" : "Day"} ${groupNumber}`,
  color: groupColors[(groupNumber - 1) % groupColors.length]
});

const initialGroups: WaypointGroup[] = [];

const initialWaypoints: Waypoint[] = [];

const createInterlakenWaypoint = (): Waypoint => ({
  id: `interlaken-${Date.now()}`,
  name: "Interlaken",
  coordinates: [7.8632, 46.6863],
  groupId: "group-1"
});

export const useMapStore = create<MapStore>((set) => ({
  currentRouteId: null,
  routeName: "Untitled route",
  savedRoutes: [],
  waypoints: initialWaypoints,
  waypointGroups: initialGroups,
  mapStyle: MAP_STYLES["editorial-alpine"],
  routePalette: "orange",
  routeMetricsByGroup: {},
  routeDataByGroup: {},
  selectedAddGroupId: "",
  activeMapTool: "point",
  manualRoutes: [],
  exportSettings: defaultExportSettings,
  metadata: defaultRouteMetadata,
  groupVocabulary: "day",
  showMapLabels: true,
  setShowMapLabels: (value) => set({ showMapLabels: value }),
  updateMetadata: (updates) =>
    set((state) => ({ metadata: { ...state.metadata, ...updates } })),
  setGroupVocabulary: (vocab) => set({ groupVocabulary: vocab }),
  importBundle: (bundle) =>
    set((state) => {
      const groupNumber = state.waypointGroups.length + 1;
      const groupId = `group-${Date.now()}`;
      const baseName =
        bundle.groupName?.trim() ||
        `${state.groupVocabulary === "stage" ? "Stage" : "Day"} ${groupNumber}`;
      const group: WaypointGroup = {
        id: groupId,
        name: baseName,
        color: groupColors[(groupNumber - 1) % groupColors.length]
      };
      const importedWaypoints: Waypoint[] = bundle.waypoints.map((wp, index) => ({
        id: `wp-${Date.now()}-${index}`,
        name: wp.name?.trim() || `Stop ${index + 1}`,
        coordinates: wp.coordinates,
        groupId
      }));
      const manualRoutesAddition: ManualRoute[] = [];
      if (bundle.line && bundle.line.length >= 2 && importedWaypoints.length >= 2) {
        const first = importedWaypoints[0]!;
        const last = importedWaypoints[importedWaypoints.length - 1]!;
        manualRoutesAddition.push({
          id: `manual-route-${Date.now()}`,
          name: `${baseName} track`,
          groupId,
          mode: "unpaved",
          coordinates: bundle.line,
          endpointWaypointIds: [first.id, last.id]
        });
      }
      return {
        waypointGroups: [...state.waypointGroups, group],
        waypoints: [...state.waypoints, ...importedWaypoints],
        manualRoutes: [...state.manualRoutes, ...manualRoutesAddition],
        selectedAddGroupId: groupId
      };
    }),
  hydrateSavedRoutes: () => set({ savedRoutes: readSavedRoutes() }),
  setRouteName: (name) =>
    set((state) => ({
      routeName: name,
      exportSettings: syncRouteDerivedExportTitle(
        state.exportSettings,
        name,
        state.routeName
      )
    })),
  saveCurrentRoute: () => {
    let savedRoute: SavedRoute | null = null;

    set((state) => {
      const timestamp = new Date().toISOString();
      const routeId = state.currentRouteId ?? `route-${Date.now()}`;
      const existingRoute = state.savedRoutes.find((route) => route.id === routeId);
      const nextRoute: SavedRoute = {
        id: routeId,
        name: getRouteName(state.routeName),
        waypoints: state.waypoints,
        waypointGroups: state.waypointGroups,
        manualRoutes: state.manualRoutes,
        mapStyle: state.mapStyle,
        mapStyleKey:
          (Object.entries(MAP_STYLES).find(([, style]) => style === state.mapStyle)?.[0] as
            | MapStyleKey
            | undefined) ?? "editorial-alpine",
        routePalette: state.routePalette,
        exportSettings: state.exportSettings,
        metadata: state.metadata,
        groupVocabulary: state.groupVocabulary,
        createdAt: existingRoute?.createdAt ?? timestamp,
        updatedAt: timestamp
      };
      const savedRoutes = [
        nextRoute,
        ...state.savedRoutes.filter((route) => route.id !== routeId)
      ];

      savedRoute = nextRoute;
      writeSavedRoutes(savedRoutes);

      return {
        currentRouteId: routeId,
        routeName: nextRoute.name,
        savedRoutes
      };
    });

    return savedRoute;
  },
  createNewRoute: (name) =>
    set({
      currentRouteId: null,
      routeName: getRouteName(name ?? "Untitled route"),
      waypoints: [],
      waypointGroups: [],
      selectedAddGroupId: "",
      manualRoutes: [],
      routeMetricsByGroup: {},
      routeDataByGroup: {},
      activeMapTool: "point",
      exportSettings: {
        ...defaultExportSettings,
        title: getRouteName(name ?? "Untitled route")
      },
      metadata: defaultRouteMetadata,
      groupVocabulary: "day"
    }),
  loadSavedRoute: (routeId) =>
    set((state) => {
      const savedRoute = state.savedRoutes.find((route) => route.id === routeId);

      if (!savedRoute) {
        return {};
      }

      const fallbackGroupId =
        savedRoute.waypointGroups.at(-1)?.id ?? savedRoute.waypointGroups[0]?.id ?? "";

      return {
        currentRouteId: savedRoute.id,
        routeName: savedRoute.name,
        waypoints: savedRoute.waypoints,
        waypointGroups: savedRoute.waypointGroups,
        manualRoutes: savedRoute.manualRoutes,
        mapStyle: savedRoute.mapStyle,
        routePalette: savedRoute.routePalette,
        exportSettings: mergeSavedExportSettings(savedRoute.name, savedRoute.exportSettings),
        metadata: { ...defaultRouteMetadata, ...(savedRoute.metadata ?? {}) },
        groupVocabulary: savedRoute.groupVocabulary ?? "day",
        routeMetricsByGroup: {},
        routeDataByGroup: {},
        selectedAddGroupId: fallbackGroupId,
        activeMapTool: "point"
      };
    }),
  deleteSavedRoute: (routeId) =>
    set((state) => {
      const savedRoutes = state.savedRoutes.filter((route) => route.id !== routeId);

      writeSavedRoutes(savedRoutes);

      return {
        savedRoutes,
        currentRouteId: state.currentRouteId === routeId ? null : state.currentRouteId
      };
    }),
  addWaypoint: (waypoint) =>
    set((state) => {
      const shouldCreateInitialGroup = state.waypointGroups.length === 0;
      const waypointGroups = shouldCreateInitialGroup
        ? [createWaypointGroup(1, "group-1", state.groupVocabulary)]
        : state.waypointGroups;
      const fallbackGroupId =
        waypointGroups.at(-1)?.id ?? waypointGroups[0]?.id ?? "group-1";
      const targetGroupId = waypointGroups.some(
        (group) => group.id === state.selectedAddGroupId
      )
        ? state.selectedAddGroupId
        : fallbackGroupId;

      return {
        waypointGroups,
        selectedAddGroupId: targetGroupId,
        waypoints: [
          ...state.waypoints,
          waypoint
            ? {
                ...waypoint,
                groupId: waypoint.groupId || targetGroupId
              }
            : {
                ...createInterlakenWaypoint(),
                groupId: targetGroupId
              }
        ]
      };
    }),
  addWaypointGroup: () =>
    set((state) => {
      const groupNumber = state.waypointGroups.length + 1;
      const id = `group-${Date.now()}`;

      return {
        waypointGroups: [
          ...state.waypointGroups,
          createWaypointGroup(groupNumber, id, state.groupVocabulary)
        ],
        selectedAddGroupId: id
      };
    }),
  deleteWaypointGroup: (id) =>
    set((state) => {
      const remainingGroups = state.waypointGroups.filter((group) => group.id !== id);
      const fallbackGroupId = remainingGroups.at(-1)?.id ?? remainingGroups[0]?.id ?? "";

      return {
        waypointGroups: remainingGroups,
        selectedAddGroupId:
          state.selectedAddGroupId === id ? fallbackGroupId : state.selectedAddGroupId,
        waypoints: state.waypoints.filter((waypoint) => waypoint.groupId !== id),
        manualRoutes: state.manualRoutes.filter((route) => route.groupId !== id)
      };
    }),
  updateWaypointGroup: (id, updates) =>
    set((state) => ({
      waypointGroups: state.waypointGroups.map((group) =>
        group.id === id ? { ...group, ...updates } : group
      )
    })),
  assignWaypointToGroup: (waypointId, groupId) =>
    set((state) => ({
      waypoints: state.waypoints.map((waypoint) =>
        waypoint.id === waypointId ? { ...waypoint, groupId } : waypoint
      )
    })),
  moveWaypointToGroup: (waypointId, groupId, groupIndex) =>
    set((state) => {
      const waypoint = state.waypoints.find((item) => item.id === waypointId);

      if (!waypoint || !state.waypointGroups.some((group) => group.id === groupId)) {
        return { waypoints: state.waypoints };
      }

      const withoutWaypoint = state.waypoints.filter((item) => item.id !== waypointId);
      const targetWaypointIds = withoutWaypoint
        .filter((item) => item.groupId === groupId)
        .map((item) => item.id);
      const boundedIndex = Math.max(0, Math.min(groupIndex, targetWaypointIds.length));
      const beforeTargetId = targetWaypointIds[boundedIndex];
      const nextWaypoint = { ...waypoint, groupId };
      const insertIndex = beforeTargetId
        ? withoutWaypoint.findIndex((item) => item.id === beforeTargetId)
        : withoutWaypoint.findLastIndex((item) => item.groupId === groupId) + 1;
      const nextWaypoints = [...withoutWaypoint];

      nextWaypoints.splice(insertIndex < 0 ? nextWaypoints.length : insertIndex, 0, nextWaypoint);

      return { waypoints: nextWaypoints };
    }),
  updateWaypointName: (waypointId, name) =>
    set((state) => ({
      waypoints: state.waypoints.map((waypoint) =>
        waypoint.id === waypointId ? { ...waypoint, name } : waypoint
      )
    })),
  updateWaypointCoordinates: (waypointId, coordinates) =>
    set((state) => ({
      waypoints: state.waypoints.map((waypoint) =>
        waypoint.id === waypointId ? { ...waypoint, coordinates } : waypoint
      ),
      manualRoutes: state.manualRoutes.map((route) => {
        const endpointIndex = route.endpointWaypointIds.indexOf(waypointId);

        if (endpointIndex === -1) {
          return route;
        }

        const nextCoordinates = [...route.coordinates] as [number, number][];

        if (endpointIndex === 0) {
          nextCoordinates[0] = coordinates;
        } else {
          nextCoordinates[nextCoordinates.length - 1] = coordinates;
        }

        return { ...route, coordinates: nextCoordinates };
      })
    })),
  removeWaypoint: (id) =>
    set((state) => ({
      waypoints: state.waypoints.filter((waypoint) => waypoint.id !== id),
      manualRoutes: state.manualRoutes.filter(
        (route) => !route.endpointWaypointIds.includes(id)
      )
    })),
  reorderWaypoints: (startIndex, endIndex) =>
    set((state) => {
      const nextWaypoints = [...state.waypoints];
      const [removed] = nextWaypoints.splice(startIndex, 1);

      if (!removed) {
        return { waypoints: state.waypoints };
      }

      nextWaypoints.splice(endIndex, 0, removed);
      return { waypoints: nextWaypoints };
    }),
  setMapStyle: (style) => set({ mapStyle: style }),
  setRoutePalette: (palette) => set({ routePalette: palette }),
  updateExportSettings: (settings) =>
    set((state) => ({
      exportSettings: {
        ...state.exportSettings,
        ...settings
      }
    })),
  setRouteMetricsByGroup: (metrics) => set({ routeMetricsByGroup: metrics }),
  setRouteDataByGroup: (routes) => set({ routeDataByGroup: routes }),
  setSelectedAddGroupId: (groupId) =>
    set((state) => ({
      selectedAddGroupId: state.waypointGroups.some((group) => group.id === groupId)
        ? groupId
        : state.waypointGroups.at(-1)?.id ?? state.waypointGroups[0]?.id ?? ""
    })),
  setActiveMapTool: (tool) => set({ activeMapTool: tool }),
  addManualRoute: (route) =>
    set((state) => {
      const fallbackGroupId =
        state.waypointGroups.at(-1)?.id ?? state.waypointGroups[0]?.id ?? "group-1";
      const targetGroupId =
        route.groupId && state.waypointGroups.some((group) => group.id === route.groupId)
          ? route.groupId
          : state.selectedAddGroupId;

      return {
        manualRoutes: [
          ...state.manualRoutes,
          {
            ...route,
            id: route.id ?? `manual-route-${Date.now()}`,
            name: route.name ?? `Custom segment ${state.manualRoutes.length + 1}`,
            groupId: targetGroupId || fallbackGroupId
          }
        ]
      };
    }),
  updateManualRouteName: (routeId, name) =>
    set((state) => ({
      manualRoutes: state.manualRoutes.map((route) =>
        route.id === routeId ? { ...route, name } : route
      )
    })),
  removeManualRoute: (routeId) =>
    set((state) => {
      const route = state.manualRoutes.find((item) => item.id === routeId);
      const endpointIds = getGeneratedEndpointIds(route);

      return {
        manualRoutes: state.manualRoutes.filter((item) => item.id !== routeId),
        waypoints: state.waypoints.filter((waypoint) => !endpointIds.includes(waypoint.id))
      };
    }),
	  clearManualRoutesForGroup: (groupId) =>
	    set((state) => ({
	      manualRoutes: state.manualRoutes.filter((route) => route.groupId !== groupId),
	      waypoints: state.waypoints.filter(
	        (waypoint) =>
	          !state.manualRoutes
	            .filter((route) => route.groupId === groupId)
	            .some((route) => getGeneratedEndpointIds(route).includes(waypoint.id))
	      )
	    }))
}));
