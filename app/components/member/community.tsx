"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, ArrowRight, MapPin, MessageSquare, Search, Send, UserRound, Users } from "lucide-react";
import { Avatar, Card, Empty, MemberShell, PageHead, Tabs, useMember } from "./shell";
import { GROUPS, ME, MEMBERS, TRACKS, WORKSPACES, groupById, memberById } from "./data";

function useJoined() {
  const [joined, setJoined] = useState<Record<string, boolean>>(() => Object.fromEntries(GROUPS.map((g) => [g.id, g.joined])));
  return [joined, (id: string) => setJoined((j) => ({ ...j, [id]: !j[id] }))] as const;
}

function Community() {
  const { rtl, tx } = useMember();
  const Arrow = rtl ? ArrowLeft : ArrowRight;
  const [joined, toggle] = useJoined();
  const [tab, setTab] = useState<"mine" | "all">("mine");
  const [q, setQ] = useState("");
  const list = GROUPS.filter((g) => (tab === "all" || joined[g.id]) && (!q.trim() || tx(g.name).toLowerCase().includes(q.trim().toLowerCase())));
  const mineCount = Object.values(joined).filter(Boolean).length;

  return (
    <>
      <PageHead icon={Users} kicker={{ ar: "المجتمع", en: "Community" }} title={{ ar: "المجتمع", en: "Community" }} lead={{ ar: "مجموعات دائمة حسب منطقتك ومسارك.", en: "Ongoing groups by region and track." }}
        actions={<Link className="m-btn" href="/members"><UserRound />{rtl ? "دليل الأعضاء" : "Member directory"}</Link>} />
      <div className="m-toolbar">
        <Tabs label={rtl ? "المجموعات" : "Groups"} value={tab} onChange={setTab} items={[{ key: "mine", label: rtl ? "مجموعاتي" : "My groups", count: mineCount }, { key: "all", label: rtl ? "كل المجموعات" : "All groups", count: GROUPS.length }]} />
        <label className="m-search"><Search aria-hidden="true" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={rtl ? "ابحث عن مجموعة" : "Find a group"} aria-label={rtl ? "ابحث عن مجموعة بالاسم" : "Search groups by name"} /></label>
      </div>
      {list.length === 0 ? <Empty icon={Users} title={tab === "mine" ? (rtl ? "لم تنضم إلى مجموعة بعد" : "You haven't joined a group yet") : (rtl ? "لا مجموعات تطابق بحثك" : "No groups match")} text={tab === "mine" ? (rtl ? "افتح «كل المجموعات» واختر ما يناسبك." : "Open \"All groups\" and pick one.") : undefined} /> : (
        <div className="m-cards">
          {list.map((g) => (
            <article key={g.id} className="m-group">
              <Link href={`/community/${g.id}`} className="m-group-link">
                <span className="m-group-badge">{tx(g.name).slice(0, 1)}</span>
                <span className="m-tag">{tx(g.kind)}</span>
                <h3>{tx(g.name)}</h3>
                <p>{tx(g.about)}</p>
                <small><Users aria-hidden="true" />{g.members + (joined[g.id] && !g.joined ? 1 : !joined[g.id] && g.joined ? -1 : 0)} {rtl ? "عضوًا" : "members"} · <MessageSquare aria-hidden="true" />{g.posts.length} {rtl ? "نقاشات" : "threads"}</small>
              </Link>
              <div className="m-group-foot">
                <button className={`m-btn is-sm ${joined[g.id] ? "" : "is-primary"}`} onClick={() => toggle(g.id)}>{joined[g.id] ? (rtl ? "مغادرة" : "Leave") : (rtl ? "انضم" : "Join")}</button>
                <Link className="m-more" href={`/community/${g.id}`}>{rtl ? "عرض المجموعة" : "View group"}<Arrow /></Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}

function Group() {
  const { rtl, tx } = useMember();
  const params = useParams<{ id: string }>();
  const g = groupById(String(params?.id ?? ""));
  const [joined, toggle] = useJoined();
  const [draft, setDraft] = useState("");
  const [mine, setMine] = useState<string[]>([]);
  if (!g) return <Empty icon={Users} title={rtl ? "لم نجد هذه المجموعة" : "Group not found"} />;
  const people = MEMBERS.filter((m) => m.groups.includes(g.id));

  return (
    <>
      <Link className="m-back" href="/community">{rtl ? <ArrowRight /> : <ArrowLeft />}{rtl ? "المجتمع" : "Community"}</Link>
      <PageHead icon={Users} kicker={g.kind} title={g.name} lead={g.about}
        actions={<button className={`m-btn ${joined[g.id] ? "" : "is-primary"}`} onClick={() => toggle(g.id)}>{joined[g.id] ? (rtl ? "أنت عضو · مغادرة" : "Member · Leave") : (rtl ? "انضم إلى المجموعة" : "Join group")}</button>} />
      <div className="m-grid-3">
        <div className="m-stack m-span-2">
          {joined[g.id] && (
            <form className="m-compose" onSubmit={(e) => { e.preventDefault(); if (draft.trim()) { setMine((m) => [draft.trim(), ...m]); setDraft(""); } }}>
              <Avatar who={{ ...ME, tone: 0 }} size={38} />
              <textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={rtl ? "شارك فكرة أو سؤالًا مع المجموعة…" : "Share an idea or a question with the group…"} rows={2} aria-label={rtl ? "منشور جديد" : "New post"} />
              <button className="m-btn is-primary is-sm" disabled={!draft.trim()}><Send />{rtl ? "انشر" : "Post"}</button>
            </form>
          )}
          <Card title={rtl ? "النقاشات" : "Discussions"}>
            <ul className="m-feed">
              {mine.map((text, i) => <li key={`mine-${i}`}><div><Avatar who={{ ...ME, tone: 0 }} size={38} /><span><span className="m-feed-meta"><strong>{tx(ME.name)}</strong> · {rtl ? "الآن" : "Now"}</span><p>{text}</p></span></div></li>)}
              {g.posts.map((p) => { const a = memberById(p.author)!; return <li key={p.id}><div><Avatar who={a} size={38} /><span><span className="m-feed-meta"><Link href={`/members/${a.id}`}><strong>{tx(a.name)}</strong></Link> · {tx(p.time)}</span><p>{tx(p.text)}</p><small><MessageSquare aria-hidden="true" />{p.replies} {rtl ? "ردود" : "replies"}</small></span></div></li>; })}
            </ul>
          </Card>
        </div>
        <Card title={rtl ? `الأعضاء (${g.members})` : `Members (${g.members})`}>
          <ul className="m-people">
            {people.map((m) => <li key={m.id}><Link href={`/members/${m.id}`}><Avatar who={m} size={34} /><span><strong>{tx(m.name)}</strong><small>{tx(m.city)}</small></span></Link></li>)}
          </ul>
          <Link className="m-more" href="/members">{rtl ? "دليل الأعضاء" : "Member directory"}{rtl ? <ArrowLeft /> : <ArrowRight />}</Link>
        </Card>
      </div>
    </>
  );
}

function Members() {
  const { rtl, tx } = useMember();
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"all" | "mine">("all");
  const myGroups = GROUPS.filter((g) => g.joined).map((g) => g.id);
  const list = useMemo(() => MEMBERS.filter((m) => (tab === "all" || m.groups.some((g) => myGroups.includes(g))) && (!q.trim() || tx(m.name).toLowerCase().includes(q.trim().toLowerCase()))), [q, tab, tx, myGroups]);
  return (
    <>
      <PageHead icon={UserRound} kicker={{ ar: "الأعضاء", en: "Members" }} title={{ ar: "الأعضاء", en: "Members" }} lead={{ ar: "أعضاء المنصة الذين يُظهرون أسماءهم. من أخفى اسمه لا يظهر هنا.", en: "Members who show their names. Anyone who hid their name doesn't appear here." }} />
      <div className="m-toolbar">
        <Tabs label={rtl ? "الأعضاء" : "Members"} value={tab} onChange={setTab} items={[{ key: "all", label: rtl ? "كل الأعضاء" : "All members" }, { key: "mine", label: rtl ? "من مجموعاتي" : "From my groups" }]} />
        <label className="m-search"><Search aria-hidden="true" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={rtl ? "ابحث بالاسم" : "Search by name"} aria-label={rtl ? "ابحث بالاسم" : "Search by name"} /></label>
      </div>
      {list.length === 0 ? <Empty icon={Search} title={rtl ? "لا أعضاء بهذا البحث" : "No members match"} /> : (
        <div className="m-cards is-people">
          {list.map((m) => (
            <Link key={m.id} href={`/members/${m.id}`} className="m-person">
              <Avatar who={m} size={56} />
              <strong>{tx(m.name)}</strong>
              <small><MapPin aria-hidden="true" />{tx(m.city)}</small>
              <span className="m-tag">{tx(TRACKS[m.track])}</span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

function MemberProfile() {
  const { rtl, tx } = useMember();
  const params = useParams<{ id: string }>();
  const m = memberById(String(params?.id ?? ""));
  if (!m) return <Empty icon={UserRound} title={rtl ? "لم نجد هذا العضو" : "Member not found"} text={rtl ? "ربما أخفى ملفه." : "They may have hidden their profile."} />;
  const groups = GROUPS.filter((g) => m.groups.includes(g.id));
  const work = WORKSPACES.filter((w) => w.team.includes(m.id));
  return (
    <>
      <Link className="m-back" href="/members">{rtl ? <ArrowRight /> : <ArrowLeft />}{rtl ? "الأعضاء" : "Members"}</Link>
      <div className="m-profile-hero">
        <Avatar who={m} size={88} />
        <div><h1>{tx(m.name)}</h1><p className="m-muted"><MapPin aria-hidden="true" />{tx(m.city)} · {tx(TRACKS[m.track])}</p><p>{tx(m.bio)}</p></div>
        <Link className="m-btn is-primary" href="/messages"><MessageSquare />{rtl ? `راسِل ${tx(m.name).split(" ")[0]}` : `Message ${tx(m.name).split(" ")[0]}`}</Link>
      </div>
      <div className="m-grid-2">
        <Card title={rtl ? "مساحات العمل" : "Workspaces"}>
          {work.length === 0 ? <Empty icon={Users} title={rtl ? "لا مساحات عمل ظاهرة" : "No visible workspaces"} /> : <ul className="m-list">{work.map((w) => <li key={w.id}><Link href={`/projects/${w.id}`}><span><strong>{tx(w.title)}</strong><small>{tx(TRACKS[w.track])}</small></span></Link></li>)}</ul>}
        </Card>
        <Card title={rtl ? "المجموعات" : "Groups"}>
          <ul className="m-list">{groups.map((g) => <li key={g.id}><Link href={`/community/${g.id}`}><span><strong>{tx(g.name)}</strong><small>{tx(g.kind)} · {g.members} {rtl ? "عضوًا" : "members"}</small></span></Link></li>)}</ul>
        </Card>
      </div>
    </>
  );
}

export function CommunityPage() { return <MemberShell active="community"><Community /></MemberShell>; }
export function GroupPage() { return <MemberShell active="community"><Group /></MemberShell>; }
export function MembersPage() { return <MemberShell active="members"><Members /></MemberShell>; }
export function MemberProfilePage() { return <MemberShell active="members"><MemberProfile /></MemberShell>; }
