"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import ReactMap, { Layer, Marker, Source, type MapRef } from "react-map-gl";
import mapboxgl from "mapbox-gl";
import { VectorTile } from "@mapbox/vector-tile";
import { ensureMapboxRtlPlugin } from "./mapboxRtl";
import type { Feature, FeatureCollection, GeoJsonProperties, Geometry, LineString } from "geojson";
import Pbf from "pbf";
import {
  type ManualRoute,
  type RouteMetrics,
  type Waypoint,
  type WaypointGroup,
  useMapStore
} from "@/store/useMapStore";

ensureMapboxRtlPlugin(mapboxgl);

type RouteStatus = "idle" | "loading" | "ready" | "error" | "missing-token";
type SurfaceRoute = {
  route: FeatureCollection<LineString>;
  metrics: RouteMetrics;
  offRoadSegments: FeatureCollection<LineString>;
};

type MapboxRouteResponse = {
  routes?: Array<{
    distance?: number;
    geometry?: LineString;
    notifications?: MapboxRouteNotification[];
  }>;
};

type MapboxRouteNotification = {
  subtype?: string;
  geometry_index_start?: number;
  geometry_index_end?: number;
};

type TileKey = `${number}/${number}/${number}`;
type RoadLine = {
  coordinates: LineString["coordinates"];
};

const getDistanceKm = ([lng1, lat1]: [number, number], [lng2, lat2]: [number, number]) => {
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

const getLineDistanceKm = (coordinates: LineString["coordinates"]) =>
  coordinates.slice(1).reduce((total, coordinate, index) => {
    const previous = coordinates[index];

    return total + getDistanceKm(previous as [number, number], coordinate as [number, number]);
  }, 0);

const getPointToSegmentDistanceKm = (
  point: [number, number],
  start: [number, number],
  end: [number, number]
) => {
  const meanLatitude = ((point[1] + start[1] + end[1]) / 3) * (Math.PI / 180);
  const kmPerDegreeLat = 110.574;
  const kmPerDegreeLng = 111.32 * Math.cos(meanLatitude);
  const px = point[0] * kmPerDegreeLng;
  const py = point[1] * kmPerDegreeLat;
  const sx = start[0] * kmPerDegreeLng;
  const sy = start[1] * kmPerDegreeLat;
  const ex = end[0] * kmPerDegreeLng;
  const ey = end[1] * kmPerDegreeLat;
  const dx = ex - sx;
  const dy = ey - sy;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) {
    return Math.hypot(px - sx, py - sy);
  }

  const t = Math.max(0, Math.min(1, ((px - sx) * dx + (py - sy) * dy) / lengthSquared));
  const closestX = sx + t * dx;
  const closestY = sy + t * dy;

  return Math.hypot(px - closestX, py - closestY);
};

const getPointToLineDistanceKm = (point: [number, number], line: LineString["coordinates"]) =>
  line.slice(1).reduce((nearest, coordinate, index) => {
    const previous = line[index];

    return Math.min(
      nearest,
      getPointToSegmentDistanceKm(
        point,
        previous as [number, number],
        coordinate as [number, number]
      )
    );
  }, Number.POSITIVE_INFINITY);

const getTileForCoordinate = ([lng, lat]: [number, number], zoom: number) => {
  const latRadians = (lat * Math.PI) / 180;
  const tileCount = 2 ** zoom;
  const x = Math.floor(((lng + 180) / 360) * tileCount);
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRadians) + 1 / Math.cos(latRadians)) / Math.PI) / 2) *
      tileCount
  );

  return { x, y, z: zoom, key: `${zoom}/${x}/${y}` as TileKey };
};

const getGeometryLines = (geometry: Geometry): RoadLine[] => {
  if (geometry.type === "LineString") {
    return [{ coordinates: geometry.coordinates }];
  }

  if (geometry.type === "MultiLineString") {
    return geometry.coordinates.map((coordinates) => ({ coordinates }));
  }

  return [];
};

const isUnpavedRoad = (properties: GeoJsonProperties) =>
  properties?.surface === "unpaved";

const fetchUnpavedRoadsForTile = async (
  { x, y, z }: { x: number; y: number; z: number },
  mapboxToken: string,
  signal: AbortSignal
): Promise<RoadLine[]> => {
  try {
    const tileUrl = new URL(
      `https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/${z}/${x}/${y}.vector.pbf`
    );

    tileUrl.searchParams.set("access_token", mapboxToken);

    const response = await fetch(tileUrl, { signal });

    if (!response.ok) {
      return [];
    }

    const tile = new VectorTile(new Pbf(await response.arrayBuffer()));
    const roadLayer = tile.layers.road;

    if (!roadLayer) {
      return [];
    }

    const lines: RoadLine[] = [];

    for (let index = 0; index < roadLayer.length; index += 1) {
      const feature = roadLayer.feature(index);

      if (!isUnpavedRoad(feature.properties)) {
        continue;
      }

      lines.push(...getGeometryLines(feature.toGeoJSON(x, y, z).geometry));
    }

    return lines;
  } catch (error) {
    if (signal.aborted) {
      throw error;
    }

    return [];
  }
};

