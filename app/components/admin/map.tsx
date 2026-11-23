"use client";

import { useState } from "react";
import { MapPin, Plane } from "lucide-react";
import { useAdmin } from "./shell";
import { ABROAD, MEMBERS_TOTAL, REGIONS } from "./data";
import { MAP_H, MAP_W, OUTLINE, WB_GAZA, project } from "./palestine-map";

const AREA_COLOR = { wb: "var(--b500)", gaza: "#2bb39a", "48": "#6a5bd6" } as const;

/** Members by governorate on a map of Palestine. Each bubble and row opens the members list filtered by region. */
export function MembersMap() {
  const { rtl, tx } = useAdmin();
  const [hover, setHover] = useState<string | null>(null);
  const max = Math.max(...REGIONS.map((r) => r.members));
  const sorted = [...REGIONS].sort((a, b) => b.members - a.members);
  const area = (k: "wb" | "gaza" | "48") => REGIONS.filter((r) => r.area === k).reduce((n, r) => n + r.members, 0);
  const pct = (n: number) => Math.round((n / MEMBERS_TOTAL) * 100);
  const hovered = REGIONS.find((r) => r.key === hover);

  return (
    <div className="a-map">
      <div className="a-map-fig">
        <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} role="img" aria-label={rtl ? "خريطة فلسطين بعدد الأعضاء في كل محافظة" : "Map of Palestine with members per governorate"}>
          <defs>
            <linearGradient id="aMapFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#eef4fc" /><stop offset="1" stopColor="#e3edf9" /></linearGradient>
          </defs>
          <path d={OUTLINE} fill="url(#aMapFill)" stroke="#c9d6ea" strokeWidth="1.2" strokeLinejoin="round" />
          <path d={WB_GAZA} fill="color-mix(in srgb, var(--b500) 10%, #fff)" stroke="color-mix(in srgb, var(--b500) 45%, #fff)" strokeWidth="1.2" strokeLinejoin="round" />
          {REGIONS.map((r, i) => {
            const [x, y] = project(r.lon, r.lat);
            const rad = 3 + Math.sqrt(r.members / max) * 8.5;
            const on = hover === r.key;
            return (
              <a key={r.key} href={`/admin/users?region=${r.key}`} onMouseEnter={() => setHover(r.key)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(r.key)} onBlur={() => setHover(null)}
                aria-label={`${tx(r.name)}: ${r.members}`}>
                <circle className="a-map-pulse" cx={x} cy={y} r={rad} fill={AREA_COLOR[r.area]} style={{ animationDelay: `${i * 120}ms` }} />
                <circle className="a-map-dot" cx={x} cy={y} r={on ? rad + 2 : rad} fill={AREA_COLOR[r.area]} fillOpacity={on ? 0.95 : 0.78} stroke="#fff" strokeWidth="1.6" style={{ animationDelay: `${i * 50}ms` }} />
              </a>
            );
          })}
        </svg>
        <div className={`a-map-tip ${hovered ? "is-on" : ""}`} aria-hidden="true">
          {hovered ? <><MapPin /><b>{tx(hovered.name)}</b><span>{hovered.members} {rtl ? "عضوًا" : "members"} · {pct(hovered.members)}%</span></> : <span>{rtl ? "مرّر على أي دائرة" : "Hover a circle"}</span>}
        </div>
      </div>
      <div className="a-map-side">
        <div className="a-map-areas">
          <a href="/admin/users?area=wb" style={{ ["--gc" as string]: AREA_COLOR.wb }}><strong>{area("wb")}</strong><span>{rtl ? "الضفة الغربية والقدس" : "West Bank & Jerusalem"}</span></a>
          <a href="/admin/users?area=gaza" style={{ ["--gc" as string]: AREA_COLOR.gaza }}><strong>{area("gaza")}</strong><span>{rtl ? "قطاع غزة" : "Gaza Strip"}</span></a>
          <a href="/admin/users?area=48" style={{ ["--gc" as string]: AREA_COLOR["48"] }}><strong>{area("48")}</strong><span>{rtl ? "الداخل" : "Inside"}</span></a>
          <a href="/admin/users?area=abroad" style={{ ["--gc" as string]: "#e9a521" }}><strong><Plane aria-hidden="true" />{ABROAD}</strong><span>{rtl ? "خارج فلسطين" : "Abroad"}</span></a>
        </div>
        <ol className="a-map-list">
          {sorted.map((r) => (
            <li key={r.key} className={hover === r.key ? "is-on" : ""} onMouseEnter={() => setHover(r.key)} onMouseLeave={() => setHover(null)}>
              <a href={`/admin/users?region=${r.key}`}>
                <span className="a-map-name"><i style={{ background: AREA_COLOR[r.area] }} />{tx(r.name)}</span>
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
