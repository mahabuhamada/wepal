"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent, type MouseEvent as RMouseEvent, type ReactNode } from "react";
import {
  ArrowLeft, ArrowRight, BookHeart, BookOpen, Check, ChevronLeft, ChevronRight, Compass, Download, FileText,
  Languages, Layers3, Library, Map as MapIcon, MessageCircle, Newspaper, PenLine, Play, Quote, Search, ShieldCheck,
  Sparkles, Users, X,
} from "lucide-react";
import { useReveal } from "./components/use-reveal";
import { L, NEWS, NEWS_FILTERS, RESOURCES, RES_TYPES, type NewsCat, type ResType, type T } from "./components/content";
import { SiteFooter, SiteHeader, useLang } from "./components/site-chrome";
import { Logo } from "./components/identity";
const vars = (v: Record<string, string | number>) => v as CSSProperties;

/* ───────── Content ───────── */


const EXPLORE = [
  { href: "/news", icon: Newspaper, title: L("الأخبار", "News"), text: L("الخبر في سياقه مع مصادر يمكن تتبّعها.", "News in context, with traceable sources.") },
  { href: "/library", icon: Library, title: L("المكتبة", "Library"), text: L("دراسات وأدلة ووثائق في مكان واحد.", "Studies, guides and documents in one place.") },
  { href: "/blog", icon: PenLine, title: L("رأي وتحليل", "Analysis"), text: L("قراءات تضع الحدث في سياقه الأوسع.", "Readings that place events in context.") },
  { href: "/outputs", icon: Layers3, title: L("المخرجات", "Outputs"), text: L("تقارير وأوراق سياسات قابلة للتحميل.", "Reports and policy papers to download.") },
  { href: "/stories", icon: BookHeart, title: L("القصص", "Stories"), text: L("أصوات وتجارب فلسطينية حقيقية.", "Real Palestinian voices and experiences.") },
  { href: "/map", icon: MapIcon, title: L("عالم المنتدى", "Ecosystem"), text: L("المبادرات والشركاء والمساحات المرتبطة.", "Connected initiatives, partners and spaces.") },
];


const PATHS = [
  { icon: Newspaper, img: "/images/nablus.webp", href: "/news", title: L("افهم الخبر", "Understand the news"), text: L("سياق مختصر ومصادر واضحة بعيدًا عن الضجيج، لتعرف ما الذي يحدث ولماذا.", "Concise context and clear sources, away from the noise, so you know what is happening and why.") },
  { icon: BookOpen, img: "/images/library.webp", href: "/library", title: L("تعمّق في المعرفة", "Go deeper"), text: L("وثائق ودراسات ومواد مرجعية مرتبة في مكان واحد لتكوين صورة كاملة.", "Documents, studies and references organized in one place for the full picture.") },
  { icon: MessageCircle, img: "/images/facilitators.webp", href: "/login", title: L("شارك في الحوار", "Join the dialogue"), text: L("مساحة تحترم الرأي وتحمي الاختلاف وتدفع النقاش إلى الأمام.", "A space that respects opinion, protects difference and moves discussion forward.") },
  { icon: BookHeart, img: "/images/gaza.webp", href: "/stories", title: L("اصنع الأثر", "Make an impact"), text: L("حين تتحول الفكرة إلى مبادرة، والقصة إلى معرفة مشتركة.", "When an idea becomes an initiative, and a story becomes shared knowledge.") },
];


