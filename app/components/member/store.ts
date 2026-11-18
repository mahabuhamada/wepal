"use client";

// Demo interaction state for the members area: reactions, comments, saved posts, joined groups,
// read notifications, sent messages and new posts. Kept in localStorage so it survives moving
// between pages (each link is a full page load). Falls back to memory when storage is blocked.
import { useSyncExternalStore } from "react";

export type Reaction = "like" | "love" | "idea" | "agree";
export type Comment = { id: string; author: string; text: string; time: number };
export type NewPost = { id: string; group: string; text: string; time: number; kind: "post" | "question" };

type State = {
  reactions: Record<string, Reaction | undefined>;
  comments: Record<string, Comment[]>;
  saved: Record<string, boolean>;
  joined: Record<string, boolean>;
  read: Record<string, boolean>;
  tasks: Record<string, boolean>;
  messages: Record<string, { from: "me" | string; text: string; time: number }[]>;
  posts: NewPost[];
  answered: Record<string, boolean>;
  votes: Record<string, string>;
};

const KEY = "wepal-demo-v1";
const EMPTY: State = { reactions: {}, comments: {}, saved: {}, joined: {}, read: {}, tasks: {}, messages: {}, posts: [], answered: {}, votes: {} };
let state: State = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try { const raw = window.localStorage.getItem(KEY); if (raw) state = { ...EMPTY, ...JSON.parse(raw) }; } catch { /* storage blocked */ }
}
function save() {
  try { window.localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage blocked: memory only */ }
}

export function update(fn: (s: State) => State) {
  load();
  state = fn(state);
  save();
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => { listeners.add(l); return () => listeners.delete(l); };
const snapshot = () => { load(); return state; };
const serverSnapshot = () => EMPTY;

/** Read the demo state; the server and first paint see the empty state, then the saved one. */
export function useStore() {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}

export const uid = () => Math.random().toString(36).slice(2, 9);

/** Toasts: short confirmations at the bottom of the screen. */
type Toast = { id: string; text: string };
let toasts: Toast[] = [];
const toastListeners = new Set<() => void>();
export function toast(text: string) {
  const t = { id: uid(), text };
  toasts = [...toasts, t];
  toastListeners.forEach((l) => l());
  window.setTimeout(() => { toasts = toasts.filter((x) => x.id !== t.id); toastListeners.forEach((l) => l()); }, 2600);
}
export function useToasts() {
  return useSyncExternalStore((l) => { toastListeners.add(l); return () => toastListeners.delete(l); }, () => toasts, () => toasts);
}

/** "5 minutes ago" style time for things created in this demo. */
export function ago(t: number, rtl: boolean) {
  const m = Math.max(0, Math.round((Date.now() - t) / 60000));
  if (m < 1) return rtl ? "الآن" : "Now";
  if (m < 60) return rtl ? `قبل ${m} د` : `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return rtl ? `قبل ${h} س` : `${h}h ago`;
  return rtl ? `قبل ${Math.round(h / 24)} يوم` : `${Math.round(h / 24)}d ago`;
}
