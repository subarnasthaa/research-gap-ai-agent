import type { NextConfig } from "next";

const isGitHubPages = process.env.GITHUB_PAGES === "true";
const repoName = "research-gap-ai-agent";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // GitHub Pages: static export + basePath
  ...(isGitHubPages
    ? {
        output: "export",
        basePath: `/${repoName}`,
        images: {
          unoptimized: true,
        },
        trailingSlash: true,
      }
    : {
        output: "standalone",
      }),
};

export default nextConfig;
