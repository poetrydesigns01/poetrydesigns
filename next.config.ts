import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  devIndicators: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // The first staff screens were retired when each role got its own place. Old links land
  // on the screen that does the same job now.
  redirects() {
    return [
      { source: "/staff/requests", destination: "/staff/site/request", permanent: false },
      { source: "/staff/tasks", destination: "/staff/architect/tasks", permanent: false },
    ];
  },
};

export default nextConfig;
