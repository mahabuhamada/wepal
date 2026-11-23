import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { LanguageProvider } from '../../i18n/LanguageContext';

// الدعوات: التبويب الأول «دعوات فردية» (دعوة شخص، والجدول، وإعادة الإرسال)، و«الدفعات» (القائمة والإنشاء)،
// وتفاصيل الدفعة (النسخ والإلغاء والتصدير والترشيح والإرسال برسالة)، وورقة الطباعة.
vi.mock('../../config', () => ({ USE_API: true }));
vi.mock('../../components/Layout/TopBar', () => ({ default: () => null }));
const notice = vi.hoisted(() => vi.fn());
vi.mock('../../components/Admin/adminNoticeContext', () => ({ useAdminNotice: () => notice }));
vi.mock('../../api/invitationBatches', () => ({
  listInvitationBatches: vi.fn(),
  createInvitationBatch: vi.fn(),
  getInvitationBatch: vi.fn(),
  exportInvitationBatch: vi.fn(),
  revokeInvitationCode: vi.fn(),
  updateInvitationBatch: vi.fn(),
  deleteInvitationBatch: vi.fn(),
  markInvitationCopied: vi.fn(),
  setInvitationSent: vi.fn(),
}));
vi.mock('../../api/invitations', () => ({
  listIndividualInvitations: vi.fn(),
  createIndividualInvitation: vi.fn(),
  sendInvitationSms: vi.fn(),
}));
const api = await import('../../api/invitationBatches');
const inv = await import('../../api/invitations');
const { default: AdminInvitations } = await import('./AdminInvitations');
const { default: AdminInvitationBatch } = await import('./AdminInvitationBatch');
const { default: AdminInvitationPrint } = await import('./AdminInvitationPrint');

const COHORTS = [{ key: '2026-fall', name: 'الدفعة الأولى، خريف 2026' }];
const BATCH = {
  id: 'b1', name: 'ورشة نابلس 12 نوفمبر', region: 'WEST_BANK', cohort: COHORTS[0], track: 'RESEARCH', size: 4,
  expiresAt: '2099-01-01T00:00:00Z', note: 'مع شريك محلي', createdBy: { id: 'a1', name: 'ليلى' }, createdAt: '2026-11-04T08:00:00Z',
  counts: { used: 1, unused: 2, expired: 0, revoked: 1 },
};
const CODES = [
  { id: 'c1', code: 'HUB-AAAA-1111', joinUrl: 'https://wepal.ps/join?code=HUB-AAAA-1111', status: 'UNUSED', usedBy: null, usedAt: null, expiresAt: BATCH.expiresAt },
  { id: 'c2', code: 'HUB-BBBB-2222', joinUrl: 'https://wepal.ps/join?code=HUB-BBBB-2222', status: 'USED', usedBy: { id: 'u1', name: 'سلمى' }, usedAt: '2026-11-05T10:00:00Z', expiresAt: BATCH.expiresAt },
  { id: 'c3', code: 'HUB-CCCC-3333', joinUrl: 'https://wepal.ps/join?code=HUB-CCCC-3333', status: 'UNUSED', usedBy: null, usedAt: null, expiresAt: BATCH.expiresAt },
];

const sms = (over = {}) => ({ status: null, failureReason: null, failureMessage: null, attempts: 0, remaining: 3, sentAt: null, ...over });
const INVITES = [
  {
    id: 'i1', code: 'HUB-1111-AAAA', joinUrl: 'https://wepal.ps/join?code=HUB-1111-AAAA', kind: 'individual', inviteStatus: 'SENT',
    invitee: { name: 'سلمى خليل', phone: '+970••••••832', email: null }, invitedBy: { id: 'a1', name: 'ليلى' },
    sms: sms({ status: 'sent', attempts: 1, remaining: 2, sentAt: '2026-11-05T09:00:00Z' }), usedBy: null, usedAt: null,
  },
  {
    id: 'i2', code: 'HUB-2222-BBBB', joinUrl: 'https://wepal.ps/join?code=HUB-2222-BBBB', kind: 'individual', inviteStatus: 'FAILED',
    invitee: { name: 'رامي حسن', phone: '+970••••••555', email: null }, invitedBy: null,
    sms: sms({ status: 'failed', failureReason: 'invalid_number', failureMessage: 'رفض مزوّد الرسائل هذا الرقم. تأكد منه', attempts: 1, remaining: 2 }), usedBy: null, usedAt: null,
  },
  {
    id: 'i3', code: 'HUB-3333-CCCC', joinUrl: 'https://wepal.ps/join?code=HUB-3333-CCCC', kind: 'individual', inviteStatus: 'USED',
    invitee: { name: 'هبة', phone: '+970••••••111', email: null }, invitedBy: null,
    sms: sms({ status: 'sent', attempts: 1, remaining: 2 }), usedBy: { id: 'u9', name: 'هبة علي' }, usedAt: '2026-11-05T10:00:00Z',
  },
];

