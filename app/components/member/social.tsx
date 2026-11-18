"use client";

import { useEffect, useRef, useState } from "react";
import { Bookmark, CornerDownLeft, EyeOff, Flag, HelpCircle, MessageCircle, MoreHorizontal, Paperclip, PenLine, Pin, PinOff, Send, Share2, ThumbsUp, Trash2 } from "lucide-react";
import { AttachmentView } from "./chat";
import { Avatar, memberOrMe, useMember } from "./shell";
import { GROUPS, GROUP_META, ME, type Post, type Group } from "./data";
import { ago, now, readFiles, toast, uid, update, useStore, type Att, type Comment, type Reaction } from "./store";

const REACTIONS: { key: Reaction; emoji: string; label: { ar: string; en: string } }[] = [
  { key: "like", emoji: "👍", label: { ar: "أعجبني", en: "Like" } },
  { key: "love", emoji: "❤️", label: { ar: "أحببته", en: "Love" } },
  { key: "idea", emoji: "💡", label: { ar: "فكرة مفيدة", en: "Insightful" } },
  { key: "agree", emoji: "🤝", label: { ar: "أتفق", en: "Agree" } },
];

const REPORT_REASONS = [
  { ar: "إساءة أو تحريض", en: "Abuse or incitement" },
  { ar: "معلومات مضللة", en: "Misleading information" },
  { ar: "خارج موضوع المجموعة", en: "Off-topic for the group" },
  { ar: "سبب آخر", en: "Something else" },
];

type FeedPost = Post & { group: Group } & { attachments?: Att[]; own?: boolean };

/** Is the signed-in member a moderator of this group? */
export const isMod = (groupId: string) => GROUP_META[groupId]?.mods.includes("me") ?? false;

/** ⋯ menu on a post: edit/delete/pin for my posts (pin for moderators), report/hide for others'. */
function PostMenu({ post, onEdit }: { post: FeedPost; onEdit: () => void }) {
  const { rtl, lang } = useMember();
  const s = useStore();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"main" | "report" | "delete">("main");
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const out = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setView("main"); } };
    document.addEventListener("mousedown", out); return () => document.removeEventListener("mousedown", out);
  }, [open]);
  const mod = isMod(post.group.id);
  const pinned = s.pinnedPosts[post.group.id] === post.id;
  const close = () => { setOpen(false); setView("main"); };
  return (
    <div className="s-menu" ref={ref}>
      <button className="s-menu-btn" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={rtl ? "خيارات المنشور" : "Post options"}><MoreHorizontal /></button>
      {open && (
        <div className="s-menu-pop" role="menu">
          {view === "main" && <>
            {post.own && <button role="menuitem" onClick={() => { onEdit(); close(); }}><PenLine />{rtl ? "تعديل" : "Edit"}</button>}
            {mod && <button role="menuitem" onClick={() => { update((x) => { const p = { ...x.pinnedPosts }; if (pinned) delete p[post.group.id]; else p[post.group.id] = post.id; return { ...x, pinnedPosts: p }; }); toast(pinned ? (rtl ? "أُلغي التثبيت" : "Unpinned") : (rtl ? "ثُبّت في أعلى المجموعة" : "Pinned to the top of the group")); close(); }}>{pinned ? <PinOff /> : <Pin />}{pinned ? (rtl ? "إلغاء التثبيت" : "Unpin") : (rtl ? "ثبّت في المجموعة" : "Pin in group")}</button>}
            {post.own && <button role="menuitem" className="is-danger" onClick={() => setView("delete")}><Trash2 />{rtl ? "حذف" : "Delete"}</button>}
            {!post.own && <button role="menuitem" onClick={() => { update((x) => ({ ...x, hiddenPosts: { ...x.hiddenPosts, [post.id]: true } })); close(); }}><EyeOff />{rtl ? "أخفِ هذا المنشور" : "Hide this post"}</button>}
            {!post.own && <button role="menuitem" className="is-danger" onClick={() => setView("report")}><Flag />{rtl ? "أبلغ عن المنشور" : "Report post"}</button>}
          </>}
          {view === "report" && <>
            <p>{rtl ? "لماذا تبلغ عن هذا المنشور؟" : "Why are you reporting this post?"}</p>
            {REPORT_REASONS.map((r) => <button key={r.en} role="menuitem" onClick={() => { update((x) => ({ ...x, reports: { ...x.reports, [post.id]: r[lang] } })); toast(rtl ? "وصل بلاغك إلى مشرفي المجموعة. شكرًا لك." : "Your report reached the group moderators. Thank you."); close(); }}>{r[lang]}</button>)}
          </>}
          {view === "delete" && <>
            <p>{rtl ? "سيُحذف المنشور وتعليقاته نهائيًا." : "The post and its comments will be deleted."}</p>
            <button role="menuitem" className="is-danger is-strong" onClick={() => { update((x) => ({ ...x, posts: x.posts.filter((p) => p.id !== post.id) })); toast(rtl ? "حُذف المنشور" : "Post deleted"); close(); }}><Trash2 />{rtl ? "نعم، احذفه" : "Yes, delete"}</button>
            <button role="menuitem" onClick={() => setView("main")}>{rtl ? "تراجع" : "Cancel"}</button>
          </>}
        </div>
      )}
    </div>
  );
}

