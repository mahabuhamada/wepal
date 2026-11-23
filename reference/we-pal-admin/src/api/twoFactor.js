// المصادقة الثنائية (TOTP). إلزامية للمدير، اختيارية لغيره.
import { get, post } from './client';

// → { secret, otpauthUrl, qrSvg } — لا يُفعَّل شيء قبل confirm.
export function setupTwoFactor() {
  return post('/auth/2fa/setup');
}

// → { recoveryCodes: string[8] } — تُعرض مرة واحدة فقط.
export function confirmTwoFactor(code) {
  return post('/auth/2fa/confirm', { code });
}

// غير متاح للمدير (403).
export function disableTwoFactor({ password, code }) {
  return post('/auth/2fa/disable', { password, code });
}

// خطوة الدخول الثانية. answer: { code } أو { recoveryCode } → { token, user }
export function completeTwoFactorChallenge(challengeToken, answer) {
  return post('/auth/2fa/challenge', { challengeToken, ...answer });
}

// رموز الاسترداد (B4.4): العدد المتبقي → { remaining }. بلا 2FA مفعّلة ← 400.
export function getRecoveryCodesCount() {
  return get('/auth/2fa/recovery-codes/count');
}

// توليد رموز جديدة برمز حالي من التطبيق (لا رمز استرداد) → { recoveryCodes: string[8] }.
// القديمة تُبطل. رمز خاطئ أو مكرر ← 400، وحد 6/دقيقة ← 429.
export function regenerateRecoveryCodes(code) {
  return post('/auth/2fa/recovery-codes', { code });
}

// كود الخطأ الذي يرسله الخادم للمدير الذي لم يفعّل المصادقة الثنائية.
export const TWO_FACTOR_REQUIRED = 'TwoFactorRequired';

// QR من الخادم (SVG) كـ data URL لعرضه في <img> بدل حقن HTML.
export function qrDataUrl(svg) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
