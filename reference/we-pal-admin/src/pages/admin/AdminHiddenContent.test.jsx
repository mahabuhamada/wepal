import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../../i18n/LanguageContext';

const auth = { user: { id: 'a1', role: 'ADMIN', twoFactorEnabled: true } };
vi.mock('../../config', () => ({ USE_API: true }));
vi.mock('../../components/Layout/TopBar', () => ({ default: () => null }));
vi.mock('../../auth/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('../../utils/roles', async (orig) => ({ ...(await orig()), isAdmin: (u) => u?.role === 'ADMIN' }));
vi.mock('../../api/admin', () => ({ listHiddenContent: vi.fn(), restoreHiddenContent: vi.fn(), purgeHiddenContent: vi.fn() }));
const api = await import('../../api/admin');
const { default: AdminHiddenContent } = await import('./AdminHiddenContent');

const day = 86400000;
const item = (over = {}) => ({
  id: 'c1', type: 'comment', preview: 'تعليق مسيء', author: { name: 'سامي' }, hiddenBy: { name: 'هلا' },
  hiddenAt: new Date(Date.now() - 2 * day).toISOString(), reason: 'إساءة', reportsCount: 2,
  purgeableAt: new Date(Date.now() + 28 * day).toISOString(), ...over,
});
const res = (items) => ({ data: items, counts: { comment: items.length, idea: 0, group_post: 0, group_post_comment: 0 }, retentionDays: 30 });
const renderPage = () => render(<MemoryRouter><LanguageProvider initialLang="ar"><AdminHiddenContent /></LanguageProvider></MemoryRouter>);

describe('AdminHiddenContent', () => {
  beforeEach(() => {
    auth.user = { id: 'a1', role: 'ADMIN' };
    api.listHiddenContent.mockReset().mockResolvedValue(res([item()]));
    api.restoreHiddenContent.mockReset().mockResolvedValue({});
    api.purgeHiddenContent.mockReset().mockResolvedValue(null);
  });
  afterEach(cleanup);

  it('يعرض المخفي بعدد كل نوع، والمرشّح يطلب النوع من الخادم', async () => {
    const user = userEvent.setup();
    renderPage();
    expect(await screen.findByText('تعليق مسيء')).toBeTruthy();
    expect(screen.getByText('2 بلاغ')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /منشورات المجموعات/ }));
    expect(api.listHiddenContent).toHaveBeenLastCalledWith('group_post');
  });

  it('الاسترجاع بعد تأكيد ثم إعادة التحميل', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: /استرجاع/ }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'استرجاع' }));
    expect(api.restoreHiddenContent).toHaveBeenCalledWith('comment', 'c1');
    await vi.waitFor(() => expect(api.listHiddenContent).toHaveBeenCalledTimes(2));
  });

  it('الحذف النهائي قبل انتهاء المدة يحتاج سببًا من 10 أحرف', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: /حذف نهائي/ }));
    const dialog = screen.getByRole('dialog', { name: 'حذف نهائي؟' });
    const confirm = within(dialog).getByRole('button', { name: 'حذف نهائي' });
    expect(confirm.disabled).toBe(true);
    await user.type(within(dialog).getByLabelText('سبب الحذف قبل انتهاء المدة'), 'يحمل رقم هاتف عضو');
    await user.click(confirm);
    expect(api.purgeHiddenContent).toHaveBeenCalledWith('comment', 'c1', 'يحمل رقم هاتف عضو');
  });

  it('بعد انتهاء المدة: حذف بلا سبب', async () => {
    const user = userEvent.setup();
    api.listHiddenContent.mockReset().mockResolvedValue(res([item({ purgeableAt: new Date(Date.now() - day).toISOString() })]));
    renderPage();
    await user.click(await screen.findByRole('button', { name: /حذف نهائي/ }));
    const dialog = screen.getByRole('dialog', { name: 'حذف نهائي؟' });
    expect(within(dialog).queryByLabelText('سبب الحذف قبل انتهاء المدة')).toBeNull();
    await user.click(within(dialog).getByRole('button', { name: 'حذف نهائي' }));
    expect(api.purgeHiddenContent).toHaveBeenCalledWith('comment', 'c1', '');
  });

  it('المشرف يسترجع ولا يحذف نهائيًّا', async () => {
    auth.user = { id: 'm1', role: 'MODERATOR' };
    renderPage();
    await screen.findByText('تعليق مسيء');
    expect(screen.getByRole('button', { name: /استرجاع/ })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /حذف نهائي/ })).toBeNull();
  });
});
