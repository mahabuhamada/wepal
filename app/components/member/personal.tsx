"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Award, Bell, CheckCheck, Download, Eye, FolderKanban, Globe2, KeyRound, ListTodo, Lock, MapPin, MessageSquare, MessagesSquare, Pencil, Search, Settings, ShieldCheck, Trash2, UserRound, Vote } from "lucide-react";
import { Avatar, Card, Empty, MemberShell, PageHead, Tabs, memberOrMe, useMember } from "./shell";
import { AUTO_REPLY, BADGES, GROUPS, ME, NOTICES, ONLINE, ROOM_SEED, THREADS, TRACKS, WORKSPACES } from "./data";
import { ChatRoom } from "./chat";
import { ago, toast, update, useStore } from "./store";
import { PostCard, useFeed } from "./social";

function Profile() {
  const { rtl, tx } = useMember();
  const work = WORKSPACES.filter((w) => w.mine);
  const st = useStore();
  const groups = GROUPS.filter((g) => st.joined[g.id] ?? g.joined);
  const feed = useFeed();
  const [tab, setTab] = useState<"posts" | "saved">("posts");
  const shown = feed.filter((p) => (tab === "posts" ? p.author === "me" : st.saved[p.id]));
  const tasks = WORKSPACES.flatMap((w) => w.tasks).filter((t) => t.owner === "me" && t.done).length + 12;
  return (
    <>
      <div className="m-profile-hero is-me">
        <Avatar who={{ ...ME, tone: 0 }} size={92} />
        <div>
          <h1>{tx(ME.name)}</h1>
          <p className="m-muted"><MapPin aria-hidden="true" />{tx(ME.city)} · {tx(ME.joined)}</p>
          <p>{tx(ME.bio)}</p>
          <div className="m-chips is-static">{ME.interests.map((i) => <span key={i.en}>{tx(i)}</span>)}</div>
        </div>
        <a className="m-btn" href="/settings"><Pencil />{rtl ? "تعديل" : "Edit"}</a>
      </div>
      <div className="m-stats">
        <div className="m-stat"><Award aria-hidden="true" /><strong>{ME.points}</strong><span>{rtl ? "نقطة" : "points"}</span></div>
        <div className="m-stat"><ListTodo aria-hidden="true" /><strong>{tasks}</strong><span>{rtl ? "مهمة منجزة" : "tasks done"}</span></div>
        <div className="m-stat"><UserRound aria-hidden="true" /><strong>{work.length}</strong><span>{rtl ? "مساحات عمل" : "workspaces"}</span></div>
        <div className="m-stat"><Vote aria-hidden="true" /><strong>3</strong><span>{rtl ? "استشارات شاركت فيها" : "consultations"}</span></div>
      </div>
      <div className="m-grid-2">
        <Card title={rtl ? "مساحات العمل المشارك فيها" : "Workspaces I'm in"}>
          <ul className="m-list">{work.map((w) => <li key={w.id}><a href={`/projects/${w.id}`}><span><strong>{tx(w.title)}</strong><small>{tx(TRACKS[w.track])} · {w.progress}%</small></span></a></li>)}</ul>
        </Card>
        <Card title={rtl ? "الشارات والإنجازات" : "Badges & achievements"}>
          <ul className="m-badges">{BADGES.map((b) => <li key={b.id} className={b.earned ? "is-earned" : ""}><Award aria-hidden="true" /><span>{tx(b.title)}</span>{!b.earned && <small>{rtl ? "قريبًا" : "Locked"}</small>}</li>)}</ul>
        </Card>
      </div>
      <Card title={rtl ? "مجموعاتي" : "My groups"}>
        <div className="m-chips is-static">{groups.map((g) => <a key={g.id} href={`/community/${g.id}`}>{tx(g.name)}</a>)}</div>
      </Card>
      <div className="m-toolbar"><Tabs label={rtl ? "المحتوى" : "Content"} value={tab} onChange={setTab} items={[{ key: "posts", label: rtl ? "منشوراتي" : "My posts", count: feed.filter((p) => p.author === "me").length }, { key: "saved", label: rtl ? "المحفوظات" : "Saved", count: feed.filter((p) => st.saved[p.id]).length }]} /></div>
      {shown.length ? <div className="m-stack">{shown.map((p) => <PostCard key={p.id} post={p} />)}</div> : <Empty icon={tab === "posts" ? Pencil : Award} title={tab === "posts" ? (rtl ? "لم تنشر شيئًا بعد" : "You haven't posted yet") : (rtl ? "لا محفوظات بعد" : "Nothing saved yet")} text={tab === "posts" ? (rtl ? "اكتب أول منشور من «لوحتي» أو من المجتمع." : "Write your first post from Home or Community.") : (rtl ? "اضغط «احفظ» على أي منشور ليظهر هنا." : "Tap Save on any post to keep it here.")} />}
      <p className="m-privacy"><Eye aria-hidden="true" />{rtl ? "يرى الأعضاء الآخرون اسمك ومساحات عملك وشاراتك. غيّر ذلك من " : "Other members see your name, workspaces and badges. Change this in "}<a href="/settings">{rtl ? "إعدادات الخصوصية" : "privacy settings"}</a>.</p>
    </>
  );
}