const renderAt = (path) => render(
  <LanguageProvider initialLang="ar">
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/admin/invitations" element={<AdminInvitations />} />
        <Route path="/admin/invitations/:id" element={<AdminInvitationBatch />} />
        <Route path="/admin/invitations/:id/print" element={<AdminInvitationPrint />} />
      </Routes>
    </MemoryRouter>
  </LanguageProvider>,
);

beforeEach(() => {
  Object.values(api).forEach((fn) => fn.mockReset());
  Object.values(inv).forEach((fn) => fn.mockReset());
  inv.listIndividualInvitations.mockResolvedValue({ data: INVITES, meta: { page: 1, perPage: 20, total: 3, lastPage: 1, cohorts: COHORTS } });
  notice.mockReset();
  api.listInvitationBatches.mockResolvedValue({ data: [BATCH], meta: { page: 1, perPage: 20, total: 1, lastPage: 1, cohorts: COHORTS } });
  api.getInvitationBatch.mockResolvedValue({ batch: BATCH, codes: CODES });
});
afterEach(cleanup);

describe('قائمة الدفعات', () => {
  it('تعرض كل دفعة بمنطقتها ودفعتها ومسارها وأعدادها', async () => {
    renderAt('/admin/invitations?tab=batches');
    const list = await screen.findByRole('list', { name: 'الدفعات' });
    const card = within(list).getAllByRole('listitem')[0];
    expect(within(card).getByRole('link', { name: 'ورشة نابلس 12 نوفمبر' }).getAttribute('href')).toBe('/admin/invitations/b1');
    expect(within(card).getByText('الضفة الغربية')).toBeTruthy();
    expect(within(card).getByText('الدفعة الأولى، خريف 2026')).toBeTruthy();
    expect(within(card).getByText('مستعمل: 1')).toBeTruthy();
    expect(within(card).getByText('غير مستعمل: 2')).toBeTruthy();
    expect(within(card).getByText('مُلغى: 1')).toBeTruthy();
    expect(within(card).getByText('33% مستعمل')).toBeTruthy();
    expect(within(card).getByText(/أنشأها ليلى/)).toBeTruthy();
  });

  it('حالة فارغة', async () => {
    api.listInvitationBatches.mockResolvedValue({ data: [], meta: { page: 1, total: 0, lastPage: 1, cohorts: COHORTS } });
    renderAt('/admin/invitations?tab=batches');
    expect(await screen.findByText('لا دفعات بعد')).toBeTruthy();
  });

  it('الإنشاء: يتحقق من الحقول، ثم يرسل الدفعة وينتقل إلى تفاصيلها', async () => {
    const user = userEvent.setup();
    api.createInvitationBatch.mockResolvedValue({ batch: { ...BATCH, id: 'b9', name: 'ورشة رام الله' }, codes: CODES });
    renderAt('/admin/invitations?tab=batches');

    await user.click(await screen.findByRole('button', { name: 'إنشاء دفعة' }));
    const dialog = screen.getByRole('dialog', { name: 'دفعة دعوة جديدة' });
    await user.click(within(dialog).getByRole('button', { name: 'أنشئ الدفعة' }));
    expect(within(dialog).getByText('اكتب اسمًا من حرفين إلى 120 حرفًا.')).toBeTruthy();
    expect(api.createInvitationBatch).not.toHaveBeenCalled();

    await user.type(within(dialog).getByLabelText('اسم الدفعة'), 'ورشة رام الله');
    await user.selectOptions(within(dialog).getByLabelText('المنطقة'), 'WEST_BANK');
    await user.selectOptions(within(dialog).getByLabelText('المسار'), 'INITIATIVES');
    const count = within(dialog).getByLabelText('عدد الأكواد');
    await user.clear(count);
    await user.type(count, '3');
    await user.click(within(dialog).getByRole('button', { name: 'أنشئ الدفعة' }));

    expect(api.createInvitationBatch).toHaveBeenCalledWith({
      name: 'ورشة رام الله', region: 'WEST_BANK', cohort: '2026-fall', track: 'INITIATIVES', count: 3, expiresInDays: 30, note: null,
    });
    expect(await screen.findByRole('heading', { name: 'ورشة نابلس 12 نوفمبر' })).toBeTruthy(); // صفحة التفاصيل (b9)
    expect(api.getInvitationBatch).toHaveBeenCalledWith('b9', undefined, undefined);
    expect(notice).toHaveBeenCalledWith('أُنشئت دفعة «ورشة رام الله»: 3 كود.');
  });

  it('خطأ الخادم يظهر في النافذة', async () => {
    const user = userEvent.setup();
    api.createInvitationBatch.mockRejectedValue(new Error('اختر دفعة البرنامج'));
    renderAt('/admin/invitations?tab=batches');
    await user.click(await screen.findByRole('button', { name: 'إنشاء دفعة' }));
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText('اسم الدفعة'), 'ورشة');
    await user.click(within(dialog).getByRole('button', { name: 'أنشئ الدفعة' }));
    expect(await within(dialog).findByText('اختر دفعة البرنامج')).toBeTruthy();
  });
});

