// المستخدمون: البحث (العقد §2.1) لإضافة عضو وتعيين مراجِع، وملف العضو العام ومشاريعه.
import { get, unwrapList } from './client';

export const USER_SEARCH_MIN = 2;
export const USER_SEARCH_MAX = 100;

// GET /users/search?q= → [{ id, name, nameHidden, avatarUrl }] (بلا بريد، أول 10، بالاسم أو بالبريد الكامل).
export async function searchUsers(q) {
  const res = await get(`/users/search?q=${encodeURIComponent(q)}`);
  return unwrapList(res).items;
}

// { asPublic: true } ← view=public: الرد كما يراه عضو آخر عادي حتى لصاحبه والمدير
// (معاينة «اعرض ملفي كما يراه الآخرون»). الخادم وحده يطبّق قواعد الإخفاء.
export const publicViewQuery = ({ asPublic = false } = {}) => (asPublic ? 'view=public' : '');

// GET /users/{id} — لغير صاحبه والمدير: { id, name, bio, region|null, points|null, showProjects, showAchievements }
// (الاسم «عضو المنصة» إن أخفاه صاحبه، والمنطقة null إن أخفاها). صاحبه والمدير يأخذان الملف الكامل. غير موجود ← 404.
export function getUser(id, options) {
  const query = publicViewQuery(options);
  return get(`/users/${encodeURIComponent(id)}${query ? `?${query}` : ''}`);
}

// GET /users/{id}/projects — مقسّمة → { items, meta }. إن أخفاها صاحبها ← 403 ProjectsHidden.
export async function listUserProjects(id, page = 1, options) {
  const query = publicViewQuery(options);
  return unwrapList(await get(`/users/${encodeURIComponent(id)}/projects?page=${page}${query ? `&${query}` : ''}`));
}

export const PROJECTS_HIDDEN = 'ProjectsHidden';

// GET /users/{id}/contributions (القرار 9) → { viewer: 'self'|'sameGroup'|'member'|'staff', track, cohort, workshop,
// joinedAt, joinedMonth, sharedWith: { workspaces, groups }, workspacesHidden, workspaces, outputs, activity|null,
// canMessage, staff|null }. ما يظهر يقرّره الخادم بحسب العارِض، و{ asPublic: true } كما يراه عضو آخر.
export function getUserContributions(id, options) {
  const query = publicViewQuery(options);
  return get(`/users/${encodeURIComponent(id)}/contributions${query ? `?${query}` : ''}`);
}
