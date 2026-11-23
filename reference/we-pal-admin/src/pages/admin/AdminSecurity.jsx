import { Navigate } from 'react-router-dom';

/**
 * «الأمان» المؤقتة انتقلت إلى «الإعدادات ← الأمان» في المرحلة 4 (خطة لوحة الإدارة 4.7).
 * الرابط القديم يبقى صالحًا ويفتح القسم نفسه.
 */
export default function AdminSecurity() {
  return <Navigate to="/admin/settings#security" replace />;
}
