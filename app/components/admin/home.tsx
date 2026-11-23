"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { ExternalLink, Moon, PenLine, Sun, Sunrise } from "lucide-react";
import { ACard, AdminShell, useAdmin } from "./shell";
import { ADMIN_ITEMS, adminHref, findSection } from "./nav";
import type { T } from "../content";
import { MembersMap } from "./map";
import { MEMBERS_TOTAL } from "./data";

const L = (ar: string, en: string): T => ({ ar, en });

const TODO: { key: string; title: T; sub: T; cta: T }[] = [
  { key: "reports", title: L("4 بلاغات جديدة", "4 new reports"), sub: L("أقدمها منذ 6 ساعات على منشور في «حوار الضفة الشمالية»", "Oldest 6 hours ago, on a post in Northern dialogue"), cta: L("افرز", "Review") },
  { key: "proposals", title: L("3 مقترحات مساحات", "3 workspace proposals"), sub: L("آخرها «دليل الحوار للمدارس» من سارة يوسف", "Latest: “A dialogue guide for schools” by Sara Yousef"), cta: L("راجِع", "Review") },
  { key: "publish", title: L("مخرجان بانتظار النشر", "2 outputs awaiting publishing"), sub: L("«خريطة مساحات الحوار المحلية» جاهزة للمراجعة الأخيرة", "“Local dialogue spaces map” is ready for final review"), cta: L("انشر", "Publish") },
  { key: "inbox", title: L("5 رسائل في الوارد", "5 messages in the inbox"), sub: L("رسالتان من شركاء، وثلاث اشتراكات جديدة", "Two from partners, three new subscriptions"), cta: L("افتح", "Open") },
  { key: "outcomes", title: L("خلاصة واحدة تحتاج اعتمادًا", "1 outcome needs approval"), sub: L("خلاصة مشاورة «أولويات الشأن العام 2027»", "Summary of the “2027 public priorities” consultation"), cta: L("اعتمد", "Approve") },
];

const RECENT: { who: string; what: T; when: T }[] = [
  { who: "ن", what: L("نور حسن نشرت خبر «انطلاق دورة الحوار في خمس جامعات»", "Nour Hasan published “Dialogue course launches in five universities”"), when: L("قبل 20 دقيقة", "20 min ago") },
  { who: "أ", what: L("أحمد خليل أخفى تعليقًا بعد بلاغ", "Ahmad Khalil hid a comment after a report"), when: L("قبل ساعة", "1 hour ago") },
  { who: "ل", what: L("ليان أحمد وزّعت 8 أعضاء على «سلسلة اقرأ الخبر»", "Layan Ahmad assigned 8 members to “Read the news”"), when: L("قبل 3 ساعات", "3 hours ago") },
  { who: "ر", what: L("رهف ناصر أنشأت استطلاع «كيف تتابع الأخبار؟»", "Rahaf Naser created the survey “How do you follow the news?”"), when: L("أمس", "Yesterday") },
  { who: "س", what: L("سارة يوسف أرسلت دفعة دعوات لطولكرم (24)", "Sara Yousef sent an invitation batch for Tulkarm (24)"), when: L("أمس", "Yesterday") },
];

const KPIS: { label: T; value: string; delta: number; note: T; period: T; href: string; color: string; spark: number[] }[] = [
  { label: L("الأعضاء النشطون", "Active members"), value: "1,284", delta: 8, note: L("مقارنة بالـ 30 يومًا السابقة", "vs the previous 30 days"), period: L("آخر 30 يومًا", "Last 30 days"), href: "/admin/users?status=active", color: "var(--b500)", spark: [8, 9, 9, 11, 10, 12, 13, 14, 13, 15, 16, 18] },
  { label: L("مساحات العمل", "Workspaces"), value: "23", delta: 3, note: L("6 منها قيد العمل", "6 in progress"), period: L("إجمالي المنصة", "Platform total"), href: "/admin/distribution", color: "#e9a521", spark: [12, 13, 13, 14, 15, 15, 17, 18, 19, 20, 22, 23] },
  { label: L("المشاركات في الحوار", "Dialogue posts"), value: "3,906", delta: 14, note: L("مقارنة بالـ 30 يومًا السابقة", "vs the previous 30 days"), period: L("آخر 30 يومًا", "Last 30 days"), href: "/admin/discussions", color: "#2bb39a", spark: [5, 7, 6, 8, 9, 8, 11, 10, 12, 13, 15, 17] },
  { label: L("أصوات المشاورات", "Consultation votes"), value: "214", delta: -4, note: L("مقارنة بالأسبوع السابق", "vs the previous week"), period: L("آخر 7 أيام", "Last 7 days"), href: "/admin/consultations", color: "#6a5bd6", spark: [14, 13, 15, 12, 13, 11, 12, 10, 11, 10, 9, 9] },
];

const MONTHS: [T, number, number][] = [
  [L("حزيران", "Jun"), 42, 18], [L("تموز", "Jul"), 55, 22], [L("آب", "Aug"), 48, 25], [L("أيلول", "Sep"), 70, 31],
  [L("تشرين 1", "Oct"), 86, 38], [L("تشرين 2", "Nov"), 64, 29],
];

