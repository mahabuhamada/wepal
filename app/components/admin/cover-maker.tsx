"use client";

// WePal library cover maker: one A4 cover per item, in the platform's identity.
// A unified-colour image (or the type's colour and icon), a spine coloured by type, the type tab,
// the title, the date and the series, with the WePal logo. Drag the image to move it, scroll to zoom.

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ImagePlus, RotateCcw, Save, Trash2, X } from "lucide-react";
import { useAdmin } from "./shell";

const W = 1240, H = 1754, SP = 34, PH = 1000;
const C = "M22 12a10 10 0 1 1-20 0a10 10 0 1 1 20 0";

export type CoverType = { id: string; ar: string; en: string; c: string; on: string; ic: string[] };
export const COVER_TYPES: CoverType[] = [
  { id: "paper", ar: "ورقة بحثية", en: "Research paper", c: "#0B79CD", on: "#fff", ic: ["M21 21l-4.3-4.3", "M19 11a8 8 0 1 1-16 0a8 8 0 1 1 16 0", "M8 11h6", "M11 8v6"] },
  { id: "analysis", ar: "تحليل", en: "Analysis", c: "#3b5bc4", on: "#fff", ic: ["M3 3v18h18", "M7 14l4-4 4 4 5-6"] },
  { id: "report", ar: "تقرير", en: "Report", c: "#4DC7B1", on: "#101942", ic: ["M3 3v18h18", "M18 17V9", "M13 17V5", "M8 17v-3"] },
  { id: "factsheet", ar: "ورقة حقائق", en: "Fact sheet", c: "#6f93e0", on: "#101942", ic: ["M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z", "M14 2v4a2 2 0 0 0 2 2h4", "M9 15l2 2 4-4"] },
  { id: "guide", ar: "دليل", en: "Guide", c: "#2fa58f", on: "#fff", ic: [C, "m16.24 7.76-1.804 5.411a2 2 0 0 1-1.265 1.265L7.76 16.24l1.804-5.411a2 2 0 0 1 1.265-1.265z"] },
  { id: "book", ar: "كتاب", en: "Book", c: "#F7C24C", on: "#101942", ic: ["M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"] },
  { id: "video", ar: "فيديو", en: "Video", c: "#e9a93a", on: "#101942", ic: [C, "M10 8l6 4-6 4Z"] },
  { id: "podcast", ar: "بودكاست", en: "Podcast", c: "#0a5fa3", on: "#fff", ic: ["M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z", "M19 10v2a7 7 0 0 1-14 0v-2", "M12 19v3"] },
  { id: "gallery", ar: "معرض صور", en: "Gallery", c: "#7fdccb", on: "#101942", ic: ["M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z", "M3 16l5-5 5 5", "M14 14l2-2 5 5", "M15.5 8.5h.01"] },
  { id: "document", ar: "وثيقة", en: "Document", c: "#9aa6c2", on: "#101942", ic: ["M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z", "M14 2v4a2 2 0 0 0 2 2h4", "M16 13H8", "M16 17H8"] },
];
const TBY = Object.fromEntries(COVER_TYPES.map((t) => [t.id, t]));

type Cover = { type: string; title: string; date: string; series: string; treat: "duo" | "soft" | "orig"; panel: "navy" | "white"; img: HTMLImageElement | null; z: number; ox: number; oy: number };
const F = (w: number, s: number) => `${w} ${s}px Rubik, Nunito, "Segoe UI", sans-serif`;
const isAr = (t: string) => /[؀-ۿ]/.test(t);