describe('تفاصيل الدفعة', () => {
  it('تعرض الأكواد ومن استعمل كلًّا منها، ولا نسخ ولا إلغاء للمستعمل', async () => {
    renderAt('/admin/invitations/b1');
    const table = await screen.findByRole('table', { name: 'أكواد الدفعة' });
    const rows = within(table).getAllByRole('row');
    expect(rows).toHaveLength(4);
    const used = rows.find((r) => r.textContent.includes('HUB-BBBB-2222'));
    expect(within(used).getByText('سلمى')).toBeTruthy();
    expect(within(used).queryByRole('button')).toBeNull();
    expect(screen.getByRole('button', { name: 'نسخ رابط HUB-AAAA-1111' })).toBeTruthy();
    expect(screen.getByText('مع شريك محلي')).toBeTruthy();
    expect(screen.getByRole('link', { name: /ورقة للطباعة/ }).getAttribute('href')).toBe('/admin/invitations/b1/print');
  });

  it('نسخ الرابط يكتب رابط الكود وحده ويعلّمه «تم النسخ»', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn(async () => {});
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    api.markInvitationCopied.mockResolvedValue({
      data: { ...CODES[0], marks: { copied: { at: '2026-11-16T10:00:00Z', by: { id: 'a1', name: 'هلا' } }, sent: null } },
    });
    renderAt('/admin/invitations/b1');
    await user.click(await screen.findByRole('button', { name: 'نسخ رابط HUB-AAAA-1111' }));
    expect(writeText).toHaveBeenCalledWith('https://wepal.ps/join?code=HUB-AAAA-1111');
    expect(notice).toHaveBeenCalledWith('نُسخ رابط HUB-AAAA-1111.');
    expect(api.markInvitationCopied).toHaveBeenCalledWith('c1');
    const row = screen.getByText('HUB-AAAA-1111').closest('tr');
    expect(await within(row).findByText('تم النسخ')).toBeTruthy();
    expect(within(row).getByText(/^هلا، /)).toBeTruthy();
  });

  it('نسخ كود منسوخ سابقًا لا يطلب العلامة من جديد، وفشل حفظ العلامة يُعلن', async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: vi.fn(async () => {}) }, configurable: true });
    const marked = { ...CODES[0], marks: { copied: { at: '2026-11-16T10:00:00Z', by: null }, sent: null } };
    api.getInvitationBatch.mockResolvedValue({ batch: BATCH, codes: [marked, CODES[2]] });
    api.markInvitationCopied.mockRejectedValue(new Error('x'));
    renderAt('/admin/invitations/b1');
    await user.click(await screen.findByRole('button', { name: 'نسخ رابط HUB-AAAA-1111' }));
    expect(api.markInvitationCopied).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'نسخ رابط HUB-CCCC-3333' }));
    await vi.waitFor(() => expect(notice).toHaveBeenCalledWith('نُسخ الرابط، لكن لم تُحفظ علامة «تم النسخ».'));
  });

  it('«تم الإرسال» يدويًا: تعليم ثم إزالة، ولا زر لما أُرسل برسالة SMS', async () => {
    const user = userEvent.setup();
    const sentSms = { ...CODES[2], marks: { copied: null, sent: { at: '2026-11-15T09:00:00Z', by: null, via: 'sms' } } };
    api.getInvitationBatch.mockResolvedValue({ batch: BATCH, codes: [CODES[0], CODES[1], sentSms] });
    const markedByHand = { ...CODES[0], marks: { copied: null, sent: { at: '2026-11-16T10:00:00Z', by: { id: 'a1', name: 'هلا' }, via: 'manual' } } };
    api.setInvitationSent.mockResolvedValueOnce({ data: markedByHand }).mockResolvedValueOnce({ data: { ...CODES[0], marks: { copied: null, sent: null } } });
    renderAt('/admin/invitations/b1');

    const smsRow = (await screen.findByText('HUB-CCCC-3333')).closest('tr');
    expect(within(smsRow).getByText('أُرسل برسالة')).toBeTruthy();
    expect(within(smsRow).queryByRole('button', { name: /«تم الإرسال»|علامة الإرسال/ })).toBeNull();

    await user.click(screen.getByRole('button', { name: 'تعليم الكود HUB-AAAA-1111 «تم الإرسال»' }));
    expect(api.setInvitationSent).toHaveBeenLastCalledWith('c1', true);
    expect(notice).toHaveBeenCalledWith('عُلِّم HUB-AAAA-1111 «تم الإرسال».');
    const row = screen.getByText('HUB-AAAA-1111').closest('tr');
    expect(within(row).getByText('تم الإرسال')).toBeTruthy();

    await user.click(within(row).getByRole('button', { name: 'إزالة علامة الإرسال عن HUB-AAAA-1111' }));
    expect(api.setInvitationSent).toHaveBeenLastCalledWith('c1', false);
    await vi.waitFor(() => expect(within(row).queryByText('تم الإرسال')).toBeNull());
  });

  it('الترشيح بالعلامة يطلب الأكواد من جديد', async () => {
    const user = userEvent.setup();
    renderAt('/admin/invitations/b1');
    await screen.findByRole('table');
    await user.selectOptions(screen.getByLabelText('ترشيح بالعلامة'), 'COPIED');
    expect(api.getInvitationBatch).toHaveBeenLastCalledWith('b1', undefined, 'COPIED');
  });

  it('الترشيح بالحالة يطلب الأكواد من جديد', async () => {
    const user = userEvent.setup();
    renderAt('/admin/invitations/b1');
    await user.click(await screen.findByRole('tab', { name: /^مستعمل/ }));
    expect(api.getInvitationBatch).toHaveBeenLastCalledWith('b1', 'USED', undefined);
  });

  it('الإلغاء بعد التأكيد يزيل الكود ويحدّث الأعداد', async () => {
    const user = userEvent.setup();
    api.revokeInvitationCode.mockResolvedValue({ success: true });
    renderAt('/admin/invitations/b1');
    await user.click(await screen.findByRole('button', { name: 'إلغاء الكود HUB-AAAA-1111' }));
    const dialog = screen.getByRole('dialog', { name: 'إلغاء الكود HUB-AAAA-1111؟' });
    await user.click(within(dialog).getByRole('button', { name: 'ألغِ الكود' }));
    await vi.waitFor(() => expect(screen.queryByText('HUB-AAAA-1111')).toBeNull());
    expect(api.revokeInvitationCode).toHaveBeenCalledWith('c1');
    expect(notice).toHaveBeenCalledWith('أُلغي الكود HUB-AAAA-1111.');
  });

  it('التصدير ينزّل CSV الدفعة', async () => {
    const user = userEvent.setup();
    api.exportInvitationBatch.mockResolvedValue(10);
    renderAt('/admin/invitations/b1');
    await user.click(await screen.findByRole('button', { name: /تصدير CSV/ }));
    expect(api.exportInvitationBatch).toHaveBeenCalledWith('b1');
  });
});

