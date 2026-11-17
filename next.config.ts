/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
import type { NextConfig } from "next";

// Every response: no other site may show the portal in a frame (the sign-in card takes a
// password), files are taken as the type they are sent as, and a link out names only the site.
const SECURITY_HEADERS = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
];

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  poweredByHeader: false,
  headers() {
    return [{ source: "/(.*)", headers: SECURITY_HEADERS }];
  },
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
