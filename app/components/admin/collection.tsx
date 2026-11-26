"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowLeft, ArrowRight, Copy, Eye, ImagePlus, Palette, Pencil, Plus, Search, Trash2, X, type LucideIcon,
} from "lucide-react";
import { ACard, Hero, useAdmin } from "./shell";
import { findSection } from "./nav";
import { USERS } from "./data";
import { Avatar } from "./users";
import { logAction, nowIso, readImage, toast, uid, useAdminState, type AuditEntry } from "./store";
import type { T } from "../content";
import { CoverMaker } from "./cover-maker";

/* ── Types ── */
export type Bi = { ar: string; en: string };
export type Item = { id: string; status: string; created: string; history?: { at: string; text: Bi; message?: string }[]; [k: string]: unknown };
export type FieldType = "text" | "textarea" | "select" | "number" | "date" | "url" | "member" | "members" | "image" | "images" | "tags" | "toggle";
export type Field = {
  key: string; label: T; type: FieldType; bi?: boolean; required?: boolean | "ar"; options?: { value: string; label: T }[];
  list?: boolean; filter?: boolean; hint?: T; rows?: number; placeholder?: string; hideInView?: boolean; coverMaker?: boolean;
};
export type StatusDef = { key: string; label: T; tone: "ok" | "new" | "bad" | "warn" | "mute" };
export type ActionDef = {
  key: string; label: T; icon: LucideIcon; to?: string; from?: string[]; tone?: "primary" | "danger";
  message?: { label: T; template: T; notifyLabel?: T }; run?: (item: Item) => Partial<Item> | void; done: T;
};
export type CollectionConfig = {
  section: string; titleKey: string; subtitle?: (it: Item, tx: (t: T) => string) => string;
  lead: T; fields: Field[]; statuses: StatusDef[]; actions: ActionDef[]; seed: Item[];
  createLabel?: T; noCreate?: boolean; chipsBy?: string; dateKey?: string;
  preview?: (it: Item, ctx: Ctx) => ReactNode; extra?: (ctx: Ctx & { items: Item[]; setItems: (f: (v: Item[]) => Item[]) => void }) => ReactNode;
  stats?: (items: Item[], rtl: boolean) => { value: string | number; label: string }[];
  onView?: (it: Item) => void; auditCat?: AuditEntry["cat"];
};
type Ctx = { rtl: boolean; tx: (t: T) => string; lang: "ar" | "en" };

/* ── Value helpers ── */
const isBi = (v: unknown): v is Bi => !!v && typeof v === "object" && "ar" in (v as object);
export const biText = (v: unknown, lang: "ar" | "en") => (isBi(v) ? (v[lang] || v.ar || v.en || "") : typeof v === "string" ? v : "");
const userName = (id: unknown, tx: (t: T) => string) => { const u = USERS.find((x) => x.id === id); return u ? tx(u.name) : ""; };
export const fmtDate = (iso: unknown, lang: "ar" | "en") => {
  if (typeof iso !== "string" || !iso) return "—";
  const d = new Date(iso); if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(lang === "ar" ? "ar-u-nu-latn" : "en-GB", { day: "numeric", month: "short", year: "numeric" });
};
function fieldText(f: Field, v: unknown, ctx: Ctx): string {
  if (v === undefined || v === null || v === "") return "";
  if (f.bi) return biText(v, ctx.lang);
  if (f.type === "select") return ctx.tx(f.options?.find((o) => o.value === v)?.label ?? { ar: String(v), en: String(v) });
  if (f.type === "member") return userName(v, ctx.tx);
  if (f.type === "members") return (v as string[]).map((id) => userName(id, ctx.tx)).join("، ");
  if (f.type === "date") return fmtDate(v, ctx.lang);
  if (f.type === "toggle") return v ? (ctx.rtl ? "نعم" : "Yes") : (ctx.rtl ? "لا" : "No");
  if (f.type === "tags") return (v as string[]).join("، ");
  if (f.type === "images") return `${(v as string[]).length}`;
  return String(v);
}

