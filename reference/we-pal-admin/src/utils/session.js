// عمر الجلسة (العقد §3): التوكن ينتهي بعد 30 يومًا ولا يُجدَّد بعد انتهائه.
const DAY = 24 * 60 * 60 * 1000;
export const REFRESH_WITHIN_DAYS = 7;

const parse = (expiresAt) => {
  const time = expiresAt ? Date.parse(expiresAt) : NaN;
  return Number.isNaN(time) ? null : time;
};

// انتهى فعلًا؟ (تاريخ مجهول = لا نعرف، فلا نفترض الانتهاء)
export const isExpired = (expiresAt, now = Date.now()) => {
  const time = parse(expiresAt);
  return time !== null && time <= now;
};

// نجدّد عند الإقلاع إن بقي أقل من 7 أيام، أو إن كان التاريخ مجهولًا (توكن قديم بلا expiresAt).
export const shouldRefresh = (expiresAt, now = Date.now()) => {
  const time = parse(expiresAt);
  if (time === null) return true;
  return time > now && time - now < REFRESH_WITHIN_DAYS * DAY;
};
