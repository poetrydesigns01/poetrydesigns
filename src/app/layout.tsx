/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
import type { Metadata, Viewport } from "next";
import { Anek_Latin, Eczar } from "next/font/google";
import { SITE_URL } from "@/lib/site-url";
import { DESCRIPTION, OPEN_GRAPH, SITE_NAME, TITLE_TEMPLATE } from "./shared-metadata";
import "./globals.css";

const eczar = Eczar({
  variable: "--font-eczar",
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600"],
});

// The width axis lets the lettering on the house be set a little narrower. Only the latin file
// is preloaded: every other face stays declared and loads only on a page that draws one of
// its letters (in practice the odd ₹ in running text on a money screen). The figures' ₹ is
// Eczar's, so Eczar keeps its small latin-ext file preloaded.
const anek = Anek_Latin({
  variable: "--font-anek",
  subsets: ["latin"],
  axes: ["wdth"],
});

// The first screen is the sign-in page, so the default title is its own. Every other route
// names itself in a layout.tsx beside its page, under the template. Icons, the shared-link
// image, the manifest, robots.txt and the sitemap are the files next to this one.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} · Sign in`,
    template: TITLE_TEMPLATE,
  },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: OPEN_GRAPH,
  twitter: { card: "summary_large_image" },
  formatDetection: { telephone: false, address: false, email: false },
};

// The browser's own bar takes the sand of the glass backdrop.
export const viewport: Viewport = {
  themeColor: "#f2ece3",
  colorScheme: "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${eczar.variable} ${anek.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
