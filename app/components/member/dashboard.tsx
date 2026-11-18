"use client";

import { useEffect, useState } from "react";
import type React from "react";
import {
  ArrowLeft, ArrowRight, Award, CalendarDays, ClipboardList, Compass, FolderKanban, ListTodo, MessageCircle,
  MessageCircleQuestion, MessagesSquare, Moon, Newspaper, PenLine, Plus, Sparkles, Sun, Sunrise, Users, Vote,
} from "lucide-react";
import { Avatar, Card, MemberShell, Progress, memberOrMe, useCounts, useMember } from "./shell";
import { CONSULTATIONS, GROUPS, ME, NOTICES, ONLINE, PLATFORM_NEWS, ROOM_SEED, SURVEYS, THREADS, UPCOMING, WORKSPACES } from "./data";
import { WorkspaceCard } from "./work";
import { useFeed } from "./social";
import { ago, update, useStore } from "./store";

type Todo = { id: string; title: string; meta: string; href: string; cta: string; kind: "task" | "reply" | "decision" | "survey"; done?: () => void };

const NUM_AR = ["", "", "", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة", "عشرة"];

function Dashboard() {
  const { rtl, tx } = useMember();
  const Arrow = rtl ? ArrowLeft : ArrowRight;
  const s = useStore();
  const counts = useCounts();
  const feed = useFeed();
  const [hour, setHour] = useState<number | null>(null);
  const [allTodos, setAllTodos] = useState(false);
  useEffect(() => { const id = requestAnimationFrame(() => setHour(new Date().getHours())); return () => cancelAnimationFrame(id); }, []);
  const first = tx(ME.name).split(" ")[0];

  /* ── Greeting by time of day ── */
  const part = hour === null ? "day" : hour < 5 ? "night" : hour < 12 ? "morning" : hour < 17 ? "day" : hour < 21 ? "evening" : "night";
  const Icon = part === "morning" ? Sunrise : part === "night" || part === "evening" ? Moon : Sun;
  const hello = {
    morning: rtl ? "صباح الخير" : "Good morning",
    day: rtl ? "نهارك سعيد" : "Good afternoon",
    evening: rtl ? "مساء الخير" : "Good evening",
    night: rtl ? "مساء النور" : "Good evening",
  }[part];
  const today = hour === null ? "" : new Intl.DateTimeFormat(rtl ? "ar-PS-u-nu-latn" : "en-GB", { weekday: "long", day: "numeric", month: "long" }).format(new Date());

  /* ── What's asked of me ── */
  const todos: Todo[] = [
    ...WORKSPACES.flatMap((w) => w.tasks.filter((t) => (s.taskMeta[t.id]?.owner ?? t.owner) === "me" && (s.taskStatus[t.id] ?? ((s.tasks[t.id] ?? t.done) ? "done" : "todo")) !== "done").map((t) => ({
      id: t.id, title: tx(t.title), meta: `${tx(w.title)} · ${tx(t.due)}`, href: `/projects/${w.id}#tasks`, cta: rtl ? "أنجِزها" : "Do it", kind: "task" as const,
      done: () => update((x) => ({ ...x, tasks: { ...x.tasks, [t.id]: true }, taskStatus: { ...x.taskStatus, [t.id]: "done" } })),
    }))),
    ...NOTICES.filter((n) => n.unread && (n.kind === "reply" || n.kind === "decision") && !s.read[n.id]).map((n) => ({
      id: n.id, title: tx(n.text), meta: `${tx(n.where)} · ${tx(n.time)}`, href: n.href, cta: n.kind === "reply" ? (rtl ? "ردّ" : "Reply") : (rtl ? "شارك" : "Take part"), kind: n.kind as Todo["kind"],
    })),
    ...SURVEYS.filter((v) => v.status === "open" && !(s.answered[v.id] ?? v.answered)).map((v) => ({ id: v.id, title: rtl ? `استبيان: ${tx(v.title)}` : `Survey: ${tx(v.title)}`, meta: rtl ? `${v.questions} أسئلة · ${v.minutes} دقائق` : `${v.questions} questions · ${v.minutes} min`, href: "/surveys", cta: rtl ? "أجب الآن" : "Answer", kind: "survey" as const })),
  ];
  const n = todos.length;
  const line = n === 0
    ? (rtl ? "يومك هادئ: لا شيء ينتظرك الآن. تجوّل في المجتمع أو أكمل عملًا تحبّه." : "A calm day: nothing is waiting for you. Browse the community or pick up something you enjoy.")
    : rtl
      ? `${n === 1 ? "أمرٌ واحد ينتظرك" : n === 2 ? "أمران ينتظرانك" : n <= 10 ? `${NUM_AR[n]} أمور تنتظرك` : `${n} أمرًا ينتظرك`} اليوم، أوّلها: «${todos[0].title}».`
      : `${n} thing${n > 1 ? "s" : ""} waiting for you today. First up: "${todos[0].title}".`;

  /* ── Places, workspaces, conversations ── */
  const myWork = WORKSPACES.filter((w) => w.team.includes("me") && w.stage !== "done");
  const myGroups = GROUPS.filter((g) => s.joined[g.id] ?? g.joined);
  const roomUnread = (id: string) => (s.read[id] || s.muted[id] ? 0 : ROOM_SEED[id]?.unread ?? 0);
  const conversations = [
    ...myWork.filter((w) => ROOM_SEED[w.id]).map((w) => {
      const sent = s.messages[w.id]?.at(-1); const seed = ROOM_SEED[w.id].messages.at(-1)!;
      return { id: w.id, href: `/projects/${w.id}#chat`, title: tx(w.title), work: true, who: sent?.from ?? seed.from, text: sent ? (sent.text || "📎") : tx(seed.text), time: sent ? ago(sent.time, rtl) : tx(seed.time), unread: roomUnread(w.id) };
    }),
    ...THREADS.map((t) => {
      const sent = s.messages[t.id]?.at(-1);
      return { id: t.id, href: `/messages?t=${t.id}`, title: tx(memberOrMe(t.with).name), work: false, who: t.with, text: sent ? (sent.text || "📎") : tx(t.last), time: sent ? ago(sent.time, rtl) : tx(t.time), unread: s.read[t.id] || s.muted[t.id] ? 0 : t.unread };
    }),
  ].sort((a, b) => b.unread - a.unread).slice(0, 4);
  const consult = CONSULTATIONS.find((c) => c.status === "open");
  const highlights = feed.slice(0, 2);

  const stats = [
    { icon: ListTodo, value: n, label: rtl ? "مطلوب منك" : "Asked of you", href: "#focus" },
    { icon: MessagesSquare, value: counts.messages, label: rtl ? "رسائل جديدة" : "New messages", href: "/messages" },
    { icon: FolderKanban, value: myWork.length, label: rtl ? "مساحات نشطة" : "Active workspaces", href: "/projects" },
    { icon: Award, value: ME.points, label: rtl ? "نقطة" : "Points", href: "/profile" },
  ];
  const quick = [
    { icon: PenLine, label: rtl ? "منشور جديد" : "New post", href: "/community", tone: "is-blue" },
    { icon: MessagesSquare, label: rtl ? "رسالة جديدة" : "New message", href: "/members", tone: "is-teal" },
    { icon: Plus, label: rtl ? "اقترح مساحة" : "Propose workspace", href: "/projects", tone: "is-yellow" },
    { icon: MessageCircleQuestion, label: rtl ? "اسأل المكتبة" : "Ask the library", href: "/assistant", tone: "is-navy" },
  ];

  return (
    <div className="dh">
      {/* ── Welcome ── */}
      <section className="dh-hero" aria-labelledby="dh-title">
        <span className="dh-glow" aria-hidden="true" /><span className="dh-dots" aria-hidden="true"><i /><i /><i /></span>
        <div className="dh-hero-top">
          <div className="dh-hello">
            <span className="dh-when"><Icon aria-hidden="true" />{hello}{today && <> · {today}</>}</span>
            <h1 id="dh-title">{rtl ? `أهلًا بعودتك، ${first}` : `Welcome back, ${first}`} <span className="dh-wave" aria-hidden="true">👋</span></h1>
            <p>{line}</p>
            <div className="dh-cta">
              {todos[0] ? <a className="m-btn is-light" href={todos[0].href}>{todos[0].cta}<Arrow /></a> : <a className="m-btn is-light" href="/community">{rtl ? "افتح المجتمع" : "Open community"}<Arrow /></a>}
              <a className="dh-ghost" href="/community">{rtl ? "جديد المجتمع" : "What's new"}</a>
            </div>
          </div>
          <a className="dh-me" href="/profile" aria-label={rtl ? "ملفي" : "My profile"}>
            <span className="dh-ring"><Avatar who={{ ...ME, tone: 0 }} size={84} /></span>
            <strong>{tx(ME.name)}</strong>
            <small>{tx(ME.city)} · {rtl ? "3 شارات" : "3 badges"}</small>
          </a>
        </div>
        <div className="dh-stats">
          {stats.map((st) => { const I = st.icon; return (
            <a key={st.label} href={st.href} className="dh-stat"><span><I aria-hidden="true" /></span><strong>{st.value}</strong><small>{st.label}</small></a>
          ); })}
        </div>
      </section>

      {!s.onboarded && (
        <a className="d2-setup" href="/welcome"><Sparkles aria-hidden="true" /><span><strong>{rtl ? "أكمل إعداد حسابك" : "Finish setting up your account"}</strong><small>{rtl ? "اختر اهتماماتك ومجموعاتك وصورتك في دقيقة." : "Pick your interests, groups and picture in a minute."}</small></span><Arrow aria-hidden="true" /></a>
      )}

      {/* ── My places ── */}
      <section className="dh-places" aria-label={rtl ? "أماكني" : "My places"}>
        <div className="dh-places-row">
          {myWork.map((w, i) => {
            const n = roomUnread(w.id);
            return (
              <a key={w.id} href={`/projects/${w.id}`} className={`dh-place is-work t${i % 5} ${n > 0 ? "is-fresh" : ""}`} style={{ "--i": i } as React.CSSProperties}>
                <span className="dh-place-ic"><FolderKanban aria-hidden="true" />{n > 0 && <i className="dh-place-dot" />}</span>
                <span className="dh-place-txt"><strong>{tx(w.title)}</strong><small>{n > 0 ? (rtl ? (n === 1 ? "رسالة جديدة" : n === 2 ? "رسالتان جديدتان" : `${n} رسائل جديدة`) : `${n} new message${n === 1 ? "" : "s"}`) : (rtl ? "مساحة عمل" : "Workspace")}</small></span>
              </a>
            );
          })}
          {myGroups.map((g, i) => (
            <a key={g.id} href={`/community/${g.id}`} className={`dh-place is-group t${(myWork.length + i) % 5} ${g.posts.length > 1 ? "is-fresh" : ""}`} style={{ "--i": myWork.length + i } as React.CSSProperties}>
              <span className="dh-place-ic">{tx(g.name).slice(0, 1)}{g.posts.length > 1 && <i className="dh-place-dot" />}</span>
              <span className="dh-place-txt"><strong>{tx(g.name)}</strong><small>{rtl ? `مجموعة · ${g.members} عضوًا` : `Group · ${g.members} members`}</small></span>
            </a>
          ))}
          <a href="/community" className="dh-place is-explore" style={{ "--i": myWork.length + myGroups.length } as React.CSSProperties}>
            <span className="dh-place-ic"><Compass aria-hidden="true" /></span>
            <span className="dh-place-txt"><strong>{rtl ? "اكتشف المزيد" : "Discover more"}</strong><small>{rtl ? "مجموعات ومساحات" : "Groups and spaces"}</small></span>
          </a>
        </div>
      </section>

      <div className="dh-grid">
        {/* ── Work column ── */}
        <div className="m-stack">
          <Card title={rtl ? "المطلوب مني" : "Asked of me"} className="dh-card" action={<span className="d2-pill">{n}</span>}>
            <div id="focus" />
            {n === 0 ? <p className="dh-calm"><Sparkles aria-hidden="true" />{rtl ? "أنجزت كل شيء. يوم جميل 🌿" : "All done. Enjoy your day 🌿"}</p> : (
              <ol className={`d-todos ${allTodos ? "is-all" : ""}`}>
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
            {n > 3 && <button className="m-btn is-sm d-todos-more" onClick={() => setAllTodos((v) => !v)} aria-expanded={allTodos}>{allTodos ? (rtl ? "عرض أقل" : "Show less") : (rtl ? `عرض الكل (${n})` : `Show all (${n})`)}</button>}
          </Card>

          <section className="dh-block">
            <div className="dh-head"><h2><span><FolderKanban aria-hidden="true" /></span>{rtl ? "مساحاتي" : "My workspaces"}</h2><a className="m-more" href="/projects">{rtl ? "كل المساحات" : "All workspaces"}<Arrow /></a></div>
            <div className="m-cards dh-works">{myWork.map((w) => <WorkspaceCard key={w.id} id={w.id} />)}</div>
          </section>

          <Card title={rtl ? "من المجتمع" : "From the community"} className="dh-card" action={<a className="m-more" href="/community">{rtl ? "افتح المجتمع" : "Open community"}<Arrow /></a>}>
            <ul className="d2-posts">
              {highlights.map((p) => { const a = memberOrMe(p.author); return (
                <li key={p.id}><a href={`/community/${p.group.id}#${p.id}`}>
                  <Avatar who={a} size={38} />
                  <span><span className="d2-post-meta"><strong>{tx(a.name)}</strong> · {tx(p.group.name)}</span><p>{s.postEdits[p.id] ?? tx(p.text)}</p><small><MessageCircle aria-hidden="true" />{p.replies + (s.comments[p.id]?.length ?? 0)} · 👍 {(p.reacts ?? 0) + (s.reactions[p.id] ? 1 : 0)}</small></span>
                  {p.img && <img src={p.img} alt="" />}
                </a></li>
              ); })}
            </ul>
            <a className="d2-compose" href="/community"><Avatar who={{ ...ME, tone: 0 }} size={32} /><span>{rtl ? `شارك فكرة مع المجتمع يا ${first}…` : `Share an idea with the community, ${first}…`}</span><Users aria-hidden="true" /></a>
          </Card>
        </div>

        {/* ── Today column ── */}
        <aside className="m-stack" aria-label={rtl ? "اليوم" : "Today"}>
          <Card title={rtl ? "على جدولك" : "On your calendar"} className="dh-card">
            <ol className="dh-agenda">
              {UPCOMING.map((u) => (
                <li key={u.id}><a href={u.href}>
                  <span className="d-cal"><b>{u.day}</b><small>{tx(u.month)}</small></span>
                  <span><strong>{tx(u.title)}</strong><small><CalendarDays aria-hidden="true" />{tx(u.where)}</small></span>
                </a></li>
              ))}
            </ol>
          </Card>

          <Card title={rtl ? "آخر المحادثات" : "Latest conversations"} className="dh-card" action={<a className="m-more" href="/messages">{rtl ? "الرسائل" : "Messages"}<Arrow /></a>}>
            <ul className="d2-convos">
              {conversations.map((c) => (
                <li key={c.id}><a href={c.href} className={c.unread ? "is-unread" : ""}>
                  {c.work ? <span className="i-room-ico is-sm"><FolderKanban /></span> : <Avatar who={memberOrMe(c.who)} size={40} online={ONLINE.has(c.who)} />}
                  <span><span className="m-thread-top"><strong>{c.title}</strong><small>{c.time}</small></span><span className="m-thread-last">{c.work && c.who !== "me" ? `${tx(memberOrMe(c.who).name).split(" ")[0]}: ` : c.who === "me" ? (rtl ? "أنت: " : "You: ") : ""}{c.text}</span></span>
                  {c.unread > 0 && <b className="m-count">{c.unread}</b>}
                </a></li>
              ))}
            </ul>
          </Card>

          {consult && (
            <a className="m-promo is-consult" href="/consultations">
              <span className="m-kicker"><Vote aria-hidden="true" />{rtl ? "شارك برأيك" : "Have your say"}</span>
              <strong>{tx(consult.title)}</strong>
              <Progress value={(consult.participants / consult.target) * 100} />
              <small>{consult.participants} / {consult.target} · {tx(consult.ends)}</small>
              <span className="m-promo-cta">{rtl ? "صوّت الآن" : "Vote now"}<Arrow /></span>
            </a>
          )}

          <section className="dh-quick" aria-label={rtl ? "ابدأ بسرعة" : "Quick start"}>
            {quick.map((q) => { const I = q.icon; return <a key={q.label} href={q.href} className={`dh-q ${q.tone}`}><span><I /></span>{q.label}</a>; })}
          </section>

          <Card title={rtl ? "جديد المنصة" : "New on the platform"} className="dh-card">
            <ul className="m-list">
              {PLATFORM_NEWS.map((x) => <li key={x.id}><a href={x.href}><span className="m-ico is-info">{x.href === "/surveys" ? <ClipboardList /> : x.href === "/news" ? <Newspaper /> : <Sparkles />}</span><span><small>{tx(x.kind)}</small><strong>{tx(x.title)}</strong></span><em className="m-date">{tx(x.date)}</em></a></li>)}
            </ul>
          </Card>
        </aside>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return <MemberShell active="dashboard"><Dashboard /></MemberShell>;
}
