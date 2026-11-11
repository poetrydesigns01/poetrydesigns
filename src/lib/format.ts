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

/** ISO date (YYYY-MM-DD) to "12 Jan 2026". */
export function formatDate(iso: string): string {
  return dateFormat.format(new Date(`${iso}T12:00:00+05:30`));
}

/** ISO date (YYYY-MM-DD) to "12 Jan". */
export function formatShortDate(iso: string): string {
  return shortDateFormat.format(new Date(`${iso}T12:00:00+05:30`));
}

/** Credits are hours; show halves and quarters without trailing zeros. */
export function hours(value: number): string {
  const text = Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0$/, "");
  return `${text} ${value === 1 ? "hour" : "hours"}`;
}