function lines(c: CanvasRenderingContext2D, text: string, size: number, weight: number, maxW: number) {
  c.font = F(weight, size);
  const out: string[] = []; let l = "";
  for (const w of text.trim().split(/\s+/).filter(Boolean)) { const t = l ? `${l} ${w}` : w; if (c.measureText(t).width <= maxW || !l) l = t; else { out.push(l); l = w; } }
  if (l) out.push(l);
  return out;
}
function icon(c: CanvasRenderingContext2D, paths: string[], x: number, y: number, size: number, color: string, lw: number) {
  c.save(); c.translate(x, y); c.scale(size / 24, size / 24); c.strokeStyle = color; c.lineWidth = lw; c.lineCap = "round"; c.lineJoin = "round";
  for (const p of paths) c.stroke(new Path2D(p));
  c.restore();
}
function imgRect(it: Cover) {
  const im = it.img!, aw = W - SP, ah = PH;
  const s = Math.max(aw / im.width, ah / im.height) * it.z, iw = im.width * s, ih = im.height * s;
  return { x: (aw - iw) / 2 + it.ox * (iw - aw) / 2, y: (ah - ih) / 2 + it.oy * (ih - ah) / 2, w: iw, h: ih };
}

function render(c: CanvasRenderingContext2D, it: Cover, logos: { dark?: HTMLImageElement; light?: HTMLImageElement }) {
  const T = TBY[it.type] ?? COVER_TYPES[0], dark = it.panel === "navy";
  c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, W, H); c.direction = "ltr";
  // Image field (or the type's colour and a large icon)
  c.save(); c.beginPath(); c.rect(0, 0, W - SP, PH); c.clip();
  if (it.img) {
    const r = imgRect(it);
    if (it.treat === "orig") c.drawImage(it.img, r.x, r.y, r.w, r.h);
    else {
      c.filter = it.treat === "duo" ? "grayscale(1) contrast(1.12) brightness(1.05)" : "grayscale(.55) contrast(1.05)";
      c.drawImage(it.img, r.x, r.y, r.w, r.h); c.filter = "none";
      if (it.treat === "duo") { c.globalCompositeOperation = "multiply"; c.fillStyle = T.c; c.fillRect(0, 0, W, PH); c.globalCompositeOperation = "lighten"; c.fillStyle = "#101942"; c.fillRect(0, 0, W, PH); c.globalCompositeOperation = "source-over"; }
      else { c.globalAlpha = .28; c.fillStyle = "#101942"; c.fillRect(0, 0, W, PH); c.globalAlpha = 1; }
    }
    const g = c.createLinearGradient(0, PH * .55, 0, PH); g.addColorStop(0, "rgba(16,25,66,0)"); g.addColorStop(1, "rgba(16,25,66,.5)"); c.fillStyle = g; c.fillRect(0, 0, W, PH);
  } else {
    c.fillStyle = T.c; c.fillRect(0, 0, W, PH);
    c.globalAlpha = T.on === "#fff" ? .22 : .16; icon(c, T.ic, -170, 90, 980, T.on, 1.1); c.globalAlpha = 1;
    icon(c, T.ic, W - SP - 96 - 210, 96, 210, T.on, 1.6);
  }
  c.restore();
  // Spine on the right edge (Arabic binding), in the type's colour
  c.fillStyle = T.c; c.fillRect(W - SP, 0, SP, H);
  c.fillStyle = "rgba(0,0,0,.12)"; c.fillRect(W - SP, 0, 3, H);
  // Title panel
  c.fillStyle = dark ? "#101942" : "#ffffff"; c.fillRect(0, PH, W - SP, H - PH);
  // Type tab straddling the edge
  c.direction = "rtl"; c.textAlign = "right";
  c.font = F(700, 46);
  const tw = c.measureText(T.ar).width, tabW = tw + 150, tabH = 96, tabX = W - SP - 96 - tabW, tabY = PH - tabH / 2;
  c.fillStyle = T.c; c.beginPath(); c.roundRect(tabX, tabY, tabW, tabH, tabH / 2); c.fill(); c.lineWidth = 8; c.strokeStyle = dark ? "#101942" : "#ffffff"; c.stroke();
  icon(c, T.ic, W - SP - 96 - 34 - 44, tabY + (tabH - 44) / 2, 44, T.on, 2.2);
  c.fillStyle = T.on; c.fillText(T.ar, W - SP - 96 - 34 - 44 - 20, tabY + tabH * .66);
  // Title
  const title = it.title.trim() || "عنوان المادة";
  const ar = isAr(title), mx = 96, maxW = W - SP - mx * 2;
  c.direction = ar ? "rtl" : "ltr"; c.textAlign = ar ? "right" : "left";
  const ax = ar ? W - SP - mx : mx;
  let y = PH + tabH / 2 + 64;
  const avail = (H - 96 - 110) - y - (it.date.trim() ? 150 : 70);
  let ti: { s: number; L: string[] } | null = null;
  for (let s = 112; s >= 52; s -= 4) { const L = lines(c, title, s, 800, maxW); if (L.length <= 4 && L.length * s * 1.3 <= avail) { ti = { s, L }; break; } }
  if (!ti) { const L = lines(c, title, 52, 800, maxW).slice(0, Math.max(1, Math.floor(avail / (52 * 1.3)))); ti = { s: 52, L }; }
  const lh = ti.s * 1.3;
  c.fillStyle = dark ? "#ffffff" : "#101942"; c.font = F(800, ti.s);
  for (const l of ti.L) { y += lh * .8; c.fillText(l, ax, y); y += lh * .2; }
  // Accent rule and date
  y += 40; c.fillStyle = T.c; c.fillRect(ar ? W - SP - mx - 120 : mx, y, 120, 10);
  if (it.date.trim()) { c.font = F(500, 40); c.fillStyle = dark ? "rgba(255,255,255,.72)" : "#4a5878"; c.fillText(it.date, ax, y + 76); }
  // Footer: series and logo
  const fy = H - 96; c.direction = "rtl"; c.textAlign = "right";
  if (it.series.trim()) { c.font = F(800, 48); c.fillStyle = dark ? "#ffffff" : "#101942"; c.fillText(it.series, W - SP - mx, fy); }
  const lg = dark ? logos.dark : logos.light;
  if (lg) { const lh2 = 54; c.drawImage(lg, mx, fy - lh2 + 8, lh2 * 4.258, lh2); }
  c.fillStyle = dark ? "rgba(255,255,255,.12)" : "#dfe5f0"; c.fillRect(mx, fy - 110, W - SP - mx * 2, 2);
}

