import type mapboxgl from "mapbox-gl";

let configured = false;

// mapbox-gl auto-registers its RTL-text shaping plugin and eagerly fetches it
// from the Mapbox CDN the first time a map renders symbol layers. On networks
// where that plugin path is blocked the fetch rejects with an uncaught
// "Failed to fetch" error, which the Next.js dev overlay escalates to a
// blocking error screen.
//
// Registering the plugin ourselves with `lazy = true` defers the fetch until
// RTL text is actually encountered (it never is for Latin/Cyrillic routes),
// and supplying a callback turns any download failure into a handled warning
// instead of an unhandled rejection.
export function ensureMapboxRtlPlugin(mapbox: typeof mapboxgl) {
  if (configured || typeof window === "undefined") {
    return;
  }
  configured = true;

  try {
    if (mapbox.getRTLTextPluginStatus() !== "unavailable") {
      return;
    }
    mapbox.setRTLTextPlugin(
      "https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-rtl-text/v0.2.3/mapbox-gl-rtl-text.js",
      (error) => {
        if (error) {
          console.warn(
            "Mapbox RTL-text plugin could not be loaded; right-to-left labels may not shape correctly.",
            error
          );
        }
      },
      true
    );
  } catch {
    // setRTLTextPlugin throws if it has already been called once for the
    // shared mapbox-gl instance — safe to ignore.
  }
}
