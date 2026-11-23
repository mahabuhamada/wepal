import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Bell, Languages, Menu, Search } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAdminShell } from './adminShellContext';
import { navEntryFor, ROW_PATH } from './adminNav';

/**
 * الشريط العلوي لصفحات الإدارة (خطة لوحة الإدارة 4.1): زجاجي، فيه مسار التنقّل («القسم › الصفحة»)،
 * ثم «ابحث أو انتقل…» مع Ctrl K، ثم اللغة والجرس. لا عنوان ظاهرًا فيه: العنوان واحد في الصفحة نفسها،
 * ويبقى هنا h1 للقارئ الآلي فقط.
 * الجرس قائمة منسدلة بما ينتظر هذا الدور (صفوف «يحتاج إلى انتباهك» من GET /admin/summary)، لا صفحة إشعارات الأعضاء.
 */
export default function AdminTopBarAzraq({ title }) {
  const { t, toggleLang } = useLanguage();
  const { pathname } = useLocation();
  const { menuOpen, openMenu, menuButtonRef, openPalette, summary } = useAdminShell();
  const entry = navEntryFor(pathname);

  return (
    <header className="azq-topbar">
      {openMenu && (
        <button
          ref={menuButtonRef}
          type="button"
          className="azq-topbar-menu"
          onClick={openMenu}
          aria-controls="azq-admin-nav"
          aria-expanded={menuOpen}
          aria-label={t('azraqAdmin.openMenu')}
        >
          <Menu aria-hidden="true" />
        </button>
      )}
      <h1 className="sr-only">{title}</h1>
      <nav className="azq-crumbs" aria-label={t('adminShell.breadcrumb')}>
        <ol>
          {entry && entry.group.id !== 'today' && <li><span>{t(`adminShell.groups.${entry.group.id}`)}</span></li>}
          {entry?.nested && (
            <li><Link to={entry.item.to}>{t(`adminShell.nav.${entry.item.label}`)}</Link></li>
          )}
          <li aria-current="page"><span>{title}</span></li>
        </ol>
      </nav>
      <div className="azq-topbar-actions">
        {openPalette && (
          <button type="button" className="azq-searchbtn" onClick={openPalette} aria-label={t('adminShell.palette.open')} aria-keyshortcuts="Control+K Meta+K">
            <Search aria-hidden="true" />
            <span>{t('adminShell.palette.button')}</span>
            <kbd aria-hidden="true">Ctrl K</kbd>
          </button>
        )}
        <button type="button" onClick={toggleLang} className="azq-topbar-lang">
          <Languages aria-hidden="true" />
          {t('lang.toggle')}
        </button>
        <StaffBell attention={summary?.attention} />
      </div>
    </header>
  );
}

function StaffBell({ attention }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const buttonRef = useRef(null);
  const rows = attention ?? [];
  const total = rows.reduce((sum, row) => sum + (row.count ?? 0), 0);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (event) => { if (!wrapRef.current?.contains(event.target)) setOpen(false); };
    const onKey = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="azq-bellwrap" ref={wrapRef}>
      <button
        ref={buttonRef}
        type="button"
        className="azq-topbar-bell"
        aria-expanded={open}
        aria-controls="azq-bell-pop"
        aria-label={total > 0 ? t('adminShell.bell.labelCount', { count: total }) : t('adminShell.bell.label')}
        onClick={() => setOpen((v) => !v)}
      >
        <Bell aria-hidden="true" />
        {total > 0 && <span className="azq-topbar-count" aria-hidden="true">{total > 9 ? '9+' : total}</span>}
      </button>
      {open && (
        <div id="azq-bell-pop" className="azq-pop" role="region" aria-label={t('adminShell.bell.label')}>
          <header>{t('adminShell.bell.title')}</header>
          {rows.length === 0 && <p className="azq-pop-empty">{t('adminShell.home.nothing')}</p>}
          {rows.map((row) => (
            <Link key={row.key} to={row.to} className="azq-pop-item" data-path={ROW_PATH[row.key] ?? 'none'} onClick={() => setOpen(false)}>
              <span className="azq-pop-count">{row.count}</span>
              <span>{t(`adminShell.attention.${row.key}.title`, { count: row.count })}</span>
            </Link>
          ))}
          <footer>{t('adminShell.bell.footer')}</footer>
        </div>
      )}
    </div>
  );
}
