"use client";

import { useEffect } from "react";

// Moves keyboard and screen-reader focus to a target after navigation, e.g. the
// problem panel on the review page. The target needs tabIndex={-1}.
//
// On a client-side navigation Next commits the new page before it re-inserts the route's
// <title>, so there can be a frame with no title. Focusing in that frame let a screen
// reader (and axe) meet a page with no name, so we wait for the title, up to ~0.5 s.
const MAX_FRAMES = 30;

export function FocusOnMount({ targetId, token }: { targetId: string; token?: string }) {
  useEffect(() => {
    const el = document.getElementById(targetId);
    if (!el) return;
    let frames = 0;
    // Wait at least a frame so the browser has painted, then focus without fighting the router's scroll.
    const tick = () => {
      if (document.title || ++frames >= MAX_FRAMES) el.focus({ preventScroll: false });
      else id = requestAnimationFrame(tick);
    };
    let id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [targetId, token]);
  return null;
}
