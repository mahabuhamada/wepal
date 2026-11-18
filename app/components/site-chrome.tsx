"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent as RKeyboardEvent } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ArrowUp, FileText, House, LayoutGrid, Library, Menu, Newspaper, Search, X, CornerDownLeft, Languages, UserRound, Moon, Sun, MessageCircleQuestion, Shuffle, Compass, SlidersHorizontal } from "lucide-react";
import { EXTRA_PAGES, NAV, NEWS, RESOURCES, type Lang } from "./content";
import { Logo, useIdentity, type Identity } from "./identity";

const IDENTITY_LABEL: Record<Identity, { ar: string; en: string }> = {
  forum: { ar: "هوية المنتدى", en: "Forum identity" },
  palestine: { ar: "هوية فلسطين", en: "Palestine identity" },
};

function IdentitySwitch({ lang, variant }: { lang: Lang; variant: "pill" | "drawer" }) {
  const [identity, setIdentity] = useIdentity();
  const next: Identity = identity === "forum" ? "palestine" : "forum";
  if (variant === "drawer") {
    return (
      <div className="h-drawer-identity" role="group" aria-label={lang === "ar" ? "هوية الموقع" : "Site identity"}>
        {(["forum", "palestine"] as Identity[]).map((id) => (
          <button key={id} aria-pressed={identity === id} onClick={() => setIdentity(id)}><img src={`/brand/${id}/wepal-symbol.svg`} alt="" />{IDENTITY_LABEL[id][lang]}</button>
        ))}
      </div>
    );
  }
  return (
    <div className="h-identity" role="group" aria-label={lang === "ar" ? "هوية الموقع" : "Site identity"}>
      {(["forum", "palestine"] as Identity[]).map((id) => (
        <button key={id} aria-pressed={identity === id} aria-label={IDENTITY_LABEL[id][lang]} title={IDENTITY_LABEL[id][lang]} onClick={() => setIdentity(id)}><img src={`/brand/${id}/wepal-symbol.svg`} alt="" /></button>
      ))}
      <span className="h-identity-tip">{lang === "ar" ? `بدّل إلى ${IDENTITY_LABEL[next].ar}` : `Switch to ${IDENTITY_LABEL[next].en}`}</span>
    </div>
  );
}

const TABS = [
  { href: "/", icon: House, label: { ar: "الرئيسية", en: "Home" } },
  { href: "/news", icon: Newspaper, label: { ar: "الأخبار", en: "News" } },
  { href: "/library", icon: Library, label: { ar: "المكتبة", en: "Library" } },
  { href: "/login", icon: UserRound, label: { ar: "حسابي", en: "Account" } },
] as const;

const vars = (v: Record<string, string | number>) => v as CSSProperties;

/** Language preference shared by every page (saved in localStorage when available). */
export function useLang() {
  const [lang, setLang] = useState<Lang>("ar");
  useEffect(() => {
    let saved: string | null = null;
    try { saved = window.localStorage.getItem("wepal-language"); } catch { /* storage unavailable */ }
    const next: Lang = saved === "ar" || saved === "en" ? saved : navigator.language.toLowerCase().startsWith("ar") ? "ar" : "en";
    const id = requestAnimationFrame(() => setLang(next));
    return () => cancelAnimationFrame(id);
  }, []);
  const change = (next: Lang) => { setLang(next); try { window.localStorage.setItem("wepal-language", next); } catch { /* storage unavailable */ } };
  return [lang, change] as const;
}

