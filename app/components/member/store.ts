"use client";

// Demo interaction state for the members area: reactions, comments, saved posts, joined groups,
// read notifications, sent messages and new posts. Kept in localStorage so it survives moving
// between pages (each link is a full page load). Falls back to memory when storage is blocked.
import { useSyncExternalStore } from "react";

export type Reaction = "like" | "love" | "idea" | "agree";
export type Comment = { id: string; author: string; text: string; time: number; replyTo?: string };
export type Att = { name: string; size: number; type: string; preview?: string };
export type ChatMsg = { id?: string; from: "me" | string; text: string; time: number; attachments?: Att[]; replyTo?: { who: string; text: string }; reactions?: Record<string, string[]> };
export type TaskMeta = { owner?: string; due?: string; desc?: string; comments?: { id: string; from: string; text: string; time: number }[] };
export type Proposal = { id: string; title: string; summary: string; track: "research" | "initiative" | "digital"; team: string[]; due?: string; time: number };
export type NewTask = { id: string; ws: string; title: string; status: "todo" | "doing" | "done"; time: number };
export type NewPost = { id: string; group: string; text: string; time: number; kind: "post" | "question"; attachments?: Att[] };

type State = {
  reactions: Record<string, Reaction | undefined>;
  comments: Record<string, Comment[]>;
  saved: Record<string, boolean>;
  joined: Record<string, boolean>;
  read: Record<string, boolean>;
  tasks: Record<string, boolean>;
  messages: Record<string, ChatMsg[]>;
  newTasks: NewTask[];
  taskStatus: Record<string, "todo" | "doing" | "done">;
  files: Record<string, (Att & { by: string; time: number })[]>;
  msgReacts: Record<string, string>;
  events: { id: string; who: string; text: string; where: string; href: string; time: number }[];
  taskMeta: Record<string, TaskMeta>;
  pins: Record<string, { key: string; who: string; text: string }>;
  muted: Record<string, boolean>;
  proposals: Proposal[];
  postEdits: Record<string, string>;
  hiddenPosts: Record<string, boolean>;
  pinnedPosts: Record<string, string>;
  reports: Record<string, string>;
  onboarded?: boolean;
  interests: string[];
  posts: NewPost[];
  answered: Record<string, boolean>;
  votes: Record<string, string>;
  myAvatar?: number;
};

const KEY = "wepal-demo-v1";
const EMPTY: State = { reactions: {}, comments: {}, saved: {}, joined: {}, read: {}, tasks: {}, messages: {}, posts: [], answered: {}, votes: {}, newTasks: [], taskStatus: {}, files: {}, msgReacts: {}, events: [], taskMeta: {}, pins: {}, muted: {}, proposals: [], postEdits: {}, hiddenPosts: {}, pinnedPosts: {}, reports: {}, interests: [] };
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

/** Read picked files into attachments. Images get a small preview (max 480px) so they show in chats. */
export async function readFiles(list: FileList | File[]): Promise<Att[]> {
  const files = Array.from(list).slice(0, 6);
  return Promise.all(files.map(async (f) => {
    const att: Att = { name: f.name, size: f.size, type: f.type || "application/octet-stream" };
    if (!f.type.startsWith("image/")) return att;
    try {
      const url = URL.createObjectURL(f);
      const img = await new Promise<HTMLImageElement>((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = bad; i.src = url; });
      const scale = Math.min(1, 480 / Math.max(img.width, img.height));
      const c = document.createElement("canvas"); c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      att.preview = c.toDataURL("image/jpeg", 0.72);
    } catch { /* unreadable image: keep it as a file */ }
    return att;
  }));
}

/** Add a live notification (e.g. a teammate replied). Newest first, capped. */
export function notify(e: { who: string; text: string; where: string; href: string }) {
  update((x) => ({ ...x, events: [{ id: uid(), time: Date.now(), ...e }, ...(x.events ?? [])].slice(0, 30) }));
}

/** Remember that this browser is signed in to the members area (used by the public site). */
export const MEMBER_FLAG = "wepal-member";

/** Current time for event handlers (keeps Date.now out of render-analysed code paths). */
export const now = () => Date.now();
