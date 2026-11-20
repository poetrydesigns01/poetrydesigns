/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */

// A project's picture (the 3D elevation, a site photo), made small in the browser before it is
// kept: at most THUMB_MAX_SIDE pixels on the long side, as a JPEG, so the tab's record stays
// small. Browser only: call it from a handler, never during render.

/** Longest side of a kept picture, in pixels. */
export const THUMB_MAX_SIDE = 480;
export const THUMB_QUALITY = 0.8;
/** Files above this are refused before they are read. */
export const THUMB_MAX_BYTES = 8 * 1024 * 1024;

export type ThumbnailResult =
  | { ok: true; dataUrl: string; width: number; height: number }
  | { ok: false; reason: "not-image" | "too-large" | "unreadable" };

/** The words for a refusal, for the upload control. */
export const THUMB_ERROR_WORDS: Record<Exclude<ThumbnailResult, { ok: true }>["reason"], string> = {
  "not-image": "Choose an image",
  "too-large": "Over 8 MB",
  unreadable: "Could not read it",
};

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("unreadable"));
    img.src = url;
  });
}

/** Reads an image file and returns it downscaled as a JPEG data URL. */
export async function prepareThumbnail(file: File): Promise<ThumbnailResult> {
  if (!file.type.startsWith("image/")) return { ok: false, reason: "not-image" };
  if (file.size > THUMB_MAX_BYTES) return { ok: false, reason: "too-large" };
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    if (!w || !h) return { ok: false, reason: "unreadable" };
    const scale = Math.min(1, THUMB_MAX_SIDE / Math.max(w, h));
    const width = Math.max(1, Math.round(w * scale));
    const height = Math.max(1, Math.round(h * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return { ok: false, reason: "unreadable" };
    // JPEG has no transparency: a PNG's clear parts become white, not black.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, width, height);
    return { ok: true, dataUrl: canvas.toDataURL("image/jpeg", THUMB_QUALITY), width, height };
  } catch {
    return { ok: false, reason: "unreadable" };
  } finally {
    URL.revokeObjectURL(url);
  }
}
