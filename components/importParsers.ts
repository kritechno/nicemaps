export type ImportBundle = {
  groupName?: string;
  waypoints: Array<{ name: string; coordinates: [number, number] }>;
  line?: [number, number][];
};

const isFiniteCoord = (lng: unknown, lat: unknown): lng is number =>
  typeof lng === "number" &&
  typeof lat === "number" &&
  Number.isFinite(lng) &&
  Number.isFinite(lat) &&
  lng >= -180 &&
  lng <= 180 &&
  lat >= -90 &&
  lat <= 90;

const parseXml = (text: string): Document => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, "application/xml");
  const error = doc.querySelector("parsererror");
  if (error) {
    throw new Error("Invalid XML");
  }
  return doc;
};

const parseGpx = (text: string): ImportBundle => {
  const doc = parseXml(text);
  const nameAttr = doc.querySelector("trk > name, rte > name, metadata > name")?.textContent ?? undefined;
  const waypoints: ImportBundle["waypoints"] = [];

  doc.querySelectorAll("wpt").forEach((node, index) => {
    const lon = Number(node.getAttribute("lon"));
    const lat = Number(node.getAttribute("lat"));
    if (!isFiniteCoord(lon, lat)) return;
    waypoints.push({
      name: node.querySelector("name")?.textContent?.trim() || `Stop ${index + 1}`,
      coordinates: [lon, lat]
    });
  });

  const line: [number, number][] = [];
  doc.querySelectorAll("trkpt, rtept").forEach((node) => {
    const lon = Number(node.getAttribute("lon"));
    const lat = Number(node.getAttribute("lat"));
    if (!isFiniteCoord(lon, lat)) return;
    line.push([lon, lat]);
  });

  if (waypoints.length === 0 && line.length > 0) {
    waypoints.push({ name: "Start", coordinates: line[0]! });
    waypoints.push({
      name: "End",
      coordinates: line[line.length - 1]!
    });
  }

  return {
    groupName: nameAttr?.trim() || undefined,
    waypoints,
    line: line.length >= 2 ? line : undefined
  };
};

const parseKml = (text: string): ImportBundle => {
  const doc = parseXml(text);
  const docName = doc.querySelector("Document > name, Folder > name")?.textContent ?? undefined;
  const waypoints: ImportBundle["waypoints"] = [];
  let line: [number, number][] | undefined;

  doc.querySelectorAll("Placemark").forEach((placemark, index) => {
    const name = placemark.querySelector("name")?.textContent?.trim() || `Stop ${index + 1}`;
    const point = placemark.querySelector("Point > coordinates")?.textContent?.trim();
    const lineString = placemark.querySelector("LineString > coordinates")?.textContent?.trim();

    if (point) {
      const [lon, lat] = point.split(",").map(Number);
      if (isFiniteCoord(lon, lat)) {
        waypoints.push({ name, coordinates: [lon, lat] });
      }
    }

    if (lineString && !line) {
      const coords = lineString
        .split(/\s+/)
        .map((triple) => triple.split(",").map(Number))
        .filter((coord) => isFiniteCoord(coord[0], coord[1]))
        .map((coord) => [coord[0]!, coord[1]!] as [number, number]);
      if (coords.length >= 2) {
        line = coords;
      }
    }
  });

  if (waypoints.length === 0 && line && line.length >= 2) {
    waypoints.push({ name: "Start", coordinates: line[0]! });
    waypoints.push({ name: "End", coordinates: line[line.length - 1]! });
  }

  return { groupName: docName?.trim() || undefined, waypoints, line };
};

const parseGeoJson = (text: string): ImportBundle => {
  const data = JSON.parse(text) as
    | GeoJSON.FeatureCollection
    | GeoJSON.Feature
    | GeoJSON.Geometry;
  const features: GeoJSON.Feature[] = [];

  if ("type" in data && data.type === "FeatureCollection") {
    features.push(...data.features);
  } else if ("type" in data && data.type === "Feature") {
    features.push(data as GeoJSON.Feature);
  } else if ("type" in data) {
    features.push({ type: "Feature", geometry: data as GeoJSON.Geometry, properties: {} });
  }

  const waypoints: ImportBundle["waypoints"] = [];
  let line: [number, number][] | undefined;
  let groupName: string | undefined;

  features.forEach((feature, index) => {
    const name =
      (feature.properties as { name?: string } | null)?.name?.trim() || `Stop ${index + 1}`;
    const geometry = feature.geometry;
    if (!geometry) return;
    if (geometry.type === "Point") {
      const [lon, lat] = geometry.coordinates as number[];
      if (isFiniteCoord(lon, lat)) {
        waypoints.push({ name, coordinates: [lon!, lat!] });
      }
    } else if (geometry.type === "LineString" && !line) {
      const coords = (geometry.coordinates as number[][])
        .filter((coord) => isFiniteCoord(coord[0], coord[1]))
        .map((coord) => [coord[0]!, coord[1]!] as [number, number]);
      if (coords.length >= 2) {
        line = coords;
        groupName = groupName ?? (feature.properties as { name?: string } | null)?.name;
      }
    }
  });

  if (waypoints.length === 0 && line && line.length >= 2) {
    waypoints.push({ name: "Start", coordinates: line[0]! });
    waypoints.push({ name: "End", coordinates: line[line.length - 1]! });
  }

  return { groupName: groupName?.trim() || undefined, waypoints, line };
};

const parseCsv = (text: string): ImportBundle => {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return { waypoints: [] };

  const header = lines[0]!.split(",").map((cell) => cell.trim().toLowerCase());
  const hasHeader = header.some((cell) => ["lat", "lng", "lon", "longitude", "latitude", "name"].includes(cell));
  const startIndex = hasHeader ? 1 : 0;

  const findIndex = (candidates: string[]) =>
    candidates.map((candidate) => header.indexOf(candidate)).find((idx) => idx !== -1) ?? -1;

  const latIdx = hasHeader ? findIndex(["lat", "latitude"]) : 0;
  const lngIdx = hasHeader ? findIndex(["lng", "lon", "longitude"]) : 1;
  const nameIdx = hasHeader ? findIndex(["name", "label", "title"]) : 2;

  const waypoints: ImportBundle["waypoints"] = [];
  for (let i = startIndex; i < lines.length; i += 1) {
    const cells = lines[i]!.split(",").map((cell) => cell.trim());
    const lat = Number(cells[latIdx === -1 ? 0 : latIdx]);
    const lng = Number(cells[lngIdx === -1 ? 1 : lngIdx]);
    if (!isFiniteCoord(lng, lat)) continue;
    const name = nameIdx !== -1 ? cells[nameIdx] ?? "" : "";
    waypoints.push({
      name: name || `Stop ${waypoints.length + 1}`,
      coordinates: [lng, lat]
    });
  }
  return { waypoints };
};

export const parseImportFile = async (file: File): Promise<ImportBundle> => {
  const text = await file.text();
  const lowerName = file.name.toLowerCase();
  if (lowerName.endsWith(".gpx")) return parseGpx(text);
  if (lowerName.endsWith(".kml")) return parseKml(text);
  if (lowerName.endsWith(".geojson") || lowerName.endsWith(".json")) return parseGeoJson(text);
  if (lowerName.endsWith(".csv") || lowerName.endsWith(".tsv")) return parseCsv(text);
  throw new Error(`Unsupported file type: ${file.name}`);
};