export function SiteHeader({ lang, onLang, current }: { lang: Lang; onLang: (l: Lang) => void; current: string }) {
  const rtl = lang === "ar";
  const Arrow = rtl ? ArrowLeft : ArrowRight;
  const [scrolled, setScrolled] = useState(false);
  const [showTop, setShowTop] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [indicator, setIndicator] = useState({ x: 0, w: 0, visible: false });
  const progressRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<SVGCircleElement>(null);
  const navRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const activeIndex = Math.max(0, NAV.findIndex((n) => n.href === current));
  const hasActive = NAV.some((n) => n.href === current);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      const y = window.scrollY; const max = document.documentElement.scrollHeight - window.innerHeight; const p = max > 0 ? y / max : 0;
      setScrolled(y > 24); setShowTop(y > 700);
      if (progressRef.current) progressRef.current.style.transform = `scaleX(${p})`;
      if (ringRef.current) ringRef.current.style.strokeDashoffset = String(126 * (1 - p));
    };
    const onScroll = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(update); };
    update(); window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); cancelAnimationFrame(raf); };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPaletteOpen((o) => !o); }
      if (e.key === "Escape") { setPaletteOpen(false); setMenuOpen(false); }
    };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => { document.body.style.overflow = menuOpen || paletteOpen ? "hidden" : ""; }, [menuOpen, paletteOpen]);

  const moveIndicator = (i: number, show = true) => { const el = navRefs.current[i]; if (el) setIndicator({ x: el.offsetLeft, w: el.offsetWidth, visible: show }); };
  const resetIndicator = () => moveIndicator(activeIndex, hasActive);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { const id = window.setTimeout(resetIndicator, 60); return () => window.clearTimeout(id); }, [lang, current, scrolled]);

  return (
    <>
      <header className={`h-header ${scrolled ? "is-scrolled" : ""}`}>
        <div className="h-header-inner">
          <Link className="h-brand" href="/" aria-label="WePal"><Logo /></Link>
          <nav className="h-nav" aria-label={rtl ? "التنقل الرئيسي" : "Main navigation"} onMouseLeave={resetIndicator}>
            <span className="h-nav-indicator" style={{ width: indicator.w, transform: `translateX(${indicator.x}px)`, opacity: indicator.visible ? 1 : 0 }} />
            {NAV.map((item, i) => { const Icon = item.icon; return (
              <a key={item.href} ref={(el) => { navRefs.current[i] = el; }} href={item.href} className={item.href === current ? "is-active" : ""} aria-current={item.href === current ? "page" : undefined} onMouseEnter={() => moveIndicator(i)} onFocus={() => moveIndicator(i)}><Icon className="h-nav-icon" aria-hidden="true" />{item.label[lang]}</a>
            ); })}
          </nav>
          <div className="h-actions">
            <button className="h-search-trigger" onClick={() => setPaletteOpen(true)} aria-label={rtl ? "بحث" : "Search"}><Search size={16} /><span>{rtl ? "ابحث" : "Search"}</span><kbd>Ctrl K</kbd></button>
            <IdentitySwitch lang={lang} variant="pill" />
            <div className={`h-lang ${rtl ? "is-ar" : "is-en"}`} role="group" aria-label="Language"><span className="h-lang-thumb" /><button onClick={() => onLang("ar")} aria-pressed={rtl}>عربي</button><button onClick={() => onLang("en")} aria-pressed={!rtl}>EN</button></div>
            <button className="h-lang-mini" onClick={() => onLang(rtl ? "en" : "ar")} aria-label={rtl ? "Switch to English" : "التبديل إلى العربية"}><Languages size={16} />{rtl ? "EN" : "ع"}</button>
            <a className="h-login" href="/login">{rtl ? "دخول الأعضاء" : "Member login"}</a>
            <button className="h-burger" onClick={() => setMenuOpen(true)} aria-label={rtl ? "القائمة" : "Menu"}><Menu /></button>
          </div>
        </div>
        <div className="h-progress" ref={progressRef} />
      </header>

      <div className={`h-drawer ${menuOpen ? "is-open" : ""}`} aria-hidden={!menuOpen}>
        <div className="h-drawer-top"><Logo variant="reverse" /><button onClick={() => setMenuOpen(false)} aria-label={rtl ? "إغلاق" : "Close"}><X /></button></div>
        <nav>{NAV.map((item, i) => { const Icon = item.icon; return <a key={item.href} href={item.href} className={item.href === current ? "is-active" : ""} style={vars({ "--i": i })} onClick={() => setMenuOpen(false)}><span>0{i + 1}</span><Icon size={20} />{item.label[lang]}<Arrow size={18} /></a>; })}</nav>
        <div className="h-drawer-lang" role="group" aria-label={rtl ? "اللغة" : "Language"}><button aria-pressed={rtl} onClick={() => onLang("ar")}>العربية</button><button aria-pressed={!rtl} onClick={() => onLang("en")}>English</button></div>
        <IdentitySwitch lang={lang} variant="drawer" />
        <div className="h-drawer-foot"><button onClick={() => { setMenuOpen(false); setPaletteOpen(true); }}><Search size={17} />{rtl ? "بحث" : "Search"}</button><a href="/login">{rtl ? "دخول الأعضاء" : "Member login"}</a></div>
      </div>


      <nav className="h-tabbar" aria-label={rtl ? "التنقل السريع" : "Quick navigation"}>
        {TABS.map((t) => { const Icon = t.icon; const active = t.href === current; return (
          <a key={t.href} href={t.href} className={active ? "is-active" : ""} aria-current={active ? "page" : undefined} onClick={(e) => { if (active) { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); } }}><span className="h-tab-icon"><Icon /></span><span>{t.label[lang]}</span></a>
        ); })}
        <button onClick={() => setMenuOpen(true)} className={menuOpen ? "is-active" : ""} aria-label={rtl ? "القائمة الكاملة" : "Full menu"} aria-expanded={menuOpen}><span className="h-tab-icon"><LayoutGrid /></span><span>{rtl ? "المزيد" : "More"}</span></button>
      </nav>
      {paletteOpen && <SearchPalette lang={lang} onClose={() => setPaletteOpen(false)} />}

      <button className={`h-top ${showTop ? "is-visible" : ""}`} onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label={rtl ? "إلى الأعلى" : "Back to top"}>
        <svg className="h-top-svg" viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="22" r="20" /><circle ref={ringRef} cx="22" cy="22" r="20" className="h-top-ring" /></svg><ArrowUp size={18} />
      </button>
    </>
  );
}

