"use client";

import Link from "next/link";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  Bell, BookOpen, ClipboardList, FolderKanban, Globe2, House, LayoutGrid, LogOut, MessageCircle,
  MessageCircleQuestion, MessagesSquare, Settings, UserRound, Users, Vote, X, type LucideIcon,
} from "lucide-react";
import { SiteHeader, useLang } from "../site-chrome";
import type { Lang, T } from "../content";
import { MEMBERS, ME, NOTICES, THREADS, type Member } from "./data";

/* ── Context: current language for every member page ── */
type Ctx = { lang: Lang; rtl: boolean; tx: (t: T) => string };
const MemberCtx = createContext<Ctx>({ lang: "ar", rtl: true, tx: (t) => t.ar });
export const useMember = () => useContext(MemberCtx);

export type MemberRoute =
  | "dashboard" | "profile" | "messages" | "notifications" | "projects" | "community"
  | "surveys" | "consultations" | "assistant" | "members" | "settings";

type NavItem = { key: MemberRoute | "library"; href: string; icon: LucideIcon; label: T; count?: number };

const unreadNotices = NOTICES.filter((n) => n.unread).length;
const unreadMessages = THREADS.reduce((s, t) => s + t.unread, 0);

const NAV_PERSONAL: NavItem[] = [
  { key: "dashboard", href: "/dashboard", icon: House, label: { ar: "لوحتي", en: "My home" } },
  { key: "profile", href: "/profile", icon: UserRound, label: { ar: "الملف الشخصي", en: "Profile" } },
  { key: "messages", href: "/messages", icon: MessagesSquare, label: { ar: "الرسائل", en: "Messages" }, count: unreadMessages },
  { key: "notifications", href: "/notifications", icon: Bell, label: { ar: "الإشعارات", en: "Notifications" }, count: unreadNotices },
];
const NAV_WORK: NavItem[] = [
  { key: "projects", href: "/projects", icon: FolderKanban, label: { ar: "مساحات العمل", en: "Workspaces" } },
  { key: "community", href: "/community", icon: Users, label: { ar: "المجتمع", en: "Community" } },
  { key: "members", href: "/members", icon: UserRound, label: { ar: "الأعضاء", en: "Members" } },
  { key: "surveys", href: "/surveys", icon: ClipboardList, label: { ar: "الاستبيانات", en: "Surveys" } },
  { key: "consultations", href: "/consultations", icon: Vote, label: { ar: "المشاورات", en: "Consultations" } },
  { key: "assistant", href: "/assistant", icon: MessageCircleQuestion, label: { ar: "اسأل", en: "Ask" } },
  { key: "library", href: "/library", icon: BookOpen, label: { ar: "المكتبة", en: "Library" } },
];
const TABS: NavItem[] = [
  { key: "dashboard", href: "/dashboard", icon: House, label: { ar: "لوحتي", en: "Home" } },
  { key: "community", href: "/community", icon: Users, label: { ar: "المجتمع", en: "Community" } },
  { key: "projects", href: "/projects", icon: FolderKanban, label: { ar: "مساحاتي", en: "Work" } },
  { key: "messages", href: "/messages", icon: MessageCircle, label: { ar: "الرسائل", en: "Messages" }, count: unreadMessages },
];

