"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, ClipboardList, Clock, FileText, Lock, MessageCircleQuestion, Search, ThumbsDown, ThumbsUp, Users, Vote } from "lucide-react";
import { Card, Empty, MemberShell, PageHead, Progress, Tabs, useMember } from "./shell";
import { ASK_SUGGESTIONS, CONSULTATIONS, SURVEYS } from "./data";
import { toast, update, useStore } from "./store";
import { NEWS, RESOURCES } from "../content";

function Surveys() {
  const { rtl, tx } = useMember();
  const Arrow = rtl ? ArrowLeft : ArrowRight;
  const [tab, setTab] = useState<"open" | "done">("open");
  const st = useStore();
  const answered: Record<string, boolean> = Object.fromEntries(SURVEYS.map((s) => [s.id, st.answered[s.id] ?? s.answered]));
  const setAnswered = (fn: (a: Record<string, boolean>) => Record<string, boolean>) => {
    const next = fn(answered);
    update((x) => ({ ...x, answered: { ...x.answered, ...next } }));
    toast(rtl ? "شكرًا، سُجّلت مشاركتك 🙌" : "Thanks, your answer is in 🙌");
  };
  const list = SURVEYS.filter((s) => s.status === tab);
  const featured = SURVEYS.find((s) => s.status === "open" && !answered[s.id]);
  return (
    <>
      <PageHead icon={ClipboardList} kicker={{ ar: "بحث مجتمعي منظّم", en: "Structured community research" }} title={{ ar: "الاستبيانات", en: "Surveys" }} lead={{ ar: "استطلاعات قصيرة تجمع رأي الأعضاء وتحوّله إلى قراءة موثّقة.", en: "Short surveys that turn members' views into a documented reading." }} />
      {featured && tab === "open" && (
        <div className="m-feature">
          <span className="m-kicker"><ClipboardList aria-hidden="true" />{rtl ? "الاستبيان المميز" : "Featured survey"}</span>
          <h2>{tx(featured.title)}</h2><p>{tx(featured.about)}</p>
          <div className="m-meta-row"><span><FileText aria-hidden="true" />{featured.questions} {rtl ? "أسئلة" : "questions"}</span><span><Clock aria-hidden="true" />{featured.minutes} {rtl ? "دقائق" : "min"}</span><span><Lock aria-hidden="true" />{rtl ? "إجاباتك مجهولة الهوية" : "Anonymous answers"}</span></div>
          <Progress value={(featured.responses / featured.target) * 100} />
          <small>{featured.responses} {rtl ? `مشاركة من أصل ${featured.target}` : `of ${featured.target} responses`}</small>
          <button className="m-btn is-light" onClick={() => setAnswered((a) => ({ ...a, [featured.id]: true }))}>{rtl ? "ابدأ الاستبيان" : "Start survey"}<Arrow /></button>
        </div>
      )}
      <div className="m-toolbar"><Tabs label={rtl ? "الحالة" : "Status"} value={tab} onChange={setTab} items={[{ key: "open", label: rtl ? "مفتوح الآن" : "Open now", count: SURVEYS.filter((s) => s.status === "open").length }, { key: "done", label: rtl ? "اكتمل" : "Completed", count: SURVEYS.filter((s) => s.status === "done").length }]} /></div>
      <div className="m-cards">
        {list.map((s) => (
          <article key={s.id} className="m-survey">
            <div className="m-ws-top"><span className={`m-stage ${s.status === "open" ? "stage-active" : "stage-done"}`}>{s.status === "open" ? (rtl ? "مفتوح" : "Open") : (rtl ? "اكتمل" : "Completed")}</span>{answered[s.id] && <span className="m-done-tag"><CheckCircle2 aria-hidden="true" />{rtl ? "أجبت" : "Answered"}</span>}</div>
            <h3>{tx(s.title)}</h3><p>{tx(s.about)}</p>
            <Progress value={(s.responses / s.target) * 100} />
            <small>{s.responses} / {s.target} · {Math.round((s.responses / s.target) * 100)}% {rtl ? "من الهدف" : "of target"}</small>
            {s.status === "done" ? <button className="m-btn is-sm">{rtl ? "اقرأ النتائج" : "Read results"}</button>
              : answered[s.id] ? <span className="m-muted">{rtl ? "شكرًا لمشاركتك" : "Thanks for taking part"}</span>
              : <button className="m-btn is-sm is-primary" onClick={() => setAnswered((a) => ({ ...a, [s.id]: true }))}>{rtl ? "شارك" : "Take part"}</button>}
          </article>
        ))}
      </div>
    </>
  );
}

