"use client";

import { useState, type CSSProperties } from "react";
import { AlertTriangle, CheckCircle2, ExternalLink, FolderInput, KeyRound, Save, ShieldAlert } from "lucide-react";
import { ACard, Hero, useAdmin } from "./shell";
import { findSection } from "./nav";
import { REGIONS, USERS } from "./data";
import { Avatar } from "./users";
import { fmtDate } from "./collection";
import { logAction, toast, useAdminState, useAudit, type AuditEntry } from "./store";
import type { T } from "../content";

const L = (ar: string, en: string): T => ({ ar, en });
const tone = (c: string) => ({ "--gc": c }) as CSSProperties;

/* ── Members → workspaces ── */
const WS: { key: string; name: T; color: string; cap: number }[] = [
  { key: "map", name: L("خريطة مساحات الحوار المحلية", "Local dialogue spaces map"), color: "#0B79CD", cap: 8 },
  { key: "news", name: L("سلسلة «اقرأ الخبر»", "“Read the news” series"), color: "#2bb39a", cap: 6 },
  { key: "schools", name: L("دليل الحوار للمدارس", "Dialogue guide for schools"), color: "#e9a521", cap: 6 },
  { key: "podcast", name: L("بودكاست الأجيال", "Generations podcast"), color: "#6a5bd6", cap: 4 },
];
const SEED_DIST: Record<string, string> = { m1: "map", m2: "news", m3: "", m4: "map", m5: "news", m6: "schools", m7: "podcast", m8: "" };

export function DistributionSection() {
  const { rtl, tx } = useAdmin();
  const sec = findSection("distribution")!;
  const [dist, setDist] = useAdminState<Record<string, string>>("distribution", SEED_DIST);
  const [draft, setDraft] = useState<Record<string, string> | null>(null);
  const cur = draft ?? dist;
  const changed = draft ? Object.keys(draft).filter((k) => draft[k] !== dist[k]).length : 0;
  const unassigned = USERS.filter((u) => !cur[u.id]);
  return (
    <>
      <Hero group={sec.group} icon={FolderInput} title={tx(sec.label)} lead={rtl ? "وزّع الأعضاء على مساحات العمل. التغييرات لا تُحفظ حتى تضغط «احفظ التوزيع»، ويُبلَّغ كل عضو بمساحته الجديدة." : "Assign members to workspaces. Nothing is saved until you press Save; each member is told about their new workspace."}
        stats={[{ value: USERS.length - unassigned.length, label: rtl ? "موزَّع" : "assigned" }, { value: unassigned.length, label: rtl ? "بلا مساحة" : "unassigned" }, { value: WS.length, label: rtl ? "مساحات" : "workspaces" }]}
        actions={changed ? <><button type="button" className="a-btn" onClick={() => setDraft(null)}>{rtl ? "تراجع" : "Discard"}</button><button type="button" className="a-btn is-primary" onClick={() => { setDist(cur); setDraft(null); logAction("members", L(`وزّع ${changed} أعضاء على مساحات العمل`, `Assigned ${changed} members to workspaces`), "/admin/distribution"); toast(rtl ? `حُفظ التوزيع وأُبلغ ${changed} أعضاء` : `Saved; ${changed} members notified`); }}><Save aria-hidden="true" />{rtl ? `احفظ التوزيع (${changed})` : `Save (${changed})`}</button></> : undefined} />
      <div className="a-ws-grid">
        {WS.map((w) => { const n = USERS.filter((u) => cur[u.id] === w.key).length; return (
          <div key={w.key} className="a-ws" style={tone(w.color)}><b>{tx(w.name)}</b><span>{n} / {w.cap}</span><span className="a-map-bar"><span style={{ width: `${Math.min(100, (n / w.cap) * 100)}%`, background: w.color }} /></span></div>
        ); })}
      </div>
      <ACard title={rtl ? "الأعضاء" : "Members"}>
        <ul className="a-assign">
          {USERS.map((u) => { const r = REGIONS.find((x) => x.key === u.region); return (
            <li key={u.id} className={draft && draft[u.id] !== dist[u.id] ? "is-changed" : ""}>
              <a href={`/admin/users?open=${u.id}`} className="a-person"><Avatar u={u} size={32} /><span><b>{tx(u.name)}</b><small>{r ? tx(r.name) : ""}</small></span></a>
              <select className="a-select" value={cur[u.id] ?? ""} onChange={(e) => setDraft({ ...cur, [u.id]: e.target.value })} aria-label={rtl ? `مساحة ${tx(u.name)}` : `${tx(u.name)}'s workspace`}>
                <option value="">{rtl ? "— بلا مساحة —" : "— none —"}</option>
                {WS.map((w) => <option key={w.key} value={w.key}>{tx(w.name)}</option>)}
              </select>
            </li>
          ); })}
        </ul>
      </ACard>
    </>
  );
}

