import Image from "next/image";
import Link from "next/link";
import { UserCircle2 } from "lucide-react";
import logoSrc from "@/images/logo-transparent.png";

export function SiteHeader() {
  return (
    <header className="fixed inset-x-0 top-0 z-20 border-b border-border/80 bg-[#FBF8EF]/90 px-3 py-2.5 shadow-[0_12px_36px_rgba(23,27,24,0.08)] backdrop-blur-xl sm:px-5">
      <nav className="relative mx-auto grid min-h-[56px] max-w-[1440px] grid-cols-[1fr_auto] items-center gap-3 md:grid-cols-[1fr_auto_1fr]">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-3 justify-self-start rounded-[10px] pr-2 transition hover:opacity-80 active:translate-y-px focus:outline-none focus:ring-2 focus:ring-rust/30"
          aria-label="NiceMaps home"
        >
          <Image
            src={logoSrc}
            alt="NiceMaps logo"
            width={42}
            height={56}
            priority
            className="h-11 w-9 shrink-0 object-contain"
          />
          <span className="font-display text-[26px] leading-none text-ink">NiceMaps</span>
        </Link>

        <div className="hidden items-center justify-center gap-1.5 md:flex">
          <Link
            href="/about"
            className="h-10 rounded-[9px] px-3 py-2.5 text-sm font-bold text-olive/70 transition hover:bg-paper/80 hover:text-ink active:translate-y-px focus:outline-none focus:ring-2 focus:ring-rust/30"
          >
            About
          </Link>
          <Link
            href="/blog"
            className="h-10 rounded-[9px] px-3 py-2.5 text-sm font-bold text-olive/70 transition hover:bg-paper/80 hover:text-ink active:translate-y-px focus:outline-none focus:ring-2 focus:ring-rust/30"
          >
            Blog
          </Link>
          <Link
            href="/pricing"
            className="h-10 rounded-[9px] px-3 py-2.5 text-sm font-bold text-olive/70 transition hover:bg-paper/80 hover:text-ink active:translate-y-px focus:outline-none focus:ring-2 focus:ring-rust/30"
          >
            Pricing
          </Link>
        </div>

        <div className="flex items-center justify-end gap-2 justify-self-end">
          <Link
            href="/studio"
            className="hidden h-11 items-center justify-center rounded-[8px] bg-rust px-3 text-sm font-bold text-white shadow-[0_16px_34px_rgba(220,100,50,0.22)] transition hover:bg-brassLight active:translate-y-px focus:outline-none focus:ring-2 focus:ring-rust/35 sm:flex sm:px-5"
          >
            Open Studio
          </Link>
          <button
            type="button"
            aria-label="Log in or sign up"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-border/80 bg-paper/80 text-olive shadow-[inset_0_0_0_2px_rgba(255,255,255,0.42)] transition hover:border-rust/35 hover:text-rust active:translate-y-px focus:outline-none focus:ring-2 focus:ring-rust/30"
          >
            <UserCircle2 size={23} strokeWidth={1.7} />
          </button>
        </div>
      </nav>
    </header>
  );
}
