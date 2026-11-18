"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import {
  Bell, BookOpen, ClipboardList, Compass, FolderKanban, Globe2, House, Languages, LayoutGrid, LogOut, MessageCircle,
  MessageCircleQuestion, MessagesSquare, Search, Settings, Sparkles, UserRound, Users, Vote, X, type LucideIcon,
} from "lucide-react";
import { Logo } from "../identity";
import { useLang } from "../site-chrome";
import type { Lang, T } from "../content";
import { ASK_SUGGESTIONS, GROUPS, MEMBERS, ME, NOTICES, ONLINE, THREADS, WORKSPACES, type Member } from "./data";
import { update, useStore, useToasts } from "./store";

/* ── Context: current language for every member page ── */
type Ctx = { lang: Lang; rtl: boolean; tx: (t: T) => string };
const MemberCtx = createContext<Ctx>({ lang: "ar", rtl: true, tx: (t) => t.ar });
export const useMember = () => useContext(MemberCtx);

export type MemberRoute =
  | "dashboard" | "profile" | "messages" | "notifications" | "projects" | "community"
  | "surveys" | "consultations" | "assistant" | "members" | "settings";

type NavItem = { key: MemberRoute | "library"; href: string; icon: LucideIcon; label: T; count?: number };

const NAV_MAIN: NavItem[] = [
  { key: "dashboard", href: "/dashboard", icon: House, label: { ar: "الرئيسية", en: "Home" } },
  { key: "community", href: "/community", icon: Users, label: { ar: "المجتمع", en: "Community" } },
  { key: "projects", href: "/projects", icon: FolderKanban, label: { ar: "مساحات العمل", en: "Workspaces" } },
  { key: "surveys", href: "/surveys", icon: ClipboardList, label: { ar: "الاستبيانات", en: "Surveys" } },
  { key: "consultations", href: "/consultations", icon: Vote, label: { ar: "المشاورات", en: "Consultations" } },
  { key: "members", href: "/members", icon: UserRound, label: { ar: "الأعضاء", en: "Members" } },
  { key: "assistant", href: "/assistant", icon: MessageCircleQuestion, label: { ar: "اسأل", en: "Ask" } },
  { key: "library", href: "/library", icon: BookOpen, label: { ar: "المكتبة", en: "Library" } },
];

/** Unread counts that react to the demo state (notifications read, messages sent). */
function useCounts() {
  const s = useStore();
  const notices = NOTICES.filter((n) => n.unread && !s.read[n.id]).length;
  const messages = THREADS.reduce((sum, t) => sum + (s.read[t.id] ? 0 : t.unread), 0);
  return { notices, messages };
}

