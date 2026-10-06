import { describe, expect, it } from "vitest";
import { parseImportFile } from "@/components/importParsers";

const makeFile = (name: string, body: string) =>
  ({
    name,
    text: async () => body
  }) as File;

describe("parseImportFile", () => {
  it("parses TSV waypoint files with tab delimiters", async () => {
    const bundle = await parseImportFile(
      makeFile("route.tsv", "name\tlat\tlon\nStart\t46.1\t7.1\nFinish\t46.2\t7.2\n")
    );

    expect(bundle.waypoints).toEqual([
      { name: "Start", coordinates: [7.1, 46.1] },
      { name: "Finish", coordinates: [7.2, 46.2] }
    ]);
  });

  it("parses quoted CSV fields with commas", async () => {
    const bundle = await parseImportFile(
      makeFile("route.csv", 'name,lat,lon\n"Pass, upper",46.1,7.1\n')
    );

    expect(bundle.waypoints).toEqual([{ name: "Pass, upper", coordinates: [7.1, 46.1] }]);
  });

  it("keeps multiple KML line strings instead of only the first one", async () => {
    const bundle = await parseImportFile(
      makeFile(
        "route.kml",
        `<?xml version="1.0"?>
        <kml><Document><name>Two lines</name>
          <Placemark><LineString><coordinates>7.0,46.0,0 7.1,46.1,0</coordinates></LineString></Placemark>
          <Placemark><LineString><coordinates>7.2,46.2,0 7.3,46.3,0</coordinates></LineString></Placemark>
        </Document></kml>`
      )
    );

    expect(bundle.groupName).toBe("Two lines");
    expect(bundle.line).toEqual([
      [7, 46],
      [7.1, 46.1],
      [7.2, 46.2],
      [7.3, 46.3]
    ]);
  });

  it("parses GeoJSON MultiLineString geometry", async () => {
    const bundle = await parseImportFile(
      makeFile(
        "route.geojson",
        JSON.stringify({
          type: "Feature",
          properties: { name: "Multi" },
          geometry: {
            type: "MultiLineString",
            coordinates: [
              [
                [7, 46],
                [7.1, 46.1]
              ],
              [
                [7.2, 46.2],
                [7.3, 46.3]
              ]
            ]
          }
        })
      )
    );

    expect(bundle.groupName).toBe("Multi");
    expect(bundle.line).toHaveLength(4);
    expect(bundle.waypoints).toEqual([
      { name: "Start", coordinates: [7, 46] },
      { name: "End", coordinates: [7.3, 46.3] }
    ]);
  });
});
