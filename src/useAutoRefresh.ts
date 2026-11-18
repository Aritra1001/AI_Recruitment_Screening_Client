import { useEffect, useRef } from "react";
import { APPROVALS_CHANGED } from "./api/approvals";
import { ApiError } from "./api/client";

const POLL_MS = 30_000;
// Switching tabs fires both "visibilitychange" and "focus"; refresh once.
const MIN_GAP_MS = 2_000;

/**
 * Re-runs `refresh` so changes made by someone else (usually another admin approving a
 * request) show up without a manual reload: when the tab or window comes back into view,
 * every 30 seconds while it's visible, and after a decision is made in this tab.
 * Does nothing while `active` is false.
 */
export function useAutoRefresh(refresh: () => void, active = true) {
  const latest = useRef(refresh);
  useEffect(() => {
    latest.current = refresh;
  });

  useEffect(() => {
    if (!active) return;
    let lastRun = Date.now();
    const now = () => {
      lastRun = Date.now();
      latest.current();
    };
    const run = () => {
      if (document.visibilityState === "visible" && Date.now() - lastRun >= MIN_GAP_MS) now();
    };
    const timer = setInterval(run, POLL_MS);
    document.addEventListener("visibilitychange", run);
    window.addEventListener("focus", run);
    window.addEventListener(APPROVALS_CHANGED, now);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", run);
      window.removeEventListener("focus", run);
      window.removeEventListener(APPROVALS_CHANGED, now);
    };
  }, [active]);
}

/**
 * Error handler for a background refresh: if the item is gone (e.g. its deletion was just
 * approved) show that, and ignore anything else, such as a network blip.
 */
export function showIfGone(setError: (message: string) => void) {
  return (e: unknown) => {
    if (e instanceof ApiError && e.status === 404) setError(e.message);
  };
}
