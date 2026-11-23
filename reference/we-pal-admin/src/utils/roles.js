// أدوار المنصة وصلاحيات الواجهة. المصدر الحقيقي للصلاحيات هو الباك اند (config/permissions.php و docs/ROLES.md)،
// والصلاحيات تصل في /me (user.permissions). هذا الملف يقرر فقط ماذا يُعرض، حتى لا يرى المستخدم روابط سترجع 403.
export const ROLES = ['MEMBER', 'MODERATOR', 'FACILITATOR', 'EDITOR', 'ADMIN', 'SUPER_ADMIN'];

const ADMIN_LEVEL = ['ADMIN', 'SUPER_ADMIN'];

export const isStaff = (user) => Boolean(user?.role) && user.role !== 'MEMBER';
export const isAdmin = (user) => ADMIN_LEVEL.includes(user?.role);

// مستخدم بلا permissions (بيانات المحاكاة، أو جلسة سابقة للتحديث قبل أول /me): المدير والمدير العام كل شيء،
// والمشرف طابور البلاغات — كما كان قبل تقسيم الأدوار. الخادم يرفض ما ليس له على أي حال.
function legacyAllows(user, permission) {
  if (isAdmin(user)) return true;
  return user?.role === 'MODERATOR' && permission === 'reports.moderate';
}

export function hasPermission(user, permission) {
  if (!user) return false;
  if (!Array.isArray(user.permissions)) return legacyAllows(user, permission);
  return user.permissions.includes(permission);
}

export const canModerate = (user) => hasPermission(user, 'reports.moderate');

// الأدوار التي يستطيع تعيينها (من /me): المدير ما تحت «مدير»، والمدير العام الكل.
export function assignableRoles(user) {
  if (Array.isArray(user?.assignableRoles)) return user.assignableRoles;
  if (user?.role === 'SUPER_ADMIN') return ROLES;
  if (user?.role === 'ADMIN') return ROLES.filter((r) => !ADMIN_LEVEL.includes(r));
  return [];
}

// «أي صلاحية في اللوحة»: رئيسية الإدارة لكل الطاقم الذي يدخلها (خطة لوحة الإدارة 4.1)، وما تعرضه يتبع صلاحياته.
// الميسّر خارجها (القرار 9)، فـ groups.facilitate ليست منها. تطابق مسار GET /admin/summary في الخادم.
export const PANEL = 'panel';
export const PANEL_PERMISSIONS = [
  'reports.moderate', 'content.manage', 'stats.view', 'users.view', 'invitations.manage', 'proposals.review',
  'publish.manage', 'engagement.manage', 'inbox.view', 'audit.view',
];
export const canEnterPanel = (user) => PANEL_PERMISSIONS.some((p) => hasPermission(user, p));

// صلاحية كل صفحة في لوحة الإدارة، بترتيب الأولوية لـ adminHomeFor (أول صفحة متاحة هي الرئيسية).
export const ADMIN_PATH_PERMISSIONS = {
  '/admin': PANEL,
  '/admin/reports': 'reports.moderate',
  '/admin/hidden': 'reports.moderate',
  '/admin/discussions': 'discussions.read',
  '/admin/library': 'content.manage',
  '/admin/posts': 'content.manage',
  '/admin/news': 'content.manage',
  '/admin/analyses': 'content.manage',
  '/admin/stories': 'content.manage',
  '/admin/faq': 'content.manage',
  '/admin/assistant': 'content.manage',
  '/admin/search-queries': 'content.manage',
  '/admin/analytics': 'stats.view',
  '/admin/activities': 'stats.view',
  '/admin/users': 'users.view',
  '/admin/roles': 'users.view',
  '/admin/audit': 'audit.view',
  '/admin/groups': 'groups.manage',
  '/admin/distribution': 'workspaces.manage',
  '/admin/settings': 'settings.appearance',
  '/admin/invitations': 'invitations.manage',
  '/admin/proposals': 'proposals.review',
  '/admin/publish': 'publish.manage',
  '/admin/surveys': 'engagement.manage',
  '/admin/consultations': 'engagement.manage',
  '/admin/outcomes': 'engagement.manage',
  '/admin/inbox': 'inbox.view',
  '/admin/appearance': 'settings.appearance',
  '/admin/security': 'system.maintenance',
};

const normalize = (path) => (path.length > 1 ? path.replace(/\/+$/, '') : path);

// الصفحة نفسها أو صفحة فرعية منها (/admin/library/123 ← /admin/library). صفحة غير معروفة: للمدير فقط.
function permissionFor(path) {
  const p = normalize(path);
  if (ADMIN_PATH_PERMISSIONS[p]) return ADMIN_PATH_PERMISSIONS[p];
  const parent = Object.keys(ADMIN_PATH_PERMISSIONS).find((key) => key !== '/admin' && p.startsWith(`${key}/`));
  return parent ? ADMIN_PATH_PERMISSIONS[parent] : null;
}

export function canAccessAdminPath(user, path) {
  const permission = permissionFor(path);
  if (permission === PANEL) return canEnterPanel(user);
  // صفحة جديدة لم تُضف للجدول: للمدير والمدير العام (users.manage) حتى تُعطى صلاحيتها
  return hasPermission(user, permission ?? 'users.manage');
}

// الصفحة الأولى في لوحة الإدارة لكل مستخدم (null = لا وصول، مثل العضو والميسّر).
// skipHome: أول صفحة غير الرئيسية (التصميم الحالي لمن لا يملك الإحصاءات).
export function adminHomeFor(user, { skipHome = false } = {}) {
  return Object.keys(ADMIN_PATH_PERMISSIONS)
    .filter((path) => !(skipHome && path === '/admin'))
    .find((path) => canAccessAdminPath(user, path)) ?? null;
}

// مفتاح ترجمة اسم الدور.
export function roleLabelKey(role) {
  return {
    SUPER_ADMIN: 'adminApi.superAdminRole',
    ADMIN: 'adminApi.adminRole',
    EDITOR: 'adminApi.editorRole',
    FACILITATOR: 'adminApi.facilitatorRole',
    MODERATOR: 'adminApi.moderatorRole',
  }[role] ?? 'adminApi.memberRole';
}