function Consultations() {
  const { rtl, tx } = useMember();
  const open = CONSULTATIONS.find((c) => c.status === "open");
  const past = CONSULTATIONS.filter((c) => c.status === "past");
  const st = useStore();
  const votes: Record<number, "agree" | "disagree" | "pass"> = Object.fromEntries(Object.entries(st.votes).filter(([k]) => k.startsWith("c1:")).map(([k, v]) => [Number(k.slice(3)), v as "agree" | "disagree" | "pass"]));
  const setVotes = (fn: (v: typeof votes) => typeof votes) => {
    const next = fn(votes);
    update((x) => ({ ...x, votes: { ...x.votes, ...Object.fromEntries(Object.entries(next).map(([k, v]) => [`c1:${k}`, v])) } }));
  };
  return (
    <>
      <PageHead icon={Vote} kicker={{ ar: "المشاورات", en: "Consultations" }} title={{ ar: "الاستشارات المجتمعية", en: "Community consultations" }} lead={{ ar: "صوّت على عبارات قصيرة لنعرف أين نتفق وأين نختلف.", en: "Vote on short statements to see where we agree and differ." }} />
      {open ? (
        <section className="m-consult">
          <div className="m-consult-head">
            <span className="m-kicker is-light"><Vote aria-hidden="true" />{rtl ? "استشارة نشطة" : "Active consultation"}</span>
            <h2>{tx(open.title)}</h2><p>{tx(open.question)}</p>
            <div className="m-meta-row"><span><Users aria-hidden="true" />{open.participants} / {open.target}</span><span><Clock aria-hidden="true" />{tx(open.ends)}</span></div>
            <Progress value={(open.participants / open.target) * 100} />
          </div>
          <ul className="m-statements">
            {open.statements.map((st, i) => { const v = votes[i]; return (
              <li key={i}>
                <p>{tx(st.text)}</p>
                <div className="m-vote" role="group" aria-label={rtl ? "رأيك" : "Your view"}>
                  <button aria-pressed={v === "agree"} onClick={() => setVotes((x) => ({ ...x, [i]: "agree" }))} className="is-agree"><ThumbsUp />{rtl ? "أوافق" : "Agree"}</button>
                  <button aria-pressed={v === "disagree"} onClick={() => setVotes((x) => ({ ...x, [i]: "disagree" }))} className="is-disagree"><ThumbsDown />{rtl ? "لا أوافق" : "Disagree"}</button>
                  <button aria-pressed={v === "pass"} onClick={() => setVotes((x) => ({ ...x, [i]: "pass" }))}>{rtl ? "لست متأكدًا" : "Not sure"}</button>
                </div>
                {v && <div className="m-split" aria-label={rtl ? "رأي المشاركين" : "Participants' view"}><span className="is-agree" style={{ width: `${st.agree}%` }}>{st.agree}%</span><span className="is-pass" style={{ width: `${100 - st.agree - st.disagree}%` }} /><span className="is-disagree" style={{ width: `${st.disagree}%` }}>{st.disagree}%</span></div>}
              </li>
            ); })}
          </ul>
          <p className="m-consult-note">{Object.keys(votes).length === open.statements.length ? (rtl ? "شكرًا، سُجّلت مشاركتك." : "Thanks, your participation is recorded.") : (rtl ? `صوّتَّ على ${Object.keys(votes).length} من ${open.statements.length} عبارات.` : `You voted on ${Object.keys(votes).length} of ${open.statements.length} statements.`)}</p>
        </section>
      ) : <Empty icon={Vote} title={rtl ? "لا توجد استشارة مفتوحة الآن" : "No open consultation right now"} />}
      <Card title={rtl ? "استشارات سابقة" : "Past consultations"}>
        <ul className="m-list">
          {past.map((c) => <li key={c.id}><div className="m-row"><span className="m-ico is-info"><FileText /></span><span><strong>{tx(c.title)}</strong><small>{c.participants} {rtl ? "مشاركًا" : "participants"} · {tx(c.ends)}</small></span><button className="m-btn is-sm">{rtl ? "عرض التقرير" : "View report"}</button></div></li>)}
        </ul>
      </Card>
    </>
  );
}

