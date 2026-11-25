// WePal reactions: a round badge in a brand colour with a clear white sign drawn for the platform.

export type ReactionKey = "like" | "love" | "idea" | "agree" | "support" | "inspire";

export const REACTION_SET: { key: ReactionKey; color: string; label: { ar: string; en: string } }[] = [
  { key: "like", color: "#0B79CD", label: { ar: "أعجبني", en: "Like" } },
  { key: "love", color: "#E8707F", label: { ar: "أحببته", en: "Love" } },
  { key: "idea", color: "#F2B12F", label: { ar: "فكرة مفيدة", en: "Insightful" } },
  { key: "agree", color: "#2BB39A", label: { ar: "أتّفق", en: "Agree" } },
  { key: "support", color: "#3B5BC4", label: { ar: "أدعمك", en: "Support" } },
  { key: "inspire", color: "#101942", label: { ar: "صوتك وصل", en: "Heard you" } },
];

function Sign({ k }: { k: ReactionKey }) {
  // Filled glyphs drawn on a 24-unit grid, centred in the 40-unit circle.
  const g = (d: string, scale = .68) => <path d={d} fill="#fff" transform={`translate(${20 - 12 * scale} ${20 - 12 * scale}) scale(${scale})`} />;
  switch (k) {
    case "like":
      return g("M2 20h3V10H2v10Zm19.5-8.6c0-1-.8-1.9-1.9-1.9h-5.7l.9-4.2v-.3c0-.4-.2-.8-.4-1L13.4 3 7.4 9c-.3.3-.5.8-.5 1.3V18c0 1 .9 1.9 1.9 1.9h8.3c.8 0 1.4-.5 1.7-1.1l2.8-6.5c.1-.2.1-.4.1-.6v-.3Z", .78);
    case "love":
      return g("M12 20.6 10.7 19.4C6 15.1 2.9 12.3 2.9 8.8 2.9 6 5.1 3.8 7.9 3.8c1.6 0 3.1.7 4.1 1.9 1-1.2 2.5-1.9 4.1-1.9 2.8 0 5 2.2 5 5 0 3.5-3.1 6.3-7.8 10.6L12 20.6Z", .7);
    case "idea":
      return <g><path d="M20 10.2a6.6 6.6 0 0 0-3.9 11.9v2.4c0 .6.5 1.1 1.1 1.1h5.6c.6 0 1.1-.5 1.1-1.1v-2.4A6.6 6.6 0 0 0 20 10.2Z" fill="#fff" /><rect x="17.1" y="26.6" width="5.8" height="2.4" rx="1.2" fill="#fff" /><path d="M18.4 15.4c.5-.6 1.1-.9 1.9-1" stroke="#F2B12F" strokeWidth="1.5" strokeLinecap="round" fill="none" /></g>;
    case "agree":
      return <path d="M13.4 20.3l4.4 4.4 8.8-9.2" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />;
    case "support": {
      // An olive sprig: a gentle stem, alternating leaves and one olive.
      const leaf = (x: number, y: number, r: number) => <ellipse cx={x} cy={y} rx="3.5" ry="1.6" transform={`rotate(${r} ${x} ${y})`} fill="#fff" />;
      return <g><path d="M12.6 28.6Q19.6 21.6 28.4 12.2" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />{leaf(14.8, 21.4, -88)}{leaf(22.6, 22.6, -6)}{leaf(20.6, 15, -88)}{leaf(28.4, 16.2, -6)}{leaf(29.2, 10.9, -47)}<circle cx="18" cy="26.6" r="2.2" fill="#F7C24C" /></g>;
    }
    case "inspire":
      // The logo's three dots: a voice on its way.
      return <g><circle cx="13.4" cy="20" r="3" fill="#4DC7B1" /><circle cx="20" cy="20" r="3" fill="#fff" /><circle cx="26.6" cy="20" r="3" fill="#F7C24C" /></g>;
  }
}

export function ReactionIcon({ k, size = 22, className = "" }: { k: ReactionKey; size?: number; className?: string }) {
  const r = REACTION_SET.find((x) => x.key === k)!;
  return (
    <svg className={`wp-react ${className}`} width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <circle cx="20" cy="20" r="19" fill={r.color} />
      <circle cx="20" cy="20" r="19" fill="url(#wpReactShine)" />
      <circle cx="20" cy="20" r="18.4" fill="none" stroke="#000" strokeOpacity=".08" strokeWidth="1.2" />
      <Sign k={k} />
    </svg>
  );
}

/** Shared gradient used by every reaction icon (rendered once per page). */
export function ReactionDefs() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
      <defs><linearGradient id="wpReactShine" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".26" /><stop offset=".6" stopColor="#fff" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity=".06" /></linearGradient></defs>
    </svg>
  );
}