const loadImg = (src: string) => new Promise<HTMLImageElement | null>((r) => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = src; });

/** The cover maker window. `onSave` receives a WebP data URL sized for the library. */
export function CoverMaker({ initial, onSave, onClose }: { initial: { type?: string; title?: string; date?: string; series?: string }; onSave: (dataUrl: string) => void; onClose: () => void }) {
  const { rtl, lang } = useAdmin();
  const cvRef = useRef<HTMLCanvasElement>(null);
  const thumbRef = useRef<HTMLCanvasElement>(null);
  const logos = useRef<{ dark?: HTMLImageElement; light?: HTMLImageElement }>({});
  const [ready, setReady] = useState(0);
  const [it, setIt] = useState<Cover>(() => ({ type: initial.type && TBY[initial.type] ? initial.type : "paper", title: initial.title ?? "", date: initial.date ?? "", series: initial.series ?? "ويبال", treat: "duo", panel: "navy", img: null, z: 1, ox: 0, oy: 0 }));
  const [over, setOver] = useState(false);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number; sc: number } | null>(null);

  useEffect(() => {
    let live = true;
    (async () => {
      const [dark, light] = await Promise.all([loadImg("/brand/forum/wepal-logo-reverse.svg"), loadImg("/brand/forum/wepal-logo-primary.svg")]);
      logos.current = { dark: dark ?? undefined, light: light ?? undefined };
      try { await Promise.all([document.fonts.load(F(800, 100), "عنوان"), document.fonts.load(F(700, 46), "تقرير")]); } catch { /* fonts unavailable */ }
      if (live) setReady((n) => n + 1);
    })();
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", k); document.body.style.overflow = "hidden";
    return () => { live = false; document.removeEventListener("keydown", k); document.body.style.overflow = ""; };
  }, [onClose]);

  // Draw the cover and the library card thumbnail whenever something changes.
  useEffect(() => {
    const cv = cvRef.current; if (!cv) return;
    render(cv.getContext("2d")!, it, logos.current);
    const t = thumbRef.current; if (t) { const tc = t.getContext("2d")!; tc.imageSmoothingQuality = "high"; tc.clearRect(0, 0, t.width, t.height); tc.drawImage(cv, 0, 0, t.width, t.height); }
  }, [it, ready]);

  const set = (patch: Partial<Cover>) => setIt((x) => ({ ...x, ...patch }));
  const setFile = async (f?: File | null) => {
    if (!f || !f.type.startsWith("image/")) return;
    const url = await new Promise<string>((r) => { const fr = new FileReader(); fr.onload = () => r(String(fr.result)); fr.readAsDataURL(f); });
    const im = await loadImg(url); if (im) set({ img: im, z: 1, ox: 0, oy: 0 });
  };
  const save = () => {
    const out = document.createElement("canvas"); out.width = 620; out.height = 877;
    const oc = out.getContext("2d")!; oc.imageSmoothingQuality = "high"; oc.drawImage(cvRef.current!, 0, 0, out.width, out.height);
    let url = out.toDataURL("image/webp", .86);
    if (!url.startsWith("data:image/webp")) url = out.toDataURL("image/jpeg", .86);
    onSave(url);
  };
  const T = TBY[it.type];
  const seg = <K extends string>(value: K, options: [K, string][], onPick: (k: K) => void) => (
    <div className="a-seg cm-seg">{options.map(([k, label]) => <button key={k} type="button" aria-pressed={value === k} onClick={() => onPick(k)}>{label}</button>)}</div>
  );

  return (
    <div className="a-modal-scrim cm-scrim" onClick={onClose}>
      <div className="cm" role="dialog" aria-modal="true" aria-label={rtl ? "تصميم غلاف" : "Design a cover"} onClick={(e) => e.stopPropagation()}>
        <header className="cm-h">
          <div><h2>{rtl ? "تصميم غلاف للمكتبة" : "Design a library cover"}</h2><p>{rtl ? "غلاف A4 موحّد بهوية ويبال: ارفع صورة، رتّبها بالسحب، ثم احفظ." : "A unified A4 cover in WePal's identity: add an image, drag to place it, then save."}</p></div>
          <button type="button" className="a-icon" onClick={onClose} aria-label={rtl ? "إغلاق" : "Close"}><X /></button>
        </header>
        <div className="cm-body">
          <section className="cm-form a-form">
            <label className="a-fgroup"><span className="a-flabel">{rtl ? "نوع المادة" : "Type"}</span>
              <select className="a-select" value={it.type} onChange={(e) => set({ type: e.target.value })}>{COVER_TYPES.map((t) => <option key={t.id} value={t.id}>{lang === "ar" ? t.ar : t.en}</option>)}</select></label>
            <label className="a-fgroup"><span className="a-flabel">{rtl ? "العنوان" : "Title"}</span><textarea rows={3} value={it.title} onChange={(e) => set({ title: e.target.value })} /></label>
            <div className="cm-two">
              <label className="a-fgroup"><span className="a-flabel">{rtl ? "السلسلة أو الجهة" : "Series or source"}</span><input value={it.series} onChange={(e) => set({ series: e.target.value })} placeholder={rtl ? "مثال: مسارات" : "e.g. Masarat"} /></label>
              <label className="a-fgroup"><span className="a-flabel">{rtl ? "التاريخ" : "Date"}</span><input value={it.date} onChange={(e) => set({ date: e.target.value })} placeholder={rtl ? "نوفمبر 2026" : "November 2026"} /></label>
            </div>
            <div className="a-fgroup"><span className="a-flabel">{rtl ? "صورة الغلاف" : "Cover image"}</span>
              <label className={`a-drop cm-drop ${over ? "is-over" : ""}`} onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={(e) => { e.preventDefault(); setOver(false); void setFile(e.dataTransfer.files[0]); }}>
                <ImagePlus aria-hidden="true" /><b>{rtl ? "ارفع صورة أو اسحبها هنا" : "Upload or drop an image"}</b><small>{rtl ? "بدونها يُولَّد غلاف بلون النوع وأيقونته" : "Without one, the cover uses the type's colour and icon"}</small>
                <input type="file" accept="image/*" onChange={(e) => { void setFile(e.target.files?.[0]); e.target.value = ""; }} />
              </label>
              {it.img && <div className="cm-two"><button type="button" className="a-btn is-sm" onClick={() => set({ z: 1, ox: 0, oy: 0 })}><RotateCcw aria-hidden="true" />{rtl ? "إعادة ضبط الموضع" : "Reset position"}</button><button type="button" className="a-btn is-sm is-danger" onClick={() => set({ img: null })}><Trash2 aria-hidden="true" />{rtl ? "إزالة الصورة" : "Remove image"}</button></div>}
            </div>
            <div className="a-fgroup"><span className="a-flabel">{rtl ? "معالجة الصورة" : "Image treatment"}</span>{seg(it.treat, [["duo", rtl ? "لون موحّد" : "Duotone"], ["soft", rtl ? "ناعم" : "Soft"], ["orig", rtl ? "أصلي" : "Original"]], (k) => set({ treat: k }))}</div>
            <div className="a-fgroup"><span className="a-flabel">{rtl ? "لوحة العنوان" : "Title panel"}</span>{seg(it.panel, [["navy", rtl ? "كحلي" : "Navy"], ["white", rtl ? "أبيض" : "White"]], (k) => set({ panel: k }))}</div>
            <p className="a-muted cm-tip">{rtl ? "اسحب الصورة على الغلاف لتحريكها، واستخدم عجلة الماوس للتكبير والتصغير." : "Drag the image on the cover to move it; use the mouse wheel to zoom."}</p>
          </section>
          <section className="cm-stage">
            <div className="cm-canvas">
              <canvas ref={cvRef} width={W} height={H} role="img" aria-label={rtl ? "معاينة الغلاف" : "Cover preview"} className={it.img ? "is-movable" : ""}
                onPointerDown={(e) => { if (!it.img) return; const r = e.currentTarget.getBoundingClientRect(); if ((e.clientY - r.top) * H / r.height > PH) return; drag.current = { x: e.clientX, y: e.clientY, ox: it.ox, oy: it.oy, sc: H / r.height }; e.currentTarget.setPointerCapture(e.pointerId); }}
                onPointerMove={(e) => { const d = drag.current; if (!d || !it.img) return; const R = imgRect(it), ex = (R.w - (W - SP)) / 2, ey = (R.h - PH) / 2; const dx = (e.clientX - d.x) * d.sc, dy = (e.clientY - d.y) * d.sc; set({ ox: ex > 0 ? Math.max(-1, Math.min(1, d.ox + dx / ex)) : 0, oy: ey > 0 ? Math.max(-1, Math.min(1, d.oy + dy / ey)) : 0 }); }}
                onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}
                onWheel={(e) => { if (!it.img) return; set({ z: Math.max(1, Math.min(3, it.z * (e.deltaY < 0 ? 1.06 : 1 / 1.06))) }); }} />
            </div>
            <div className="cm-side">
              <h3>{rtl ? "كيف سيظهر في المكتبة" : "How it looks in the library"}</h3>
              <div className="cm-card" style={{ "--tc": T?.c } as CSSProperties}>
                <canvas ref={thumbRef} width={192} height={272} />
                <div><span className="cm-chip">{lang === "ar" ? T?.ar : T?.en}</span><h4>{it.title || (rtl ? "عنوان المادة" : "Item title")}</h4><small>{it.date}</small></div>
              </div>
            </div>
          </section>
        </div>
        <div className="cm-f">
          <button type="button" className="a-btn" onClick={onClose}>{rtl ? "إلغاء" : "Cancel"}</button>
          <button type="button" className="a-btn is-primary" onClick={save}><Save aria-hidden="true" />{rtl ? "احفظ الغلاف" : "Save cover"}</button>
        </div>
      </div>
    </div>
  );
}