export function MemberShell({ active, children }: { active: MemberRoute; children: ReactNode }) {
  const [lang, setLang] = useLang();
  const rtl = lang === "ar";
  const tx = (t: T) => t[lang];
  const s = useStore();
  const counts = useCounts();
  const [sheet, setSheet] = useState(false);
  const [menu, setMenu] = useState<null | "notices" | "messages" | "me">(null);
  const [ask, setAsk] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);
  useEffect(() => { document.body.style.overflow = sheet ? "hidden" : ""; return () => { document.body.style.overflow = ""; }; }, [sheet]);
  useEffect(() => {
    const close = (e: MouseEvent) => { if (barRef.current && !barRef.current.contains(e.target as Node)) setMenu(null); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") { setMenu(null); setAsk(false); setSheet(false); } };
    document.addEventListener("mousedown", close); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, []);

  const myGroups = GROUPS.filter((g) => (s.joined[g.id] ?? g.joined));
  const myWork = WORKSPACES.filter((w) => w.mine && w.stage !== "done");
  const counted = (item: NavItem): NavItem => item.key === "messages" ? { ...item, count: counts.messages } : item.key === "notifications" ? { ...item, count: counts.notices } : item;

  const link = (raw: NavItem, onClick?: () => void) => {
    const item = counted(raw); const Icon = item.icon; const on = item.key === active;
    return (
      <a key={item.key} href={item.href} className={on ? "is-active" : ""} aria-current={on ? "page" : undefined} onClick={onClick}>
        <Icon aria-hidden="true" /><span>{tx(item.label)}</span>{!!item.count && <b className="m-count">{item.count}</b>}
      </a>
    );
  };
  const search = (q: string) => { window.location.assign(`${window.location.origin}/assistant?q=${encodeURIComponent(q)}`); };

  return (
    <MemberCtx.Provider value={{ lang, rtl, tx }}>
      <main className="home m-area" dir={rtl ? "rtl" : "ltr"} lang={lang}>
        {/* ── Members top bar ── */}
        <header className="m-top" ref={barRef}>
          <div className="m-top-inner">
            <a href="/dashboard" className="m-top-brand" aria-label="WePal"><Logo /></a>
            <form className="m-top-search" role="search" onSubmit={(e) => { e.preventDefault(); const q = new FormData(e.currentTarget).get("q"); if (q) search(String(q)); }}>
              <Search aria-hidden="true" /><input name="q" placeholder={rtl ? "ابحث أو اسأل…" : "Search or ask…"} aria-label={rtl ? "ابحث أو اسأل" : "Search or ask"} />
            </form>
            <div className="m-top-actions">
              <button className="m-top-btn is-lang" onClick={() => setLang(rtl ? "en" : "ar")} aria-label={rtl ? "Switch to English" : "التبديل إلى العربية"}><Languages /><span>{rtl ? "EN" : "ع"}</span></button>
              <div className="m-pop-wrap">
                <button className={`m-top-btn ${menu === "messages" ? "is-on" : ""}`} onClick={() => setMenu(menu === "messages" ? null : "messages")} aria-label={rtl ? "الرسائل" : "Messages"} aria-expanded={menu === "messages"}><MessagesSquare />{counts.messages > 0 && <b className="m-dot">{counts.messages}</b>}</button>
                {menu === "messages" && (
                  <div className="m-pop">
                    <div className="m-pop-head"><strong>{rtl ? "الرسائل" : "Messages"}</strong><a href="/messages">{rtl ? "كل الرسائل" : "All messages"}</a></div>
                    {THREADS.map((t) => { const m = memberOrMe(t.with); const unread = !s.read[t.id] && t.unread > 0; return (
                      <a key={t.id} href={`/messages?t=${t.id}`} className={`m-pop-row ${unread ? "is-unread" : ""}`}>
                        <Avatar who={m} size={40} online={ONLINE.has(t.with)} />
                        <span><strong>{tx(m.name)}</strong><small>{s.messages[t.id]?.at(-1)?.text ?? tx(t.last)}</small></span>
                        <em>{tx(t.time)}</em>
                      </a>
                    ); })}
                  </div>
                )}
              </div>
              <div className="m-pop-wrap">
                <button className={`m-top-btn ${menu === "notices" ? "is-on" : ""}`} onClick={() => setMenu(menu === "notices" ? null : "notices")} aria-label={rtl ? "الإشعارات" : "Notifications"} aria-expanded={menu === "notices"}><Bell />{counts.notices > 0 && <b className="m-dot">{counts.notices}</b>}</button>
                {menu === "notices" && (
                  <div className="m-pop">
                    <div className="m-pop-head"><strong>{rtl ? "الإشعارات" : "Notifications"}</strong><button onClick={() => update((x) => ({ ...x, read: { ...x.read, ...Object.fromEntries(NOTICES.map((n) => [n.id, true])) } }))}>{rtl ? "تعليم الكل كمقروء" : "Mark all read"}</button></div>
                    {NOTICES.map((n) => { const unread = n.unread && !s.read[n.id]; return (
                      <a key={n.id} href={n.href} className={`m-pop-row ${unread ? "is-unread" : ""}`} onClick={() => update((x) => ({ ...x, read: { ...x.read, [n.id]: true } }))}>
                        <span className={`m-ico is-${n.kind}`}>{n.kind === "reply" ? <MessageCircle /> : n.kind === "decision" ? <Vote /> : n.kind === "task" ? <FolderKanban /> : <Bell />}</span>
                        <span><strong>{tx(n.text)}</strong><small>{tx(n.where)} · {tx(n.time)}</small></span>
                      </a>
                    ); })}
                    <a className="m-pop-foot" href="/notifications">{rtl ? "كل الإشعارات" : "All notifications"}</a>
                  </div>
                )}
              </div>
              <div className="m-pop-wrap">
                <button className="m-top-me" onClick={() => setMenu(menu === "me" ? null : "me")} aria-label={rtl ? "حسابي" : "My account"} aria-expanded={menu === "me"}><Avatar who={{ ...ME, tone: 0 }} size={36} /></button>
                {menu === "me" && (
                  <div className="m-pop is-menu">
                    <a href="/profile" className="m-pop-me"><Avatar who={{ ...ME, tone: 0 }} size={46} /><span><strong>{tx(ME.name)}</strong><small>{rtl ? "عرض ملفي" : "View my profile"}</small></span></a>
                    <a href="/settings"><Settings />{rtl ? "الإعدادات" : "Settings"}</a>
                    <a href="/"><Globe2 />{rtl ? "البوابة العامة" : "Public site"}</a>
                    <a href="/login" className="m-logout"><LogOut />{rtl ? "تسجيل الخروج" : "Sign out"}</a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <div className="m-layout">
          <aside className="m-side" aria-label={rtl ? "منطقة الأعضاء" : "Members area"}>
            <nav>{NAV_MAIN.map((i) => link(i))}</nav>
            {myGroups.length > 0 && (
              <div className="m-side-group">
                <p className="m-side-label">{rtl ? "مجموعاتي" : "My groups"}</p>
                {myGroups.map((g) => <a key={g.id} href={`/community/${g.id}`} className="m-side-place"><span className="m-place-dot">{tx(g.name).slice(0, 1)}</span><span>{tx(g.name)}</span></a>)}
              </div>
            )}
            {myWork.length > 0 && (
              <div className="m-side-group">
                <p className="m-side-label">{rtl ? "مساحاتي" : "My workspaces"}</p>
                {myWork.map((w) => <a key={w.id} href={`/projects/${w.id}`} className="m-side-place"><span className="m-place-dot is-work"><FolderKanban /></span><span>{tx(w.title)}</span></a>)}
              </div>
            )}
            <div className="m-side-foot">
              {link({ key: "settings", href: "/settings", icon: Settings, label: { ar: "الإعدادات", en: "Settings" } })}
              <a href="/"><Globe2 aria-hidden="true" /><span>{rtl ? "البوابة العامة" : "Public site"}</span></a>
            </div>
          </aside>
          <section className="m-main">{children}</section>
        </div>

        {/* Floating "search & ask" */}
        {active !== "assistant" && (
          <div className={`m-fab ${ask ? "is-open" : ""}`}>
            {ask && (
              <div className="m-fab-panel" role="dialog" aria-label={rtl ? "ابحث واسأل" : "Search & ask"}>
                <div className="m-fab-head"><strong><Sparkles aria-hidden="true" />{rtl ? "ابحث واسأل" : "Search & ask"}</strong><button onClick={() => setAsk(false)} aria-label={rtl ? "إغلاق" : "Close"}><X /></button></div>
                <form onSubmit={(e) => { e.preventDefault(); const q = new FormData(e.currentTarget).get("q"); if (q) search(String(q)); }}>
                  <input name="q" placeholder={rtl ? "اكتب سؤالك…" : "Type your question…"} aria-label={rtl ? "سؤالك" : "Your question"} autoFocus />
                </form>
                <p>{rtl ? "اقتراحات" : "Suggestions"}</p>
                {ASK_SUGGESTIONS.map((q) => <button key={q.en} onClick={() => search(tx(q))}>{tx(q)}</button>)}
              </div>
            )}
            <button className="m-fab-btn" onClick={() => setAsk((o) => !o)} aria-expanded={ask}><MessageCircleQuestion /><span><strong>{rtl ? "ابحث واسأل" : "Search & ask"}</strong><small>{rtl ? "دليل المنصة" : "Platform guide"}</small></span></button>
          </div>
        )}

        {/* Mobile: tab bar + sheet with every section */}
        <nav className="h-tabbar m-tabbar" aria-label={rtl ? "تنقل الأعضاء" : "Members navigation"}>
          {[NAV_MAIN[0], NAV_MAIN[1], NAV_MAIN[2], { key: "messages" as const, href: "/messages", icon: MessageCircle, label: { ar: "الرسائل", en: "Messages" } }].map((raw) => { const t = counted(raw); const Icon = t.icon; const on = t.key === active; return (
            <a key={t.key} href={t.href} className={on ? "is-active" : ""} aria-current={on ? "page" : undefined}>
              <span className="h-tab-icon"><Icon />{!!t.count && <b className="m-dot">{t.count}</b>}</span><span>{tx(t.label)}</span>
            </a>
          ); })}
          <button onClick={() => setSheet(true)} aria-expanded={sheet} className={sheet ? "is-active" : ""}><span className="h-tab-icon"><LayoutGrid /></span><span>{rtl ? "المزيد" : "More"}</span></button>
        </nav>
        <div className={`m-sheet ${sheet ? "is-open" : ""}`} aria-hidden={!sheet} onClick={() => setSheet(false)}>
          <div className="m-sheet-box" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={rtl ? "كل الأقسام" : "All sections"}>
            <div className="m-sheet-head">
              <a href="/profile" className="m-me"><Avatar who={{ ...ME, tone: 0 }} size={40} /><span><strong>{tx(ME.name)}</strong><small>{rtl ? "عرض ملفي" : "View my profile"}</small></span></a>
              <button onClick={() => setSheet(false)} aria-label={rtl ? "إغلاق" : "Close"}><X /></button>
            </div>
            <div className="m-sheet-grid">
              {[...NAV_MAIN, { key: "notifications" as const, href: "/notifications", icon: Bell, label: { ar: "الإشعارات", en: "Notifications" } }, { key: "profile" as const, href: "/profile", icon: UserRound, label: { ar: "ملفي", en: "Profile" } }, { key: "settings" as const, href: "/settings", icon: Settings, label: { ar: "الإعدادات", en: "Settings" } }].map((i) => link(i, () => setSheet(false)))}
            </div>
            <div className="m-sheet-foot">
              <a href="/"><Compass />{rtl ? "البوابة العامة" : "Public site"}</a>
              <a href="/login" className="m-logout"><LogOut />{rtl ? "تسجيل الخروج" : "Sign out"}</a>
            </div>
          </div>
        </div>
        <Toasts />
      </main>
    </MemberCtx.Provider>
  );
}

function Toasts() {
  const list = useToasts();
  return <div className="m-toasts" aria-live="polite">{list.map((t) => <div key={t.id} className="m-toast">{t.text}</div>)}</div>;
}

/* ── Building blocks ── */
/** Member picture: an illustrated default avatar (identity colours) when set, otherwise initials. */
export function Avatar({ who, size = 36, online = false }: { who: Pick<Member, "initials"> & { id?: string; tone?: number; avatar?: number }; size?: number; online?: boolean }) {
  const { tx } = useMember();
  const tone = "tone" in who && who.tone ? who.tone : 0;
  const st = useStore();
  const n = ("id" in who && who.id === "me" && st.myAvatar) || ("avatar" in who ? who.avatar : undefined);
  const pic = n ? `/avatars/a${n}.webp` : null;
  return (
    <span className={`m-avatar tone-${tone} ${pic ? "has-pic" : ""} ${online ? "is-online" : ""}`} style={{ width: size, height: size, fontSize: size * 0.42 }} aria-hidden="true">
      {pic ? <img src={pic} alt="" width={size} height={size} loading="lazy" decoding="async" /> : tx(who.initials)}
    </span>
  );
}
export const memberOrMe = (id: string) => (id === "me" ? { ...ME, tone: 0 } : MEMBERS.find((m) => m.id === id)!);

export function PageHead({ icon: Icon, kicker, title, lead, actions }: { icon: LucideIcon; kicker: T; title: T | string; lead?: T | string; actions?: ReactNode }) {
  const { tx } = useMember();
  const s = (v: T | string) => (typeof v === "string" ? v : tx(v));
  return (
    <header className="m-head">
      <div>
        <span className="m-kicker"><Icon aria-hidden="true" />{tx(kicker)}</span>
        <h1>{s(title)}</h1>
        {lead && <p>{s(lead)}</p>}
      </div>
      {actions && <div className="m-head-actions">{actions}</div>}
    </header>
  );
}

export function Card({ title, action, children, className = "" }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`m-card ${className}`}>
      {(title || action) && <div className="m-card-head">{title && <h2>{title}</h2>}{action}</div>}
      {children}
    </section>
  );
}

export function Progress({ value, label }: { value: number; label?: string }) {
  return <span className="m-progress" role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100} aria-label={label}><i style={{ width: `${Math.min(100, value)}%` }} /></span>;
}

