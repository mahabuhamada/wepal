// نسخ نص إلى الحافظة: true إن نجح. المتصفح قد يمنعها (صفحة غير آمنة أو إذن مرفوض).
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
