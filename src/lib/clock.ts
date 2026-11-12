import { TODAY } from "./demo-data";

// The only place the demo reads the clock. The day is always TODAY so every screen tells
// the same story; only the time of day is real, so stamps read like the moment they were made.

const timeFormat = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "Asia/Kolkata",
});

/** "2026-11-11T19:42": TODAY's date with the clock's time in Bengaluru. Call only in handlers and timers. */
export function stampNow(): string {
  return `${TODAY}T${timeFormat.format(new Date())}`;
}