function SearchPalette({ lang, onClose }: { lang: Lang; onClose: () => void }) {
  const rtl = lang === "ar";
  const Arrow = rtl ? ArrowLeft : ArrowRight;
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const all = useMemo(() => [
    ...NAV.map((n) => ({ group: rtl ? "صفحات" : "Pages", title: n.label[lang], href: n.href, icon: n.icon })),
    ...EXTRA_PAGES.map((n) => ({ group: rtl ? "صفحات" : "Pages", title: n.label[lang], href: n.href, icon: CornerDownLeft })),
    ...NEWS.map((n) => ({ group: rtl ? "أخبار" : "News", title: n.title[lang], href: "/news", icon: Newspaper })),
    ...RESOURCES.map((r) => ({ group: rtl ? "المكتبة" : "Library", title: r.title[lang], href: "/library", icon: FileText })),
  ], [lang, rtl]);
  const results = useMemo(() => { const s = q.trim().toLowerCase(); return (s ? all.filter((a) => a.title.toLowerCase().includes(s)) : all.slice(0, 7)).slice(0, 9); }, [q, all]);

  const onKey = (e: RKeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(results.length - 1, s + 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); }
    if (e.key === "Enter" && results[sel]) window.location.href = results[sel].href;
  };

  return (
    <div className="h-palette" role="dialog" aria-modal="true" aria-label={rtl ? "بحث" : "Search"} onClick={onClose}>
      <div className="h-palette-box" onClick={(e) => e.stopPropagation()} dir={rtl ? "rtl" : "ltr"}>
        <label><Search size={20} /><input ref={inputRef} value={q} onChange={(e) => { setQ(e.target.value); setSel(0); }} onKeyDown={onKey} placeholder={rtl ? "ابحث في الصفحات والأخبار والمكتبة…" : "Search pages, news and library…"} /><kbd>Esc</kbd></label>
        <ul>
          {results.map((r, i) => { const Icon = r.icon; return <li key={r.group + r.title}><a href={r.href} className={i === sel ? "is-sel" : ""} onMouseEnter={() => setSel(i)}><Icon size={17} /><span>{r.title}</span><small>{r.group}</small><Arrow size={15} /></a></li>; })}
          {results.length === 0 && <li className="h-palette-empty">{rtl ? "لا توجد نتائج" : "No results"}</li>}
        </ul>
        <div className="h-palette-foot"><span><kbd>↑</kbd><kbd>↓</kbd>{rtl ? "للتنقل" : "navigate"}</span><span><kbd>Enter</kbd>{rtl ? "للفتح" : "open"}</span></div>
      </div>
    </div>
  );
}

const QUESTIONS = [
  { ar: "ما الذي يجعل الحوار مثمرًا لا مجرد تبادل آراء؟", en: "What makes a dialogue productive, not just an exchange of opinions?" },
  { ar: "كيف نختلف دون أن نخسر بعضنا؟", en: "How do we disagree without losing each other?" },
  { ar: "ما المصدر الذي تثق به أكثر، ولماذا؟", en: "Which source do you trust most, and why?" },
  { ar: "متى كانت آخر مرة غيّر فيها نقاشٌ رأيك؟", en: "When did a conversation last change your mind?" },
  { ar: "ما القضية التي تتمنى أن نتحدث عنها أكثر؟", en: "Which issue do you wish we talked about more?" },
];

function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const id = requestAnimationFrame(() => setMounted(true)); return () => cancelAnimationFrame(id); }, []);
  return mounted;
}

