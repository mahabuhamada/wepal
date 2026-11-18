"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, ArrowRight, CalendarDays, CheckCircle2, FolderKanban, LayoutDashboard, ListTodo, MessageCircle, Paperclip, Plus, Search, Upload, Users } from "lucide-react";
import { Avatar, Card, Empty, MemberShell, PageHead, Progress, Stages, Tabs, memberOrMe, useMember } from "./shell";
import { ROOM_SEED, STAGES, TRACKS, WORKSPACES, WS_FILES, workspaceById, type Track } from "./data";
import { AttachmentView, ChatRoom } from "./chat";
import { ago, readFiles, toast, uid, update, useStore } from "./store";

type Status = "todo" | "doing" | "done";

/** Unread chat count for a workspace (seeded unread until the room is opened). */
export function useRoomUnread(id: string) {
  const s = useStore();
  return s.read[id] ? 0 : ROOM_SEED[id]?.unread ?? 0;
}

export function WorkspaceCard({ id }: { id: string }) {
  const { tx } = useMember();
  const w = workspaceById(id)!;
  const unread = useRoomUnread(id);
  return (
    <a href={`/projects/${w.id}`} className={`m-ws track-${w.track}`}>
      <div className="m-ws-top"><span className="m-tag">{tx(TRACKS[w.track])}</span><span className={`m-stage stage-${w.stage}`}>{tx(STAGES[w.stage])}</span></div>
      <h3>{tx(w.title)}</h3>
      <p>{tx(w.summary)}</p>
      <Progress value={w.progress} label={`${w.progress}%`} />
      <div className="m-ws-foot">
        <span className="m-team">{w.team.slice(0, 4).map((m) => <Avatar key={m} who={memberOrMe(m)} size={26} />)}</span>
        <small><CalendarDays aria-hidden="true" />{tx(w.due)}</small>
        {unread > 0 && <span className="w-unread"><MessageCircle aria-hidden="true" />{unread}</span>}
      </div>
    </a>
  );
}

function Workspaces() {
  const { rtl, tx } = useMember();
  const [scope, setScope] = useState<"mine" | "all">("mine");
  const [track, setTrack] = useState<Track | "all">("all");
  const [q, setQ] = useState("");
  const list = useMemo(() => WORKSPACES.filter((w) => (scope === "all" || w.mine) && (track === "all" || w.track === track) && (!q.trim() || (tx(w.title) + tx(w.summary)).toLowerCase().includes(q.trim().toLowerCase()))), [scope, track, q, tx]);
  const active = WORKSPACES.filter((w) => w.stage !== "done").length;

  return (
    <>
      <PageHead icon={FolderKanban} kicker={{ ar: "مساحات العمل", en: "Workspaces" }}
        title={{ ar: "مساحات العمل", en: "Workspaces" }}
        lead={rtl ? `${active} مساحات عمل نشطة. لكل مساحة محادثة جماعية ومهام وملفات.` : `${active} active workspaces. Each has a group chat, tasks and files.`}
        actions={<button className="m-btn is-primary" onClick={() => toast(rtl ? "سيُفتح نموذج اقتراح مساحة عمل عند ربط المنصة" : "The workspace proposal form opens once the platform is connected")}><Plus />{rtl ? "اقترح مساحة عمل" : "Propose a workspace"}</button>} />
      <div className="m-toolbar">
        <Tabs label={rtl ? "النطاق" : "Scope"} value={scope} onChange={setScope} items={[{ key: "mine", label: rtl ? "مساحاتي" : "Mine", count: WORKSPACES.filter((w) => w.mine).length }, { key: "all", label: rtl ? "كل المساحات" : "All", count: WORKSPACES.length }]} />
        <label className="m-search"><Search aria-hidden="true" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={rtl ? "ابحث بالعنوان أو الوصف…" : "Search title or description…"} aria-label={rtl ? "البحث في مساحات العمل" : "Search workspaces"} /></label>
      </div>
      <div className="m-chips" role="group" aria-label={rtl ? "المسار" : "Track"}>
        {(["all", "research", "initiative", "digital"] as const).map((t) => <button key={t} aria-pressed={track === t} onClick={() => setTrack(t)}>{t === "all" ? (rtl ? "كل المسارات" : "All tracks") : tx(TRACKS[t])}</button>)}
      </div>
      {list.length === 0 ? <Empty icon={Search} title={rtl ? "لا مساحات عمل تطابق بحثك" : "No workspaces match"} text={rtl ? "جرّب كلمة أخرى أو بدّل النطاق." : "Try another word or switch scope."} />
        : <div className="m-cards">{list.map((w) => <WorkspaceCard key={w.id} id={w.id} />)}</div>}
    </>
  );
}

