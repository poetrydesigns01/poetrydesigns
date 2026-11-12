"use client";

import { usePathname, useRouter } from "next/navigation";
import { useDemo, useFirm } from "@/lib/demo-store";
import { carbonLine, type StampView } from "@/lib/firm";
import { ROLE_PEOPLE, type Person, type PersonId, type StaffRole } from "@/lib/firm-data";
import { formatStampShort } from "@/lib/format";
import { viewerIdOf } from "./project-switch";

// A stamp is what an action leaves in the record: the action, the date and time, and the
// name, in a small square label. "PO uploaded. 11 Nov, 10:05 am. Prakash Hegde". Under the
// newest stamp sits its carbon line: who was emailed a copy, and a way to see it as them.

const DONE_WORDS = ["Paid", "Approved", "Delivered"];

/** Splits off a leading Paid, Approved or Delivered, which is written in kota. */
function splitDone(words: string): [string, string] {
  const done = DONE_WORDS.find((word) => words === word || words.startsWith(`${word},`) || words.startsWith(`${word} `));
  return done ? [done, words.slice(done.length)] : ["", words];
}

export function Stamp({ stamp, fresh = false }: { stamp: StampView; fresh?: boolean }) {
  const firm = useFirm();
  const name = firm.person(stamp.by)?.name ?? stamp.by;
  const [done, rest] = splitDone(stamp.words);
  return (
    <span className={`stamp lettering${fresh ? " stamp-press" : ""}`}>
      <span>
        {done && <span className="stamp-done">{done}</span>}
        {rest}.
      </span>
      <span>{formatStampShort(stamp.at)}.</span>
      <span>{name}</span>
    </span>
  );
}

/** The role whose screens an href opens: "/client/payments" is the client's, "/staff/site/..." the site's. */
function roleOfHref(href: string): Person["role"] | null {
  const path = href.split(/[?#]/)[0];
  if (path === "/client" || path.startsWith("/client/")) return "client";
  const role = /^\/staff\/(bd|architect|site|finance|admin)(\/|$)/.exec(path)?.[1];
  return (role as StaffRole | undefined) ?? null;
}

/** Whether the demo can show its screens as this person. */
function viewable(person: Person): boolean {
  if (person.role === "client") return person.id === "meera";
  return ROLE_PEOPLE[person.role].includes(person.id);
}

/**
 * The person "See it as" opens the carbon's page as: the first one copied who can be viewed
 * in the demo and whose own screen the page is, passing over `self`, the person already
 * looking. None, and the link is not drawn, so it never opens someone else's screen under
 * this person's name, nor offers anyone a way to become themselves.
 */
function seeAsTarget(
  to: PersonId[],
  href: string,
  person: (id: PersonId) => Person | undefined,
  self: PersonId | null,
): Person | undefined {
  const role = roleOfHref(href);
  if (!role) return undefined;
  for (const id of to) {
    if (id === self) continue;
    const p = person(id);
    if (p && p.role === role && viewable(p)) return p;
  }
  return undefined;
}

/** "Copy to Suresh Gowda, emailed 10:05 am. See it as Suresh". */
export function CarbonLine({ stamp }: { stamp: StampView }) {
  const firm = useFirm();
  const demo = useDemo();
  const router = useRouter();
  const pathname = usePathname();
  const line = carbonLine(stamp, firm.people);
  const carbon = stamp.carbon;
  if (!line || !carbon) return null;
  // Who is looking now: the client is always Meera; a shared staff route such as a project
  // record is seen as the last staff role used.
  const here = roleOfHref(pathname) ?? (pathname.startsWith("/staff/") ? demo.lastRole : null);
  const self = here === null ? null : here === "client" ? "meera" : viewerIdOf(here, demo.viewers);
  const person = seeAsTarget(carbon.to, carbon.href, firm.person, self);
  // Site screens are used outdoors on a phone: their targets are 56 px.
  const site = pathname === "/staff/site" || pathname.startsWith("/staff/site/");

  const seeAs = () => {
    if (!person) return;
    // BD is always Rohan, admin always Shalini and the client always Meera: only the
    // three roles with two people have a viewer to set.
    if (person.role === "architect") demo.setViewer("architect", person.id as "vikram" | "ananya");
    else if (person.role === "site") demo.setViewer("site", person.id as "suresh" | "manjunath");
    else if (person.role === "finance") demo.setViewer("finance", person.id as "prakash" | "divya");
    demo.setFocusRow({ href: carbon.href, id: carbon.rowId });
    router.push(carbon.href);
  };

  return (
    <p className="carbon lettering">
      {line}
      {person && (
        <>
          {" "}
          <button
            type="button"
            className={`link -my-3 inline-flex cursor-pointer items-center text-ink ${site ? "min-h-14" : "min-h-11"}`}
            onClick={seeAs}
          >
            See it as {person.first}
          </button>
        </>
      )}
    </p>
  );
}
