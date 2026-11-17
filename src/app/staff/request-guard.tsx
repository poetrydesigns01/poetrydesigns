/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */

// The material request pages, for the site engineer and for procurement, open any number in
// the request form, "MR-2026-0131", including numbers raised in this tab after the seed
// ones. Anything else in the address is a missing page, not an empty request. Each page
// checks its own address, and its layout titles it from the same check. The check lives in
// the page, not the layout: a missing page raised by the layout would leave the layout's
// address-based title as the route's only request-time part, which Next's instant-navigation
// check reports as blocking.

const REQUEST_NO = /^MR-\d{4}-\d{4}$/;

/** The request number in an address segment, or null when the segment holds something else. */
export function requestNumberOf(segment: string): string | null {
  let no: string;
  try {
    no = decodeURIComponent(segment);
  } catch {
    return null;
  }
  return REQUEST_NO.test(no) ? no : null;
}