const createOffRoadSegmentsFromSurfaceTiles = async (
  geometry: LineString,
  mapboxToken: string,
  signal: AbortSignal
): Promise<FeatureCollection<LineString>> => {
  const tileZoom = 14;
  const maxSnapDistanceKm = 0.035;
  const segmentTiles = geometry.coordinates.slice(1).map((coordinate, index) => {
    const previous = geometry.coordinates[index] as [number, number];
    const current = coordinate as [number, number];
    const midpoint: [number, number] = [
      (previous[0] + current[0]) / 2,
      (previous[1] + current[1]) / 2
    ];

    return {
      midpoint,
      segmentIndex: index,
      tile: getTileForCoordinate(midpoint, tileZoom)
    };
  });
  const tileCache = new Map<TileKey, RoadLine[]>();

  await Promise.all(
    [...new Map(segmentTiles.map(({ tile }) => [tile.key, tile])).values()].map(async (tile) => {
      tileCache.set(tile.key, await fetchUnpavedRoadsForTile(tile, mapboxToken, signal));
    })
  );

  const offRoadIndexes = new Set(
    segmentTiles
      .filter(({ midpoint, tile }) => {
        const roads = tileCache.get(tile.key) ?? [];

        return roads.some(
          (road) => getPointToLineDistanceKm(midpoint, road.coordinates) <= maxSnapDistanceKm
        );
      })
      .map(({ segmentIndex }) => segmentIndex)
  );
  const features: Array<Feature<LineString>> = [];
  let currentCoordinates: LineString["coordinates"] = [];

  geometry.coordinates.slice(1).forEach((coordinate, index) => {
    const previous = geometry.coordinates[index];

    if (offRoadIndexes.has(index)) {
      if (currentCoordinates.length === 0) {
        currentCoordinates = [previous, coordinate];
      } else {
        currentCoordinates.push(coordinate);
      }

      return;
    }

    if (currentCoordinates.length >= 2) {
      features.push({
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: currentCoordinates
        }
      });
    }

    currentCoordinates = [];
  });

  if (currentCoordinates.length >= 2) {
    features.push({
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: currentCoordinates
      }
    });
  }

  return {
    type: "FeatureCollection",
    features
  };
};

const createSafeOffRoadSegmentsFromSurfaceTiles = async (
  geometry: LineString,
  mapboxToken: string,
  signal: AbortSignal
) => {
  try {
    return await createOffRoadSegmentsFromSurfaceTiles(geometry, mapboxToken, signal);
  } catch (error) {
    if (signal.aborted) {
      throw error;
    }

    return emptyFeatureCollection();
  }
};

const fallbackRoute = (waypoints: Waypoint[]): Feature<LineString> => ({
  type: "Feature",
  properties: {},
  geometry: {
    type: "LineString",
    coordinates: waypoints.map((waypoint) => waypoint.coordinates)
  }
});

const emptyFeatureCollection = (): FeatureCollection<LineString> => ({
  type: "FeatureCollection",
  features: []
});

const routeFeatureCollection = (
  features: Array<Feature<LineString>>
): FeatureCollection<LineString> => ({
  type: "FeatureCollection",
  features
});

const createFallbackSurfaceRoute = (waypoints: Waypoint[]): SurfaceRoute => {
  const route = fallbackRoute(waypoints);
  const distanceKm = getLineDistanceKm(route.geometry.coordinates);

  return {
    route: routeFeatureCollection([route]),
    metrics: {
      distanceKm,
      tarmacKm: distanceKm,
      offRoadKm: 0
    },
    offRoadSegments: emptyFeatureCollection()
  };
};

const createSurfaceRoute = (
  geometry: LineString,
  distanceMeters: number,
  offRoadSegments: FeatureCollection<LineString>
): SurfaceRoute => {
  const offRoadKm = offRoadSegments.features.reduce(
    (total, feature) => total + getLineDistanceKm(feature.geometry.coordinates),
    0
  );
  const distanceKm = distanceMeters / 1000;

  return {
    route: routeFeatureCollection([
      {
        type: "Feature",
        properties: {},
        geometry
      }
    ]),
    metrics: {
      distanceKm,
      tarmacKm: Math.max(distanceKm - offRoadKm, 0),
      offRoadKm
    },
    offRoadSegments
  };
};

