"use client";

import { useEffect, useState } from "react";
import { Maximize2, MapPin, Plane, X } from "lucide-react";
import { useAdmin } from "./shell";
import { ABROAD, MEMBERS_TOTAL, REGIONS, type Region } from "./data";
import { MAP_H, MAP_W, OUTLINE, WB_GAZA, project } from "./palestine-map";

const AREA_COLOR = { wb: "#0B79CD", gaza: "#2bb39a", "48": "#6a5bd6" } as const;
const AREA_LABEL = { wb: { ar: "الضفة الغربية والقدس", en: "West Bank & Jerusalem" }, gaza: { ar: "قطاع غزة", en: "Gaza Strip" }, "48": { ar: "الداخل", en: "Inside" } } as const;

/** Members by governorate on a map of Palestine; each circle and row opens that region's members. */
export function MembersMap() {
  const { rtl } = useAdmin();
  const [big, setBig] = useState(false);
  useEffect(() => {
    if (!big) return;
    document.body.style.overflow = "hidden";
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") setBig(false); };
    document.addEventListener("keydown", k);
    return () => { document.body.style.overflow = ""; document.removeEventListener("keydown", k); };
  }, [big]);
  return (
    <>
      <MapBody onExpand={() => setBig(true)} />
      {big && (
        <div className="a-mapmodal-scrim" onClick={() => setBig(false)}>
          <div className="a-mapmodal" role="dialog" aria-modal="true" aria-label={rtl ? "خريطة الأعضاء" : "Members map"} onClick={(e) => e.stopPropagation()}>
            <header>
              <div><h2>{rtl ? "من أين أعضاؤنا" : "Where our members are"}</h2><p>{rtl ? `إجمالي المنصة · ${MEMBERS_TOTAL} عضوًا` : `Platform total · ${MEMBERS_TOTAL} members`}</p></div>
              <button type="button" className="a-icon" onClick={() => setBig(false)} aria-label={rtl ? "إغلاق" : "Close"} autoFocus><X /></button>
            </header>
            <MapBody large />
          </div>
        </div>
      )}
    </>
  );
}

