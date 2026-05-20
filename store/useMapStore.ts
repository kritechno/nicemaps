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
  | "luxury-travel"
  | "dark-expedition"
  | "topographic-poster"
  | "agency-clean";
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

export const MAP_STYLES: Record<MapStyleKey, string> = {
  "editorial-alpine": "mapbox://styles/mapbox/outdoors-v12",
  "minimal-brochure": "mapbox://styles/mapbox/light-v11",
  "luxury-travel": "mapbox://styles/mapbox/streets-v12",
  "dark-expedition": "mapbox://styles/mapbox/dark-v11",
  "topographic-poster": "mapbox://styles/mapbox/outdoors-v12",
  "agency-clean": "mapbox://styles/mapbox/light-v11"
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

const canUseStorage = () => typeof window !== "undefined" && Boolean(window.localStorage);

const readSavedRoutes = (): SavedRoute[] => {
  if (!canUseStorage()) {
    return [];
  }

  try {
    const rawRoutes = window.localStorage.getItem(SAVED_ROUTES_KEY);

    if (!rawRoutes) {
      return [];
    }

    const parsedRoutes = JSON.parse(rawRoutes);

    return Array.isArray(parsedRoutes) ? parsedRoutes : [];
  } catch {
    return [];
  }
};

const writeSavedRoutes = (routes: SavedRoute[]) => {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(SAVED_ROUTES_KEY, JSON.stringify(routes));
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
  setRouteName: (name) => set({ routeName: name }),
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
        exportSettings: {
          ...defaultExportSettings,
          title: savedRoute.name,
          ...(savedRoute.exportSettings ?? {})
        },
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
      const endpointIds: string[] = route ? [...route.endpointWaypointIds] : [];

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
            .some((route) => route.endpointWaypointIds.includes(waypoint.id))
      )
    }))
}));
