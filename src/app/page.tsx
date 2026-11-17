/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
import type { Metadata } from "next";
import { OPEN_GRAPH, SOCIAL_IMAGE } from "@/app/shared-metadata";
import { Login } from "@/components/login/login";

// The site's own address: the canonical page, and the card a shared link to it shows. Its
// title is the root layout's default, "Poetry Designs · Sign in".
export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: { ...OPEN_GRAPH, url: "/", images: [SOCIAL_IMAGE] },
};

// The first screen: sign in as one of the six people who build a house.
export default function Page() {
  return <Login />;
}
