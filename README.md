# NiceMaps

A quiet map studio for adventurers, tour agencies, and route planners who need
polished, export-ready route maps for websites, presentations, itineraries, and
client-facing trip material.

NiceMaps treats route planning as an *input* workflow for map composition — the
product is the finished map artifact, not the planning screen.

## Features

- **Route builder** — compose routes and group waypoints by day, stage, region, or terrain.
- **Export Studio** — export the composed map artifact (no builder UI, no chrome) as PNG or PDF.
- **Export presets** — 16:9 slide, A4 portrait/landscape, website embed, square social, or custom.
- **Composition fields** — title, subtitle, route summary, notes, and a clean legend block.
- **Map design system** — consistent styling tuned for presentation quality.

## Tech stack

- [Next.js 15](https://nextjs.org/) (App Router) + React 19
- TypeScript
- [Mapbox GL](https://docs.mapbox.com/mapbox-gl-js/) via `react-map-gl`
- [Zustand](https://github.com/pmndrs/zustand) for state
- Tailwind CSS
- `@hello-pangea/dnd` for drag-and-drop, `html2canvas` for export rendering

## Getting started

```bash
npm install
```

Create a `.env.local` file with a Mapbox access token:

```
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.your_token_here
```

Run the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command            | Description                  |
| ------------------ | ---------------------------- |
| `npm run dev`      | Start the dev server         |
| `npm run build`    | Production build             |
| `npm run start`    | Serve the production build   |
| `npm run lint`     | Run ESLint                   |
| `npm run typecheck`| Type-check with `tsc`        |

## Project structure

```
app/         Next.js App Router pages (studio, route-builder, blog, about, pricing)
components/  UI components — MapArea, Sidebar, ExportStudio, AdventureRoutePanel, …
store/       Zustand store (useMapStore)
images/      Static assets
```

## License

MIT — see [LICENSE](LICENSE).
