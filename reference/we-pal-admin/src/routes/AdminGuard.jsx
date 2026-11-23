import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import { USE_API } from '../config';
import { adminHomeFor, canAccessAdminPath } from '../utils/roles';
import { privateAreaMeta } from '../seo';

// كل صفحات الإدارة: عنوان عام و noindex في HTML الخادم، ما لم تصدّر الصفحة meta خاصة بها.
export const meta = (args) => privateAreaMeta(args, { ar: 'لوحة الإدارة', en: 'Admin' });

/**
 * حارس مسارات الإدارة — يعمل فقط عند تفعيل الـ API.
 * كل صفحة تحتاج صلاحية (utils/roles.js ← ADMIN_PATH_PERMISSIONS) من user.permissions في /me:
 * المحرر صفحات المحتوى، والمشرف البلاغات، ومدير البرنامج كل شيء إلا المظهر، والمدير العام الكل.
 * ومن يطلب صفحة غير متاحة له يُحوَّل إلى صفحته الأولى أو لوحة القسم الخاص.
 *
 * ملاحظة: الحراسة عميلة لأن التوكن في localStorage ولا يصل الخادم.
 * التفويض الحقيقي يبقى على Laravel عبر `perm:<صلاحية>` في routes/api.php (docs/ROLES.md).
 */
export default function AdminGuard() {
  const { user, loading } = useAuth();
  const { pathname } = useLocation();

  if (USE_API) {
    if (loading) return null; // يتكفّل حارس Layout الأب بعرض حالة التحميل
    // المصادقة الثنائية إلزامية لكل الطاقم: الخادم يرفض طلبات الإدارة (403) حتى يفعّلها.
    if (user?.twoFactorRequired) return <Navigate to="/settings?section=security" replace />;
    if (!canAccessAdminPath(user, pathname)) {
      return <Navigate to={adminHomeFor(user) ?? '/dashboard'} replace />;
    }
  }

  return <Outlet />;
}
