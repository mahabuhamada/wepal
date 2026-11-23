"use client";

// Demo state for the admin panel: every section keeps its records in this browser (localStorage),
// so a tester can add, edit, approve or delete and see the result after reloading.
// "Reset demo data" puts everything back. Replaced by the platform API after installation.

import { useSyncExternalStore } from "react";
import type { T } from "../content";

const PREFIX = "wepal-admin-demo-v1:";
const cache = new Map<string, unknown>();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

function read<V>(key: string, seed: V): V {
  if (cache.has(key)) return cache.get(key) as V;
  let v = seed;
  try { const raw = window.localStorage.getItem(PREFIX + key); if (raw) v = JSON.parse(raw) as V; } catch { /* storage blocked */ }
  cache.set(key, v);
  return v;
}
export function writeState<V>(key: string, value: V) {
  cache.set(key, value);
  try { window.localStorage.setItem(PREFIX + key, JSON.stringify(value)); } catch { /* storage full or blocked */ }
  emit();
}
export function useAdminState<V>(key: string, seed: V): [V, (next: V | ((v: V) => V)) => void] {
  const v = useSyncExternalStore(subscribe, () => read(key, seed), () => seed);
  const set = (next: V | ((v: V) => V)) => writeState(key, typeof next === "function" ? (next as (v: V) => V)(read(key, seed)) : next);
  return [v, set];
}
export function readState<V>(key: string, seed: V): V { return read(key, seed); }

/** Clear every section's demo changes. */
export function resetDemo() {
  try {
    Object.keys(window.localStorage).filter((k) => k.startsWith(PREFIX)).forEach((k) => window.localStorage.removeItem(k));
  } catch { /* storage blocked */ }
  cache.clear(); emit();
}

export const uid = () => Math.random().toString(36).slice(2, 9);
export const nowIso = () => new Date().toISOString();

/* ── Audit log: every action the tester takes is recorded (who, what, where, when) ── */
export type AuditEntry = { id: string; at: string; who: string; cat: "content" | "moderation" | "members" | "settings" | "access"; text: T; href?: string };
const AUDIT_KEY = "audit";
export function logAction(cat: AuditEntry["cat"], text: T, href?: string) {
  const list = read<AuditEntry[]>(AUDIT_KEY, []);
  writeState(AUDIT_KEY, [{ id: uid(), at: nowIso(), who: "me", cat, text, href }, ...list].slice(0, 300));
}
export const useAudit = () => useAdminState<AuditEntry[]>(AUDIT_KEY, [])[0];

/* ── Toasts ── */
type Toast = { id: string; text: string; undo?: () => void };
let toasts: Toast[] = [];
const tl = new Set<() => void>();
export function toast(text: string, undo?: () => void) {
  const t = { id: uid(), text, undo };
  toasts = [...toasts, t]; tl.forEach((l) => l());
  setTimeout(() => { toasts = toasts.filter((x) => x.id !== t.id); tl.forEach((l) => l()); }, undo ? 6000 : 3200);
}
export function dismissToast(id: string) { toasts = toasts.filter((x) => x.id !== id); tl.forEach((l) => l()); }
export const useToasts = () => useSyncExternalStore((l) => { tl.add(l); return () => { tl.delete(l); }; }, () => toasts, () => toasts);

/** Shrink an image file to a small data URL so it fits in browser storage. */
export function readImage(file: File, max = 720): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = () => reject(r.error);
    r.onload = () => {
      const img = new Image();
      img.onload = () => {
        const s = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement("canvas"); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext("2d")?.drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL("image/jpeg", 0.8));
      };
      img.onerror = () => reject(new Error("image"));
      img.src = String(r.result);
    };
    r.readAsDataURL(file);
  });
}
