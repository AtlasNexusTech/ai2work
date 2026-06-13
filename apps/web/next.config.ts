import path from "node:path";
import type { NextConfig } from "next";

const repoRoot = path.resolve(__dirname, "../..");

const nextConfig: NextConfig = {
  // output: "standalone",
  reactStrictMode: true,
  poweredByHeader: false,
  // Render/Turbopack can otherwise infer apps/web/app as the project root,
  // which prevents resolving next/package.json from this monorepo workspace.
  outputFileTracingRoot: repoRoot,
  turbopack: {
    root: repoRoot,
  },
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
