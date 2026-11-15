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
      // Each client project stays separate: the cottage has no place on the residence's portal.
      { source: "/client/farm-cottage", destination: "/client", permanent: false },
      { source: "/client/farm-cottage/estimate", destination: "/client", permanent: false },
    ];
  },
};

export default nextConfig;
