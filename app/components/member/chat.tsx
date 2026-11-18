"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { Bell, BellOff, CheckCheck, CornerUpLeft, Download, File as FileIcon, FileArchive, FileSpreadsheet, FileText, Image as ImageIcon, Paperclip, Pin, PinOff, Search, Send, SmilePlus, X } from "lucide-react";
import { Avatar, memberOrMe, useMember } from "./shell";
import { ME, fmtSize, type SeedMessage } from "./data";
import { ago, notify, now, readFiles, toast, uid, update, useStore, type Att, type ChatMsg } from "./store";
import type { T } from "../content";

const QUICK = ["👍", "❤️", "😂", "🎉", "🙏"];

export function fileKind(type: string, name: string) {
  if (type.startsWith("image/")) return { icon: ImageIcon, label: "IMG", tone: "is-img" };
  if (type.includes("pdf") || name.endsWith(".pdf")) return { icon: FileText, label: "PDF", tone: "is-pdf" };
  if (type.includes("sheet") || /\.(xlsx|csv)$/.test(name)) return { icon: FileSpreadsheet, label: "XLS", tone: "is-xls" };
  if (type.includes("word") || name.endsWith(".docx")) return { icon: FileText, label: "DOC", tone: "is-doc" };
  if (type.includes("zip") || name.endsWith(".zip")) return { icon: FileArchive, label: "ZIP", tone: "is-zip" };
  return { icon: FileIcon, label: "FILE", tone: "" };
}

/** A file or image attachment, shown in chats, posts and file lists. */
export function AttachmentView({ a, compact = false, onRemove }: { a: Att; compact?: boolean; onRemove?: () => void }) {
  const { rtl } = useMember();
  const k = fileKind(a.type, a.name); const Icon = k.icon;
  if (a.preview && !compact) {
    return <figure className="c-att-img"><img src={a.preview} alt={a.name} loading="lazy" />{onRemove && <button type="button" onClick={onRemove} aria-label={rtl ? "إزالة" : "Remove"}><X /></button>}</figure>;
  }
  return (
    <div className={`c-att ${k.tone}`}>
      {a.preview ? <img src={a.preview} alt="" /> : <span className="c-att-ico"><Icon /></span>}
      <span><strong>{a.name}</strong><small>{k.label} · {fmtSize(a.size)}</small></span>
      {onRemove ? <button type="button" onClick={onRemove} aria-label={rtl ? "إزالة" : "Remove"}><X /></button>
        : <button type="button" onClick={() => toast(rtl ? "التنزيل يعمل بعد ربط المنصة" : "Downloads work once the platform is connected")} aria-label={rtl ? "تنزيل" : "Download"}><Download /></button>}
    </div>
  );
}

type Row = { key: string; from: string; text: string; time: string; day?: string; attachments?: Att[]; replyTo?: { who: string; text: string }; seen?: boolean; fresh?: boolean };

/**
 * A conversation: direct or group. Seeded history + messages sent in this demo (kept in the store).
 * Supports attachments (files and images), quoted replies, quick reactions, typing indicators.
 */
