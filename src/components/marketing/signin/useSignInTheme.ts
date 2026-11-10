"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { DEFAULT_THEME, isThemeId, THEME_STORAGE_KEY, type ThemeId } from "./themes";

const listeners = new Set<() => void>();
// Fallback for browsers where localStorage throws, so the picker still works for the session.
let memory: ThemeId | null = null;

function read(): ThemeId {
  if (memory) return memory;
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (isThemeId(stored)) return stored;
  } catch {
    // storage blocked
  }
  return DEFAULT_THEME;
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  const onStorage = (e: StorageEvent) => {
    if (e.key === THEME_STORAGE_KEY || e.key === null) {
      memory = null;
      onChange();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function setSignInTheme(id: ThemeId) {
  memory = id;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, id);
  } catch {
    // storage blocked
  }
  listeners.forEach((l) => l());
}

/** The chosen theme. "pine" on the server and during hydration, the stored choice after. */
export function useSignInTheme(): ThemeId {
  return useSyncExternalStore(subscribe, read, () => DEFAULT_THEME);
}

/**
 * False until the stored theme has been applied and painted once. The screen stays
 * transparent until then, so a reload never flashes the default theme.
 */
export function useThemeReady(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return ready;
}
