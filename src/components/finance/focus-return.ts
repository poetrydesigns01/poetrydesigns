// Where keyboard focus goes when the control that holds it is about to leave the page: a
// panel closing on its own record, or a "Mark seen" button whose row moves on. Without this
// the browser drops focus to the page itself and a keyboard user starts again from the top.

/**
 * Remembers the control and its place now, and returns `restore`, to be called once the
 * change that removes it has been made. `restore` waits for the redraw, then puts focus
 * back on the control if it is still there; else on the same row wherever it now sits (its
 * action, or the row itself); else on its register's heading. It leaves focus alone when
 * the person has already moved it somewhere else.
 */
export function focusReturn(control: HTMLElement | null, rowId?: string | null): () => void {
  if (!control) return () => {};
  const page = control.closest<HTMLElement>("main") ?? control.ownerDocument.body;
  const section = control.closest<HTMLElement>("section");
  const row = rowId ?? control.closest<HTMLElement>("[data-row-id]")?.dataset.rowId ?? null;
  return () => {
    window.setTimeout(() => {
      const active = control.ownerDocument.activeElement;
      const lost = active === null || active === control.ownerDocument.body || !active.isConnected || active === control;
      if (!lost) return;
      if (control.isConnected) {
        control.focus();
        return;
      }
      const item = row ? page.querySelector<HTMLElement>(`[data-row-id="${CSS.escape(row)}"]`) : null;
      if (item) {
        const action = item.querySelector<HTMLElement>(".reg-action a[href], .reg-action button, .reg-link");
        focusQuietly(action ?? item);
        return;
      }
      const heading = section?.isConnected ? section.querySelector<HTMLElement>("h2") : null;
      if (heading) focusQuietly(heading);
    }, 0);
  };
}

/** Focuses an element that is not a control by itself: it can take focus, but Tab passes it by. */
function focusQuietly(element: HTMLElement) {
  if (element.tabIndex < 0 && !element.hasAttribute("tabindex")) element.tabIndex = -1;
  element.focus();
}
