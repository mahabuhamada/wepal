"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Bell, ClipboardList, Compass, FolderKanban, ListTodo, MessageCircle, Newspaper, Sparkles, Vote } from "lucide-react";
import { Avatar, Card, MemberShell, Stages, memberOrMe, useMember } from "./shell";
import { GROUPS, ME, NOTICES, PLATFORM_NEWS, UPCOMING, WORKSPACES } from "./data";
import { Composer, PostCard, useFeed } from "./social";
import { update, useStore } from "./store";

type Todo = { id: string; title: string; meta: string; href: string; cta: string; kind: "task" | "reply" | "decision" | "survey"; done?: () => void };

function Dashboard() {
  const { rtl, tx } = useMember();
  const Arrow = rtl ? ArrowLeft : ArrowRight;
  const s = useStore();
  const feed = useFeed();
  const [hour, setHour] = useState<number | null>(null);
  useEffect(() => { const id = requestAnimationFrame(() => setHour(new Date().getHours())); return () => cancelAnimationFrame(id); }, []);
  const first = tx(ME.name).split(" ")[0];
  const hello = hour === null ? (rtl ? "أهلًا" : "Hello") : hour < 12 ? (rtl ? "صباح الخير" : "Good morning") : (rtl ? "مساء الخير" : "Good evening");

  // "Asked of me": my open tasks, then unread replies/decisions, then an unanswered survey.
  const todos: Todo[] = [
    ...WORKSPACES.flatMap((w) => w.tasks.filter((t) => t.owner === "me" && !(s.tasks[t.id] ?? t.done)).map((t) => ({
      id: t.id, title: tx(t.title), meta: `${tx(w.title)} · ${tx(t.due)}`, href: `/projects/${w.id}`, cta: rtl ? "أنجِزها" : "Do it", kind: "task" as const,
      done: () => update((x) => ({ ...x, tasks: { ...x.tasks, [t.id]: true } })),
    }))),
    ...NOTICES.filter((n) => n.unread && n.kind !== "task" && n.kind !== "info" && !s.read[n.id]).map((n) => ({
      id: n.id, title: tx(n.text), meta: `${tx(n.where)} · ${tx(n.time)}`, href: n.href, cta: n.kind === "reply" ? (rtl ? "ردّ" : "Reply") : (rtl ? "شارك" : "Take part"), kind: n.kind as Todo["kind"],
    })),
    ...(!s.answered.s1 ? [{ id: "s1", title: rtl ? "استبيان: كيف تتابع الأخبار؟" : "Survey: how do you follow the news?", meta: rtl ? "8 أسئلة · 4 دقائق" : "8 questions · 4 min", href: "/surveys", cta: rtl ? "أجب الآن" : "Answer now", kind: "survey" as const }] : []),
  ];
  const count = todos.length;
  const countText = rtl
    ? count === 0 ? "لا شيء ينتظرك الآن" : count === 1 ? "أمرٌ واحد ينتظرك" : count === 2 ? "أمران ينتظرانك" : count <= 10 ? `${["", "", "", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة", "عشرة"][count]} أمور تنتظرك` : `${count} أمرًا ينتظرك`
    : count === 0 ? "Nothing is waiting for you" : `${count} things are waiting for you`;

  const places = [
    ...WORKSPACES.filter((w) => w.mine && w.stage !== "done").map((w) => ({ id: w.id, label: tx(w.title), href: `/projects/${w.id}`, work: true, fresh: w.updates.length > 0, letter: "" })),
    ...GROUPS.filter((g) => s.joined[g.id] ?? g.joined).map((g) => ({ id: g.id, label: tx(g.name), href: `/community/${g.id}`, work: false, fresh: g.posts.length > 1, letter: tx(g.name).slice(0, 1) })),
  ];
  const mine = WORKSPACES.filter((w) => w.mine && w.stage !== "done");
  const week = WORKSPACES.filter((w) => w.mine).flatMap((w) => w.updates.map((u) => ({ who: u.who, text: tx(u.text), where: tx(w.title), time: tx(u.time) }))).slice(0, 3);
  const nextTask = (id: string) => WORKSPACES.find((w) => w.id === id)!.tasks.find((t) => !(s.tasks[t.id] ?? t.done));

  return (
    <>
      {/* Hero: what's waiting + upcoming dates */}
      <section className="d-hero">
        <div className="d-hero-main">
          <span className="d-hello">{hello}، {first}</span>
          <h1>{countText}</h1>
          {todos[0] ? <p>{rtl ? "أوّلها:" : "First:"} <strong>{todos[0].title}</strong></p> : <p>{rtl ? "تابع ما يجري في مجموعاتك ومساحات عملك." : "Catch up with your groups and workspaces."}</p>}
          {todos[0] && <a className="m-btn is-primary" href={todos[0].href}>{todos[0].cta}<Arrow /></a>}
        </div>
        <div className="d-upcoming">
          <p className="d-label">{rtl ? "المواعيد القادمة" : "Upcoming"}</p>
          {UPCOMING.map((u) => (
            <a key={u.id} href={u.href} className="d-date">
              <span className="d-cal"><b>{u.day}</b><small>{tx(u.month)}</small></span>
              <span><strong>{tx(u.title)}</strong><small>{tx(u.where)}</small></span>
            </a>
          ))}
        </div>
      </section>

      {/* My places, story style */}
      <section className="d-places" aria-label={rtl ? "أماكني" : "My places"}>
        <div className="d-places-head"><h2>{rtl ? "أماكني" : "My places"}</h2><small>{rtl ? "الحلقة الملوّنة تعني نشاطًا جديدًا." : "A coloured ring means new activity."}</small></div>
        <div className="d-stories">
          {places.map((p) => (
            <a key={p.id} href={p.href} className={`d-story ${p.fresh ? "is-fresh" : ""} ${p.work ? "is-work" : "is-group"}`}>
              <span className="d-ring"><span className="d-bubble">{p.work ? <FolderKanban /> : p.letter}</span></span>
              <span className="d-story-label">{p.label}</span>
            </a>
          ))}
          <a href="/community" className="d-story is-explore"><span className="d-ring"><span className="d-bubble"><Compass /></span></span><span className="d-story-label">{rtl ? "اكتشف" : "Explore"}</span></a>
        </div>
      </section>

      <div className="d-grid">
        <div className="m-stack">
          {/* Asked of me */}
          <Card title={rtl ? `المطلوب مني · ${count}` : `Asked of me · ${count}`} action={<small className="m-hint">{rtl ? "ما وُجّه إليك أولًا، ثم الأقرب موعدًا" : "Addressed to you first, then by date"}</small>}>
            {count === 0 ? <p className="m-muted">{rtl ? "أنجزت كل شيء 🎉" : "All done 🎉"}</p> : (
              <ol className="d-todos">
                {todos.map((t, i) => (
                  <li key={t.id}>
                    <span className="d-num">{i + 1}</span>
                    <span className={`m-ico is-${t.kind === "survey" ? "task" : t.kind}`}>{t.kind === "task" ? <ListTodo /> : t.kind === "reply" ? <MessageCircle /> : t.kind === "decision" ? <Vote /> : <ClipboardList />}</span>
                    <a href={t.href} className="d-todo-text"><strong>{t.title}</strong><small>{t.meta}</small></a>
                    {t.done ? <button className="m-btn is-sm" onClick={t.done}>{rtl ? "تمّت ✓" : "Done ✓"}</button> : <a className="m-btn is-sm" href={t.href}>{t.cta}</a>}
                  </li>
                ))}
              </ol>
            )}
          </Card>

          {/* Community feed */}
          <div className="d-section-head"><h2><MessageCircle aria-hidden="true" />{rtl ? "من المجتمع" : "From the community"}</h2><a className="m-more" href="/community">{rtl ? "افتح المجتمع" : "Open community"}<Arrow /></a></div>
          <Composer />
          {feed.slice(0, 4).map((p) => <PostCard key={p.id} post={p} />)}
        </div>

        <div className="m-stack">
          <Card title={rtl ? "مساحاتي" : "My workspaces"} action={<a className="m-more" href="/projects">{rtl ? "كل المساحات" : "All"}<Arrow /></a>}>
            <div className="d-works">
              {mine.map((w) => { const t = nextTask(w.id); return (
                <a key={w.id} href={`/projects/${w.id}`} className="d-work">
                  <strong><FolderKanban aria-hidden="true" />{tx(w.title)}</strong>
                  <Stages stage={w.stage} />
                  <small><b>{rtl ? "الخطوة التالية:" : "Next step:"}</b> {t ? tx(t.title) : (rtl ? "لا مهام مفتوحة" : "No open tasks")}</small>
                </a>
              ); })}
            </div>
          </Card>
          <Card title={rtl ? "هذا الأسبوع" : "This week"}>
            <ul className="d-week">
              {week.map((w, i) => { const m = memberOrMe(w.who); return <li key={i}><Avatar who={m} size={32} /><span><strong>{tx(m.name)}</strong> {w.text}<small>{w.where} · {w.time}</small></span></li>; })}
            </ul>
          </Card>
          <Card title={rtl ? "جديد المنصة" : "New on the platform"}>
            <ul className="m-list">
              {PLATFORM_NEWS.map((n) => <li key={n.id}><a href={n.href}><span className="m-ico is-info">{n.href === "/surveys" ? <ClipboardList /> : n.href === "/news" ? <Newspaper /> : <Sparkles />}</span><span><small>{tx(n.kind)}</small><strong>{tx(n.title)}</strong></span><em className="m-date">{tx(n.date)}</em></a></li>)}
            </ul>
          </Card>
          <a className="d-record" href="/profile"><Bell aria-hidden="true" /><span><strong>{ME.points} {rtl ? "نقطة" : "points"}</strong><small>{rtl ? "3 شارات من 5 · افتح ملفك" : "3 of 5 badges · Open profile"}</small></span></a>
        </div>
      </div>
    </>
  );
}

export default function DashboardPage() {
  return <MemberShell active="dashboard"><Dashboard /></MemberShell>;
}