/* ── Roles & permissions ── */
const PERMS: { key: string; label: T }[] = [
  { key: "moderate", label: L("الإشراف على المحتوى والبلاغات", "Moderate content and reports") },
  { key: "publish", label: L("نشر الأخبار والمكتبة", "Publish news and library") },
  { key: "review", label: L("مراجعة المقترحات والمخرجات", "Review proposals and outputs") },
  { key: "members", label: L("إدارة الأعضاء والدعوات", "Manage members and invitations") },
  { key: "read", label: L("قراءة نقاشات المساحات", "Read workspace discussions") },
  { key: "settings", label: L("إعدادات المنصة", "Platform settings") },
];
const ROLES: { key: string; label: T; color: string }[] = [
  { key: "admin", label: L("مدير عام", "Administrator"), color: "#0B79CD" },
  { key: "editor", label: L("محرّر", "Editor"), color: "#6a5bd6" },
  { key: "moderator", label: L("مشرف", "Moderator"), color: "#e8707f" },
  { key: "facilitator", label: L("ميسّر مساحة", "Workspace facilitator"), color: "#2bb39a" },
];
const SEED_ROLES: Record<string, string[]> = { admin: PERMS.map((p) => p.key), editor: ["publish", "review"], moderator: ["moderate", "read"], facilitator: ["review"] };

export function RolesSection() {
  const { rtl, tx } = useAdmin();
  const sec = findSection("roles")!;
  const [roles, setRoles] = useAdminState<Record<string, string[]>>("roles", SEED_ROLES);
  const toggle = (role: string, perm: string) => {
    if (role === "admin") { toast(rtl ? "المدير العام يملك كل الصلاحيات دائمًا" : "The administrator always has every permission"); return; }
    const has = roles[role]?.includes(perm);
    setRoles({ ...roles, [role]: has ? roles[role].filter((p) => p !== perm) : [...(roles[role] ?? []), perm] });
    const r = ROLES.find((x) => x.key === role)!; const p = PERMS.find((x) => x.key === perm)!;
    logAction("access", L(`${has ? "سحب" : "منح"} «${p.label.ar}» من/لـ ${r.label.ar}`, `${has ? "Removed" : "Granted"} “${p.label.en}” ${has ? "from" : "to"} ${r.label.en}`), "/admin/roles");
  };
  return (
    <>
      <Hero group={sec.group} icon={KeyRound} title={tx(sec.label)} lead={rtl ? "من يستطيع ماذا. اضغط أي خانة لتمنح الصلاحية أو تسحبها؛ كل تغيير يُسجَّل في سجل التدقيق." : "Who can do what. Click a box to grant or remove; every change is logged."} />
      <ACard>
        <div className="a-table-wrap"><table className="a-table a-matrix">
          <thead><tr><th>{rtl ? "الصلاحية" : "Permission"}</th>{ROLES.map((r) => <th key={r.key} style={tone(r.color)}><span className="a-role">{tx(r.label)}</span></th>)}</tr></thead>
          <tbody>{PERMS.map((p) => <tr key={p.key}><td>{tx(p.label)}</td>{ROLES.map((r) => { const on = roles[r.key]?.includes(p.key); return (
            <td key={r.key}><button type="button" className={`a-perm ${on ? "is-on" : ""}`} style={tone(r.color)} aria-pressed={!!on} onClick={() => toggle(r.key, p.key)} aria-label={`${tx(r.label)}: ${tx(p.label)}`}>{on && <CheckCircle2 />}</button></td>
          ); })}</tr>)}</tbody>
        </table></div>
      </ACard>
    </>
  );
}