const ANALYSIS = [
  { img: "/images/nablus.webp", label: L("قراءة معمقة", "In-depth"), title: L("حين تصبح المعرفة مدخلًا للمشاركة لا مجرد أرشيف", "When knowledge becomes a gateway to participation"), text: L("كيف يمكن لمنصة عامة أن تقرّب الوثيقة من الناس وتحوّلها إلى سؤال ونقاش؟", "How can a public platform bring documents closer to people and turn them into dialogue?") },
  { label: L("وجهة نظر", "Viewpoint"), title: L("مساحة الاختلاف: ما الذي يجعل الحوار منتجًا؟", "A space for difference: what makes dialogue productive?"), text: L("الاستماع، والسياق، والحق في السؤال؛ ثلاثة مفاتيح لنقاش أكثر نضجًا.", "Listening, context and the right to ask: three keys to a more mature discussion.") },
  { label: L("دروس", "Lessons"), title: L("دروس من تجارب المصالحة الدولية", "Lessons from international reconciliation"), text: L("ما الذي يمكن أن نتعلمه من تجارب الآخرين دون أن ننسخها؟", "What can we learn from others' experiences without copying them?") },
];

const PRINCIPLES = [
  { icon: ShieldCheck, title: L("مصادر يمكن الرجوع إليها", "Traceable sources"), text: L("لكل معلومة مرجع واضح يمكنك تتبّعه.", "Every piece of information has a clear reference.") },
  { icon: Languages, title: L("لغة واضحة وقريبة", "Clear, accessible language"), text: L("نكتب للناس، لا للنخبة فقط.", "We write for people, not just for experts.") },
  { icon: Users, title: L("اختلاف بلا إقصاء", "Difference without exclusion"), text: L("مساحة تتسع لأكثر من وجهة نظر.", "Room for more than one point of view.") },
  { icon: Compass, title: L("معرفة تتحول إلى مشاركة", "Knowledge into participation"), text: L("من القراءة إلى الفهم إلى الفعل.", "From reading to understanding to action.") },
];

const STORIES = [
  { img: "/images/facilitators.webp", tag: L("من الميدان", "From the field"), title: L("حين يمنح الحوار الشباب فرصة لتسمية ما يريدون تغييره", "When dialogue lets young people name what they want to change") },
  { img: "/images/gaza.webp", tag: L("حكاية مكان", "A story of place"), title: L("المدينة كما يرويها أهلها", "The city, as told by its people") },
  { img: "/images/nablus.webp", tag: L("مبادرة", "Initiative"), title: L("من سؤال صغير بدأت مبادرة كاملة", "A whole initiative began with one question") },
  { img: "/images/library.webp", tag: L("ذاكرة", "Memory"), title: L("المكتبة بوصفها بيتًا للأسئلة", "The library as a home for questions") },
];


const TOPICS = [L("الحوار والمصالحة", "Dialogue & reconciliation"), L("الشأن العام", "Public affairs"), L("الشباب والمشاركة", "Youth participation"), L("الثقافة والهوية", "Culture & identity"), L("المعرفة المفتوحة", "Open knowledge"), L("قصص من الميدان", "Stories from the field")];
const ROTATE = [L("الحوار", "dialogue"), L("المصالحة", "reconciliation"), L("الشأن العام", "public affairs"), L("المعرفة", "knowledge")];

/* ───────── Small interactive primitives ───────── */

const prefersReducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [value, setValue] = useState(0);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    if (prefersReducedMotion() || typeof IntersectionObserver === "undefined") { const id = requestAnimationFrame(() => setValue(to)); return () => cancelAnimationFrame(id); }
    let raf = 0;
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return; io.disconnect();
      const start = performance.now();
      const step = (now: number) => { const p = Math.min(1, (now - start) / 1400); setValue(Math.round(to * (1 - Math.pow(1 - p, 3)))); if (p < 1) raf = requestAnimationFrame(step); };
      raf = requestAnimationFrame(step);
    }, { threshold: 0.6 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [to]);
  return <span ref={ref}>{value}{suffix}</span>;
}