/** One post: author, group, text, attachments, reactions, threaded comments, save, share, options menu. */
export function PostCard({ post, showGroup = true }: { post: FeedPost; showGroup?: boolean }) {
  const { rtl, tx, lang } = useMember();
  const s = useStore();
  const [open, setOpen] = useState(false);
  const [picker, setPicker] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState("");
  // Long press (touch) or hover (mouse) opens the reaction picker; a plain tap/click toggles "like".
  const timer = useRef<number | undefined>(undefined);
  const pressed = useRef(false);
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const author = memberOrMe(post.author);
  const mine = s.reactions[post.id];
  const reacts = (post.reacts ?? 0) + (mine ? 1 : 0);
  const added = s.comments[post.id] ?? [];
  const seeded = post.comments ?? [];
  const count = post.replies + added.length;
  const saved = !!s.saved[post.id];
  const current = REACTIONS.find((r) => r.key === mine);
  const text = s.postEdits[post.id] ?? tx(post.text);
  const pinned = s.pinnedPosts[post.group.id] === post.id;

  if (s.hiddenPosts[post.id]) {
    return (
      <div className="s-hidden">
        <EyeOff aria-hidden="true" />{rtl ? "أخفيت هذا المنشور." : "You hid this post."}
        <button onClick={() => update((x) => { const h = { ...x.hiddenPosts }; delete h[post.id]; return { ...x, hiddenPosts: h }; })}>{rtl ? "تراجع" : "Undo"}</button>
      </div>
    );
  }

  const react = (k: Reaction) => { update((x) => ({ ...x, reactions: { ...x.reactions, [post.id]: x.reactions[post.id] === k ? undefined : k } })); setPicker(false); };
  const send = (e: React.FormEvent) => {
    e.preventDefault(); if (!draft.trim()) return;
    const c: Comment = { id: uid(), author: "me", text: draft.trim(), time: now(), replyTo: replyTo?.id };
    update((x) => ({ ...x, comments: { ...x.comments, [post.id]: [...(x.comments[post.id] ?? []), c] } }));
    setDraft(""); setReplyTo(null);
  };
  const share = async () => {
    const url = `${window.location.origin}/community/${post.group.id}#${post.id}`;
    try { await navigator.clipboard.writeText(url); toast(rtl ? "نُسخ رابط المنشور" : "Post link copied"); } catch { toast(url); }
  };
  const startReply = (id: string, name: string) => { setReplyTo({ id, name }); requestAnimationFrame(() => inputRef.current?.focus()); };

  // Comments as a thread: top-level comments (seeded + mine), each followed by its replies.
  const all = [
    ...seeded.map((c, i) => ({ id: `s${i}`, author: c.author, text: tx(c.text), time: tx(c.time), replyTo: undefined as string | undefined, fresh: false })),
    ...added.map((c) => ({ id: c.id, author: c.author, text: c.text, time: ago(c.time, rtl), replyTo: c.replyTo, fresh: true })),
  ];
  const top = all.filter((c) => !c.replyTo);
  const repliesOf = (id: string) => all.filter((c) => c.replyTo === id);
  const commentEl = (c: (typeof all)[number], nested = false) => {
    const a = memberOrMe(c.author);
    return (
      <div key={c.id} className={`s-comment ${c.fresh ? "is-new" : ""} ${nested ? "is-reply" : ""}`}>
        <Avatar who={a} size={nested ? 26 : 30} />
        <div>
          <p><strong>{tx(a.name)}</strong>{c.text}</p>
          <small>{c.time} · <button onClick={() => startReply(nested ? c.replyTo! : c.id, tx(a.name).split(" ")[0])}>{rtl ? "ردّ" : "Reply"}</button>
            {c.author === "me" && c.fresh && <> · <button onClick={() => update((x) => ({ ...x, comments: { ...x.comments, [post.id]: (x.comments[post.id] ?? []).filter((y) => y.id !== c.id && y.replyTo !== c.id) } }))}>{rtl ? "حذف" : "Delete"}</button></>}
          </small>
        </div>
      </div>
    );
  };

  return (
    <article className={`s-post ${pinned ? "is-pinned" : ""}`} id={post.id}>
      {pinned && <span className="s-pinned-tag"><Pin aria-hidden="true" />{rtl ? "مثبّت من المشرفين" : "Pinned by moderators"}</span>}
      <header>
        <a href={post.author === "me" ? "/profile" : `/members/${post.author}`}><Avatar who={author} size={42} /></a>
        <div>
          <a href={post.author === "me" ? "/profile" : `/members/${post.author}`}><strong>{tx(author.name)}</strong></a>
          <small>{showGroup && <><a href={`/community/${post.group.id}`}>{tx(post.group.name)}</a> · </>}{tx(post.time)}{s.postEdits[post.id] !== undefined && (rtl ? " · عُدّل" : " · edited")}</small>
        </div>
        {post.kind === "question" && <span className="s-kind"><HelpCircle aria-hidden="true" />{rtl ? "سؤال" : "Question"}</span>}
        <PostMenu post={post} onEdit={() => { setEditText(text); setEditing(true); }} />
      </header>
      {editing ? (
        <form className="s-edit" onSubmit={(e) => { e.preventDefault(); if (!editText.trim()) return; update((x) => ({ ...x, postEdits: { ...x.postEdits, [post.id]: editText.trim() } })); setEditing(false); toast(rtl ? "حُفظ التعديل" : "Edit saved"); }}>
          <textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={3} autoFocus aria-label={rtl ? "نص المنشور" : "Post text"} />
          <div><button type="button" className="m-btn is-sm" onClick={() => setEditing(false)}>{rtl ? "إلغاء" : "Cancel"}</button><button className="m-btn is-sm is-primary" disabled={!editText.trim()}>{rtl ? "احفظ" : "Save"}</button></div>
        </form>
      ) : text && <p className="s-text">{text}</p>}
      {post.img && <img className="s-img" src={post.img} alt="" loading="lazy" />}
      {!!post.attachments?.length && <div className="s-atts">{post.attachments.map((a, i) => <AttachmentView key={i} a={a} />)}</div>}

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
          {top.map((c) => (
            <div key={c.id} className="s-thread">
              {commentEl(c)}
              {repliesOf(c.id).length > 0 && <div className="s-replies">{repliesOf(c.id).map((r) => commentEl(r, true))}</div>}
            </div>
          ))}
          {all.length < count && <p className="s-more-c">{rtl ? `و${count - all.length} تعليقات أخرى` : `${count - all.length} more comments`}</p>}
          <form onSubmit={send} className="s-reply">
            <Avatar who={{ ...ME, tone: 0 }} size={30} />
            <div className="s-reply-box">
              {replyTo && <span className="s-replying"><CornerDownLeft aria-hidden="true" />{rtl ? `ردّ على ${replyTo.name}` : `Replying to ${replyTo.name}`}<button type="button" onClick={() => setReplyTo(null)} aria-label={rtl ? "إلغاء الرد" : "Cancel reply"}>×</button></span>}
              <input ref={inputRef} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={replyTo ? (rtl ? "اكتب ردّك…" : "Write your reply…") : (rtl ? "اكتب تعليقًا…" : "Write a comment…")} aria-label={rtl ? "تعليق" : "Comment"} autoFocus />
            </div>
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
  const myGroups = GROUPS.filter((g) => s.joined[g.id] ?? g.joined);
  const [text, setText] = useState("");
  const [group, setGroup] = useState(fixedGroup ?? myGroups[0]?.id ?? GROUPS[0].id);
  const [kind, setKind] = useState<"post" | "question">("post");
  const [focus, setFocus] = useState(false);
  const [files, setFiles] = useState<Att[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const pick = async (list: FileList | null) => { if (list?.length) { const a = await readFiles(list); setFiles((f) => [...f, ...a].slice(0, 4)); setFocus(true); } };
  const submit = (e: React.FormEvent) => {
    e.preventDefault(); if (!text.trim() && !files.length) return;
    update((x) => ({ ...x, posts: [{ id: uid(), group, text: text.trim(), time: now(), kind, attachments: files.length ? files : undefined }, ...x.posts] }));
    setText(""); setFiles([]); setFocus(false);
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
      {files.length > 0 && <div className="s-pending">{files.map((f, i) => <AttachmentView key={i} a={f} compact onRemove={() => setFiles((x) => x.filter((_, j) => j !== i))} />)}</div>}
      <div className="s-composer-bar">
        <button type="button" className="s-attach" onClick={() => fileRef.current?.click()}><Paperclip />{rtl ? "صورة أو ملف" : "Photo or file"}</button>
        <input ref={fileRef} type="file" multiple hidden onChange={(e) => { pick(e.target.files); e.target.value = ""; }} />
        <div className="s-kinds" role="group" aria-label={rtl ? "نوع المنشور" : "Post type"}>
          <button type="button" aria-pressed={kind === "post"} onClick={() => setKind("post")}><PenLine />{rtl ? "منشور" : "Post"}</button>
          <button type="button" aria-pressed={kind === "question"} onClick={() => setKind("question")}><HelpCircle />{rtl ? "سؤال" : "Question"}</button>
        </div>
        {!fixedGroup && (
          <select value={group} onChange={(e) => setGroup(e.target.value)} aria-label={rtl ? "المجموعة" : "Group"}>
            {(myGroups.length ? myGroups : GROUPS).map((g) => <option key={g.id} value={g.id}>{tx(g.name)}</option>)}
          </select>
        )}
        <button className="m-btn is-primary is-sm" disabled={!text.trim() && !files.length}><Send />{rtl ? "انشر" : "Post"}</button>
      </div>
    </form>
  );
}

/** Seeded posts plus posts written in this demo, for one group or for all groups. Pinned post first in a group. */
export function useFeed(groupId?: string) {
  const s = useStore();
  const { lang } = useMember();
  const mine: FeedPost[] = s.posts.filter((p) => !groupId || p.group === groupId).map((p) => {
    const g = GROUPS.find((x) => x.id === p.group)!;
    const time = ago(p.time, lang === "ar");
    return { id: p.id, author: "me", text: { ar: p.text, en: p.text }, time: { ar: time, en: time }, replies: 0, reacts: 0, kind: p.kind, group: g, attachments: p.attachments, own: true };
  });
  const seeded: FeedPost[] = GROUPS.filter((g) => !groupId || g.id === groupId).flatMap((g) => g.posts.map((p) => ({ ...p, group: g })));
  const feed = [...mine, ...seeded];
  if (!groupId) return feed;
  const pin = s.pinnedPosts[groupId];
  return pin ? [...feed.filter((p) => p.id === pin), ...feed.filter((p) => p.id !== pin)] : feed;
}
