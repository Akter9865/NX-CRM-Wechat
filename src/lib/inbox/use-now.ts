"use client";

import { useSyncExternalStore } from "react";

/**
 * A shared, coarse wall clock (30s resolution) for time-derived UI such as
 * the 24h-window badge. One interval for the whole page, and only while
 * something is subscribed — instead of each component running its own
 * timer or calling `Date.now()` during render.
 */
const TICK_MS = 30_000;

let now = Date.now();
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;

function emit() {
  now = Date.now();
  for (const l of listeners) l();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!timer) {
    now = Date.now();
    timer = setInterval(emit, TICK_MS);
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", emit);
    }
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", emit);
      }
    }
  };
}

const getSnapshot = () => now;

export function useNow(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