type Room = { id: string; kind: "direct" | "work"; title: string; sub: string; who?: string; last: string; time: string; unread: number; online?: boolean };

function Messages() {
  const { rtl, tx } = useMember();
  const s = useStore();
  const [open, setOpen] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "direct" | "work">("all");
  const [q, setQ] = useState("");
  // Open a conversation from ?t=<room> or ?to=<member> (links from the top bar, member and team pages).
  useEffect(() => {
    const qs = new URLSearchParams(window.location.search);
    const byRoom = qs.get("t"); const byMember = qs.get("to");
    const id = byRoom ?? THREADS.find((t) => t.with === byMember)?.id;
    if (!id) return;
    const f = requestAnimationFrame(() => setOpen(id));
    return () => cancelAnimationFrame(f);
  }, []);
  const lastOf = (id: string, fallback: string, time: string) => {
    const m = s.messages[id]?.at(-1);
    return m ? { last: `${m.from === "me" ? (rtl ? "أنت: " : "You: ") : ""}${m.text || (m.attachments?.length ? (rtl ? "📎 مرفق" : "📎 Attachment") : "")}`, time: ago(m.time, rtl) } : { last: fallback, time };
  };
  const rooms: Room[] = [
    ...WORKSPACES.filter((w) => w.team.includes("me") && ROOM_SEED[w.id]).map((w) => {
      const seed = ROOM_SEED[w.id]; const sl = seed.messages.at(-1)!; const l = lastOf(w.id, `${tx(memberOrMe(sl.from).name).split(" ")[0]}: ${tx(sl.text)}`, tx(sl.time));
      return { id: w.id, kind: "work" as const, title: tx(w.title), sub: rtl ? `${w.team.length} أعضاء` : `${w.team.length} members`, ...l, unread: s.read[w.id] ? 0 : seed.unread };
    }),
    ...THREADS.map((t) => {
      const m = memberOrMe(t.with); const l = lastOf(t.id, tx(t.last), tx(t.time));
      return { id: t.id, kind: "direct" as const, title: tx(m.name), sub: tx(m.city), who: t.with, ...l, unread: s.read[t.id] ? 0 : t.unread, online: ONLINE.has(t.with) };
    }),
  ];
  const shown = rooms.filter((r) => (filter === "all" || r.kind === filter) && (!q.trim() || r.title.toLowerCase().includes(q.trim().toLowerCase())));
  const room = rooms.find((r) => r.id === open);
  const thread = THREADS.find((t) => t.id === open);
  const ws = WORKSPACES.find((w) => w.id === open);
  const unreadAll = rooms.reduce((n, r) => n + r.unread, 0);

  return (
    <>
      <PageHead icon={MessagesSquare} kicker={{ ar: "الرسائل", en: "Messages" }} title={{ ar: "الرسائل", en: "Messages" }} lead={rtl ? `محادثاتك المباشرة ومحادثات مساحات عملك في مكان واحد${unreadAll ? ` · ${unreadAll} غير مقروءة` : ""}.` : `Your direct chats and workspace chats in one place${unreadAll ? ` · ${unreadAll} unread` : ""}.`} />
      <div className={`m-chat ${room ? "has-open" : ""}`}>
        <aside className="i-list">
          <label className="m-search i-search"><Search aria-hidden="true" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={rtl ? "ابحث في المحادثات" : "Search conversations"} aria-label={rtl ? "ابحث في المحادثات" : "Search conversations"} /></label>
          <div className="i-filter" role="group" aria-label={rtl ? "نوع المحادثة" : "Conversation type"}>
            {([["all", rtl ? "الكل" : "All"], ["direct", rtl ? "مباشرة" : "Direct"], ["work", rtl ? "المساحات" : "Workspaces"]] as const).map(([k, l]) => <button key={k} aria-pressed={filter === k} onClick={() => setFilter(k)}>{l}</button>)}
          </div>
          <ul className="m-threads" aria-label={rtl ? "المحادثات" : "Conversations"}>
            {shown.map((r) => (
              <li key={r.id}><button className={`${open === r.id ? "is-active" : ""} ${r.unread ? "is-unread" : ""}`} onClick={() => setOpen(r.id)}>
                {r.kind === "work" ? <span className="i-room-ico"><FolderKanban /></span> : <Avatar who={memberOrMe(r.who!)} size={44} online={r.online} />}
                <span><span className="m-thread-top"><strong>{r.title}</strong><small>{r.time}</small></span><span className="m-thread-last">{r.last}</span></span>
                {r.unread > 0 && <b className="m-count">{r.unread}</b>}
              </button></li>
            ))}
            {shown.length === 0 && <li className="m-muted i-none">{rtl ? "لا محادثات مطابقة" : "No matching conversations"}</li>}
          </ul>
        </aside>
        <section className="m-conv">
          {!room ? <Empty icon={MessageSquare} title={rtl ? "اختر محادثة" : "Pick a conversation"} text={rtl ? "أو افتح ملف عضو واضغط «راسِل» لبدء محادثة جديدة." : "Or open a member's profile and tap Message to start one."} /> : (
            <ChatRoom key={room.id} room={room.id} group={room.kind === "work"}
              seed={ws ? ROOM_SEED[ws.id].messages : (thread?.messages ?? []).map((m) => ({ from: m.from, text: m.text, time: m.time }))}
              replyFrom={ws ? ws.team.find((m) => m !== "me") : thread?.with}
              replyText={ws ? { ar: "تمام، وصلت 👍", en: "Got it 👍" } : AUTO_REPLY[room.id]}
              header={
                <header className="c-head">
                  <button className="m-conv-back" onClick={() => setOpen(null)} aria-label={rtl ? "رجوع" : "Back"}>{rtl ? <ArrowRight /> : <ArrowLeft />}</button>
                  {ws ? <span className="i-room-ico is-sm"><FolderKanban /></span> : <Avatar who={memberOrMe(room.who!)} size={38} online={room.online} />}
                  <a href={ws ? `/projects/${ws.id}#chat` : `/members/${room.who}`}><strong>{room.title}</strong><small>{ws ? ws.team.map((m) => tx(memberOrMe(m).name).split(" ")[0]).join(rtl ? "، " : ", ") : room.online ? (rtl ? "متصل الآن" : "Online now") : room.sub}</small></a>
                  {ws && <a className="m-btn is-sm" href={`/projects/${ws.id}`}>{rtl ? "افتح المساحة" : "Open workspace"}</a>}
                </header>
              } />
          )}
        </section>
      </div>
    </>
  );
}

