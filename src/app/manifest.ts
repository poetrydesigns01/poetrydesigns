/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
import type { MetadataRoute } from "next";
import { DESCRIPTION, SITE_NAME } from "./shared-metadata";

// For the people who add the portal to a phone's home screen, site engineers above all: it
// opens like an app, on the sand of the glass backdrop, with the house mark as its icon.

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: "Poetry",
    description: DESCRIPTION,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f2ece3",
    theme_color: "#f2ece3",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