/* ── Activities & audit log ── */
const SEED_ACTIVITY: AuditEntry[] = [
  { id: "x1", at: "2026-11-23T08:20:00Z", who: "m1", cat: "content", text: L("نشرت نور حسن خبر «انطلاق دورة الحوار في خمس جامعات» في الأخبار", "Nour Hasan published “Dialogue course launches in five universities” in News"), href: "/admin/news" },
  { id: "x2", at: "2026-11-23T07:05:00Z", who: "m1", cat: "moderation", text: L("أخفى أحمد خليل تعليقًا في «حوار الضفة الشمالية» بعد 3 بلاغات، وأُبلغ صاحبه بالسبب", "Ahmad Khalil hid a comment in Northern dialogue after 3 reports; the author was told why"), href: "/admin/hidden" },
  { id: "x3", at: "2026-11-22T15:40:00Z", who: "m6", cat: "members", text: L("وزّعت رهف ناصر 8 أعضاء على «سلسلة اقرأ الخبر»", "Rahaf Nasser assigned 8 members to “Read the news”"), href: "/admin/distribution" },
  { id: "x4", at: "2026-11-22T10:12:00Z", who: "m6", cat: "content", text: L("أنشأت رهف ناصر استطلاع «كيف تتابع الأخبار؟» للمنصة العامة، وينتظر المراجعة", "Rahaf Nasser created the public survey “How do you follow the news?”, awaiting review"), href: "/admin/surveys" },
  { id: "x5", at: "2026-11-21T09:00:00Z", who: "m2", cat: "members", text: L("أرسلت سارة يوسف دفعة دعوات «طلاب جامعة النجاح» (24 دعوة)", "Sara Yousef sent the “An-Najah students” invitation batch (24)"), href: "/admin/invitations" },
  { id: "x6", at: "2026-11-20T18:30:00Z", who: "m1", cat: "access", text: L("فتح أحمد خليل نقاش «هل نؤجل جلسة جنين؟» للاطّلاع", "Ahmad Khalil opened the discussion “Should we postpone the Jenin session?”"), href: "/admin/discussions" },
  { id: "x7", at: "2026-11-19T12:00:00Z", who: "m8", cat: "settings", text: L("غيّرت هبة عيسى نص شريط الإعلان في الموقع العام", "Heba Issa changed the announcement bar text on the public site"), href: "/admin/appearance" },
];
const CATS: { key: AuditEntry["cat"]; label: T; color: string }[] = [
  { key: "content", label: L("المحتوى", "Content"), color: "#6a5bd6" },
  { key: "moderation", label: L("الإشراف", "Moderation"), color: "#e8707f" },
  { key: "members", label: L("الأعضاء", "Members"), color: "#3d96dc" },
  { key: "access", label: L("اطّلاع وصلاحيات", "Access"), color: "#e9a521" },
  { key: "settings", label: L("الإعدادات", "Settings"), color: "#7d88a3" },
];