function Notifications() {
  const { rtl, tx } = useMember();
  const Arrow = rtl ? ArrowLeft : ArrowRight;
  const s = useStore();
  const isRead = (id: string) => s.read[id] ?? !NOTICES.find((n) => n.id === id)!.unread;
  const [tab, setTab] = useState<"all" | "unread">("all");
  const needs = NOTICES.filter((n) => n.kind !== "info");
  const info = NOTICES.filter((n) => n.kind === "info");
  const unread = NOTICES.filter((n) => !isRead(n.id)).length;
  const show = (list: typeof NOTICES) => list.filter((n) => tab === "all" || !isRead(n.id));
  const markAll = () => update((x) => ({ ...x, read: { ...x.read, ...Object.fromEntries(NOTICES.map((n) => [n.id, true])) } }));
  const row = (n: (typeof NOTICES)[number]) => (
    <li key={n.id} className={isRead(n.id) ? "" : "is-unread"}><a href={n.href} onClick={() => update((x) => ({ ...x, read: { ...x.read, [n.id]: true } }))}>
      <span className={`m-ico is-${n.kind}`}>{n.kind === "reply" ? <MessageSquare /> : n.kind === "task" ? <ListTodo /> : n.kind === "decision" ? <Vote /> : <Bell />}</span>
      <span><strong>{tx(n.text)}</strong><small>{tx(n.where)} · {tx(n.time)}</small></span><Arrow className="m-go" />
    </a></li>
  );
  return (
    <>
      <PageHead icon={Bell} kicker={{ ar: "الإشعارات", en: "Notifications" }} title={{ ar: "الإشعارات", en: "Notifications" }} lead={rtl ? `غير المقروءة: ${unread}` : `Unread: ${unread}`}
        actions={<button className="m-btn" onClick={() => { markAll(); toast(rtl ? "عُلّمت كلها كمقروءة" : "All marked as read"); }} disabled={!unread}><CheckCheck />{rtl ? "تعليم الكل كمقروء" : "Mark all read"}</button>} />
      <div className="m-toolbar"><Tabs label={rtl ? "العرض" : "View"} value={tab} onChange={setTab} items={[{ key: "all", label: rtl ? "الكل" : "All" }, { key: "unread", label: rtl ? "غير المقروءة" : "Unread", count: unread }]} /></div>
      <Card title={rtl ? "يحتاج ردّك" : "Needs your response"}>{show(needs).length ? <ul className="m-list">{show(needs).map(row)}</ul> : <Empty icon={CheckCheck} title={rtl ? "لا شيء ينتظر ردّك." : "Nothing needs a response."} />}</Card>
      <Card title={rtl ? "للعلم" : "For your information"}>{show(info).length ? <ul className="m-list">{show(info).map(row)}</ul> : <Empty icon={Bell} title={rtl ? "لا إشعارات أخرى." : "No other notifications."} />}</Card>
    </>
  );
}

