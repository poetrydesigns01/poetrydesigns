"use client";

import { useRef, useState } from "react";
import { House } from "@/components/house/house";
import { HouseCaption } from "@/components/house/house-caption";
import { Sheet } from "@/components/home/sheet";
import { ClientPage } from "@/components/page-band";
import { Composer, ThreadList } from "@/components/thread/thread";
import { site, TODAY } from "@/lib/demo-data";
import { useFirm, useProjection } from "@/lib/demo-store";
import { daysBetween } from "@/lib/format";
import { BANDS } from "@/lib/house-model";
import type { StoreyGroup } from "@/lib/projection";

// The project thread: news from site and from the team, newest first. Pressing a floor of
// the house (or a band with the keyboard) keeps the posts about that floor; posts about no
// floor in particular stay under every filter. Her own post waits five seconds like every
// other write. The cottage's thread, once it has anything in it, follows as its own sheet.

export default function UpdatesPage() {
  const projection = useProjection();
  const firm = useFirm();
  const [floor, setFloor] = useState<StoreyGroup | null>(null);
  // The button that shows every floor goes once it is pressed, so the caption takes the focus.
  const captionRef = useRef<HTMLDivElement>(null);

  const posts = floor ? projection.posts.filter((post) => post.storey === floor || post.storey === null) : projection.posts;
  const cottagePosts = firm.posts.filter((post) => post.projectId === "iyer-cottage");
  const curingDay = daysBetween(site.curing.startedOn, TODAY);
  const showing = floor ? `Showing the ${BANDS[floor].label.toLowerCase()}.` : "Showing every floor.";

  return (
    <ClientPage
      head={
        <>
          <h1 className="display display-xl max-w-[16ch] text-balance">News from your site and your team.</h1>
          <p className="mt-4 max-w-[52ch] text-17 text-lime/80">
            We email you when the team writes here. Your own posts send no email.
          </p>
        </>
      }
      table={
        <>
          <House
            interactive
            labels
            onFocusChange={setFloor}
            scene={{
              only: [],
              focus: floor,
              note: `Slab curing, day ${curingDay} of ${site.curing.days}`,
            }}
          />
          <div ref={captionRef} tabIndex={-1} className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 outline-none">
            <HouseCaption>{floor ? showing : `${showing} Press a floor to keep only its posts.`}</HouseCaption>
            {floor && (
              <button
                type="button"
                className="btn btn-quiet min-h-11 px-4"
                onClick={() => {
                  setFloor(null);
                  captionRef.current?.focus();
                }}
              >
                Show every floor
              </button>
            )}
          </div>
        </>
      }
    >
      {/* The headline already names this sheet, so its title is for screen readers only: a 22 px
          title here would make a fifth size above the fold beside the thread's own three. */}
      <section aria-labelledby="thread-title" className="sheet bg-lime">
        <div className="sheet-inner px-4 py-8 sm:px-8 sm:py-10">
          <h2 id="thread-title" className="sr-only">
            The thread
          </h2>
          {/* On a phone the composer waits above the tab bar, so the last post keeps clear of it. */}
          <div className="pb-24 lg:pb-0">
            <ThreadList
              posts={posts}
              empty={
                floor
                  ? `Nothing has been posted about the ${BANDS[floor].label.toLowerCase()} yet.`
                  : "Nothing has been posted yet."
              }
            />
          </div>
          <div className="no-print fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom)+var(--trial-h,0px))] z-10 max-h-14 overflow-hidden border-t border-sand bg-paper px-4 py-1.5 focus-within:max-h-[70svh] focus-within:overflow-y-auto sm:px-8 lg:static lg:mt-10 lg:max-h-none lg:overflow-visible lg:border-0 lg:bg-transparent lg:p-0">
            <Composer projectId="iyer" by="meera" label="Write to the team" />
          </div>
        </div>
      </section>

      {cottagePosts.length > 0 && (
        <Sheet title="Iyer Farm Cottage" tone="sand">
          <ThreadList posts={cottagePosts} />
        </Sheet>
      )}
    </ClientPage>
  );
}
