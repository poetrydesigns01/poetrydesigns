"use client";

import { Register } from "@/components/register/register";
import { StaffBoard } from "@/components/register/staff-board";
import { TODAY } from "@/lib/demo-data";
import { useFirm, useViewer } from "@/lib/demo-store";
import type { RequestView } from "@/lib/firm";
import { addDays, datePart, listWords, weekdayDate } from "@/lib/format";
import { RequestRow } from "./rows";
import "./site.css";

// Every request the site engineer has raised, on every site, grouped by the day it was
// raised, newest first. Each row is one link to the request, with the ladder on its side
// saying where it has got to.

function dayTitle(day: string): string {
  if (day === TODAY) return "Today";
  if (day === addDays(TODAY, -1)) return "Yesterday";
  return weekdayDate(day);
}

export function MyRequests() {
  const firm = useFirm();
  const me = useViewer("site");
  const mine = firm.requests.filter((r) => r.by === me.id).sort((a, b) => b.at.localeCompare(a.at) || b.no.localeCompare(a.no));
  const open = mine.filter((r) => r.status !== "Delivered");

  const days: { day: string; requests: RequestView[] }[] = [];
  for (const r of mine) {
    const day = datePart(r.at);
    const group = days.find((d) => d.day === day);
    if (group) group.requests.push(r);
    else days.push({ day, requests: [r] });
  }

  // Where the open ones are, by site: "1 at Iyer Residence and 1 at Nair Farmhouse."
  const bySite = [...new Set(open.map((r) => r.projectName))].map(
    (name) => `${open.filter((r) => r.projectName === name).length} at ${name}`,
  );

  const headline =
    open.length === 0
      ? "All your requests are delivered."
      : `${open.length} of your requests ${open.length === 1 ? "is" : "are"} open.`;

  return (
    <div className="site-screen">
      <StaffBoard
        place="My requests"
        headline={headline}
        state={open.length > 0 ? `${listWords(bySite)}.` : undefined}
        chip={false}
      />
      {mine.length === 0 && <p className="text-17 text-ink-soft">You have not raised a request yet.</p>}
      {/* On a wide screen the days stand two to a row, so a row's words keep a reading width. */}
      <div className="grid items-start gap-10 min-[1360px]:grid-cols-2 min-[1360px]:gap-x-8">
        {days.map(({ day, requests }) => (
          <Register key={day} title={dayTitle(day)} limit={20}>
            {requests.map((r) => (
              <RequestRow key={r.no} request={r} />
            ))}
          </Register>
        ))}
      </div>
    </div>
  );
}
