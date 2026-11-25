"use client";

import { useState } from "react";
import { CalendarPlus, Check, ChevronDown, Flame, Users } from "lucide-react";
import { Avatar, Card, useMember } from "./shell";
import { GROUPS, MEMBERS, ONLINE } from "./data";
import { useFeed } from "./social";
import { update, useStore } from "./store";
import type { T } from "../content";

const L = (ar: string, en: string): T => ({ ar, en });

/** Topics people are discussing; each filters the feed by a word in the posts. */
export const TRENDS: { tag: T; q: T; base: number }[] = [
  { tag: L("#اقرأ_الخبر", "#Read_the_news"), q: L("الخبر", "news"), base: 18 },
  { tag: L("#الثقة_بين_الأجيال", "#Trust_between_generations"), q: L("الأجيال", "generations"), base: 14 },
  { tag: L("#جلسات_الحوار", "#Dialogue_sessions"), q: L("جلس", "session"), base: 11 },
  { tag: L("#الشهر_القادم", "#Next_month"), q: L("الشهر القادم", "next month"), base: 7 },
];

export function CommunitySide({ tag, setTag, isIn, toggle, members }: {
  tag: number | null; setTag: (i: number | null) => void;
  isIn: (id: string) => boolean; toggle: (id: string) => void; members: (id: string) => number;
}) {
  const { rtl, tx, lang } = useMember();
  const s = useStore();
  const feed = useFeed();
  const [allOnline, setAllOnline] = useState(false);
  const online = MEMBERS.filter((m) => ONLINE.has(m.id));
  const events = feed.filter((p) => p.extra?.event).slice(0, 3);
  const suggest = GROUPS.filter((g) => !isIn(g.id)).slice(0, 3);
  const loc = lang === "ar" ? "ar-u-nu-latn" : "en-GB";

  return (
    <div className="m-stack c-side">
      <Card title={<><Flame aria-hidden="true" className="c-side-ic is-hot" />{rtl ? "ما يدور الآن" : "Trending now"}</>}>
        <ol className="c-trends">
          {TRENDS.map((t, i) => {
            const n = t.base + feed.filter((p) => tx(p.text).includes(tx(t.q))).length;
            return (
              <li key={i}><button type="button" aria-pressed={tag === i} onClick={() => setTag(tag === i ? null : i)}>
                <span><strong>{tx(t.tag)}</strong><small>{n} {rtl ? "منشورًا هذا الأسبوع" : "posts this week"}</small></span>
              </button></li>
            );
          })}
        </ol>
      </Card>

      {events.length > 0 && (
        <Card title={<><CalendarPlus aria-hidden="true" className="c-side-ic is-event" />{rtl ? "فعاليات قريبة" : "Upcoming events"}</>}>
          <ul className="c-events">
            {events.map((p) => {
              const ev = p.extra!.event!; const d = new Date(ev.date); const going = !!s.going?.[p.id];
              return (
                <li key={p.id}>
                  <a href={`#${p.id}`} className="c-ev-date"><b>{d.toLocaleDateString(loc, { day: "numeric" })}</b><span>{d.toLocaleDateString(loc, { month: "short" })}</span></a>
                  <a href={`#${p.id}`} className="c-ev-body"><strong>{ev.title}</strong><small>{d.toLocaleTimeString(loc, { hour: "2-digit", minute: "2-digit" })}{ev.place ? ` · ${ev.place}` : ""}</small></a>
                  <button type="button" className={`c-ev-go ${going ? "is-on" : ""}`} aria-pressed={going} title={rtl ? "سأحضر" : "Going"} aria-label={rtl ? "سأحضر" : "Going"}
                    onClick={() => update((x) => ({ ...x, going: { ...(x.going ?? {}), [p.id]: !going } }))}>{going ? <Check /> : <CalendarPlus />}</button>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <Card title={<><span className="c-live" aria-hidden="true" />{rtl ? "متصلون الآن" : "Online now"}</>}>
        <button type="button" className="c-faces" onClick={() => setAllOnline((o) => !o)} aria-expanded={allOnline}>
          <span>{online.slice(0, 6).map((m) => <Avatar key={m.id} who={m} size={34} />)}</span>
          <em>{online.length} {rtl ? "أعضاء" : "members"}</em><ChevronDown aria-hidden="true" />
        </button>
        {allOnline && <ul className="m-people">{online.map((m) => <li key={m.id}><a href={`/members/${m.id}`}><Avatar who={m} size={32} online /><span><strong>{tx(m.name)}</strong><small>{tx(m.city)}</small></span></a></li>)}</ul>}
      </Card>

      {suggest.length > 0 && (
        <Card title={<><Users aria-hidden="true" className="c-side-ic" />{rtl ? "مجموعات قد تهمك" : "Groups you may like"}</>}>
          <ul className="c-suggest">
            {suggest.map((g) => (
              <li key={g.id}>
                <span className="m-group-badge is-sm">{tx(g.name).slice(0, 1)}</span>
                <a href={`/community/${g.id}`}><strong>{tx(g.name)}</strong><small>{tx(g.kind)} · {members(g.id)} {rtl ? "عضوًا" : "members"}</small></a>
                <button type="button" className={`m-btn is-sm ${isIn(g.id) ? "is-joined" : "is-primary"}`} onClick={() => toggle(g.id)}>{isIn(g.id) ? <Check /> : (rtl ? "انضم" : "Join")}</button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
