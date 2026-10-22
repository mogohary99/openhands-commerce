"use client";

import { useEffect } from "react";

// Moves keyboard and screen-reader focus to a target after navigation, e.g. the
// problem panel on the review page. The target needs tabIndex={-1}.
export function FocusOnMount({ targetId, token }: { targetId: string; token?: string }) {
  useEffect(() => {
    const el = document.getElementById(targetId);
    if (!el) return;
    // Wait a frame so the browser has painted, then focus without fighting the router's scroll.
    const id = requestAnimationFrame(() => el.focus({ preventScroll: false }));
    return () => cancelAnimationFrame(id);
  }, [targetId, token]);
  return null;
}
