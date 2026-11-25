"use client";

import { useEffect, useRef, useState } from "react";
import { BarChart3, Bookmark, ChevronDown, Globe2, Lock, MessageCircleOff, Users, CalendarDays, CalendarPlus, Check, CornerDownLeft, EyeOff, Flag, HelpCircle, MapPin, MessageCircle, MoreHorizontal, Palette, Paperclip, PenLine, Pin, PinOff, Plus, Send, Share2, Smile, SmilePlus, ThumbsUp, Trash2, X } from "lucide-react";
import { AttachmentView } from "./chat";
import { ReactionIcon, REACTION_SET } from "./reactions";
import { Avatar, memberOrMe, useMember } from "./shell";
import { GROUPS, GROUP_META, ME, PUBLIC_GROUP, type Post, type Group } from "./data";
import { ago, now, readFiles, toast, uid, update, useStore, type Att, type Comment, type PostExtra, type Reaction } from "./store";

const REACTIONS = REACTION_SET;

const REPORT_REASONS = [
  { ar: "إساءة أو تحريض", en: "Abuse or incitement" },
  { ar: "معلومات مضللة", en: "Misleading information" },
  { ar: "خارج موضوع المجموعة", en: "Off-topic for the group" },
  { ar: "سبب آخر", en: "Something else" },
];

type FeedPost = Post & { group: Group } & { attachments?: Att[]; own?: boolean };

/* ── Creative post tools ── */
export const FEELINGS: { key: string; emoji: string; ar: string; en: string }[] = [
  { key: "hopeful", emoji: "🌱", ar: "متفائل", en: "hopeful" },
  { key: "inspired", emoji: "✨", ar: "مُلهَم", en: "inspired" },
  { key: "proud", emoji: "🌟", ar: "فخور", en: "proud" },
  { key: "grateful", emoji: "🙏", ar: "ممتن", en: "grateful" },
  { key: "excited", emoji: "🎉", ar: "متحمّس", en: "excited" },
  { key: "thinking", emoji: "🤔", ar: "يفكّر", en: "thinking" },
  { key: "happy", emoji: "😊", ar: "سعيد", en: "happy" },
  { key: "worried", emoji: "😟", ar: "قلق", en: "worried" },
];
export const CARDS: { key: string; ar: string; en: string }[] = [
  { key: "navy", ar: "ليلي", en: "Night" }, { key: "blue", ar: "أزرق", en: "Blue" }, { key: "teal", ar: "فيروزي", en: "Teal" },
  { key: "sunset", ar: "غروب", en: "Sunset" }, { key: "tatreez", ar: "تطريز", en: "Tatreez" }, { key: "olive", ar: "زيتون", en: "Olive" }, { key: "keffiyeh", ar: "كوفية", en: "Keffiyeh" },
];
const EMOJIS = ["😊", "😂", "❤️", "👏", "🙏", "🔥", "🎉", "💡", "🤝", "🌱", "🇵🇸", "🫒"];
const youtubeId = (t: string) => t.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([\w-]{6,})/)?.[1];

function PollView({ post }: { post: FeedPost }) {
  const { rtl, lang } = useMember();
  const s = useStore();
  const opts = (lang === "en" && post.extra?.pollEn) || post.extra?.poll || [];
  const mine = s.pollVotes?.[post.id];
  const base = opts.map((_, i) => (post.own ? 0 : [14, 9, 6, 3][i] ?? 2));
  const counts = base.map((n, i) => n + (mine === i ? 1 : 0));
  const total = counts.reduce((a, b) => a + b, 0);
  const vote = (i: number) => update((x) => ({ ...x, pollVotes: { ...(x.pollVotes ?? {}), [post.id]: i } }));
  return (
    <div className="s-poll" role="group" aria-label={rtl ? "استطلاع" : "Poll"}>
      {opts.map((o, i) => { const pct = total ? Math.round((counts[i] / total) * 100) : 0; return (
        <button key={i} type="button" className={`s-poll-opt ${mine === i ? "is-mine" : ""} ${mine !== undefined ? "is-voted" : ""}`} onClick={() => vote(i)} aria-pressed={mine === i}>
          <span className="s-poll-fill" style={{ width: mine !== undefined ? `${pct}%` : 0 }} />
          <span className="s-poll-label">{mine === i && <Check aria-hidden="true" />}{o}</span>
          {mine !== undefined && <b>{pct}%</b>}
        </button>
      ); })}
      <small>{total} {rtl ? "صوتًا" : "votes"}{mine === undefined ? (rtl ? " · اختر لترى النتيجة" : " · vote to see results") : (rtl ? " · يمكنك تغيير صوتك" : " · you can change your vote")}</small>
    </div>
  );
}

