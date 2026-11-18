"use client";

import { useEffect, useState } from "react";

export type Identity = "forum" | "palestine";
export const IDENTITIES: Identity[] = ["forum", "palestine"];
const KEY = "wepal-identity";

/**
 * The Palestine identity is paused for now. Set to true to bring back the switcher
 * (header, menu, footer) and let visitors use the Palestine colours again.
 */
export const IDENTITY_SWITCH_ENABLED = false;

/** Inline script for <head>: applies the saved identity before first paint (no colour flash). */
export const identityBootScript = `(function(){try{var v=${IDENTITY_SWITCH_ENABLED ? `localStorage.getItem('${KEY}')` : "'forum'"};if(v!=='palestine'&&v!=='forum')v='forum';document.documentElement.setAttribute('data-identity',v);var l=document.querySelector('link[rel="icon"]');if(l)l.href='/brand/'+v+'/favicon.svg';}catch(e){document.documentElement.setAttribute('data-identity','forum');}})();`;

function apply(next: Identity) {
  const root = document.documentElement;
  root.classList.add("identity-switching");
  root.setAttribute("data-identity", next);
  document.querySelectorAll<HTMLLinkElement>('link[rel="icon"], link[rel="shortcut icon"]').forEach((l) => { l.href = `/brand/${next}/favicon.svg`; });
  try { window.localStorage.setItem(KEY, next); } catch { /* storage unavailable */ }
  window.setTimeout(() => root.classList.remove("identity-switching"), 600);
  window.dispatchEvent(new CustomEvent("wepal-identity", { detail: next }));
}

/** Current identity + setter, kept in sync across every component on the page. */
export function useIdentity() {
  const [identity, setIdentity] = useState<Identity>("forum");
  useEffect(() => {
    const read = () => setIdentity(document.documentElement.getAttribute("data-identity") === "palestine" ? "palestine" : "forum");
    const id = requestAnimationFrame(read);
    const onChange = (e: Event) => setIdentity((e as CustomEvent<Identity>).detail);
    window.addEventListener("wepal-identity", onChange);
    return () => { cancelAnimationFrame(id); window.removeEventListener("wepal-identity", onChange); };
  }, []);
  return [identity, apply] as const;
}

/**
 * WePal wordmark for both identities. Both images are rendered and CSS shows the active one,
 * so the correct logo appears on first paint without waiting for React.
 * variant: "primary" for light backgrounds, "reverse" for dark backgrounds.
 */
export function Logo({ variant = "primary", className = "" }: { variant?: "primary" | "reverse"; className?: string }) {
  return (
    <span className={`wp-logo ${className}`} role="img" aria-label="WePal">
      {IDENTITIES.map((id) => <img key={id} className={`is-${id}`} src={`/brand/${id}/wepal-logo-${variant}.svg`} alt="" aria-hidden="true" />)}
    </span>
  );
}