const combineSurfaceRoutes = (routes: SurfaceRoute[]): SurfaceRoute => {
  const metrics = routes.reduce<RouteMetrics>(
    (total, route) => ({
      distanceKm: total.distanceKm + route.metrics.distanceKm,
      tarmacKm: total.tarmacKm + route.metrics.tarmacKm,
      offRoadKm: total.offRoadKm + route.metrics.offRoadKm
    }),
    { distanceKm: 0, tarmacKm: 0, offRoadKm: 0 }
  );

  return {
    route: routeFeatureCollection(routes.flatMap((route) => route.route.features)),
    metrics,
    offRoadSegments: routeFeatureCollection(
      routes.flatMap((route) => route.offRoadSegments.features)
    )
  };
};

const createManualRouteFeature = (route: ManualRoute): Feature<LineString> => ({
  type: "Feature",
  properties: {},
  geometry: {
    type: "LineString",
    coordinates: route.coordinates
  }
});

const mergeMetrics = (
  routeMetrics: Record<string, RouteMetrics>,
  manualRoutes: ManualRoute[]
) => {
  const nextMetrics = { ...routeMetrics };

  manualRoutes.forEach((route) => {
    if (route.coordinates.length < 2) {
      return;
    }

    const distanceKm = getLineDistanceKm(route.coordinates);
    const current = nextMetrics[route.groupId] ?? {
      distanceKm: 0,
      tarmacKm: 0,
      offRoadKm: 0
    };

    nextMetrics[route.groupId] = {
      distanceKm: current.distanceKm + distanceKm,
      tarmacKm: current.tarmacKm,
      offRoadKm: current.offRoadKm + distanceKm
    };
  });

  return nextMetrics;
};

const getRoutableWaypointSegments = (
  groupWaypoints: Waypoint[],
  groupManualRoutes: ManualRoute[]
) => {
  const manualStartIds = new Set(
    groupManualRoutes.map((route) => route.endpointWaypointIds[0])
  );
  const manualEndIds = new Set(groupManualRoutes.map((route) => route.endpointWaypointIds[1]));
  const segments: Waypoint[][] = [];
  let currentSegment: Waypoint[] = [];

  groupWaypoints.forEach((waypoint) => {
    if (manualStartIds.has(waypoint.id)) {
      if (currentSegment.length > 0) {
        segments.push([...currentSegment, waypoint]);
      } else {
        segments.push([waypoint]);
      }

      currentSegment = [];
      return;
    }

    if (manualEndIds.has(waypoint.id)) {
      currentSegment = [waypoint];
      return;
    }

    currentSegment.push(waypoint);
  });

  if (currentSegment.length > 0) {
    segments.push(currentSegment);
  }

  return segments.filter((segment) => segment.length >= 2);
};

const directionsCache = new Map<string, MapboxRouteResponse>();
const DIRECTIONS_CACHE_LIMIT = 100;
const DIRECTIONS_DEBOUNCE_MS = 350;

const cacheDirections = (key: string, value: MapboxRouteResponse) => {
  if (directionsCache.size >= DIRECTIONS_CACHE_LIMIT) {
    const firstKey = directionsCache.keys().next().value;
    if (firstKey !== undefined) {
      directionsCache.delete(firstKey);
    }
  }
  directionsCache.set(key, value);
};

