import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  // Allow a second (preview) dev server to use an isolated build dir so two
  // concurrent `next dev` processes don't corrupt each other's .next cache.
  distDir: process.env.NEXT_DIST_DIR || ".next"
};

export default nextConfig;
