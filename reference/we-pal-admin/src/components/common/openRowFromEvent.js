// منطق فتح الصف من حدث نقر (يستعمله ClickableRow.jsx)؛ في ملف وحده ليبقى ملف المكوّن مكوّنات فقط.

// ما يُنقر عليه داخل الصف ويتصرف وحده؛ data-row-ignore لمنطقة لا يجب أن تفتح العنصر.
const OWN_CLICK = 'a, button, input, select, textarea, label, summary, details, [role="button"], [role="link"], [role="menuitem"], [role="checkbox"], [role="switch"], [role="tab"], [contenteditable="true"], [data-row-ignore]';

/**
 * يفتح العنصر الأساسي في الصف من حدث نقر على الصف. يُرجع true إن فتحه.
 * مُصدَّرة للاختبار ولمن يحتاج المعالج دون المكوّن.
 */
export function openRowFromEvent(e) {
  if (e.defaultPrevented) return false;
  const middle = e.button === 1;
  if (e.type === 'click' && e.button !== 0) return false;
  if (e.type === 'auxclick' && !middle) return false;
  const row = e.currentTarget;
  const target = e.target;
  // أحداث React تعبر البوابات (نافذة حوار مفتوحة من الصف): ما ليس داخل الصف في DOM لا يفتح شيئًا
  if (!(target instanceof Node) || !row.contains(target)) return false;
  const own = target instanceof Element ? target.closest(OWN_CLICK) : null;
  if (own && own !== row && row.contains(own)) return false;
  // تحديد نص في الصف (لنسخ عنوان مثلًا) لا يفتح العنصر
  const sel = typeof window !== 'undefined' ? window.getSelection?.() : null;
  if (sel && !sel.isCollapsed && sel.anchorNode && row.contains(sel.anchorNode)) return false;

  const primary = row.querySelector('[data-row-primary]');
  if (!primary || primary.disabled || primary.getAttribute('aria-disabled') === 'true') return false;
  const newTab = middle || e.metaKey || e.ctrlKey || e.shiftKey;
  if (newTab) {
    if (primary.tagName !== 'A' || !primary.href) return false;
    window.open(primary.href, '_blank', 'noopener');
    return true;
  }
  primary.click();
  return true;
}
