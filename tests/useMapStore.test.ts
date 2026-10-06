import { beforeEach, describe, expect, it } from "vitest";
import {
  defaultExportSettings,
  defaultRouteMetadata,
  MAP_STYLES,
  useMapStore
} from "@/store/useMapStore";

const resetStore = () => {
  window.localStorage.clear();
  useMapStore.setState({
    currentRouteId: null,
    routeName: "Untitled route",
    savedRoutes: [],
    waypoints: [],
    waypointGroups: [],
    mapStyle: MAP_STYLES["editorial-alpine"],
    routePalette: "orange",
    routeMetricsByGroup: {},
    routeDataByGroup: {},
    selectedAddGroupId: "",
    activeMapTool: "point",
    manualRoutes: [],
    exportSettings: { ...defaultExportSettings },
    metadata: { ...defaultRouteMetadata },
    groupVocabulary: "day",
    showMapLabels: true
  });
};

describe("useMapStore", () => {
  beforeEach(resetStore);

  it("does not delete imported endpoint waypoints when removing an imported manual route", () => {
    useMapStore.getState().importBundle({
      groupName: "Imported GPX",
      waypoints: [
        { name: "Start", coordinates: [7, 46] },
        { name: "End", coordinates: [7.2, 46.2] }
      ],
      line: [
        [7, 46],
        [7.1, 46.1],
        [7.2, 46.2]
      ]
    });

    const importedRoute = useMapStore.getState().manualRoutes[0]!;
    useMapStore.getState().removeManualRoute(importedRoute.id);

    expect(useMapStore.getState().manualRoutes).toHaveLength(0);
    expect(useMapStore.getState().waypoints.map((waypoint) => waypoint.name)).toEqual([
      "Start",
      "End"
    ]);
  });

  it("does delete generated draw-tool endpoints when removing a drawn manual route", () => {
    useMapStore.setState({
      waypointGroups: [{ id: "group-1", name: "Day 1", color: "#DC6432" }],
      waypoints: [
        { id: "manual-route-1-start", name: "Unpaved start", coordinates: [7, 46], groupId: "group-1" },
        { id: "manual-route-1-end", name: "Unpaved end", coordinates: [7.1, 46.1], groupId: "group-1" }
      ],
      manualRoutes: [
        {
          id: "manual-route-1",
          name: "Custom segment 1",
          groupId: "group-1",
          mode: "unpaved",
          coordinates: [
            [7, 46],
            [7.1, 46.1]
          ],
          endpointWaypointIds: ["manual-route-1-start", "manual-route-1-end"],
          generatedEndpointWaypointIds: ["manual-route-1-start", "manual-route-1-end"]
        }
      ]
    });

    useMapStore.getState().removeManualRoute("manual-route-1");

    expect(useMapStore.getState().manualRoutes).toHaveLength(0);
    expect(useMapStore.getState().waypoints).toHaveLength(0);
  });

  it("sanitizes saved routes from localStorage before hydrating state", () => {
    window.localStorage.setItem(
      "nicemaps.savedRoutes",
      JSON.stringify([
        {
          id: "route-1",
          name: "Broken style",
          waypoints: [],
          waypointGroups: [],
          manualRoutes: [],
          mapStyle: "not-a-real-style",
          routePalette: "bad-palette",
          createdAt: "2026-06-14T00:00:00.000Z",
          updatedAt: "2026-06-14T00:00:00.000Z"
        }
      ])
    );

    useMapStore.getState().hydrateSavedRoutes();

    expect(useMapStore.getState().savedRoutes[0]).toMatchObject({
      mapStyle: MAP_STYLES["editorial-alpine"],
      mapStyleKey: "editorial-alpine",
      routePalette: "orange"
    });
  });

  it("keeps the export title synced while it is route-derived", () => {
    useMapStore.getState().setRouteName("Alpine Client Route");

    expect(useMapStore.getState().exportSettings.title).toBe("Alpine Client Route");
  });

  it("does not overwrite a custom export title when renaming the route", () => {
    useMapStore.getState().updateExportSettings({ title: "Custom brochure headline" });
    useMapStore.getState().setRouteName("Internal route name");

    expect(useMapStore.getState().routeName).toBe("Internal route name");
    expect(useMapStore.getState().exportSettings.title).toBe("Custom brochure headline");
  });

  it("repairs stale default export titles when loading saved routes", () => {
    useMapStore.setState({
      savedRoutes: [
        {
          id: "route-1",
          name: "Saved Client Route",
          waypoints: [],
          waypointGroups: [],
          manualRoutes: [],
          mapStyle: MAP_STYLES["editorial-alpine"],
          mapStyleKey: "editorial-alpine",
          routePalette: "orange",
          exportSettings: { ...defaultExportSettings },
          metadata: { ...defaultRouteMetadata },
          groupVocabulary: "day",
          createdAt: "2026-06-14T00:00:00.000Z",
          updatedAt: "2026-06-14T00:00:00.000Z"
        }
      ]
    });

    useMapStore.getState().loadSavedRoute("route-1");

    expect(useMapStore.getState().routeName).toBe("Saved Client Route");
    expect(useMapStore.getState().exportSettings.title).toBe("Saved Client Route");
  });
});