export function MapArea() {
  const {
    waypoints,
    waypointGroups,
    mapStyle,
    selectedAddGroupId,
    activeMapTool,
    manualRoutes,
    addWaypoint,
    addManualRoute,
    updateWaypointCoordinates,
    setRouteDataByGroup: setStoreRouteDataByGroup,
    setRouteMetricsByGroup,
    showMapLabels
  } = useMapStore();
  const mapRef = useRef<MapRef | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const waypointIdsRef = useRef<Set<string>>(new Set());
  const isWaypointDragRef = useRef(false);
  const [routeDataByGroup, setRouteDataByGroup] = useState<Record<string, FeatureCollection<LineString>>>({});
  const [offRoadSegmentsByGroup, setOffRoadSegmentsByGroup] = useState<
    Record<string, FeatureCollection<LineString>>
  >({});
  const [draftUnpavedCoordinates, setDraftUnpavedCoordinates] = useState<[number, number][]>([]);
  const [isDrawingUnpaved, setIsDrawingUnpaved] = useState(false);
  const [routeStatus, setRouteStatus] = useState<RouteStatus>("idle");
  const [mapError, setMapError] = useState(false);
  const groupedWaypoints = useMemo(
    () =>
      waypointGroups.map((group) => ({
        group,
        waypoints: waypoints.filter((waypoint) => waypoint.groupId === group.id)
      })),
    [waypointGroups, waypoints]
  );
  const groupColorById = useMemo(
    () =>
      waypointGroups.reduce<Record<string, string>>((colors, group) => {
        colors[group.id] = group.color;
        return colors;
      }, {}),
    [waypointGroups]
  );
  const manualRoutesByGroup = useMemo(
    () =>
      manualRoutes.reduce<Record<string, ManualRoute[]>>((routes, route) => {
        routes[route.groupId] = [...(routes[route.groupId] ?? []), route];
        return routes;
      }, {}),
    [manualRoutes]
  );

  // Add your real Mapbox token in `.env.local`:
  // NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.your_token_here
  // The placeholder keeps TypeScript and local scaffolding happy, but live maps and routing require a valid token.
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? "MAPBOX_ACCESS_TOKEN";
  const hasUsableToken = mapboxToken !== "MAPBOX_ACCESS_TOKEN";

  const initialViewState = useMemo(
    () => ({
      longitude: 7.55,
      latitude: 46.12,
      zoom: 6.25,
      bearing: -8,
      pitch: 28
    }),
    []
  );
  useEffect(() => {
    setMapError(false);
  }, [mapStyle]);

  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    const applyVisibility = () => {
      const visibility = showMapLabels ? "visible" : "none";
      const style = map.getStyle();
      if (!style?.layers) return;
      for (const layer of style.layers) {
        // Mapbox text labels are symbol layers. Layer IDs in the public
        // styles consistently end in "-label" (settlement-major-label,
        // road-label, poi-label, etc.) — match those rather than every
        // symbol so we leave icon-only layers alone.
        if (layer.type === "symbol" && /label$/.test(layer.id)) {
          try {
            map.setLayoutProperty(layer.id, "visibility", visibility);
          } catch {
            // Layer may have been removed mid-style-load; ignore.
          }
        }
      }
    };

    if (map.isStyleLoaded()) {
      applyVisibility();
    }
    map.on("styledata", applyVisibility);
    return () => {
      map.off("styledata", applyVisibility);
    };
  }, [showMapLabels, mapStyle]);

  useEffect(() => {
    const previousIds = waypointIdsRef.current;
    const addedWaypoint = waypoints.find((waypoint) => !previousIds.has(waypoint.id));

    waypointIdsRef.current = new Set(waypoints.map((waypoint) => waypoint.id));

    if (!addedWaypoint || !mapRef.current) {
      return;
    }

    mapRef.current.easeTo({
      center: addedWaypoint.coordinates,
      duration: 650
    });
  }, [waypoints]);

  useEffect(() => {
    let isMounted = true;

    const routableGroups = groupedWaypoints
      .map(({ group, waypoints }, index) => {
        let segments = getRoutableWaypointSegments(
          waypoints,
          manualRoutesByGroup[group.id] ?? []
        );

        // A day with a single stop can't form a route on its own. Connect it
        // to the last stop of the most recent earlier day that has stops, so
        // the day's leg continues from where the previous day ended.
        if (segments.length === 0 && waypoints.length === 1) {
          for (let prev = index - 1; prev >= 0; prev--) {
            const prevWaypoints = groupedWaypoints[prev]?.waypoints ?? [];
            const previousStop = prevWaypoints[prevWaypoints.length - 1];
            if (previousStop) {
              segments = [[previousStop, waypoints[0]!]];
              break;
            }
          }
        }

        return { group, segments };
      })
      .filter((group) => group.segments.length > 0);

    if (routableGroups.length === 0) {
      setRouteDataByGroup({});
      setStoreRouteDataByGroup({});
      setOffRoadSegmentsByGroup({});
      setRouteMetricsByGroup(mergeMetrics({}, manualRoutes));
      setRouteStatus("idle");
      return;
    }

    if (!hasUsableToken) {
      const fallbackRoutes = routableGroups.reduce<
        Record<string, SurfaceRoute>
      >((routes, { group, segments }) => {
        routes[group.id] = combineSurfaceRoutes(
          segments.map((segment) => createFallbackSurfaceRoute(segment))
        );
        return routes;
      }, {});

      const nextRouteData = Object.fromEntries(
        Object.entries(fallbackRoutes).map(([groupId, surfaceRoute]) => [
          groupId,
          surfaceRoute.route
        ])
      );

      setRouteDataByGroup(nextRouteData);
      setStoreRouteDataByGroup(nextRouteData);
      setOffRoadSegmentsByGroup(
        Object.fromEntries(
          Object.entries(fallbackRoutes).map(([groupId, surfaceRoute]) => [
            groupId,
            surfaceRoute.offRoadSegments
          ])
        )
      );
      setRouteMetricsByGroup(
        mergeMetrics(
          Object.fromEntries(
            Object.entries(fallbackRoutes).map(([groupId, surfaceRoute]) => [
              groupId,
              surfaceRoute.metrics
            ])
          ),
          manualRoutes
        )
      );
      setRouteStatus("missing-token");
      return;
    }

    const controller = new AbortController();

    async function fetchRoute() {
      setRouteStatus("loading");

      try {
        const groupRoutes = await Promise.all(
          routableGroups.map(async ({ group, segments }) => {
            const segmentRoutes = await Promise.all(
              segments.map(async (segment) => {
                const coordinates = segment
                  .map((waypoint) => waypoint.coordinates.join(","))
                  .join(";");
                const cacheKey = `driving|${coordinates}`;

                let data = directionsCache.get(cacheKey);
                if (!data) {
                  const routeUrl = new URL(
                    `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinates}`
                  );

                  routeUrl.searchParams.set("alternatives", "false");
                  routeUrl.searchParams.set("geometries", "geojson");
                  routeUrl.searchParams.set("overview", "full");
                  routeUrl.searchParams.set("access_token", mapboxToken);

                  const response = await fetch(routeUrl, { signal: controller.signal });

                  if (!response.ok) {
                    throw new Error(`Mapbox route request failed with ${response.status}`);
                  }

                  data = (await response.json()) as MapboxRouteResponse;
                  cacheDirections(cacheKey, data);
                }
                const route = data.routes?.[0];
                const geometry = route?.geometry;

                if (!geometry || typeof route.distance !== "number") {
                  throw new Error("Mapbox route response did not include geometry.");
                }

                const offRoadSegments = await createSafeOffRoadSegmentsFromSurfaceTiles(
                  geometry,
                  mapboxToken,
                  controller.signal
                );

                return createSurfaceRoute(geometry, route.distance, offRoadSegments);
              })
            );

            return [group.id, combineSurfaceRoutes(segmentRoutes)] as const;
          })
        );

        if (isMounted) {
          const nextRouteData = Object.fromEntries(
            groupRoutes.map(([groupId, surfaceRoute]) => [groupId, surfaceRoute.route])
          );

          setRouteDataByGroup(nextRouteData);
          setStoreRouteDataByGroup(nextRouteData);
          setOffRoadSegmentsByGroup(
            Object.fromEntries(
              groupRoutes.map(([groupId, surfaceRoute]) => [
                groupId,
                surfaceRoute.offRoadSegments
              ])
            )
          );
          setRouteMetricsByGroup(
            mergeMetrics(
              Object.fromEntries(
                groupRoutes.map(([groupId, surfaceRoute]) => [groupId, surfaceRoute.metrics])
              ),
              manualRoutes
            )
          );
          setRouteStatus("ready");
        }
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        if (isMounted) {
          const fallbackRoutes = routableGroups.reduce<
            Record<string, SurfaceRoute>
          >((routes, { group, segments }) => {
            routes[group.id] = combineSurfaceRoutes(
              segments.map((segment) => createFallbackSurfaceRoute(segment))
            );
            return routes;
          }, {});

          const nextRouteData = Object.fromEntries(
            Object.entries(fallbackRoutes).map(([groupId, surfaceRoute]) => [
              groupId,
              surfaceRoute.route
            ])
          );

          setRouteDataByGroup(nextRouteData);
          setStoreRouteDataByGroup(nextRouteData);
          setOffRoadSegmentsByGroup(
            Object.fromEntries(
              Object.entries(fallbackRoutes).map(([groupId, surfaceRoute]) => [
                groupId,
                surfaceRoute.offRoadSegments
              ])
            )
          );
          setRouteMetricsByGroup(
            mergeMetrics(
              Object.fromEntries(
                Object.entries(fallbackRoutes).map(([groupId, surfaceRoute]) => [
                  groupId,
                  surfaceRoute.metrics
                ])
              ),
              manualRoutes
            )
          );
          setRouteStatus("error");
        }
      }
    }

    const debounceHandle = window.setTimeout(() => {
      void fetchRoute();
    }, DIRECTIONS_DEBOUNCE_MS);

    return () => {
      isMounted = false;
      window.clearTimeout(debounceHandle);
      controller.abort();
    };
  }, [
    groupedWaypoints,
    hasUsableToken,
    manualRoutes,
    manualRoutesByGroup,
    mapboxToken,
    setStoreRouteDataByGroup,
    setRouteMetricsByGroup
  ]);

  const addToolWaypoint = (coordinates: [number, number], prefix = "Point") => {
    addWaypoint({
      id: `map-point-${Date.now()}`,
      name: `${prefix} ${waypoints.length + 1}`,
      coordinates,
      groupId: selectedAddGroupId
    });
  };

  const getLngLatFromClientPoint = (clientX: number, clientY: number): [number, number] | null => {
    const container = mapContainerRef.current;
    const map = mapRef.current;

    if (!container || !map) {
      return null;
    }

    const bounds = container.getBoundingClientRect();
    const lngLat = map.unproject([clientX - bounds.left, clientY - bounds.top]);

    return [lngLat.lng, lngLat.lat];
  };

  const appendDraftCoordinate = (coordinate: [number, number]) => {
    setDraftUnpavedCoordinates((current) => {
      const previous = current.at(-1);

      if (previous && getDistanceKm(previous, coordinate) < 0.015) {
        return current;
      }

      return [...current, coordinate];
    });
  };

  const finishUnpavedDrawing = () => {
    if (draftUnpavedCoordinates.length >= 2) {
      const routeId = `manual-route-${Date.now()}`;
      const startCoordinates = draftUnpavedCoordinates[0];
      const endCoordinates = draftUnpavedCoordinates[draftUnpavedCoordinates.length - 1];
      const startWaypointId = `${routeId}-start`;
      const endWaypointId = `${routeId}-end`;

      addWaypoint({
        id: startWaypointId,
        name: "Unpaved start",
        coordinates: startCoordinates,
        groupId: selectedAddGroupId
      });
      addWaypoint({
        id: endWaypointId,
        name: "Unpaved end",
        coordinates: endCoordinates,
        groupId: selectedAddGroupId
      });
      addManualRoute({
        id: routeId,
        mode: "unpaved",
        coordinates: draftUnpavedCoordinates,
        endpointWaypointIds: [startWaypointId, endWaypointId],
        groupId: selectedAddGroupId
      });
    }

    setDraftUnpavedCoordinates([]);
    setIsDrawingUnpaved(false);
  };

  const handleMapDrop = (event: React.DragEvent<HTMLDivElement>) => {
    const tool = event.dataTransfer.getData("application/nicemaps-tool");

    if (tool !== "point") {
      return;
    }

    event.preventDefault();
    const coordinates = getLngLatFromClientPoint(event.clientX, event.clientY);

    if (coordinates) {
      addToolWaypoint(coordinates, "Dropped point");
    }
  };

  const handleMapClick = (event: { lngLat: { lng: number; lat: number }; originalEvent?: MouseEvent }) => {
    if (isWaypointDragRef.current) {
      isWaypointDragRef.current = false;
      return;
    }

    if (activeMapTool === "draw-unpaved" || isDrawingUnpaved) {
      return;
    }

    const coordinate: [number, number] = [event.lngLat.lng, event.lngLat.lat];

    addToolWaypoint(coordinate);
  };

  const handleMapMouseDown = (event: { lngLat: { lng: number; lat: number } }) => {
    if (activeMapTool !== "draw-unpaved") {
      return;
    }

    setIsDrawingUnpaved(true);
    setDraftUnpavedCoordinates([[event.lngLat.lng, event.lngLat.lat]]);
  };

  const handleMapMouseMove = (event: { lngLat: { lng: number; lat: number } }) => {
    if (!isDrawingUnpaved || activeMapTool !== "draw-unpaved") {
      return;
    }

    appendDraftCoordinate([event.lngLat.lng, event.lngLat.lat]);
  };

  const draftUnpavedFeature = useMemo<Feature<LineString> | null>(() => {
    if (draftUnpavedCoordinates.length < 2) {
      return null;
    }

    return {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: draftUnpavedCoordinates
      }
    };
  }, [draftUnpavedCoordinates]);

  return (
    <main className="absolute inset-0 overflow-hidden bg-field">
      <div
        id="map-export-target"
        ref={mapContainerRef}
        className="relative h-full w-full"
        onDragOver={(event) => {
          if (event.dataTransfer.types.includes("application/nicemaps-tool")) {
            event.preventDefault();
          }
        }}
        onDrop={handleMapDrop}
      >
        {!hasUsableToken || mapError ? (
          <FallbackMapPreview
            waypoints={waypoints}
            groups={waypointGroups}
            manualRoutes={manualRoutes}
            hasUsableToken={hasUsableToken}
          />
        ) : (
          <ReactMap
            ref={mapRef}
            mapboxAccessToken={mapboxToken}
            initialViewState={initialViewState}
            mapStyle={mapStyle}
            style={{
              width: "100%",
              height: "100%",
              cursor:
                activeMapTool === "draw-unpaved"
                  ? "crosshair"
                  : "copy"
            }}
            attributionControl={false}
            dragPan={activeMapTool !== "draw-unpaved"}
            reuseMaps
            onClick={handleMapClick}
            onMouseDown={handleMapMouseDown}
            onMouseMove={handleMapMouseMove}
            onMouseUp={finishUnpavedDrawing}
            onMouseLeave={() => {
              if (isDrawingUnpaved) {
                finishUnpavedDrawing();
              }
            }}
            onError={() => setMapError(true)}
          >
            {groupedWaypoints.map(({ group }) => {
              const routeData = routeDataByGroup[group.id];
              const offRoadSegments = offRoadSegmentsByGroup[group.id];

              return routeData ? (
                <Fragment key={group.id}>
                  <Source id={`route-casing-source-${group.id}`} type="geojson" data={routeData}>
                    <Layer
                      id={`nicemaps-route-casing-${group.id}`}
                      type="line"
                      layout={{
                        "line-cap": "round",
                        "line-join": "round"
                      }}
                      paint={{
                        "line-color": "#F5EDD5",
                        "line-width": 8.5,
                        "line-opacity": 0.92
                      }}
                    />
                  </Source>
                  <Source id={`route-source-${group.id}`} type="geojson" data={routeData}>
                    <Layer
                      id={`nicemaps-route-${group.id}`}
                      type="line"
                      layout={{
                        "line-cap": "round",
                        "line-join": "round"
                      }}
                      paint={{
                        "line-color": group.color,
                        "line-width": 4.5,
                        "line-opacity": 0.95
                      }}
                    />
                  </Source>
                  {offRoadSegments && offRoadSegments.features.length > 0 ? (
                    <Source
                      id={`route-offroad-source-${group.id}`}
                      type="geojson"
                      data={offRoadSegments}
                    >
                      <Layer
                        id={`nicemaps-route-offroad-base-${group.id}`}
                        type="line"
                        layout={{
                          "line-cap": "round",
                          "line-join": "round"
                        }}
                        paint={{
                          "line-color": "#FFFFFF",
                          "line-width": 5.75,
                          "line-opacity": 0.95
                        }}
                      />
                      <Layer
                        id={`nicemaps-route-offroad-stripes-${group.id}`}
                        type="line"
                        layout={{
                          "line-cap": "butt",
                          "line-join": "round"
                        }}
                        paint={{
                          "line-color": group.color,
                          "line-width": 4.35,
                          "line-opacity": 0.96,
                          "line-dasharray": [0.55, 0.75]
                        }}
                      />
                    </Source>
                  ) : null}
                </Fragment>
              ) : null;
            })}

            {Object.entries(manualRoutesByGroup).map(([groupId, routes]) =>
              routes.map((route) => (
                <Source
                  key={route.id}
                  id={`manual-route-source-${route.id}`}
                  type="geojson"
                  data={createManualRouteFeature(route)}
                >
                  <Layer
                    id={`manual-route-base-${route.id}`}
                    type="line"
                    layout={{
                      "line-cap": "round",
                      "line-join": "round"
                    }}
                    paint={{
                      "line-color": "#FFFFFF",
                      "line-width": 5.8,
                      "line-opacity": 0.95
                    }}
                  />
                  <Layer
                    id={`manual-route-stripes-${route.id}`}
                    type="line"
                    layout={{
                      "line-cap": "butt",
                      "line-join": "round"
                    }}
                    paint={{
                      "line-color": groupColorById[groupId] ?? "#171B18",
                      "line-width": 4.35,
                      "line-opacity": 0.96,
                      "line-dasharray": [0.55, 0.75]
                    }}
                  />
                </Source>
              ))
            )}

            {draftUnpavedFeature ? (
              <Source id="draft-unpaved-route-source" type="geojson" data={draftUnpavedFeature}>
                <Layer
                  id="draft-unpaved-route"
                  type="line"
                  layout={{
                    "line-cap": "round",
                    "line-join": "round"
                  }}
                  paint={{
                    "line-color": groupColorById[selectedAddGroupId] ?? "#171B18",
                    "line-width": 4,
                    "line-opacity": 0.72,
                    "line-dasharray": [0.25, 1.1]
                  }}
                />
              </Source>
            ) : null}

            {waypoints.map((waypoint, index) => (
              <Marker
                key={waypoint.id}
                longitude={waypoint.coordinates[0]}
                latitude={waypoint.coordinates[1]}
                anchor="center"
                draggable={activeMapTool !== "draw-unpaved"}
                onDragStart={() => {
                  isWaypointDragRef.current = true;
                }}
                onDragEnd={(event) => {
                  updateWaypointCoordinates(waypoint.id, [
                    event.lngLat.lng,
                    event.lngLat.lat
                  ]);
                  window.setTimeout(() => {
                    isWaypointDragRef.current = false;
                  }, 0);
                }}
              >
                <div
                  className="group relative flex h-8 w-8 cursor-grab items-center justify-center rounded-full border-2 border-paper font-mono text-[10px] font-bold text-paper shadow-map active:cursor-grabbing"
                  style={{ backgroundColor: groupColorById[waypoint.groupId] ?? "#DC6432" }}
                >
                  {index + 1}
                  <span className="pointer-events-none absolute top-10 whitespace-nowrap rounded-xl border border-ink/10 bg-paper px-2.5 py-1.5 text-[11px] font-semibold text-ink opacity-0 shadow-map transition-opacity duration-150 group-hover:opacity-100">
                    {waypoint.name}
                  </span>
                </div>
              </Marker>
            ))}
          </ReactMap>
        )}
        {hasUsableToken && !mapError && routeStatus !== "idle" ? (
          <div className="pointer-events-none absolute bottom-5 right-5 max-w-[280px] rounded-[12px] border border-border/85 bg-paper/92 px-3 py-2 text-xs font-semibold text-ink shadow-map backdrop-blur-xl">
            {routeStatus === "loading" ? "Building route with Mapbox..." : null}
            {routeStatus === "ready" ? "Mapbox route ready." : null}
            {routeStatus === "error"
              ? "Mapbox routing failed. Showing a straight-line fallback."
              : null}
            {routeStatus === "missing-token" ? "Mapbox token is missing." : null}
          </div>
        ) : null}
      </div>
    </main>
  );
}

