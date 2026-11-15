/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
"use client";

import { useEffect, useRef } from "react";
import { SamplePhoto } from "@/components/instruments/sample-photo";
import type { PhotoKind, Post } from "@/lib/firm-data";
import { CloseIcon, ImageIcon, NextIcon, PrevIcon } from "./icons";

// Photos in the chat. A site photo is one of the drawn sample kinds; a photo picked from the
// device is kept by its file name, and shows as itself for as long as this tab is open.

export type ChatPhoto = { type: "sample"; kind: PhotoKind } | { type: "file"; name: string };

export const SAMPLE_KINDS: PhotoKind[] = ["slab-pour", "shuttering", "curing", "columns", "blocks", "tiles", "steel", "sand"];

const SAMPLE_WORDS: Record<PhotoKind, string> = {
  "slab-pour": "Slab pour",
  shuttering: "Shuttering",
  curing: "Curing",
  columns: "Column steel",
  blocks: "Block wall",
  tiles: "Tiling",
  steel: "Steel bars",
  sand: "Sand",
};

/** Photos chosen from the device in this tab, by file name. Written only in handlers. */
const deviceUrls = new Map<string, string>();

export function rememberDevicePhoto(name: string, file: Blob) {
  const old = deviceUrls.get(name);
  if (old) URL.revokeObjectURL(old);
  deviceUrls.set(name, URL.createObjectURL(file));
}

export function photosOf(post: Pick<Post, "photos" | "files">): ChatPhoto[] {
  return [
    ...post.photos.map((kind): ChatPhoto => ({ type: "sample", kind })),
    ...(post.files ?? []).map((name): ChatPhoto => ({ type: "file", name })),
  ];
}

export function photoWords(photo: ChatPhoto): string {
  return photo.type === "sample" ? SAMPLE_WORDS[photo.kind] : photo.name;
}

/** One photo filling its box (4 by 3 unless the box says otherwise). */
export function PhotoArt({ photo }: { photo: ChatPhoto }) {
  if (photo.type === "sample") return <SamplePhoto kind={photo.kind} tag={false} />;
  const url = deviceUrls.get(photo.name);
  if (url) {
    // A local blob from the device: nothing for the image optimiser to fetch.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={photo.name} />;
  }
  return (
    <span className="grid h-full w-full place-items-center content-center gap-1 bg-sand px-2 text-center" role="img" aria-label={photo.name}>
      <ImageIcon className="text-laterite" />
      <span className="max-w-full truncate text-13 text-ink-soft">{photo.name}</span>
    </span>
  );
}

/** The photos in a bubble: one wide, or a grid of two columns with "+n" on the fourth. */
export function PhotoGrid({ photos, onOpen }: { photos: ChatPhoto[]; onOpen: (index: number) => void }) {
  const shown = photos.slice(0, 4);
  const more = photos.length - shown.length;
  return (
    <div className={`grid gap-1 ${shown.length === 1 ? "w-64 max-w-full grid-cols-1" : "w-72 max-w-full grid-cols-2"}`}>
      {shown.map((photo, i) => (
        <button
          key={`${photo.type}-${i}`}
          type="button"
          className={`chat-photo ${shown.length === 3 && i === 0 ? "col-span-2" : ""}`}
          style={shown.length === 3 && i === 0 ? { aspectRatio: "8 / 3" } : undefined}
          onClick={() => onOpen(i)}
          aria-label={`Open photo ${i + 1} of ${photos.length}: ${photoWords(photo)}`}
        >
          <PhotoArt photo={photo} />
          {i === 3 && more > 0 && (
            <span className="chat-photo-more" aria-hidden>
              +{more}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

/** A photo enlarged over the chat. Escape, the close button or a tap outside closes it. */
export function Lightbox({
  open,
  photos,
  index,
  caption,
  onIndex,
  onClose,
}: {
  open: boolean;
  photos: ChatPhoto[];
  index: number;
  caption: string;
  onIndex: (index: number) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const photo = photos[index];
  const many = photos.length > 1;
  const step = (by: number) => onIndex((index + by + photos.length) % photos.length);

  return (
    <dialog
      ref={ref}
      className="chat-lightbox"
      aria-label={photo ? photoWords(photo) : "Photo"}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onKeyDown={(event) => {
        if (!many) return;
        if (event.key === "ArrowRight") step(1);
        if (event.key === "ArrowLeft") step(-1);
      }}
    >
      {open && photo && (
        <div className="grid gap-3">
          <div className="flex items-center justify-between gap-3">
            <p className="min-w-0 truncate text-15">
              {caption}
              {many && <span className="text-lime/75"> · {index + 1}/{photos.length}</span>}
            </p>
            <button type="button" className="chat-dark-btn" onClick={onClose} aria-label="Close photo" autoFocus>
              <CloseIcon />
            </button>
          </div>
          <div className="relative">
            <div className="chat-photo">
              <PhotoArt photo={photo} />
            </div>
            {many && (
              <>
                <button
                  type="button"
                  className="chat-dark-btn chat-on-photo absolute top-1/2 left-2 -translate-y-1/2"
                  onClick={() => step(-1)}
                  aria-label="Previous photo"
                >
                  <PrevIcon />
                </button>
                <button
                  type="button"
                  className="chat-dark-btn chat-on-photo absolute top-1/2 right-2 -translate-y-1/2"
                  onClick={() => step(1)}
                  aria-label="Next photo"
                >
                  <NextIcon />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </dialog>
  );
}
