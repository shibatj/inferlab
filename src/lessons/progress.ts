"use client";

import { useMemo, useSyncExternalStore } from "react";

const KEY = "inferlab:progress:v1";
/** Same-tab notification; the `storage` event only fires in other tabs. */
const EVENT = "inferlab-progress";

function readRaw(): string {
  try {
    return localStorage.getItem(KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

export function markCorrect(quizId: string) {
  const done = new Set<string>(JSON.parse(readRaw()));
  if (done.has(quizId)) return;
  done.add(quizId);
  try {
    localStorage.setItem(KEY, JSON.stringify([...done]));
  } catch {
    // Progress is a convenience; ignore storage failures.
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** Ids of quizzes answered correctly in this browser. Empty during server rendering. */
export function useProgress(): Set<string> {
  // The snapshot is the raw string so React can compare it cheaply between renders.
  const raw = useSyncExternalStore(subscribe, readRaw, () => "[]");
  return useMemo(() => new Set<string>(JSON.parse(raw)), [raw]);
}