export function FallbackMapPreview({
  waypoints,
  groups,
  manualRoutes,
  hasUsableToken
}: {
  waypoints: Waypoint[];
  groups: WaypointGroup[];
  manualRoutes: ManualRoute[];
  hasUsableToken: boolean;
}) {
  const pointByWaypointId = useMemo(() => {
    const total = Math.max(waypoints.length - 1, 1);

    return waypoints.reduce<Record<string, { x: number; y: number }>>((points, waypoint, index) => {
      const progress = index / total;

      points[waypoint.id] = {
        x: 14 + progress * 74,
        y: 42 + Math.sin(index * 1.35) * 14 + (index % 2 === 0 ? -5 : 5)
      };

      return points;
    }, {});
  }, [waypoints]);
  const groupedWaypoints = useMemo(
    () =>
      groups.map((group) => ({
        group,
        waypoints: waypoints.filter(
          (waypoint) =>
            waypoint.groupId === group.id &&
            !manualRoutes.some((route) => route.endpointWaypointIds.includes(waypoint.id))
        )
      })),
    [groups, manualRoutes, waypoints]
  );
  const groupColorById = useMemo(
    () =>
      groups.reduce<Record<string, string>>((colors, group) => {
        colors[group.id] = group.color;
        return colors;
      }, {}),
    [groups]
  );
  const coordinateBounds = useMemo(() => {
    const coordinates = [
      ...waypoints.map((waypoint) => waypoint.coordinates),
      ...manualRoutes.flatMap((route) => route.coordinates)
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
  }, [manualRoutes, waypoints]);
  const projectCoordinate = (coordinate: [number, number]) => {
    if (!coordinateBounds) {
      return { x: 50, y: 50 };
    }

    const lngSpan = Math.max(coordinateBounds.maxLng - coordinateBounds.minLng, 0.001);
    const latSpan = Math.max(coordinateBounds.maxLat - coordinateBounds.minLat, 0.001);

    return {
      x: 12 + ((coordinate[0] - coordinateBounds.minLng) / lngSpan) * 76,
      y: 82 - ((coordinate[1] - coordinateBounds.minLat) / latSpan) * 64
    };
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-field">
      <div className="absolute inset-0 opacity-55 [background-image:linear-gradient(rgba(23,27,24,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(23,27,24,0.08)_1px,transparent_1px)] [background-size:64px_64px]" />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(115deg, rgba(251,248,239,0.88), rgba(245,237,213,0.4) 38%, rgba(193,189,173,0.24)), radial-gradient(circle at 72% 58%, rgba(220,100,50,0.16), transparent 30%)"
        }}
      />
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        <path
          d="M 0 72 C 18 62 24 66 38 54 C 52 42 64 40 100 26"
          fill="none"
          stroke="rgba(32,36,31,0.18)"
          strokeWidth="0.7"
        />
        <path
          d="M 0 38 C 20 44 32 28 46 32 C 60 36 76 22 100 18"
          fill="none"
          stroke="rgba(32,36,31,0.15)"
          strokeWidth="0.7"
        />
        {groupedWaypoints.map(({ group, waypoints: groupWaypoints }) => {
          if (groupWaypoints.length < 2) {
            return null;
          }

          const path = groupWaypoints
            .map((waypoint, index) => {
              const point = pointByWaypointId[waypoint.id];
              return `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`;
            })
            .join(" ");

          return (
            <path
              key={group.id}
              d={path}
              fill="none"
              stroke={group.color}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.15"
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
        {manualRoutes.map((route) => {
          if (route.coordinates.length < 2) {
            return null;
          }

          const path = route.coordinates
            .map((coordinate, index) => {
              const point = projectCoordinate(coordinate);
              return `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`;
            })
            .join(" ");

          return (
            <path
              key={route.id}
              d={path}
              fill="none"
              stroke={groupColorById[route.groupId] ?? "#171B18"}
              strokeDasharray="1 2"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.15"
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
      </svg>

      {waypoints.map((waypoint, index) => {
        const point = pointByWaypointId[waypoint.id];

        return (
          <div
            key={waypoint.id}
            className="absolute flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[10px] border-2 border-paper font-mono text-[10px] font-bold text-paper shadow-map"
            style={{
              left: `${point.x}%`,
              top: `${point.y}%`,
              backgroundColor: groupColorById[waypoint.groupId] ?? "#DC6432"
            }}
          >
            {index + 1}
          </div>
        );
      })}

      <div className="absolute bottom-6 right-6 hidden rounded-[14px] border border-ink/10 bg-paper/90 px-4 py-3 text-right text-ink shadow-map backdrop-blur-xl sm:block">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em]">
          Static Preview
        </p>
        <p className="mt-1 text-xs text-ink/60">
          {hasUsableToken
            ? "Mapbox is unavailable in this session."
            : "Add a Mapbox token for live tiles."}
        </p>
      </div>
    </div>
  );
}
