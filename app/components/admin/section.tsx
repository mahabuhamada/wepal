"use client";

import { useParams } from "next/navigation";
import { Construction, FileCode2 } from "lucide-react";
import { ACard, AdminShell, Hero, useAdmin } from "./shell";
import { findSection } from "./nav";
import { UsersSection } from "./users";
import { ReportsSection } from "./reports";
import { useEffect } from "react";
import { CollectionSection, CONFIGS } from "./sections";
import { CustomSection, CUSTOM_KEYS } from "./custom";

export default function AdminSectionPage() {
  const params = useParams<{ section: string }>();
  const key = params?.section ?? "";
  return <AdminShell active={key}><Section sectionKey={key} /></AdminShell>;
}

function Section({ sectionKey }: { sectionKey: string }) {
  const { rtl, tx } = useAdmin();
  const sec = findSection(sectionKey);
  // Analytics now lives on the admin home (one place for the overview).
  useEffect(() => {
    if (sectionKey === "analytics") window.location.replace(`${window.location.origin}/admin`);
    if (sectionKey === "analyses" || sectionKey === "posts") window.location.replace(`${window.location.origin}/admin/library`);
  }, [sectionKey]);
  if (sectionKey === "users") return <UsersSection />;
  if (sectionKey === "reports") return <ReportsSection />;
  if (CONFIGS[sectionKey]) return <CollectionSection k={sectionKey} />;
  if (CUSTOM_KEYS.has(sectionKey)) return <CustomSection k={sectionKey} />;
  if (!sec) {
    return <ACard title={rtl ? "القسم غير موجود" : "Section not found"}><p className="a-muted">{rtl ? "اختر قسمًا من القائمة." : "Pick a section from the menu."}</p></ACard>;
  }
  return (
    <>
      <Hero group={sec.group} icon={sec.icon} title={tx(sec.label)} lead={tx(sec.lead)}
        stats={sec.count ? [{ value: sec.count, label: rtl ? "بانتظارك" : "waiting" }] : undefined} />
      <ACard>
        <div className="a-empty">
          <span className="a-empty-ic" style={{ ["--gc" as string]: sec.group.color }}><Construction aria-hidden="true" /></span>
          <h3>{rtl ? "قيد النقل إلى التصميم الجديد" : "Being moved to the new design"}</h3>
          <p>{rtl ? "هذه الصفحة موجودة في لوحة we-pal، وننقلها صفحة صفحة إلى هذا التصميم." : "This page exists in the we-pal admin; we're moving it here page by page."}</p>
          <small><FileCode2 aria-hidden="true" />reference/we-pal-admin</small>
        </div>
      </ACard>
    </>
  );
}
