/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
"use client";

import { office, type Contact } from "@/lib/demo-data";
import { useFirm } from "@/lib/demo-store";
import type { PersonId } from "@/lib/firm-data";
import { PROJECT } from "./data";
import { PhoneIcon } from "./icons";

// Who to call, in the order to call them: the BD person who holds the client (the same person
// their feedback counts for and escalations go to), the Project Head, then the office.

function initials(name: string): string {
  const words = name.split(" ").filter((w) => /^[A-Z]/.test(w));
  return (words[0]?.[0] ?? "") + (words[1]?.[0] ?? "");
}

function tel(phone: string) {
  return `tel:${phone.replace(/\s/g, "")}`;
}

export function TeamCard() {
  const firm = useFirm();
  const head = firm.project(PROJECT)?.team.head;
  const person = (id: PersonId | undefined, level: string, role: string): Contact[] => {
    const p = id ? firm.person(id) : undefined;
    return p ? [{ level, name: p.name, role, phone: p.phone }] : [];
  };
  const contacts: Contact[] = [
    ...person(firm.advisorOf(PROJECT), "Your point of contact", "Client relations"),
    ...person(head, "If that does not settle it", "Project Head"),
    office,
  ];

  return (
    <section className="glass p-2 sm:p-3" aria-labelledby="team-title">
      <h2 id="team-title" className="display px-3 pt-2 pb-1 text-22 text-ink">
        Your team
      </h2>
      <ul>
        {contacts.map((contact) => (
          <li key={contact.name} className="glass-row grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2">
            <span
              className="figure grid size-10 place-items-center rounded-full bg-white/60 text-15 text-laterite"
              aria-hidden="true"
            >
              {initials(contact.name)}
            </span>
            <span className="grid min-w-0">
              <span className="truncate text-15 font-semibold text-ink">{contact.name}</span>
              <span className="truncate text-13 text-ink-soft">
                {contact.role} · <span className="whitespace-nowrap">{contact.phone}</span>
              </span>
            </span>
            <a
              href={tel(contact.phone)}
              className="btn-glass grid size-11 place-items-center rounded-xl text-laterite"
              aria-label={`Call ${contact.name}, ${contact.phone}`}
            >
              <PhoneIcon className="size-4" />
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