export function Empty({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text?: string }) {
  return <div className="m-empty"><Icon aria-hidden="true" /><strong>{title}</strong>{text && <p>{text}</p>}</div>;
}

export function Tabs<K extends string>({ value, onChange, items, label }: { value: K; onChange: (k: K) => void; items: { key: K; label: string; count?: number }[]; label: string }) {
  return (
    <div className="m-tabs" role="tablist" aria-label={label}>
      {items.map((i) => <button key={i.key} role="tab" aria-selected={value === i.key} onClick={() => onChange(i.key)}>{i.label}{i.count !== undefined && <b>{i.count}</b>}</button>)}
    </div>
  );
}

/** Workspace stage pipeline: idea → planning → doing → review → done. */
export function Stages({ stage }: { stage: "idea" | "active" | "review" | "done" }) {
  const { rtl } = useMember();
  const steps = rtl ? ["فكرة", "تخطيط", "تنفيذ", "مراجعة", "منجز"] : ["Idea", "Planning", "Doing", "Review", "Done"];
  const at = { idea: 0, active: 2, review: 3, done: 4 }[stage];
  return <ol className="m-stages" aria-label={rtl ? "مرحلة العمل" : "Stage"}>{steps.map((st, i) => <li key={st} className={i < at ? "is-past" : i === at ? "is-now" : ""} aria-current={i === at ? "step" : undefined}>{st}</li>)}</ol>;
}