export function LogSection({ k }: { k: "activities" | "audit" }) {
  const { rtl, tx, lang } = useAdmin();
  const sec = findSection(k)!;
  const mine = useAudit();
  const [cat, setCat] = useState<string>("");
  const [who, setWho] = useState<string>("");
  const all = [...mine, ...SEED_ACTIVITY].filter((e) => (k === "audit" ? e.cat !== "content" || e.who === "me" : true));
  const list = all.filter((e) => (!cat || e.cat === cat) && (!who || e.who === who));
  const time = (iso: string) => new Date(iso).toLocaleTimeString(lang === "ar" ? "ar-u-nu-latn" : "en-GB", { hour: "2-digit", minute: "2-digit" });
  const person = (id: string) => (id === "me" ? null : USERS.find((u) => u.id === id));
  return (
    <>
      <Hero group={sec.group} icon={sec.icon} title={tx(sec.label)}
        lead={k === "audit" ? (rtl ? "كل إجراء حساس: من فعله، وماذا، وأين، ومتى. ما تفعله أنت في هذه التجربة يظهر هنا فورًا." : "Every sensitive action: who, what, where and when. What you do in this demo shows up here instantly.")
          : (rtl ? "ما فعله الطاقم، بجمل واضحة وكل سطر يفتح ما يخصه." : "What the team did, in plain sentences; each row opens what it's about.")}
        stats={[{ value: all.length, label: rtl ? "حدث" : "events" }, { value: mine.length, label: rtl ? "منك في هذه التجربة" : "by you in this demo" }]} />
      <ACard>
        <div className="a-toolbar">
          <div className="a-seg"><button type="button" aria-pressed={!cat} onClick={() => setCat("")}>{rtl ? "الكل" : "All"}</button>{CATS.map((c) => <button key={c.key} type="button" aria-pressed={cat === c.key} onClick={() => setCat(c.key)}>{tx(c.label)}</button>)}</div>
          <select className="a-select" value={who} onChange={(e) => setWho(e.target.value)} aria-label={rtl ? "الشخص" : "Person"}>
            <option value="">{rtl ? "كل الطاقم" : "Whole team"}</option><option value="me">{rtl ? "أنا" : "Me"}</option>
            {USERS.slice(0, 8).map((u) => <option key={u.id} value={u.id}>{tx(u.name)}</option>)}
          </select>
          <span className="a-muted a-toolbar-n">{list.length}</span>
        </div>
        <ol className="a-log">
          {list.map((e) => { const c = CATS.find((x) => x.key === e.cat)!; const p = person(e.who); const body = <>
            {p ? <Avatar u={p} size={32} /> : <span className="a-avatar is-sm">{rtl ? "أنا" : "Me"}</span>}
            <div><p>{tx(e.text)}</p><small><span className="a-tag" style={tone(c.color)}>{tx(c.label)}</span> · {fmtDate(e.at, lang)} · {time(e.at)}</small></div>
            {e.href && <ExternalLink aria-hidden="true" className="a-log-go" />}
          </>; return <li key={e.id} style={tone(c.color)}>{e.href ? <a href={e.href}>{body}</a> : <div className="a-log-row">{body}</div>}</li>; })}
          {!list.length && <li className="a-empty-line">{rtl ? "لا أحداث بهذه الفلاتر." : "No events for these filters."}</li>}
        </ol>
      </ACard>
    </>
  );
}

/* ── Appearance & settings: forms saved to the demo store ── */
type Appearance = { announce: string; announceOn: boolean; heroTitle: string; heroImage: string; sections: Record<string, boolean>; identity: "forum" | "palestine" };
const SEED_APP: Appearance = { announce: "التسجيل في دورة الحوار مفتوح حتى 30 نوفمبر", announceOn: true, heroTitle: "معرفة وحوار فلسطيني", heroImage: "/images/facilitators.webp", sections: { news: true, library: true, stories: true, surveys: true, about: true }, identity: "forum" };
const SITE_SECTIONS: { key: string; label: T }[] = [
  { key: "news", label: L("الأخبار", "News") }, { key: "library", label: L("المكتبة", "Library") }, { key: "stories", label: L("القصص", "Stories") },
  { key: "surveys", label: L("الاستطلاعات", "Surveys") }, { key: "about", label: L("عن المنصة", "About") },
];

