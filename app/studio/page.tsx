import { MapArea } from "@/components/MapArea";
import { MapAreaBoundary } from "@/components/MapAreaBoundary";
import { Sidebar } from "@/components/Sidebar";

export default function StudioPage() {
  return (
    <div className="fixed inset-0 overflow-hidden bg-field">
      <Sidebar />
      <MapAreaBoundary>
        <MapArea />
      </MapAreaBoundary>
    </div>
  );
}
