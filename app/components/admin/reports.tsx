"use client";

import { useState } from "react";
import { Ban, Bell, CheckCircle2, EyeOff, MessageSquareWarning, ShieldCheck, Undo2 } from "lucide-react";
import { ACard, Hero, useAdmin } from "./shell";
import { findSection } from "./nav";
import { REPORTS, USERS, type Report } from "./data";
import { Avatar } from "./users";
import type { T } from "../content";

type Action = "dismiss" | "hide" | "warn" | "suspend";
const ACTIONS: { key: Action; icon: typeof Ban; label: T; template: T }[] = [
  { key: "dismiss", icon: ShieldCheck, label: { ar: "لا مخالفة", en: "No violation" }, template: { ar: "", en: "" } },
  { key: "hide", icon: EyeOff, label: { ar: "إخفاء المحتوى", en: "Hide content" }, template: { ar: "أخفينا {kind} الذي نشرته في «{where}» لأنه يخالف قواعد المجتمع ({reason}). نرجو مراجعة القواعد قبل المشاركة القادمة.", en: "We hid your {kind} in “{where}” because it breaks the community rules ({reason}). Please review the rules before your next post." } },
  { key: "warn", icon: MessageSquareWarning, label: { ar: "تنبيه العضو", en: "Warn the member" }, template: { ar: "وصلنا بلاغ عن {kind} في «{where}» ({reason}). هذا تنبيه أول: نرجو الالتزام بقواعد الحوار المحترم.", en: "We received a report about your {kind} in “{where}” ({reason}). This is a first warning: please keep to the rules of respectful dialogue." } },
  { key: "suspend", icon: Ban, label: { ar: "إيقاف 7 أيام", en: "Suspend 7 days" }, template: { ar: "أوقفنا حسابك 7 أيام بسبب {kind} في «{where}» ({reason}) بعد تكرار المخالفة. يمكنك التواصل معنا للاعتراض.", en: "Your account is suspended for 7 days because of your {kind} in “{where}” ({reason}) after repeated violations. You can contact us to appeal." } },
];
const REPORTER_NOTE: T = { ar: "شكرًا لبلاغك. راجعه فريق الإشراف واتخذ الإجراء المناسب.", en: "Thank you for your report. The moderation team reviewed it and took appropriate action." };

type Done = { action: Action; message: string; notifyReporter: boolean };

export function ReportsSection() {
  const { rtl, tx } = useAdmin();
  const sec = findSection("reports")!;
  const [done, setDone] = useState<Record<string, Done>>({});
  const open = REPORTS.filter((r) => !done[r.id]).length;
  return (
    <>
      <Hero group={sec.group} icon={sec.icon} title={tx(sec.label)} lead={rtl ? "مع كل إجراء تكتب رسالة تصل العضو المبلَّغ عنه في إشعاراته مع السبب، ويُبلَّغ صاحب البلاغ بأن بلاغه عولج." : "With every action you write a message that reaches the reported member's notifications with the reason, and the reporter is told their report was handled."}
        stats={[{ value: open, label: rtl ? "بانتظار قرار" : "awaiting decision" }, { value: REPORTS.length - open, label: rtl ? "عولجت الآن" : "handled now" }]} />
      <div className="a-reports">
        {REPORTS.map((r) => <ReportCard key={r.id} r={r} done={done[r.id]} onDone={(d) => setDone((x) => ({ ...x, [r.id]: d }))} onUndo={() => setDone((x) => { const n = { ...x }; delete n[r.id]; return n; })} />)}
      </div>
    </>
  );
}

function ReportCard({ r, done, onDone, onUndo }: { r: Report; done?: Done; onDone: (d: Done) => void; onUndo: () => void }) {
  const { rtl, tx, lang } = useAdmin();
  const reported = USERS.find((u) => u.id === r.reported)!;
  const by = USERS.find((u) => u.id === r.by)!;
  const fill = (t: T) => t[lang].replace("{kind}", tx(r.target.kind)).replace("{where}", tx(r.target.where)).replace("{reason}", tx(r.reason));
  const [action, setAction] = useState<Action>("hide");
  const [message, setMessage] = useState(() => fill(ACTIONS[1].template));
  const [notify, setNotify] = useState(true);
  const pick = (a: Action) => { setAction(a); setMessage(fill(ACTIONS.find((x) => x.key === a)!.template)); };
  const needsMsg = action !== "dismiss";

  return (
    <ACard className={`a-report ${done ? "is-done" : ""}`}
      title={<><span className="a-pill is-bad">{tx(r.reason)}</span> {tx(r.target.kind)} · {tx(r.target.where)}</>}
      sub={`${tx(r.when)} · ${r.count > 1 ? (rtl ? `${r.count} بلاغات على المحتوى نفسه` : `${r.count} reports on the same content`) : (rtl ? "بلاغ واحد" : "1 report")}`}>
      <blockquote className="a-quote">{tx(r.target.excerpt)}</blockquote>
      <div className="a-parties">
        <a href="/admin/users"><Avatar u={reported} size={30} /><span><small>{rtl ? "المبلَّغ عنه" : "Reported"}</small><b>{tx(reported.name)}</b></span></a>
        <a href="/admin/users"><Avatar u={by} size={30} /><span><small>{rtl ? "صاحب البلاغ" : "Reported by"}</small><b>{tx(by.name)}</b></span></a>
      </div>

      {done ? (
        <div className="a-outcome">
          <CheckCircle2 aria-hidden="true" />
          <div>
            <b>{tx(ACTIONS.find((a) => a.key === done.action)!.label)}</b>
            {done.action !== "dismiss" && <p><Bell aria-hidden="true" />{rtl ? `وصل ${tx(reported.name)} إشعار: ` : `${tx(reported.name)} was notified: `}«{done.message}»</p>}
            {done.notifyReporter && <p><Bell aria-hidden="true" />{rtl ? `وصل ${tx(by.name)} إشعار: ` : `${tx(by.name)} was notified: `}«{tx(REPORTER_NOTE)}»</p>}
          </div>
          <button type="button" className="a-btn is-sm" onClick={onUndo}><Undo2 aria-hidden="true" />{rtl ? "تراجع" : "Undo"}</button>
        </div>
      ) : (
        <form className="a-decide" onSubmit={(e) => { e.preventDefault(); onDone({ action, message: needsMsg ? message.trim() : "", notifyReporter: notify }); }}>
          <div className="a-seg is-actions" role="radiogroup" aria-label={rtl ? "الإجراء" : "Action"}>
            {ACTIONS.map((a) => { const I = a.icon; return (
              <button key={a.key} type="button" role="radio" aria-checked={action === a.key} onClick={() => pick(a.key)}><I aria-hidden="true" />{tx(a.label)}</button>
            ); })}
          </div>
          {needsMsg && (
            <label className="a-textarea">
              <span>{rtl ? `رسالة إلى ${tx(reported.name)} (تظهر في إشعاراته مع البلاغ)` : `Message to ${tx(reported.name)} (shown in their notifications)`}</span>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} required />
            </label>
          )}
          <label className="a-check"><input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
            <span>{rtl ? `إعلام ${tx(by.name)} بأن بلاغه عولج` : `Tell ${tx(by.name)} their report was handled`}<small>«{tx(REPORTER_NOTE)}»</small></span>
          </label>
          <div className="a-decide-f"><button type="submit" className="a-btn is-primary">{rtl ? "نفّذ وأرسل" : "Apply and send"}</button></div>
        </form>
      )}
    </ACard>
  );
}