export function ChatRoom({ room, seed, group = false, replyFrom, replyText, header, placeholder, where, href, people = [] }: {
  room: string; seed: SeedMessage[]; group?: boolean; replyFrom?: string; replyText?: T; header?: React.ReactNode; placeholder?: string;
  /** Where this conversation lives, for the notification raised when someone replies. */
  where?: string; href?: string;
  /** People who can be @mentioned here (the team, or the other person). */
  people?: string[];
}) {
  const { rtl, tx } = useMember();
  const s = useStore();
  const [text, setText] = useState("");
  const [files, setFiles] = useState<Att[]>([]);
  const [reply, setReply] = useState<{ who: string; text: string } | null>(null);
  const [typing, setTyping] = useState<string | null>(null);
  const [picker, setPicker] = useState<string | null>(null);
  // Touch screens have no hover: tapping a message shows its reply/react tools.
  const [toolsFor, setToolsFor] = useState<string | null>(null);
  const [mention, setMention] = useState<string | null>(null);
  const [findOpen, setFindOpen] = useState(false);
  const [find, setFind] = useState("");
  const firstName = (id: string) => tx(memberOrMe(id).name).split(" ")[0];
  const mentionable = people.filter((id) => id !== "me");
  const suggestions = mention === null ? [] : mentionable.filter((id) => firstName(id).startsWith(mention) || tx(memberOrMe(id).name).includes(mention));
  const onType = (v: string) => {
    setText(v);
    const m = /(?:^|\s)@([^\s@]*)$/.exec(v);
    setMention(m ? m[1] : null);
  };
  const pickMention = (id: string) => {
    setText((v) => v.replace(/@([^\s@]*)$/, `@${firstName(id)} `));
    setMention(null); inputRef.current?.focus();
  };
  const pinned = s.pins[room];
  const muted = !!s.muted[room];
  const term = find.trim().toLowerCase();
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { update((x) => (x.read[room] ? x : { ...x, read: { ...x.read, [room]: true } })); }, [room]);
  const sent = s.messages[room] ?? [];
  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [room, sent.length, typing]);

  const rows: Row[] = [
    ...seed.map((m, i) => ({ key: `seed${i}`, from: m.from, text: tx(m.text), time: tx(m.time), day: m.day ? tx(m.day) : undefined, attachments: m.attachments })),
    ...sent.map((m: ChatMsg, i) => ({ key: m.id ?? `x${i}`, from: m.from, text: m.text, time: ago(m.time, rtl), day: i === 0 && !seed.some((x) => x.day && tx(x.day) === (rtl ? "اليوم" : "Today")) ? (rtl ? "اليوم" : "Today") : undefined, attachments: m.attachments, replyTo: m.replyTo, seen: m.from === "me", fresh: true })),
  ];

  const send = () => {
    if (!text.trim() && !files.length) return;
    const msg: ChatMsg = { id: uid(), from: "me", text: text.trim(), time: now(), attachments: files.length ? files : undefined, replyTo: reply ?? undefined };
    update((x) => ({ ...x, messages: { ...x.messages, [room]: [...(x.messages[room] ?? []), msg] } }));
    const tagged = mentionable.filter((id) => msg.text.includes(`@${firstName(id)}`));
    if (tagged.length) toast(rtl ? `سيصل تنبيه إلى ${tagged.map(firstName).join("، ")}` : `${tagged.map(firstName).join(", ")} will be notified`);
    setText(""); setFiles([]); setReply(null); setMention(null);
    if (replyFrom && replyText) {
      window.setTimeout(() => setTyping(replyFrom), 800);
      window.setTimeout(() => {
        setTyping(null);
        update((x) => ({ ...x, messages: { ...x.messages, [room]: [...(x.messages[room] ?? []), { id: uid(), from: replyFrom, text: tx(replyText), time: Date.now() }] } }));
        if (where && href) notify({ who: replyFrom, text: tx(replyText), where, href });
      }, 2600);
    }
  };
  const pick = async (list: FileList | null) => {
    if (!list?.length) return;
    const atts = await readFiles(list);
    setFiles((f) => [...f, ...atts].slice(0, 6));
    inputRef.current?.focus();
  };
  const react = (key: string, emoji: string) => {
    const k = `${room}:${key}`;
    update((x) => ({ ...x, msgReacts: { ...x.msgReacts, [k]: x.msgReacts[k] === emoji ? "" : emoji } }));
    setPicker(null);
  };

  return (
    <div className="c-room" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files); }}>
      {header}
      <div className="c-bar">
        {findOpen ? (
          <label className="c-find"><Search aria-hidden="true" /><input autoFocus value={find} onChange={(e) => setFind(e.target.value)} placeholder={rtl ? "ابحث في هذه المحادثة…" : "Search this conversation…"} aria-label={rtl ? "ابحث في المحادثة" : "Search conversation"} /><button onClick={() => { setFind(""); setFindOpen(false); }} aria-label={rtl ? "إغلاق البحث" : "Close search"}><X /></button></label>
        ) : pinned ? (
          <button className="c-pinned" onClick={() => document.getElementById(`msg-${room}-${pinned.key}`)?.scrollIntoView({ block: "center", behavior: "smooth" })}><Pin aria-hidden="true" /><span><strong>{pinned.who}</strong>{pinned.text}</span></button>
        ) : <span className="c-bar-fill" />}
        {!findOpen && <button className="c-bar-btn" onClick={() => setFindOpen(true)} aria-label={rtl ? "ابحث في المحادثة" : "Search conversation"}><Search /></button>}
        <button className={`c-bar-btn ${muted ? "is-on" : ""}`} onClick={() => { update((x) => ({ ...x, muted: { ...x.muted, [room]: !muted } })); toast(muted ? (rtl ? "أُعيدت التنبيهات" : "Notifications on") : (rtl ? "كُتمت المحادثة" : "Conversation muted")); }} aria-pressed={muted} aria-label={muted ? (rtl ? "إلغاء الكتم" : "Unmute") : (rtl ? "كتم المحادثة" : "Mute conversation")}>{muted ? <BellOff /> : <Bell />}</button>
      </div>
      <div className="c-stream" role="log" aria-live="polite">
        {term && rows.every((r) => !r.text.toLowerCase().includes(term)) && <p className="c-nofind">{rtl ? "لا رسائل مطابقة" : "No matching messages"}</p>}
        {rows.map((r, i) => {
          if (term && !r.text.toLowerCase().includes(term) && !(r.attachments ?? []).some((a) => a.name.toLowerCase().includes(term))) return null;
          const mine = r.from === "me"; const who = memberOrMe(r.from);
          const prev = rows[i - 1]; const chained = !!prev && prev.from === r.from && !r.day;
          const myReact = s.msgReacts[`${room}:${r.key}`];
          return (
            <Fragment key={r.key}>
              {r.day && <div className="c-day"><span>{r.day}</span></div>}
              <div id={`msg-${room}-${r.key}`} className={`c-msg ${mine ? "is-me" : ""} ${chained && !term ? "is-chained" : ""} ${r.fresh ? "is-fresh" : ""} ${toolsFor === r.key ? "is-tools" : ""} ${pinned?.key === r.key ? "is-pinned" : ""}`}>
                {!mine && <span className="c-msg-av">{!chained && <Avatar who={who} size={32} />}</span>}
                <div className="c-msg-body">
                  {group && !mine && !chained && <span className="c-msg-name">{tx(who.name)}</span>}
                  <div className="c-bubble" onClick={() => setToolsFor(toolsFor === r.key ? null : r.key)}>
                    {r.replyTo && <div className="c-quote"><strong>{r.replyTo.who}</strong>{r.replyTo.text}</div>}
                    {r.attachments?.map((a, j) => <AttachmentView key={j} a={a} />)}
                    {r.text && <p>{r.text.split(/(@[^\s@،,.!?]+)/).map((part, k) => part.startsWith("@") ? <mark key={k} className={`c-mention ${part.slice(1) === tx(ME.name).split(" ")[0] ? "is-me" : ""}`}>{part}</mark> : part)}</p>}
                    <span className="c-meta">{r.time}{r.seen && <CheckCheck aria-label={rtl ? "قُرئت" : "Seen"} />}</span>
                    {myReact && <span className="c-react-badge">{myReact}</span>}
                  </div>
                  <div className="c-tools">
                    <button onClick={() => { setReply({ who: tx(who.name), text: r.text || (r.attachments?.[0]?.name ?? "") }); inputRef.current?.focus(); }} aria-label={rtl ? "ردّ" : "Reply"}><CornerUpLeft /></button>
                    <button onClick={() => setPicker(picker === r.key ? null : r.key)} aria-label={rtl ? "تفاعل" : "React"}><SmilePlus /></button>
                    <button onClick={() => { const on = pinned?.key === r.key; update((x) => { const pins = { ...x.pins }; if (on) delete pins[room]; else pins[room] = { key: r.key, who: tx(who.name), text: r.text || (r.attachments?.[0]?.name ?? "") }; return { ...x, pins }; }); toast(on ? (rtl ? "أُلغي التثبيت" : "Unpinned") : (rtl ? "ثُبّتت الرسالة أعلى المحادثة" : "Pinned to the top")); }} aria-label={pinned?.key === r.key ? (rtl ? "إلغاء التثبيت" : "Unpin") : (rtl ? "ثبّت" : "Pin")}>{pinned?.key === r.key ? <PinOff /> : <Pin />}</button>
                    {picker === r.key && <div className="c-quick">{QUICK.map((e) => <button key={e} onClick={() => react(r.key, e)} className={myReact === e ? "is-on" : ""}>{e}</button>)}</div>}
                  </div>
                </div>
              </div>
            </Fragment>
          );
        })}
        {typing && !term && <div className="c-msg"><span className="c-msg-av"><Avatar who={memberOrMe(typing)} size={32} /></span><div className="c-typing"><span /><span /><span /></div></div>}
        <div ref={endRef} />
      </div>

      <form className="c-compose" onSubmit={(e) => { e.preventDefault(); send(); }}>
        {reply && <div className="c-replying"><CornerUpLeft /><span><strong>{rtl ? `ردّ على ${reply.who}` : `Replying to ${reply.who}`}</strong>{reply.text}</span><button type="button" onClick={() => setReply(null)} aria-label={rtl ? "إلغاء" : "Cancel"}><X /></button></div>}
        {suggestions.length > 0 && (
          <div className="c-mentions" role="listbox" aria-label={rtl ? "اذكر عضوًا" : "Mention someone"}>
            {suggestions.map((id) => <button type="button" key={id} role="option" onMouseDown={(e) => { e.preventDefault(); pickMention(id); }}><Avatar who={memberOrMe(id)} size={26} /><span>{tx(memberOrMe(id).name)}</span></button>)}
          </div>
        )}
        {files.length > 0 && <div className="c-pending">{files.map((f, i) => <AttachmentView key={i} a={f} compact onRemove={() => setFiles((x) => x.filter((_, j) => j !== i))} />)}</div>}
        <div className="c-compose-row">
          <button type="button" className="c-attach" onClick={() => fileRef.current?.click()} aria-label={rtl ? "إرفاق ملف أو صورة" : "Attach a file or image"}><Paperclip /></button>
          <input ref={fileRef} type="file" multiple hidden onChange={(e) => { pick(e.target.files); e.target.value = ""; }} />
          <textarea ref={inputRef} rows={1} value={text} onChange={(e) => onType(e.target.value)} placeholder={placeholder ?? (rtl ? "اكتب رسالة…" : "Write a message…")} aria-label={rtl ? "رسالة" : "Message"}
            onKeyDown={(e) => {
              if (suggestions.length && (e.key === "Enter" || e.key === "Tab")) { e.preventDefault(); pickMention(suggestions[0]); return; }
              if (e.key === "Escape") setMention(null);
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
            }} />
          <button className="c-send" disabled={!text.trim() && !files.length} aria-label={rtl ? "إرسال" : "Send"}><Send /></button>
        </div>
      </form>
    </div>
  );
}