export function MemberShell({ active, children }: { active: MemberRoute; children: ReactNode }) {
  const [lang, setLang] = useLang();
  const rtl = lang === "ar";
  const tx = (t: T) => t[lang];
  const [sheet, setSheet] = useState(false);
  useEffect(() => { document.body.style.overflow = sheet ? "hidden" : ""; return () => { document.body.style.overflow = ""; }; }, [sheet]);

  const link = (item: NavItem, onClick?: () => void) => {
    const Icon = item.icon; const on = item.key === active;
    return (
      <Link key={item.key} href={item.href} className={on ? "is-active" : ""} aria-current={on ? "page" : undefined} onClick={onClick}>
        <Icon aria-hidden="true" /><span>{tx(item.label)}</span>{!!item.count && <b className="m-count">{item.count}</b>}
      </Link>
    );
  };

  return (
    <MemberCtx.Provider value={{ lang, rtl, tx }}>
      <main className="home m-area" dir={rtl ? "rtl" : "ltr"} lang={lang}>
        <SiteHeader lang={lang} onLang={setLang} current={`/${active}`} member />
        <div className="m-layout">
          <aside className="m-side" aria-label={rtl ? "منطقة الأعضاء" : "Members area"}>
            <Link href="/profile" className="m-me">
              <Avatar who={ME} size={44} />
              <span><strong>{tx(ME.name)}</strong><small>{tx(ME.role)}</small></span>
            </Link>
            <nav>
              <p className="m-side-label">{rtl ? "مساحتي" : "Mine"}</p>
              {NAV_PERSONAL.map((i) => link(i))}
              <p className="m-side-label">{rtl ? "العمل والحوار" : "Work & dialogue"}</p>
              {NAV_WORK.map((i) => link(i))}
            </nav>
            <div className="m-side-foot">
              {link({ key: "settings", href: "/settings", icon: Settings, label: { ar: "الإعدادات", en: "Settings" } })}
              <Link href="/"><Globe2 aria-hidden="true" /><span>{rtl ? "البوابة العامة" : "Public site"}</span></Link>
              <Link href="/login" className="m-logout"><LogOut aria-hidden="true" /><span>{rtl ? "تسجيل الخروج" : "Sign out"}</span></Link>
            </div>
          </aside>
          <section className="m-main">{children}</section>
        </div>

        {/* Mobile: member tab bar + full menu sheet */}
        <nav className="h-tabbar m-tabbar" aria-label={rtl ? "تنقل الأعضاء" : "Members navigation"}>
          {TABS.map((t) => { const Icon = t.icon; const on = t.key === active; return (
            <Link key={t.key} href={t.href} className={on ? "is-active" : ""} aria-current={on ? "page" : undefined}>
              <span className="h-tab-icon"><Icon />{!!t.count && <b className="m-dot">{t.count}</b>}</span><span>{tx(t.label)}</span>
            </Link>
          ); })}
          <button onClick={() => setSheet(true)} aria-expanded={sheet} className={sheet ? "is-active" : ""}><span className="h-tab-icon"><LayoutGrid /></span><span>{rtl ? "المزيد" : "More"}</span></button>
        </nav>
        <div className={`m-sheet ${sheet ? "is-open" : ""}`} aria-hidden={!sheet} onClick={() => setSheet(false)}>
          <div className="m-sheet-box" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={rtl ? "كل الأقسام" : "All sections"}>
            <div className="m-sheet-head">
              <Link href="/profile" className="m-me"><Avatar who={ME} size={40} /><span><strong>{tx(ME.name)}</strong><small>{tx(ME.role)}</small></span></Link>
              <button onClick={() => setSheet(false)} aria-label={rtl ? "إغلاق" : "Close"}><X /></button>
            </div>
            <div className="m-sheet-grid">
              {[...NAV_PERSONAL, ...NAV_WORK, { key: "settings" as const, href: "/settings", icon: Settings, label: { ar: "الإعدادات", en: "Settings" } }].map((i) => link(i, () => setSheet(false)))}
            </div>
            <div className="m-sheet-foot">
              <button onClick={() => setLang(rtl ? "en" : "ar")}>{rtl ? "English" : "العربية"}</button>
              <Link href="/">{rtl ? "البوابة العامة" : "Public site"}</Link>
              <Link href="/login" className="m-logout">{rtl ? "تسجيل الخروج" : "Sign out"}</Link>
            </div>
          </div>
        </div>
      </main>
    </MemberCtx.Provider>
  );
}

/* ── Building blocks ── */
export function Avatar({ who, size = 36 }: { who: Pick<Member, "initials"> & { tone?: number }; size?: number }) {
  const { tx } = useMember();
  const tone = "tone" in who && who.tone ? who.tone : 0;
  return <span className={`m-avatar tone-${tone}`} style={{ width: size, height: size, fontSize: size * 0.42 }} aria-hidden="true">{tx(who.initials)}</span>;
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
  return <span className="m-progress" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} aria-label={label}><i style={{ width: `${Math.min(100, value)}%` }} /></span>;
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
