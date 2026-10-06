import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { MAP_STYLE_DEFINITIONS, MAP_STYLES } from "@/store/useMapStore";

describe("map style registry", () => {
  it("keeps MAP_STYLES in sync with style definitions", () => {
    for (const definition of Object.values(MAP_STYLE_DEFINITIONS)) {
      expect(MAP_STYLES[definition.key]).toBe(definition.url);
    }
  });

  it("points every local style definition at an existing public JSON file", () => {
    for (const definition of Object.values(MAP_STYLE_DEFINITIONS)) {
      if (!definition.url.startsWith("/styles/")) continue;

      const filePath = path.join(process.cwd(), "public", definition.url);
      expect(fs.existsSync(filePath), `${definition.key} missing ${filePath}`).toBe(true);
      expect(() => JSON.parse(fs.readFileSync(filePath, "utf8"))).not.toThrow();
    }
  });
});
