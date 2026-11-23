import { BarChart3, Newspaper, LayoutDashboard, Users, Flag, EyeOff, BookOpen, FileText, Sparkles, Send, ClipboardList, MessagesSquare, Inbox, Palette, HelpCircle, SearchX, Workflow, Lightbulb, ClipboardCheck, Ticket, History, MessageCircle, KeyRound, Settings, ScrollText, UsersRound, FolderInput } from 'lucide-react';

/**
 * أقسام لوحة الإدارة حسب المهمة لا حسب نوع البيانات (خطة لوحة الإدارة 4.1، القراران 3 و11).
 * لكل قسم لون من ألوان المسارات (path: home | work | com | vote | lib | none) يظهر في نقطة عنوانه
 * وبلاطة عنصره النشط وخط حافته. countKey: مفتاح العدّاد في GET /admin/summary (counts)؛ soft عدّاد هادئ.
 * الصلاحيات لا تتغير: كل رابط يمرّ على canAccessAdminPath قبل عرضه، والقسم الفارغ لا يظهر.
 * «الإحصاءات» صارت قسمًا في الرئيسية (قرار أمجد أ، 12 نوفمبر)، فلا رابط لها هنا.
 */
export const ADMIN_NAV_GROUPS = [
  {
    id: 'today',
    path: 'work',
    items: [
      { to: '/admin', icon: LayoutDashboard, label: 'home' },
      // «التحليلات»: الزيارات والخريطة والأكثر قراءة وتفاعلًا (طلب أمجد 13 نوفمبر)
      { to: '/admin/analytics', icon: BarChart3, label: 'analytics' },
    ],
  },
  {
    id: 'moderation',
    path: 'home',
    items: [
      { to: '/admin/reports', icon: Flag, label: 'reports', countKey: 'reports' },
      { to: '/admin/hidden', icon: EyeOff, label: 'hidden', countKey: 'hidden', soft: true },
      // قرار أمجد 12 نوفمبر 2026: المدير يقرأ نقاشات المساحات والمجموعات، وكل فتح لمساحة يُسجَّل
      { to: '/admin/discussions', icon: MessageCircle, label: 'discussions' },
    ],
  },
  {
    id: 'work',
    path: 'work',
    items: [
      { to: '/admin/proposals', icon: Lightbulb, label: 'proposals', countKey: 'proposals' },
      { to: '/admin/publish', icon: Send, label: 'publish', countKey: 'publish' },
    ],
  },
  {
    id: 'dialogue',
    path: 'com',
    items: [
      { to: '/admin/groups', icon: UsersRound, label: 'groups' },
      { to: '/admin/surveys', icon: ClipboardList, label: 'surveys' },
      // «المشاورات» (القرار 11). يبقى كما في الخطة حتى يقرّر أمجد مصير القسم
      { to: '/admin/consultations', icon: MessagesSquare, label: 'consultations' },
      { to: '/admin/outcomes', icon: ClipboardCheck, label: 'outcomes', countKey: 'outcomes' },
    ],
  },
  {
    id: 'content',
    path: 'lib',
    items: [
      { to: '/admin/news', icon: Newspaper, label: 'news' },
      { to: '/admin/analyses', icon: FileText, label: 'analyses' },
      { to: '/admin/stories', icon: Sparkles, label: 'stories' },
      { to: '/admin/library', icon: BookOpen, label: 'library' },
      { to: '/admin/faq', icon: HelpCircle, label: 'faq' },
      { to: '/admin/assistant', icon: Workflow, label: 'assistant' },
      { to: '/admin/search-queries', icon: SearchX, label: 'searchQueries' },
    ],
  },
  {
    id: 'members',
    path: 'vote',
    items: [
      { to: '/admin/users', icon: Users, label: 'users' },
      // القرار 3 (16 نوفمبر 2026): الإدارة توزّع الأعضاء على مساحات العمل
      { to: '/admin/distribution', icon: FolderInput, label: 'distribution' },
      { to: '/admin/invitations', icon: Ticket, label: 'invitations', countKey: 'invitations', soft: true },
      { to: '/admin/roles', icon: KeyRound, label: 'roles' },
    ],
  },
  {
    id: 'platform',
    path: 'none',
    items: [
      { to: '/admin/inbox', icon: Inbox, label: 'inbox', countKey: 'inbox' },
      { to: '/admin/activities', icon: History, label: 'activities' },
      { to: '/admin/audit', icon: ScrollText, label: 'audit' },
      { to: '/admin/appearance', icon: Palette, label: 'appearance' },
      // المرحلة 4: الصيانة والحذف الطارئ وإشعارات الطاقم في «الإعدادات» (كانت الصيانة في «الأمان» المؤقتة)
      { to: '/admin/settings', icon: Settings, label: 'settings' },
    ],
  },
];

// الأقسام بالروابط المسموحة فقط؛ القسم الفارغ لا يظهر (المشرف يرى «اليوم» و«الإشراف»).
export function visibleNavGroups(canAccess) {
  return ADMIN_NAV_GROUPS
    .map((group) => ({ ...group, items: group.items.filter((item) => canAccess(item.to)) }))
    .filter((group) => group.items.length > 0);
}

const normalize = (pathname) => (pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname);

// القسم والعنصر للصفحة الحالية (لمسار التنقّل). الصفحة الفرعية (/admin/invitations/123) تتبع أصلها.
export function navEntryFor(pathname) {
  const path = normalize(pathname);
  for (const group of ADMIN_NAV_GROUPS) {
    const item = group.items.find((it) => it.to === path)
      ?? group.items.find((it) => it.to !== '/admin' && path.startsWith(`${it.to}/`));
    if (item) return { group, item, nested: item.to !== path };
  }
  return null;
}

export function navGroupFor(pathname) {
  return navEntryFor(pathname)?.group ?? null;
}

// لون كل صف من لون قسمه في الشريط الجانبي
export const ROW_PATH = {
  reports: 'home',
  proposals: 'work',
  publish: 'work',
  outcomes: 'com',
  translations: 'lib',
  inbox: 'none',
  courses: 'com',
  invitations: 'vote',
  twoFactor: 'vote',
};
