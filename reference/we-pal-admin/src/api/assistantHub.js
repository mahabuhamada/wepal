// «مركز المساعد» في لوحة الإدارة (/admin/assistant)، للمدير فقط. العقد في docs/API-CONTRACT.md.
import { get, post } from './client';

// GET /admin/assistant/overview → { generatedAt, library, faq, search, ask } مجمّعة بلا هوية (المرحلة 1).
export function getAssistantOverview() {
  return get('/admin/assistant/overview');
}

// تغطية المكتبة من استخراج نص ملفات PDF (المرحلة 2أ، مهمة موازية):
// → { totals: { resources, withFile, extracted, needsOcr, failed, noFile, pending, pages, chunks, lastExtractedAt },
//     items: [{ id, title, type, lang, hasFile, isDemo, status, pages, chunks, extractedAt, error }] }
// خادم لم تصله النقطة بعد يرد 404 (أو 405): null، فتعرض الصفحة «المرحلة 2» بهدوء بدل خطأ.
export async function getLibraryCoverage() {
  try {
    return await get('/admin/assistant/library-coverage');
  } catch (error) {
    if (error?.status === 404 || error?.status === 405) return null;
    throw error;
  }
}

// إعادة استخراج نص مادة من المكتبة ← 202 (يعمل في الخلفية، والجدول يعرض «بانتظار» حتى ينتهي).
export function requestExtraction(id) {
  return post(`/admin/resources/${encodeURIComponent(id)}/extract`);
}
