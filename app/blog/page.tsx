import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Blog | NiceMaps",
  description:
    "Map export ideas, route presentation notes, and field guidance from NiceMaps."
};

const posts = [
  {
    title: "Presenting a mixed-surface tour without overbuilding the map",
    category: "Presentation",
    date: "May 8, 2026",
    excerpt:
      "A practical approach to grouping stops, showing surface changes, and keeping a client-facing route map readable."
  },
  {
    title: "What a clean route export should show before a drive",
    category: "Map exports",
    date: "April 24, 2026",
    excerpt:
      "Distance, stop order, terrain split, and a readable visual hierarchy matter more than a crowded screenshot."
  },
  {
    title: "Why unpaved segments need their own planning layer",
    category: "Terrain",
    date: "April 12, 2026",
    excerpt:
      "Gravel and service-road stretches change pace, fuel planning, daylight, and the kind of backup route you should keep nearby."
  }
];

const fieldIndex = ["Alpine loops", "Gravel connectors", "Fuel windows", "Export clarity"];

export default function BlogPage() {
  return (
    <main className="min-h-[100dvh] overflow-x-hidden bg-field text-ink">
      <SiteHeader />
      <section className="mx-auto max-w-[1440px] px-5 pb-20 pt-32 sm:px-8 lg:px-10">
        <div className="grid gap-10 border-b border-border/80 pb-16 lg:grid-cols-[0.7fr_1.3fr] lg:items-end">
          <div>
            <p className="border-y border-border/80 py-2 text-[11px] font-bold uppercase tracking-[0.24em] text-olive/70">
              NiceMaps journal
            </p>
            <h1 className="mt-8 font-display text-[clamp(4rem,9vw,9rem)] leading-[0.84] tracking-[-0.04em]">
              Blog
            </h1>
          </div>
          <p className="max-w-[62ch] text-2xl leading-10 text-olive">
            Field notes on map readability, terrain choices, export design, and
            practical workflows for routes that need more than a pin list.
          </p>
        </div>

        <section className="grid gap-8 py-14 lg:grid-cols-[1fr_340px]">
          <div className="grid gap-4">
            {posts.map((post, index) => (
              <article
                key={post.title}
                className="grid gap-5 border-b border-border/80 py-8 transition hover:border-rust/45 md:grid-cols-[120px_1fr_auto] md:items-start"
              >
                <p className="font-mono text-sm text-olive/58">
                  {(index + 1).toString().padStart(2, "0")}
                </p>
                <div>
                  <div className="mb-3 flex flex-wrap gap-3 text-[11px] font-bold uppercase tracking-[0.18em] text-rust">
                    <span>{post.category}</span>
                    <span className="text-olive/45">{post.date}</span>
                  </div>
                  <h2 className="max-w-[17ch] font-display text-4xl leading-[0.95] tracking-[-0.03em] sm:text-5xl">
                    {post.title}
                  </h2>
                  <p className="mt-5 max-w-[64ch] text-base font-semibold leading-7 text-olive">
                    {post.excerpt}
                  </p>
                </div>
                <Link
                  href="/studio"
                  className="inline-flex h-11 items-center justify-center rounded-[8px] border border-border/90 bg-[#FBF8EF]/58 px-4 text-sm font-bold text-ink transition hover:border-rust/40 hover:bg-[#FBF8EF]/90 active:translate-y-px focus:outline-none focus:ring-2 focus:ring-rust/30"
                >
                  Try it
                </Link>
              </article>
            ))}
          </div>

          <aside className="h-fit border border-border/80 bg-[#FBF8EF]/58 p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-rust">
              Field index
            </p>
            <div className="mt-6 grid gap-3">
              {fieldIndex.map((item) => (
                <p
                  key={item}
                  className="border-b border-border/70 pb-3 text-sm font-bold text-olive last:border-b-0"
                >
                  {item}
                </p>
              ))}
            </div>
            <div className="mt-8 rounded-[12px] border border-border/80 bg-paper/70 p-4">
              <p className="font-mono text-3xl text-ink">286 km</p>
              <p className="mt-2 text-xs font-bold uppercase tracking-[0.16em] text-olive/58">
                sample alpine brief
              </p>
            </div>
          </aside>
        </section>
      </section>
      <SiteFooter />
    </main>
  );
}
