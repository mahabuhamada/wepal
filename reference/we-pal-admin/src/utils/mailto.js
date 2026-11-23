// رابط mailto: آمن من عنوان يكتبه زائر (نموذج «تواصل معنا»).
// بلا ترميز، عنوان مثل `a@x.ps?cc=evil@x.ps&body=…` يحقن معاملات في الرابط (نسخة لمستلم آخر
// أو نص جاهز) حين يضغط المدير عليه. نرمّز العنوان كله ونُبقي «@» مقروءة، ونرمّز الموضوع والنص.
export function mailtoHref(email, { subject, body } = {}) {
  const address = encodeURIComponent(String(email ?? '').trim()).replace(/%40/g, '@');
  const params = [
    subject ? `subject=${encodeURIComponent(subject)}` : '',
    body ? `body=${encodeURIComponent(body)}` : '',
  ].filter(Boolean);
  return `mailto:${address}${params.length ? `?${params.join('&')}` : ''}`;
}
