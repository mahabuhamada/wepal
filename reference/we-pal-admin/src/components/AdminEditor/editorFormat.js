// تاريخ الواجهة كما في نظام التصميم: DD/MM/YYYY بأرقام لاتينية، وبتوقيت فلسطين.
export function formatDateTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Hebron', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
      .formatToParts(d)
      .map((p) => [p.type, p.value]),
  );
  return `${parts.day}/${parts.month}/${parts.year} ${parts.hour}:${parts.minute}`;
}

export function formatDate(iso) {
  return formatDateTime(iso).slice(0, 10);
}

/** «YYYY-MM-DDTHH:mm» بتوقيت فلسطين (حقل datetime-local) إلى ISO بتوقيت غرينتش، أيًّا كان توقيت جهاز المحرّر. */
export function palestineToIso(local) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local ?? '');
  if (!m) return null;
  const asUtc = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  // فرق فلسطين عن غرينتش في ذلك اليوم (+2 أو +3 بالتوقيت الصيفي)
  const shown = formatDateTime(new Date(asUtc).toISOString());
  const [d, t] = shown.split(' ');
  const [dd, mm, yyyy] = d.split('/');
  const [hh, mi] = t.split(':');
  const offset = Date.UTC(+yyyy, +mm - 1, +dd, +hh, +mi) - asUtc;
  return new Date(asUtc - offset).toISOString();
}
