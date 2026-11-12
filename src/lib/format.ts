import { TODAY } from "./demo-data";

const inrFormat = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const dateFormat = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Kolkata",
});

const shortDateFormat = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  timeZone: "Asia/Kolkata",
});

/** Rupees with Indian digit grouping, e.g. ₹87,10,000. */
export function inr(amount: number): string {
  return inrFormat.format(Math.round(amount));
}

/** Signed rupees for cost changes, e.g. +₹2,40,000. */
export function inrDelta(amount: number): string {
  return `${amount < 0 ? "−" : "+"}${inr(Math.abs(amount))}`;
}

// Newer locale data shortens September to "Sept" and older data to "Sep".
// Keep three letters so the server and every browser write the same text.
function threeLetterMonth(text: string): string {
  return text.replace("Sept", "Sep");
}

/** ISO date (YYYY-MM-DD, or a timestamp, whose time is ignored) to "12 Jan 2026". */
export function formatDate(iso: string): string {
  return threeLetterMonth(dateFormat.format(new Date(`${iso.slice(0, 10)}T12:00:00+05:30`)));
}

/** ISO date (YYYY-MM-DD, or a timestamp, whose time is ignored) to "12 Jan". */
export function formatShortDate(iso: string): string {
  return threeLetterMonth(shortDateFormat.format(new Date(`${iso.slice(0, 10)}T12:00:00+05:30`)));
}

/** Credits are hours; show halves and quarters without trailing zeros. */
export function hours(value: number): string {
  const text = Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0$/, "");
  return `${text} ${value === 1 ? "hour" : "hours"}`;
}

const DAY_MS = 86400000;

function utcDay(iso: string): number {
  const [year, month, day] = iso.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

/** ISO date plus a number of days, as an ISO date. Plain calendar arithmetic, no clock. */
export function addDays(iso: string, days: number): string {
  return new Date(utcDay(iso) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Whole days from one ISO date to another; negative when the second is earlier. */
export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((utcDay(toIso) - utcDay(fromIso)) / DAY_MS);
}

/** A number of days in words, e.g. "1 day", "12 days". */
export function dayCount(n: number): string {
  return `${n} ${n === 1 ? "day" : "days"}`;
}

/** A list as it is said: "a", "a and b", "a, b and c". */
export function listWords(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

// ---- Times, signs and counted words ----

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const LONG_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** The date part of "YYYY-MM-DDTHH:mm" (or a plain date). */
export function datePart(at: string): string {
  return at.slice(0, 10);
}

/** "2026-11-11T19:42" to "7:42 pm". A plain date has no time, so it gives "". */
export function formatTime(at: string): string {
  const match = /T(\d{2}):(\d{2})/.exec(at);
  if (!match) return "";
  const hour = Number(match[1]);
  const twelve = hour % 12 === 0 ? 12 : hour % 12;
  return `${twelve}:${match[2]} ${hour < 12 ? "am" : "pm"}`;
}

/** "11 Nov 2026 at 7:42 pm"; a plain date gives "11 Nov 2026". */
export function formatStamp(at: string): string {
  const time = formatTime(at);
  return time ? `${formatDate(datePart(at))} at ${time}` : formatDate(datePart(at));
}

/** "11 Nov, 7:42 pm"; a plain date gives "11 Nov". */
export function formatStampShort(at: string): string {
  const time = formatTime(at);
  return time ? `${formatShortDate(datePart(at))}, ${time}` : formatShortDate(datePart(at));
}

/** A whole percentage with a true minus sign: "19%", "−5%". */
export function percent(n: number): string {
  const rounded = Math.round(n);
  return `${rounded < 0 ? "−" : ""}${Math.abs(rounded)}%`;
}

/** Rupees with a true minus sign when below zero: "−₹6,64,000", "₹28,500". */
export function inrSigned(n: number): string {
  return n < 0 ? `−${inr(-n)}` : inr(n);
}

const COUNT_WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];

/** 0 to 10 as words ("no", "one", ... "ten"), larger numbers as digits. */
export function countWord(n: number, capital = false): string {
  const word = Number.isInteger(n) && n >= 0 && n <= 10 ? COUNT_WORDS[n] : String(n);
  return capital ? word.charAt(0).toUpperCase() + word.slice(1) : word;
}

function weekdayOf(iso: string): number {
  return new Date(utcDay(datePart(iso))).getUTCDay();
}

/** "2026-11-11" to "Wednesday 11 November". */
export function weekdayDate(iso: string): string {
  const [, month, day] = datePart(iso).split("-").map(Number);
  return `${WEEKDAYS[weekdayOf(iso)]} ${day} ${LONG_MONTHS[month - 1]}`;
}

/** "2026-11-13" to "Fri 13 Nov". */
export function shortWeekdayDate(iso: string): string {
  const [, month, day] = datePart(iso).split("-").map(Number);
  return `${WEEKDAYS[weekdayOf(iso)].slice(0, 3)} ${day} ${MONTHS[month - 1]}`;
}

/** Due words against the demo's day: "Due today", "Due tomorrow", "Due Fri 13 Nov" or "Overdue". */
export function dueWords(dueAt: string): string {
  const days = daysBetween(TODAY, datePart(dueAt));
  if (days < 0) return "Overdue";
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due ${shortWeekdayDate(dueAt)}`;
}