function MapBody({ large = false, onExpand }: { large?: boolean; onExpand?: () => void }) {
  const { rtl, tx } = useAdmin();
  const [hover, setHover] = useState<string | null>(null);
  const max = Math.max(...REGIONS.map((r) => r.members));
  const sorted = [...REGIONS].sort((a, b) => b.members - a.members);
  const area = (k: Region["area"]) => REGIONS.filter((r) => r.area === k).reduce((n, r) => n + r.members, 0);
  const pct = (n: number) => Math.round((n / MEMBERS_TOTAL) * 100);
  const hovered = REGIONS.find((r) => r.key === hover);
  const top = new Set(large ? ["jenin", "tulkarm", "nablus", "ramallah", "jerusalem", "hebron", "gaza", "khan-younis"] : []);
  const leftLabel = new Set(["jerusalem", "tulkarm", "gaza", "khan-younis"]);
  const scale = large ? 1.15 : 1;

  return (
    <div className={`a-map ${large ? "is-large" : ""}`}>
      <div className="a-map-fig">
        {onExpand && <button type="button" className="a-map-expand" onClick={onExpand} aria-label={rtl ? "توسيع الخريطة" : "Expand the map"} title={rtl ? "توسيع الخريطة" : "Expand the map"}><Maximize2 /></button>}
        <svg viewBox={`-30 -10 ${MAP_W + 60} ${MAP_H + 20}`} role="img" aria-label={rtl ? "خريطة فلسطين بعدد الأعضاء في كل محافظة" : "Map of Palestine with members per governorate"}>
          <defs>
            <linearGradient id="aLand" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#e6eef9" /></linearGradient>
            <linearGradient id="aWb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#d9e9fa" /><stop offset="1" stopColor="#c6dcf4" /></linearGradient>
            <filter id="aShadow" x="-20%" y="-10%" width="140%" height="120%"><feDropShadow dx="0" dy="6" stdDeviation="7" floodColor="#101942" floodOpacity=".16" /></filter>
            {(["wb", "gaza", "48"] as const).map((k) => (
              <radialGradient key={k} id={`aDot-${k}`} cx="35%" cy="30%" r="75%"><stop offset="0" stopColor="#fff" stopOpacity=".55" /><stop offset=".45" stopColor={AREA_COLOR[k]} /><stop offset="1" stopColor={AREA_COLOR[k]} /></radialGradient>
            ))}
          </defs>
          {large && <text className="a-map-sea" x={-8} y={MAP_H * 0.38} transform={`rotate(-62 -8 ${MAP_H * 0.38})`}>{rtl ? "البحر الأبيض المتوسط" : "Mediterranean Sea"}</text>}
          <path d={OUTLINE} fill="url(#aLand)" stroke="#fff" strokeWidth="5" strokeLinejoin="round" filter="url(#aShadow)" />
          <path d={OUTLINE} fill="none" stroke="#b9cbe4" strokeWidth="1.1" strokeLinejoin="round" />
          <path d={WB_GAZA} fill="url(#aWb)" stroke="#7fb0e3" strokeWidth="1.1" strokeLinejoin="round" strokeDasharray="3 2.5" />
          {REGIONS.map((r, i) => {
            const [x, y] = project(r.lon, r.lat);
            const rad = (3 + Math.sqrt(r.members / max) * 8.5) * scale;
            const on = hover === r.key;
            return (
              <a key={r.key} href={`/admin/users?region=${r.key}`} onMouseEnter={() => setHover(r.key)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(r.key)} onBlur={() => setHover(null)} aria-label={`${tx(r.name)}: ${r.members}`}>
                <circle className="a-map-pulse" cx={x} cy={y} r={rad} fill={AREA_COLOR[r.area]} style={{ animationDelay: `${i * 140}ms` }} />
                <circle className="a-map-dot" cx={x} cy={y} r={on ? rad + 2.5 : rad} fill={`url(#aDot-${r.area})`} stroke="#fff" strokeWidth={on ? 2.4 : 1.6} style={{ animationDelay: `${i * 50}ms` }} />
                {top.has(r.key) && <text className="a-map-label" x={x + (leftLabel.has(r.key) ? -rad - 4 : rad + 4)} y={y + 3.5} textAnchor={leftLabel.has(r.key) ? "end" : "start"}>{tx(r.name).replace(/ (و|&).*$/, "")}</text>}
              </a>
            );
          })}
          {large && <g className="a-map-north" transform={`translate(${MAP_W + 12} 18)`}><path d="M0 -12 L6 6 L0 2 L-6 6 Z" /><text y={20} textAnchor="middle">{rtl ? "ش" : "N"}</text></g>}
        </svg>
        <div className={`a-map-tip ${hovered ? "is-on" : ""}`} aria-hidden="true">
          {hovered ? <><MapPin /><b>{tx(hovered.name)}</b><span>{hovered.members} {rtl ? "عضوًا" : "members"} · {pct(hovered.members)}%</span></> : <span>{rtl ? "مرّر على أي دائرة، واضغط لفتح أعضائها" : "Hover a circle; click to open its members"}</span>}
        </div>
      </div>
      <div className="a-map-side">
        <div className="a-map-areas">
          {(["wb", "gaza", "48"] as const).map((k) => (
            <a key={k} href={`/admin/users?area=${k}`} style={{ ["--gc" as string]: AREA_COLOR[k] }}><strong>{area(k)}</strong><span>{tx(AREA_LABEL[k])}</span><em>{pct(area(k))}%</em></a>
          ))}
          <a href="/admin/users?area=abroad" style={{ ["--gc" as string]: "#e9a521" }}><strong><Plane aria-hidden="true" />{ABROAD}</strong><span>{rtl ? "خارج فلسطين" : "Abroad"}</span><em>{pct(ABROAD)}%</em></a>
        </div>
        <ol className="a-map-list">
          {sorted.map((r, i) => (
            <li key={r.key} className={hover === r.key ? "is-on" : ""} onMouseEnter={() => setHover(r.key)} onMouseLeave={() => setHover(null)}>
              <a href={`/admin/users?region=${r.key}`}>
                <span className="a-map-name"><small>{i + 1}</small><i style={{ background: AREA_COLOR[r.area] }} />{tx(r.name)}</span>
                <span className="a-map-bar"><span style={{ width: `${(r.members / max) * 100}%`, background: AREA_COLOR[r.area] }} /></span>
                <b>{r.members}</b>
              </a>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
