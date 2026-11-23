import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../../i18n/LanguageContext';

vi.mock('../../config', () => ({ USE_API: true }));
vi.mock('../../components/Layout/TopBar', () => ({ default: () => null }));
vi.mock('../../api/platform', () => ({ listConsultations: vi.fn() }));
vi.mock('../../api/admin', () => ({ updateConsultationReport: vi.fn(), createConsultation: vi.fn() }));
const platform = await import('../../api/platform');
const admin = await import('../../api/admin');
const { default: AdminConsultations } = await import('./AdminConsultations');

const report = { summary: 'ملخص نتائج الحوار الشبابي.', topStatements: [{ text: 'نحتاج مساحات آمنة', agree: 80, disagree: 5 }], groups: [] };
const items = [
  { id: 'c1', title: 'حوار التعليم', participantsCount: 40, report: null },
  { id: 'c2', title: 'حوار العمل', participantsCount: 12, report },
];
const renderPage = () => render(<MemoryRouter><LanguageProvider initialLang="ar"><AdminConsultations /></LanguageProvider></MemoryRouter>);

describe('AdminConsultations (B7.4)', () => {
  beforeEach(() => {
    platform.listConsultations.mockReset();
    admin.updateConsultationReport.mockReset();
    admin.createConsultation.mockReset();
  });
  afterEach(cleanup);

  it('يعرض حالة التقرير لكل استشارة', async () => {
    platform.listConsultations.mockResolvedValue(items);
    renderPage();
    expect(await screen.findByText('بلا تقرير')).toBeTruthy();
    expect(screen.getByText('التقرير منشور')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'إضافة التقرير — حوار التعليم' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'حذف التقرير — حوار العمل' })).toBeTruthy();
  });

  it('إضافة تقرير: التحقق ثم إرسال الشكل الصحيح وإعادة التحميل', async () => {
    const user = userEvent.setup();
    platform.listConsultations.mockResolvedValue(items);
    admin.updateConsultationReport.mockResolvedValue({});
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'إضافة التقرير — حوار التعليم' }));
    const dialog = screen.getByRole('dialog');

    await user.type(within(dialog).getByLabelText('الملخص (10 أحرف على الأقل)'), 'قصير');
    await user.click(within(dialog).getByRole('button', { name: 'حفظ التقرير' }));
    expect(within(dialog).getByRole('alert').textContent).toMatch('الملخص من 10');
    expect(admin.updateConsultationReport).not.toHaveBeenCalled();

    await user.type(within(dialog).getByLabelText('الملخص (10 أحرف على الأقل)'), ' — النتائج مشجعة جدًا');
    await user.click(within(dialog).getByRole('button', { name: 'إضافة عبارة' }));
    const statement = within(dialog).getByRole('group', { name: 'العبارة 1' });
    await user.type(within(statement).getByLabelText('نص العبارة'), 'التعليم أولوية');
    await user.type(within(statement).getByLabelText('موافقة %'), '70');
    await user.type(within(statement).getByLabelText('رفض %'), '20');
    await user.click(within(dialog).getByRole('button', { name: 'إضافة مجموعة' }));
    const group = within(dialog).getByRole('group', { name: 'المجموعة 1' });
    await user.type(within(group).getByLabelText('اسم المجموعة'), 'الطلاب');
    await user.type(within(group).getByLabelText('النسبة %'), '55');
    await user.click(within(dialog).getByRole('button', { name: 'حفظ التقرير' }));

    expect(admin.updateConsultationReport).toHaveBeenCalledWith('c1', {
      summary: 'قصير — النتائج مشجعة جدًا',
      topStatements: [{ text: 'التعليم أولوية', agree: 70, disagree: 20 }],
      groups: [{ name: 'الطلاب', percentage: 55 }],
    });
    await vi.waitFor(() => expect(platform.listConsultations).toHaveBeenCalledTimes(2));
  });

  it('التعديل يملأ النموذج من التقرير الحالي، والحذف يرسل null', async () => {
    const user = userEvent.setup();
    platform.listConsultations.mockResolvedValue(items);
    admin.updateConsultationReport.mockResolvedValue({});
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'تعديل التقرير — حوار العمل' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByLabelText('الملخص (10 أحرف على الأقل)').value).toBe(report.summary);
    expect(within(dialog).getByLabelText('نص العبارة').value).toBe('نحتاج مساحات آمنة');
    await user.click(within(dialog).getByRole('button', { name: 'إلغاء' }));

    await user.click(screen.getByRole('button', { name: 'حذف التقرير — حوار العمل' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'حذف التقرير' }));
    expect(admin.updateConsultationReport).toHaveBeenCalledWith('c2', null);
    expect(await screen.findAllByText('بلا تقرير')).toHaveLength(2);
  });

  it('422 من الخادم يظهر داخل النافذة', async () => {
    const user = userEvent.setup();
    platform.listConsultations.mockResolvedValue(items);
    admin.updateConsultationReport.mockRejectedValue(Object.assign(new Error('مفتاح غير معروف في التقرير'), { status: 422 }));
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'تعديل التقرير — حوار العمل' }));
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'حفظ التقرير' }));
    expect((await within(dialog).findByRole('alert')).textContent).toBe('مفتاح غير معروف في التقرير');
  });

  // ملاحظة هلا (هـ-2): «من وين أضيف مشاورة» — الصفحة كانت للتقرير فقط.
  it('استشارة جديدة: العنوان ومعرّف Pol.is (أو رابطه)، ثم الإرسال وإعادة التحميل', async () => {
    const user = userEvent.setup();
    platform.listConsultations.mockResolvedValue(items);
    admin.createConsultation.mockResolvedValue({ id: 'c3' });
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'استشارة جديدة' }));
    const dialog = screen.getByRole('dialog');
    const save = within(dialog).getByRole('button', { name: 'إنشاء الاستشارة' });

    await user.type(within(dialog).getByRole('textbox', { name: /^العنوان/ }), 'مستقبل الحكم المحلي');
    await user.click(save);
    expect(within(dialog).getByText('معرّف محادثة Pol.is إلزامي.')).toBeTruthy();
    expect(admin.createConsultation).not.toHaveBeenCalled();

    await user.type(within(dialog).getByLabelText('معرّف محادثة Pol.is أو رابطها'), 'https://pol.is/4kjn2mxr9a');
    await user.click(save);

    expect(admin.createConsultation).toHaveBeenCalledWith({ title: { ar: 'مستقبل الحكم المحلي' }, polisConversationId: '4kjn2mxr9a' });
    expect(platform.listConsultations).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
