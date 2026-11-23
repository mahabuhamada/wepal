import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../../i18n/LanguageContext';
import { NoticeContext } from '../../components/Admin/adminNoticeContext';
import { ApiError } from '../../api/client';

vi.mock('../../config', () => ({ USE_API: true, FEATURES: { assistant: true } }));
vi.mock('../../hooks/useUnreadNotifications', () => ({ default: () => 0 }));
vi.mock('../../api/assistantHub', () => ({ getAssistantOverview: vi.fn(), getLibraryCoverage: vi.fn(), requestExtraction: vi.fn() }));
const hubApi = await import('../../api/assistantHub');
const { default: AdminAssistant } = await import('./AdminAssistant');

const OVERVIEW = {
  generatedAt: '2026-10-23T10:00:00.000000Z',
  library: {
    resources: 3, withFile: 2, demo: 1, published: 2, byType: { GUIDE: 2, REPORT: 1 },
    items: [
      { id: 'r1', title: 'دليل تنظيم الحوارات المجتمعية', type: 'GUIDE', langs: ['ar', 'en'], hasFile: true, format: 'PDF', isDemo: false, published: true },
      { id: 'r2', title: 'تقرير: تجارب المصالحة الدولية', type: 'REPORT', langs: ['ar'], hasFile: true, format: 'PDF', isDemo: false, published: true },
      { id: 'r3', title: 'دليل الشباب لفهم حل الدولتين', type: 'GUIDE', langs: ['ar'], hasFile: false, format: null, isDemo: true, published: false },
    ],
  },
  faq: {
    total: 5, published: 4, drafts: 1, demo: 0,
    byCategory: [
      { category: 'about', published: 3, drafts: 1 },
      { category: 'membership', published: 1, drafts: 0 },
      { category: 'content', published: 0, drafts: 0 },
    ],
  },
  search: {
    asks7d: 14, asks30d: 52, asksWithResults30d: 41, answeredShare: 79, zeroResults7d: 6, zeroResults30d: 19, month: '2026-10',
    topZeroResults: [
      { query: 'قرار مجلس الامن 2334', count: 4, sources: ['ask', 'library'], lastSeenAt: '2026-10-22T09:15:00.000000Z' },
      { query: 'Cairo reconciliation talks', count: 2, sources: ['ask'], lastSeenAt: '2026-10-20T09:15:00.000000Z' },
    ],
    lastSearchAt: '2026-10-23T09:40:00.000000Z', retentionDays: 90,
  },
  ask: {
    mode: 'search', languageModel: null, audience: 'members', lastAskAt: '2026-10-23T09:40:00.000000Z',
    planned: { phase: 2, audience: 'members', dailyLimitPerMember: 20, monthlyCapUsd: 50, model: 'Claude Sonnet' },
  },
};

const COVERAGE = {
  totals: { resources: 3, withFile: 2, extracted: 1, needsOcr: 1, failed: 0, noFile: 1, pending: 0, pages: 42, chunks: 118, lastExtractedAt: '2026-10-23T09:12:00Z' },
  items: [
    { id: 'r1', title: 'دليل تنظيم الحوارات المجتمعية', type: 'GUIDE', lang: 'ar', hasFile: true, isDemo: false, status: 'needs_ocr', pages: 2, chunks: 0, extractedAt: null, error: null },
    { id: 'r2', title: 'تقرير: تجارب المصالحة الدولية', type: 'REPORT', lang: 'ar', hasFile: true, isDemo: false, status: 'extracted', pages: 40, chunks: 118, extractedAt: '2026-10-22T09:00:00Z', error: null },
    { id: 'r3', title: 'دليل الشباب لفهم حل الدولتين', type: 'GUIDE', lang: null, hasFile: false, isDemo: true, status: 'no_file', pages: null, chunks: null, extractedAt: null, error: null },
  ],
};