/** Card that tilts toward the cursor and shows a spotlight where the pointer is. */
function Tilt({ className = "", children, href }: { className?: string; children: ReactNode; href?: string }) {
  const onMove = (e: RMouseEvent<HTMLElement>) => {
    const el = e.currentTarget; const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width; const y = (e.clientY - r.top) / r.height;
    el.style.setProperty("--rx", `${(0.5 - y) * 7}deg`); el.style.setProperty("--ry", `${(x - 0.5) * 9}deg`);
    el.style.setProperty("--px", `${x * 100}%`); el.style.setProperty("--py", `${y * 100}%`);
  };
  const onLeave = (e: RMouseEvent<HTMLElement>) => { const el = e.currentTarget; el.style.setProperty("--rx", "0deg"); el.style.setProperty("--ry", "0deg"); };
  return href
    ? <a href={href} className={`h-tilt ${className}`} onMouseMove={onMove} onMouseLeave={onLeave}>{children}</a>
    : <article className={`h-tilt ${className}`} onMouseMove={onMove} onMouseLeave={onLeave}>{children}</article>;
}

/** Link that is gently pulled toward the cursor. */
function Magnetic({ href, className, children }: { href: string; className: string; children: ReactNode }) {
  const onMove = (e: RMouseEvent<HTMLAnchorElement>) => {
    const el = e.currentTarget; const r = el.getBoundingClientRect();
    el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.18}px, ${(e.clientY - r.top - r.height / 2) * 0.28}px)`;
  };
  return <a href={href} className={className} onMouseMove={onMove} onMouseLeave={(e) => { e.currentTarget.style.transform = ""; }}>{children}</a>;
}

function SectionHead({ index, kicker, title, text, action, light }: { index: string; kicker: string; title: string; text?: string; action?: ReactNode; light?: boolean }) {
  return (
    <div className={`h-head ${light ? "is-light" : ""}`} data-reveal>
      <div className="h-head-main"><span className="h-head-kicker"><b>{index}</b>{kicker}</span><h2>{title}</h2></div>
      {(text || action) && <div className="h-head-side">{text && <p>{text}</p>}{action}</div>}
    </div>
  );
}

/* ───────── Page ───────── */

export default function Home() {
  const [lang, changeLang] = useLang();
  const rtl = lang === "ar";
  const Arrow = rtl ? ArrowLeft : ArrowRight;
  const tx = (v: T) => v[lang];

  const [wordIndex, setWordIndex] = useState(0);
  const [newsFilter, setNewsFilter] = useState<"all" | NewsCat>("all");
  const [pathIndex, setPathIndex] = useState(0);
  const [resQuery, setResQuery] = useState("");
  const [resType, setResType] = useState<"all" | ResType>("all");
  const [subscribed, setSubscribed] = useState(false);
  const storiesRef = useRef<HTMLDivElement>(null);
  const storiesBarRef = useRef<HTMLSpanElement>(null);

  useReveal("[data-reveal], [data-stagger]", [lang]);

  // Rotating hero word
  useEffect(() => { if (prefersReducedMotion()) return; const id = window.setInterval(() => setWordIndex((i) => (i + 1) % ROTATE.length), 2600); return () => window.clearInterval(id); }, []);

  // Hero parallax
  const onHeroMove = (e: RMouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", String((e.clientX - r.left) / r.width - 0.5));
    e.currentTarget.style.setProperty("--my", String((e.clientY - r.top) / r.height - 0.5));
  };

  // Why-section spotlight
  const onSpot = (e: RMouseEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--sx", `${e.clientX - r.left}px`); e.currentTarget.style.setProperty("--sy", `${e.clientY - r.top}px`);
  };

  // Stories carousel
  const onStoriesScroll = () => {
    const el = storiesRef.current; if (!el || !storiesBarRef.current) return;
    const max = el.scrollWidth - el.clientWidth; const p = max > 0 ? Math.abs(el.scrollLeft) / max : 0;
    storiesBarRef.current.style.transform = `scaleX(${0.25 + p * 0.75})`;
  };
  const slideStories = (dir: 1 | -1) => {
    const el = storiesRef.current; if (!el) return;
    const card = el.querySelector<HTMLElement>(".h-story"); const step = (card?.offsetWidth ?? 320) + 18;
    el.scrollBy({ left: dir * step * (rtl ? -1 : 1), behavior: "smooth" });
  };

  const news = useMemo(() => NEWS.filter((n) => newsFilter === "all" || n.cat === newsFilter), [newsFilter]);
  const resources = useMemo(() => {
    const q = resQuery.trim().toLowerCase();
    return RESOURCES.filter((r) => (resType === "all" || r.type === resType) && (!q || r.title[lang].toLowerCase().includes(q) || r.meta[lang].toLowerCase().includes(q)));
  }, [resQuery, resType, lang]);
  const typeCount = (id: "all" | ResType) => (id === "all" ? RESOURCES.length : RESOURCES.filter((r) => r.type === id).length);
  const typeLabel = (id: ResType) => tx(RES_TYPES.find((t) => t.id === id)!.label);

  const headline = rtl ? ["نبدأ من صوتٍ حقيقي،", "ونبني ما يبقى."] : ["We start with a real voice,", "and build what lasts."];

  return (
    <main className="home" dir={rtl ? "rtl" : "ltr"} lang={lang}>
      <SiteHeader lang={lang} onLang={changeLang} current="/" />
      {/* ── Hero ── */}
      <section id="top" className="h-hero">
        <div className="h-hero-bg" aria-hidden="true"><span className="h-blob h-blob-1" /><span className="h-blob h-blob-2" /><span className="h-grid-lines" /></div>
        <div className="h-wrap h-hero-grid">
          <div className="h-hero-copy">
            <span className="h-chip"><span className="h-pulse" />{rtl ? "منصة فلسطينية للمعرفة والحوار" : "A Palestinian platform for knowledge & dialogue"}</span>
            <h1>{headline.map((line, li) => <span className="h-line" key={li}>{line.split(" ").map((w, wi) => <span className="h-word" key={wi} style={vars({ "--i": li * 4 + wi })}>{w}&nbsp;</span>)}</span>)}</h1>
            <p className="h-rotator">{rtl ? "مساحة آمنة لـ" : "A safe space for"}<span className="h-rotator-window"><span className="h-rotator-word" key={wordIndex}>{tx(ROTATE[wordIndex])}</span></span></p>
            <p className="h-intro">{rtl ? "أخبار ومصادر وتحليلات موثوقة، مفتوحة للجميع، عن الحوار والمصالحة والشأن العام الفلسطيني." : "Trusted news, resources and analysis — open to everyone — on dialogue, reconciliation and Palestinian public affairs."}</p>
            <div className="h-ctas">
              <Magnetic href="#news" className="h-btn h-btn-primary">{rtl ? "تصفّح الأخبار" : "Browse news"}<span className="h-btn-icon"><Arrow size={18} /></span></Magnetic>
              <Magnetic href="#library" className="h-btn h-btn-ghost"><Library size={18} />{rtl ? "استكشف المكتبة" : "Explore the library"}</Magnetic>
            </div>
            <dl className="h-stats">
              <div><dt><Counter to={6} /></dt><dd>{rtl ? "أقسام معرفية" : "Knowledge sections"}</dd></div>
              <div><dt><Counter to={4} /></dt><dd>{rtl ? "موضوعات نتابعها" : "Topics we follow"}</dd></div>
              <div><dt><Counter to={2} /></dt><dd>{rtl ? "لغتان للقراءة" : "Reading languages"}</dd></div>
            </dl>
          </div>
          <div className="h-hero-visual" onMouseMove={onHeroMove} onMouseLeave={(e) => { e.currentTarget.style.setProperty("--mx", "0"); e.currentTarget.style.setProperty("--my", "0"); }}>
            <figure className="h-shot h-shot-main"><img src="/images/facilitators.webp" alt={rtl ? "شباب في جلسة حوار" : "Young people in a dialogue session"} /><button className="h-play" aria-label={rtl ? "شاهد القصة" : "Watch story"}><Play size={18} fill="currentColor" /></button><figcaption><span className="h-pulse" />{rtl ? "مساحة آمنة لحوارٍ فلسطيني أوسع" : "A safe space for a wider Palestinian dialogue"}</figcaption></figure>
            <figure className="h-shot h-shot-a"><img src="/images/gaza.webp" alt="" /></figure>
            <figure className="h-shot h-shot-b"><img src="/images/library.webp" alt="" /></figure>
            <div className="h-float h-float-1"><MessageCircle size={18} />{rtl ? "الحوار يبدأ بالاستماع" : "Dialogue starts by listening"}</div>
            <div className="h-float h-float-2"><span className="h-avatars"><i>ل</i><i>أ</i><i>ن</i></span>{rtl ? "مساحة للجميع" : "A space for everyone"}</div>
          </div>
        </div>
        <div className="h-marquee" aria-label={rtl ? "موضوعات نتابعها" : "Topics we follow"}>
          <div className="h-marquee-row">{[...TOPICS, ...TOPICS].map((t, i) => <a key={i} href="#news" aria-hidden={i >= TOPICS.length} tabIndex={i >= TOPICS.length ? -1 : 0}><Sparkles size={14} />{tx(t)}</a>)}</div>
        </div>
      </section>

      {/* ── Explore ── */}
      <section id="explore" className="h-section">
        <div className="h-wrap">
          <SectionHead index="01" kicker={rtl ? "استكشف ويبال" : "Explore Wepal"} title={rtl ? "كل ما تحتاجه، مرتب في ستة أبواب." : "Everything you need, organized into six doors."} text={rtl ? "اختر الباب الذي يناسبك وابدأ من هناك." : "Pick the door that fits you and start there."} />
          <div className="h-explore" data-stagger>
            {EXPLORE.map((e, i) => { const Icon = e.icon; return (
              <a key={e.href} href={e.href} className="h-tile" style={vars({ "--i": i })}>
                <span className="h-tile-num">0{i + 1}</span><span className="h-tile-icon"><Icon /></span>
                <h3>{tx(e.title)}</h3><p>{tx(e.text)}</p><span className="h-tile-go"><Arrow size={18} /></span>
              </a>); })}
          </div>
        </div>
      </section>

      {/* ── News ── */}
      <section id="news" className="h-section h-section-tint">
        <div className="h-wrap">
          <SectionHead index="02" kicker={rtl ? "الآن في ويبال" : "Now on Wepal"} title={rtl ? "أخبار تستحق أن تُقرأ بهدوء، وتُناقش بعمق." : "News worth reading calmly and discussing deeply."}
            action={<a className="h-link" href="/news">{rtl ? "كل الأخبار" : "All news"}<Arrow size={16} /></a>} />
          <div className="h-tabs" role="tablist" data-reveal>
            {NEWS_FILTERS.map((f) => <button key={f.id} role="tab" aria-selected={newsFilter === f.id} className={newsFilter === f.id ? "is-active" : ""} onClick={() => setNewsFilter(f.id)}>{tx(f.label)}<small>{f.id === "all" ? NEWS.length : NEWS.filter((n) => n.cat === f.id).length}</small></button>)}
          </div>
          <div className="h-news" key={newsFilter}>
            {news[0] && <Tilt href="/news" className="h-news-feature"><img src={news[0].img} alt="" /><div><span className="h-tag">{tx(NEWS_FILTERS.find((f) => f.id === news[0].cat)!.label)} · {tx(news[0].kind)}</span><h3>{tx(news[0].title)}</h3><p>{tx(news[0].text)}</p><span className="h-read">{rtl ? "اقرأ القصة" : "Read story"}<Arrow size={16} /></span></div></Tilt>}
            <div className="h-news-list">
              {news.slice(1, 5).map((n, i) => (
                <a key={n.title.en} href="/news" className="h-news-row" style={vars({ "--i": i + 1 })}>
                  <img src={n.img} alt="" /><div><span className="h-tag">{tx(n.kind)}</span><h3>{tx(n.title)}</h3></div><span className="h-row-go"><Arrow size={16} /></span>
                </a>
              ))}
              {news.length === 1 && <div className="h-news-more"><Newspaper /><p>{rtl ? "المزيد من هذا الموضوع في صفحة الأخبار." : "More on this topic on the news page."}</p><a className="h-link" href="/news">{rtl ? "كل الأخبار" : "All news"}<Arrow size={16} /></a></div>}
            </div>
          </div>
        </div>
      </section>

      {/* ── Paths ── */}
      <section id="paths" className="h-section h-dark">
        <div className="h-wrap">
          <SectionHead light index="03" kicker={rtl ? "مسارات تفتح النقاش" : "Paths that open dialogue"} title={rtl ? "من الخبر، إلى الفهم، وصولًا إلى الأثر." : "From news, to understanding, to impact."} text={rtl ? "مرّر أو اضغط على أي مرحلة لترى تفاصيلها." : "Hover or tap any stage to see its details."} />
          <div className="h-paths" data-reveal>
            {PATHS.map((p, i) => { const Icon = p.icon; const open = pathIndex === i; return (
              <article key={p.href} className={`h-path ${open ? "is-open" : ""}`} onMouseEnter={() => setPathIndex(i)} onClick={() => setPathIndex(i)}>
                <img src={p.img} alt="" />
                <button className="h-path-head" onFocus={() => setPathIndex(i)} aria-expanded={open}><span className="h-path-num">0{i + 1}</span><span className="h-path-icon"><Icon /></span><h3>{tx(p.title)}</h3></button>
                <div className="h-path-body"><p>{tx(p.text)}</p><a href={p.href} className="h-link is-light">{rtl ? "ابدأ هذا المسار" : "Start this path"}<Arrow size={16} /></a></div>
                <span className="h-path-bar" />
              </article>); })}
          </div>
        </div>
      </section>

      {/* ── Library ── */}
      <section id="library" className="h-section">
        <div className="hr-divider" aria-hidden="true"><img src="/heritage/divider-dots.svg" alt="" /></div>
        <div className="h-wrap h-library">
          <div className="h-library-side" data-reveal>
            <span className="h-head-kicker"><b>04</b>{rtl ? "مكتبة معرفة مفتوحة" : "An open knowledge library"}</span>
            <h2>{rtl ? "مصادر تساعدك على رؤية الصورة كاملة." : "Sources that help you see the full picture."}</h2>
            <label className="h-search"><Search size={19} /><input value={resQuery} onChange={(e) => setResQuery(e.target.value)} placeholder={rtl ? "ابحث عن موضوع أو وثيقة…" : "Search a topic or document…"} aria-label={rtl ? "البحث في المكتبة" : "Search the library"} />{resQuery && <button onClick={() => setResQuery("")} aria-label={rtl ? "مسح" : "Clear"}><X size={16} /></button>}</label>
            <div className="h-chips">{RES_TYPES.map((t) => <button key={t.id} className={resType === t.id ? "is-active" : ""} onClick={() => setResType(t.id)}>{tx(t.label)}<small>{typeCount(t.id)}</small></button>)}</div>
            <a className="h-link" href="/library">{rtl ? "افتح المكتبة كاملة" : "Open the full library"}<Arrow size={16} /></a>
          </div>
          <div className="h-library-main" data-reveal>
            <div className="h-results-head"><strong>{rtl ? "النتائج" : "Results"}</strong><span><b>{resources.length}</b> {rtl ? "مادة" : "items"}</span></div>
            <div className="h-res-list" key={resType}>
              {resources.map((r, i) => (
                <a key={r.title.en} href="/library" className={`h-res h-res-${r.type}`} style={vars({ "--i": i })}>
                  <span className="h-res-icon">{r.type === "video" ? <Play size={20} /> : <FileText size={20} />}</span>
                  <div><span className="h-tag">{typeLabel(r.type)}</span><h3>{tx(r.title)}</h3><p>{tx(r.meta)}</p></div>
                  <span className="h-res-actions"><span className="h-res-dl" aria-hidden="true"><Download size={16} /></span><span className="h-row-go"><Arrow size={16} /></span></span>
                </a>
              ))}
              {resources.length === 0 && <div className="h-empty"><Search /><strong>{rtl ? "لا توجد نتائج مطابقة" : "No matching results"}</strong><p>{rtl ? "جرّب كلمة أخرى أو اختر نوعًا مختلفًا." : "Try another word or a different type."}</p><button onClick={() => { setResQuery(""); setResType("all"); }}>{rtl ? "إعادة الضبط" : "Reset"}</button></div>}
            </div>
          </div>
        </div>
      </section>

      {/* ── Analysis ── */}
      <section id="analysis" className="h-section h-section-tint">
        <div className="h-wrap">
          <SectionHead index="05" kicker={rtl ? "رأي وتحليل" : "Opinion & analysis"} title={rtl ? "قراءات تضع الأحداث في سياقها." : "Readings that put events in context."} action={<a className="h-link" href="/blog">{rtl ? "كل التحليلات" : "All analysis"}<Arrow size={16} /></a>} />
          <div className="h-analysis" data-stagger>
            {ANALYSIS.map((a, i) => (
              <div key={a.title.en} style={vars({ "--i": i })} className={i === 0 ? "h-analysis-lead" : ""}>
                <Tilt href="/blog" className={`h-acard ${a.img ? "has-img" : ""} h-acard-${i}`}>
                  {a.img && <img src={a.img} alt="" />}
                  {!a.img && <Quote className="h-acard-quote" />}
                  <div><span className="h-tag">{tx(a.label)}</span><h3>{tx(a.title)}</h3><p>{tx(a.text)}</p>
                    <span className="h-author"><i>{rtl ? "و" : "W"}</i><span>{rtl ? "فريق تحرير ويبال" : "Wepal editorial team"}</span><Arrow size={16} /></span></div>
                </Tilt>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why ── */}
      <section id="why" className="h-why" onMouseMove={onSpot}>
        <div className="h-wrap h-why-grid">
          <div data-reveal>
            <span className="h-head-kicker is-light"><b>06</b>{rtl ? "لماذا ويبال؟" : "Why Wepal?"}</span>
            <h2>{rtl ? "لأن الحوار الجاد يبدأ من معلومة موثوقة، ويكبر باحترام الاختلاف." : "Serious dialogue starts with trusted information and grows through respect for difference."}</h2>
            <p>{rtl ? "نبني مساحة عامة تجمع المعرفة بالحوار، وتقرّب القضايا الفلسطينية من الناس بلغة واضحة ومسؤولة." : "We are building a public space that brings knowledge and dialogue together, making Palestinian issues clearer and closer to people."}</p>
            <Magnetic href="/about" className="h-btn h-btn-light">{rtl ? "تعرّف إلى المنصة" : "Learn about Wepal"}<span className="h-btn-icon"><Arrow size={18} /></span></Magnetic>
          </div>
          <ol className="h-principles" data-stagger>
            {PRINCIPLES.map((p, i) => { const Icon = p.icon; return <li key={p.title.en} style={vars({ "--i": i })}><span className="h-pr-icon"><Icon /></span><div><strong>{tx(p.title)}</strong><p>{tx(p.text)}</p></div><b>0{i + 1}</b></li>; })}
          </ol>
        </div>
      </section>

      {/* ── Stories ── */}
      <section id="stories" className="h-section">
        <div className="hr-divider" aria-hidden="true"><img src="/heritage/divider-stitch.svg" alt="" /></div>
        <div className="h-wrap">
          <SectionHead index="07" kicker={rtl ? "أصوات وقصص" : "Voices & stories"} title={rtl ? "وراء كل قضية حكاية تستحق أن تُسمع." : "Every issue carries a story worth hearing."}
            action={<div className="h-carousel-nav"><button onClick={() => slideStories(-1)} aria-label={rtl ? "السابق" : "Previous"}>{rtl ? <ChevronRight /> : <ChevronLeft />}</button><button onClick={() => slideStories(1)} aria-label={rtl ? "التالي" : "Next"}>{rtl ? <ChevronLeft /> : <ChevronRight />}</button></div>} />
        <div className="h-stories" ref={storiesRef} onScroll={onStoriesScroll} data-reveal>
          {STORIES.map((s, i) => (
            <a key={s.title.en} href="/stories" className={`h-story ${i === 0 ? "is-wide" : ""}`}>
              <img src={s.img} alt="" /><div><span className="h-tag">{tx(s.tag)}</span><h3>{tx(s.title)}</h3><span className="h-read">{rtl ? "اقرأ القصة" : "Read story"}<Arrow size={16} /></span></div>
            </a>
          ))}
        </div>
          <div className="h-stories-progress"><span ref={storiesBarRef} /></div>
        </div>
      </section>

      {/* ── Join ── */}
      <section id="join" className="h-section h-join-section">
        <div className="h-wrap h-join">
          <div className="h-partner" data-reveal>
            <div className="h-partner-mark"><Logo className="h-wepal-mark" /><span>×</span><img className="h-sdf-logo" src="/brand/sdf-logo-trim.webp" alt={rtl ? "المنتدى الاجتماعي التنموي" : "Social Developmental Forum"} /></div>
            <h3>{rtl ? "من الخبرة الميدانية إلى مساحة رقمية للحوار." : "From field experience to a digital space for dialogue."}</h3>
            <p>{rtl ? "تجمع ويبال بين العمل الشبابي والمعرفة العامة لتصنع تجربة رقمية فلسطينية أكثر قربًا ووضوحًا ومشاركة." : "Wepal combines youth work and public knowledge to create a Palestinian digital experience that is more accessible, clear and participatory."}</p>
            <a className="h-link" href="/about">{rtl ? "عن الشراكة" : "About the partnership"}<Arrow size={16} /></a>
          </div>
          <div className="h-newsletter" data-reveal>
            <span className="h-head-kicker is-light"><b>08</b>{rtl ? "مختصر ويبال" : "The Wepal brief"}</span>
            <h2>{rtl ? "لا تكتفِ بمتابعة الخبر. افهم ما وراءه." : "Don’t just follow the news. Understand what’s behind it."}</h2>
            {subscribed
              ? <div className="h-subscribed" role="status"><span><Check /></span><div><strong>{rtl ? "تم الاشتراك بنجاح" : "You’re subscribed"}</strong><p>{rtl ? "سيصلك أول مختصر قريبًا." : "Your first brief will arrive soon."}</p></div></div>
              : <form onSubmit={(e: FormEvent) => { e.preventDefault(); setSubscribed(true); }}>
                  <input type="email" required placeholder={rtl ? "بريدك الإلكتروني" : "Your email address"} aria-label={rtl ? "بريدك الإلكتروني" : "Your email address"} />
                  <button type="submit">{rtl ? "اشترك" : "Subscribe"}<Arrow size={17} /></button>
                </form>}
            <small>{rtl ? "رسالة منتقاة، دون إزعاج. يمكنك إلغاء الاشتراك في أي وقت." : "A thoughtful digest, no noise. Unsubscribe any time."}</small>
          </div>
        </div>
      </section>

      <SiteFooter lang={lang} onLang={changeLang} />
    </main>
  );
}

