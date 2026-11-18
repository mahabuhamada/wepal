// Gentle language switch: the page content fades out briefly, the language (and text direction)
// changes while it is hidden, then the new text fades in with a soft blur that clears.
// No letters move or change on screen. Skipped when the visitor prefers reduced motion.

const OUT_MS = 160;
const IN_MS = 420;

export function switchLanguageGently(apply: () => void) {
  if (typeof window === "undefined") { apply(); return; }
  const root = document.documentElement;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { apply(); return; }
  root.classList.remove("lang-in");
  root.classList.add("lang-out");
  window.setTimeout(() => {
    apply();
    // Two frames: let React paint the new language before fading it in.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      root.classList.remove("lang-out");
      root.classList.add("lang-in");
      window.setTimeout(() => root.classList.remove("lang-in"), IN_MS);
    }));
  }, OUT_MS);
}
