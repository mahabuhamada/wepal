import { forwardRef } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { ExternalLink, LogOut, ShieldCheck, X } from 'lucide-react';
import Avatar from '../common/Avatar';
import BrandMark from '../PublicLayout/BrandMark';
import { useLanguage } from '../../i18n/LanguageContext';
import { useLocalizedData } from '../../data/useLocalizedData';
import { useAuth } from '../../auth/AuthContext';
import { USE_API } from '../../config';
import { adminHomeFor, canAccessAdminPath, roleLabelKey } from '../../utils/roles';
import { avatarLetter } from '../../utils/avatarLetter';
import { visibleNavGroups } from './adminNav';
import { useAdminShell } from './adminShellContext';
import useInboxUnread, { inboxBadgeText } from '../../hooks/useInboxUnread';

/**
 * الشريط الجانبي للإدارة (خطة لوحة الإدارة 4.1، النموذج المعتمد): كحلي متدرّج، والأقسام حسب المهمة، ولكل قسم لون
 * مسار في نقطة عنوانه وبلاطة عنصره النشط وخط حافته. بجانب كل عنصر فيه ما ينتظر عدّاده من GET /admin/summary
 * (والوارد من عدّاده الحيّ). في أسفله المستخدم ودوره، والأمان، والعودة للمنصة، والخروج.
 * على الجوال درج يُفتح من زر الشريط العلوي (open) ويُغلق بزر الإغلاق أو Escape أو اختيار رابط.
 */
const AdminSidebarAzraq = forwardRef(function AdminSidebarAzraq({ open = false, onClose }, ref) {
  const { t, lang } = useLanguage();
  const { currentUser } = useLocalizedData();
  const { user, logout } = useAuth();
  const { summary } = useAdminShell();
  // رسائل التواصل غير المقروءة (PR 212): تتحدّث فور تعليم رسالة في الوارد، فتسبق عدّاد الملخّص
  const inboxUnread = useInboxUnread();

  // في وضع المحاكاة تظهر كل الروابط كما في التصميم الحالي.
  const groups = visibleNavGroups((path) => !USE_API || canAccessAdminPath(user, path));
  const home = (USE_API && adminHomeFor(user)) || '/admin';

  const countFor = (key) => {
    if (!key) return 0;
    if (key === 'inbox' && typeof inboxUnread === 'number') return inboxUnread;
    return summary?.counts?.[key] ?? 0;
  };

  const identity = USE_API && user
    ? { name: user.name || user.email, avatar: avatarLetter(user.name, user.email), avatarUrl: user.avatarUrl, meta: t(roleLabelKey(user.role)) }
    : {
        name: lang === 'en' ? 'Amjad Arqan' : currentUser.fullName,
        avatar: currentUser.avatar,
        meta: t('adminShell.mockRole'),
      };

  return (
    <aside ref={ref} id="azq-admin-nav" className="azq-side" data-open={open ? 'true' : 'false'}>
      <div className="azq-side-head">
        <Link to={home} className="azq-side-brand">
          <BrandMark />
          <span>
            <b>{t('sidebar.platform')}</b>
            <small>{t('adminShell.panel')}</small>
          </span>
        </Link>
        {onClose && (
          <button type="button" className="azq-side-close" onClick={onClose} aria-label={t('azraqAdmin.closeMenu')}>
            <X aria-hidden="true" />
          </button>
        )}
      </div>

      <nav className="azq-side-nav" aria-label={t('azraqAdmin.navLabel')}>
        {groups.map((group) => (
          <div key={group.id} role="group" className="azq-side-group" data-path={group.path} aria-labelledby={`azq-nav-${group.id}`}>
            <p id={`azq-nav-${group.id}`} className="azq-side-group-label">
              <i aria-hidden="true" />
              {t(`adminShell.groups.${group.id}`)}
            </p>
            <ul>
              {group.items.map(({ to, icon: Icon, label, countKey, soft }) => {
                const count = countFor(countKey);
                return (
                  <li key={to}>
                    <NavLink to={to} end={to === '/admin'} className="azq-side-link">
                      <span className="azq-side-icon" aria-hidden="true"><Icon /></span>
                      <span className="azq-side-label">{t(`adminShell.nav.${label}`)}</span>
                      {count > 0 && (
                        <span className={`azq-side-count${soft ? ' is-soft' : ''}`}>
                          <span aria-hidden="true">{inboxBadgeText(count)}</span>
                          <span className="sr-only">{countKey === 'inbox' ? t('azraqAdmin.inbox.unreadSuffix', { count }) : t('adminShell.waiting', { count })}</span>
                        </span>
                      )}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="azq-side-foot">
        <div className="azq-side-me">
          <Avatar letter={identity.avatar} src={identity.avatarUrl} size={36} color="var(--color-accent-mint)" textColor="var(--color-inverse)" />
          <span className="azq-side-who">
            <b>{identity.name}</b>
            <small>{identity.meta}</small>
          </span>
        </div>
        <Link to="/settings?section=security" className="azq-side-foot-link">
          <ShieldCheck aria-hidden="true" />
          <span>{t('adminShell.security2fa')}</span>
        </Link>
        <Link to="/dashboard" className="azq-side-foot-link azq-side-back">
          <ExternalLink aria-hidden="true" />
          <span>{t('sidebar.backToPlatform')}</span>
        </Link>
        {USE_API && (
          <button type="button" className="azq-side-foot-link" onClick={() => logout()}>
            <LogOut aria-hidden="true" />
            <span>{t('adminShell.logout')}</span>
          </button>
        )}
      </div>
    </aside>
  );
});

export default AdminSidebarAzraq;
