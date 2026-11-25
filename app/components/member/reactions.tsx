// WePal reactions: each one is the speech bubble from the logo, in a brand colour, with a white sign inside.

export type ReactionKey = "like" | "love" | "idea" | "agree" | "support" | "inspire";

export const REACTION_SET: { key: ReactionKey; color: string; label: { ar: string; en: string } }[] = [
  { key: "like", color: "#0B79CD", label: { ar: "أعجبني", en: "Like" } },
  { key: "love", color: "#E8707F", label: { ar: "أحببته", en: "Love" } },
  { key: "idea", color: "#F2B12F", label: { ar: "فكرة مفيدة", en: "Insightful" } },
  { key: "agree", color: "#2BB39A", label: { ar: "أتّفق", en: "Agree" } },
  { key: "support", color: "#3B5BC4", label: { ar: "أدعمك", en: "Support" } },
  { key: "inspire", color: "#101942", label: { ar: "صوتك وصل", en: "Heard you" } },
];

// The bubble: round body, soft tail at the lower corner (like the P in the logo).
const BUBBLE = "M20 2.5c9.7 0 17.5 7.5 17.5 16.8S29.7 36 20 36c-2.4 0-4.7-.4-6.8-1.3l-7.4 3.1c-1.1.5-2.2-.6-1.8-1.7l2-5.7C3.9 27.5 2.5 23.5 2.5 19.3 2.5 10 10.3 2.5 20 2.5Z";

function Sign({ k }: { k: ReactionKey }) {
  const w = { fill: "none", stroke: "#fff", strokeWidth: 2.4, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (k) {
    case "like":
      return <g transform="translate(10.6 9.2) scale(.8)"><path d="M7 10v12" {...w} /><path d="M15 5.9 14 10h5.8a2 2 0 0 1 1.9 2.6l-2.3 8a2 2 0 0 1-1.9 1.4H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.8a2 2 0 0 0 1.8-1.1L12 2a3.1 3.1 0 0 1 3 3.9Z" fill="#fff" stroke="#fff" strokeWidth={1.6} strokeLinejoin="round" /></g>;
    case "love":
      return <path d="M20 28.2s-8.4-4.9-8.4-10.6c0-2.6 2-4.6 4.5-4.6 1.6 0 3 .8 3.9 2.1.9-1.3 2.3-2.1 3.9-2.1 2.5 0 4.5 2 4.5 4.6 0 5.7-8.4 10.6-8.4 10.6Z" fill="#fff" />;
    case "idea":
      return <g {...w}><path d="M16.3 23.2c-.3-1.6-1.1-2.6-2-3.6a6.6 6.6 0 1 1 11.4 0c-.9 1-1.7 2-2 3.6" /><path d="M16.6 26.4h6.8" /><path d="M18 29.3h4" /></g>;
    case "agree":
      return <path d="M13 19.6l4.6 4.6 9.4-9.6" {...w} strokeWidth={3} />;
    case "support":
      // An olive sprig: two leaves on a stem, with one olive.
      return <g><path d="M12.5 27.5c4-2.6 9-7.4 14.5-13.8" {...w} strokeWidth={1.8} /><path d="M17.8 21.4c-3.4.2-5.6-1.6-6.4-4.6 3.4-.3 5.6 1.5 6.4 4.6Z" fill="#fff" /><path d="M22.6 16.2c.4-3.3 2.5-5.4 5.7-5.9.1 3.3-2 5.5-5.7 5.9Z" fill="#fff" /><path d="M22.4 22.3c2.9 1.6 5.6 1 7.5-1.4-2.9-1.6-5.6-1-7.5 1.4Z" fill="#fff" /><circle cx="15.6" cy="25.2" r="2.1" fill="#F7C24C" /></g>;
    case "inspire":
      // The logo's three dots: a voice on its way.
      return <g><circle cx="13.6" cy="19.3" r="2.9" fill="#4DC7B1" /><circle cx="20" cy="19.3" r="2.9" fill="#fff" /><circle cx="26.4" cy="19.3" r="2.9" fill="#F7C24C" /></g>;
  }
}

export function ReactionIcon({ k, size = 22, className = "" }: { k: ReactionKey; size?: number; className?: string }) {
  const r = REACTION_SET.find((x) => x.key === k)!;
  return (
    <svg className={`wp-react ${className}`} width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <path d={BUBBLE} fill={r.color} />
      <path d={BUBBLE} fill="url(#wpReactShine)" />
      <Sign k={k} />
    </svg>
  );
}

/** Shared gradient used by every reaction icon (rendered once per page). */
export function ReactionDefs() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
      <defs><linearGradient id="wpReactShine" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".28" /><stop offset=".55" stopColor="#fff" stopOpacity="0" /></linearGradient></defs>
    </svg>
  );
}
