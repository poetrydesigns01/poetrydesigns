/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
import type { Metadata } from "next";

// What every page says about the portal when it is shared or listed. Segments merge
// metadata shallowly, so a page that sets its own openGraph starts from OPEN_GRAPH and
// names the shared image again (SOCIAL_IMAGE): the opengraph-image file only fills a
// segment that leaves openGraph alone.

export const SITE_NAME = "Poetry Designs";

export const TITLE_TEMPLATE = `%s · ${SITE_NAME}`;

/**
 * A segment's title, "Payments · Poetry Designs". A plain string title would end the
 * template for every segment below it, so each segment that names itself passes it on.
 */
export function titled(title: string): Metadata["title"] {
  return { default: title, template: TITLE_TEMPLATE };
}

export const NOT_FOUND_TITLE = "Page not found";

/**
 * The title of an address whose project, design or number does not exist, for its segment and
 * every segment below. Its page shows the missing-page card. generateMetadata returns this
 * rather than calling notFound(): Next runs the same generateMetadata again for the
 * missing-page head, and a second throw would leave that head with no title at all.
 */
export const MISSING_TITLE: Metadata["title"] = {
  absolute: `${NOT_FOUND_TITLE} · ${SITE_NAME}`,
  template: `${NOT_FOUND_TITLE} · ${SITE_NAME}`,
};

export const DESCRIPTION =
  "The Poetry Designs portal: homeowners and the team follow drawings, approvals, site updates and payments for every home Poetry designs and builds in Bengaluru.";

/** The words of opengraph-image.alt.txt and twitter-image.alt.txt. */
export const SOCIAL_IMAGE_ALT = "Poetry Designs: a house half drawn, half built in laterite. From concept to reality.";

/** app/opengraph-image.png, for a segment that sets its own openGraph. */
export const SOCIAL_IMAGE = {
  url: "/opengraph-image.png",
  width: 1200,
  height: 630,
  type: "image/png",
  alt: SOCIAL_IMAGE_ALT,
};

/**
 * No url here: og:url names the canonical address, so only a public page that is its own
 * canonical (the sign-in page, the privacy policy) sets one. Any other page sends none.
 */
export const OPEN_GRAPH = {
  type: "website",
  siteName: SITE_NAME,
  locale: "en_IN",
  title: SITE_NAME,
  description: DESCRIPTION,
} satisfies Metadata["openGraph"];

/** For the portal's own areas: signed-in screens, guides and invitations stay out of search. */
export const PRIVATE: Metadata["robots"] = { index: false, follow: false };
