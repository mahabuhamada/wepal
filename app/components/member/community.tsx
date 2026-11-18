"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, HelpCircle, MapPin, MessageSquare, Search, ShieldCheck, UserRound, Users } from "lucide-react";
import { Avatar, Card, Empty, MemberShell, PageHead, Tabs, memberOrMe, useMember } from "./shell";
import { GROUPS, GROUP_META, MEMBERS, ONLINE, TRACKS, WORKSPACES, groupById, memberById } from "./data";
import { Composer, PostCard, isMod, useFeed } from "./social";
import { toast, update, useStore } from "./store";

/** Join/leave state shared with the sidebar and dashboard through the demo store. */
function useJoined() {
  const s = useStore();
  const { rtl, tx } = useMember();
  const isIn = (id: string) => s.joined[id] ?? !!GROUPS.find((g) => g.id === id)?.joined;
  const toggle = (id: string) => {
    const g = GROUPS.find((x) => x.id === id)!; const next = !isIn(id);
    update((x) => ({ ...x, joined: { ...x.joined, [id]: next } }));
    toast(next ? (rtl ? `انضممت إلى «${tx(g.name)}»` : `You joined "${tx(g.name)}"`) : (rtl ? `غادرت «${tx(g.name)}»` : `You left "${tx(g.name)}"`));
  };
  const members = (id: string) => { const g = GROUPS.find((x) => x.id === id)!; return g.members + (isIn(id) === g.joined ? 0 : isIn(id) ? 1 : -1); };
  return { isIn, toggle, members };
}

function JoinButton({ id, size = "sm" }: { id: string; size?: "sm" | "md" }) {
  const { rtl } = useMember();
  const { isIn, toggle } = useJoined();
  const on = isIn(id);
  return <button className={`m-btn ${size === "sm" ? "is-sm" : ""} ${on ? "is-joined" : "is-primary"}`} onClick={() => toggle(id)} aria-pressed={on}>{on ? <><Check />{rtl ? "عضو" : "Joined"}</> : (rtl ? "انضم" : "Join")}</button>;
}

function Community() {
  const { rtl, tx } = useMember();
  const Arrow = rtl ? ArrowLeft : ArrowRight;
  const { isIn, members } = useJoined();
  const [tab, setTab] = useState<"feed" | "groups">("feed");
  const [filter, setFilter] = useState<"all" | "mine" | "questions">("all");
  const [q, setQ] = useState("");
  const feed = useFeed().filter((p) => (filter === "all" || (filter === "mine" ? isIn(p.group.id) : p.kind === "question")));
  const groups = GROUPS.filter((g) => !q.trim() || tx(g.name).toLowerCase().includes(q.trim().toLowerCase()));
  const suggest = GROUPS.filter((g) => !isIn(g.id));
  const active = MEMBERS.filter((m) => ONLINE.has(m.id));

  return (
    <>
      <PageHead icon={Users} kicker={{ ar: "المجتمع", en: "Community" }} title={{ ar: "المجتمع", en: "Community" }} lead={{ ar: "ما يدور في مجموعاتك، وأسئلة الأعضاء، ومساحة لتشارك فكرتك.", en: "What's happening in your groups, members' questions, and room to share your idea." }} />
      <div className="m-toolbar"><Tabs label={rtl ? "العرض" : "View"} value={tab} onChange={setTab} items={[{ key: "feed", label: rtl ? "آخر النقاشات" : "Latest" }, { key: "groups", label: rtl ? "المجموعات" : "Groups", count: GROUPS.length }]} /></div>

      {tab === "feed" ? (
        <div className="m-grid-3">
          <div className="m-stack">
            <Composer />
            <div className="m-chips" role="group" aria-label={rtl ? "تصفية" : "Filter"}>
              {([["all", rtl ? "الكل" : "All"], ["mine", rtl ? "من مجموعاتي" : "My groups"], ["questions", rtl ? "أسئلة" : "Questions"]] as const).map(([k, l]) => <button key={k} aria-pressed={filter === k} onClick={() => setFilter(k)}>{k === "questions" && <HelpCircle />}{l}</button>)}
            </div>
            {feed.length === 0 ? <Empty icon={MessageSquare} title={rtl ? "لا منشورات هنا بعد" : "No posts here yet"} text={rtl ? "كن أول من يكتب." : "Be the first to write."} /> : feed.map((p) => <PostCard key={p.id} post={p} />)}
          </div>
          <div className="m-stack">
            <Card title={rtl ? "متصلون الآن" : "Online now"}>
              <ul className="m-people">{active.map((m) => <li key={m.id}><a href={`/members/${m.id}`}><Avatar who={m} size={34} online /><span><strong>{tx(m.name)}</strong><small>{tx(m.city)}</small></span></a></li>)}</ul>
            </Card>
            {suggest.length > 0 && (
              <Card title={rtl ? "مجموعات قد تهمك" : "Groups you may like"}>
                <ul className="c-suggest">{suggest.map((g) => <li key={g.id}><span className="m-group-badge is-sm">{tx(g.name).slice(0, 1)}</span><a href={`/community/${g.id}`}><strong>{tx(g.name)}</strong><small>{members(g.id)} {rtl ? "عضوًا" : "members"}</small></a><JoinButton id={g.id} /></li>)}</ul>
              </Card>
            )}
          </div>
        </div>
      ) : (
        <>
          <label className="m-search"><Search aria-hidden="true" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={rtl ? "ابحث عن مجموعة" : "Find a group"} aria-label={rtl ? "ابحث عن مجموعة بالاسم" : "Search groups by name"} /></label>
          <div className="m-cards">
            {groups.map((g) => (
              <article key={g.id} className="m-group">
                <a href={`/community/${g.id}`} className="m-group-link">
                  <span className="m-group-badge">{tx(g.name).slice(0, 1)}</span>
                  <span className="m-tag">{tx(g.kind)}</span>
                  <h3>{tx(g.name)}</h3>
                  <p>{tx(g.about)}</p>
                  <small><Users aria-hidden="true" />{members(g.id)} {rtl ? "عضوًا" : "members"} · <MessageSquare aria-hidden="true" />{g.posts.length} {rtl ? "نقاشات" : "threads"}</small>
                </a>
                <div className="m-group-foot"><JoinButton id={g.id} /><a className="m-more" href={`/community/${g.id}`}>{rtl ? "عرض المجموعة" : "View group"}<Arrow /></a></div>
              </article>
            ))}
          </div>
        </>
      )}
    </>
  );
}

