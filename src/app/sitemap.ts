/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site-url";

// Only two pages are public: the sign-in screen and the privacy policy. Everything else
// opens behind sign-in, or is a guide to those screens, and stays out of search.

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: absoluteUrl("/"), changeFrequency: "monthly", priority: 1 },
    { url: absoluteUrl("/privacy"), lastModified: "2026-11-17", changeFrequency: "yearly", priority: 0.5 },
  ];
}
