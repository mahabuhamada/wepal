"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Bell, ChevronDown, ChevronRight, ExternalLink, Languages, LogOut, Menu, Search, X, type LucideIcon } from "lucide-react";
import { Logo } from "../identity";
import { useLang } from "../site-chrome";
import type { Lang, T } from "../content";
import { ADMIN_GROUPS, ADMIN_ITEMS, adminHref, type AdminGroup } from "./nav";

type Ctx = { lang: Lang; rtl: boolean; tx: (t: T) => string };
const AdminCtx = createContext<Ctx>({ lang: "ar", rtl: true, tx: (t) => t.ar });
export const useAdmin = () => useContext(AdminCtx);

const tone = (color: string) => ({ "--gc": color }) as CSSProperties;
const GROUPS_KEY = "wepal-admin-closed";

export function AdminShell({ active, children }: { active: string; children: ReactNode }) {
  const [lang, setLang] = useLang();
  const rtl = lang === "ar";
  const tx = (t: T) => t[lang];
  const ctx = useMemo(() => ({ lang, rtl, tx: (t: T) => t[lang] }), [lang, rtl]);
  const current = ADMIN_ITEMS.find((it) => it.key === active);

  const [closed, setClosed] = useState<Record<string, boolean>>({});
  useEffect(() => {
    let saved: Record<string, boolean> = {};
    try { saved = JSON.parse(window.localStorage.getItem(GROUPS_KEY) || "{}"); } catch { /* storage blocked */ }
    const id = requestAnimationFrame(() => setClosed(saved)); return () => cancelAnimationFrame(id);
  }, []);
  const toggle = (id: string) => setClosed((c) => {
    const next = { ...c, [id]: !c[id] };
    try { window.localStorage.setItem(GROUPS_KEY, JSON.stringify(next)); } catch { /* storage blocked */ }
    return next;
  });

  const [drawer, setDrawer] = useState(false);
  const [palette, setPalette] = useState(false);
  const [bell, setBell] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPalette(true); }
      if (e.key === "Escape") { setPalette(false); setDrawer(false); setBell(false); }
    };
    const out = (e: MouseEvent) => { if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBell(false); };
    document.addEventListener("keydown", key); document.addEventListener("mousedown", out);
    return () => { document.removeEventListener("keydown", key); document.removeEventListener("mousedown", out); };
  }, []);
  useEffect(() => { document.body.style.overflow = drawer || palette ? "hidden" : ""; return () => { document.body.style.overflow = ""; }; }, [drawer, palette]);

  const waiting = ADMIN_ITEMS.filter((it) => it.count && !it.soft);
  const waitingTotal = waiting.reduce((n, it) => n + (it.count ?? 0), 0);

  return (
    <AdminCtx.Provider value={ctx}>
      <div className={`a-app ${drawer ? "is-drawer" : ""}`} dir={rtl ? "rtl" : "ltr"} lang={lang}>
        <aside className="a-side" aria-label={rtl ? "أقسام لوحة الإدارة" : "Admin sections"}>
          <div className="a-brand">
            <a href="/admin" aria-label={rtl ? "رئيسية لوحة الإدارة" : "Admin home"}><Logo variant="reverse" /></a>
            <button className="a-side-x" onClick={() => setDrawer(false)} aria-label={rtl ? "إغلاق القائمة" : "Close menu"}><X /></button>
          </div>
          <p className="a-chip">{rtl ? "لوحة الإدارة · مدير عام" : "Admin panel · Administrator"}</p>
          <nav className="a-nav">
            {ADMIN_GROUPS.map((g) => (
              <div key={g.id} className="a-group" style={tone(g.color)} data-closed={closed[g.id] ? "" : undefined}>
                <button type="button" onClick={() => toggle(g.id)} aria-expanded={!closed[g.id]}><i />{tx(g.label)}<ChevronDown aria-hidden="true" /></button>
                <div className="a-links"><div>
                  {g.items.map((it) => { const I = it.icon; const on = it.key === active; return (
                    <a key={it.key} href={adminHref(it.key)} aria-current={on ? "page" : undefined} tabIndex={closed[g.id] ? -1 : undefined}>
                      <span className="a-ic"><I aria-hidden="true" /></span>{tx(it.label)}
                      {!!it.count && <b className={`a-count ${it.soft ? "is-soft" : ""}`}>{it.count}</b>}
                    </a>
                  ); })}
                </div></div>
              </div>
            ))}
          </nav>
          <div className="a-me">
            <span className="a-avatar">ل</span>
            <span><b>{rtl ? "ليان أحمد" : "Layan Ahmad"}</b><small>{rtl ? "مدير عام" : "Administrator"}</small></span>
            <a href="/dashboard" aria-label={rtl ? "العودة إلى مساحتي" : "Back to my area"} title={rtl ? "مساحتي" : "My area"}><LogOut /></a>
          </div>
        </aside>
        <div className="a-scrim" onClick={() => setDrawer(false)} aria-hidden="true" />

        <div className="a-main">
          <header className="a-top">
            <button className="a-icon a-menu" onClick={() => setDrawer(true)} aria-label={rtl ? "فتح القائمة" : "Open menu"}><Menu /></button>
            <nav className="a-crumbs" aria-label={rtl ? "مسار التنقّل" : "Breadcrumb"}>
              <a href="/admin">{rtl ? "لوحة الإدارة" : "Admin"}</a>
              {current && current.key && <><ChevronRight aria-hidden="true" /><span>{tx(current.group.label)}</span><ChevronRight aria-hidden="true" /><b>{tx(current.label)}</b></>}
            </nav>
            <button className="a-search" onClick={() => setPalette(true)}><Search aria-hidden="true" /><span>{rtl ? "ابحث أو انتقل…" : "Search or jump…"}</span><kbd>Ctrl K</kbd></button>
            <span className="a-sync"><i />{rtl ? "بيانات تجريبية" : "Demo data"}</span>
            <div className="a-bell" ref={bellRef}>
              <button className="a-icon" onClick={() => setBell((b) => !b)} aria-expanded={bell} aria-label={rtl ? `ما ينتظرك: ${waitingTotal}` : `Waiting: ${waitingTotal}`}>
                <Bell />{waitingTotal > 0 && <b>{waitingTotal}</b>}
              </button>
              {bell && (
                <div className="a-pop" role="dialog" aria-label={rtl ? "ما ينتظرك الآن" : "Waiting for you"}>
                  <p>{rtl ? "ما ينتظرك الآن" : "Waiting for you"}</p>
                  {waiting.map((it) => { const I = it.icon; return (
                    <a key={it.key} href={adminHref(it.key)} style={tone(it.group.color)}><span className="a-ic"><I aria-hidden="true" /></span>{tx(it.label)}<b>{it.count}</b></a>
                  ); })}
                </div>
              )}
            </div>
            <button className="a-icon" onClick={() => setLang(rtl ? "en" : "ar")} aria-label={rtl ? "English" : "العربية"} title={rtl ? "English" : "العربية"}><Languages /></button>
            <a className="a-icon" href="/" target="_blank" rel="noopener" aria-label={rtl ? "فتح الموقع" : "Open the site"} title={rtl ? "فتح الموقع" : "Open the site"}><ExternalLink /></a>
          </header>
          <main className="a-page">{children}</main>
        </div>

        {palette && <Palette onClose={() => setPalette(false)} />}
      </div>
    </AdminCtx.Provider>
  );
}

