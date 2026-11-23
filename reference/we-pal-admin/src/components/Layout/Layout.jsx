import { Outlet, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import AdminShellAzraq from './AdminShellAzraq';
import { AdminNoticeProvider, AdminNoticeRegion } from '../Admin/AdminNotice';
import ErrorState from '../common/ErrorState';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../auth/AuthContext';
import { useTheme } from '../../theme/ThemeContext';
import { USE_API } from '../../config';
import LoginRedirect from '../common/LoginRedirect';

export default function Layout() {
  const { dir, t } = useLanguage();
  const { user, loading, phoneRequired, bootError, retryBootstrap } = useAuth();
  const { theme } = useTheme();

  // حارس القسم الخاص: يعمل فقط عند تفعيل الـ API.
  if (USE_API) {
    if (loading) {
      return (
        <div className="flex min-h-screen items-center justify-center text-sm text-[var(--wp-text-muted)]" dir={dir}>
          {t('common.loading')}
        </div>
      );
    }
    if (!user) {
      // فشل عابر (شبكة/5xx) والتوكن باقٍ: نعرض إعادة المحاولة بدل التحويل إلى الدخول.
      if (bootError) {
        return (
          <div className="flex min-h-screen items-center justify-center p-4" dir={dir}>
            <ErrorState error={t('common.sessionUnavailable')} onRetry={retryBootstrap} className="w-full max-w-md" />
          </div>
        );
      }
      // إلى الدخول مع الصفحة المطلوبة (‎?next=‎)، فيعود إليها بعد الدخول.
      return <LoginRedirect />;
    }
    // الخادم طلب توثيق الجوال — صفحة التحقق في قشرة الأعضاء.
    if (phoneRequired) {
      return <Navigate to="/verify-phone" replace />;
    }
  }

  // السمة «أزرق هادئ»: قشرة الإدارة الجديدة (شريط كحلي بأقسام ودرج على الجوال). التصميم الحالي أدناه بلا تغيير.
  if (theme === 'azraq') {
    return (
      <AdminNoticeProvider>
        <AdminShellAzraq />
      </AdminNoticeProvider>
    );
  }

  return (
    <AdminNoticeProvider>
      <div className="flex min-h-screen" dir={dir}>
        <Sidebar />
        <main className="flex-1 min-w-0">
          <Outlet />
          <AdminNoticeRegion />
        </main>
      </div>
    </AdminNoticeProvider>
  );
}