export function AppearanceSection() {
  const { rtl, tx } = useAdmin();
  const sec = findSection("appearance")!;
  const [saved, setSaved] = useAdminState<Appearance>("appearance", SEED_APP);
  const [v, setV] = useState<Appearance>(saved);
  const dirty = JSON.stringify(v) !== JSON.stringify(saved);
  const save = () => { setSaved(v); logAction("settings", L("غيّر إعدادات مظهر الموقع العام", "Changed the public site's appearance"), "/admin/appearance"); toast(rtl ? "حُفظ المظهر" : "Appearance saved"); };
  return (
    <>
      <Hero group={sec.group} icon={sec.icon} title={tx(sec.label)} lead={rtl ? "شريط الإعلان، وواجهة الرئيسية، والأقسام الظاهرة في قائمة الموقع. المعاينة تتغير وأنت تكتب." : "The announcement bar, the home hero and the sections shown in the site menu. The preview updates as you type."}
        actions={dirty ? <><button type="button" className="a-btn" onClick={() => setV(saved)}>{rtl ? "تراجع" : "Discard"}</button><button type="button" className="a-btn is-primary" onClick={save}><Save aria-hidden="true" />{rtl ? "احفظ" : "Save"}</button></> : undefined} />
      <div className="a-dash">
        <ACard title={rtl ? "الإعدادات" : "Settings"}>
          <div className="a-form">
            <label className="a-check"><input type="checkbox" checked={v.announceOn} onChange={(e) => setV({ ...v, announceOn: e.target.checked })} /><span>{rtl ? "إظهار شريط الإعلان" : "Show the announcement bar"}</span></label>
            <label className="a-fgroup"><span className="a-flabel">{rtl ? "نص الإعلان" : "Announcement"}</span><input value={v.announce} onChange={(e) => setV({ ...v, announce: e.target.value })} /></label>
            <label className="a-fgroup"><span className="a-flabel">{rtl ? "عنوان الواجهة" : "Hero title"}</span><input value={v.heroTitle} onChange={(e) => setV({ ...v, heroTitle: e.target.value })} /></label>
            <label className="a-fgroup"><span className="a-flabel">{rtl ? "صورة الواجهة (رابط)" : "Hero image (link)"}</span><input dir="ltr" value={v.heroImage} onChange={(e) => setV({ ...v, heroImage: e.target.value })} /></label>
            <div className="a-fgroup"><span className="a-flabel">{rtl ? "أقسام قائمة الموقع" : "Site menu sections"}</span>
              <div className="a-pick">{SITE_SECTIONS.map((s) => <label key={s.key} className={v.sections[s.key] ? "is-on" : ""}><input type="checkbox" checked={!!v.sections[s.key]} onChange={(e) => setV({ ...v, sections: { ...v.sections, [s.key]: e.target.checked } })} />{tx(s.label)}</label>)}</div></div>
          </div>
        </ACard>
        <ACard title={rtl ? "معاينة" : "Preview"}>
          <div className="a-sitepreview">
            {v.announceOn && <div className="a-sp-bar">{v.announce}</div>}
            <nav>{SITE_SECTIONS.filter((s) => v.sections[s.key]).map((s) => <span key={s.key}>{tx(s.label)}</span>)}</nav>
            <div className="a-sp-hero" style={{ backgroundImage: v.heroImage ? `linear-gradient(0deg, rgba(16,25,66,.75), rgba(16,25,66,.2)), url(${v.heroImage})` : undefined }}><h3>{v.heroTitle}</h3></div>
          </div>
        </ACard>
      </div>
    </>
  );
}

type Settings = { maintenance: boolean; registration: boolean; publicSurveysReview: boolean; staffEmail: string; digest: "daily" | "weekly" | "off" };
const SEED_SET: Settings = { maintenance: false, registration: true, publicSurveysReview: true, staffEmail: "team@wepal.ps", digest: "daily" };

