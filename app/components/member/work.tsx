"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, ArrowRight, CalendarDays, CheckCircle2, Circle, FolderKanban, Plus, Search, Users } from "lucide-react";
import { Avatar, Card, Empty, MemberShell, PageHead, Progress, Stages, Tabs, memberOrMe, useMember } from "./shell";
import { toast, update, useStore } from "./store";
import { STAGES, TRACKS, WORKSPACES, workspaceById, type Track } from "./data";

function Workspaces() {
  const { rtl, tx } = useMember();
  const Arrow = rtl ? ArrowLeft : ArrowRight;
  const [scope, setScope] = useState<"mine" | "all">("mine");
  const [track, setTrack] = useState<Track | "all">("all");
  const [q, setQ] = useState("");
  const list = useMemo(() => WORKSPACES.filter((w) => (scope === "all" || w.mine) && (track === "all" || w.track === track) && (!q.trim() || (tx(w.title) + tx(w.summary)).toLowerCase().includes(q.trim().toLowerCase()))), [scope, track, q, tx]);
  const active = WORKSPACES.filter((w) => w.stage !== "done").length;

  return (
    <>
      <PageHead icon={FolderKanban} kicker={{ ar: "مساحات العمل", en: "Workspaces" }}
        title={{ ar: "مساحات العمل", en: "Workspaces" }}
        lead={rtl ? `${active} مساحات عمل نشطة عبر 3 مسارات.` : `${active} active workspaces across 3 tracks.`}
        actions={<button className="m-btn is-primary" onClick={() => alert(rtl ? "سيُفتح نموذج إنشاء مساحة عمل عند ربط المنصة." : "The new workspace form opens once the platform is connected.")}><Plus />{rtl ? "مساحة عمل جديدة" : "New workspace"}</button>} />

      <div className="m-toolbar">
        <Tabs label={rtl ? "النطاق" : "Scope"} value={scope} onChange={setScope} items={[{ key: "mine", label: rtl ? "مساحات عملي" : "Mine", count: WORKSPACES.filter((w) => w.mine).length }, { key: "all", label: rtl ? "كل المساحات" : "All", count: WORKSPACES.length }]} />
        <label className="m-search"><Search aria-hidden="true" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={rtl ? "ابحث بالعنوان أو الوصف…" : "Search title or description…"} aria-label={rtl ? "البحث في مساحات العمل" : "Search workspaces"} /></label>
      </div>
      <div className="m-chips" role="group" aria-label={rtl ? "المسار" : "Track"}>
        {(["all", "research", "initiative", "digital"] as const).map((t) => <button key={t} aria-pressed={track === t} onClick={() => setTrack(t)}>{t === "all" ? (rtl ? "كل المسارات" : "All tracks") : tx(TRACKS[t])}</button>)}
      </div>

      {list.length === 0 ? <Empty icon={Search} title={rtl ? "لا مساحات عمل تطابق بحثك" : "No workspaces match"} text={rtl ? "جرّب كلمة أخرى أو بدّل النطاق." : "Try another word or switch scope."} /> : (
        <div className="m-cards">
          {list.map((w) => (
            <a key={w.id} href={`/projects/${w.id}`} className={`m-ws track-${w.track}`}>
              <div className="m-ws-top"><span className="m-tag">{tx(TRACKS[w.track])}</span><span className={`m-stage stage-${w.stage}`}>{tx(STAGES[w.stage])}</span></div>
              <h3>{tx(w.title)}</h3>
              <p>{tx(w.summary)}</p>
              <Progress value={w.progress} label={`${w.progress}%`} />
              <div className="m-ws-foot">
                <span className="m-team">{w.team.slice(0, 3).map((id) => <Avatar key={id} who={memberOrMe(id)} size={26} />)}</span>
                <small><CalendarDays aria-hidden="true" />{tx(w.due)}</small>
                <Arrow className="m-go" />
              </div>
            </a>
          ))}
        </div>
      )}
    </>
  );
}

