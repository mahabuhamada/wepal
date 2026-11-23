import { Link, NavLink } from 'react-router-dom';
import { ArrowRight, Newspaper, Users, BarChart3, Settings, BookOpen, Send, Activity, Shield, FileText, Sparkles, Inbox, MessagesSquare, Palette, HelpCircle, SearchX, Workflow, Lightbulb, ClipboardCheck, Ticket } from 'lucide-react';
import Avatar from '../common/Avatar';
import { useLanguage } from '../../i18n/LanguageContext';
import { useLocalizedData } from '../../data/useLocalizedData';
import { useAuth } from '../../auth/AuthContext';
import { USE_API } from '../../config';
import { adminHomeFor, canAccessAdminPath, hasPermission, roleLabelKey } from '../../utils/roles';
import { avatarLetter } from '../../utils/avatarLetter';
import { brandTagline } from '../../i18n/brand';
import useInboxUnread, { inboxBadgeText } from '../../hooks/useInboxUnread';

function NavItem({ to, icon: Icon, label, badge, badgeLabel, small }) {
  return (
    <NavLink
      to={to}
      end={to === '/admin'}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-xl transition-colors ${small ? 'px-4 py-1.5 text-label' : 'px-4 py-2.5 text-body-sm'} font-semibold ${
          isActive
            ? 'bg-[var(--wp-ink)] text-white'
            : 'text-[var(--wp-text-2)] hover:bg-[#F6F6F6] hover:text-[var(--wp-ink)]'
        }`
      }
    >
      <Icon size={small ? 14 : 18} />
      <span className="flex-1">{label}</span>
      {badge > 0 && (
        <span className="bg-[var(--wp-coral)] text-white text-caption font-bold min-w-5 h-5 px-1 rounded-full flex items-center justify-center">
          <span aria-hidden={badgeLabel ? 'true' : undefined}>{inboxBadgeText(badge)}</span>
          {badgeLabel && <span className="sr-only">{badgeLabel}</span>}
        </span>
      )}
    </NavLink>
  );
}

function SectionLabel({ children, className = '' }) {
  return (
    <div className={`text-caption font-bold uppercase tracking-[0.08em] text-[var(--wp-text-muted)] px-4 py-2 ${className}`}>
      {children}
    </div>
  );
}

// شِل الإدارة فقط: القائمة الجانبية صارت مخصّصة لمسارات الإدارة، وأعلاها رابط العودة للمنصة.
export default function Sidebar() {
  const { t, lang } = useLanguage();
  const { currentUser } = useLocalizedData();
  const { user } = useAuth();
  // رسائل التواصل غير المقروءة (PR 212)؛ null مع خادم أقدم أو لغير المدير فلا شارة.
  const inboxUnread = useInboxUnread();

  const adminNav = [
    { to: '/admin', icon: Settings, label: t('sidebar.adminPanel') },
    { to: '/admin/users', icon: Users, label: t('sidebar.users') },
    { to: '/admin/invitations', icon: Ticket, label: t('inviteBatches.nav') },
    { to: '/admin/reports', icon: Shield, label: t('sidebar.reports') },
    { to: '/admin/library', icon: BookOpen, label: t('sidebar.library') },
    // «مركز المساعد»: بعد المكتبة كما في «أزرق هادئ» (إصلاح وصول: الصفحة لا رابط لها في الشريط الحالي غير هذا)
    { to: '/admin/assistant', icon: Workflow, label: t('assistantHub.title') },
    { to: '/admin/news', icon: Newspaper, label: t('adminPosts.newsTitle') },
    { to: '/admin/analyses', icon: FileText, label: t('adminPosts.analysesTitle') },
    { to: '/admin/stories', icon: Sparkles, label: t('adminStories.title') },
    { to: '/admin/faq', icon: HelpCircle, label: t('adminFaq.title') },
    // «أسئلة لم تجد نتيجة» (سجل البحث بلا هوية): بجانب الأسئلة الشائعة، فما لم يجد جوابًا يصير سؤالًا شائعًا
    { to: '/admin/search-queries', icon: SearchX, label: t('azraqAdmin.searchQueries.title') },
    { to: '/admin/proposals', icon: Lightbulb, label: t('workspaceProposals.admin.title') },
    { to: '/admin/publish', icon: Send, label: t('sidebar.publishing') },
    { to: '/admin/surveys', icon: BarChart3, label: t('sidebar.surveys') },
    { to: '/admin/consultations', icon: MessagesSquare, label: t('adminConsultations.title') },
    // «ينتظر خلاصة» (الحزمة 6أ): إصلاح وصول، فالصفحة لا رابط لها في الشريط الحالي غير هذا (كمركز المساعد)
    { to: '/admin/outcomes', icon: ClipboardCheck, label: t('outcome6a.admin.nav') },
    { to: '/admin/activities', icon: Activity, label: t('sidebar.activities') },
    { to: '/admin/analytics', icon: BarChart3, label: t('sidebar.analytics') },
    { to: '/admin/inbox', icon: Inbox, label: t('adminInbox.title'), badge: inboxUnread, badgeLabel: inboxUnread ? t('azraqAdmin.inbox.unreadSuffix', { count: inboxUnread }) : undefined },
    { to: '/admin/appearance', icon: Palette, label: t('sidebar.appearance') },
  ];
  // المشرف يرى طابور البلاغات فقط؛ في وضع المحاكاة تظهر كل الروابط كما كانت.
  // التصميم الحالي كما كان: رئيسيته إحصاءات، فلا تظهر لمن لا يملكها (الرئيسية الجديدة للطاقم كله في «أزرق هادئ»)
  const classicAccess = (path) => canAccessAdminPath(user, path) && (path !== '/admin' || hasPermission(user, 'stats.view'));
  const visibleNav = USE_API ? adminNav.filter((item) => classicAccess(item.to)) : adminNav;
  const home = (USE_API && adminHomeFor(user, { skipHome: !hasPermission(user, 'stats.view') })) || '/admin';

  // وضع الـ API: هوية المستخدم الحقيقي ودوره (كان الاسم ثابتًا من بيانات المحاكاة).
  // النقاط تنتظر B8، فلا تُعرض إلا في المحاكاة.
  const identity = USE_API && user
    ? { name: user.name || user.email, avatar: avatarLetter(user.name, user.email), avatarUrl: user.avatarUrl, meta: t(roleLabelKey(user.role)) }
    : {
        name: lang === 'en' ? 'Amjad Arqan' : currentUser.fullName,
        avatar: currentUser.avatar,
        meta: `${currentUser.points} ${t('common.points')} · ${lang === 'en' ? 'Initiator' : currentUser.level}`,
      };

  return (
    <aside className="w-[260px] bg-white border-e border-[var(--wp-border)] h-screen sticky top-0 flex flex-col shrink-0">
      <div className="p-6 border-b border-[var(--wp-border)]">
        <Link to={home} className="flex items-center gap-2.5">
          <span className="flex h-[38px] w-[38px] items-center justify-center rounded-xl bg-[var(--wp-ink)] text-title font-extrabold text-[var(--wp-coral)]">
            و
          </span>
          <span className="flex flex-col leading-tight">
            <span className="text-body font-extrabold tracking-tight text-[var(--wp-ink)]">{t('sidebar.platform')}</span>
            {brandTagline(lang) && <span className="text-caption font-medium text-[var(--wp-text-muted)]">{brandTagline(lang)}</span>}
          </span>
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        <NavLink
          to="/dashboard"
          className="flex items-center gap-3 rounded-xl px-4 py-2.5 text-body-sm font-semibold text-[var(--wp-text-2)] transition-colors hover:bg-[#F6F6F6] hover:text-[var(--wp-ink)]"
        >
          <ArrowRight size={18} className="rtl:rotate-180" />
          <span className="flex-1">{t('sidebar.backToPlatform')}</span>
        </NavLink>

        <SectionLabel className="mt-4">{t('sidebar.admin')}</SectionLabel>
        {visibleNav.map((item) => (
          <NavItem key={item.to} {...item} small={item.to !== '/admin'} />
        ))}
      </nav>

      <div className="p-4 border-t border-[var(--wp-border)]">
        <div className="flex items-center gap-3 px-3 py-2">
          <Avatar letter={identity.avatar} src={identity.avatarUrl} size={38} />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-[var(--wp-ink)] truncate">{identity.name}</div>
            <div className="text-xs text-[var(--wp-text-muted)]">{identity.meta}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
