// مطابقة نص البحث في لوحة الأوامر: بلا تشكيل ولا تطويل، والهمزات ألف، والتاء المربوطة هاء، والألف المقصورة ياء،
// وبلا فرق بين الأحرف الكبيرة والصغيرة. كل كلمة في البحث يجب أن تظهر في النص.
const DIACRITICS = /[ً-ٰٟـ]/g;

export function normalizeForSearch(text) {
  return String(text ?? '')
    .replace(DIACRITICS, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .toLowerCase()
    .trim();
}

export function paletteMatches(text, query) {
  const haystack = normalizeForSearch(text);
  return normalizeForSearch(query).split(/\s+/).filter(Boolean).every((word) => haystack.includes(word));
}
