/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
"use client";

import type { CSSProperties } from "react";
import { PoetryMark, WORDMARK } from "@/components/brand";

// The last resort, for a failure in the root layout itself. It replaces the whole document
// and gets none of the portal's stylesheet or fonts, so the brand, the card and the two ways
// on are set inline, in the portal's colours, with the system's own type.

const INK = "#2a1a12";
const DISPLAY = "Georgia, 'Times New Roman', serif";

const button: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "3rem",
  padding: "0.5rem 1.375rem",
  borderRadius: 12,
  font: "inherit",
  fontWeight: 600,
  textDecoration: "none",
  cursor: "pointer",
};

export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100svh",
          display: "grid",
          placeItems: "center",
          padding: "2.5rem 1rem",
          boxSizing: "border-box",
          background: "linear-gradient(160deg, #efe5d6 0%, #e6dacb 55%, #dccdba 100%)",
          color: INK,
          fontFamily: "system-ui, sans-serif",
          fontSize: "1.0625rem",
          lineHeight: 1.55,
        }}
      >
        <title>Something went wrong · Poetry Designs</title>
        <main
          style={{
            width: "100%",
            maxWidth: "28rem",
            boxSizing: "border-box",
            display: "grid",
            justifyItems: "start",
            gap: "1.5rem",
            padding: "2rem",
            border: "1px solid rgb(255 255 255 / 0.7)",
            borderRadius: 20,
            background: "rgb(255 252 247 / 0.86)",
            boxShadow: "0 12px 32px -14px rgb(74 44 26 / 0.3)",
          }}
        >
          <p style={{ margin: 0, display: "inline-flex", alignItems: "center", gap: 10 }}>
            <PoetryMark height={32} style={{ display: "block" }} />
            {/* The firm's own lettering, as on every other page. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={WORDMARK.src}
              width={WORDMARK.width}
              height={WORDMARK.height}
              alt="Poetry Designs"
              decoding="async"
              style={{ display: "block", width: "auto", height: 16 }}
            />
          </p>
          <h1 style={{ margin: 0, fontFamily: DISPLAY, fontSize: "2rem", fontWeight: 500, lineHeight: 1.12 }}>
            Something went wrong
          </h1>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
            <button type="button" onClick={() => retry()} style={{ ...button, border: 0, background: INK, color: "#faf8f5" }}>
              Try again
            </button>
            {/* A full load, not a client navigation: the app around it has failed. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/" style={{ ...button, border: "1px solid rgb(42 26 18 / 0.14)", background: "rgb(255 255 255 / 0.72)", color: INK }}>
              Home
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
