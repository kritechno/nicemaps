# NiceMaps TODO

NiceMaps should become a map export and presentation studio for adventurers, tour agencies, tour companies, and route planners. Route planning should support the creation of polished map artifacts, but it should not be the main product identity.

## Product Direction

- Reposition NiceMaps as a studio for creating beautiful, export-ready maps for websites, presentations, itineraries, proposals, and trip pages.
- Treat route planning as an input workflow for map composition, not as a navigation product.
- Make the primary user promise: create a polished route map that can be shared, embedded, printed, or inserted into client-facing materials.
- Rewrite product copy around presentation quality, agency workflows, and export outcomes rather than route planning alone.
- Keep navigation handoff optional and secondary.

## Priority 1: Export Studio

- Replace the current print-based PDF export with a real export canvas.
- Export only the composed map artifact, excluding builder UI, route status messages, search panels, edit controls, and navigation chrome.
- Add export presets:
  - 16:9 presentation slide.
  - A4 portrait.
  - A4 landscape.
  - Website embed.
  - Square social preview.
  - Custom size.
- Support at least PNG and PDF exports in the first implementation pass.
- Add a dedicated export preview so users can see exactly what will be downloaded.
- Add composition fields for title, subtitle, route summary, and optional notes.
- Add a clean legend block for route groups, days, stages, and surface types.
- Make exported maps usable without extra explanation when inserted into a website, proposal, or deck.

## Priority 2: Map Design System

- Replace generic stock style choices with curated export themes.
- Keep Mapbox styles as technical foundations, but expose them as branded presentation themes such as:
  - Editorial Alpine.
  - Minimal Brochure.
  - Luxury Travel.
  - Dark Expedition.
  - Topographic Poster.
  - Agency Clean.
- Add map design controls:
  - Title and subtitle visibility.
  - Legend visibility.
  - Logo or brand mark upload.
  - Brand color.
  - Marker style.
  - Route line thickness.
  - Label density.
  - Day or stage badge style.
- Preserve the premium warm visual direction already present in the app.
- Keep waypoint grouping, custom group colors, place search, and manual route drawing as core editing primitives.
- Avoid adding generic navigation clutter to the map surface.

## Priority 3: Agency and Tour Workflows

- Add workflow language and UI affordances for tour agencies, tour companies, and route planners.
- Support client-facing use cases:
  - Website route map embeds.
  - Presentation and pitch-deck maps.
  - PDF itinerary maps.
  - Route catalog previews.
  - Trip proposal visuals.
- Add embed-code output as a first-class export option.
- Add route/tour metadata fields such as destination, duration, difficulty, surface type, season, and route category.
- Add reusable templates for common tour outputs.
- Move Google Maps export into a secondary action named something like "Navigation handoff" instead of presenting it as a primary export.
- Make it clear that NiceMaps is not a turn-by-turn navigation system.

## Priority 4: Persistence and Collaboration

- Replace local-only saved routes with durable project or library persistence.
- Prepare data structures for:
  - Route collections.
  - Client projects.
  - Shared team libraries.
  - Reusable brand templates.
  - Revision history.
- Keep local storage only as a prototype fallback or offline draft mechanism.
- Add project-level organization before adding advanced paid agency features.
- Plan future team permissions around simple roles: owner, editor, viewer.

## Current Strengths to Preserve

- Premium warm visual direction and quiet interface tone.
- Serif display typography paired with utilitarian controls.
- Waypoint grouping by day, stage, or terrain.
- Custom group colors.
- Place search.
- Manual unpaved route drawing.
- Low-clutter builder UI.
- Route metrics that help explain a trip without turning the app into a navigation dashboard.

## Known Problems

- Export currently calls `window.print()` instead of producing a designed artifact.
- The exported result is the current map screen, not a composed map layout.
- Builder UI and status elements can leak into the export experience.
- Map style options are generic Mapbox presets.
- Product copy is too focused on riders, gravel, and route planning.
- The stated market is broader than the current UI language.
- Saved routes are local-only and not suitable for agency workflows.
- Google Maps handoff currently competes with the core export promise.
- There is no artboard, template system, or export-size control.

## Acceptance Criteria

- `TODO.md` exists at the project root.
- The roadmap is grouped by priority instead of being a flat backlog.
- The document clearly states that the next major product step is the design/export layer.
- The roadmap avoids adding more navigation features as the default next move.
- The tasks are specific enough for implementation planning.

