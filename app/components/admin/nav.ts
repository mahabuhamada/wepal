import {
  BarChart3, BookOpen, ClipboardCheck, ClipboardList, EyeOff, FileText, Flag, FolderInput, HelpCircle, History, Inbox,
  KeyRound, LayoutDashboard, Lightbulb, MessageCircle, MessagesSquare, Newspaper, Palette, ScrollText, SearchX, Send,
  Settings, Sparkles, Ticket, Users, UsersRound, Workflow, type LucideIcon,
} from "lucide-react";
import type { T } from "../content";

const L = (ar: string, en: string): T => ({ ar, en });

export type AdminItem = { key: string; icon: LucideIcon; label: T; lead: T; count?: number; soft?: boolean };
export type AdminGroup = { id: string; label: T; color: string; items: AdminItem[] };

/** Admin sections grouped by task (same grouping as the we-pal admin), each group with its own WePal tone. */
export const ADMIN_GROUPS: AdminGroup[] = [
  {
    id: "today", label: L("اليوم", "Today"), color: "var(--b500)", items: [
      { key: "", icon: LayoutDashboard, label: L("الرئيسية", "Home"), lead: L("ما ينتظرك اليوم ومؤشرات المنصة.", "What's waiting today and the platform's indicators.") },
      { key: "analytics", icon: BarChart3, label: L("الإحصاءات", "Analytics"), lead: L("الزيارات والخريطة والأكثر قراءة وتفاعلًا.", "Visits, the map, and what's read and discussed most.") },
    ],
  },
  {
    id: "moderation", label: L("الإشراف", "Moderation"), color: "#e8707f", items: [
      { key: "reports", icon: Flag, label: L("البلاغات", "Reports"), lead: L("بلاغات الأعضاء على المنشورات والتعليقات.", "Members' reports on posts and comments."), count: 4 },
      { key: "hidden", icon: EyeOff, label: L("المحتوى المخفي", "Hidden content"), lead: L("ما أُخفي بقرار إشراف، مع إمكانية الإرجاع.", "What moderation hid, with the option to restore."), count: 2, soft: true },
      { key: "discussions", icon: MessageCircle, label: L("النقاشات", "Discussions"), lead: L("قراءة نقاشات المساحات والمجموعات، وكل فتح يُسجَّل.", "Read workspace and group discussions; every opening is logged.") },
    ],
  },
  {
    id: "work", label: L("العمل", "Work"), color: "#e9a521", items: [
      { key: "proposals", icon: Lightbulb, label: L("المقترحات والتحديات", "Proposals"), lead: L("مقترحات المساحات الجديدة والتحديات من الأعضاء.", "New workspace proposals and challenges from members."), count: 3 },
      { key: "publish", icon: Send, label: L("نشر المخرجات", "Publishing"), lead: L("مخرجات المساحات الجاهزة للمراجعة والنشر.", "Workspace outputs ready for review and publishing."), count: 2 },
    ],
  },
  {
    id: "dialogue", label: L("الحوار", "Dialogue"), color: "#2bb39a", items: [
      { key: "groups", icon: UsersRound, label: L("المجموعات", "Groups"), lead: L("مجموعات المناطق والمسارات وأعضاؤها.", "Region and track groups and their members.") },
      { key: "surveys", icon: ClipboardList, label: L("الاستطلاعات", "Surveys"), lead: L("إنشاء الاستطلاعات ومتابعة نتائجها.", "Create surveys and follow their results.") },
      { key: "consultations", icon: MessagesSquare, label: L("المشاورات", "Consultations"), lead: L("المشاورات المفتوحة والمغلقة وتقاريرها.", "Open and closed consultations and their reports.") },
      { key: "outcomes", icon: ClipboardCheck, label: L("الخلاصات", "Outcomes"), lead: L("خلاصات الحوارات والمشاورات قبل نشرها.", "Summaries of dialogues and consultations before publishing."), count: 1 },
    ],
  },
  {
    id: "content", label: L("المحتوى", "Content"), color: "#6a5bd6", items: [
      { key: "news", icon: Newspaper, label: L("الأخبار", "News"), lead: L("أخبار المنصة: كتابة ومراجعة ونشر.", "Platform news: write, review and publish.") },
      { key: "analyses", icon: FileText, label: L("التحليلات", "Analyses"), lead: L("التحليلات والمقالات المعمّقة.", "In-depth analyses and articles.") },
      { key: "stories", icon: Sparkles, label: L("القصص", "Stories"), lead: L("قصص الأعضاء والأثر.", "Member and impact stories.") },
      { key: "library", icon: BookOpen, label: L("المكتبة", "Library"), lead: L("الأدلة والملفات والمصادر.", "Guides, files and resources.") },
      { key: "faq", icon: HelpCircle, label: L("الأسئلة الشائعة", "FAQ"), lead: L("أسئلة الزوار والأعضاء وأجوبتها.", "Visitor and member questions and answers.") },
      { key: "assistant", icon: Workflow, label: L("مركز المساعد", "Assistant hub"), lead: L("ما يعرفه المساعد ومصادره وتغطيته.", "What the assistant knows, its sources and coverage.") },
      { key: "search-queries", icon: SearchX, label: L("أسئلة البحث", "Search queries"), lead: L("ما يبحث عنه الناس ولا يجدونه.", "What people search for and don't find.") },
    ],
  },
  {
    id: "members", label: L("الأعضاء", "Members"), color: "#3d96dc", items: [
      { key: "users", icon: Users, label: L("المستخدمون", "Users"), lead: L("الأعضاء وحالاتهم وأدوارهم.", "Members, their status and roles.") },
      { key: "distribution", icon: FolderInput, label: L("توزيع الأعضاء", "Distribution"), lead: L("توزيع الأعضاء على مساحات العمل.", "Assign members to workspaces.") },
      { key: "invitations", icon: Ticket, label: L("الدعوات", "Invitations"), lead: L("دفعات الدعوات الفردية والجماعية وطباعتها.", "Individual and batch invitations, and printing."), count: 12, soft: true },
      { key: "roles", icon: KeyRound, label: L("الأدوار", "Roles"), lead: L("الأدوار والصلاحيات.", "Roles and permissions.") },
    ],
  },
  {
    id: "platform", label: L("المنصة", "Platform"), color: "#7d88a3", items: [
      { key: "inbox", icon: Inbox, label: L("الوارد", "Inbox"), lead: L("رسائل التواصل والاشتراكات.", "Contact messages and subscriptions."), count: 5 },
      { key: "activities", icon: History, label: L("النشاطات", "Activities"), lead: L("ما فعله الطاقم على المنصة.", "What the team did on the platform.") },
      { key: "audit", icon: ScrollText, label: L("سجل التدقيق", "Audit log"), lead: L("كل إجراء حساس بتاريخه وصاحبه.", "Every sensitive action, with its date and author.") },
      { key: "appearance", icon: Palette, label: L("المظهر", "Appearance"), lead: L("الألوان والصور والواجهة العامة.", "Colours, images and the public look.") },
      { key: "settings", icon: Settings, label: L("الإعدادات", "Settings"), lead: L("الصيانة والإشعارات وإعدادات المنصة.", "Maintenance, notifications and platform settings.") },
    ],
  },
];

export const ADMIN_ITEMS = ADMIN_GROUPS.flatMap((g) => g.items.map((it) => ({ ...it, group: g })));
export const adminHref = (key: string) => (key ? `/admin/${key}` : "/admin");
export const findSection = (key: string) => ADMIN_ITEMS.find((it) => it.key === key) ?? null;
