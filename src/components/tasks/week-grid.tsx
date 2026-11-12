"use client";

import { useFirm } from "@/lib/demo-store";
import { addDays, daysBetween, hours, shortWeekdayDate } from "@/lib/format";
import { WEEK, type PersonId } from "@/lib/firm-data";

// One person's week of logged time: tasks down the side, Monday 9 to Saturday 14 November
// across, hours in the cells. Hours spent with a client sit on teak, the same teak as their
// advisory hours. On a phone the grid becomes one row per day.

const DAYS = Array.from({ length: daysBetween(WEEK.from, WEEK.to) + 1 }, (_, i) => addDays(WEEK.from, i));

function trim(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
}

export function WeekGrid({
  person,
  total: showTotal = true,
}: {
  person: PersonId;
  /** The week's total under the grid. Pass false when the page's board already says it. */
  total?: boolean;
}) {
  const firm = useFirm();
  const entries = firm.time.filter((t) => t.person === person && t.date >= WEEK.from && t.date <= WEEK.to);
  const total = firm.hoursThisWeek(person);

  const taskIds = [...new Set(entries.map((e) => e.taskId))];
  const rows = taskIds.map((taskId) => {
    const task = firm.tasks.find((t) => t.id === taskId);
    const own = entries.filter((e) => e.taskId === taskId);
    return {
      taskId,
      title: task?.title ?? taskId,
      project: task?.projectName ?? "",
      cells: DAYS.map((day) => {
        const on = own.filter((e) => e.date === day);
        return { hours: on.reduce((s, e) => s + e.hours, 0), consultation: on.some((e) => e.consultation) };
      }),
      total: own.reduce((s, e) => s + e.hours, 0),
    };
  });

  const footer = `This week: ${hours(total)}`;
  if (rows.length === 0) {
    return <p className="text-17 text-ink-soft">No time logged this week yet.</p>;
  }

  return (
    // The layout follows the room the grid is given, not the screen: in a narrow side column
    // of a wide screen it stays the list of days.
    <div className="@container">
      {/* From 576 px of room: the grid. */}
      <table className="hidden w-full border-collapse text-15 @xl:table">
        <caption className="sr-only">Hours logged, Monday 9 to Saturday 14 November</caption>
        <thead>
          <tr className="border-b border-ink">
            <th scope="col" className="py-2 pr-3 text-left font-semibold">
              Task
            </th>
            {DAYS.map((day) => (
              <th key={day} scope="col" className="lettering w-14 px-1 py-2 text-right font-semibold">
                {shortWeekdayDate(day).replace(/ \w+$/, "")}
              </th>
            ))}
            <th scope="col" className="lettering w-16 py-2 pl-2 text-right font-semibold">
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.taskId} className="border-b border-sand">
              <th scope="row" className="py-2.5 pr-3 text-left font-normal">
                <span className="block font-semibold">{row.title}</span>
                <span className="block text-ink-soft">{row.project}</span>
              </th>
              {row.cells.map((cell, i) => (
                <td key={DAYS[i]} className="px-1 py-1.5 text-right align-middle">
                  {cell.hours > 0 && (
                    <span
                      className={`figure inline-block min-w-10 px-1.5 py-0.5 text-17 ${cell.consultation ? "text-lime" : ""}`}
                      style={cell.consultation ? { backgroundImage: "var(--tex-teak)" } : undefined}
                    >
                      {trim(cell.hours)}
                      {cell.consultation && <span className="sr-only"> with the client</span>}
                    </span>
                  )}
                </td>
              ))}
              <td className="figure py-2.5 pl-2 text-right text-17">{trim(row.total)}</td>
            </tr>
          ))}
        </tbody>
        {showTotal && (
          <tfoot>
            <tr>
              <td colSpan={DAYS.length + 2} className="pt-3 text-right text-15 font-semibold">
                {footer}
              </td>
            </tr>
          </tfoot>
        )}
      </table>

      {/* In less room: one row per day. */}
      <ul className="grid gap-5 @xl:hidden">
        {DAYS.map((day, i) => {
          const items = rows.filter((row) => row.cells[i].hours > 0);
          if (items.length === 0) return null;
          return (
            <li key={day}>
              <p className="lettering border-b border-sand pb-1">{shortWeekdayDate(day)}</p>
              <ul className="mt-2 grid gap-2">
                {items.map((row) => (
                  <li key={row.taskId} className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 text-15">
                      <span className="font-semibold">{row.title}</span>
                      <span className="text-ink-soft">, {row.project}</span>
                    </span>
                    <span
                      className={`figure shrink-0 px-1.5 text-17 ${row.cells[i].consultation ? "text-lime" : ""}`}
                      style={row.cells[i].consultation ? { backgroundImage: "var(--tex-teak)" } : undefined}
                    >
                      {hours(row.cells[i].hours)}
                      {row.cells[i].consultation && <span className="sr-only"> with the client</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
        {showTotal && <li className="text-15 font-semibold">{footer}</li>}
      </ul>
    </div>
  );
}
