const routeStops = [
  { label: "Base", x: "14%", y: "67%" },
  { label: "Pass", x: "39%", y: "42%" },
  { label: "Ridge", x: "61%", y: "58%" },
  { label: "Camp", x: "84%", y: "31%" }
];

type AdventureRoutePanelProps = {
  compact?: boolean;
};

export function AdventureRoutePanel({ compact = false }: AdventureRoutePanelProps) {
  return (
    <div
      className={`relative overflow-hidden border border-border/80 bg-[#FBF8EF]/72 shadow-[0_36px_110px_rgba(23,27,24,0.16)] ${
        compact ? "min-h-[320px]" : "min-h-[470px] rounded-[22px]"
      }`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_18%,rgba(220,100,50,0.18),transparent_28%),linear-gradient(125deg,rgba(100,90,50,0.16),transparent_48%)]" />
      <div className="absolute inset-7 rounded-[18px] border border-olive/20 bg-[linear-gradient(rgba(23,27,24,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(23,27,24,0.07)_1px,transparent_1px)] bg-[size:54px_54px]" />
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M14 67 C25 52 31 54 39 42 S52 65 61 58 S72 36 84 31"
          stroke="#DC6432"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M14 67 C25 52 31 54 39 42 S52 65 61 58 S72 36 84 31"
          stroke="#171B18"
          strokeWidth="0.7"
          strokeDasharray="1 4"
          strokeLinecap="round"
          opacity="0.45"
        />
      </svg>
      {routeStops.map((point, index) => (
        <div
          key={point.label}
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: point.x, top: point.y }}
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-[10px] border-2 border-paper bg-rust font-mono text-[11px] font-bold text-white shadow-map">
            {index + 1}
          </span>
          <span className="mt-2 block rounded-[8px] border border-border/80 bg-paper/90 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-olive shadow-[0_10px_24px_rgba(23,27,24,0.08)]">
            {point.label}
          </span>
        </div>
      ))}
      <div className="absolute bottom-7 left-7 right-7 grid gap-3 border-t border-border/80 bg-paper/80 px-4 py-4 backdrop-blur-md sm:grid-cols-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-olive/60">
            Distance
          </p>
          <p className="mt-1 font-mono text-2xl text-ink">286 km</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-olive/60">
            Surface
          </p>
          <p className="mt-1 font-mono text-2xl text-ink">34%</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-olive/60">
            Window
          </p>
          <p className="mt-1 text-sm font-bold text-ink">Early light</p>
        </div>
      </div>
    </div>
  );
}