function Assistant() {
  const { rtl, tx, lang } = useMember();
  const [q, setQ] = useState("");
  const [asked, setAsked] = useState("");
  // Questions sent from the top bar or the floating "search & ask" button arrive as ?q=.
  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("q");
    if (!fromUrl) return;
    const id = requestAnimationFrame(() => { setQ(fromUrl); setAsked(fromUrl); });
    return () => cancelAnimationFrame(id);
  }, []);
  const words = asked.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  const hits = asked ? [
    ...RESOURCES.map((r) => ({ kind: rtl ? "المكتبة" : "Library", title: r.title[lang], href: "/library" })),
    ...NEWS.map((n) => ({ kind: rtl ? "الأخبار" : "News", title: n.title[lang], href: "/news" })),
  ].map((h) => ({ ...h, score: words.filter((w) => h.title.toLowerCase().includes(w)).length })).sort((a, b) => b.score - a.score).slice(0, 4) : [];
  return (
    <>
      <PageHead icon={MessageCircleQuestion} kicker={{ ar: "اسأل", en: "Ask" }} title={{ ar: "اسأل المكتبة", en: "Ask the library" }} lead={{ ar: "بحث في المحتوى المنشور، بالعربية أو الإنجليزية.", en: "Search published content, in Arabic or English." }} />
      <form className="m-ask" onSubmit={(e) => { e.preventDefault(); setAsked(q.trim()); }}>
        <label className="m-search is-lg"><Search aria-hidden="true" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={rtl ? "مثلًا: ما تجارب المصالحة التي درستها المنصة؟" : "e.g. Which reconciliation experiences has the platform studied?"} aria-label={rtl ? "سؤالك" : "Your question"} /></label>
        <button className="m-btn is-primary" disabled={!q.trim()}>{rtl ? "ابحث" : "Search"}</button>
      </form>
      <div className="m-chips">{ASK_SUGGESTIONS.map((s) => <button key={s.en} onClick={() => { setQ(tx(s)); setAsked(tx(s)); }}>{tx(s)}</button>)}</div>
      {asked && (
        <Card title={rtl ? `نتائج: «${asked}»` : `Results: "${asked}"`}>
          <ul className="m-list">{hits.map((h) => <li key={h.title}><a href={h.href}><span className="m-ico is-info"><BookOpen /></span><span><strong>{h.title}</strong><small>{h.kind}</small></span></a></li>)}</ul>
        </Card>
      )}
      <p className="m-privacy"><Lock aria-hidden="true" />{rtl ? "لا نحفظ اسمك ولا حسابك مع سؤالك." : "We don't store your name or account with your question."}</p>
    </>
  );
}

export function SurveysPage() { return <MemberShell active="surveys"><Surveys /></MemberShell>; }
export function ConsultationsPage() { return <MemberShell active="consultations"><Consultations /></MemberShell>; }
export function AssistantPage() { return <MemberShell active="assistant"><Assistant /></MemberShell>; }
