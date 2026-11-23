import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../../i18n/LanguageContext';
import { ApiError } from '../../api/client';

vi.mock('../../config', () => ({ USE_API: true }));
vi.mock('../../components/Layout/TopBar', () => ({ default: () => null }));
vi.mock('../../api/admin', () => ({
  listPendingOutcomes: vi.fn(), getOutcomeForEdit: vi.fn(), saveOutcome: vi.fn(), publishOutcome: vi.fn(),
}));
const admin = await import('../../api/admin');
const { default: AdminOutcomes } = await import('./AdminOutcomes');

const pending = [
  { subjectType: 'consultation', subjectId: 'c1', title: 'حوار المناطق', closedAt: '2026-10-28T10:00:00Z', participantsCount: 87, hasDraft: false },
  { subjectType: 'survey', subjectId: 's1', title: 'موضوع التحدي القادم', closedAt: null, participantsCount: 40, hasDraft: true },
];
const renderPage = () => render(<MemoryRouter><LanguageProvider initialLang="ar"><AdminOutcomes /></LanguageProvider></MemoryRouter>);

const fill = async (user, dialog, legend, text) => {
  const group = within(dialog).getByRole('group', { name: legend });
  await user.type(within(group).getByLabelText('بالعربية'), text);
};

describe('AdminOutcomes — «ينتظر خلاصة» (الحزمة 6أ)', () => {
  beforeEach(() => {
    Object.values(admin).forEach((fn) => fn.mockReset?.());
    admin.listPendingOutcomes.mockResolvedValue({ items: pending });
  });
  afterEach(cleanup);

  it('القائمة: النوع والعدد والمسودة، وزر لكل عنصر', async () => {
    renderPage();
    const list = await screen.findByRole('list', { name: 'ينتظر خلاصة' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(2);
    expect(within(list).getByText('مشاورة')).toBeTruthy();
    expect(within(list).getByText('87 مشاركًا')).toBeTruthy();
    expect(within(list).getByText('مسودة محفوظة')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'اكتب الخلاصة — حوار المناطق' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'أكمل المسودة — موضوع التحدي القادم' })).toBeTruthy();
  });

  it('لا شيء ينتظر: حالة فارغة', async () => {
    admin.listPendingOutcomes.mockResolvedValue({ items: [] });
    renderPage();
    expect(await screen.findByText('لا شيء ينتظر خلاصة: كل ما أُغلق نُشرت خلاصته.')).toBeTruthy();
  });

  it('النشر: يشترط الأقسام الثلاثة، ثم تأكيد، ثم يرسل ويُخرج العنصر من القائمة', async () => {
    const user = userEvent.setup();
    admin.publishOutcome.mockResolvedValue({ id: 'o1', status: 'published' });
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'اكتب الخلاصة — حوار المناطق' }));
    const dialog = screen.getByRole('dialog');

    await fill(user, dialog, 'سألنا', 'ما شروط الحوار؟');
    await user.click(within(dialog).getByRole('button', { name: 'نشر وإشعار المشاركين' }));
    expect(within(dialog).getByText('اكتب الأقسام الثلاثة بالعربية قبل النشر.')).toBeTruthy();
    expect(admin.publishOutcome).not.toHaveBeenCalled();

    await fill(user, dialog, 'قلتم', 'سؤال محدد أولًا');
    await fill(user, dialog, 'فعلنا', 'سؤال الميسّر المثبّت');
    await user.click(within(dialog).getByRole('button', { name: 'نشر وإشعار المشاركين' }));
    expect(within(dialog).getByText(/يصل إشعار إلى كل من شارك \(87\)/)).toBeTruthy();
    await user.click(within(dialog).getByRole('button', { name: 'نعم، انشر' }));

    expect(admin.publishOutcome).toHaveBeenCalledWith('consultation', 'c1', {
      asked: { ar: 'ما شروط الحوار؟' }, said: { ar: 'سؤال محدد أولًا' }, did: { ar: 'سؤال الميسّر المثبّت' },
    });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByRole('button', { name: /حوار المناطق/ })).toBeNull();
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
  });

  it('المعاينة: الخلاصة كما يراها المشاركون، والإغلاق مع تعديلات غير محفوظة يسأل أولًا', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'اكتب الخلاصة — حوار المناطق' }));
    const dialog = screen.getByRole('dialog');
    await fill(user, dialog, 'سألنا', 'ما شروط الحوار؟');
    await user.click(within(dialog).getByRole('button', { name: 'معاينة' }));
    expect(within(within(dialog).getByLabelText('معاينة')).getByText('ما شروط الحوار؟')).toBeTruthy();

    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    await user.click(within(dialog).getAllByRole('button', { name: /إغلاق/ }).at(-1));
    expect(confirm).toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeTruthy();
    confirm.mockRestore();
  });

  it('مسودة محفوظة: تُحمَّل بالترجمات الخام، والحفظ PUT بالإنجليزية معها', async () => {
    const user = userEvent.setup();
    admin.getOutcomeForEdit.mockResolvedValue({ asked: 'سؤال', translations: { asked: { ar: 'سؤال', en: 'Question' }, said: { ar: 'رأي' }, did: {} } });
    admin.saveOutcome.mockResolvedValue({});
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'أكمل المسودة — موضوع التحدي القادم' }));
    const dialog = screen.getByRole('dialog');
    const asked = within(dialog).getByRole('group', { name: 'سألنا' });
    expect((await within(asked).findByLabelText('بالعربية')).value).toBe('سؤال');
    expect(admin.getOutcomeForEdit).toHaveBeenCalledWith('survey', 's1');
    expect(within(asked).getByLabelText('بالإنجليزية (اختياري)').value).toBe('Question');

    await user.click(within(dialog).getByRole('button', { name: 'حفظ مسودة' }));
    expect(admin.saveOutcome).toHaveBeenCalledWith('survey', 's1', {
      asked: { ar: 'سؤال', en: 'Question' }, said: { ar: 'رأي' }, did: { ar: '' },
    });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('خطأ 422 من الخادم: الرسالة بجانب القسم، والنافذة مفتوحة', async () => {
    const user = userEvent.setup();
    admin.publishOutcome.mockRejectedValue(new ApiError(422, 'البيانات غير صالحة', null, null, { 'did.ar': ['قسم «فعلنا» مطلوب'] }, 'did.ar'));
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'اكتب الخلاصة — حوار المناطق' }));
    const dialog = screen.getByRole('dialog');
    await fill(user, dialog, 'سألنا', 'س');
    await fill(user, dialog, 'قلتم', 'ق');
    await fill(user, dialog, 'فعلنا', 'ف');
    await user.click(within(dialog).getByRole('button', { name: 'نشر وإشعار المشاركين' }));
    await user.click(within(dialog).getByRole('button', { name: 'نعم، انشر' }));

    const did = within(dialog).getByRole('group', { name: 'فعلنا' });
    expect((await within(did).findByRole('alert')).textContent).toBe('قسم «فعلنا» مطلوب');
    expect(within(did).getByLabelText('بالعربية').getAttribute('aria-invalid')).toBe('true');
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });
});
