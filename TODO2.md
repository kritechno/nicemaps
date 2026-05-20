# NiceMaps — TODO2: Audit-Driven Roadmap

Generated from full-project audit (2026-05-11). Goal: become the export & presentation studio for adventure / tour / route maps. Not a navigation app.

---

## P0 — Fix now (credibility & safety)

- [ ] **Verify Mapbox token URL allowlist** (external, requires dashboard access) in Mapbox dashboard (token is `NEXT_PUBLIC_*` and shipped to client; only domain restriction prevents quota theft).
- [x] **Debounce + cache Mapbox Directions API calls** in `components/MapArea.tsx`. Cache key: `(start, end, profile)`. Prevents rate-limit incidents during active editing.
- [x] **Sanitize user-provided text** (title, subtitle, brand name, notes) before injecting into print-window HTML and embed snippet in `components/ExportStudio.tsx`. Use a small escape helper or DOMPurify if HTML is ever needed.
- [x] **Add a React error boundary** around `MapArea` so a Mapbox failure doesn't blank the whole app. Wire the existing fallback SVG preview as the boundary fallback.
- [x] **Move large PNGs out of repo root** (`Screenshot*.png`, `colours_for_website.png`, `typography.png`) into `/design-assets/` and gitignore, or migrate to Git LFS.
- [x] **Cascade-delete warning**: deleting a waypoint silently drops its manual routes (`store/useMapStore.ts:441-443`). Add confirmation or undo.

---

## P1 — Ship next (1–2 weeks, highest product leverage)

### Cartographic table-stakes (export quality)
- [x] **North arrow** component on the export artboard, with position presets (TL/TR/BL/BR) and a few visual styles (minimal, classic, compass rose).
- [x] **Scale bar** with metric/imperial toggle, auto-calculated from artboard bounds and zoom.
- [x] **Attribution control** in export (Mapbox/OSM credit placement, size, color — never remove, just style).
- [x] **Legend customization beyond on/off**: reorder entries, hide individual rows, override labels, choose 1-column vs 2-column layout. _(label overrides, hide rows, 1/2-col implemented; drag-reorder deferred)_
- [x] **Elevation profile strip** below the map in the export, per group or aggregate. _(strip + per-group sparkline implemented; uses latitude as elevation proxy until Tilequery/Terrain-RGB sampling is wired in P2)_
- [x] **SVG export** (in addition to PNG/PDF). Designer-unlock — biggest single differentiator with the least effort.

### Data import (biggest adoption unlock)
- [x] **GPX import** — drag/drop file → creates a group with waypoints + a manual route from the track. Most tour operators already have GPX.
- [x] **GeoJSON import** — `FeatureCollection` of `Point`/`LineString` → groups + routes.
- [x] **KML import** (lower priority, Google Earth users).
- [x] **CSV import** for waypoints (lat, lng, name, group).

### Tour-agency vocabulary & metadata
- [x] **Add `metadata` to saved routes** in `store/useMapStore.ts`: `{ destination, durationDays, difficulty, season, departureMonths, audience }`.
- [x] **Surface metadata in the export summary block** (replace generic "summary" with itinerary-style header).
- [x] **Rename UI vocabulary**: "waypoint group" → "day" or "stage" (configurable per project); "manual route" → "custom segment".
- [x] **Rename `/route-builder` route** to `/studio` and update nav copy. Reposition CTA from "Plan a route" to "Compose a map."

### Marketing surface alignment
- [x] **Landing page gallery**: 6–10 finished export deliverables (deck slide, A4 itinerary insert, square social, web embed, brochure double-spread). _(gallery section scaffolded with 6 placeholder cards; swap in real exports when available)_
- [x] **Hide or de-risk the "Studio (coming soon)" pricing tier** until P2 ships. Selling vapor hurts trust.

---

## P2 — Next quarter (real moat)

### Backend & persistence
- [ ] **Backend persistence** (Supabase or similar). Enables sharing, templates, seats, recovery from cleared localStorage.
- [ ] **Hosted shareable links** (`nicemaps.app/m/<id>`) — public read-only view with embed snippet that updates if the source map changes.
- [ ] **Account auth** (email magic link or OAuth).
- [ ] **Migration path** from localStorage → backend on first sign-in.

### Templates & reuse (the agency moat)
- [ ] **Template library** (e.g. "Patagonia 7-day trek", "Tuscany cycling loop", "Iceland ring road", "African safari"). Browse → duplicate → customize.
- [ ] **Save own template** from any project, with brand kit + style preset baked in.
- [ ] **Brand kits**: per-team primary color, logo, fonts, footer text, default style preset. One click applies to any export.
- [ ] **Per-project palette override** (currently group color only).

### Editorial cartography (visual differentiation)
- [ ] **Callout labels with leader lines** — text box anchored to a coordinate, draggable label, dotted leader. The single visual element that separates "designed map" from "Mapbox screenshot."
- [ ] **POI symbol library** (huts, viewpoints, river crossings, summits, camps, fuel, bivvy). Curated, on-brand glyph set.
- [ ] **Independent hillshade / contour toggle** (decoupled from style preset).
- [ ] **Inset map** for context ("this region within country").
- [ ] **Multi-line title block** with subtitle + dateline + author byline templates.