/* ── The section ── */
export function Collection({ config }: { config: CollectionConfig }) {
  const { rtl, tx, lang } = useAdmin();
  const ctx: Ctx = { rtl, tx, lang };
  const sec = findSection(config.section)!;
  const [items, setItems] = useAdminState<Item[]>(`c:${config.section}`, config.seed);
  const [view, setView] = useState<string | null>(null);
  const [edit, setEdit] = useState<Item | "new" | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [chip, setChip] = useState("");

  // The full view lives at #v=<id>, so the back button works and links can point to an item.
  useEffect(() => {
    const sync = () => { const m = window.location.hash.match(/^#v=(.+)$/); setView(m ? decodeURIComponent(m[1]) : null); };
    const id = requestAnimationFrame(sync);
    window.addEventListener("hashchange", sync);
    return () => { cancelAnimationFrame(id); window.removeEventListener("hashchange", sync); };
  }, []);
  const open = (it: Item) => { window.history.pushState(null, "", `#v=${encodeURIComponent(it.id)}`); setView(it.id); window.scrollTo(0, 0); config.onView?.(it); };
  const close = () => { window.history.pushState(null, "", window.location.pathname + window.location.search); setView(null); };
  useEffect(() => { const pop = () => { const m = window.location.hash.match(/^#v=(.+)$/); setView(m ? decodeURIComponent(m[1]) : null); }; window.addEventListener("popstate", pop); return () => window.removeEventListener("popstate", pop); }, []);

  const title = (it: Item) => biText(it[config.titleKey], lang) || (rtl ? "بلا عنوان" : "Untitled");
  const save = (it: Item, isNew: boolean) => {
    setItems((v) => (isNew ? [it, ...v] : v.map((x) => (x.id === it.id ? it : x))));
    logAction(config.auditCat ?? "content", { ar: `${isNew ? "أضاف" : "عدّل"} «${biText(it[config.titleKey], "ar")}» في ${sec.label.ar}`, en: `${isNew ? "Added" : "Edited"} “${biText(it[config.titleKey], "en")}” in ${sec.label.en}` }, `/admin/${config.section}#v=${it.id}`);
    toast(isNew ? (rtl ? "أُضيف" : "Added") : (rtl ? "حُفظت التعديلات" : "Changes saved"));
  };
  const remove = (it: Item) => {
    const before = items;
    setItems((v) => v.filter((x) => x.id !== it.id)); close();
    logAction(config.auditCat ?? "content", { ar: `حذف «${biText(it[config.titleKey], "ar")}» من ${sec.label.ar}`, en: `Deleted “${biText(it[config.titleKey], "en")}” from ${sec.label.en}` });
    toast(rtl ? "حُذف" : "Deleted", () => setItems(() => before));
  };
  const duplicate = (it: Item) => {
    const c: Item = { ...structuredClone(it), id: uid(), status: config.statuses[0].key, created: nowIso(), history: [] };
    const t = c[config.titleKey]; c[config.titleKey] = isBi(t) ? { ar: `${t.ar} (نسخة)`, en: `${t.en} (copy)` } : `${String(t)} (${rtl ? "نسخة" : "copy"})`;
    setItems((v) => [c, ...v]); toast(rtl ? "أُنشئت نسخة" : "Copy created"); open(c);
  };
  const act = (it: Item, a: ActionDef, message?: string, notify?: boolean) => {
    const patch = a.run?.(it) ?? {};
    const entry = { at: nowIso(), text: { ar: a.done.ar, en: a.done.en }, message: message ? `${message}${notify === false ? "" : ""}` : undefined };
    const next: Item = { ...it, ...patch, status: a.to ?? it.status, history: [entry, ...(it.history ?? [])] };
    setItems((v) => v.map((x) => (x.id === it.id ? next : x)));
    logAction(config.auditCat ?? "content", { ar: `${a.done.ar}: «${biText(it[config.titleKey], "ar")}»`, en: `${a.done.en}: “${biText(it[config.titleKey], "en")}”` }, `/admin/${config.section}#v=${it.id}`);
    toast(tx(a.done) + (message && notify !== false ? (rtl ? " · أُرسل الإشعار" : " · notification sent") : ""));
  };

  const current = view ? items.find((x) => x.id === view) : null;
  if (view && current) {
    return <Detail config={config} it={current} ctx={ctx} title={title(current)} onBack={close} onEdit={() => setEdit(current)} onDelete={() => remove(current)} onDuplicate={() => duplicate(current)} onAct={act}>
      {edit && <EditForm config={config} item={edit === "new" ? null : edit} onClose={() => setEdit(null)} onSave={(it, isNew) => { save(it, isNew); setEdit(null); }} />}
    </Detail>;
  }

  const filterFields = config.fields.filter((f) => f.filter);
  const chipField = config.chipsBy ? config.fields.find((f) => f.key === config.chipsBy) : undefined;
  const list = items.filter((it) => {
    if (status && it.status !== status) return false;
    if (chip && it[config.chipsBy!] !== chip) return false;
    for (const [k, v] of Object.entries(filters)) if (v && it[k] !== v && !(Array.isArray(it[k]) && (it[k] as string[]).includes(v))) return false;
    if (q.trim()) { const s = q.trim().toLowerCase(); if (!config.fields.some((f) => fieldText(f, it[f.key], { ...ctx, lang: "ar" }).toLowerCase().includes(s) || fieldText(f, it[f.key], { ...ctx, lang: "en" }).toLowerCase().includes(s))) return false; }
    return true;
  });
  const dateKey = config.dateKey ?? "created";
  list.sort((a, b) => String(b[dateKey] ?? "").localeCompare(String(a[dateKey] ?? "")));
  const cols = config.fields.filter((f) => f.list);
  const statusOf = (k: string) => config.statuses.find((s) => s.key === k);

  return (
    <>
      <Hero group={sec.group} icon={sec.icon} title={tx(sec.label)} lead={tx(config.lead)}
        actions={config.noCreate ? undefined : <button type="button" className="a-btn is-primary" onClick={() => setEdit("new")}><Plus aria-hidden="true" />{tx(config.createLabel ?? { ar: "إضافة", en: "Add" })}</button>}
        stats={config.stats ? config.stats(items, rtl) : [{ value: items.length, label: rtl ? "الكل" : "total" }, ...config.statuses.slice(0, 3).map((s) => ({ value: items.filter((i) => i.status === s.key).length, label: tx(s.label) }))]} />

      {config.extra?.({ ...ctx, items, setItems })}

      {chipField && (
        <div className="a-typechips" role="group" aria-label={tx(chipField.label)}>
          <button type="button" aria-pressed={!chip} onClick={() => setChip("")}>{rtl ? "الكل" : "All"}<b>{items.length}</b></button>
          {chipField.options?.map((o) => { const n = items.filter((i) => i[chipField.key] === o.value).length; return (
            <button key={o.value} type="button" aria-pressed={chip === o.value} onClick={() => setChip(chip === o.value ? "" : o.value)}>{tx(o.label)}<b>{n}</b></button>
          ); })}
        </div>
      )}

      <ACard>
        <div className="a-toolbar">
          <label className="a-field"><Search aria-hidden="true" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={rtl ? "ابحث…" : "Search…"} /></label>
          {filterFields.map((f) => (
            <select key={f.key} className="a-select" value={filters[f.key] ?? ""} onChange={(e) => setFilters((x) => ({ ...x, [f.key]: e.target.value }))} aria-label={tx(f.label)}>
              <option value="">{tx(f.label)}: {rtl ? "الكل" : "all"}</option>
              {(f.type === "member" || f.type === "members" ? USERS.map((u) => ({ value: u.id, label: u.name })) : f.options ?? []).map((o) => {
                const n = items.filter((i) => i[f.key] === o.value || (Array.isArray(i[f.key]) && (i[f.key] as string[]).includes(o.value))).length;
                return <option key={o.value} value={o.value}>{tx(o.label)} ({n})</option>;
              })}
            </select>
          ))}
          <div className="a-seg" role="group" aria-label={rtl ? "الحالة" : "Status"}>
            <button type="button" aria-pressed={!status} onClick={() => setStatus("")}>{rtl ? "الكل" : "All"}</button>
            {config.statuses.map((s) => <button key={s.key} type="button" aria-pressed={status === s.key} onClick={() => setStatus(s.key)}>{tx(s.label)} <small>{items.filter((i) => i.status === s.key).length}</small></button>)}
          </div>
          <span className="a-muted a-toolbar-n">{list.length} / {items.length}</span>
        </div>
        <div className="a-table-wrap">
          <table className="a-table">
            <thead><tr>
              <th>{tx(config.fields.find((f) => f.key === config.titleKey)!.label)}</th>
              {cols.map((f) => <th key={f.key}>{tx(f.label)}</th>)}
              <th>{rtl ? "الحالة" : "Status"}</th><th>{rtl ? "التاريخ" : "Date"}</th><th aria-label={rtl ? "عرض" : "View"} />
            </tr></thead>
            <tbody>
              {list.map((it) => { const st = statusOf(it.status); return (
                <tr key={it.id} className="a-row" onClick={(e) => { if (!(e.target as HTMLElement).closest("a,button")) open(it); }}>
                  <td className="a-td-title"><button type="button" className="a-row-link" onClick={() => open(it)}><span><b>{title(it)}</b>{config.subtitle && <small>{config.subtitle(it, tx)}</small>}</span></button></td>
                  {cols.map((f) => <td key={f.key}><Cell f={f} v={it[f.key]} ctx={ctx} /></td>)}
                  <td>{st && <span className={`a-pill is-${st.tone}`}>{tx(st.label)}</span>}</td>
                  <td className="a-muted">{fmtDate(it[dateKey], lang)}</td>
                  <td><button type="button" className="a-icon is-sm" onClick={() => open(it)} aria-label={`${rtl ? "عرض" : "View"}: ${title(it)}`} title={rtl ? "عرض كما يظهر" : "View as it appears"}><Eye /></button></td>
                </tr>
              ); })}
            </tbody>
          </table>
          {!list.length && <p className="a-empty-line">{items.length ? (rtl ? "لا نتائج بهذه الفلاتر." : "Nothing matches these filters.") : (rtl ? "لا شيء هنا بعد." : "Nothing here yet.")}</p>}
        </div>
      </ACard>
      {edit && <EditForm config={config} item={edit === "new" ? null : edit} onClose={() => setEdit(null)} onSave={(it, isNew) => { save(it, isNew); setEdit(null); }} />}
    </>
  );
}

function Cell({ f, v, ctx }: { f: Field; v: unknown; ctx: Ctx }) {
  if (f.type === "member" && typeof v === "string") { const u = USERS.find((x) => x.id === v); return u ? <a className="a-person" href={`/admin/users?open=${u.id}`}><Avatar u={u} size={24} />{ctx.tx(u.name)}</a> : <>—</>; }
  if (f.type === "members" && Array.isArray(v)) return <span className="a-faces">{(v as string[]).slice(0, 4).map((id) => { const u = USERS.find((x) => x.id === id); return u ? <a key={id} href={`/admin/users?open=${id}`} title={ctx.tx(u.name)}><Avatar u={u} size={24} /></a> : null; })}{v.length > 4 && <small>+{v.length - 4}</small>}</span>;
  if (f.type === "select") return <span className="a-tag">{fieldText(f, v, ctx) || "—"}</span>;
  // eslint-disable-next-line @next/next/no-img-element
  if (f.type === "image") return typeof v === "string" && v ? <img className="a-thumb" src={v} alt="" /> : <span className="a-thumb is-empty" />;
  return <>{fieldText(f, v, ctx) || "—"}</>;
}

/* ── Full view of one item ── */
function Detail({ config, it, ctx, title, onBack, onEdit, onDelete, onDuplicate, onAct, children }: {
  config: CollectionConfig; it: Item; ctx: Ctx; title: string; onBack: () => void; onEdit: () => void; onDelete: () => void; onDuplicate: () => void;
  onAct: (it: Item, a: ActionDef, message?: string, notify?: boolean) => void; children?: ReactNode;
}) {
  const { rtl, tx, lang } = ctx;
  const sec = findSection(config.section)!;
  const st = config.statuses.find((s) => s.key === it.status);
  const [asking, setAsking] = useState<ActionDef | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const Back = rtl ? ArrowRight : ArrowLeft;
  const available = config.actions.filter((a) => (!a.from || a.from.includes(it.status)) && a.to !== it.status);
  const meta = config.fields.filter((f) => !f.hideInView && f.type !== "textarea" && f.type !== "images" && f.type !== "image" && !(f.bi && f.type === "text" && f.key === config.titleKey));
  return (
    <div className="a-detail" style={{ ["--gc" as string]: sec.group.color }}>
      <div className="a-detail-top">
        <button type="button" className="a-btn is-sm" onClick={onBack}><Back aria-hidden="true" />{rtl ? `كل ${tx(sec.label)}` : `All ${tx(sec.label).toLowerCase()}`}</button>
        <div className="a-detail-tools">
          <button type="button" className="a-btn is-sm" onClick={onEdit}><Pencil aria-hidden="true" />{rtl ? "تعديل" : "Edit"}</button>
          {!config.noCreate && <button type="button" className="a-btn is-sm" onClick={onDuplicate}><Copy aria-hidden="true" />{rtl ? "نسخ" : "Duplicate"}</button>}
          <button type="button" className="a-btn is-sm is-danger" onClick={() => setConfirmDel(true)}><Trash2 aria-hidden="true" />{rtl ? "حذف" : "Delete"}</button>
        </div>
      </div>
      <header className="a-detail-h">
        <span className="a-tile"><sec.icon aria-hidden="true" /></span>
        <div><h1>{title}</h1>{config.subtitle && <p>{config.subtitle(it, tx)}</p>}</div>
        {st && <span className={`a-pill is-${st.tone} is-lg`}>{tx(st.label)}</span>}
      </header>
      {!!available.length && (
        <div className="a-detail-actions">
          <span>{rtl ? "قرارك:" : "Your decision:"}</span>
          {available.map((a) => { const I = a.icon; return (
            <button key={a.key} type="button" className={`a-btn ${a.tone === "primary" ? "is-primary" : a.tone === "danger" ? "is-danger" : ""}`} onClick={() => (a.message ? setAsking(a) : onAct(it, a))}><I aria-hidden="true" />{tx(a.label)}</button>
          ); })}
        </div>
      )}
      <div className="a-detail-grid">
        <div className="a-detail-main">
          {config.preview ? config.preview(it, ctx) : <DefaultPreview config={config} it={it} ctx={ctx} />}
        </div>
        <aside className="a-detail-side">
          <ACard title={rtl ? "التفاصيل" : "Details"}>
            <dl className="a-dl">
              {meta.map((f) => { const v = it[f.key]; if (v === undefined || v === "" || (Array.isArray(v) && !v.length)) return null; return (
                <div key={f.key}><dt>{tx(f.label)}</dt><dd><Cell f={f} v={v} ctx={ctx} /></dd></div>
              ); })}
              <div><dt>{rtl ? "أُضيف" : "Added"}</dt><dd>{fmtDate(it.created, lang)}</dd></div>
            </dl>
          </ACard>
          <ACard title={rtl ? "سجلّ هذا العنصر" : "History"}>
            {it.history?.length ? (
              <ol className="a-timeline">
                {it.history.map((h, i) => <li key={i}><b>{tx(h.text)}</b><time>{fmtDate(h.at, lang)}</time>{h.message && <p>«{h.message}»</p>}</li>)}
              </ol>
            ) : <p className="a-muted">{rtl ? "لا قرارات بعد." : "No decisions yet."}</p>}
          </ACard>
        </aside>
      </div>
      {asking && <MessageDialog action={asking} it={it} ctx={ctx} title={title} onClose={() => setAsking(null)} onSend={(m, n) => { onAct(it, asking, m, n); setAsking(null); }} />}
      {confirmDel && (
        <div className="a-modal-scrim" onClick={() => setConfirmDel(false)}>
          <div className="a-modal" role="alertdialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h3>{rtl ? `حذف «${title}»؟` : `Delete “${title}”?`}</h3>
            <p className="a-muted">{rtl ? "يمكنك التراجع خلال ثوانٍ من الإشعار أسفل الشاشة." : "You can undo for a few seconds from the notice at the bottom."}</p>
            <div className="a-modal-f"><button type="button" className="a-btn" onClick={() => setConfirmDel(false)}>{rtl ? "إلغاء" : "Cancel"}</button><button type="button" className="a-btn is-danger is-solid" onClick={onDelete}><Trash2 aria-hidden="true" />{rtl ? "احذف" : "Delete"}</button></div>
          </div>
        </div>
      )}
      {children}
    </div>
  );
}

function DefaultPreview({ config, it, ctx }: { config: CollectionConfig; it: Item; ctx: Ctx }) {
  const { tx, lang, rtl } = ctx;
  const long = config.fields.filter((f) => f.type === "textarea" || f.type === "image" || f.type === "images");
  return (
    <ACard title={rtl ? "كما يظهر" : "As it appears"}>
      <div className="a-preview">
        {long.map((f) => {
          const v = it[f.key];
          if (f.type === "image") return typeof v === "string" && v ? <img key={f.key} className="a-cover" src={v} alt="" /> : null;
          if (f.type === "images") return Array.isArray(v) && v.length ? <div key={f.key} className="a-gallery">{(v as string[]).map((src, i) => <img key={i} src={src} alt="" />)}</div> : null;
          if (f.bi) return (
            <div key={f.key} className="a-bi-view">
              <section dir="rtl" lang="ar"><small>{tx(f.label)} · العربية</small><p>{biText(v, "ar") ? (v as Bi).ar : <em className="a-muted">—</em>}</p></section>
              <section dir="ltr" lang="en"><small>{tx(f.label)} · English</small><p>{isBi(v) && v.en ? v.en : <em className="a-muted">{lang === "ar" ? "لا ترجمة بعد" : "No translation yet"}</em>}</p></section>
            </div>
          );
          return v ? <p key={f.key}>{String(v)}</p> : null;
        })}
      </div>
    </ACard>
  );
}

function MessageDialog({ action, it, ctx, title, onClose, onSend }: { action: ActionDef; it: Item; ctx: Ctx; title: string; onClose: () => void; onSend: (m: string, notify: boolean) => void }) {
  const { rtl, tx } = ctx;
  const [m, setM] = useState(() => tx(action.message!.template).replace("{title}", title));
  const [notify, setNotify] = useState(true);
  void it;
  return (
    <div className="a-modal-scrim" onClick={onClose}>
      <form className="a-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); onSend(m.trim(), notify); }}>
        <h3>{tx(action.label)}</h3>
        <label className="a-textarea"><span>{tx(action.message!.label)}</span><textarea rows={4} value={m} onChange={(e) => setM(e.target.value)} required autoFocus /></label>
        {action.message!.notifyLabel && <label className="a-check"><input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} /><span>{tx(action.message!.notifyLabel)}</span></label>}
        <div className="a-modal-f"><button type="button" className="a-btn" onClick={onClose}>{rtl ? "إلغاء" : "Cancel"}</button><button type="submit" className={`a-btn ${action.tone === "danger" ? "is-danger is-solid" : "is-primary"}`}>{rtl ? "نفّذ وأرسل" : "Apply and send"}</button></div>
      </form>
    </div>
  );
}

/* ── Add / edit form ── */
function EditForm({ config, item, onClose, onSave }: { config: CollectionConfig; item: Item | null; onClose: () => void; onSave: (it: Item, isNew: boolean) => void }) {
  const { rtl, tx } = useAdmin();
  const blank = useMemo<Item>(() => {
    const b: Item = { id: uid(), status: config.statuses[0].key, created: nowIso(), history: [] };
    for (const f of config.fields) b[f.key] = f.bi ? { ar: "", en: "" } : f.type === "members" || f.type === "images" || f.type === "tags" ? [] : f.type === "toggle" ? false : f.type === "select" ? (f.options?.[0]?.value ?? "") : f.type === "date" ? nowIso().slice(0, 10) : "";
    return b;
  }, [config]);
  const [v, setV] = useState<Item>(() => (item ? structuredClone(item) : blank));
  const [err, setErr] = useState<string | null>(null);
  const set = (k: string, val: unknown) => setV((x) => ({ ...x, [k]: val }));
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); }; document.addEventListener("keydown", k); return () => document.removeEventListener("keydown", k); }, [onClose]);
  const submit = () => {
    for (const f of config.fields) {
      if (!f.required) continue;
      const val = v[f.key];
      const empty = f.bi ? (!isBi(val) || !val.ar.trim() || (f.required === true && !val.en.trim())) : val === "" || val === undefined || (Array.isArray(val) && !val.length);
      if (empty) { setErr(rtl ? `«${tx(f.label)}» مطلوب${f.bi && f.required === true ? " بالعربية والإنجليزية" : ""}.` : `“${tx(f.label)}” is required${f.bi && f.required === true ? " in Arabic and English" : ""}.`); return; }
    }
    onSave(v, !item);
  };
  return (
    <div className="a-drawer-scrim" onClick={onClose}>
      <form className="a-drawer is-form" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <header className="a-drawer-h"><div><h2>{item ? (rtl ? "تعديل" : "Edit") : tx(config.createLabel ?? { ar: "إضافة", en: "Add" })}</h2><small className="a-muted">{rtl ? "الحقول المعلَّمة بـ * مطلوبة. العربية والإنجليزية منفصلتان: كل لغة لها نصّها وملفاتها." : "Fields marked * are required. Arabic and English are separate: each has its own text and files."}</small></div>
          <button type="button" className="a-icon" onClick={onClose} aria-label={rtl ? "إغلاق" : "Close"}><X /></button></header>
        <div className="a-drawer-b a-form">
          {config.fields.map((f) => <FieldInput key={f.key} f={f} value={v[f.key]} item={v} onChange={(val) => set(f.key, val)} />)}
          {err && <p className="a-err" role="alert">{err}</p>}
        </div>
        <div className="a-drawer-f"><button type="button" className="a-btn" onClick={onClose}>{rtl ? "إلغاء" : "Cancel"}</button><button type="submit" className="a-btn is-primary">{rtl ? "حفظ" : "Save"}</button></div>
      </form>
    </div>
  );
}

function FieldInput({ f, value, item, onChange }: { f: Field; value: unknown; item?: Item; onChange: (v: unknown) => void }) {
  const { rtl, tx } = useAdmin();
  const [maker, setMaker] = useState(false);
  const label = <span className="a-flabel">{tx(f.label)}{f.required && <em>*</em>}{f.bi && f.required === "ar" && <small>{rtl ? "(الإنجليزية اختيارية)" : "(English optional)"}</small>}{f.hint && <small>{tx(f.hint)}</small>}</span>;
  const input = (val: string, set: (s: string) => void, dir?: "rtl" | "ltr", ph?: string) =>
    f.type === "textarea" ? <textarea dir={dir} rows={f.rows ?? 4} value={val} placeholder={ph} onChange={(e) => set(e.target.value)} />
      : <input dir={dir} type={f.type === "number" ? "number" : f.type === "date" ? "date" : f.type === "url" ? "url" : "text"} value={val} placeholder={ph} onChange={(e) => set(e.target.value)} />;

  if (f.bi) {
    const b = (isBi(value) ? value : { ar: "", en: "" }) as Bi;
    return <div className="a-fgroup">{label}<div className="a-bi">
      <label><small>العربية</small>{input(b.ar, (s) => onChange({ ...b, ar: s }), "rtl", f.placeholder)}</label>
      <label><small>English</small>{input(b.en, (s) => onChange({ ...b, en: s }), "ltr")}</label>
    </div></div>;
  }
  if (f.type === "select") return <label className="a-fgroup">{label}<select className="a-select" value={String(value ?? "")} onChange={(e) => onChange(e.target.value)}>{f.options?.map((o) => <option key={o.value} value={o.value}>{tx(o.label)}</option>)}</select></label>;
  if (f.type === "member") return <label className="a-fgroup">{label}<select className="a-select" value={String(value ?? "")} onChange={(e) => onChange(e.target.value)}><option value="">—</option>{USERS.map((u) => <option key={u.id} value={u.id}>{tx(u.name)}</option>)}</select></label>;
  if (f.type === "members") {
    const arr = (value as string[]) ?? [];
    return <div className="a-fgroup">{label}<div className="a-pick">{USERS.map((u) => <label key={u.id} className={arr.includes(u.id) ? "is-on" : ""}><input type="checkbox" checked={arr.includes(u.id)} onChange={(e) => onChange(e.target.checked ? [...arr, u.id] : arr.filter((x) => x !== u.id))} /><Avatar u={u} size={22} />{tx(u.name)}</label>)}</div></div>;
  }
  if (f.type === "toggle") return <label className="a-check">{<input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />}<span>{tx(f.label)}{f.hint && <small>{tx(f.hint)}</small>}</span></label>;
  if (f.type === "tags") return <label className="a-fgroup">{label}<input value={((value as string[]) ?? []).join("، ")} placeholder={rtl ? "افصل بفاصلة" : "Separate with commas"} onChange={(e) => onChange(e.target.value.split(/[،,]/).map((s) => s.trim()).filter(Boolean))} /></label>;
  if (f.type === "image" || f.type === "images") {
    const multi = f.type === "images";
    const arr = multi ? ((value as string[]) ?? []) : value ? [String(value)] : [];
    const add = async (files: FileList | null) => {
      if (!files?.length) return;
      const urls = await Promise.all([...files].slice(0, multi ? 8 : 1).map((file) => readImage(file).catch(() => "")));
      const ok = urls.filter(Boolean);
      onChange(multi ? [...arr, ...ok] : ok[0] ?? "");
    };
    return <div className="a-fgroup">{label}
      <div className="a-images">
        {arr.map((src, i) => <span key={i}><img src={src} alt="" /><button type="button" onClick={() => onChange(multi ? arr.filter((_, k) => k !== i) : "")} aria-label={rtl ? "إزالة" : "Remove"}><X /></button></span>)}
        <label className="a-images-add"><ImagePlus aria-hidden="true" /><span>{multi ? (rtl ? "أضف صورًا" : "Add images") : (rtl ? "اختر صورة" : "Choose image")}</span><input type="file" accept="image/*" multiple={multi} onChange={(e) => { void add(e.target.files); e.target.value = ""; }} /></label>
        {f.coverMaker && <button type="button" className="a-images-add is-maker" onClick={() => setMaker(true)}><Palette aria-hidden="true" /><span>{rtl ? "صمّم غلافًا" : "Design a cover"}</span></button>}
      </div>
      {maker && <CoverMaker initial={{ type: String(item?.kind ?? ""), title: biText(item?.title, "ar"), series: "ويبال" }} onClose={() => setMaker(false)} onSave={(url) => { onChange(url); setMaker(false); toast(rtl ? "حُفظ الغلاف في المادة" : "Cover saved to the item"); }} />}
      {!multi && <input type="url" dir="ltr" placeholder={rtl ? "أو الصق رابط صورة" : "Or paste an image link"} value={arr[0]?.startsWith("data:") ? "" : arr[0] ?? ""} onChange={(e) => onChange(e.target.value)} />}
    </div>;
  }
  return <label className="a-fgroup">{label}{input(String(value ?? ""), (s) => onChange(f.type === "number" ? Number(s) : s), f.type === "url" ? "ltr" : undefined, f.placeholder)}</label>;
}
