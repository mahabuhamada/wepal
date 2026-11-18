"use client";

import { useRef, useState } from "react";
import { Bookmark, HelpCircle, ImageIcon, MessageCircle, Send, Share2, ThumbsUp } from "lucide-react";
import { Avatar, memberOrMe, useMember } from "./shell";
import { GROUPS, ME, type Post, type Group } from "./data";
import { ago, toast, uid, update, useStore, type Reaction } from "./store";

const REACTIONS: { key: Reaction; emoji: string; label: { ar: string; en: string } }[] = [
  { key: "like", emoji: "👍", label: { ar: "أعجبني", en: "Like" } },
  { key: "love", emoji: "❤️", label: { ar: "أحببته", en: "Love" } },
  { key: "idea", emoji: "💡", label: { ar: "فكرة مفيدة", en: "Insightful" } },
  { key: "agree", emoji: "🤝", label: { ar: "أتفق", en: "Agree" } },
];

type FeedPost = Post & { group: Group };

/** One post in the feed: author, group, text, optional image, reactions, inline comments, save, share. */
export function PostCard({ post, showGroup = true }: { post: FeedPost; showGroup?: boolean }) {
  const { rtl, tx, lang } = useMember();
  const s = useStore();
  const [open, setOpen] = useState(false);
  const [picker, setPicker] = useState(false);
  // Long press (touch) or hover (mouse) opens the reaction picker; a plain tap/click toggles "like".
  const timer = useRef<number | undefined>(undefined);
  const pressed = useRef(false);
  const [draft, setDraft] = useState("");
  const author = memberOrMe(post.author);
  const mine = s.reactions[post.id];
  const reacts = (post.reacts ?? 0) + (mine ? 1 : 0);
  const added = s.comments[post.id] ?? [];
  const seeded = post.comments ?? [];
  const count = post.replies + added.length;
  const saved = !!s.saved[post.id];
  const current = REACTIONS.find((r) => r.key === mine);

  const react = (k: Reaction) => { update((x) => ({ ...x, reactions: { ...x.reactions, [post.id]: x.reactions[post.id] === k ? undefined : k } })); setPicker(false); };
  const send = (e: React.FormEvent) => {
    e.preventDefault(); if (!draft.trim()) return;
    update((x) => ({ ...x, comments: { ...x.comments, [post.id]: [...(x.comments[post.id] ?? []), { id: uid(), author: "me", text: draft.trim(), time: Date.now() }] } }));
    setDraft("");
  };
  const share = async () => {
    const url = `${window.location.origin}/community/${post.group.id}#${post.id}`;
    try { await navigator.clipboard.writeText(url); toast(rtl ? "نُسخ رابط المنشور" : "Post link copied"); } catch { toast(url); }
  };

  return (
    <article className="s-post" id={post.id}>
      <header>
        <a href={post.author === "me" ? "/profile" : `/members/${post.author}`}><Avatar who={author} size={42} /></a>
        <div>
          <a href={post.author === "me" ? "/profile" : `/members/${post.author}`}><strong>{tx(author.name)}</strong></a>
          <small>{showGroup && <><a href={`/community/${post.group.id}`}>{tx(post.group.name)}</a> · </>}{tx(post.time)}</small>
        </div>
        {post.kind === "question" && <span className="s-kind"><HelpCircle aria-hidden="true" />{rtl ? "سؤال" : "Question"}</span>}
      </header>
      <p className="s-text">{tx(post.text)}</p>
      {post.img && <img className="s-img" src={post.img} alt="" loading="lazy" />}

      <div className="s-counts">
        {reacts > 0 && <span className="s-emojis">{["👍", "❤️", "💡"].slice(0, Math.min(3, Math.ceil(reacts / 6))).map((e) => <i key={e}>{e}</i>)}<b>{reacts}</b></span>}
        {count > 0 && <button onClick={() => setOpen(true)}>{count} {rtl ? "تعليقات" : "comments"}</button>}
      </div>

      <div className="s-actions">
        <div className="s-react" onMouseLeave={() => setPicker(false)}>
          <button className={mine ? "is-on" : ""} aria-pressed={!!mine} aria-haspopup="true"
            onClick={() => { if (pressed.current) { pressed.current = false; return; } react(mine ?? "like"); }}
            onMouseEnter={(e) => { if (window.matchMedia("(hover: hover)").matches) { e.currentTarget.blur(); setPicker(true); } }}
            onKeyDown={(e) => { if (e.key === "ArrowUp") { e.preventDefault(); setPicker(true); } }}
            onPointerDown={() => { clearTimeout(timer.current); timer.current = window.setTimeout(() => { pressed.current = true; setPicker(true); }, 420); }}
            onPointerUp={() => clearTimeout(timer.current)} onPointerLeave={() => clearTimeout(timer.current)}
            onContextMenu={(e) => e.preventDefault()}>
            {current ? <span className="s-emoji">{current.emoji}</span> : <ThumbsUp />}{current ? current.label[lang] : (rtl ? "تفاعل" : "React")}
          </button>
          {picker && (
            <div className="s-picker" role="group" aria-label={rtl ? "اختر تفاعلًا" : "Pick a reaction"}>
              {REACTIONS.map((r) => <button key={r.key} onClick={() => react(r.key)} aria-label={r.label[lang]} title={r.label[lang]} className={mine === r.key ? "is-on" : ""}>{r.emoji}</button>)}
            </div>
          )}
        </div>
        <button onClick={() => setOpen((o) => !o)} aria-expanded={open}><MessageCircle />{rtl ? "علّق" : "Comment"}</button>
        <button onClick={() => { update((x) => ({ ...x, saved: { ...x.saved, [post.id]: !saved } })); toast(saved ? (rtl ? "أُزيل من المحفوظات" : "Removed from saved") : (rtl ? "حُفظ في محفوظاتك" : "Saved")); }} className={saved ? "is-on" : ""} aria-pressed={saved}><Bookmark />{rtl ? "احفظ" : "Save"}</button>
        <button onClick={share}><Share2 />{rtl ? "شارك" : "Share"}</button>
      </div>

      {open && (
        <div className="s-comments">
          {seeded.map((c, i) => { const a = memberOrMe(c.author); return <div key={i} className="s-comment"><Avatar who={a} size={30} /><div><p><strong>{tx(a.name)}</strong>{tx(c.text)}</p><small>{tx(c.time)}</small></div></div>; })}
          {added.map((c) => <div key={c.id} className="s-comment is-new"><Avatar who={{ ...ME, tone: 0 }} size={30} /><div><p><strong>{tx(ME.name)}</strong>{c.text}</p><small>{ago(c.time, rtl)}</small></div></div>)}
          {seeded.length + added.length < count && <p className="s-more-c">{rtl ? `و${count - seeded.length - added.length} تعليقات أخرى` : `${count - seeded.length - added.length} more comments`}</p>}
          <form onSubmit={send} className="s-reply">
            <Avatar who={{ ...ME, tone: 0 }} size={30} />
            <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={rtl ? "اكتب تعليقًا…" : "Write a comment…"} aria-label={rtl ? "تعليق" : "Comment"} autoFocus />
            <button disabled={!draft.trim()} aria-label={rtl ? "أرسل" : "Send"}><Send /></button>
          </form>
        </div>
      )}
    </article>
  );
}