### Export pipeline rebuild
- [ ] **Replace html2canvas with server-side headless Chromium** (Playwright on a small worker). Sharp text, real PDF, predictable resolution.
- [ ] **Real PDF generation** (not `window.print()`). Vector text where possible, embedded fonts.
- [ ] **Print-quality controls**: DPI selector (150/300), CMYK color profile, bleed (3mm default), crop marks.
- [ ] **Export progress UI** with cancel button. Today large exports look frozen.
- [ ] **Async export queue** so the user can keep editing during render.

### Collaboration (Studio tier)
- [ ] **Team workspaces** with seat-based pricing.
- [ ] **Comments / pins** on a project for client review rounds.
- [ ] **Version history** (auto-snapshot on save).

---

## P3 — Engineering hygiene (parallel, ongoing)

### Refactor the three monsters
- [ ] **Split `components/MapArea.tsx` (1,279 lines)** into:
  - `useRouting` hook (Directions API + cache)
  - `useSurfaceMetrics` hook (vector-tile decoding, tarmac/unpaved split)
  - `useDrawing` hook (manual route pen tool)
  - `<RouteLayers>`, `<Markers>`, `<FallbackPreview>` subcomponents
- [ ] **Split `components/Sidebar.tsx` (1,211 lines)** into: `<RouteLibrary>`, `<GroupEditor>`, `<PlaceSearch>`, `<ToolSwitcher>`, `<StylePicker>`.
- [ ] **Split `components/ExportStudio.tsx` (871 lines)** into: `<ExportArtboard>`, `<ExportControls>`, `<PresetPicker>`, plus a pure `projectCoord()` util.

### Tests (Vitest + React Testing Library)
- [ ] **Unit tests for routing math** — haversine, segment distance, total distance.
- [ ] **Unit tests for surface detection** — vector-tile snapping at 35 m threshold.
- [ ] **Unit tests for artboard projection** — WGS84 → canvas pixel given bounds + padding.
- [ ] **Store tests** — drag-reorder, group reassignment, cascade delete, hydrate from localStorage.
- [ ] **Export integration test** — given a fixture project, the produced PNG has expected dimensions and contains the title text.

### Constants & config
- [ ] **Extract magic numbers** to a `config/` module: tile zoom (14), snap distance (35 m), export padding (18%), search timeout (8s), default route thickness, etc.
- [ ] **Shared theme object** consumed by both Tailwind config and export templates (avoid color drift).

### Performance
- [ ] **Memoize SVG path rendering** in `ExportStudio` so changing one setting doesn't re-render every route.
- [ ] **Virtualize the waypoint list** in `Sidebar` once projects can hold 100+ stops.
- [ ] **Lazy-load `html2canvas`** only when export is opened (already partially done — verify).

### Accessibility
- [ ] **Color-contrast audit** on all 6 style presets (WCAG AA for legend/title text over map).
- [ ] **Screen-reader pass** on Sidebar tools and ExportStudio modal.
- [ ] **Keyboard shortcuts**: cmd-Z undo, cmd-S save, cmd-E export, esc to close modal.

### Documentation
- [ ] **CLAUDE.md** at project root: architecture overview, surface-detection algorithm, artboard projection math, state shape, Mapbox API usage, env vars.
- [ ] **README.md** with setup, env, scripts, deploy.
- [ ] **Inline JSDoc** on the math-heavy functions in MapArea and ExportStudio.

---

## P4 — Nice to have / explore

- [ ] **Undo/redo stack** (most-requested in any editor product).
- [ ] **3D terrain preview** (Mapbox GL has it; could be a "premium look" toggle).
- [ ] **Animated GIF / MP4 export** — fly-through of the route for social.
- [ ] **Story-map mode** — scrollytelling export (one map, multiple stops revealed on scroll). Atlas Obscura-style.
- [ ] **Public REST API** for programmatic map creation (agencies with itinerary CMS).
- [ ] **Figma plugin** to drop a NiceMaps export directly onto a Figma frame.
- [ ] **i18n** (ES, FR, IT, DE first — biggest tour-agency markets).
- [ ] **Analytics on hosted embeds** (views, downloads).
- [ ] **AI assist**: "describe a 10-day Patagonia trek" → suggested waypoints + style.

---

## Sequencing summary

1. **This week:** P0 safety + cache Directions API.
2. **Next 2 weeks:** north arrow, scale bar, SVG export, GPX import, route metadata. Ship the "credible export" milestone.
3. **This quarter:** backend + templates + callout labels + headless-Chromium export. Ship the "Studio tier is real" milestone.
4. **Continuous:** split the three big components, add tests, write CLAUDE.md.

The order matters: nothing in P2 sells without P1, and P3 quality work blocks itself if you wait until P2 to start.
