"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Award, Bell, CheckCheck, Download, Eye, Globe2, KeyRound, ListTodo, Lock, MapPin, MessageSquare, MessagesSquare, Pencil, Send, Settings, ShieldCheck, Trash2, UserRound, Vote } from "lucide-react";
import { Avatar, Card, Empty, MemberShell, PageHead, Tabs, memberOrMe, useMember } from "./shell";
import { AUTO_REPLY, BADGES, GROUPS, ME, NOTICES, ONLINE, THREADS, TRACKS, WORKSPACES } from "./data";
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

function Messages() {
  const { rtl, tx } = useMember();
  const s = useStore();
  const [open, setOpen] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState<string | null>(null);
  const endRef = useRef<HTMLLIElement>(null);
  // Open a conversation from ?t=<thread> or ?to=<member> (links from the top bar and member pages).
  useEffect(() => {
    const qs = new URLSearchParams(window.location.search);
    const byThread = qs.get("t"); const byMember = qs.get("to");
    const th = THREADS.find((t) => t.id === byThread) ?? THREADS.find((t) => t.with === byMember);
    if (!th) return;
    const id = requestAnimationFrame(() => setOpen(th.id));
    update((x) => ({ ...x, read: { ...x.read, [th.id]: true } }));
    return () => cancelAnimationFrame(id);
  }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" }); }, [open, s.messages, typing]);
  const th = THREADS.find((t) => t.id === open);
  const pick = (id: string) => { setOpen(id); update((x) => ({ ...x, read: { ...x.read, [id]: true } })); };
  const send = (e: React.FormEvent) => {
    e.preventDefault(); if (!th || !draft.trim()) return;
    const tid = th.id;
    update((x) => ({ ...x, messages: { ...x.messages, [tid]: [...(x.messages[tid] ?? []), { from: "me", text: draft.trim(), time: Date.now() }] } }));
    setDraft("");
    // Simulated reply so the conversation feels alive: typing… then an answer.
    window.setTimeout(() => setTyping(tid), 700);
    window.setTimeout(() => {
      setTyping(null);
      update((x) => ({ ...x, messages: { ...x.messages, [tid]: [...(x.messages[tid] ?? []), { from: th.with, text: tx(AUTO_REPLY[tid]), time: Date.now() }] } }));
    }, 2400);
  };
  return (
    <>
      <PageHead icon={MessagesSquare} kicker={{ ar: "الرسائل", en: "Messages" }} title={{ ar: "الرسائل الخاصة", en: "Direct messages" }} />
      <div className={`m-chat ${th ? "has-open" : ""}`}>
        <ul className="m-threads" aria-label={rtl ? "المحادثات" : "Conversations"}>
          {THREADS.map((t) => { const m = memberOrMe(t.with); const extra = s.messages[t.id]; const last = extra?.at(-1); const unread = !s.read[t.id] && t.unread > 0; return (
            <li key={t.id}><button className={`${open === t.id ? "is-active" : ""} ${unread ? "is-unread" : ""}`} onClick={() => pick(t.id)}>
              <Avatar who={m} size={44} online={ONLINE.has(t.with)} />
              <span><span className="m-thread-top"><strong>{tx(m.name)}</strong><small>{last ? ago(last.time, rtl) : tx(t.time)}</small></span><span className="m-thread-last">{typing === t.id ? <em className="m-typing-text">{rtl ? "يكتب…" : "typing…"}</em> : last ? `${last.from === "me" ? (rtl ? "أنت: " : "You: ") : ""}${last.text}` : tx(t.last)}</span></span>
              {unread && <b className="m-count">{t.unread}</b>}
            </button></li>
          ); })}
        </ul>
        <section className="m-conv">
          {!th ? <Empty icon={MessageSquare} title={rtl ? "اختر محادثة للبدء" : "Pick a conversation"} /> : (
            <>
              <header>
                <button className="m-conv-back" onClick={() => setOpen(null)} aria-label={rtl ? "رجوع" : "Back"}>{rtl ? <ArrowRight /> : <ArrowLeft />}</button>
                <Avatar who={memberOrMe(th.with)} size={38} online={ONLINE.has(th.with)} />
                <a href={`/members/${th.with}`}><strong>{tx(memberOrMe(th.with).name)}</strong><small>{typing === th.id ? (rtl ? "يكتب…" : "typing…") : ONLINE.has(th.with) ? (rtl ? "متصل الآن" : "Online now") : (rtl ? "غير متصل" : "Offline")}</small></a>
              </header>
              <ol className="m-bubbles">
                {th.messages.map((msg, i) => <li key={i} className={msg.from === "me" ? "is-me" : ""}><p>{tx(msg.text)}</p><small>{tx(msg.time)}</small></li>)}
                {(s.messages[th.id] ?? []).map((msg, i) => <li key={`x${i}`} className={`is-new ${msg.from === "me" ? "is-me" : ""}`}><p>{msg.text}</p><small>{ago(msg.time, rtl)}{msg.from === "me" && <CheckCheck className="m-seen" aria-label={rtl ? "قُرئت" : "Seen"} />}</small></li>)}
                {typing === th.id && <li className="m-typing" aria-label={rtl ? "يكتب" : "Typing"}><span /><span /><span /></li>}
                <li ref={endRef} aria-hidden="true" className="m-end" />
              </ol>
              <form onSubmit={send}>
                <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={rtl ? "اكتب رسالة…" : "Write a message…"} aria-label={rtl ? "رسالة" : "Message"} />
                <button className="m-btn is-primary is-icon" disabled={!draft.trim()} aria-label={rtl ? "إرسال" : "Send"}><Send /></button>
              </form>
            </>
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
  const [saved, setSaved] = useState(false);
  const save = (e: React.FormEvent) => { e.preventDefault(); setSaved(true); window.setTimeout(() => setSaved(false), 2200); };
  return (
    <>
      <PageHead icon={Settings} kicker={{ ar: "الإعدادات", en: "Settings" }} title={{ ar: "الإعدادات", en: "Settings" }} />
      <div className="m-health"><ShieldCheck aria-hidden="true" /><span><strong>{rtl ? "حسابك محمي" : "Your account is protected"}</strong><small>{rtl ? "كلمة مرورك محفوظة بأمان، ويمكنك إنهاء أي جلسة مفتوحة." : "Your password is stored safely and you can end any open session."}</small></span></div>
      <div className="m-grid-2">
        <form className="m-card m-form" onSubmit={save}>
          <div className="m-card-head"><h2><UserRound aria-hidden="true" />{rtl ? "الحساب والملف" : "Account & profile"}</h2></div>
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
