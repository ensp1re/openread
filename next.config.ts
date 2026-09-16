import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets checks build into their own folder while a dev server or another build uses .next.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