function EventView({ post }: { post: FeedPost }) {
  const { rtl, lang } = useMember();
  const s = useStore();
  const ev = post.extra!.event!;
  const d = new Date(ev.date);
  const going = !!s.going?.[post.id];
  const count = (post.own ? 0 : 17) + (going ? 1 : 0);
  const loc = lang === "ar" ? "ar-u-nu-latn" : "en-GB";
  return (
    <div className="s-event">
      <div className="s-event-date"><b>{d.toLocaleDateString(loc, { day: "numeric" })}</b><span>{d.toLocaleDateString(loc, { month: "short" })}</span></div>
      <div className="s-event-body">
        <strong>{ev.title}</strong>
        <small><CalendarDays aria-hidden="true" />{d.toLocaleDateString(loc, { weekday: "long" })} · {d.toLocaleTimeString(loc, { hour: "2-digit", minute: "2-digit" })}</small>
        {ev.place && <small><MapPin aria-hidden="true" />{ev.place}</small>}
      </div>
      <button type="button" className={`m-btn is-sm ${going ? "is-primary" : ""}`} aria-pressed={going} onClick={() => update((x) => ({ ...x, going: { ...(x.going ?? {}), [post.id]: !going } }))}>
        {going ? <Check aria-hidden="true" /> : <CalendarPlus aria-hidden="true" />}{going ? (rtl ? "سأحضر" : "Going") : (rtl ? "سأحضر؟" : "Join")} · {count}
      </button>
    </div>
  );
}

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
  const feeling = FEELINGS.find((f) => f.key === post.extra?.feeling);
  const yt = youtubeId(text);
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
          <small>{feeling && <span className="s-feeling">{feeling.emoji} {rtl ? `يشعر بأنه ${feeling.ar}` : `feeling ${feeling.en}`} · </span>}{showGroup && <>{post.group.id === "all" ? <span>{tx(post.group.name)}</span> : <a href={`/community/${post.group.id}`}>{tx(post.group.name)}</a>} · </>}{tx(post.time)}{post.extra?.visibility === "group" ? <span className="s-vis" title={rtl ? "لأعضاء المجموعة فقط" : "Group members only"}> · <Lock aria-label={rtl ? "لأعضاء المجموعة فقط" : "Group members only"} /></span> : post.own && <span className="s-vis" title={rtl ? "يراه الجميع في ويبال" : "Everyone on WePal"}> · <Globe2 aria-label={rtl ? "عام" : "Public"} /></span>}{s.postEdits[post.id] !== undefined && (rtl ? " · عُدّل" : " · edited")}</small>
        </div>
        {post.kind === "question" && <span className="s-kind"><HelpCircle aria-hidden="true" />{rtl ? "سؤال" : "Question"}</span>}
        <PostMenu post={post} onEdit={() => { setEditText(text); setEditing(true); }} />
      </header>
      {editing ? (
        <form className="s-edit" onSubmit={(e) => { e.preventDefault(); if (!editText.trim()) return; update((x) => ({ ...x, postEdits: { ...x.postEdits, [post.id]: editText.trim() } })); setEditing(false); toast(rtl ? "حُفظ التعديل" : "Edit saved"); }}>
          <textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={3} autoFocus aria-label={rtl ? "نص المنشور" : "Post text"} />
          <div><button type="button" className="m-btn is-sm" onClick={() => setEditing(false)}>{rtl ? "إلغاء" : "Cancel"}</button><button className="m-btn is-sm is-primary" disabled={!editText.trim()}>{rtl ? "احفظ" : "Save"}</button></div>
        </form>
      ) : post.extra?.card && text ? <div className={`s-card is-${post.extra.card}`}><p>{text}</p></div> : text && <p className="s-text">{text}</p>}
      {!!post.extra?.poll?.length && <PollView post={post} />}
      {post.extra?.event && <EventView post={post} />}
      {yt && <div className="s-video"><iframe src={`https://www.youtube-nocookie.com/embed/${yt}`} title="video" loading="lazy" allow="encrypted-media; picture-in-picture" allowFullScreen /></div>}
      {post.img && <img className="s-img" src={post.img} alt="" loading="lazy" />}
      {!!post.attachments?.length && <div className="s-atts">{post.attachments.map((a, i) => <AttachmentView key={i} a={a} />)}</div>}

      <div className="s-counts">
        {reacts > 0 && <span className="s-rsum">{(mine ? [mine, ...(["like", "love", "idea"] as const).filter((k) => k !== mine)] : (["like", "love", "idea"] as const)).slice(0, Math.min(3, Math.max(1, Math.ceil(reacts / 6)))).map((k) => <ReactionIcon key={k} k={k} size={22} />)}<b>{reacts}</b></span>}
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
            {current ? <ReactionIcon k={current.key} size={21} className="s-emoji" /> : <ThumbsUp />}<span style={current ? { color: current.color } : undefined}>{current ? current.label[lang] : (rtl ? "تفاعل" : "React")}</span>
          </button>
          {picker && (
            <div className="s-picker" role="group" aria-label={rtl ? "اختر تفاعلًا" : "Pick a reaction"}>
              {REACTIONS.map((r, i) => <button key={r.key} onClick={() => react(r.key)} aria-label={r.label[lang]} className={mine === r.key ? "is-on" : ""} style={{ animationDelay: `${i * 35}ms` }}><ReactionIcon k={r.key} size={38} /><em>{r.label[lang]}</em></button>)}
            </div>
          )}
        </div>
        {post.extra?.comments === "off"
          ? <button disabled title={rtl ? "أغلق صاحب المنشور التعليقات" : "Comments are turned off"}><MessageCircleOff />{rtl ? "التعليقات مغلقة" : "Comments off"}</button>
          : <button onClick={() => setOpen((o) => !o)} aria-expanded={open}><MessageCircle />{rtl ? "علّق" : "Comment"}</button>}
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
          {post.extra?.comments === "group" && <p className="s-cnote"><Users aria-hidden="true" />{rtl ? "التعليق هنا لأعضاء المجموعة فقط." : "Only group members can comment here."}</p>}
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
  const [group, setGroup] = useState(fixedGroup ?? "all");
  const [visibility, setVisibility] = useState<"all" | "group">("all");
  const [comments, setComments] = useState<"all" | "group" | "off">("all");
  const [audOpen, setAudOpen] = useState(false);
  const audRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (!audOpen) return; const out = (e: MouseEvent) => { if (audRef.current && !audRef.current.contains(e.target as Node)) setAudOpen(false); }; const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setAudOpen(false); }; document.addEventListener("mousedown", out); document.addEventListener("keydown", esc); return () => { document.removeEventListener("mousedown", out); document.removeEventListener("keydown", esc); }; }, [audOpen]);
  const [kind, setKind] = useState<"post" | "question">("post");
  const [focus, setFocus] = useState(false);
  const [files, setFiles] = useState<Att[]>([]);
  const [tool, setTool] = useState<null | "poll" | "card" | "event">(null);
  const [picker, setPicker] = useState<null | "feeling" | "emoji">(null);
  const [poll, setPoll] = useState<string[]>(["", ""]);
  const [card, setCard] = useState<string | null>(null);
  const [event, setEvent] = useState({ title: "", date: "", place: "" });
  const [feeling, setFeeling] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const pick = async (list: FileList | null) => { if (list?.length) { const a = await readFiles(list); setFiles((f) => [...f, ...a].slice(0, 4)); setFocus(true); } };
  const pollOk = tool === "poll" && poll.filter((o) => o.trim()).length >= 2;
  const eventOk = tool === "event" && event.title.trim() && event.date;
  const canPost = !!text.trim() || files.length > 0 || pollOk || !!eventOk;
  const toggle = (t: "poll" | "card" | "event" | "feeling" | "emoji") => {
    setFocus(true);
    if (t === "feeling" || t === "emoji") { setPicker((x) => (x === t ? null : t)); return; }
    setTool((x) => (x === t ? null : t)); if (t === "card" && !card) setCard("tatreez");
  };
  const insert = (e: string) => {
    const el = taRef.current; const at = el?.selectionStart ?? text.length;
    setText(text.slice(0, at) + e + text.slice(at));
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(at + e.length, at + e.length); });
  };
  const reset = () => { setText(""); setFiles([]); setFocus(false); setTool(null); setPicker(null); setAudOpen(false); setPoll(["", ""]); setCard(null); setEvent({ title: "", date: "", place: "" }); setFeeling(null); };
  const submit = (e: React.FormEvent) => {
    e.preventDefault(); if (!canPost) return;
    const extra: PostExtra = {};
    if (pollOk) extra.poll = poll.map((o) => o.trim()).filter(Boolean);
    if (tool === "card" && card && text.trim()) extra.card = card;
    if (eventOk) extra.event = { title: event.title.trim(), date: event.date, place: event.place.trim() };
    if (feeling) extra.feeling = feeling;
    if (group !== "all" && visibility === "group") extra.visibility = "group";
    if (comments !== "all") extra.comments = group === "all" && comments === "group" ? "all" : comments;
    update((x) => ({ ...x, posts: [{ id: uid(), group, text: text.trim(), time: now(), kind, attachments: files.length ? files : undefined, extra: Object.keys(extra).length ? extra : undefined }, ...x.posts] }));
    reset();
    toast(rtl ? "نُشر منشورك" : "Your post is live");
  };
  const tools: { key: "poll" | "card" | "event" | "feeling" | "emoji"; icon: typeof Palette; ar: string; en: string }[] = [
    { key: "poll", icon: BarChart3, ar: "استطلاع", en: "Poll" },
    { key: "card", icon: Palette, ar: "بطاقة ملوّنة", en: "Colour card" },
    { key: "event", icon: CalendarPlus, ar: "فعالية", en: "Event" },
    { key: "feeling", icon: SmilePlus, ar: "شعور", en: "Feeling" },
    { key: "emoji", icon: Smile, ar: "رموز", en: "Emoji" },
  ];
  const chosenFeeling = FEELINGS.find((f) => f.key === feeling);
  const audGroup = group === "all" ? PUBLIC_GROUP : GROUPS.find((g) => g.id === group) ?? PUBLIC_GROUP;
  const placeholder = tool === "poll" ? (rtl ? "اطرح سؤال الاستطلاع…" : "Ask your poll question…")
    : tool === "event" ? (rtl ? "اكتب دعوة قصيرة للفعالية…" : "Write a short invitation…")
    : kind === "question" ? (rtl ? "ما سؤالك للمجتمع؟" : "What's your question for the community?")
    : (rtl ? `بماذا تفكّر يا ${tx(ME.name).split(" ")[0]}؟` : `What's on your mind, ${tx(ME.name).split(" ")[0]}?`);
  return (
    <form className={`s-composer ${focus || text ? "is-open" : ""}`} onSubmit={submit}>
      <div className="s-composer-top">
        <Avatar who={{ ...ME, tone: 0 }} size={42} />
        <div className="s-composer-main">
          {chosenFeeling && <span className="s-feeling-chip">{chosenFeeling.emoji} {rtl ? `يشعر بأنه ${chosenFeeling.ar}` : `feeling ${chosenFeeling.en}`}<button type="button" onClick={() => setFeeling(null)} aria-label={rtl ? "إزالة الشعور" : "Remove feeling"}><X /></button></span>}
          {tool === "card" && card ? (
            <div className={`s-card is-${card} is-editing`}>
              <textarea ref={taRef} value={text} maxLength={180} onChange={(e) => setText(e.target.value)} placeholder={rtl ? "اكتب جملة قصيرة تظهر على البطاقة…" : "Write a short line for the card…"} aria-label={rtl ? "نص البطاقة" : "Card text"} autoFocus />
            </div>
          ) : (
            <textarea ref={taRef} value={text} onChange={(e) => setText(e.target.value)} onFocus={() => setFocus(true)} rows={focus || text ? 3 : 1} placeholder={placeholder} aria-label={rtl ? "منشور جديد" : "New post"} />
          )}
        </div>
      </div>

      {tool === "poll" && (
        <div className="s-tool s-tool-poll">
          {poll.map((o, i) => (
            <div key={i} className="s-tool-row">
              <span>{i + 1}</span>
              <input value={o} maxLength={60} onChange={(e) => setPoll(poll.map((x, j) => (j === i ? e.target.value : x)))} placeholder={rtl ? `الخيار ${i + 1}` : `Option ${i + 1}`} />
              {poll.length > 2 && <button type="button" onClick={() => setPoll(poll.filter((_, j) => j !== i))} aria-label={rtl ? "حذف الخيار" : "Remove option"}><X /></button>}
            </div>
          ))}
          {poll.length < 4 && <button type="button" className="s-tool-add" onClick={() => setPoll([...poll, ""])}><Plus aria-hidden="true" />{rtl ? "أضف خيارًا" : "Add option"}</button>}
        </div>
      )}
      {tool === "card" && (
        <div className="s-tool s-swatches" role="radiogroup" aria-label={rtl ? "خلفية البطاقة" : "Card background"}>
          {CARDS.map((c) => <button key={c.key} type="button" role="radio" aria-checked={card === c.key} className={`s-swatch is-${c.key}`} onClick={() => setCard(c.key)} title={rtl ? c.ar : c.en} aria-label={rtl ? c.ar : c.en} />)}
        </div>
      )}
      {tool === "event" && (
        <div className="s-tool s-tool-event">
          <input value={event.title} onChange={(e) => setEvent({ ...event, title: e.target.value })} placeholder={rtl ? "اسم الفعالية" : "Event name"} aria-label={rtl ? "اسم الفعالية" : "Event name"} />
          <input type="datetime-local" value={event.date} onChange={(e) => setEvent({ ...event, date: e.target.value })} aria-label={rtl ? "الموعد" : "Date and time"} />
          <input value={event.place} onChange={(e) => setEvent({ ...event, place: e.target.value })} placeholder={rtl ? "المكان أو رابط اللقاء" : "Place or meeting link"} aria-label={rtl ? "المكان" : "Place"} />
        </div>
      )}
      {picker === "feeling" && (
        <div className="s-tool s-feelings">
          {FEELINGS.map((f) => <button key={f.key} type="button" aria-pressed={feeling === f.key} onClick={() => { setFeeling(f.key); setPicker(null); }}><span>{f.emoji}</span>{rtl ? f.ar : f.en}</button>)}
        </div>
      )}
      {picker === "emoji" && (
        <div className="s-tool s-emojis">{EMOJIS.map((e) => <button key={e} type="button" onClick={() => insert(e)} aria-label={e}>{e}</button>)}</div>
      )}

      {files.length > 0 && <div className="s-pending">{files.map((f, i) => <AttachmentView key={i} a={f} compact onRemove={() => setFiles((x) => x.filter((_, j) => j !== i))} />)}</div>}
      <div className="s-composer-tools" role="group" aria-label={rtl ? "أضف إلى منشورك" : "Add to your post"}>
        <span>{rtl ? "أضف إلى منشورك" : "Add to your post"}</span>
        <button type="button" className="s-tool-btn is-file" onClick={() => fileRef.current?.click()} title={rtl ? "صورة أو ملف" : "Photo or file"}><Paperclip /><em>{rtl ? "صورة أو ملف" : "Photo or file"}</em></button>
        {tools.map((t) => { const I = t.icon; return <button key={t.key} type="button" className={`s-tool-btn is-${t.key}`} aria-pressed={tool === t.key || picker === t.key} onClick={() => toggle(t.key)} title={rtl ? t.ar : t.en}><I /><em>{rtl ? t.ar : t.en}</em></button>; })}
      </div>
      <div className="s-composer-bar">
        <input ref={fileRef} type="file" multiple hidden onChange={(e) => { pick(e.target.files); e.target.value = ""; }} />
        <div className="s-kinds" role="group" aria-label={rtl ? "نوع المنشور" : "Post type"}>
          <button type="button" aria-pressed={kind === "post"} onClick={() => setKind("post")}><PenLine />{rtl ? "منشور" : "Post"}</button>
          <button type="button" aria-pressed={kind === "question"} onClick={() => setKind("question")}><HelpCircle />{rtl ? "سؤال" : "Question"}</button>
        </div>
        <div className="s-aud" ref={audRef}>
          <button type="button" className="s-aud-btn" aria-expanded={audOpen} onClick={() => setAudOpen((o) => !o)}>
            {group === "all" ? <span className="s-aud-ic is-all"><Globe2 /></span> : <span className="s-aud-ic">{tx(audGroup.name).slice(0, 1)}</span>}
            <span>{tx(audGroup.name)}</span>
            {(visibility === "group" && group !== "all") && <Lock className="s-aud-lock" aria-label={rtl ? "لأعضاء المجموعة فقط" : "Members only"} />}
            {comments === "off" && <MessageCircleOff className="s-aud-lock" aria-label={rtl ? "التعليقات مغلقة" : "Comments off"} />}
            <ChevronDown className="s-aud-chev" />
          </button>
          {audOpen && (
            <div className="s-aud-pop" role="dialog" aria-label={rtl ? "أين تنشر ومن يرى" : "Where to post and who sees it"}>
              {!fixedGroup && (
                <section>
                  <h4>{rtl ? "أين تنشر؟" : "Where to post?"}</h4>
                  <div className="s-aud-list">
                    {[PUBLIC_GROUP, ...(myGroups.length ? myGroups : GROUPS)].map((g) => (
                      <button key={g.id} type="button" className={group === g.id ? "is-on" : ""} onClick={() => { setGroup(g.id); if (g.id === "all") { setVisibility("all"); if (comments === "group") setComments("all"); } }}>
                        {g.id === "all" ? <span className="s-aud-ic is-all"><Globe2 /></span> : <span className="s-aud-ic">{tx(g.name).slice(0, 1)}</span>}
                        <span><b>{tx(g.name)}</b><small>{g.id === "all" ? (rtl ? "يظهر لكل أعضاء ويبال" : "Seen by every WePal member") : (rtl ? `مجموعة · ${g.members} عضوًا` : `Group · ${g.members} members`)}</small></span>
                        {group === g.id && <Check className="s-aud-check" />}
                      </button>
                    ))}
                  </div>
                </section>
              )}
              <section>
                <h4>{rtl ? "من يرى المنشور؟" : "Who can see it?"}</h4>
                <div className="s-aud-seg">
                  <button type="button" aria-pressed={visibility === "all"} onClick={() => setVisibility("all")}><Globe2 />{rtl ? "الجميع في ويبال" : "Everyone on WePal"}</button>
                  <button type="button" aria-pressed={visibility === "group"} disabled={group === "all"} onClick={() => setVisibility("group")} title={group === "all" ? (rtl ? "اختر مجموعة أولًا" : "Pick a group first") : undefined}><Lock />{rtl ? "أعضاء المجموعة فقط" : "Group members only"}</button>
                </div>
              </section>
              <section>
                <h4>{rtl ? "من يمكنه التعليق؟" : "Who can comment?"}</h4>
                <div className="s-aud-seg">
                  <button type="button" aria-pressed={comments === "all"} onClick={() => setComments("all")}><MessageCircle />{rtl ? "الجميع" : "Everyone"}</button>
                  {group !== "all" && <button type="button" aria-pressed={comments === "group"} onClick={() => setComments("group")}><Users />{rtl ? "أعضاء المجموعة" : "Group members"}</button>}
                  <button type="button" aria-pressed={comments === "off"} onClick={() => setComments("off")}><MessageCircleOff />{rtl ? "لا أحد" : "No one"}</button>
                </div>
              </section>
              <div className="s-aud-f"><button type="button" className="m-btn is-primary is-sm" onClick={() => setAudOpen(false)}>{rtl ? "تم" : "Done"}</button></div>
            </div>
          )}
        </div>
        <button className="m-btn is-primary is-sm" disabled={!canPost}><Send />{rtl ? "انشر" : "Post"}</button>
      </div>
    </form>
  );
}

/** Seeded posts plus posts written in this demo, for one group or for all groups. Pinned post first in a group. */
export function useFeed(groupId?: string) {
  const s = useStore();
  const { lang } = useMember();
  const mine: FeedPost[] = s.posts.filter((p) => !groupId || p.group === groupId).map((p) => {
    const g = p.group === "all" ? PUBLIC_GROUP : GROUPS.find((x) => x.id === p.group) ?? PUBLIC_GROUP;
    const time = ago(p.time, lang === "ar");
    return { id: p.id, author: "me", text: { ar: p.text, en: p.text }, time: { ar: time, en: time }, replies: 0, reacts: 0, kind: p.kind, group: g, attachments: p.attachments, extra: p.extra, own: true };
  });
  const seeded: FeedPost[] = GROUPS.filter((g) => !groupId || g.id === groupId).flatMap((g) => g.posts.map((p) => ({ ...p, group: g })));
  const feed = [...mine, ...seeded];
  if (!groupId) return feed;
  const pin = s.pinnedPosts[groupId];
  return pin ? [...feed.filter((p) => p.id === pin), ...feed.filter((p) => p.id !== pin)] : feed;
}
