import type { Metadata } from "next";
import Link from "next/link";
import { AdventureRoutePanel } from "@/components/AdventureRoutePanel";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "About | NiceMaps",
  description:
    "Learn how NiceMaps helps adventurers and tour teams create polished route map exports."
};

const principles = [
  {
    label: "Terrain first",
    text: "A route is not just a line. Surface, distance, and stop order help explain the trip."
  },
  {
    label: "Readable artifacts",
    text: "Groups, colors, labels, and quiet map styling make complex tours easier to present."
  },
  {
    label: "Export ready",
    text: "The finished map should fit a website, proposal, deck, itinerary, or client handoff."
  }
];

const fieldSpecs = [
  ["Built for", "Adventurers, tour agencies, tour companies, route planners"],
  ["Studio style", "Map-first, low-clutter, export-focused"],
  ["Route signal", "Distance, surface split, grouped waypoints, stage colors"],
  ["Output", "Presentation, PDF, PNG, website embed, client handoff"]
];

export default function AboutPage() {
  return (
    <main className="min-h-[100dvh] overflow-x-hidden bg-field text-ink">
      <SiteHeader />
      <section className="mx-auto max-w-[1440px] px-5 pb-20 pt-32 sm:px-8 lg:px-10">
        <div className="grid gap-10 border-b border-border/80 pb-16 lg:grid-cols-[0.78fr_1.22fr] lg:items-end">
          <div>
            <p className="border-y border-border/80 py-2 text-[11px] font-bold uppercase tracking-[0.24em] text-olive/70">
              About NiceMaps
            </p>
            <h1 className="mt-8 font-display text-[clamp(4rem,9vw,9rem)] leading-[0.84] tracking-[-0.04em]">
              Maps ready to present.
            </h1>
          </div>
          <p className="max-w-[62ch] text-2xl leading-10 text-olive">
            NiceMaps is a map presentation studio for teams who need route visuals
            that look composed before they enter a proposal, website, presentation,
            or itinerary.
          </p>
        </div>

        <section className="grid gap-8 py-14 lg:grid-cols-[0.95fr_1.05fr] lg:items-stretch">
          <AdventureRoutePanel compact />
          <div className="grid border border-border/80 bg-[#FBF8EF]/58">
            {fieldSpecs.map(([label, value]) => (
              <div
                key={label}
                className="grid gap-2 border-b border-border/80 px-5 py-5 last:border-b-0 sm:grid-cols-[160px_1fr]"
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-olive/58">
                  {label}
                </p>
                <p className="text-base font-bold leading-6 text-ink">{value}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-4 border-t border-border/80 py-14 lg:grid-cols-3">
          {principles.map((principle) => (
            <article key={principle.label} className="border-l border-rust/45 pl-5">
              <h2 className="font-display text-4xl leading-none tracking-[-0.03em]">
                {principle.label}
              </h2>
              <p className="mt-5 text-sm font-semibold leading-7 text-olive">
                {principle.text}
              </p>
            </article>
          ))}
        </section>

        <section className="grid gap-8 border-t border-border/80 py-14 md:grid-cols-[1fr_auto] md:items-center">
          <p className="max-w-[58ch] text-xl leading-8 text-olive">
            The studio is already live. Start with a route, add stops, split it by
            chapter, then export the version a client or audience can understand.
          </p>
          <Link
            href="/studio"
            className="inline-flex h-12 items-center justify-center rounded-[9px] bg-ink px-6 text-sm font-bold text-paper transition hover:bg-rust active:translate-y-px focus:outline-none focus:ring-2 focus:ring-rust/35"
          >
            Compose a map
          </Link>
        </section>
      </section>
      <SiteFooter />
    </main>
  );
}
