// خدمات المصادقة فوق عميل الـ API.
import { del, get, patch, post, uploadForm } from './client';

export function register(payload) {
  // payload: { invitationCode, email, password, name }
  return post('/auth/register', payload);
}

export function login(payload) {
  // payload: { email, password }
  return post('/auth/login', payload);
}

// استعادة كلمة المرور (العقد §3 — B5.1). الرد دائمًا { success, message } حتى لبريد
// غير مسجّل (لا يكشف وجود الحساب). 429 بعد 5 طلبات/دقيقة.
export function forgotPassword(email) {
  return post('/auth/forgot-password', { email });
}

// من رابط البريد /reset-password?token=&email=. 400 رمز غير صالح/منتهٍ/مستخدم، 422 كلمة ضعيفة.
// النجاح يُبطل كل الجلسات.
export function resetPassword({ email, token, password }) {
  return post('/auth/reset-password', { email, token, password });
}

export function logout() {
  return post('/auth/logout');
}

// تدوير التوكن قبل انتهائه → { token, expiresAt, user }. بعد الانتهاء: 401.
export function refresh() {
  return post('/auth/refresh');
}

// الصورة الشخصية (العقد §3 — B5.2): multipart بالحقل avatar (jpg/png/webp ≤ 2MB) ← { avatarUrl }.
// الخادم يقصّها مربعًا 256px ويحذف EXIF. غير ذلك ← 422 برسالة عربية.
export function uploadAvatar(file) {
  return uploadForm('/me/avatar', { file, fileField: 'avatar' });
}

export function deleteAvatar() {
  return del('/me/avatar');
}

export function me() {
  return get('/me');
}

export function updateProfile(payload) {
  // payload: { name?, bio? } — يُرجع البروفايل الكامل بعد الحفظ
  return patch('/me', payload);
}

export function updatePrivacy(payload) {
  // payload: { showRealName?, showAvatar?, showProjects?, showAchievements?, showRegion? }
  return patch('/me/privacy', payload);
}

export function changePassword(payload) {
  // payload: { currentPassword, newPassword }
  // الخادم يُبطل بقية التوكنات ويُبقي توكن الجلسة الحالية صالحاً.
  // كلمة المرور الحالية الخاطئة ← 422 على currentPassword (err.errors) لا 401، فلا تُنهى الجلسة.
  return post('/auth/change-password', payload);
}