const SPACES: { name: T; members: number; color: string }[] = [
  { name: L("خريطة مساحات الحوار المحلية", "Local dialogue spaces map"), members: 34, color: "var(--b500)" },
  { name: L("سلسلة «اقرأ الخبر»", "“Read the news” series"), members: 27, color: "#2bb39a" },
  { name: L("دليل الحوار للمدارس", "A dialogue guide for schools"), members: 19, color: "#e9a521" },
  { name: L("بودكاست الأجيال", "Generations podcast"), members: 15, color: "#6a5bd6" },
  { name: L("أرشيف المبادرات الشبابية", "Youth initiatives archive"), members: 11, color: "#e8707f" },
];

const SITE: { label: T; value: string; delta: number }[] = [
  { label: L("زيارة", "Visits"), value: "8,412", delta: 12 },
  { label: L("زائر", "Visitors"), value: "3,107", delta: 9 },
  { label: L("قراءة مقال", "Article reads"), value: "2,644", delta: -3 },
];
const TOP_PAGES: { title: T; href: string; views: number }[] = [
  { title: L("انطلاق دورة الحوار في خمس جامعات", "Dialogue course launches in five universities"), href: "/news", views: 1240 },
  { title: L("دليل تيسير الجلسات", "Session facilitation guide"), href: "/library", views: 860 },
  { title: L("أولويات الشأن العام 2027", "2027 public priorities"), href: "/consultations", views: 712 },
  { title: L("قصة: من غرفة صفّ إلى مساحة حوار", "Story: from a classroom to a dialogue space"), href: "/stories", views: 538 },
];