const notify = vi.fn();
const renderPage = (lang = 'ar') => render(
  <MemoryRouter initialEntries={['/admin/assistant']}>
    <LanguageProvider initialLang={lang}>
      <NoticeContext.Provider value={{ notify, notice: null, dismiss: () => {} }}>
        <AdminAssistant />
      </NoticeContext.Provider>
    </LanguageProvider>
  </MemoryRouter>,
);

const station = (name) => screen.getByRole('button', { name: new RegExp(`^${name}`) });
const heart = () => screen.getByRole('region', { name: 'قلب المساعد' });

describe('مركز المساعد — المرحلة 1', () => {
  beforeEach(() => {
    Object.values(hubApi).forEach((fn) => fn.mockReset());
    notify.mockReset();
    hubApi.getAssistantOverview.mockResolvedValue(OVERVIEW);
    hubApi.getLibraryCoverage.mockResolvedValue(null);
  });
  afterEach(cleanup);

  it('الترويسة تقول المرحلة، وخارطة المراحل الأربع والأولى هي الحالية', async () => {
    renderPage();
    await screen.findByRole('region', { name: 'قلب المساعد' });
    expect(screen.getByRole('heading', { level: 2, name: /^مركز المساعد/ }).textContent).toContain('المرحلة 1: بحث وأسئلة شائعة بلا نموذج لغوي');
    const phases = within(screen.getByRole('list', { name: 'مراحل البناء' })).getAllByRole('listitem');
    expect(phases).toHaveLength(4);
    expect(phases[0].getAttribute('aria-current')).toBe('step');
  });

  it('القلب بلا تغطية: المصادر والبحث بأرقام حقيقية، والباقي «يصل في المرحلة N» بلا أي رقم', async () => {
    renderPage();
    await screen.findByRole('region', { name: 'قلب المساعد' });

    const sources = station('المصادر');
    expect(sources.textContent).toContain('3');
    expect(sources.textContent).toContain('2 بملف');
    expect(sources.textContent).toContain('قائم اليوم');

    const search = station('البحث');
    expect(search.textContent).toContain('14');
    expect(search.textContent).toContain('79% من أسئلة 30 يومًا وجدت نتيجة');

    for (const [name, phase] of [['استخراج النص', 2], ['التقطيع', 2], ['الفهرسة', 2], ['النموذج', 4], ['الإجابة مع المصادر', 4]]) {
      const card = station(name);
      expect(card.textContent).toContain('لا رقم بعد');
      expect(card.textContent).toContain(`يصل في المرحلة ${phase}`);
      expect(card.textContent).toContain(`المرحلة ${phase}`);
      expect(card.textContent).not.toMatch(/\d+%/);
    }
    expect(within(heart()).getByText(/يعمل اليوم من المسار خطوتان/)).toBeTruthy();
    expect(within(heart()).queryByRole('button', { name: 'افتح الاستخراج' })).toBeNull();
  });

  it('النشاط بلا هوية: الأرقام، وأكثر الأسئلة بلا نتيجة مع «أضف سؤالًا شائعًا» إلى المحرّر /admin/editor/faq/new?q=', async () => {
    renderPage();
    const activity = await screen.findByRole('region', { name: /النشاط، بلا هوية/ });
    const counts = within(activity).getByLabelText('أرقام البحث');
    expect(within(counts).getByText('52')).toBeTruthy();
    expect(within(counts).getByText('79%')).toBeTruthy();
    expect(within(counts).getByText('41 من 52')).toBeTruthy();
    expect(within(counts).getByText('19')).toBeTruthy();
    expect(within(activity).getByText('بلا أسماء أعضاء')).toBeTruthy();

    const list = within(activity).getByRole('list', { name: 'أسئلة لم تجد نتيجة هذا الشهر' });
    const rows = within(list).getAllByRole('listitem');
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByText('عدد المرات: 4')).toBeTruthy();
    expect(within(rows[0]).getByText('المساعد («اسأل»)')).toBeTruthy();
    expect(within(rows[0]).getByRole('link', { name: 'أضف سؤالًا شائعًا: قرار مجلس الامن 2334' }).getAttribute('href'))
      .toBe(`/admin/editor/faq/new?q=${encodeURIComponent('قرار مجلس الامن 2334')}`);
    expect(within(rows[1]).getByRole('link', { name: /ابحث في المكتبة/ }).getAttribute('href'))
      .toBe(`/library?q=${encodeURIComponent('Cairo reconciliation talks')}`);
    expect(within(activity).getByRole('link', { name: 'كل الأسئلة بلا نتيجة' }).getAttribute('href')).toBe('/admin/search-queries');
  });

  it('الأسئلة الشائعة: المنشور والمسودات لكل تصنيف، ورابط الإدارة', async () => {
    renderPage();
    const faq = await screen.findByRole('region', { name: /^الأسئلة الشائعة/ });
    expect(within(faq).getByText('منشورة 3، مسودات 1')).toBeTruthy();
    expect(within(faq).getByText('لا أسئلة بعد')).toBeTruthy();
    expect(within(faq).getByRole('link', { name: 'إدارة الأسئلة الشائعة' }).getAttribute('href')).toBe('/admin/faq');
    expect(within(faq).getByRole('link', { name: 'صفحة المساعدة' }).getAttribute('href')).toBe('/help');
  });

  it('الضوابط للقراءة فقط: «اسأل» تعمل، والقرارات المعتمدة «يُفعَّل في المرحلة 2» بلا مفاتيح', async () => {
    renderPage();
    const controls = await screen.findByRole('region', { name: /الضوابط والحدود/ });
    expect(within(controls).getByText('تعمل: بحث بلا نموذج لغوي')).toBeTruthy();
    for (const value of ['الأعضاء فقط', '20 سؤالًا في اليوم', '50 دولارًا في الشهر', 'Claude Sonnet']) {
      expect(within(controls).getByText(value)).toBeTruthy();
    }
    expect(within(controls).getAllByText('يُفعَّل في المرحلة 2')).toHaveLength(4);
    expect(within(controls).queryByRole('switch')).toBeNull();
    expect(within(controls).queryByRole('checkbox')).toBeNull();
    expect(within(controls).queryByRole('button')).toBeNull();
    expect(within(controls).queryByRole('textbox')).toBeNull();
  });

  it('تغطية المكتبة قبل الاستخراج: المواد بنوعها ولغة عنوانها وهل لها ملف، وسطر «المرحلة 2»', async () => {
    renderPage();
    const coverage = await screen.findByRole('region', { name: /^تغطية المكتبة/ });
    expect(within(coverage).getByText(/حالة استخراج النص لكل ملف/)).toBeTruthy();
    const rows = within(coverage).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(3);
    expect(within(rows[0]).getByText('العربية والإنجليزية')).toBeTruthy();
    expect(within(rows[0]).getByText('ملف PDF')).toBeTruthy();
    expect(within(rows[2]).getByText('بلا ملف')).toBeTruthy();
    expect(within(rows[2]).getByText('مثال')).toBeTruthy();
    expect(within(coverage).queryByRole('button', { name: /أعد الاستخراج/ })).toBeNull();
  });

  it('درج الخطوة: يفتح بالتفاصيل ويُغلق بـ Escape ويعيد التركيز للبطاقة', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('region', { name: 'قلب المساعد' });

    await user.click(station('البحث'));
    const dialog = screen.getByRole('dialog', { name: 'البحث' });
    expect(within(dialog).getByText('الخطوة 5 من 7')).toBeTruthy();
    expect(within(dialog).getByText('52')).toBeTruthy();
    expect(within(dialog).getByRole('link', { name: 'كل الأسئلة بلا نتيجة' })).toBeTruthy();
    expect(document.activeElement).toBe(within(dialog).getByRole('button', { name: 'أغلق التفاصيل' }));
    expect(station('البحث').getAttribute('aria-expanded')).toBe('true');

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(station('البحث')));

    await user.click(station('النموذج'));
    const model = screen.getByRole('dialog', { name: 'النموذج' });
    expect(within(model).getByText(/لا نموذج لغوي اليوم، ولا يُرسل أي سؤال/)).toBeTruthy();
    expect(within(model).getByText('20 سؤالًا في اليوم')).toBeTruthy();
    await user.click(within(model).getByRole('button', { name: 'أغلق التفاصيل' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('مع تغطية المكتبة: الخطوات 2–4 بأرقام حقيقية، والملف الممسوح يحتاج انتباهًا وله «أعد الاستخراج»', async () => {
    const user = userEvent.setup();
    hubApi.getLibraryCoverage.mockResolvedValue(COVERAGE);
    hubApi.requestExtraction.mockResolvedValue(null);
    renderPage();
    await screen.findByRole('region', { name: 'قلب المساعد' });

    expect(station('استخراج النص').textContent).toContain('1من 2');
    expect(station('استخراج النص').textContent).toContain('ملفات تحتاج تدخّلًا: 1');
    expect(station('التقطيع').textContent).toContain('118');
    expect(station('الفهرسة').textContent).toContain('50%');
    expect(within(heart()).getByText(/خطوة تحتاج انتباهًا/)).toBeTruthy();

    const coverage = screen.getByRole('region', { name: /^تغطية المكتبة/ });
    const filters = within(coverage).getByRole('group', { name: 'صفِّ حسب الحالة' });
    expect(within(filters).getByRole('button', { name: /الكل/ }).getAttribute('aria-pressed')).toBe('true');
    await user.click(within(filters).getByRole('button', { name: /ممسوح يحتاج OCR/ }));
    expect(within(coverage).getAllByRole('row')).toHaveLength(2);

    await user.click(within(coverage).getByRole('button', { name: 'أعد استخراج «دليل تنظيم الحوارات المجتمعية»' }));
    expect(hubApi.requestExtraction).toHaveBeenCalledWith('r1');
    expect(notify).toHaveBeenCalledWith('طُلب استخراج «دليل تنظيم الحوارات المجتمعية» من جديد. الحالة تتحدّث خلال دقائق.');
    await user.click(within(filters).getByRole('button', { name: /بانتظار/ }));
    expect(within(coverage).getByText('دليل تنظيم الحوارات المجتمعية')).toBeTruthy();
    expect(within(coverage).queryByRole('button', { name: /أعد استخراج/ })).toBeNull();
  });

  it('خطأ التغطية (غير 404) لا يُسقط الصفحة: تنبيه بإعادة المحاولة وقائمة المكتبة', async () => {
    hubApi.getLibraryCoverage.mockRejectedValue(new ApiError(500, 'خطأ في الخادم'));
    renderPage();
    const coverage = await screen.findByRole('region', { name: /^تغطية المكتبة/ });
    expect(within(coverage).getByRole('alert').textContent).toContain('خطأ في الخادم');
    expect(within(coverage).getAllByRole('row')).toHaveLength(4);
    expect(station('استخراج النص').textContent).toContain('يصل في المرحلة 2');
  });

  it('فشل النظرة العامة: رسالة الخطأ وإعادة المحاولة', async () => {
    const user = userEvent.setup();
    hubApi.getAssistantOverview.mockRejectedValueOnce(new ApiError(403, 'لا تملك صلاحية لهذا الإجراء'));
    renderPage();
    expect((await screen.findByRole('alert')).textContent).toContain('لا تملك صلاحية لهذا الإجراء');

    await user.click(screen.getByRole('button', { name: 'إعادة المحاولة' }));
    expect(await screen.findByRole('region', { name: 'قلب المساعد' })).toBeTruthy();
  });

  it('بالإنجليزية: نفس الصفحة بنصوصها', async () => {
    renderPage('en');
    await screen.findByRole('region', { name: 'The assistant’s core' });
    expect(screen.getByRole('heading', { level: 2, name: /^Assistant hub/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Model/ }).textContent).toContain('Arrives in phase 4');
    expect(screen.getAllByText('Turns on in phase 2')).toHaveLength(4);
    expect(screen.getByText('$50 a month')).toBeTruthy();
  });
});
