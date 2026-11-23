// حبس التركيز داخل نافذة حوار: Tab من آخر عنصر يرجع للأول، و Shift+Tab من الأول يذهب للأخير.
// يغطي أيضًا حالة التركيز على الحاوية نفسها (tabIndex=-1 بعد الفتح) أو خارجها،
// وإلا يخرج Shift+Tab إلى الصفحة خلف النافذة.
export const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function trapTab(event, container) {
  if (event.key !== 'Tab' || !container) return;
  const nodes = [...container.querySelectorAll(FOCUSABLE)];
  if (nodes.length === 0) {
    // لا شيء قابل للتركيز: يبقى التركيز على الحاوية.
    event.preventDefault();
    container.focus?.();
    return;
  }
  const first = nodes[0];
  const last = nodes[nodes.length - 1];
  const active = container.ownerDocument.activeElement;
  const outside = active === container || !container.contains(active);
  if (event.shiftKey && (active === first || outside)) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (active === last || outside)) {
    event.preventDefault();
    first.focus();
  }
}
