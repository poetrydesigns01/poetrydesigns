/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
import { TODAY } from "@/lib/demo-data";
import { formatDate, formatShortDate } from "@/lib/format";

/** "21 Jan" this year, "21 Jan 2027" any other year, so a stage list that spans years reads in order. */
export function planDate(iso: string): string {
  return iso.slice(0, 4) === TODAY.slice(0, 4) ? formatShortDate(iso) : formatDate(iso);
}
