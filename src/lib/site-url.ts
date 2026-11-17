/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */

// The portal's own address, for the links that must be absolute: the shared-link card, the
// sitemap and robots.txt. SITE_URL wins when it is set. On Vercel the production domain is
// used, so a preview build still points shared links at the live portal. Locally it is the
// dev server. Read on the server only: the browser never needs it.

function siteUrl(): string {
  const explicit = process.env.SITE_URL?.trim();
  if (explicit) return withScheme(explicit);
  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (production) return withScheme(production);
  return "http://localhost:3000";
}

/** "portal.example.in/" gives "https://portal.example.in". */
function withScheme(host: string): string {
  const url = /^https?:\/\//i.test(host) ? host : `https://${host}`;
  return url.replace(/\/+$/, "");
}

export const SITE_URL = siteUrl();

/** An absolute address on the portal: "/privacy" gives "https://…/privacy". */
export function absoluteUrl(path: `/${string}`): string {
  return `${SITE_URL}${path}`;
}