describe('ورقة الطباعة', () => {
  it('قصاصة لكل كود غير مستعمل بالكود والرابط، بلا منطقة ولا اسم دفعة في القصاصة', async () => {
    api.getInvitationBatch.mockResolvedValue({ batch: BATCH, codes: [CODES[0], CODES[2]] });
    renderAt('/admin/invitations/b1/print');
    const list = await screen.findByRole('list', { name: 'ورقة أكواد الدعوة' });
    expect(api.getInvitationBatch).toHaveBeenCalledWith('b1', 'UNUSED');
    const slips = within(list).getAllByRole('listitem');
    expect(slips).toHaveLength(2);
    expect(within(slips[0]).getByText('HUB-AAAA-1111')).toBeTruthy();
    expect(within(slips[0]).getByText('https://wepal.ps/join?code=HUB-AAAA-1111')).toBeTruthy();
    expect(slips[0].textContent).not.toContain('الضفة');
    expect(slips[0].textContent).not.toContain('ورشة نابلس');
    expect(screen.getByRole('heading', { name: 'ورشة نابلس 12 نوفمبر' })).toBeTruthy();
    expect(screen.getByText('الأكواد غير المستعملة فقط: 2')).toBeTruthy();
  });
});

describe('الدعوات الفردية (التبويب الافتراضي)', () => {
  it('تفتح على «دعوات فردية»: الاسم والجوال المقنّع والكود والحالة، ولا إعادة إرسال للمستعمل', async () => {
    renderAt('/admin/invitations');
    expect(screen.getByRole('tab', { name: 'دعوات فردية' }).getAttribute('aria-selected')).toBe('true');
    const table = await screen.findByRole('table', { name: 'الدعوات الفردية' });
    expect(inv.listIndividualInvitations).toHaveBeenCalledWith(1, { status: undefined, q: '' });
    expect(api.listInvitationBatches).not.toHaveBeenCalled();

    const [, salma, rami, heba] = within(table).getAllByRole('row');
    expect(within(salma).getByText('سلمى خليل')).toBeTruthy();
    expect(within(salma).getByText('+970••••••832')).toBeTruthy();
    expect(within(salma).getByText('أُرسلت')).toBeTruthy();
    expect(within(salma).getByText('دعاه ليلى')).toBeTruthy();
    expect(within(salma).getByText('1 من 3 رسائل')).toBeTruthy();
    expect(within(rami).getByText('فشل الإرسال')).toBeTruthy();
    expect(within(rami).getByText('رفض مزوّد الرسائل هذا الرقم. تأكد منه')).toBeTruthy();
    expect(within(heba).getByText('استُعملت')).toBeTruthy();
    expect(within(heba).getByText(/سجّل هبة علي/)).toBeTruthy();
    expect(within(heba).queryByRole('button', { name: /إعادة إرسال/ })).toBeNull();
    expect(within(heba).queryByRole('button', { name: /إلغاء/ })).toBeNull();
    expect(table.textContent).not.toMatch(/0599|970599/);
  });

  it('التبويب الثاني يعرض الدفعات كما كانت', async () => {
    const user = userEvent.setup();
    renderAt('/admin/invitations');
    await user.click(screen.getByRole('tab', { name: 'الدفعات' }));
    expect(await screen.findByRole('list', { name: 'الدفعات' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'إنشاء دفعة' })).toBeTruthy();
  });

  it('الترشيح بالحالة والبحث بالاسم يطلبان القائمة من جديد', async () => {
    const user = userEvent.setup();
    renderAt('/admin/invitations');
    await screen.findByRole('table');
    await user.selectOptions(screen.getByLabelText('ترشيح بالحالة'), 'FAILED');
    expect(inv.listIndividualInvitations).toHaveBeenLastCalledWith(1, { status: 'FAILED', q: '' });
    await user.type(screen.getByPlaceholderText('ابحث بالاسم أو الكود'), 'رامي');
    await vi.waitFor(() => expect(inv.listIndividualInvitations).toHaveBeenLastCalledWith(1, { status: 'FAILED', q: 'رامي' }));
  });

  it('إعادة الإرسال تحدّث الصف وتعلن النتيجة', async () => {
    const user = userEvent.setup();
    inv.sendInvitationSms.mockResolvedValue({
      data: { ...INVITES[1], inviteStatus: 'SENT', sms: sms({ status: 'sent', attempts: 2, remaining: 1 }) },
      sms: { sent: true, reason: null, message: 'أُرسل' },
    });
    renderAt('/admin/invitations');
    await user.click(await screen.findByRole('button', { name: 'إعادة إرسال الكود إلى رامي حسن' }));
    expect(inv.sendInvitationSms).toHaveBeenCalledWith('i2');
    const row = (await screen.findByText('2 من 3 رسائل')).closest('tr');
    expect(within(row).getByText('أُرسلت')).toBeTruthy();
    expect(notice).toHaveBeenCalledWith('أُرسل الكود إلى رامي حسن.');
  });

  it('دعوة شخص: يتحقق من الحقول، ثم ينشئ ويرسل ويعرض الكود ونتيجة الرسالة', async () => {
    const user = userEvent.setup();
    const created = { ...INVITES[0], id: 'i9', code: 'HUB-9999-ZZZZ', invitee: { name: 'نور', phone: '+970••••••444', email: null } };
    inv.createIndividualInvitation.mockResolvedValue({ data: created, sms: { sent: true, reason: null, message: 'أُرسل' } });
    renderAt('/admin/invitations');
    await screen.findByRole('table');

    await user.click(screen.getByRole('button', { name: 'دعوة شخص' }));
    const dialog = screen.getByRole('dialog', { name: 'دعوة شخص' });
    expect(within(dialog).getByRole('checkbox', { name: /أرسل الكود برسالة SMS/ }).checked).toBe(true);
    expect(within(dialog).getByText('لا يُرسل بريد حاليًا، يُحفظ فقط.')).toBeTruthy();
    await user.click(within(dialog).getByRole('button', { name: 'أنشئ وأرسل' }));
    expect(within(dialog).getByText('اكتب اسمًا من حرفين إلى 120 حرفًا.')).toBeTruthy();
    expect(within(dialog).getByText('اكتب رقم الجوال.')).toBeTruthy();
    expect(inv.createIndividualInvitation).not.toHaveBeenCalled();

    await user.type(within(dialog).getByLabelText('الاسم'), 'نور');
    await user.type(within(dialog).getByLabelText('رقم الجوال'), '0599000444');
    await user.selectOptions(within(dialog).getByLabelText('المنطقة'), 'WEST_BANK');
    await user.click(within(dialog).getByRole('button', { name: 'أنشئ وأرسل' }));

    expect(inv.createIndividualInvitation).toHaveBeenCalledWith({
      name: 'نور', phone: '0599000444', email: null, region: 'WEST_BANK', cohort: '2026-fall', track: null, expiresInDays: 30, sendSms: true,
    });
    const result = await screen.findByRole('dialog', { name: 'أُنشئت الدعوة' });
    expect(within(result).getByTestId('invite-code').textContent).toBe('HUB-9999-ZZZZ');
    expect(within(result).getByText('أُرسل الكود برسالة إلى \u2066+970••••••444\u2069.')).toBeTruthy();
    expect(within(result).getByRole('button', { name: 'نسخ الكود' })).toBeTruthy();
    await user.click(within(result).getByRole('button', { name: 'تم' }));
    expect(screen.getByText('نور')).toBeTruthy(); // أُضيفت إلى الجدول
  });

  it('فشل الرسالة لا يلغي الكود: النتيجة تعرض الكود والسبب', async () => {
    const user = userEvent.setup();
    inv.createIndividualInvitation.mockResolvedValue({
      data: { ...INVITES[1], id: 'i8', inviteStatus: 'FAILED' },
      sms: { sent: false, reason: 'daily_cap', message: 'بلغت الرسائل حدها اليومي. أعد الإرسال غدًا' },
    });
    renderAt('/admin/invitations');
    await screen.findByRole('table');
    await user.click(screen.getByRole('button', { name: 'دعوة شخص' }));
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText('الاسم'), 'رامي حسن');
    await user.type(within(dialog).getByLabelText('رقم الجوال'), '0599777555');
    await user.click(within(dialog).getByRole('checkbox', { name: /أرسل الكود/ }));
    await user.click(within(dialog).getByRole('checkbox', { name: /أرسل الكود/ }));
    await user.click(within(dialog).getByRole('button', { name: 'أنشئ وأرسل' }));
    const result = await screen.findByRole('dialog', { name: 'أُنشئت الدعوة' });
    expect(within(result).getByText('أُنشئ الكود، لكن الرسالة لم تُرسل. بلغت الرسائل حدها اليومي. أعد الإرسال غدًا')).toBeTruthy();
    expect(within(result).getByTestId('invite-code').textContent).toBe('HUB-2222-BBBB');
  });

  it('رقم يرفضه الخادم يظهر بجانب حقل الجوال', async () => {
    const user = userEvent.setup();
    inv.createIndividualInvitation.mockRejectedValue(Object.assign(new Error('يُقبل فقط: +970'), { field: 'phone', status: 422 }));
    renderAt('/admin/invitations');
    await screen.findByRole('table');
    await user.click(screen.getByRole('button', { name: 'دعوة شخص' }));
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText('الاسم'), 'رامي');
    await user.type(within(dialog).getByLabelText('رقم الجوال'), '0599777555');
    await user.click(within(dialog).getByRole('button', { name: 'أنشئ وأرسل' }));
    expect(await within(dialog).findByText('يُقبل فقط: +970')).toBeTruthy();
  });
});

