import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Pricing | NiceMaps",
  description:
    "NiceMaps pricing for polished route map exports, saved map libraries, and studio tools."
};

const plans = [
  {
    name: "Explorer",
    price: "Free",
    note: "For composing and exporting individual route maps.",
    features: ["Map studio", "Waypoint groups", "Terrain split", "PNG/PDF/SVG export"],
    href: "/studio",
    cta: "Start building"
  }
];

export default function PricingPage() {
  return (
    <main className="min-h-[100dvh] overflow-x-hidden bg-field text-ink">
      <SiteHeader />
      <section className="mx-auto max-w-[1440px] px-5 pb-20 pt-32 sm:px-8 lg:px-10">
        <div className="grid gap-10 border-b border-border/80 pb-16 lg:grid-cols-[0.75fr_1.25fr] lg:items-end">
          <div>
            <p className="border-y border-border/80 py-2 text-[11px] font-bold uppercase tracking-[0.24em] text-olive/70">
              Pricing
            </p>
            <h1 className="mt-8 font-display text-[clamp(4rem,9vw,9rem)] leading-[0.84] tracking-[-0.04em]">
              Start simple.
            </h1>
          </div>
          <p className="max-w-[62ch] text-2xl leading-10 text-olive">
            NiceMaps is open for map composition now. Paid studio tools will focus
            on saved map libraries, branded exports, website embeds, and workflows
            that support repeat client projects.
          </p>
        </div>

        <section className="grid gap-4 py-14 lg:grid-cols-[0.85fr_1.15fr]">
          {plans.map((plan, index) => (
            <article
              key={plan.name}
              className={`grid min-h-[430px] grid-rows-[auto_1fr_auto] border p-6 ${
                index === 1
                  ? "border-rust/45 bg-rust text-white shadow-[0_22px_60px_rgba(220,100,50,0.22)]"
                  : "border-border/80 bg-[#FBF8EF]/58"
              }`}
            >
              <div>
                <p
                  className={`text-sm font-bold ${
                    index === 1 ? "text-white" : "text-ink"
                  }`}
                >
                  {plan.name}
                </p>
                <p className="mt-6 font-mono text-5xl tracking-[-0.04em]">{plan.price}</p>
                <p
                  className={`mt-5 max-w-[38ch] text-sm font-semibold leading-6 ${
                    index === 1 ? "text-white/82" : "text-olive"
                  }`}
                >
                  {plan.note}
                </p>
              </div>

              <ul
                className={`mt-10 space-y-3 border-t pt-6 text-sm font-bold ${
                  index === 1 ? "border-white/24 text-white" : "border-border/80 text-olive"
                }`}
              >
                {plan.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>

              <Link
                href={plan.href}
                className={`mt-10 inline-flex h-12 items-center justify-center rounded-[9px] px-6 text-sm font-bold transition active:translate-y-px focus:outline-none focus:ring-2 focus:ring-rust/35 ${
                  index === 1
                    ? "bg-white text-rust hover:bg-paper"
                    : "bg-ink text-paper hover:bg-rust"
                }`}
              >
                {plan.cta}
              </Link>
            </article>
          ))}
        </section>

        <section className="grid gap-4 border-t border-border/80 py-12 md:grid-cols-4">
          {["No clutter", "Route groups", "Surface-aware", "Export ready"].map((item) => (
            <div key={item} className="border-l border-rust/45 pl-4">
              <p className="text-sm font-bold text-ink">{item}</p>
              <p className="mt-2 text-xs font-semibold leading-5 text-olive">
                Built around presentable route maps rather than navigation dashboard noise.
              </p>
            </div>
          ))}
        </section>
      </section>
      <SiteFooter />
    </main>
  );
}
