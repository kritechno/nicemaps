import Image from "next/image";
import Link from "next/link";
import logoSrc from "@/images/logo-transparent.png";

const footerLinks = [
  { href: "/about", label: "About" },
  { href: "/blog", label: "Blog" },
  { href: "/pricing", label: "Pricing" },
  { href: "/studio", label: "Map Studio" }
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border/80 bg-[#FBF8EF]/72 px-5 py-10 text-ink sm:px-8 lg:px-10">
      <div className="mx-auto grid max-w-[1440px] gap-8 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-3 rounded-[10px] pr-2 transition hover:opacity-80 active:translate-y-px focus:outline-none focus:ring-2 focus:ring-rust/30"
            aria-label="NiceMaps home"
          >
            <Image
              src={logoSrc}
              alt="NiceMaps logo"
              width={34}
              height={46}
              className="h-10 w-8 object-contain"
            />
            <span className="font-display text-3xl leading-none">NiceMaps</span>
          </Link>
          <p className="mt-4 max-w-[46ch] text-sm font-semibold leading-6 text-olive">
            A quiet studio for composing polished route maps for websites,
            presentations, proposals, and field-ready itineraries.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-[auto_auto] sm:items-end sm:gap-10">
          <nav className="flex flex-wrap gap-x-4 gap-y-2" aria-label="Footer navigation">
            {footerLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-bold text-olive/72 transition hover:text-rust focus:outline-none focus:ring-2 focus:ring-rust/30"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <p className="font-mono text-xs text-olive/58">2026 / NiceMaps</p>
        </div>
      </div>
    </footer>
  );
}