describe('إرسال كود من دفعة برسالة', () => {
  it('يطلب الاسم والجوال ثم يرسل ويعرض لمن أُرسل', async () => {
    const user = userEvent.setup();
    inv.sendInvitationSms.mockResolvedValue({
      data: { ...CODES[0], invitee: { name: 'رامي', phone: '+970••••••555' }, sms: sms({ status: 'sent', attempts: 1, remaining: 2 }) },
      sms: { sent: true, reason: null, message: 'أُرسل' },
    });
    renderAt('/admin/invitations/b1');
    expect(await screen.findByRole('link', { name: /كل الدفعات/ })).toHaveProperty('href', expect.stringContaining('/admin/invitations?tab=batches'));
    // للمستعمل لا زر إرسال
    const usedRow = screen.getByText('HUB-BBBB-2222').closest('tr');
    expect(within(usedRow).queryByRole('button', { name: /برسالة/ })).toBeNull();

    await user.click(screen.getByRole('button', { name: 'إرسال الكود HUB-AAAA-1111 برسالة' }));
    const dialog = screen.getByRole('dialog', { name: 'إرسال الكود HUB-AAAA-1111 برسالة' });
    await user.click(within(dialog).getByRole('button', { name: 'أرسل' }));
    expect(within(dialog).getByText('اكتب رقم الجوال.')).toBeTruthy();
    expect(inv.sendInvitationSms).not.toHaveBeenCalled();

    await user.type(within(dialog).getByLabelText('الاسم'), 'رامي');
    await user.type(within(dialog).getByLabelText('رقم الجوال'), '0599777555');
    await user.click(within(dialog).getByRole('button', { name: 'أرسل' }));
    expect(inv.sendInvitationSms).toHaveBeenCalledWith('c1', { name: 'رامي', phone: '0599777555' });
    expect(await screen.findByText(/أُرسل إلى رامي/)).toBeTruthy();
    expect(notice).toHaveBeenCalledWith('أُرسل الكود إلى رامي.');
  });
});