function Group() {
  const { rtl, tx } = useMember();
  const params = useParams<{ id: string }>();
  const g = groupById(String(params?.id ?? ""));
  const { isIn, members } = useJoined();
  const feed = useFeed(g?.id);
  if (!g) return <Empty icon={Users} title={rtl ? "لم نجد هذه المجموعة" : "Group not found"} />;
  const people = MEMBERS.filter((m) => m.groups.includes(g.id));

  return (
    <>
      <a className="m-back" href="/community">{rtl ? <ArrowRight /> : <ArrowLeft />}{rtl ? "المجتمع" : "Community"}</a>
      <section className="c-cover">
        <span className="m-group-badge is-lg">{tx(g.name).slice(0, 1)}</span>
        <div>
          <span className="m-tag">{tx(g.kind)}</span>
          <h1>{tx(g.name)}</h1>
          <p>{tx(g.about)}</p>
          <div className="c-cover-meta"><span className="m-team">{people.slice(0, 4).map((m) => <Avatar key={m.id} who={m} size={28} />)}</span><small>{members(g.id)} {rtl ? "عضوًا" : "members"}</small></div>
        </div>
        <JoinButton id={g.id} size="md" />
      </section>
      <div className="m-grid-3">
        <div className="m-stack">
          {isIn(g.id) ? <Composer fixedGroup={g.id} /> : <div className="c-join-note">{rtl ? "انضم إلى المجموعة لتكتب فيها وتعلّق." : "Join the group to post and comment."}<JoinButton id={g.id} /></div>}
          {feed.map((p) => <PostCard key={p.id} post={p} showGroup={false} />)}
        </div>
        <div className="m-stack">
          <Card title={rtl ? "قواعد المجموعة" : "Group rules"}>
            <ol className="c-rules">{(GROUP_META[g.id]?.rules ?? []).map((r, i) => <li key={i}>{tx(r)}</li>)}</ol>
            <p className="c-mods"><ShieldCheck aria-hidden="true" />{rtl ? "المشرفون:" : "Moderators:"} {(GROUP_META[g.id]?.mods ?? []).map((id) => tx(memberOrMe(id).name)).join(rtl ? "، " : ", ")}</p>
            {isMod(g.id) && <p className="c-mod-note">{rtl ? "أنت مشرف هنا: يمكنك تثبيت منشور من قائمة ⋯ ومراجعة البلاغات." : "You moderate this group: pin posts from the ⋯ menu and review reports."}</p>}
          </Card>
          <Card title={rtl ? "الأعضاء" : "Members"}>
            <ul className="m-people">{people.map((m) => <li key={m.id}><a href={`/members/${m.id}`}><Avatar who={m} size={34} online={ONLINE.has(m.id)} /><span><strong>{tx(m.name)}</strong><small>{tx(m.city)}</small></span>{GROUP_META[g.id]?.mods.includes(m.id) && <em className="c-mod-tag">{rtl ? "مشرف" : "Mod"}</em>}</a></li>)}</ul>
          </Card>
        </div>
      </div>
    </>
  );
}

