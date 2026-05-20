"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  Clock3,
  Download,
  FolderOpen,
  GripVertical,
  Layers3,
  MapPinPlus,
  MapPinned,
  Menu,
  MousePointer2,
  PenLine,
  Plus,
  Save,
  Search,
  Trash2,
  UserCircle2,
  X
} from "lucide-react";
import {
  DragDropContext,
  Draggable,
  Droppable,
  type DropResult
} from "@hello-pangea/dnd";
import { ExportStudio } from "@/components/ExportStudio";
import logoSrc from "@/images/logo-transparent.png";
import {
  MAP_STYLES,
  type MapTool,
  type MapStyleKey,
  type Waypoint,
  type WaypointGroup,
  useMapStore
} from "@/store/useMapStore";

const styleOptions: Array<{
  key: MapStyleKey;
  label: string;
  tone: string;
}> = [
  { key: "editorial-alpine", label: "Editorial Alpine", tone: "bg-[#DC6432]" },
  { key: "minimal-brochure", label: "Minimal Brochure", tone: "bg-[#EEE0B6]" },
  { key: "luxury-travel", label: "Luxury Travel", tone: "bg-[#645A32]" },
  { key: "dark-expedition", label: "Dark Expedition", tone: "bg-[#171B18]" },
  { key: "topographic-poster", label: "Topo Poster", tone: "bg-[#3F7652]" },
  { key: "agency-clean", label: "Agency Clean", tone: "bg-[#D96758]" }
];

const toolOptions: Array<{
  key: MapTool;
  label: string;
  hint: string;
  Icon: typeof MousePointer2;
}> = [
  {
    key: "point",
    label: "Point",
    hint: "Drag or click",
    Icon: MapPinPlus
  },
  {
    key: "draw-unpaved",
    label: "Unpaved",
    hint: "Draw by hand",
    Icon: PenLine
  }
];

type GeocodingFeature = {
  id: string;
  place_name: string;
  text: string;
  center: [number, number];
  place_type?: string[];
  relevance?: number;
  context?: Array<{ id: string; text: string; short_code?: string }>;
};

type SearchStatus = "idle" | "typing" | "loading" | "ready" | "empty" | "error";

const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? "MAPBOX_ACCESS_TOKEN";
const searchTimeoutMs = 8000;