function PalestineClock({ lang }: { lang: Lang }) {
  const mounted = useMounted();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const id = window.setInterval(() => setNow(new Date()), 15000); return () => window.clearInterval(id); }, []);
  const locale = lang === "ar" ? "ar-PS" : "en-GB";
  const time = mounted ? new Intl.DateTimeFormat(locale, { timeZone: "Asia/Hebron", hour: "2-digit", minute: "2-digit" }).format(now) : "--:--";
  const day = mounted ? new Intl.DateTimeFormat(locale, { timeZone: "Asia/Hebron", weekday: "long", day: "numeric", month: "long" }).format(now) : "";
  const hour = mounted ? Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Hebron", hour: "numeric", hourCycle: "h23" }).format(now)) : 12;
  const night = hour < 6 || hour >= 19;
  return (
    <div className="f-clock">
      <span className="f-label">{night ? <Moon size={14} /> : <Sun size={14} />}{lang === "ar" ? "الآن في فلسطين" : "Now in Palestine"}</span>
      <strong dir="ltr">{time}</strong>
      <small>{day}</small>
    </div>
  );
}

export function SiteFooter({ lang, onLang }: { lang: Lang; onLang?: (l: Lang) => void }) {
  const rtl = lang === "ar";
  const Arrow = rtl ? ArrowLeft : ArrowRight;
  const [identity, setIdentity] = useIdentity();
  const [q, setQ] = useState(0);
  useEffect(() => { const id = requestAnimationFrame(() => setQ(Math.floor(Date.now() / 86400000) % QUESTIONS.length)); return () => cancelAnimationFrame(id); }, []);
  const latest = NEWS[0];
  const links = [...NAV.slice(1), ...EXTRA_PAGES];
  return (
    <footer className="f-footer">
      <div className="h-wrap">
        <div className="f-bento">
          <section className="f-card f-brand">
            <Logo variant="reverse" />
            <p>{rtl ? "منصة فلسطينية للمعرفة والحوار العام." : "A Palestinian platform for knowledge and public dialogue."}</p>
            <PalestineClock lang={lang} />
          </section>

          <section className="f-card f-question" aria-live="polite">
            <span className="f-label"><MessageCircleQuestion size={14} />{rtl ? "سؤال اليوم" : "Question of the day"}</span>
            <p key={q}>{QUESTIONS[q][lang]}</p>
            <div className="f-question-actions">
              <a href="/login">{rtl ? "شارك برأيك" : "Share your view"}<Arrow size={15} /></a>
              <button onClick={() => setQ((x) => (x + 1) % QUESTIONS.length)} aria-label={rtl ? "سؤال آخر" : "Another question"}><Shuffle size={15} /></button>
            </div>
          </section>

          <a className="f-card f-latest" href="/news">
            <img src={latest.img} alt="" />
            <div>
              <span className="f-label"><span className="f-live" />{rtl ? "الأحدث" : "Latest"}</span>
              <h4>{latest.title[lang]}</h4>
            </div>
            <span className="f-go"><Arrow size={16} /></span>
          </a>

          <nav className="f-card f-links" aria-label={rtl ? "روابط سريعة" : "Quick links"}>
            <span className="f-label"><Compass size={14} />{rtl ? "إلى أين؟" : "Where to?"}</span>
            <div>{links.map((n) => <a key={n.href} href={n.href}>{n.label[lang]}</a>)}</div>
          </nav>

          <section className="f-card f-prefs">
            <span className="f-label"><SlidersHorizontal size={14} />{rtl ? "تفضيلاتك" : "Your preferences"}</span>
            {onLang && <div className="f-seg" role="group" aria-label={rtl ? "اللغة" : "Language"}><button aria-pressed={rtl} onClick={() => onLang("ar")}>العربية</button><button aria-pressed={!rtl} onClick={() => onLang("en")}>English</button></div>}
            <div className="f-seg" role="group" aria-label={rtl ? "هوية الموقع" : "Site identity"}>
              {(["forum", "palestine"] as Identity[]).map((id) => <button key={id} aria-pressed={identity === id} onClick={() => setIdentity(id)}><img src={`/brand/${id}/wepal-symbol.svg`} alt="" />{IDENTITY_LABEL[id][lang]}</button>)}
            </div>
          </section>
        </div>

        <div className="f-bottom"><span>© 2026 WePal. {rtl ? "جميع الحقوق محفوظة." : "All rights reserved."}</span><span className="wp-dots" aria-hidden="true"><i /><i /><i /></span><span>{rtl ? "صُنع في فلسطين" : "Made in Palestine"}</span></div>
      </div>
    </footer>
  );
}
