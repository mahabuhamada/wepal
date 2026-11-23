import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import AdminSidebarAzraq from './AdminSidebarAzraq';
import { AdminShellContext } from './adminShellContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { trapTab } from '../../utils/focusTrap';
import { AdminNoticeRegion } from '../Admin/AdminNotice';
import AdminCommandPalette from './AdminCommandPalette';
import useAdminSummary from '../../hooks/useAdminSummary';

// عرض الشاشة الذي يصير فيه الشريط الجانبي ثابتًا بجانب المحتوى (يطابق styles/azraq-admin.css).
const DESKTOP = '(min-width: 1024px)';

/**
 * قشرة لوحة الإدارة في السمة «أزرق هادئ»: شريط جانبي كحلي ثابت على الشاشات الواسعة، ودرج على الجوال
 * يفتحه زر الشريط العلوي. الدرج يحبس Tab ويُغلق بـ Escape (ويعيد التركيز للزر) أو بالنقر خارجه أو بالانتقال لصفحة.
 * الحراسة (التحميل، الدخول، توثيق الجوال) تبقى في Layout.jsx قبل اختيار القشرة.
 */
export default function AdminShellAzraq() {
  const { dir, t } = useLanguage();
  const { pathname } = useLocation();
  // الدرج مفتوح للصفحة التي فُتح عليها فقط: الانتقال لصفحة أخرى يغلقه دون مؤثّر.
  const [openAt, setOpenAt] = useState(null);
  const menuOpen = openAt === pathname;
  const panelRef = useRef(null);
  const menuButtonRef = useRef(null);

  const openMenu = useCallback(() => setOpenAt(pathname), [pathname]);
  const closeMenu = useCallback(() => {
    setOpenAt(null);
    menuButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const panel = panelRef.current;
    panel?.querySelector('.azq-side-close')?.focus();
    const onKey = (event) => {
      // اتّسعت الشاشة والدرج مفتوح: صار شريطًا ثابتًا، فلا حبس ولا درج.
      if (window.matchMedia?.(DESKTOP).matches) {
        setOpenAt(null);
        return;
      }
      if (event.key === 'Escape') {
        closeMenu();
        return;
      }
      trapTab(event, panel);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuOpen, closeMenu]);

  // لوحة الأوامر: Ctrl K أو ⌘K من أي صفحة، أو زرّ «ابحث أو انتقل» في الشريط العلوي (القرار 10)
  const [paletteOpen, setPaletteOpen] = useState(false);
  const openPalette = useCallback(() => setPaletteOpen(true), []);
  useEffect(() => {
    const onKey = (event) => {
      if ((event.ctrlKey || event.metaKey) && !event.altKey && (event.key === 'k' || event.key === 'K')) {
        event.preventDefault();
        setPaletteOpen(true);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const { summary, error: summaryError, reload: reloadSummary, days: summaryDays, setDays: setSummaryDays } = useAdminSummary(pathname);

  const shell = useMemo(
    () => ({ menuOpen, openMenu, closeMenu, menuButtonRef, openPalette, summary, summaryError, reloadSummary, summaryDays, setSummaryDays }),
    [menuOpen, openMenu, closeMenu, openPalette, summary, summaryError, reloadSummary, summaryDays, setSummaryDays],
  );

  return (
    <AdminShellContext.Provider value={shell}>
      <div className="azq-admin" dir={dir} data-menu-open={menuOpen ? 'true' : 'false'}>
        <a className="azq-skip" href="#azq-admin-main">{t('visitor.skip')}</a>
        <AdminSidebarAzraq ref={panelRef} open={menuOpen} onClose={closeMenu} />
        <div className="azq-scrim" hidden={!menuOpen} onClick={closeMenu} aria-hidden="true" />
        <main id="azq-admin-main" className="azq-admin-main" tabIndex={-1}>
          <Outlet />
          <AdminNoticeRegion />
        </main>
        {paletteOpen && <AdminCommandPalette onClose={() => setPaletteOpen(false)} />}
      </div>
    </AdminShellContext.Provider>
  );
}