function Palette({ onClose }: { onClose: () => void }) {
  const { rtl, tx } = useAdmin();
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const list = ADMIN_ITEMS.filter((it) => !q.trim() || `${it.label.ar} ${it.label.en} ${it.group.label.ar} ${it.group.label.en}`.toLowerCase().includes(q.trim().toLowerCase()));
  const go = (i: number) => { const it = list[i]; if (it) window.location.assign(`${window.location.origin}${adminHref(it.key)}`); };
  return (
    <div className="a-pal-scrim" onClick={onClose}>
      <div className="a-pal" role="dialog" aria-modal="true" aria-label={rtl ? "ابحث أو انتقل" : "Search or jump"} onClick={(e) => e.stopPropagation()}>
        <label className="a-pal-in"><Search aria-hidden="true" />
          <input autoFocus value={q} placeholder={rtl ? "اكتب اسم صفحة…" : "Type a page name…"} onChange={(e) => { setQ(e.target.value); setSel(0); }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(list.length - 1, s + 1)); }
              if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); }
              if (e.key === "Enter") go(sel);
            }} />
          <kbd>Esc</kbd>
        </label>
        <ul>
          {list.map((it, i) => { const I = it.icon; return (
            <li key={it.key}><a href={adminHref(it.key)} className={i === sel ? "is-sel" : ""} style={tone(it.group.color)} onMouseEnter={() => setSel(i)}>
              <span className="a-ic"><I aria-hidden="true" /></span><span>{tx(it.label)}</span><small>{tx(it.group.label)}</small>
            </a></li>
          ); })}
          {!list.length && <li className="a-pal-empty">{rtl ? "لا نتائج. جرّب كلمة أخرى." : "No results. Try another word."}</li>}
        </ul>
      </div>
    </div>
  );
}

/** Section header: a tinted hero with the section's tile, title, lead, actions and quick figures. */
export function Hero({ group, icon: Icon, title, lead, actions, stats }: {
  group: AdminGroup; icon: LucideIcon; title: string; lead: string; actions?: ReactNode; stats?: { value: string | number; label: string }[];
}) {
  return (
    <header className="a-hero" style={tone(group.color)}>
      <div className="a-hero-top">
        <span className="a-tile"><Icon aria-hidden="true" /></span>
        <div><h1>{title}</h1><p>{lead}</p></div>
        {actions && <div className="a-actions">{actions}</div>}
      </div>
      {stats && <div className="a-hstats">{stats.map((s) => <div key={s.label} className="a-hstat"><strong>{s.value}</strong><span>{s.label}</span></div>)}</div>}
    </header>
  );
}

export function ACard({ title, sub, end, children, className = "" }: { title?: ReactNode; sub?: ReactNode; end?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`a-card ${className}`}>
      {title && <div className="a-card-h"><div><h3>{title}</h3>{sub && <small>{sub}</small>}</div>{end && <div className="a-end">{end}</div>}</div>}
      <div className="a-card-b">{children}</div>
    </section>
  );
}
