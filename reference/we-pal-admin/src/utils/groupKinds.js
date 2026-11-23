// مساحة الأعضاء، الحزمة 4: أنواع المجموعات وسبب العضوية ومستوى الإشعار، وخطوة أول دخول. منطق بلا واجهة.
import { regionLabel, trackLabel } from './apiMappers';

// INTEREST يبقى للعرض فقط: مجموعات اهتمام قديمة (بيانات تجريبية تُمسح عند الإطلاق) تُعرض بتسميتها.
export const GROUP_KINDS = ['REGION', 'TRACK', 'INTEREST'];
// ما يُعرض للاختيار (إنشاء المجموعة، والتصفية): لا مجموعات اهتمام بعد قرار أمجد (17 نوفمبر).
export const SELECTABLE_GROUP_KINDS = ['REGION', 'TRACK'];
export const NOTIFICATION_LEVELS = ['ALL', 'REPLIES', 'MUTED'];
export const DEFAULT_NOTIFICATION_LEVEL = 'REPLIES';
export const WELCOME_PATH = '/welcome';

// لون كل نوع كما في النموذج: المنطقة نعناعي، والمسار أزرق، والاهتمام بنفسجي.
const KIND_TONES = { REGION: 'mint', TRACK: 'blue', INTEREST: 'violet' };

/** نوع المجموعة إن كان معروفًا، وإلا null (بيانات المحاكاة بلا نوع). */
export function groupKind(group) {
  return GROUP_KINDS.includes(group?.kind) ? group.kind : null;
}

/** لون شارة النوع: mint | blue | violet، أو null. */
export function kindTone(kind) {
  return KIND_TONES[kind] ?? null;
}

/**
 * سطر «أنت هنا لأن…»: مفتاح الترجمة وقيمه من سبب العضوية.
 * المنطقة من رابط المجموعة (لا من بيانات العضو)، والمسار كذلك.
 * @returns {{ key: string, params: Record<string, string> } | null}
 */
export function membershipReason(group, lang = 'ar') {
  const reason = group?.membership?.reason;
  if (!reason) return null;
  return {
    key: `trackGroups.reason.${reason}`,
    params: {
      region: group.region ? regionLabel(group.region, lang) : '',
      track: group.track ? trackLabel(group.track, lang) : '',
    },
  };
}

/** مستوى الإشعار الحالي، والافتراضي «الردود عليّ» لعضوية بلا قيمة. */
export function notificationLevelOf(group) {
  const level = group?.membership?.notificationLevel ?? group?.notificationLevel;
  return NOTIFICATION_LEVELS.includes(level) ? level : DEFAULT_NOTIFICATION_LEVEL;
}

/** هل يغادر العضو المجموعة بنفسه؟ مجموعة المنطقة لا (كتم فقط). */
export function canLeaveGroup(group) {
  if (group?.membership && typeof group.membership.canLeave === 'boolean') return group.membership.canLeave;
  return groupKind(group) !== 'REGION';
}

/** هل يُنضم إليها يدويًا؟ مجموعة المنطقة تأتي من الحساب وحده. */
export function canJoinGroup(group) {
  return groupKind(group) !== 'REGION';
}

/**
 * أين يذهب العضو الآن: '/welcome' إن نقصته خطوة أول دخول ولم يكن فيها، وإلا null.
 * لا تحويل قبل تحميل المستخدم، ولا من صفحة التحقق بالجوال.
 */
export function onboardingRedirect(user, pathname) {
  if (!user?.onboardingNeeded) return null;
  if (pathname === WELCOME_PATH || pathname === '/verify-phone') return null;
  return WELCOME_PATH;
}