function WorkspaceDetail() {
  const { rtl, tx } = useMember();
  const Arrow = rtl ? ArrowLeft : ArrowRight;
  const params = useParams<{ id: string }>();
  const ws = workspaceById(String(params?.id ?? ""));
  const st = useStore();
  const done: Record<string, boolean> = Object.fromEntries((ws?.tasks ?? []).map((t) => [t.id, st.tasks[t.id] ?? t.done]));
  const toggleTask = (id: string, title: string) => {
    const next = !done[id];
    update((x) => ({ ...x, tasks: { ...x.tasks, [id]: next } }));
    if (next) toast(rtl ? `أُنجزت «${title}» 🎉` : `"${title}" done 🎉`);
  };
  if (!ws) return <Empty icon={FolderKanban} title={rtl ? "لم نجد مساحة العمل هذه" : "Workspace not found"} text={rtl ? "ربما حُذفت أو تغيّر رابطها." : "It may have been removed or moved."} />;
  const total = ws.tasks.length; const finished = ws.tasks.filter((t) => done[t.id]).length;

  return (
    <>
      <a className="m-back" href="/projects">{rtl ? <ArrowRight /> : <ArrowLeft />}{rtl ? "مساحات العمل" : "Workspaces"}</a>
      <PageHead icon={FolderKanban} kicker={TRACKS[ws.track]} title={ws.title} lead={ws.summary}
        actions={<span className={`m-stage stage-${ws.stage} is-lg`}>{tx(STAGES[ws.stage])}</span>} />
      <Stages stage={ws.stage} />

      <div className="m-grid-3">
        <Card title={rtl ? `المهام (${finished}/${total})` : `Tasks (${finished}/${total})`} className="m-span-2">
          {total === 0 ? <Empty icon={CheckCircle2} title={rtl ? "لا مهام بعد" : "No tasks yet"} text={rtl ? "أضف أول مهمة لتبدأ المساحة." : "Add the first task to get started."} /> : (
            <ul className="m-tasks">
              {ws.tasks.map((t) => { const owner = memberOrMe(t.owner); const isDone = done[t.id]; return (
                <li key={t.id} className={isDone ? "is-done" : ""}>
                  <button onClick={() => toggleTask(t.id, tx(t.title))} aria-pressed={isDone} aria-label={isDone ? (rtl ? "أعد فتح المهمة" : "Reopen task") : (rtl ? "أكمل المهمة" : "Complete task")}>{isDone ? <CheckCircle2 /> : <Circle />}</button>
                  <span><strong>{tx(t.title)}</strong><small>{tx(owner.name)} · {tx(t.due)}</small></span>
                  <Avatar who={owner} size={28} />
                </li>
              ); })}
            </ul>
          )}
        </Card>
        <div className="m-stack">
          <Card title={rtl ? "التقدّم" : "Progress"}>
            <div className="m-big-pct">{ws.progress}%</div>
            <Progress value={ws.progress} />
            <p className="m-muted"><CalendarDays aria-hidden="true" />{tx(ws.due)}</p>
          </Card>
          <Card title={rtl ? "فريق مساحة العمل" : "Workspace team"}>
            <ul className="m-people">
              {ws.team.map((id) => { const m = memberOrMe(id); return <li key={id}><a href={id === "me" ? "/profile" : `/members/${id}`}><Avatar who={m} size={34} /><span><strong>{tx(m.name)}</strong><small>{tx(m.city)}</small></span><Arrow className="m-go" /></a></li>; })}
            </ul>
          </Card>
        </div>
      </div>

      <Card title={rtl ? "آخر التحديثات" : "Latest updates"}>
        {ws.updates.length === 0 ? <Empty icon={Users} title={rtl ? "لا تحديثات بعد" : "No updates yet"} /> : (
          <ul className="m-feed">
            {ws.updates.map((u, i) => { const m = memberOrMe(u.who); return <li key={i}><div><Avatar who={m} size={34} /><span><span className="m-feed-meta"><strong>{tx(m.name)}</strong> · {tx(u.time)}</span><p>{tx(u.text)}</p></span></div></li>; })}
          </ul>
        )}
      </Card>
    </>
  );
}

export function WorkspacesPage() { return <MemberShell active="projects"><Workspaces /></MemberShell>; }
export function WorkspaceDetailPage() { return <MemberShell active="projects"><WorkspaceDetail /></MemberShell>; }