type Tab = "overview" | "chat" | "tasks" | "files" | "team";
const TABS: Tab[] = ["overview", "chat", "tasks", "files", "team"];

function WorkspaceDetail() {
  const { rtl, tx } = useMember();
  const Arrow = rtl ? ArrowLeft : ArrowRight;
  const params = useParams<{ id: string }>();
  const ws = workspaceById(String(params?.id ?? ""));
  const st = useStore();
  const unread = useRoomUnread(ws?.id ?? "");
  const [tab, setTab] = useState<Tab>("overview");
  const [newTask, setNewTask] = useState("");
  useEffect(() => {
    const h = window.location.hash.slice(1) as Tab;
    if (!TABS.includes(h)) return;
    const id = requestAnimationFrame(() => { setTab(h); if (h === "chat") requestAnimationFrame(() => document.querySelector(".w-tabs")?.scrollIntoView({ block: "start" })); });
    return () => cancelAnimationFrame(id);
  }, []);
  const go = (t: Tab) => {
    setTab(t); history.replaceState(null, "", `#${t}`);
    // Bring the tabs to the top so the chosen section (the chat especially) is in view.
    requestAnimationFrame(() => document.querySelector(".w-tabs")?.scrollIntoView({ block: "start", behavior: "smooth" }));
  };
  if (!ws) return <Empty icon={FolderKanban} title={rtl ? "لم نجد مساحة العمل هذه" : "Workspace not found"} text={rtl ? "ربما حُذفت أو تغيّر رابطها." : "It may have been removed or moved."} />;

  const member = ws.team.includes("me");
  const statusOf = (id: string, done: boolean): Status => st.taskStatus[id] ?? ((st.tasks[id] ?? done) ? "done" : "todo");
  const tasks = [
    ...ws.tasks.map((t) => ({ id: t.id, title: tx(t.title), owner: t.owner, due: tx(t.due), status: statusOf(t.id, t.done) })),
    ...st.newTasks.filter((t) => t.ws === ws.id).map((t) => ({ id: t.id, title: t.title, owner: "me", due: ago(t.time, rtl), status: st.taskStatus[t.id] ?? t.status })),
  ];
  const setStatus = (id: string, status: Status, title: string) => {
    update((x) => ({ ...x, taskStatus: { ...x.taskStatus, [id]: status }, tasks: { ...x.tasks, [id]: status === "done" } }));
    if (status === "done") toast(rtl ? `أُنجزت «${title}» 🎉` : `"${title}" done 🎉`);
  };
  const addTask = (e: React.FormEvent) => {
    e.preventDefault(); if (!newTask.trim()) return;
    update((x) => ({ ...x, newTasks: [...x.newTasks, { id: uid(), ws: ws.id, title: newTask.trim(), status: "todo", time: Date.now() }] }));
    setNewTask(""); toast(rtl ? "أُضيفت المهمة" : "Task added");
  };
  const done = tasks.filter((t) => t.status === "done").length;
  const chatFiles = [
    ...(ROOM_SEED[ws.id]?.messages ?? []).flatMap((m) => (m.attachments ?? []).map((a) => ({ ...a, by: m.from, when: tx(m.time) }))),
    ...(st.messages[ws.id] ?? []).flatMap((m) => (m.attachments ?? []).map((a) => ({ ...a, by: m.from, when: ago(m.time, rtl) }))),
  ];
  const files = [...(st.files[ws.id] ?? []).map((f) => ({ ...f, when: ago(f.time, rtl) })), ...chatFiles, ...(WS_FILES[ws.id] ?? []).map((f) => ({ ...f, when: tx(f.when) }))];
  const upload = async (list: FileList | null) => {
    if (!list?.length) return;
    const atts = await readFiles(list);
    update((x) => ({ ...x, files: { ...x.files, [ws.id]: [...atts.map((a) => ({ ...a, by: "me", time: Date.now() })), ...(x.files[ws.id] ?? [])] } }));
    toast(rtl ? `رُفع ${atts.length} ملف` : `${atts.length} file(s) uploaded`);
  };
  const lastChat = () => {
    const last = (st.messages[ws.id] ?? []).at(-1); const seedLast = ROOM_SEED[ws.id]?.messages.at(-1);
    return last ? (last.text || last.attachments?.[0]?.name) : seedLast ? tx(seedLast.text) : (rtl ? "ابدأ المحادثة" : "Start the conversation");
  };
  const cols: { key: Status; label: string }[] = [{ key: "todo", label: rtl ? "للتنفيذ" : "To do" }, { key: "doing", label: rtl ? "قيد العمل" : "In progress" }, { key: "done", label: rtl ? "منجزة" : "Done" }];
  const tabs: { key: Tab; label: string; icon: typeof ListTodo; count?: number }[] = [
    { key: "overview", label: rtl ? "نظرة عامة" : "Overview", icon: LayoutDashboard },
    { key: "chat", label: rtl ? "المحادثة" : "Chat", icon: MessageCircle, count: unread || undefined },
    { key: "tasks", label: rtl ? "المهام" : "Tasks", icon: ListTodo, count: tasks.length - done || undefined },
    { key: "files", label: rtl ? "الملفات" : "Files", icon: Paperclip, count: files.length || undefined },
    { key: "team", label: rtl ? "الفريق" : "Team", icon: Users, count: ws.team.length },
  ];

  return (
    <>
      <a className="m-back" href="/projects">{rtl ? <ArrowRight /> : <ArrowLeft />}{rtl ? "مساحات العمل" : "Workspaces"}</a>
      <section className={`w-cover track-${ws.track}`}>
        <div className="w-cover-main">
          <div className="w-cover-tags"><span className="m-tag">{tx(TRACKS[ws.track])}</span><span className={`m-stage stage-${ws.stage}`}>{tx(STAGES[ws.stage])}</span></div>
          <h1>{tx(ws.title)}</h1>
          <p>{tx(ws.summary)}</p>
          <Stages stage={ws.stage} />
        </div>
        <div className="w-cover-side">
          <div className="w-ring" style={{ ["--p" as string]: `${ws.progress}` }}><b>{ws.progress}%</b><small>{rtl ? "التقدّم" : "Progress"}</small></div>
          <div className="w-cover-meta"><span className="m-team">{ws.team.map((m) => <Avatar key={m} who={memberOrMe(m)} size={30} />)}</span><small><CalendarDays aria-hidden="true" />{tx(ws.due)}</small></div>
          {member && <button className="m-btn is-primary" onClick={() => go("chat")}><MessageCircle />{rtl ? "افتح المحادثة" : "Open chat"}</button>}
        </div>
      </section>

      <nav className="w-tabs" role="tablist" aria-label={rtl ? "أقسام مساحة العمل" : "Workspace sections"}>
        {tabs.map((t) => { const I = t.icon; return <button key={t.key} role="tab" aria-selected={tab === t.key} onClick={() => go(t.key)}><I aria-hidden="true" />{t.label}{t.count !== undefined && <b>{t.count}</b>}</button>; })}
      </nav>

      {tab === "overview" && (
        <div className="m-grid-3">
          <div className="m-stack">
            <Card title={rtl ? "المهام المفتوحة" : "Open tasks"} action={<button className="m-more" onClick={() => go("tasks")}>{rtl ? "لوحة المهام" : "Task board"}<Arrow /></button>}>
              {tasks.filter((t) => t.status !== "done").length === 0 ? <p className="m-muted">{rtl ? "لا مهام مفتوحة 🎉" : "No open tasks 🎉"}</p> : (
                <ul className="m-list">{tasks.filter((t) => t.status !== "done").map((t) => <li key={t.id}><div className="m-row"><span className={`m-ico ${t.status === "doing" ? "is-reply" : "is-task"}`}><ListTodo /></span><span><strong>{t.title}</strong><small>{tx(memberOrMe(t.owner).name)} · {t.due}</small></span>{member && <button className="m-btn is-sm" onClick={() => setStatus(t.id, "done", t.title)}><CheckCircle2 />{rtl ? "أنجزت" : "Done"}</button>}</div></li>)}</ul>
              )}
            </Card>
            <Card title={rtl ? "آخر النشاط" : "Recent activity"}>
              {ws.updates.length === 0 ? <p className="m-muted">{rtl ? "لا نشاط بعد" : "No activity yet"}</p> : (
                <ul className="d-week">{ws.updates.map((u, i) => { const m = memberOrMe(u.who); return <li key={i}><Avatar who={m} size={32} /><span><strong>{tx(m.name)}</strong> {tx(u.text)}<small>{tx(u.time)}</small></span></li>; })}</ul>
              )}
            </Card>
          </div>
          <div className="m-stack">
            {member && (
              <button className="w-chat-teaser" onClick={() => go("chat")}>
                <MessageCircle aria-hidden="true" />
                <span><strong>{rtl ? "محادثة الفريق" : "Team chat"}</strong><small>{lastChat()}</small></span>
                {unread > 0 && <b className="m-count">{unread}</b>}
              </button>
            )}
            <Card title={rtl ? `المهام: ${done} من ${tasks.length}` : `Tasks: ${done} of ${tasks.length}`}><Progress value={tasks.length ? (done / tasks.length) * 100 : 0} /></Card>
            <Card title={rtl ? "أحدث الملفات" : "Latest files"} action={<button className="m-more" onClick={() => go("files")}>{rtl ? "كل الملفات" : "All files"}<Arrow /></button>}>
              {files.length ? <div className="w-file-list">{files.slice(0, 3).map((f, i) => <AttachmentView key={i} a={f} compact />)}</div> : <p className="m-muted">{rtl ? "لا ملفات بعد" : "No files yet"}</p>}
            </Card>
          </div>
        </div>
      )}

      {tab === "chat" && (member ? (
        <div className="w-chat">
          <ChatRoom room={ws.id} seed={ROOM_SEED[ws.id]?.messages ?? []} group where={tx(ws.title)} href={`/projects/${ws.id}#chat`} replyFrom={ws.team.find((m) => m !== "me")} replyText={{ ar: "تمام، وصلت 👍 سأطّلع عليها.", en: "Got it 👍 I'll take a look." }}
            header={<header className="c-head"><span className="w-chat-ico"><FolderKanban /></span><span><strong>{tx(ws.title)}</strong><small>{ws.team.map((m) => tx(memberOrMe(m).name).split(" ")[0]).join(rtl ? "، " : ", ")}</small></span><span className="m-team">{ws.team.slice(0, 4).map((m) => <Avatar key={m} who={memberOrMe(m)} size={28} />)}</span></header>}
            placeholder={rtl ? "اكتب للفريق… (يمكنك سحب الملفات وإفلاتها هنا)" : "Message the team… (you can drop files here)"} />
        </div>
      ) : <Empty icon={MessageCircle} title={rtl ? "المحادثة لأعضاء الفريق" : "Chat is for the team"} text={rtl ? "اطلب الانضمام إلى المساحة لتشارك في محادثتها." : "Ask to join the workspace to take part in its chat."} />)}

      {tab === "tasks" && (
        <>
          {member && <form className="w-add" onSubmit={addTask}><Plus aria-hidden="true" /><input value={newTask} onChange={(e) => setNewTask(e.target.value)} placeholder={rtl ? "أضف مهمة جديدة…" : "Add a new task…"} aria-label={rtl ? "مهمة جديدة" : "New task"} /><button className="m-btn is-primary is-sm" disabled={!newTask.trim()}>{rtl ? "أضف" : "Add"}</button></form>}
          <div className="w-board">
            {cols.map((c) => { const items = tasks.filter((t) => t.status === c.key); return (
              <section key={c.key} className={`w-col is-${c.key}`}>
                <h3>{c.label}<b>{items.length}</b></h3>
                {items.length === 0 ? <p className="w-col-empty">{rtl ? "لا شيء هنا" : "Nothing here"}</p> : items.map((t) => (
                  <article key={t.id} className="w-task">
                    <strong>{t.title}</strong>
                    <div className="w-task-foot"><Avatar who={memberOrMe(t.owner)} size={24} /><small>{t.due}</small></div>
                    {member && <div className="w-task-move">{cols.filter((x) => x.key !== c.key).map((x) => <button key={x.key} onClick={() => setStatus(t.id, x.key, t.title)}>{x.key === "done" ? "✓ " : ""}{x.label}</button>)}</div>}
                  </article>
                ))}
              </section>
            ); })}
          </div>
        </>
      )}

      {tab === "files" && (
        <Card title={rtl ? `ملفات المساحة (${files.length})` : `Workspace files (${files.length})`} action={member ? <label className="m-btn is-sm is-primary"><Upload />{rtl ? "ارفع ملفًا" : "Upload"}<input type="file" multiple hidden onChange={(e) => { upload(e.target.files); e.target.value = ""; }} /></label> : undefined}>
          {files.length === 0 ? <Empty icon={Paperclip} title={rtl ? "لا ملفات بعد" : "No files yet"} /> : (
            <ul className="w-files">{files.map((f, i) => <li key={i}><AttachmentView a={f} compact /><small>{tx(memberOrMe(f.by).name)} · {f.when}</small></li>)}</ul>
          )}
        </Card>
      )}

      {tab === "team" && (
        <div className="m-cards is-people">
          {ws.team.map((id) => { const m = memberOrMe(id); return (
            <div key={id} className="m-person">
              <a className="m-person-link" href={id === "me" ? "/profile" : `/members/${id}`}><Avatar who={m} size={60} /><strong>{tx(m.name)}</strong><small>{tx(m.city)}</small><span className="m-tag">{id === ws.team[0] ? (rtl ? "منسّق المساحة" : "Coordinator") : (rtl ? "عضو الفريق" : "Team member")}</span></a>
              {id !== "me" && <a className="m-btn is-sm" href={`/messages?to=${id}`}><MessageCircle />{rtl ? "راسِل" : "Message"}</a>}
            </div>
          ); })}
        </div>
      )}
    </>
  );
}

export function WorkspacesPage() { return <MemberShell active="projects"><Workspaces /></MemberShell>; }
export function WorkspaceDetailPage() { return <MemberShell active="projects"><WorkspaceDetail /></MemberShell>; }