export function SettingsSection() {
  const { rtl, tx } = useAdmin();
  const sec = findSection("settings")!;
  const [saved, setSaved] = useAdminState<Settings>("settings", SEED_SET);
  const [v, setV] = useState<Settings>(saved);
  const [confirm, setConfirm] = useState("");
  const [danger, setDanger] = useState(false);
  const dirty = JSON.stringify(v) !== JSON.stringify(saved);
  const save = () => { setSaved(v); logAction("settings", L("غيّر إعدادات المنصة", "Changed platform settings"), "/admin/settings"); toast(rtl ? "حُفظت الإعدادات" : "Settings saved"); };
  const row = (key: keyof Settings, label: T, hint: T) => (
    <label className="a-set-row"><span><b>{tx(label)}</b><small>{tx(hint)}</small></span><input type="checkbox" className="a-switch" checked={!!v[key]} onChange={(e) => setV({ ...v, [key]: e.target.checked })} /></label>
  );
  return (
    <>
      <Hero group={sec.group} icon={sec.icon} title={tx(sec.label)} lead={rtl ? "الصيانة والتسجيل والإشعارات. الإجراءات الخطرة في الأسفل ومحميّة بتأكيد." : "Maintenance, sign-ups and notifications. Dangerous actions are at the bottom, behind a confirmation."}
        actions={dirty ? <><button type="button" className="a-btn" onClick={() => setV(saved)}>{rtl ? "تراجع" : "Discard"}</button><button type="button" className="a-btn is-primary" onClick={save}><Save aria-hidden="true" />{rtl ? "احفظ" : "Save"}</button></> : undefined} />
      {saved.maintenance && <div className="a-banner is-warn"><AlertTriangle aria-hidden="true" />{rtl ? "وضع الصيانة مفعّل: الأعضاء يرون صفحة «نعود قريبًا»." : "Maintenance mode is on: members see a “back soon” page."}</div>}
      <ACard>
        <div className="a-set">
          {row("maintenance", L("وضع الصيانة", "Maintenance mode"), L("يغلق منطقة الأعضاء مؤقتًا، ويبقى الموقع العام.", "Temporarily closes the members' area; the public site stays."))}
          {row("registration", L("التسجيل بالدعوات مفتوح", "Invitation sign-up open"), L("إن أُغلق لا تعمل أكواد الدعوة الجديدة.", "When closed, new invitation codes don't work."))}
          {row("publicSurveysReview", L("مراجعة الاستطلاعات العامة قبل نشرها", "Review public surveys before publishing"), L("الاستطلاع الموجّه للعامة ينتظر موافقة الإدارة.", "Surveys for the public wait for admin approval."))}
          <label className="a-set-row"><span><b>{rtl ? "بريد إشعارات الطاقم" : "Staff notification email"}</b><small>{rtl ? "تصله البلاغات العاجلة." : "Receives urgent reports."}</small></span><input dir="ltr" className="a-input" value={v.staffEmail} onChange={(e) => setV({ ...v, staffEmail: e.target.value })} /></label>
          <label className="a-set-row"><span><b>{rtl ? "ملخّص الطاقم" : "Staff digest"}</b><small>{rtl ? "رسالة بما ينتظر القرار." : "An email of what's waiting."}</small></span>
            <select className="a-select" value={v.digest} onChange={(e) => setV({ ...v, digest: e.target.value as Settings["digest"] })}><option value="daily">{rtl ? "يومي" : "Daily"}</option><option value="weekly">{rtl ? "أسبوعي" : "Weekly"}</option><option value="off">{rtl ? "متوقف" : "Off"}</option></select></label>
        </div>
      </ACard>
      <ACard className="a-danger" title={<><ShieldAlert aria-hidden="true" />{rtl ? "منطقة خطرة" : "Danger zone"}</>}>
        <div className="a-set-row"><span><b>{rtl ? "حذف طارئ لكل محتوى عضو" : "Emergency delete of a member's content"}</b><small>{rtl ? "لحالات الخطر على سلامة عضو. لا يمكن التراجع." : "For threats to a member's safety. Cannot be undone."}</small></span><button type="button" className="a-btn is-danger" onClick={() => setDanger(true)}>{rtl ? "ابدأ" : "Start"}</button></div>
      </ACard>
      {danger && (
        <div className="a-modal-scrim" onClick={() => setDanger(false)}>
          <form className="a-modal" role="alertdialog" aria-modal="true" onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); logAction("settings", L("نفّذ حذفًا طارئًا (تجربة)", "Ran an emergency delete (demo)"), "/admin/settings"); toast(rtl ? "نُفّذ الحذف الطارئ (تجربة)" : "Emergency delete done (demo)"); setDanger(false); setConfirm(""); }}>
            <h3>{rtl ? "حذف طارئ" : "Emergency delete"}</h3>
            <p className="a-muted">{rtl ? "اكتب «احذف» للتأكيد. هذه تجربة ولن يُحذف شيء فعلًا." : "Type DELETE to confirm. This is a demo; nothing is really deleted."}</p>
            <input className="a-input" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoFocus />
            <div className="a-modal-f"><button type="button" className="a-btn" onClick={() => setDanger(false)}>{rtl ? "إلغاء" : "Cancel"}</button><button type="submit" className="a-btn is-danger is-solid" disabled={confirm.trim() !== (rtl ? "احذف" : "DELETE")}>{rtl ? "نفّذ" : "Run"}</button></div>
          </form>
        </div>
      )}
    </>
  );
}

export const CUSTOM_KEYS = new Set(["distribution", "roles", "activities", "audit", "appearance", "settings"]);
export function CustomSection({ k }: { k: string }) {
  if (k === "distribution") return <DistributionSection />;
  if (k === "roles") return <RolesSection />;
  if (k === "activities" || k === "audit") return <LogSection k={k} />;
  if (k === "appearance") return <AppearanceSection />;
  return <SettingsSection />;
}
