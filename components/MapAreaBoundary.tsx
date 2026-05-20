"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { useMapStore } from "@/store/useMapStore";
import { FallbackMapPreview } from "@/components/MapArea";

type State = { hasError: boolean };

function BoundaryFallback() {
  const waypoints = useMapStore((s) => s.waypoints);
  const waypointGroups = useMapStore((s) => s.waypointGroups);
  const manualRoutes = useMapStore((s) => s.manualRoutes);

  return (
    <main className="absolute inset-0 flex flex-col items-stretch justify-stretch bg-field">
      <div className="absolute inset-x-0 top-0 z-10 mx-auto mt-4 w-fit max-w-[90%] rounded-full bg-rust/90 px-4 py-2 text-center text-xs font-medium text-cream shadow-lg">
        Map failed to load. Showing fallback preview.
      </div>
      <FallbackMapPreview
        waypoints={waypoints}
        groups={waypointGroups}
        manualRoutes={manualRoutes}
        hasUsableToken={false}
      />
    </main>
  );
}

export class MapAreaBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (process.env.NODE_ENV !== "production") {
      console.error("MapArea error boundary:", error, info);
    }
  }

  render() {
    if (this.state.hasError) {
      return <BoundaryFallback />;
    }
    return this.props.children;
  }
}
