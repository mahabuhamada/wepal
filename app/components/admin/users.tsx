"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { Award, Eye, FolderKanban, Lightbulb, MapPin, MessageSquare, Search, UsersRound, X } from "lucide-react";
import { ACard, Hero, useAdmin } from "./shell";
import { findSection } from "./nav";
import { REGIONS, USERS, type AdminUser, type Status } from "./data";

const STATUS: Record<Status, { ar: string; en: string; cls: string }> = {
  active: { ar: "نشط", en: "Active", cls: "is-ok" },
  new: { ar: "جديد", en: "New", cls: "is-new" },
  suspended: { ar: "موقوف", en: "Suspended", cls: "is-bad" },
};
const ROLE = { member: { ar: "عضو", en: "Member" }, moderator: { ar: "مشرف", en: "Moderator" }, admin: { ar: "مدير", en: "Admin" } };
const regionOf = (key: string) => REGIONS.find((r) => r.key === key);

export function Avatar({ u, size = 36 }: { u: AdminUser; size?: number }) {
  const { tx } = useAdmin();
  return u.avatar
    // eslint-disable-next-line @next/next/no-img-element
    ? <img className="a-uav" src={`/avatars/a${u.avatar}.webp`} alt="" width={size} height={size} style={{ width: size, height: size }} />
    : <span className="a-avatar" style={{ width: size, height: size }}>{tx(u.name).slice(0, 1)}</span>;
}

