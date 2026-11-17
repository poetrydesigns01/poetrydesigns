/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site-url";

// Crawlers may read every page. The portal's own areas, the guides to them and invitations
// say noindex on the page itself, and a crawler has to fetch a page to read that, so they are
// not closed here. Only the developer gallery, the API and the old sign-in address are.

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dev", "/api", "/sign-in"],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