/** "What's on your mind?" composer. Posts go to the chosen group and appear at the top of feeds. */
export function Composer({ fixedGroup }: { fixedGroup?: string }) {
  const { rtl, tx } = useMember();
  const s = useStore();
  const myGroups = GROUPS.filter((g) => g.joined || s.joined[g.id]);
  const [text, setText] = useState("");
  const [group, setGroup] = useState(fixedGroup ?? myGroups[0]?.id ?? GROUPS[0].id);
  const [kind, setKind] = useState<"post" | "question">("post");
  const [focus, setFocus] = useState(false);
  const submit = (e: React.FormEvent) => {
    e.preventDefault(); if (!text.trim()) return;
    update((x) => ({ ...x, posts: [{ id: uid(), group, text: text.trim(), time: Date.now(), kind }, ...x.posts] }));
    setText(""); setFocus(false);
    toast(rtl ? "نُشر منشورك" : "Your post is live");
  };
  return (
    <form className={`s-composer ${focus || text ? "is-open" : ""}`} onSubmit={submit}>
      <div className="s-composer-top">
        <Avatar who={{ ...ME, tone: 0 }} size={42} />
        <textarea value={text} onChange={(e) => setText(e.target.value)} onFocus={() => setFocus(true)} rows={focus || text ? 3 : 1}
          placeholder={kind === "question" ? (rtl ? "ما سؤالك للمجتمع؟" : "What's your question for the community?") : (rtl ? `بماذا تفكّر يا ${tx(ME.name).split(" ")[0]}؟` : `What's on your mind, ${tx(ME.name).split(" ")[0]}?`)}
          aria-label={rtl ? "منشور جديد" : "New post"} />
      </div>
      <div className="s-composer-bar">
        <div className="s-kinds" role="group" aria-label={rtl ? "نوع المنشور" : "Post type"}>
          <button type="button" aria-pressed={kind === "post"} onClick={() => setKind("post")}><ImageIcon />{rtl ? "منشور" : "Post"}</button>
          <button type="button" aria-pressed={kind === "question"} onClick={() => setKind("question")}><HelpCircle />{rtl ? "سؤال" : "Question"}</button>
        </div>
        {!fixedGroup && (
          <select value={group} onChange={(e) => setGroup(e.target.value)} aria-label={rtl ? "المجموعة" : "Group"}>
            {(myGroups.length ? myGroups : GROUPS).map((g) => <option key={g.id} value={g.id}>{tx(g.name)}</option>)}
          </select>
        )}
        <button className="m-btn is-primary is-sm" disabled={!text.trim()}><Send />{rtl ? "انشر" : "Post"}</button>
      </div>
    </form>
  );
}

/** Seeded posts plus posts written in this demo, for one group or for all groups. */
export function useFeed(groupId?: string) {
  const s = useStore();
  const { lang } = useMember();
  const mine: FeedPost[] = s.posts.filter((p) => !groupId || p.group === groupId).map((p) => {
    const g = GROUPS.find((x) => x.id === p.group)!;
    const time = ago(p.time, lang === "ar");
    return { id: p.id, author: "me", text: { ar: p.text, en: p.text }, time: { ar: time, en: time }, replies: 0, reacts: 0, kind: p.kind, group: g };
  });
  const seeded: FeedPost[] = GROUPS.filter((g) => !groupId || g.id === groupId).flatMap((g) => g.posts.map((p) => ({ ...p, group: g })));
  return [...mine, ...seeded];
}
