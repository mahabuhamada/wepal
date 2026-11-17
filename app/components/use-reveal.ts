"use client";

import { useEffect } from "react";

/** Fades matching elements in as they scroll into view. Content stays visible if JS or IntersectionObserver is unavailable. */
export function useReveal(selector: string, deps: unknown[] = []) {
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const root = document.documentElement;
    root.classList.add("reveal-ready");
    const targets = Array.from(document.querySelectorAll<HTMLElement>(selector));
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { entry.target.classList.add("in"); observer.unobserve(entry.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    targets.forEach((el) => { el.classList.add("fx"); observer.observe(el); });
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