function Spark({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data), min = Math.min(...data), w = 96, h = 30;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / Math.max(1, max - min)) * (h - 4) - 2}`).join(" ");
  return <svg className="a-spark" viewBox={`0 0 ${w} ${h}`} aria-hidden="true"><polyline points={pts} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export default function AdminHome() {
  return <AdminShell active=""><Home /></AdminShell>;
}

function Home() {
  const { rtl, tx, lang } = useAdmin();
  const [clock, setClock] = useState<{ h: number; date: string } | null>(null);
  useEffect(() => {
    const d = new Date();
    const date = d.toLocaleDateString(lang === "ar" ? "ar-u-nu-latn" : "en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    const id = requestAnimationFrame(() => setClock({ h: d.getHours(), date })); return () => cancelAnimationFrame(id);
  }, [lang]);
  const h = clock?.h ?? 10;
  const Icon = h < 12 ? Sunrise : h < 18 ? Sun : Moon;
  const hello = h < 12 ? (rtl ? "صباح الخير" : "Good morning") : (rtl ? "مساء الخير" : "Good evening");
  const max = Math.max(...MONTHS.flatMap((m) => [m[1], m[2]]));
  const spaceTotal = SPACES.reduce((n, s) => n + s.members, 0);

  return (
    <div className="a-home">
      <header className="a-greet">
        <div>
          <span className="a-when"><Icon aria-hidden="true" />{clock?.date ?? " "}</span>
          <h1>{hello}، {rtl ? "ليان" : "Layan"}</h1>
          <p>{rtl ? `${TODO.length} أمور تنتظر قرارك اليوم، والمهم أولًا.` : `${TODO.length} things are waiting for your decision today, most important first.`}</p>
        </div>
        <div className="a-actions">
          <a className="a-btn" href="/" target="_blank" rel="noopener"><ExternalLink aria-hidden="true" />{rtl ? "فتح الموقع" : "Open the site"}</a>
          <a className="a-btn is-primary" href="/admin/news"><PenLine aria-hidden="true" />{rtl ? "خبر جديد" : "New article"}</a>
        </div>
      </header>

      <div className="a-kpis">
        {KPIS.map((k) => (
          <a key={k.label.en} href={k.href} className="a-kpi" style={{ "--gc": k.color } as CSSProperties}>
            <span className="a-kpi-h">{tx(k.label)}<time>{tx(k.period)}</time></span>
            <strong>{k.value}</strong>
            <div className="a-kpi-f"><em className={k.delta < 0 ? "is-down" : ""}>{k.delta > 0 ? "+" : ""}{k.delta}%</em><small>{tx(k.note)}</small><Spark data={k.spark} color={k.color} /></div>
          </a>
        ))}
      </div>

      <ACard title={rtl ? "من أين أعضاؤنا" : "Where our members are"} sub={rtl ? `إجمالي المنصة · ${MEMBERS_TOTAL} عضوًا، وكل دائرة تفتح أعضاء محافظتها` : `Platform total · ${MEMBERS_TOTAL} members; each circle opens its governorate's members`} end={<a href="/admin/users">{rtl ? "كل الأعضاء" : "All members"}</a>}>
        <MembersMap />
      </ACard>

      <div className="a-dash">
        <ACard title={rtl ? "ابدأ من هنا" : "Start here"} sub={rtl ? "الآن · المهم أولًا، وكل سطر يفتح قائمته" : "Now · most important first; each row opens its list"} end={<span className="a-tag">{TODO.length}</span>}>
          <ol className="a-todo">
            {TODO.map((t) => { const sec = findSection(t.key)!; const I = sec.icon; return (
              <li key={t.key} style={{ "--gc": sec.group.color } as CSSProperties}><a href={adminHref(t.key)}>
                <span className="a-dot"><I aria-hidden="true" /></span>
                <div><p>{tx(t.title)}</p><small>{tx(t.sub)}</small></div>
                <span className="a-btn is-sm">{tx(t.cta)}</span>
              </a></li>
            ); })}
          </ol>
        </ACard>
        <ACard title={rtl ? "النشاط الأخير" : "Recent activity"} sub={rtl ? "آخر 24 ساعة · ما فعله الطاقم" : "Last 24 hours · what the team did"} end={<a href="/admin/audit">{rtl ? "سجل التدقيق" : "Audit log"}</a>}>
          <ul className="a-recent">
            {RECENT.map((r, i) => <li key={i}><span className="a-avatar is-sm">{r.who}</span><span>{tx(r.what)}</span><time>{tx(r.when)}</time></li>)}
          </ul>
        </ACard>
      </div>

      <div className="a-dash is-wide">
        <ACard title={rtl ? "النشاط شهريًا" : "Activity by month"} sub={rtl ? "آخر 6 أشهر · انضمام الأعضاء والمنشورات الجديدة" : "Last 6 months · new members and new posts"}
          end={<span className="a-legend"><i style={{ background: "var(--b500)" }} />{rtl ? "منشورات" : "Posts"}<i style={{ background: "#2bb39a" }} />{rtl ? "أعضاء جدد" : "New members"}</span>}>
          <div className="a-bars" role="img" aria-label={rtl ? "رسم شهري للمنشورات والأعضاء الجدد" : "Monthly chart of posts and new members"}>
            {MONTHS.map(([m, a, b], i) => (
              <div key={m.en} className="a-bar-col">
                <div className="a-bar-pair">
                  <span style={{ height: `${(a / max) * 100}%`, background: "var(--b500)", animationDelay: `${i * 60}ms` }} title={`${a}`}><b>{a}</b></span>
                  <span style={{ height: `${(b / max) * 100}%`, background: "#2bb39a", animationDelay: `${i * 60 + 30}ms` }} title={`${b}`}><b>{b}</b></span>
                </div>
                <small>{tx(m)}</small>
              </div>
            ))}
          </div>
        </ACard>
        <ACard title={rtl ? "الأعضاء في مساحات العمل" : "Members in workspaces"} sub={rtl ? `الآن · ${spaceTotal} عضوًا في 5 مساحات نشطة` : `Now · ${spaceTotal} members in 5 active workspaces`} end={<a href="/admin/distribution">{rtl ? "وزّع" : "Assign"}</a>}>
          <div className="a-stackbar" aria-hidden="true">{SPACES.map((s) => <span key={s.name.en} style={{ flex: s.members, background: s.color }} />)}</div>
          <ul className="a-prog">
            {SPACES.map((s) => (
              <li key={s.name.en}><a href="/admin/distribution"><i style={{ background: s.color }} /><span>{tx(s.name)}</span><b>{s.members}</b></a></li>
            ))}
          </ul>
        </ACard>
      </div>

      <ACard title={rtl ? "الموقع العام" : "Public site"} sub={rtl ? "آخر 7 أيام · الزيارات والأكثر قراءة (كانت صفحة الإحصاءات)" : "Last 7 days · visits and most read (was the Analytics page)"}>
        <div className="a-site">
          <div className="a-site-stats">
            {SITE.map((x) => <div key={x.label.en}><strong>{x.value}</strong><span>{tx(x.label)}</span><em className={x.delta < 0 ? "is-down" : ""}>{x.delta > 0 ? "+" : ""}{x.delta}%</em></div>)}
          </div>
          <ol className="a-top-pages">
            {TOP_PAGES.map((pg, i) => <li key={pg.href}><a href={pg.href} target="_blank" rel="noopener"><b>{i + 1}</b><span>{tx(pg.title)}</span><small>{pg.views.toLocaleString("en")} {rtl ? "قراءة" : "views"}</small></a></li>)}
          </ol>
        </div>
      </ACard>

      <ACard title={rtl ? "كل الأقسام" : "All sections"} sub={rtl ? "انتقل مباشرة، أو اضغط Ctrl K" : "Jump straight there, or press Ctrl K"}>
        <div className="a-sections">
          {ADMIN_ITEMS.filter((it) => it.key).map((it) => { const I = it.icon; return (
            <a key={it.key} href={adminHref(it.key)} style={{ "--gc": it.group.color } as CSSProperties}>
              <span className="a-ic"><I aria-hidden="true" /></span><span>{tx(it.label)}</span>{!!it.count && <b>{it.count}</b>}
            </a>
          ); })}
        </div>
      </ACard>
    </div>
  );
}