describe('تعديل الدفعة وحذفها', () => {
  const FREE = { ...BATCH, minCount: 1, counts: { used: 0, unused: 3, expired: 0, revoked: 1, handedOut: 1 } };

  it('التعديل: يمنع العدد تحت الحد الأدنى، ثم يرسل ما تغيّر ويعيد تحميل الأكواد', async () => {
    const user = userEvent.setup();
    const withMin = { ...BATCH, minCount: 2, counts: { ...BATCH.counts, handedOut: 1 } };
    api.getInvitationBatch.mockResolvedValue({ batch: withMin, codes: CODES });
    api.updateInvitationBatch.mockResolvedValue({ batch: { ...withMin, name: 'ورشة جنين', size: 7 }, codes: CODES });
    renderAt('/admin/invitations/b1');

    await user.click(await screen.findByRole('button', { name: /تعديل/ }));
    const dialog = screen.getByRole('dialog', { name: 'تعديل الدفعة' });
    expect(within(dialog).getByLabelText('اسم الدفعة').value).toBe('ورشة نابلس 12 نوفمبر');
    const count = within(dialog).getByLabelText('عدد الأكواد');
    expect(count.value).toBe('3');
    expect(within(dialog).getByText(/أقل عدد ممكن 2/)).toBeTruthy();

    await user.clear(count);
    await user.type(count, '1');
    await user.click(within(dialog).getByRole('button', { name: 'احفظ' }));
    expect(within(dialog).getByText('أقل عدد ممكن 2.')).toBeTruthy();
    expect(api.updateInvitationBatch).not.toHaveBeenCalled();

    const name = within(dialog).getByLabelText('اسم الدفعة');
    await user.clear(name);
    await user.type(name, 'ورشة جنين');
    await user.clear(count);
    await user.type(count, '6');
    const calls = api.getInvitationBatch.mock.calls.length;
    await user.click(within(dialog).getByRole('button', { name: 'احفظ' }));
    expect(api.updateInvitationBatch).toHaveBeenCalledWith('b1', { name: 'ورشة جنين', count: 6 });
    await vi.waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(notice).toHaveBeenCalledWith('حُفظت دفعة «ورشة جنين».');
    expect(api.getInvitationBatch.mock.calls.length).toBeGreaterThan(calls);
  });

  it('رفض الخادم للعدد يظهر بجانب الحقل', async () => {
    const user = userEvent.setup();
    api.updateInvitationBatch.mockRejectedValue(Object.assign(new Error('لا يمكن إنقاص العدد إلى أقل من 3'), { field: 'count', status: 422 }));
    renderAt('/admin/invitations/b1');
    await user.click(await screen.findByRole('button', { name: /تعديل/ }));
    const dialog = screen.getByRole('dialog');
    const count = within(dialog).getByLabelText('عدد الأكواد');
    await user.clear(count);
    await user.type(count, '2');
    await user.click(within(dialog).getByRole('button', { name: 'احفظ' }));
    expect(await within(dialog).findByText('لا يمكن إنقاص العدد إلى أقل من 3')).toBeTruthy();
  });

  it('حفظ بلا تغيير يغلق النافذة دون طلب', async () => {
    const user = userEvent.setup();
    renderAt('/admin/invitations/b1');
    await user.click(await screen.findByRole('button', { name: /تعديل/ }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'احفظ' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(api.updateInvitationBatch).not.toHaveBeenCalled();
  });

  it('الحذف معطّل لدفعة فيها كود مستعمل', async () => {
    renderAt('/admin/invitations/b1');
    const del = await screen.findByRole('button', { name: /حذف الدفعة/ });
    expect(del.disabled).toBe(true);
    expect(del.getAttribute('title')).toContain('لا تُحذف دفعة استُعمل أحد أكوادها');
  });

  it('الحذف بعد التأكيد ينبّه إلى المنسوخ ويعود إلى قائمة الدفعات', async () => {
    const user = userEvent.setup();
    api.getInvitationBatch.mockResolvedValue({ batch: FREE, codes: [CODES[0], CODES[2]] });
    api.deleteInvitationBatch.mockResolvedValue({ success: true });
    renderAt('/admin/invitations/b1');
    await user.click(await screen.findByRole('button', { name: /حذف الدفعة/ }));
    const dialog = screen.getByRole('dialog', { name: 'حذف دفعة «ورشة نابلس 12 نوفمبر»؟' });
    expect(within(dialog).getByText(/وأكوادها \(3\) نهائيًّا.*1 منها نُسخ رابطه أو أُرسل/)).toBeTruthy();
    await user.click(within(dialog).getByRole('button', { name: 'احذف الدفعة' }));
    expect(api.deleteInvitationBatch).toHaveBeenCalledWith('b1');
    expect(await screen.findByRole('list', { name: 'الدفعات' })).toBeTruthy();
    expect(notice).toHaveBeenCalledWith('حُذفت دفعة «ورشة نابلس 12 نوفمبر» وأكوادها.');
  });

  it('رفض الخادم للحذف (409) يبقى في النافذة', async () => {
    const user = userEvent.setup();
    api.getInvitationBatch.mockResolvedValue({ batch: FREE, codes: CODES });
    api.deleteInvitationBatch.mockRejectedValue(Object.assign(new Error('لا تُحذف دفعة استُعمل أحد أكوادها'), { status: 409 }));
    renderAt('/admin/invitations/b1');
    await user.click(await screen.findByRole('button', { name: /حذف الدفعة/ }));
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'احذف الدفعة' }));
    expect(await within(dialog).findByText('لا تُحذف دفعة استُعمل أحد أكوادها')).toBeTruthy();
  });
});

describe('علامة النسخ في الدعوات الفردية', () => {
  it('نسخ رابط دعوة يعلّمها «تم النسخ»', async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: vi.fn(async () => {}) }, configurable: true });
    api.markInvitationCopied.mockResolvedValue({ data: { ...INVITES[0], marks: { copied: { at: '2026-11-16T10:00:00Z', by: null }, sent: null } } });
    renderAt('/admin/invitations');
    await user.click(await screen.findByRole('button', { name: /نسخ.*سلمى خليل/ }));
    expect(api.markInvitationCopied).toHaveBeenCalledWith('i1');
    const row = screen.getByText('سلمى خليل').closest('tr');
    expect(await within(row).findByText(/^تم النسخ ·/)).toBeTruthy();
  });
});
