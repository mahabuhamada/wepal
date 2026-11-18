"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, ClipboardList, Compass, FolderKanban, ListTodo, MessageCircle, MessageCircleQuestion, MessagesSquare, Newspaper, PenLine, Plus, Sparkles, Users, Vote } from "lucide-react";
import { Avatar, Card, MemberShell, Progress, memberOrMe, useMember } from "./shell";
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
  const feed = useFeed();
  const [hour, setHour] = useState<number | null>(null);
  useEffect(() => { const id = requestAnimationFrame(() => setHour(new Date().getHours())); return () => cancelAnimationFrame(id); }, []);
  const first = tx(ME.name).split(" ")[0];
  const hello = hour === null ? (rtl ? "أهلًا" : "Hello") : hour < 12 ? (rtl ? "صباح الخير" : "Good morning") : (rtl ? "مساء الخير" : "Good evening");
  const today = hour === null ? "" : new Intl.DateTimeFormat(rtl ? "ar-PS-u-nu-latn" : "en-GB", { weekday: "long", day: "numeric", month: "long" }).format(new Date());

  /* ── What's asked of me: my open tasks, unread replies/decisions, an unanswered survey ── */
  const todos: Todo[] = [
    ...WORKSPACES.flatMap((w) => w.tasks.filter((t) => t.owner === "me" && (s.taskStatus[t.id] ?? ((s.tasks[t.id] ?? t.done) ? "done" : "todo")) !== "done").map((t) => ({
      id: t.id, title: tx(t.title), meta: `${tx(w.title)} · ${tx(t.due)}`, href: `/projects/${w.id}#tasks`, cta: rtl ? "أنجِزها" : "Do it", kind: "task" as const,
      done: () => update((x) => ({ ...x, tasks: { ...x.tasks, [t.id]: true }, taskStatus: { ...x.taskStatus, [t.id]: "done" } })),
    }))),
    ...NOTICES.filter((n) => n.unread && (n.kind === "reply" || n.kind === "decision") && !s.read[n.id]).map((n) => ({
      id: n.id, title: tx(n.text), meta: `${tx(n.where)} · ${tx(n.time)}`, href: n.href, cta: n.kind === "reply" ? (rtl ? "ردّ" : "Reply") : (rtl ? "شارك" : "Take part"), kind: n.kind as Todo["kind"],
    })),
    ...SURVEYS.filter((v) => v.status === "open" && !(s.answered[v.id] ?? v.answered)).map((v) => ({ id: v.id, title: rtl ? `استبيان: ${tx(v.title)}` : `Survey: ${tx(v.title)}`, meta: rtl ? `${v.questions} أسئلة · ${v.minutes} دقائق` : `${v.questions} questions · ${v.minutes} min`, href: "/surveys", cta: rtl ? "أجب الآن" : "Answer", kind: "survey" as const })),
  ];
  const n = todos.length;
  const countText = rtl
    ? n === 0 ? "لا شيء ينتظرك اليوم" : n === 1 ? "أمرٌ واحد ينتظرك" : n === 2 ? "أمران ينتظرانك" : n <= 10 ? `${NUM_AR[n]} أمور تنتظرك` : `${n} أمرًا ينتظرك`
    : n === 0 ? "Nothing is waiting for you today" : `${n} things are waiting for you`;

  /* ── Places (stories), workspaces, conversations ── */
  const myWork = WORKSPACES.filter((w) => w.team.includes("me") && w.stage !== "done");
  const myGroups = GROUPS.filter((g) => s.joined[g.id] ?? g.joined);
  const roomUnread = (id: string) => (s.read[id] ? 0 : ROOM_SEED[id]?.unread ?? 0);
  const conversations = [
    ...myWork.filter((w) => ROOM_SEED[w.id]).map((w) => {
      const sent = s.messages[w.id]?.at(-1); const seed = ROOM_SEED[w.id].messages.at(-1)!;
      return { id: w.id, href: `/projects/${w.id}#chat`, title: tx(w.title), work: true, who: sent?.from ?? seed.from, text: sent ? (sent.text || "📎") : tx(seed.text), time: sent ? ago(sent.time, rtl) : tx(seed.time), unread: roomUnread(w.id) };
    }),
    ...THREADS.map((t) => {
      const sent = s.messages[t.id]?.at(-1);
      return { id: t.id, href: `/messages?t=${t.id}`, title: tx(memberOrMe(t.with).name), work: false, who: t.with, text: sent ? (sent.text || "📎") : tx(t.last), time: sent ? ago(sent.time, rtl) : tx(t.time), unread: s.read[t.id] ? 0 : t.unread };
    }),
  ].sort((a, b) => b.unread - a.unread).slice(0, 5);
  const consult = CONSULTATIONS.find((c) => c.status === "open");
  const survey = SURVEYS.find((v) => v.status === "open" && !(s.answered[v.id] ?? v.answered));
  const highlights = feed.slice(0, 2);

  const quick = [
    { icon: PenLine, label: rtl ? "منشور جديد" : "New post", href: "/community", tone: "is-blue" },
    { icon: MessagesSquare, label: rtl ? "رسالة جديدة" : "New message", href: "/members", tone: "is-teal" },
    { icon: Plus, label: rtl ? "مساحة عمل" : "Workspace", href: "/projects", tone: "is-yellow" },
    { icon: MessageCircleQuestion, label: rtl ? "اسأل المكتبة" : "Ask the library", href: "/assistant", tone: "is-navy" },
  ];

  return (
    <div className="d2">
      {/* 1 · Today + quick actions */}
      <div className="d2-row is-hero">
        <section className="d2-today">
          <span className="d2-date">{hello}، {first}{today && ` · ${today}`}</span>
          <h1>{countText}</h1>
          {todos[0] ? <p>{rtl ? "أوّلها:" : "First up:"} <strong>{todos[0].title}</strong></p> : <p>{rtl ? "تابع ما يجري في مجموعاتك ومساحات عملك." : "Catch up with your groups and workspaces."}</p>}
          <div className="d2-today-actions">
            {todos[0] && <a className="m-btn is-primary" href={todos[0].href}>{todos[0].cta}<Arrow /></a>}
            <a className="m-btn" href="#focus">{rtl ? "كل المطلوب" : "See all"}</a>
          </div>
        </section>
        <section className="d2-quick" aria-label={rtl ? "إجراءات سريعة" : "Quick actions"}>
          <p className="d-label">{rtl ? "ابدأ بسرعة" : "Quick start"}</p>
          <div>{quick.map((q) => { const I = q.icon; return <a key={q.label} href={q.href} className={`d2-q ${q.tone}`}><span><I /></span>{q.label}</a>; })}</div>
        </section>
      </div>

      {/* 2 · My places */}
      <section className="d-places" aria-label={rtl ? "أماكني" : "My places"}>
        <div className="d-stories">
          {myWork.map((w) => (
            <a key={w.id} href={`/projects/${w.id}`} className={`d-story is-work ${roomUnread(w.id) ? "is-fresh" : ""}`}>
              <span className="d-ring"><span className="d-bubble"><FolderKanban /></span></span><span className="d-story-label">{tx(w.title)}</span>
            </a>
          ))}
          {myGroups.map((g) => (
            <a key={g.id} href={`/community/${g.id}`} className={`d-story is-group ${g.posts.length > 1 ? "is-fresh" : ""}`}>
              <span className="d-ring"><span className="d-bubble">{tx(g.name).slice(0, 1)}</span></span><span className="d-story-label">{tx(g.name)}</span>
            </a>
          ))}
          <a href="/community" className="d-story is-explore"><span className="d-ring"><span className="d-bubble"><Compass /></span></span><span className="d-story-label">{rtl ? "اكتشف" : "Explore"}</span></a>
        </div>
      </section>

      {/* 3 · Focus: asked of me + agenda */}
      <div className="d2-row" id="focus">
        <Card title={rtl ? "المطلوب مني" : "Asked of me"} className="d2-span" action={<span className="d2-pill">{n}</span>}>
          {n === 0 ? <p className="m-muted">{rtl ? "أنجزت كل شيء 🎉" : "All done 🎉"}</p> : (
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
        <Card title={rtl ? "المواعيد القادمة" : "Upcoming"}>
          <div className="d2-agenda">
            {UPCOMING.map((u) => (
              <a key={u.id} href={u.href} className="d-date">
                <span className="d-cal"><b>{u.day}</b><small>{tx(u.month)}</small></span>
                <span><strong>{tx(u.title)}</strong><small>{tx(u.where)}</small></span>
              </a>
            ))}
          </div>
        </Card>
      </div>

      {/* 4 · My workspaces */}
      <section className="d2-block">
        <div className="d-section-head"><h2><FolderKanban aria-hidden="true" />{rtl ? "مساحاتي" : "My workspaces"}</h2><a className="m-more" href="/projects">{rtl ? "كل المساحات" : "All workspaces"}<Arrow /></a></div>
        <div className="m-cards">{myWork.map((w) => <WorkspaceCard key={w.id} id={w.id} />)}</div>
      </section>

      {/* 5 · Communication: conversations + community */}
      <div className="d2-row">
        <Card title={rtl ? "آخر المحادثات" : "Latest conversations"} action={<a className="m-more" href="/messages">{rtl ? "الرسائل" : "Messages"}<Arrow /></a>}>
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
        <Card title={rtl ? "من المجتمع" : "From the community"} action={<a className="m-more" href="/community">{rtl ? "افتح المجتمع" : "Open community"}<Arrow /></a>}>
          <ul className="d2-posts">
            {highlights.map((p) => { const a = memberOrMe(p.author); return (
              <li key={p.id}><a href={`/community/${p.group.id}#${p.id}`}>
                <Avatar who={a} size={36} />
                <span><span className="d2-post-meta"><strong>{tx(a.name)}</strong> · {tx(p.group.name)}</span><p>{tx(p.text)}</p><small><MessageCircle aria-hidden="true" />{p.replies + (s.comments[p.id]?.length ?? 0)} · 👍 {(p.reacts ?? 0) + (s.reactions[p.id] ? 1 : 0)}</small></span>
                {p.img && <img src={p.img} alt="" />}
              </a></li>
            ); })}
          </ul>
          <a className="d2-compose" href="/community"><Avatar who={{ ...ME, tone: 0 }} size={32} /><span>{rtl ? `شارك فكرة مع المجتمع يا ${first}…` : `Share an idea with the community, ${first}…`}</span><Users aria-hidden="true" /></a>
        </Card>
      </div>

      {/* 6 · Have your say + platform news */}
      <div className="d2-row">
        <section className="d2-say">
          <p className="d-label">{rtl ? "شارك برأيك" : "Have your say"}</p>
          {consult && (
            <a className="m-promo is-consult" href="/consultations">
              <span className="m-kicker"><Vote aria-hidden="true" />{rtl ? "استشارة مفتوحة" : "Open consultation"}</span>
              <strong>{tx(consult.title)}</strong>
              <Progress value={(consult.participants / consult.target) * 100} />
              <small>{consult.participants} / {consult.target} · {tx(consult.ends)}</small>
              <span className="m-promo-cta">{rtl ? "صوّت الآن" : "Vote now"}<Arrow /></span>
            </a>
          )}
          {survey && (
            <a className="m-promo" href="/surveys">
              <span className="m-kicker"><ClipboardList aria-hidden="true" />{rtl ? "استبيان ينتظرك" : "Survey for you"}</span>
              <strong>{tx(survey.title)}</strong>
              <small>{survey.questions} {rtl ? "أسئلة" : "questions"} · {survey.minutes} {rtl ? "دقائق" : "min"}</small>
              <span className="m-promo-cta">{rtl ? "ابدأ الآن" : "Start now"}<Arrow /></span>
            </a>
          )}
        </section>
        <Card title={rtl ? "جديد المنصة" : "New on the platform"}>
          <ul className="m-list">
            {PLATFORM_NEWS.map((x) => <li key={x.id}><a href={x.href}><span className="m-ico is-info">{x.href === "/surveys" ? <ClipboardList /> : x.href === "/news" ? <Newspaper /> : <Sparkles />}</span><span><small>{tx(x.kind)}</small><strong>{tx(x.title)}</strong></span><em className="m-date">{tx(x.date)}</em></a></li>)}
          </ul>
        </Card>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return <MemberShell active="dashboard"><Dashboard /></MemberShell>;
}
