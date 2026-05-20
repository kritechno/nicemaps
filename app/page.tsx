import Image from "next/image";
import Link from "next/link";
import { AdventureRoutePanel } from "@/components/AdventureRoutePanel";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import logoSrc from "@/images/logo-transparent.png";

const fieldNotes = [
  "Compose route maps for tour pages, client itineraries, decks, and proposals.",
  "Group waypoints by day, stage, region, or terrain so the story stays readable.",
  "Export a finished map artifact instead of a crowded planning screenshot."
];

export default function Home() {
  return (
    <main className="min-h-[100dvh] overflow-x-hidden bg-field text-ink">
      <SiteHeader />

      <section className="relative mx-auto grid min-h-[100dvh] max-w-[1440px] grid-cols-1 gap-10 px-5 pb-16 pt-28 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end lg:px-10 lg:pb-10 lg:pt-32">
        <div className="relative z-[1] min-w-0 max-w-[650px] pb-0 lg:pb-16">
          <p className="mb-7 inline-flex border-y border-border/80 py-2 text-[11px] font-bold uppercase tracking-[0.24em] text-olive/70">
            Export-ready maps for trips and tours
          </p>
          <h1 className="font-display text-[clamp(4.2rem,10vw,10.5rem)] leading-[0.82] tracking-[-0.04em] text-ink">
            Nice
            <br />
            Maps
          </h1>
          <p className="mt-8 w-[min(350px,calc(100vw-40px))] text-lg leading-8 text-olive sm:w-auto sm:max-w-[58ch]">
            NiceMaps is a quiet map studio for adventurers, tour agencies, and
            route planners who need polished route maps for websites, presentations,
            itineraries, and client-facing trip material.
          </p>
          <div className="mt-9 flex w-[min(350px,calc(100vw-40px))] flex-col gap-3 sm:w-auto sm:flex-row">
            <Link
              href="/studio"
              className="inline-flex h-12 items-center justify-center rounded-[9px] bg-ink px-6 text-sm font-bold text-paper transition hover:bg-rust active:translate-y-px focus:outline-none focus:ring-2 focus:ring-rust/35"
            >
              Compose a map
            </Link>
            <Link
              href="/about"
              className="inline-flex h-12 items-center justify-center rounded-[9px] border border-border/90 bg-[#FBF8EF]/58 px-6 text-sm font-bold text-ink transition hover:border-rust/40 hover:bg-[#FBF8EF]/90 active:translate-y-px focus:outline-none focus:ring-2 focus:ring-rust/30"
            >
              Read the brief
            </Link>
          </div>
        </div>

        <div className="w-[min(350px,calc(100vw-40px))] min-w-0 sm:w-full">
          <AdventureRoutePanel />
        </div>
      </section>

      <section
        className="mx-auto grid max-w-[1440px] grid-cols-1 gap-10 border-t border-border/80 px-5 py-20 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:px-10"
      >
        <div>
          <Image
            src={logoSrc}
            alt="NiceMaps logo"
            width={150}
            height={200}
            className="h-32 w-auto object-contain"
          />
          <h2 className="mt-8 max-w-[9ch] font-display text-6xl leading-[0.9] tracking-[-0.03em]">
            Beautiful map exports without the clutter.
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-[1fr_0.85fr]">
          <p className="max-w-[62ch] text-2xl leading-10 text-ink">
            NiceMaps keeps route creation close to the final artifact: search places,
            group stops by day or surface, draw unpaved links, style the route, and
            export a composed map for websites, decks, itineraries, or proposals.
          </p>
          <div className="space-y-3 border-l border-border/80 pl-5">
            {fieldNotes.map((note) => (
              <p key={note} className="text-sm font-semibold leading-6 text-olive">
                {note}
              </p>
            ))}
          </div>
        </div>
      </section>
      <section
        id="gallery"
        className="mx-auto max-w-[1440px] border-t border-border/80 px-5 py-20 sm:px-8 lg:px-10"
      >
        <div className="grid gap-6 lg:grid-cols-[0.55fr_1.45fr] lg:items-end">
          <div>
            <p className="border-y border-border/80 py-2 text-[11px] font-bold uppercase tracking-[0.24em] text-olive/70">
              Gallery
            </p>
            <h2 className="mt-6 font-display text-[clamp(2.6rem,5.5vw,5.4rem)] leading-[0.9] tracking-[-0.03em]">
              Finished deliverables.
            </h2>
          </div>
          <p className="max-w-[58ch] text-lg leading-8 text-olive">
            Composed in NiceMaps, then dropped into decks, A4 itinerary inserts,
            social squares, website embeds, and brochure spreads. The buyer
            never has to imagine the output.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { title: "Patagonia 7-day trek", format: "Deck slide · 16:9" },
            { title: "Tuscany cycling loop", format: "A4 itinerary insert" },
            { title: "Iceland ring road", format: "Square social" },
            { title: "Atlas Mountains traverse", format: "Website embed" },
            { title: "Norwegian fjords expedition", format: "Brochure spread" },
            { title: "Andes Lake District", format: "PDF handout" }
          ].map((item) => (
            <article
              key={item.title}
              className="group flex flex-col overflow-hidden rounded-[14px] border border-border/80 bg-[#FBF8EF]/55 transition hover:border-rust/40 hover:shadow-[0_22px_60px_rgba(220,100,50,0.14)]"
            >
              <div className="relative aspect-[4/3] bg-[#EFE6CE] [background-image:linear-gradient(rgba(23,27,24,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(23,27,24,0.06)_1px,transparent_1px)] [background-size:36px_36px]">
                <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 font-display text-3xl leading-[0.95] text-ink/40">
                  {item.title}
                </div>
                <div className="absolute bottom-3 left-3 rounded-full bg-paper/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-olive/70">
                  Preview
                </div>
              </div>
              <div className="border-t border-border/80 px-4 py-3">
                <p className="text-sm font-bold text-ink">{item.title}</p>
                <p className="mt-1 text-xs font-semibold text-olive/70">{item.format}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
