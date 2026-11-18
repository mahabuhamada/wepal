"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Bell, CheckCircle2, ClipboardList, FolderKanban, House, ListTodo, MessageSquare, Users, Vote } from "lucide-react";
import { Avatar, Card, MemberShell, PageHead, Progress, useMember } from "./shell";
import { CONSULTATIONS, GROUPS, ME, NOTICES, STAGES, SURVEYS, WORKSPACES, memberById } from "./data";

function Dashboard() {
  const { rtl, tx } = useMember();
  const Arrow = rtl ? ArrowLeft : ArrowRight;
  const [hour, setHour] = useState<number | null>(null);
  useEffect(() => { const id = requestAnimationFrame(() => setHour(new Date().getHours())); return () => cancelAnimationFrame(id); }, []);
  const first = tx(ME.name).split(" ")[0];
  const greet = hour === null ? (rtl ? `أهلًا، ${first}` : `Hello, ${first}`) : hour < 12 ? (rtl ? `صباح الخير، ${first}` : `Good morning, ${first}`) : (rtl ? `مساء الخير، ${first}` : `Good evening, ${first}`);

  const mine = WORKSPACES.filter((w) => w.mine && w.stage !== "done");
  const myTasks = WORKSPACES.flatMap((w) => w.tasks.filter((t) => t.owner === "me" && !t.done).map((t) => ({ ...t, ws: w })));
  // Task notices are already listed as tasks, so only non-task notices join them here.
  const waiting = NOTICES.filter((n) => n.unread && n.kind !== "task");
  const myGroups = GROUPS.filter((g) => g.joined);
  const feed = myGroups.flatMap((g) => g.posts.map((p) => ({ ...p, group: g }))).slice(0, 4);
  const consult = CONSULTATIONS.find((c) => c.status === "open");
  const survey = SURVEYS.find((s) => s.status === "open" && !s.answered);
  const pending = waiting.length + myTasks.length;
  const pendingText = rtl
    ? pending === 0 ? "لا شيء ينتظرك الآن." : pending === 1 ? "أمر واحد ينتظرك." : pending === 2 ? "أمران ينتظرانك." : pending <= 10 ? `${pending} أمور تنتظرك.` : `${pending} أمرًا ينتظرك.`
    : pending === 0 ? "Nothing is waiting for you." : `${pending} things are waiting for you.`;

  const stats = [
    { icon: FolderKanban, n: mine.length, label: rtl ? "مساحات عمل نشطة" : "Active workspaces", href: "/projects" },
    { icon: ListTodo, n: myTasks.length, label: rtl ? "مهام مفتوحة" : "Open tasks", href: "/projects" },
    { icon: Bell, n: waiting.length, label: rtl ? "إشعارات جديدة" : "New notifications", href: "/notifications" },
    { icon: Users, n: myGroups.length, label: rtl ? "مجموعاتي" : "My groups", href: "/community" },
  ];

  return (
    <>
      <PageHead icon={House} kicker={{ ar: "لوحتي", en: "My home" }} title={greet} lead={pendingText} />

      <div className="m-stats">
        {stats.map((s) => { const I = s.icon; return <Link key={s.label} href={s.href} className="m-stat"><I aria-hidden="true" /><strong>{s.n}</strong><span>{s.label}</span></Link>; })}
      </div>

      <div className="m-grid-2">
        <Card title={rtl ? "يحتاج انتباهك" : "Needs your attention"} action={<Link className="m-more" href="/notifications">{rtl ? "الكل" : "All"}<Arrow /></Link>}>
          <ul className="m-list">
            {myTasks.map((t) => (
              <li key={t.id}><Link href={`/projects/${t.ws.id}`}><span className="m-ico is-task"><ListTodo /></span><span><strong>{tx(t.title)}</strong><small>{tx(t.ws.title)} · {tx(t.due)}</small></span><Arrow className="m-go" /></Link></li>
            ))}
            {waiting.map((n) => (
              <li key={n.id}><Link href={n.href}><span className={`m-ico is-${n.kind}`}>{n.kind === "reply" ? <MessageSquare /> : n.kind === "decision" ? <Vote /> : <Bell />}</span><span><strong>{tx(n.text)}</strong><small>{tx(n.where)} · {tx(n.time)}</small></span><Arrow className="m-go" /></Link></li>
            ))}
          </ul>
        </Card>

        <Card title={rtl ? "مساحات عملي" : "My workspaces"} action={<Link className="m-more" href="/projects">{rtl ? "كل المساحات" : "All workspaces"}<Arrow /></Link>}>
          <ul className="m-list">
            {mine.map((w) => (
              <li key={w.id}><Link href={`/projects/${w.id}`} className="m-ws-row">
                <span className="m-ws-main"><strong>{tx(w.title)}</strong><small>{tx(STAGES[w.stage])} · {tx(w.due)}</small><Progress value={w.progress} label={`${w.progress}%`} /></span>
                <span className="m-ws-pct">{w.progress}%</span>
              </Link></li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="m-grid-3">
        <Card title={rtl ? "نشاط مجموعاتي" : "Activity in my groups"} className="m-span-2" action={<Link className="m-more" href="/community">{rtl ? "المجتمع" : "Community"}<Arrow /></Link>}>
          <ul className="m-feed">
            {feed.map((p) => { const a = memberById(p.author)!; return (
              <li key={p.id}><Link href={`/community/${p.group.id}`}>
                <Avatar who={a} size={38} />
                <span><span className="m-feed-meta"><strong>{tx(a.name)}</strong> · {tx(p.group.name)} · {tx(p.time)}</span><p>{tx(p.text)}</p><small><MessageSquare aria-hidden="true" />{p.replies} {rtl ? "ردود" : "replies"}</small></span>
              </Link></li>
            ); })}
          </ul>
        </Card>

        <div className="m-stack">
          {consult && (
            <Link className="m-promo is-consult" href="/consultations">
              <span className="m-kicker"><Vote aria-hidden="true" />{rtl ? "استشارة مفتوحة" : "Open consultation"}</span>
              <strong>{tx(consult.title)}</strong>
              <Progress value={(consult.participants / consult.target) * 100} />
              <small>{consult.participants} / {consult.target} {rtl ? "مشارك" : "participants"} · {tx(consult.ends)}</small>
              <span className="m-promo-cta">{rtl ? "شارك برأيك" : "Have your say"}<Arrow /></span>
            </Link>
          )}
          {survey && (
            <Link className="m-promo" href="/surveys">
              <span className="m-kicker"><ClipboardList aria-hidden="true" />{rtl ? "استبيان ينتظرك" : "Survey for you"}</span>
              <strong>{tx(survey.title)}</strong>
              <small>{survey.questions} {rtl ? "أسئلة" : "questions"} · {survey.minutes} {rtl ? "دقائق" : "min"}</small>
              <span className="m-promo-cta">{rtl ? "ابدأ الآن" : "Start now"}<Arrow /></span>
            </Link>
          )}
          <div className="m-promo is-quiet">
            <span className="m-kicker"><CheckCircle2 aria-hidden="true" />{rtl ? "رصيدك" : "Your record"}</span>
            <strong>{ME.points} {rtl ? "نقطة" : "points"}</strong>
            <small>{rtl ? "3 شارات من 5 · " : "3 of 5 badges · "}<Link href="/profile">{rtl ? "ملفك" : "Your profile"}</Link></small>
          </div>
        </div>
      </div>
    </>
  );
}

export default function DashboardPage() {
  return <MemberShell active="dashboard"><Dashboard /></MemberShell>;
}