function Members() {
  const { rtl, tx } = useMember();
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"all" | "mine" | "online">("all");
  const { isIn } = useJoined();
  const list = useMemo(() => MEMBERS.filter((m) => (tab === "all" || (tab === "online" ? ONLINE.has(m.id) : m.groups.some(isIn))) && (!q.trim() || tx(m.name).toLowerCase().includes(q.trim().toLowerCase()))), [q, tab, tx, isIn]);
  return (
    <>
      <PageHead icon={UserRound} kicker={{ ar: "الأعضاء", en: "Members" }} title={{ ar: "الأعضاء", en: "Members" }} lead={{ ar: "أعضاء المنصة الذين يُظهرون أسماءهم. من أخفى اسمه لا يظهر هنا.", en: "Members who show their names. Anyone who hid their name doesn't appear here." }} />
      <div className="m-toolbar">
        <Tabs label={rtl ? "الأعضاء" : "Members"} value={tab} onChange={setTab} items={[{ key: "all", label: rtl ? "الكل" : "All" }, { key: "mine", label: rtl ? "من مجموعاتي" : "My groups" }, { key: "online", label: rtl ? "متصلون" : "Online", count: ONLINE.size }]} />
        <label className="m-search"><Search aria-hidden="true" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={rtl ? "ابحث بالاسم" : "Search by name"} aria-label={rtl ? "ابحث بالاسم" : "Search by name"} /></label>
      </div>
      {list.length === 0 ? <Empty icon={Search} title={rtl ? "لا أعضاء بهذا البحث" : "No members match"} /> : (
        <div className="m-cards is-people">
          {list.map((m) => (
            <div key={m.id} className="m-person">
              <a href={`/members/${m.id}`} className="m-person-link">
                <Avatar who={m} size={60} online={ONLINE.has(m.id)} />
                <strong>{tx(m.name)}</strong>
                <small><MapPin aria-hidden="true" />{tx(m.city)}</small>
                <span className="m-tag">{tx(TRACKS[m.track])}</span>
              </a>
              <a className="m-btn is-sm" href={`/messages?to=${m.id}`}><MessageSquare />{rtl ? "راسِل" : "Message"}</a>
            </div>
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
  const feed = useFeed().filter((p) => p.author === m?.id);
  if (!m) return <Empty icon={UserRound} title={rtl ? "لم نجد هذا العضو" : "Member not found"} text={rtl ? "ربما أخفى ملفه." : "They may have hidden their profile."} />;
  const groups = GROUPS.filter((g) => m.groups.includes(g.id));
  const work = WORKSPACES.filter((w) => w.team.includes(m.id));
  return (
    <>
      <a className="m-back" href="/members">{rtl ? <ArrowRight /> : <ArrowLeft />}{rtl ? "الأعضاء" : "Members"}</a>
      <div className="m-profile-hero">
        <Avatar who={m} size={88} online={ONLINE.has(m.id)} />
        <div><h1>{tx(m.name)}</h1><p className="m-muted"><MapPin aria-hidden="true" />{tx(m.city)} · {tx(TRACKS[m.track])}{ONLINE.has(m.id) && <span className="m-online-tag">{rtl ? "متصل الآن" : "Online now"}</span>}</p><p>{tx(m.bio)}</p></div>
        <a className="m-btn is-primary" href={`/messages?to=${m.id}`}><MessageSquare />{rtl ? `راسِل ${tx(m.name).split(" ")[0]}` : `Message ${tx(m.name).split(" ")[0]}`}</a>
      </div>
      <div className="m-grid-3">
        <div className="m-stack">
          <h2 className="d-section-head-title">{rtl ? "منشوراته" : "Posts"}</h2>
          {feed.length ? feed.map((p) => <PostCard key={p.id} post={p} />) : <Empty icon={MessageSquare} title={rtl ? "لا منشورات بعد" : "No posts yet"} />}
        </div>
        <div className="m-stack">
          <Card title={rtl ? "مساحات العمل" : "Workspaces"}>
            {work.length === 0 ? <p className="m-muted">{rtl ? "لا مساحات عمل ظاهرة" : "No visible workspaces"}</p> : <ul className="m-list">{work.map((w) => <li key={w.id}><a href={`/projects/${w.id}`}><span><strong>{tx(w.title)}</strong><small>{tx(TRACKS[w.track])}</small></span></a></li>)}</ul>}
          </Card>
          <Card title={rtl ? "المجموعات" : "Groups"}>
            <ul className="m-list">{groups.map((g) => <li key={g.id}><a href={`/community/${g.id}`}><span><strong>{tx(g.name)}</strong><small>{tx(g.kind)}</small></span></a></li>)}</ul>
          </Card>
        </div>
      </div>
    </>
  );
}

export function CommunityPage() { return <MemberShell active="community"><Community /></MemberShell>; }
export function GroupPage() { return <MemberShell active="community"><Group /></MemberShell>; }
export function MembersPage() { return <MemberShell active="members"><Members /></MemberShell>; }
export function MemberProfilePage() { return <MemberShell active="members"><MemberProfile /></MemberShell>; }