const estimateRouteDistance = (waypoints: Array<{ coordinates: [number, number] }>) => {
  if (waypoints.length < 2) {
    return 0;
  }

  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;

  return waypoints.slice(1).reduce((total, waypoint, index) => {
    const previous = waypoints[index];
    const [lng1, lat1] = previous.coordinates;
    const [lng2, lat2] = waypoint.coordinates;
    const deltaLat = toRadians(lat2 - lat1);
    const deltaLng = toRadians(lng2 - lng1);
    const a =
      Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(toRadians(lat1)) *
        Math.cos(toRadians(lat2)) *
        Math.sin(deltaLng / 2) *
        Math.sin(deltaLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return total + earthRadiusKm * c;
  }, 0);
};

const getDistanceKm = (
  [lng1, lat1]: [number, number],
  [lng2, lat2]: [number, number]
) => {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const deltaLat = toRadians(lat2 - lat1);
  const deltaLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(deltaLng / 2) *
      Math.sin(deltaLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusKm * c;
};

const rankByRouteContext = (
  features: GeocodingFeature[],
  waypoints: Array<{ coordinates: [number, number] }>
) => {
  if (waypoints.length === 0) {
    return features;
  }

  return [...features].sort((a, b) => {
    const distanceA = Math.min(
      ...waypoints.map((waypoint) => getDistanceKm(a.center, waypoint.coordinates))
    );
    const distanceB = Math.min(
      ...waypoints.map((waypoint) => getDistanceKm(b.center, waypoint.coordinates))
    );
    const relevanceA = a.relevance ?? 0;
    const relevanceB = b.relevance ?? 0;

    if (Math.abs(relevanceB - relevanceA) > 0.05) {
      return relevanceB - relevanceA;
    }

    return distanceA - distanceB;
  });
};

const getGroupedWaypoints = (groups: WaypointGroup[], waypoints: Waypoint[]) =>
  groups.map((group) => ({
    group,
    waypoints: waypoints.filter((waypoint) => waypoint.groupId === group.id)
  }));

export function Sidebar() {
  const {
    currentRouteId,
    routeName,
    savedRoutes,
    waypoints,
    waypointGroups,
    mapStyle,
    routeMetricsByGroup,
    selectedAddGroupId,
    activeMapTool,
    manualRoutes,
    hydrateSavedRoutes,
    setRouteName,
    saveCurrentRoute,
    createNewRoute,
    loadSavedRoute,
    deleteSavedRoute,
    addWaypoint,
    addWaypointGroup,
    deleteWaypointGroup,
    updateWaypointGroup,
    moveWaypointToGroup,
    updateWaypointName,
    updateWaypointCoordinates,
    removeWaypoint,
    updateManualRouteName,
    removeManualRoute,
    setMapStyle,
    setSelectedAddGroupId,
    setActiveMapTool,
    importBundle,
    groupVocabulary,
    showMapLabels,
    setShowMapLabels
  } = useMapStore();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const groupRefs = useRef<Record<string, HTMLElement | null>>({});
  const knownGroupIdsRef = useRef<Set<string>>(new Set());

  const [importStatus, setImportStatus] = useState<
    | { kind: "idle" }
    | { kind: "error"; message: string }
    | { kind: "success"; message: string }
  >({ kind: "idle" });
  const [isRouteMenuOpen, setIsRouteMenuOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isMapStyleOpen, setIsMapStyleOpen] = useState(true);
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [openGroupIds, setOpenGroupIds] = useState<Record<string, boolean>>({});
  const [replaceWaypointId, setReplaceWaypointId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GeocodingFeature[]>([]);
  const [searchStatus, setSearchStatus] = useState<SearchStatus>("idle");

  const activeStyle = useMemo(
    () =>
      styleOptions.find((option) => MAP_STYLES[option.key] === mapStyle)?.key ??
      "editorial-alpine",
    [mapStyle]
  );
  const hasUsableToken = mapboxToken !== "MAPBOX_ACCESS_TOKEN";
  const groupedWaypoints = useMemo(
    () => getGroupedWaypoints(waypointGroups, waypoints),
    [waypointGroups, waypoints]
  );
  const manualRoutesByGroup = useMemo(() => {
    return manualRoutes.reduce<Record<string, typeof manualRoutes>>((acc, route) => {
      (acc[route.groupId] ??= []).push(route);
      return acc;
    }, {});
  }, [manualRoutes]);
  const isRouteEmpty = waypoints.length === 0 && manualRoutes.length === 0;
  const savedRouteCount = savedRoutes.length;

  const routeMetrics = useMemo(() => {
    const aggregated = Object.values(routeMetricsByGroup).reduce(
      (totals, metrics) => ({
        distanceKm: totals.distanceKm + (metrics.distanceKm || 0),
        tarmacKm: totals.tarmacKm + (metrics.tarmacKm || 0),
        offRoadKm: totals.offRoadKm + (metrics.offRoadKm || 0)
      }),
      { distanceKm: 0, tarmacKm: 0, offRoadKm: 0 }
    );

    if (aggregated.distanceKm > 0) {
      return aggregated;
    }

    const fallbackDistance = groupedWaypoints.reduce(
      (total, { waypoints: groupWaypoints }) =>
        total + estimateRouteDistance(groupWaypoints),
      0
    );

    return {
      distanceKm: fallbackDistance,
      tarmacKm: fallbackDistance,
      offRoadKm: 0
    };
  }, [routeMetricsByGroup, groupedWaypoints]);

  const routeDistance = routeMetrics.distanceKm;
  const terrainSplit = useMemo(() => {
    const total = routeMetrics.tarmacKm + routeMetrics.offRoadKm;

    if (total <= 0) {
      return { tarmac: 100, offRoad: 0 };
    }

    const offRoad = Math.round((routeMetrics.offRoadKm / total) * 100);

    return { tarmac: 100 - offRoad, offRoad };
  }, [routeMetrics]);

  useEffect(() => {
    hydrateSavedRoutes();
  }, [hydrateSavedRoutes]);

  useEffect(() => {
    waypointGroups.forEach((group) => {
      if (!knownGroupIdsRef.current.has(group.id)) {
        knownGroupIdsRef.current.add(group.id);
        setOpenGroupIds((current) => ({ ...current, [group.id]: true }));
      }
    });
  }, [waypointGroups]);

  useEffect(() => {
    const query = searchQuery.trim();

    if (query.length < 3) {
      setSearchResults([]);
      setSearchStatus(query.length === 0 ? "idle" : "typing");
      return;
    }

    if (!hasUsableToken) {
      setSearchStatus("error");
      return;
    }

    setSearchStatus("loading");
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), searchTimeoutMs);
    const debounce = window.setTimeout(async () => {
      try {
        const endpoint = new URL(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
            query
          )}.json`
        );
        endpoint.searchParams.set("access_token", mapboxToken);
        endpoint.searchParams.set("limit", "6");
        endpoint.searchParams.set("language", "en");

        const response = await fetch(endpoint, { signal: controller.signal });

        if (!response.ok) {
          setSearchStatus("error");
          return;
        }

        const data = (await response.json()) as { features?: GeocodingFeature[] };
        const features = rankByRouteContext(data.features ?? [], waypoints);

        setSearchResults(features);
        setSearchStatus(features.length > 0 ? "ready" : "empty");
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setSearchStatus("error");
      } finally {
        window.clearTimeout(timeout);
      }
    }, 350);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
      window.clearTimeout(debounce);
    };
  }, [searchQuery, hasUsableToken, waypoints]);

  const handleImportFiles = async (files: FileList | File[]) => {
    const list = Array.from(files);
    if (list.length === 0) return;
    try {
      const { parseImportFile } = await import("@/components/importParsers");
      for (const file of list) {
        const bundle = await parseImportFile(file);
        if (bundle.waypoints.length === 0) continue;
        importBundle(bundle);
      }
      setImportStatus({
        kind: "success",
        message: `Imported ${list.length} file${list.length === 1 ? "" : "s"}.`
      });
      window.setTimeout(() => setImportStatus({ kind: "idle" }), 3000);
    } catch (error) {
      setImportStatus({
        kind: "error",
        message: error instanceof Error ? error.message : "Import failed."
      });
    }
  };

  const handleSelectSearchResult = (result: GeocodingFeature) => {
    if (replaceWaypointId) {
      updateWaypointName(replaceWaypointId, result.text);
      updateWaypointCoordinates(replaceWaypointId, result.center);
      setReplaceWaypointId(null);
    } else {
      addWaypoint({
        id: `wp-${Date.now()}`,
        name: result.text,
        coordinates: result.center,
        groupId: selectedAddGroupId
      });
    }

    setSearchQuery("");
    setSearchResults([]);
    setSearchStatus("idle");
  };

  const handleStartReplacingWaypoint = (waypoint: Waypoint) => {
    setReplaceWaypointId(waypoint.id);
    setSearchQuery(waypoint.name);
    setSearchResults([]);
    setSearchStatus("typing");
  };

  const toggleGroupOpen = (groupId: string) => {
    setOpenGroupIds((current) => ({
      ...current,
      [groupId]: !current[groupId]
    }));
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) {
      return;
    }

    moveWaypointToGroup(
      result.draggableId,
      result.destination.droppableId,
      result.destination.index
    );
  };

  const handleOpenGoogleMaps = () => {
    if (waypoints.length === 0) {
      return;
    }

    const routePath = waypoints
      .map((waypoint) => `${waypoint.coordinates[1]},${waypoint.coordinates[0]}`)
      .join("/");

    window.open(
      `https://www.google.com/maps/dir/${routePath}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const handleSaveRoute = () => {
    const savedRoute = saveCurrentRoute();

    if (savedRoute) {
      setIsRouteMenuOpen(false);
    }
  };

  const handleCreateNewRoute = () => {
    createNewRoute();
    setOpenGroupIds({});
    setIsRouteMenuOpen(false);
  };

  const handleLoadSavedRoute = (routeId: string) => {
    loadSavedRoute(routeId);
    setOpenGroupIds({});
    setIsRouteMenuOpen(false);
  };

  const handleDeleteSavedRoute = (routeId: string) => {
    deleteSavedRoute(routeId);
  };

  const formatSavedRouteDate = (value: string) =>
    new Intl.DateTimeFormat("en", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(value));

  return (
    <>
      <nav className="fixed inset-x-0 top-0 z-[12] border-b border-border/80 bg-[#FBF8EF]/90 px-3 py-2.5 text-ink shadow-[0_12px_36px_rgba(23,27,24,0.08)] backdrop-blur-xl sm:px-5">
        <div className="relative flex min-h-[56px] items-center gap-3">
          <Link
            href="/"
            className="mr-1 flex min-w-0 items-center gap-3 rounded-[10px] pr-1 transition hover:opacity-80 active:translate-y-px focus:outline-none focus:ring-2 focus:ring-rust/30 sm:mr-5"
            aria-label="NiceMaps home"
          >
            <img src={logoSrc.src} alt="NiceMaps logo" className="h-10 w-8 shrink-0 object-contain" />
            <span className="hidden font-display text-[26px] leading-none text-ink sm:block">
              NiceMaps
            </span>
          </Link>

          <div className="relative w-[168px] min-w-0 shrink-0 sm:w-[360px]">
            <button
              type="button"
              onClick={() => setIsRouteMenuOpen((current) => !current)}
              aria-expanded={isRouteMenuOpen}
              aria-controls="route-menu"
              className="grid h-12 w-full min-w-0 grid-cols-[30px_1fr_auto] items-center gap-2 rounded-[12px] border border-border/85 bg-paper/70 px-2.5 text-left transition hover:border-rust/35 hover:bg-paper/95 active:translate-y-px focus:outline-none focus:ring-2 focus:ring-rust/30"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-ink text-paper">
                <Menu size={15} strokeWidth={1.9} />
              </span>
              <span className="block min-w-0 truncate text-sm font-bold leading-5 text-ink sm:text-base">
                {routeName.trim() || "Untitled route"}
              </span>
              <ChevronDown
                size={15}
                strokeWidth={2}
                className={`text-olive/55 transition-transform duration-200 ${
                  isRouteMenuOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {isRouteMenuOpen ? (
              <div
                id="route-menu"
                className="absolute left-0 right-0 top-[calc(100%+8px)] z-[18] overflow-hidden rounded-[14px] border border-border/90 bg-paper text-ink shadow-command"
              >
                <div className="border-b border-border/80 p-3">
                  <label
                    htmlFor="route-name"
                    className="block text-[10px] font-bold uppercase tracking-[0.18em] text-olive/60"
                  >
                    Route name
                  </label>
                  <input
                    id="route-name"
                    value={routeName}
                    onChange={(event) => setRouteName(event.target.value)}
                    className="mt-2 h-10 w-full rounded-[9px] border border-border/90 bg-[#FBF8EF]/68 px-3 text-sm font-bold text-ink outline-none transition placeholder:text-olive/45 focus:border-rust/65 focus:bg-[#FBF8EF]/90 focus:ring-2 focus:ring-rust/15"
                    placeholder="Name this route"
                    autoComplete="off"
                  />
                  <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
                    <button
                      type="button"
                      onClick={handleSaveRoute}
                      className="flex h-10 items-center justify-center gap-2 rounded-[9px] bg-rust px-3 text-xs font-bold text-white transition hover:bg-brassLight active:translate-y-px focus:outline-none focus:ring-2 focus:ring-rust/35"
                    >
                      <Save size={15} strokeWidth={1.9} />
                      Save route
                    </button>
                    <button
                      type="button"
                      onClick={handleCreateNewRoute}
                      className="flex h-10 items-center justify-center gap-2 rounded-[9px] border border-border/90 bg-[#FBF8EF]/62 px-3 text-xs font-bold text-ink transition hover:border-rust/35 hover:bg-[#FBF8EF]/88 active:translate-y-px focus:outline-none focus:ring-2 focus:ring-rust/30"
                    >
                      <Plus size={15} strokeWidth={1.9} />
                      New
                    </button>
                  </div>
                </div>

                <div className="max-h-[244px] overflow-y-auto p-2 nice-scrollbar">
                  <div className="mb-1 flex items-center justify-between px-1">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-olive/55">
                      Saved routes
                    </p>
                    <span className="font-mono text-[11px] text-olive/55">
                      {savedRouteCount.toString().padStart(2, "0")}
                    </span>
                  </div>

                  {savedRoutes.length === 0 ? (
                    <p className="rounded-[10px] border border-dashed border-border/80 px-3 py-4 text-xs font-semibold text-olive/68">
                      No saved routes yet.
                    </p>
                  ) : null}

                  <div className="space-y-1.5">
                    {savedRoutes.map((savedRoute) => {
                      const isActive = savedRoute.id === currentRouteId;

                      return (
                        <div
                          key={savedRoute.id}
                          className={`grid min-h-[54px] grid-cols-[1fr_34px] items-center gap-2 rounded-[10px] border px-2.5 py-2 transition ${
                            isActive
                              ? "border-rust/50 bg-rust/10"
                              : "border-border/75 bg-[#FBF8EF]/42 hover:border-rust/30"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => handleLoadSavedRoute(savedRoute.id)}
                            className="grid min-w-0 grid-cols-[22px_1fr] items-center gap-2 text-left focus:outline-none focus:ring-2 focus:ring-rust/25"
                          >
                            <FolderOpen
                              size={15}
                              strokeWidth={1.8}
                              className={isActive ? "text-rust" : "text-olive/55"}
                            />
                            <span className="min-w-0">
                              <span className="block truncate text-xs font-bold text-ink">
                                {savedRoute.name}
                              </span>
                              <span className="mt-0.5 flex min-w-0 items-center gap-1 text-[10px] font-semibold text-olive/58">
                                <Clock3 size={11} strokeWidth={1.8} />
                                <span className="truncate">
                                  {formatSavedRouteDate(savedRoute.updatedAt)}
                                </span>
                              </span>
                            </span>
                          </button>
                          <button
                            type="button"
                            aria-label={`Delete ${savedRoute.name}`}
                            onClick={() => handleDeleteSavedRoute(savedRoute.id)}
                            className="flex h-8 w-8 items-center justify-center rounded-[8px] text-olive/40 transition hover:bg-danger/10 hover:text-danger focus:outline-none focus:ring-2 focus:ring-danger/30"
                          >
                            <Trash2 size={14} strokeWidth={1.9} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="hidden items-center gap-1.5 md:flex">
            <Link
              href="/about"
              className="h-10 rounded-[9px] px-3 py-2.5 text-sm font-bold text-olive/70 transition hover:bg-paper/80 hover:text-ink focus:outline-none focus:ring-2 focus:ring-rust/30"
            >
              About
            </Link>
            <Link
              href="/blog"
              className="h-10 rounded-[9px] px-3 py-2.5 text-sm font-bold text-olive/70 transition hover:bg-paper/80 hover:text-ink focus:outline-none focus:ring-2 focus:ring-rust/30"
            >
              Blog
            </Link>
            <Link
              href="/pricing"
              className="h-10 rounded-[9px] px-3 py-2.5 text-sm font-bold text-olive/70 transition hover:bg-paper/80 hover:text-ink focus:outline-none focus:ring-2 focus:ring-rust/30"
            >
              Pricing
            </Link>
          </div>

          <div className="absolute right-0 top-1/2 flex shrink-0 -translate-y-1/2 items-center gap-2">
            <button
              type="button"
              onClick={() => setIsExportOpen(true)}
              className="flex h-11 items-center justify-center gap-2 rounded-[8px] bg-rust px-3 text-sm font-bold text-white transition hover:bg-brassLight active:translate-y-px focus:outline-none focus:ring-2 focus:ring-rust/35 sm:px-5"
            >
              <Download size={17} strokeWidth={1.9} />
              <span className="hidden sm:inline">Export Map</span>
            </button>
            <button
              type="button"
              aria-label="Open personal profile"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-border/80 bg-paper/80 text-olive shadow-[inset_0_0_0_2px_rgba(255,255,255,0.42)] transition hover:border-rust/35 hover:text-rust focus:outline-none focus:ring-2 focus:ring-rust/30"
            >
              <UserCircle2 size={23} strokeWidth={1.7} />
            </button>
          </div>
        </div>
      </nav>

      <aside
        className="fixed inset-x-3 bottom-3 z-[5] flex max-h-[72dvh] w-[392px] max-w-[calc(100vw-24px)] min-w-0 flex-col overflow-hidden rounded-[16px] border border-border/80 bg-paper/95 text-ink shadow-command backdrop-blur-xl lg:inset-x-auto lg:bottom-3 lg:left-3 lg:top-[92px] lg:max-h-none"
        onDragOver={(event) => {
          if (event.dataTransfer.types.includes("Files")) {
            event.preventDefault();
            event.dataTransfer.dropEffect = "copy";
          }
        }}
        onDrop={(event) => {
          if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
            event.preventDefault();
            void handleImportFiles(event.dataTransfer.files);
          }
        }}
      >
        <header className="border-b border-border/80 bg-[radial-gradient(circle_at_72%_0%,rgba(220,100,50,0.12),transparent_34%)] px-5 pb-5 pt-5 shadow-insetPanel">
          <div className="grid grid-cols-[0.75fr_1fr_1.2fr] overflow-hidden rounded-[10px] border border-border/85 bg-[#FBF8EF]/55">
            <div className="border-r border-border/85 px-3 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-olive/55">
                Stops
              </p>
              <p className="mt-1 font-mono text-xl text-ink">
                {waypoints.length.toString().padStart(2, "0")}
              </p>
            </div>
            <div className="border-r border-border/85 px-3 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-olive/55">
                Distance
              </p>
              <p className="mt-1 font-mono text-xl text-ink">
                {Math.round(routeDistance)} <span className="text-sm text-olive/65">km</span>
              </p>
            </div>
            <div className="px-3 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-olive/55">
                Terrain
              </p>
              <p className="mt-1 text-sm font-semibold leading-tight text-ink">
                {terrainSplit.tarmac}% tarmac / {terrainSplit.offRoad}% off-road
              </p>
            </div>
          </div>
        </header>

        <section className="border-b border-border/80 px-5 py-4">
          <button
            type="button"
            onClick={() => setIsMapStyleOpen((current) => !current)}
            aria-expanded={isMapStyleOpen}
            aria-controls="map-style-options"
            className="flex w-full items-center justify-between gap-3 text-left focus:outline-none focus:ring-2 focus:ring-rust/25"
          >
            <span className="flex items-center gap-2">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-olive/65">
                Map Style
              </h2>
              <Layers3 size={15} strokeWidth={1.8} className="text-rust" />
            </span>
            <ChevronDown
              size={16}
              strokeWidth={2.1}
              className={`text-olive/55 transition-transform duration-200 ${
                isMapStyleOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {isMapStyleOpen ? (
            <>
              <div id="map-style-options" className="mt-3 grid grid-cols-2 gap-1.5">
                {styleOptions.map((option) => {
                  const isActive = activeStyle === option.key;

                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => setMapStyle(MAP_STYLES[option.key])}
                      className={`min-h-[54px] min-w-0 rounded-[10px] border px-2 py-2 text-left transition duration-200 focus:outline-none focus:ring-2 focus:ring-rust/35 ${
                        isActive
                          ? "border-rust/55 bg-rust text-white shadow-[0_10px_28px_rgba(220,100,50,0.2)]"
                          : "border-border/85 bg-[#FBF8EF]/45 text-ink hover:border-rust/35 hover:bg-[#FBF8EF]/70"
                      }`}
                    >
                      <span className={`mb-2 block h-1.5 w-8 rounded-full ${option.tone}`} />
                      <span className="block truncate text-[11px] font-bold">{option.label}</span>
                    </button>
                  );
                })}
              </div>
              <label
                className="mt-2 flex min-h-10 items-center gap-2 rounded-[10px] border border-border/85 bg-[#FBF8EF]/45 px-3 text-[11px] font-bold text-ink"
                title="Hide city names, roads and other place labels on the map"
              >
                <input
                  type="checkbox"
                  checked={showMapLabels}
                  onChange={(event) => setShowMapLabels(event.target.checked)}
                  className="accent-[#DC6432]"
                />
                Show map labels
              </label>
            </>
          ) : null}
        </section>

        <section className="border-b border-border/80 px-5 py-4">
          <button
            type="button"
            onClick={() => setIsToolsOpen((current) => !current)}
            aria-expanded={isToolsOpen}
            aria-controls="map-tools-menu"
            className="flex w-full items-center justify-between gap-3 text-left focus:outline-none focus:ring-2 focus:ring-rust/25"
          >
            <span className="flex items-center gap-2">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-olive/65">
                Tools
              </h2>
              <MousePointer2 size={15} strokeWidth={1.8} className="text-rust" />
            </span>
            <ChevronDown
              size={16}
              strokeWidth={2.1}
              className={`text-olive/55 transition-transform duration-200 ${
                isToolsOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {isToolsOpen ? (
            <div id="map-tools-menu" className="mt-3 grid gap-1.5">
              {toolOptions.map(({ key, label, hint, Icon }) => {
                const isActive = activeMapTool === key;

                return (
                  <button
                    key={key}
                    type="button"
                    draggable={key === "point"}
                    onClick={() => {
                      setActiveMapTool(key);
                      setIsToolsOpen(false);
                    }}
                    className={`flex min-h-[52px] items-center gap-3 rounded-[10px] border px-3 py-2 text-left transition duration-200 focus:outline-none focus:ring-2 focus:ring-rust/35 ${
                      isActive
                        ? "border-rust/55 bg-rust text-white shadow-[0_10px_28px_rgba(220,100,50,0.2)]"
                        : "border-border/85 bg-[#FBF8EF]/45 text-ink hover:border-rust/35 hover:bg-[#FBF8EF]/70"
                    }`}
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] ${
                        isActive ? "bg-white/20 text-white" : "bg-rust/10 text-rust"
                      }`}
                    >
                      <Icon size={16} strokeWidth={1.9} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-bold">{label}</span>
                      <span
                        className={`block text-[11px] font-semibold ${
                          isActive ? "text-white/75" : "text-olive/60"
                        }`}
                      >
                        {hint}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </section>

        <section className="flex-1 overflow-y-auto px-5 py-4 nice-scrollbar">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-olive/65">
                Route
              </h2>
              <p className="mt-1 text-xs text-olive/70">
                Add stops, create {groupVocabulary === "stage" ? "stages" : "days"}, set colors.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".gpx,.kml,.geojson,.json,.csv,.tsv"
                multiple
                className="hidden"
                onChange={(event) => {
                  if (event.target.files) {
                    void handleImportFiles(event.target.files);
                    event.target.value = "";
                  }
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex h-9 items-center gap-1 rounded-[10px] border border-border/90 bg-[#FBF8EF]/55 px-2.5 text-[11px] font-bold text-olive transition hover:border-rust/35 hover:text-rust focus:outline-none focus:ring-2 focus:ring-rust/30"
                aria-label="Import GPX, KML, GeoJSON, or CSV"
                title="Import GPX, KML, GeoJSON, or CSV"
              >
                Import
              </button>
              <button
                type="button"
                onClick={addWaypointGroup}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-border/90 bg-[#FBF8EF]/55 text-rust transition hover:border-rust/35 hover:bg-[#FBF8EF]/85 focus:outline-none focus:ring-2 focus:ring-rust/30"
                aria-label="Add waypoint group"
              >
                <Plus size={16} strokeWidth={2} />
              </button>
            </div>
          </div>
          {importStatus.kind !== "idle" ? (
            <p
              className={`mb-3 rounded-[8px] px-3 py-2 text-[11px] font-semibold ${
                importStatus.kind === "error"
                  ? "bg-danger/10 text-danger"
                  : "bg-rust/10 text-rust"
              }`}
            >
              {importStatus.message}
            </p>
          ) : null}

          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="space-y-2">
              {isRouteEmpty ? (
                <p className="rounded-[10px] border border-dashed border-border/80 px-3 py-4 text-sm font-semibold text-olive/70">
                  Route is empty
                </p>
              ) : null}

              {groupedWaypoints.map(({ group, waypoints: groupWaypoints }) => (
                <section
                  key={group.id}
                  ref={(node) => {
                    groupRefs.current[group.id] = node;
                  }}
                  className="rounded-[14px] border bg-[#FBF8EF]/35 p-3 transition"
                  style={{
                    borderColor: openGroupIds[group.id] ? `${group.color}80` : "rgba(193,189,173,0.8)"
                  }}
                >
                  <div className="grid w-full grid-cols-[34px_minmax(0,1fr)_42px_34px] items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleGroupOpen(group.id)}
                      aria-expanded={openGroupIds[group.id] ?? false}
                      aria-controls={`group-waypoints-${group.id}`}
                      className="flex h-7 w-7 items-center justify-center rounded-full text-white transition focus:outline-none focus:ring-2 focus:ring-rust/25"
                      style={{ backgroundColor: group.color }}
                    >
                      <ChevronDown
                        size={16}
                        strokeWidth={2.2}
                        className={`transition-transform duration-200 ${
                          openGroupIds[group.id] ? "rotate-0" : "-rotate-90"
                        }`}
                      />
                    </button>
                    <div className="min-w-0">
                      {editingGroupId === group.id ? (
                        <>
                          <label className="sr-only" htmlFor={`group-name-${group.id}`}>
                            Group name
                          </label>
                          <input
                            id={`group-name-${group.id}`}
                            value={group.name}
                            autoFocus
                            onBlur={() => setEditingGroupId(null)}
                            onChange={(event) =>
                              updateWaypointGroup(group.id, { name: event.target.value })
                            }
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === "Escape") {
                                event.currentTarget.blur();
                              }
                            }}
                            className="h-8 w-full rounded-[8px] border border-rust/35 bg-[#FBF8EF]/80 px-2 text-sm font-bold text-ink outline-none transition focus:border-rust/60 focus:ring-2 focus:ring-rust/15"
                          />
                        </>
                      ) : (
                        <button
                          type="button"
                          onDoubleClick={() => setEditingGroupId(group.id)}
                          className="block max-w-full truncate text-left text-sm font-bold text-ink focus:outline-none focus:ring-2 focus:ring-rust/20"
                          title="Double-click to rename"
                        >
                          {group.name}
                        </button>
                      )}
                      <p className="text-xs text-olive/70">
                        {Math.round(
                          routeMetricsByGroup[group.id]?.distanceKm ??
                            estimateRouteDistance(groupWaypoints)
                        ) || "--"} km,{" "}
                        {routeMetricsByGroup[group.id]?.offRoadKm
                          ? `${Math.round(routeMetricsByGroup[group.id].offRoadKm)} km off-road`
                          : "tarmac"}
                      </p>
                    </div>
                    <label className="flex h-9 w-10 shrink-0 cursor-pointer items-center justify-center rounded-[9px] border border-border/80 bg-[#FBF8EF]/65">
                      <span className="sr-only">Group colour</span>
                      <input
                        type="color"
                        value={group.color}
                        onChange={(event) =>
                          updateWaypointGroup(group.id, { color: event.target.value })
                        }
                        className="h-6 w-6 cursor-pointer border-0 bg-transparent p-0"
                      />
                    </label>
                    <button
                      type="button"
                      aria-label={`Delete ${group.name}`}
                      onClick={() => deleteWaypointGroup(group.id)}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] border border-border/80 bg-[#FBF8EF]/65 text-olive/45 transition hover:border-danger/30 hover:bg-danger/10 hover:text-danger focus:outline-none focus:ring-2 focus:ring-danger/25"
                    >
                      <Trash2 size={15} strokeWidth={1.9} />
                    </button>
                  </div>

                  {openGroupIds[group.id] ? (
                    <Droppable droppableId={group.id}>
                      {(dropProvided, dropSnapshot) => (
                        <div
                          id={`group-waypoints-${group.id}`}
                          ref={dropProvided.innerRef}
                          {...dropProvided.droppableProps}
                          className={`mt-3 space-y-2 rounded-[10px] transition ${
                            dropSnapshot.isDraggingOver ? "bg-rust/10 p-1.5" : ""
                          }`}
                        >
                          {groupWaypoints.length === 0 ? (
                            <p className="rounded-[10px] border border-dashed border-border/80 px-3 py-3 text-xs text-olive/70">
                              Drop waypoints here.
                            </p>
                          ) : null}

                          {groupWaypoints.map((waypoint, groupIndex) => {
                            const globalIndex = waypoints.findIndex((item) => item.id === waypoint.id);

                            return (
                              <Draggable
                                key={waypoint.id}
                                draggableId={waypoint.id}
                                index={groupIndex}
                              >
                                {(dragProvided, snapshot) => (
                                  <div
                                    ref={dragProvided.innerRef}
                                    {...dragProvided.draggableProps}
                                    className={`group grid min-h-[52px] grid-cols-[28px_1fr_34px_34px] items-center gap-3 rounded-[12px] border px-3 py-2 transition duration-200 ${
                                      snapshot.isDragging
                                        ? "border-rust/50 bg-rust/10 shadow-command"
                                        : "border-border/85 bg-[#FBF8EF]/60 hover:border-rust/30 hover:bg-[#FBF8EF]/85"
                                    }`}
                                  >
                                    <button
                                      type="button"
                                      aria-label={`Drag ${waypoint.name}`}
                                      {...dragProvided.dragHandleProps}
                                      className="flex h-8 w-7 items-center justify-center rounded-[8px] text-olive/45 transition hover:bg-rust/10 hover:text-rust focus:outline-none focus:ring-2 focus:ring-rust/35"
                                    >
                                      <GripVertical size={16} strokeWidth={1.8} />
                                    </button>

                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span
                                          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[7px] font-mono text-[10px] font-bold text-white"
                                          style={{ backgroundColor: group.color }}
                                        >
                                          {globalIndex + 1}
                                        </span>
                                        <label className="sr-only" htmlFor={`waypoint-name-${waypoint.id}`}>
                                          Waypoint name
                                        </label>
                                        <input
                                          id={`waypoint-name-${waypoint.id}`}
                                          value={waypoint.name}
                                          onChange={(event) =>
                                            updateWaypointName(waypoint.id, event.target.value)
                                          }
                                          className="min-w-0 flex-1 rounded-[7px] border border-transparent bg-transparent px-1 py-0.5 text-sm font-semibold text-ink outline-none transition focus:border-rust/35 focus:bg-[#FBF8EF]/85 focus:ring-2 focus:ring-rust/15"
                                        />
                                      </div>
                                    </div>

                                    <button
                                      type="button"
                                      aria-label={`Change ${waypoint.name}`}
                                      onClick={() => handleStartReplacingWaypoint(waypoint)}
                                      className={`flex h-8 w-8 items-center justify-center rounded-[8px] transition focus:outline-none focus:ring-2 focus:ring-rust/30 ${
                                        replaceWaypointId === waypoint.id
                                          ? "bg-rust/12 text-rust"
                                          : "text-olive/40 hover:bg-rust/10 hover:text-rust"
                                      }`}
                                    >
                                      <Search size={15} strokeWidth={1.9} />
                                    </button>

                                    <button
                                      type="button"
                                      aria-label={`Remove ${waypoint.name}`}
                                      onClick={() => {
                                        const linkedRoutes = manualRoutes.filter((route) =>
                                          route.endpointWaypointIds.includes(waypoint.id)
                                        );
                                        if (linkedRoutes.length > 0) {
                                          const label =
                                            linkedRoutes.length === 1
                                              ? "1 custom route"
                                              : `${linkedRoutes.length} custom routes`;
                                          const confirmed = window.confirm(
                                            `Delete "${waypoint.name}"? This will also remove ${label} anchored to it.`
                                          );
                                          if (!confirmed) {
                                            return;
                                          }
                                        }
                                        removeWaypoint(waypoint.id);
                                      }}
                                      className="flex h-8 w-8 items-center justify-center rounded-[8px] text-olive/40 transition hover:bg-danger/10 hover:text-danger focus:outline-none focus:ring-2 focus:ring-danger/30"
                                    >
                                      <Trash2 size={15} strokeWidth={1.9} />
                                    </button>
                                  </div>
                                )}
                              </Draggable>
                            );
                          })}
                          {dropProvided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  ) : null}

                  {openGroupIds[group.id] && manualRoutesByGroup[group.id]?.length ? (
                    <div className="mt-3 space-y-2">
                      <p className="pl-10 text-[10px] font-bold uppercase tracking-[0.16em] text-olive/55">
                        Drawn routes
                      </p>
                      {manualRoutesByGroup[group.id].map((route) => (
                        <div
                          key={route.id}
                          className="grid min-h-[48px] grid-cols-[28px_1fr_34px] items-center gap-3 rounded-[10px] border border-border/80 bg-[#FBF8EF]/50 px-3 py-2"
                        >
                          <span
                            className="h-5 w-5 rounded-[7px] border border-paper"
                            style={{ backgroundColor: group.color }}
                          />
                          <div className="min-w-0">
                            <label className="sr-only" htmlFor={`manual-route-name-${route.id}`}>
                              Drawn route name
                            </label>
                            <input
                              id={`manual-route-name-${route.id}`}
                              value={route.name}
                              onChange={(event) =>
                                updateManualRouteName(route.id, event.target.value)
                              }
                              className="min-w-0 w-full rounded-[7px] border border-transparent bg-transparent px-1 py-0.5 text-sm font-semibold text-ink outline-none transition focus:border-rust/35 focus:bg-[#FBF8EF]/85 focus:ring-2 focus:ring-rust/15"
                            />
                          </div>
                          <button
                            type="button"
                            aria-label={`Remove ${route.name}`}
                            onClick={() => removeManualRoute(route.id)}
                            className="flex h-8 w-8 items-center justify-center rounded-[8px] text-olive/40 transition hover:bg-danger/10 hover:text-danger focus:outline-none focus:ring-2 focus:ring-danger/30"
                          >
                            <Trash2 size={15} strokeWidth={1.9} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </section>
              ))}
            </div>
          </DragDropContext>

          <div className="mt-4">
            <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-olive/60">
              Search places
            </span>
            <div className="relative">
              <Search
                size={15}
                strokeWidth={1.9}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-olive/45"
              />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Where are we going?"
                className="h-11 w-full rounded-[10px] border border-border/90 bg-[#FBF8EF]/58 pl-9 pr-3 text-sm font-semibold text-ink outline-none transition placeholder:text-olive/45 focus:border-rust/70 focus:bg-[#FBF8EF]/80 focus:ring-2 focus:ring-rust/15"
                autoComplete="off"
              />

              {searchStatus !== "idle" ? (
                <div className="absolute bottom-[calc(100%+8px)] left-0 right-0 z-[7] overflow-hidden rounded-[12px] border border-border/90 bg-[#FBF8EF] text-ink shadow-command">
                  {searchStatus === "loading" || searchStatus === "typing" ? (
                    <div className="space-y-2 p-3">
                      {[0, 1, 2].map((item) => (
                        <div key={item} className="h-10 animate-pulse rounded-[8px] bg-olive/10" />
                      ))}
                    </div>
                  ) : null}

                  {searchStatus === "ready" ? (
                    <div className="max-h-60 overflow-y-auto py-1">
                      {searchResults.map((result) => (
                        <button
                          key={result.id}
                          type="button"
                          onClick={() => handleSelectSearchResult(result)}
                          className="grid w-full grid-cols-[28px_1fr] gap-2 px-3 py-2.5 text-left transition hover:bg-rust/10 focus:bg-rust/10 focus:outline-none"
                        >
                          <MapPinned
                            size={15}
                            strokeWidth={1.8}
                            className="mt-0.5 text-rust"
                          />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold">
                              {result.text}
                            </span>
                            <span className="mt-0.5 block truncate text-[11px] leading-4 text-olive/60">
                              {result.place_name}
                            </span>
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : null}

                  {searchStatus === "empty" ? (
                    <p className="px-3 py-3 text-sm text-olive/70">
                      No matching places found.
                    </p>
                  ) : null}

                  {searchStatus === "error" ? (
                    <p className="px-3 py-3 text-sm text-olive/70">
                      Search is unavailable. Check the Mapbox token, network access, or token URL restrictions.
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>

            {replaceWaypointId ? (
              <div className="mt-2 flex items-center justify-between gap-2 rounded-[10px] border border-rust/25 bg-rust/10 px-3 py-2">
                <p className="min-w-0 truncate text-xs font-semibold text-ink">
                  Changing {waypoints.find((waypoint) => waypoint.id === replaceWaypointId)?.name}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setReplaceWaypointId(null);
                    setSearchQuery("");
                    setSearchResults([]);
                    setSearchStatus("idle");
                  }}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] text-olive/55 transition hover:bg-paper/80 hover:text-rust focus:outline-none focus:ring-2 focus:ring-rust/25"
                  aria-label="Cancel changing waypoint"
                >
                  <X size={14} strokeWidth={2} />
                </button>
              </div>
            ) : null}

            {waypointGroups.length > 0 ? (
              <label className="mt-3 block">
                <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-olive/60">
                  Add to group
                </span>
                <select
                  value={selectedAddGroupId}
                  onChange={(event) => setSelectedAddGroupId(event.target.value)}
                  className="h-10 w-full rounded-[10px] border border-border/90 bg-[#FBF8EF]/58 px-3 text-sm font-semibold text-ink outline-none transition focus:border-rust/70 focus:bg-[#FBF8EF]/80 focus:ring-2 focus:ring-rust/15"
                >
                  {waypointGroups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>
        </section>

        <div className="border-t border-border/80 bg-[#FBF8EF]/55 px-5 py-4">
          <button
            type="button"
            onClick={() => setIsExportOpen(true)}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-[12px] bg-rust text-sm font-bold text-white transition hover:bg-brassLight active:translate-y-px focus:outline-none focus:ring-2 focus:ring-rust/35"
          >
            <Download size={17} strokeWidth={1.9} />
            Export Route
          </button>
        </div>
      </aside>

      <ExportStudio
        isOpen={isExportOpen}
        routeDistance={routeDistance}
        terrainSplit={terrainSplit}
        routeMetrics={routeMetrics}
        onClose={() => setIsExportOpen(false)}
        onNavigationHandoff={() => {
          setIsExportOpen(false);
          handleOpenGoogleMaps();
        }}
      />
    </>
  );
}
