// Language-switch effect: after the page re-renders in the new language, every visible piece of text
// briefly shuffles through random Arabic and Latin letters and settles into its new words.
// It only touches text nodes on screen, restores React's exact text at the end, and stops early on any
// node React changes meanwhile. Skipped when the visitor prefers reduced motion.

const AR = "ابتثجحخدذرزسشصضطظعغفقكلمنهوي";
const EN = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const POOL = AR + EN;
const DURATION = 700;
const MAX_NODES = 600;
const SKIP = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "INPUT", "SELECT", "OPTION", "CODE", "KBD", "svg"]);

const rand = () => POOL[(Math.random() * POOL.length) | 0];

type Item = { node: Text; final: string; reveal: number[]; written: string };

function visibleTextNodes(root: Element): Text[] {
  const vh = window.innerHeight, vw = window.innerWidth;
  const out: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(n) {
      const el = n.parentElement;
      if (!el || !n.nodeValue || !n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      if (SKIP.has(el.tagName) || el.closest("[data-no-scramble], [aria-hidden='true'] svg")) return NodeFilter.FILTER_REJECT;
      const r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh || r.right < 0 || r.left > vw || r.width === 0) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  while (walker.nextNode() && out.length < MAX_NODES) out.push(walker.currentNode as Text);
  return out;
}

export function scrambleText(root: Element | null = document.querySelector("main")) {
  if (!root || typeof window === "undefined") return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

  const items: Item[] = visibleTextNodes(root).map((node) => {
    const final = node.nodeValue ?? "";
    // Each character settles at its own moment: roughly in reading order, with random jitter.
    const reveal = [...final].map((_, i, arr) => Math.min(1, (i / Math.max(arr.length, 1)) * 0.55 + Math.random() * 0.45));
    return { node, final, reveal, written: final };
  });
  if (!items.length) return;

  const start = performance.now();
  let last = 0;
  const frame = (now: number) => {
    const t = Math.min(1, (now - start) / DURATION);
    // Re-roll the random letters about every 45ms so the shuffle reads clearly without flicker.
    const reroll = now - last > 45;
    if (reroll) last = now;
    for (const it of items) {
      if (!it.node.isConnected || it.node.nodeValue !== it.written) continue; // React took over this node
      if (t >= 1) { it.node.nodeValue = it.final; it.written = it.final; continue; }
      if (!reroll) continue;
      const chars = [...it.final];
      const next = chars.map((c, i) => (/\s|[0-9.,:;!?،؛؟()«»"'\-–—/]/.test(c) || t >= it.reveal[i] ? c : rand())).join("");
      it.node.nodeValue = next; it.written = next;
    }
    if (t < 1) requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