export function UsersSection() {
  const { rtl, tx, lang } = useAdmin();
  const sec = findSection("users")!;
  const [q, setQ] = useState("");
  const [region, setRegion] = useState("");
  const [area, setArea] = useState("");
  const [status, setStatus] = useState<Status | "">("");
  const [open, setOpen] = useState<AdminUser | null>(null);

  // Filters can arrive from the home page (map, KPIs): ?region=… ?area=… ?status=…
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const id = requestAnimationFrame(() => {
      setRegion(p.get("region") ?? ""); setArea(p.get("area") ?? "");
      const st = p.get("status"); if (st === "active" || st === "new" || st === "suspended") setStatus(st);
    });
    return () => cancelAnimationFrame(id);
  }, []);
  useEffect(() => { document.body.style.overflow = open ? "hidden" : ""; return () => { document.body.style.overflow = ""; }; }, [open]);

  const list = USERS.filter((u) => {
    const r = regionOf(u.region);
    if (q.trim() && !`${u.name.ar} ${u.name.en}`.toLowerCase().includes(q.trim().toLowerCase())) return false;
    if (region && u.region !== region) return false;
    if (area && r?.area !== area) return false;
    if (status && u.status !== status) return false;
    return true;
  });
  const count = (st: Status) => USERS.filter((u) => u.status === st).length;
  const date = (d: string) => new Date(d).toLocaleDateString(lang === "ar" ? "ar-u-nu-latn" : "en-GB", { day: "numeric", month: "short", year: "numeric" });
  const clear = () => { setQ(""); setRegion(""); setArea(""); setStatus(""); window.history.replaceState(null, "", "/admin/users"); };

  return (
    <>
      <Hero group={sec.group} icon={sec.icon} title={tx(sec.label)} lead={rtl ? "كل عضو وما يخصه: مساحاته ومجموعاته ومقترحاته وتفاعلاته وشاراته. افتح أي صف لترى التفاصيل." : "Every member and what's theirs: workspaces, groups, proposals, interactions and badges. Open any row for details."}
        stats={[
          { value: USERS.length, label: rtl ? "في العيّنة" : "in the sample" },
          { value: count("active"), label: rtl ? "نشط" : "active" },
          { value: count("new"), label: rtl ? "جديد" : "new" },
          { value: count("suspended"), label: rtl ? "موقوف" : "suspended" },
        ]} />

      <ACard>
        <div className="a-toolbar">
          <label className="a-field"><Search aria-hidden="true" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={rtl ? "ابحث بالاسم…" : "Search by name…"} /></label>
          <select className="a-select" value={region} onChange={(e) => { setRegion(e.target.value); setArea(""); }} aria-label={rtl ? "المحافظة" : "Governorate"}>
            <option value="">{rtl ? "كل المحافظات" : "All governorates"}</option>
            {REGIONS.map((r) => <option key={r.key} value={r.key}>{tx(r.name)}</option>)}
          </select>
          <div className="a-seg" role="group" aria-label={rtl ? "الحالة" : "Status"}>
            {(["", "active", "new", "suspended"] as const).map((st) => (
              <button key={st || "all"} type="button" aria-pressed={status === st} onClick={() => setStatus(st)}>{st ? STATUS[st][lang] : rtl ? "الكل" : "All"}</button>
            ))}
          </div>
          {(q || region || area || status) && <button type="button" className="a-btn is-sm" onClick={clear}><X aria-hidden="true" />{rtl ? "مسح الفلاتر" : "Clear filters"}</button>}
          <span className="a-muted a-toolbar-n">{list.length} {rtl ? "عضو" : "members"}</span>
        </div>
        <div className="a-table-wrap">
          <table className="a-table">
            <thead><tr>
              <th>{rtl ? "العضو" : "Member"}</th><th>{rtl ? "المحافظة" : "Governorate"}</th><th>{rtl ? "الدور" : "Role"}</th><th>{rtl ? "الحالة" : "Status"}</th>
              <th>{rtl ? "المساحات" : "Workspaces"}</th><th>{rtl ? "التفاعلات" : "Interactions"}</th><th>{rtl ? "آخر ظهور" : "Last seen"}</th><th aria-label={rtl ? "عرض" : "View"} />
            </tr></thead>
            <tbody>
              {list.map((u) => (
                <tr key={u.id} className="a-row" onClick={(e) => { if (!(e.target as HTMLElement).closest("a,button")) setOpen(u); }}>
                  <td><button type="button" className="a-row-link" onClick={() => setOpen(u)}><Avatar u={u} /><span><b>{tx(u.name)}</b><small>{rtl ? "انضم" : "Joined"} {date(u.joined)}</small></span></button></td>
                  <td>{regionOf(u.region) ? tx(regionOf(u.region)!.name) : "—"}</td>
                  <td>{ROLE[u.role][lang]}</td>
                  <td><span className={`a-pill ${STATUS[u.status].cls}`}>{STATUS[u.status][lang]}</span></td>
                  <td>{u.workspaces.length}</td>
                  <td>{u.interactions.posts + u.interactions.comments}</td>
                  <td className="a-muted">{tx(u.lastSeen)}</td>
                  <td><button type="button" className="a-icon is-sm" onClick={() => setOpen(u)} aria-label={`${rtl ? "عرض" : "View"}: ${tx(u.name)}`} title={rtl ? "عرض كل ما يخصه" : "View everything"}><Eye /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!list.length && <p className="a-empty-line">{rtl ? "لا أعضاء بهذه الفلاتر." : "No members match these filters."}</p>}
        </div>
      </ACard>

      {open && <UserPanel u={open} onClose={() => setOpen(null)} date={date} />}
    </>
  );
}

function UserPanel({ u, onClose, date }: { u: AdminUser; onClose: () => void; date: (d: string) => string }) {
  const { rtl, tx, lang } = useAdmin();
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); }; document.addEventListener("keydown", k); return () => document.removeEventListener("keydown", k); }, [onClose]);
  const r = regionOf(u.region);
  const stat = (n: number, label: string) => <div><strong>{n}</strong><span>{label}</span></div>;
  return (
    <div className="a-drawer-scrim" onClick={onClose}>
      <aside className="a-drawer" role="dialog" aria-modal="true" aria-label={tx(u.name)} onClick={(e) => e.stopPropagation()}>
        <header className="a-drawer-h">
          <Avatar u={u} size={56} />
          <div><h2>{tx(u.name)}</h2><p><MapPin aria-hidden="true" />{r ? tx(r.name) : "—"} · {ROLE[u.role][lang]} · <span className={`a-pill ${STATUS[u.status].cls}`}>{STATUS[u.status][lang]}</span></p>
            <small className="a-muted">{rtl ? "انضم" : "Joined"} {date(u.joined)} · {rtl ? "آخر ظهور" : "Last seen"} {tx(u.lastSeen)}</small></div>
          <button type="button" className="a-icon" onClick={onClose} aria-label={rtl ? "إغلاق" : "Close"}><X /></button>
        </header>
        <div className="a-drawer-b">
          <section>
            <h3><MessageSquare aria-hidden="true" />{rtl ? "التفاعلات" : "Interactions"}<small>{rtl ? "إجمالي المنصة" : "Platform total"}</small></h3>
            <div className="a-mini-stats">
              {stat(u.interactions.posts, rtl ? "منشور" : "posts")}{stat(u.interactions.comments, rtl ? "تعليق" : "comments")}
              {stat(u.interactions.reactions, rtl ? "تفاعل" : "reactions")}{stat(u.interactions.votes, rtl ? "تصويت" : "votes")}
            </div>
          </section>
          <section>
            <h3><FolderKanban aria-hidden="true" />{rtl ? "مساحات العمل" : "Workspaces"}<small>{u.workspaces.length}</small></h3>
            {u.workspaces.length ? <ul className="a-chips">{u.workspaces.map((w) => <li key={w.en}><a href="/admin/distribution">{tx(w)}</a></li>)}</ul> : <p className="a-muted">{rtl ? "لا مساحات بعد." : "No workspaces yet."}</p>}
          </section>
          <section>
            <h3><UsersRound aria-hidden="true" />{rtl ? "المجموعات" : "Groups"}<small>{u.groups.length}</small></h3>
            {u.groups.length ? <ul className="a-chips">{u.groups.map((g) => <li key={g.en}><a href="/admin/groups">{tx(g)}</a></li>)}</ul> : <p className="a-muted">{rtl ? "لا مجموعات بعد." : "No groups yet."}</p>}
          </section>
          <section>
            <h3><Lightbulb aria-hidden="true" />{rtl ? "المقترحات" : "Proposals"}<small>{u.proposals.length}</small></h3>
            {u.proposals.length ? <ul className="a-lines">{u.proposals.map((p) => <li key={p.title.en}><a href="/admin/proposals">{tx(p.title)}</a><span className="a-tag">{tx(p.status)}</span></li>)}</ul> : <p className="a-muted">{rtl ? "لم يقدّم مقترحات." : "No proposals."}</p>}
          </section>
          <section>
            <h3><Award aria-hidden="true" />{rtl ? "الشارات" : "Badges"}<small>{u.badges.length}</small></h3>
            {u.badges.length ? <ul className="a-badges">{u.badges.map((b, i) => <li key={b.en} style={{ "--gc": ["#e9a521", "var(--b500)", "#2bb39a", "#6a5bd6"][i % 4] } as CSSProperties}><Award aria-hidden="true" />{tx(b)}</li>)}</ul> : <p className="a-muted">{rtl ? "لا شارات بعد." : "No badges yet."}</p>}
          </section>
        </div>
        <div className="a-drawer-f">
          <a className="a-btn" href={`/members/${u.id}`} target="_blank" rel="noopener">{rtl ? "ملفه في المنصة" : "Profile on the platform"}</a>
          <a className="a-btn is-primary" href={`/admin/reports`}>{rtl ? "بلاغاته" : "Their reports"}</a>
        </div>
      </aside>
    </div>
  );
}