function Toggle({ label, hint, defaultOn = true }: { label: string; hint?: string; defaultOn?: boolean }) {
  const [on, setOn] = useState(defaultOn);
  return <label className="m-toggle"><span><strong>{label}</strong>{hint && <small>{hint}</small>}</span><input type="checkbox" role="switch" checked={on} onChange={() => setOn(!on)} /><i aria-hidden="true" /></label>;
}

function SettingsView() {
  const { rtl, tx, lang } = useMember();
  const st = useStore();
  const [saved, setSaved] = useState(false);
  const save = (e: React.FormEvent) => { e.preventDefault(); setSaved(true); window.setTimeout(() => setSaved(false), 2200); };
  return (
    <>
      <PageHead icon={Settings} kicker={{ ar: "الإعدادات", en: "Settings" }} title={{ ar: "الإعدادات", en: "Settings" }} />
      <div className="m-health"><ShieldCheck aria-hidden="true" /><span><strong>{rtl ? "حسابك محمي" : "Your account is protected"}</strong><small>{rtl ? "كلمة مرورك محفوظة بأمان، ويمكنك إنهاء أي جلسة مفتوحة." : "Your password is stored safely and you can end any open session."}</small></span></div>
      <div className="m-grid-2">
        <form className="m-card m-form" onSubmit={save}>
          <div className="m-card-head"><h2><UserRound aria-hidden="true" />{rtl ? "الحساب والملف" : "Account & profile"}</h2></div>
          <fieldset className="m-avatar-pick">
            <legend>{rtl ? "صورتك الافتراضية" : "Your default picture"}</legend>
            <div>{Array.from({ length: 9 }, (_, i) => i + 1).map((n) => (
              <button type="button" key={n} aria-pressed={(st.myAvatar ?? ME.avatar) === n} aria-label={rtl ? `الشكل ${n}` : `Avatar ${n}`}
                onClick={() => { update((x) => ({ ...x, myAvatar: n })); toast(rtl ? "تغيّرت صورتك" : "Picture updated"); }}>
                <img src={`/avatars/a${n}.webp`} alt="" width={52} height={52} />
              </button>
            ))}</div>
          </fieldset>
          <label>{rtl ? "الاسم" : "Name"}<input defaultValue={tx(ME.name)} /></label>
          <label>{rtl ? "المدينة" : "City"}<input defaultValue={tx(ME.city)} /></label>
          <label>{rtl ? "نبذة" : "Bio"}<textarea rows={3} defaultValue={tx(ME.bio)} /></label>
          <button className="m-btn is-primary">{saved ? (rtl ? "تم الحفظ ✓" : "Saved ✓") : (rtl ? "حفظ" : "Save")}</button>
        </form>
        <div className="m-card m-form">
          <div className="m-card-head"><h2><Eye aria-hidden="true" />{rtl ? "الخصوصية والظهور" : "Privacy & visibility"}</h2></div>
          <Toggle label={rtl ? "إظهار الاسم الحقيقي" : "Show real name"} hint={rtl ? "إن أخفيته لن تظهر في دليل الأعضاء." : "If hidden, you won't appear in the directory."} />
          <Toggle label={rtl ? "إظهار الصورة" : "Show photo"} />
          <Toggle label={rtl ? "إظهار مساحات العمل" : "Show workspaces"} />
          <Toggle label={rtl ? "إظهار سجل الإنجازات" : "Show achievements"} defaultOn={false} />
          <a className="m-more" href="/profile">{rtl ? "اعرض ملفي كما يراه الآخرون" : "View my profile as others see it"}{rtl ? <ArrowLeft /> : <ArrowRight />}</a>
        </div>
        <div className="m-card m-form">
          <div className="m-card-head"><h2><Bell aria-hidden="true" />{rtl ? "التنبيهات" : "Alerts"}</h2></div>
          <Toggle label={rtl ? "ردود على منشوراتي" : "Replies to my posts"} />
          <Toggle label={rtl ? "مهام مستحقة" : "Due tasks"} />
          <Toggle label={rtl ? "استشارات واستبيانات جديدة" : "New consultations and surveys"} />
          <Toggle label={rtl ? "ملخص أسبوعي بالبريد" : "Weekly email digest"} defaultOn={false} />
        </div>
        <div className="m-card m-form">
          <div className="m-card-head"><h2><Globe2 aria-hidden="true" />{rtl ? "اللغة والعرض" : "Language & display"}</h2></div>
          <p className="m-muted">{rtl ? "لغة الواجهة الحالية:" : "Current interface language:"} <strong><span className="lang-code">{lang === "ar" ? "ع" : "EN"}</span>{rtl ? "العربية" : "English"}</strong></p>
          <p className="m-muted">{rtl ? "بدّل اللغة من الشريط العلوي أو من قائمة «المزيد»." : "Switch language from the top bar or the \"More\" menu."}</p>
          <div className="m-card-head"><h2><KeyRound aria-hidden="true" />{rtl ? "كلمة المرور" : "Password"}</h2></div>
          <button className="m-btn">{rtl ? "تغيير كلمة المرور" : "Change password"}</button>
        </div>
      </div>
      <div className="m-card m-form is-danger">
        <div className="m-card-head"><h2><Lock aria-hidden="true" />{rtl ? "بياناتك" : "Your data"}</h2></div>
        <p className="m-muted">{rtl ? "نزّل نسخة من بياناتك، أو احذف حسابك نهائيًا." : "Download a copy of your data, or delete your account permanently."}</p>
        <div className="m-row-actions"><button className="m-btn"><Download />{rtl ? "تنزيل نسخة من بياناتي" : "Download my data"}</button><button className="m-btn is-danger"><Trash2 />{rtl ? "حذف الحساب" : "Delete account"}</button></div>
      </div>
    </>
  );
}

export function ProfilePage() { return <MemberShell active="profile"><Profile /></MemberShell>; }
export function MessagesPage() { return <MemberShell active="messages"><Messages /></MemberShell>; }
export function NotificationsPage() { return <MemberShell active="notifications"><Notifications /></MemberShell>; }
export function SettingsPage() { return <MemberShell active="settings"><SettingsView /></MemberShell>; }
