import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { LanguageProvider } from '../../i18n/LanguageContext';

vi.mock('../../config', () => ({ USE_API: true }));
vi.mock('../../components/Layout/TopBar', () => ({ default: () => null }));
vi.mock('../../auth/AuthContext', () => ({ useAuth: () => ({ user: { id: 'a1', role: 'SUPER_ADMIN', assignableRoles: ['MEMBER', 'MODERATOR', 'ADMIN'] } }) }));
vi.mock('../../api/admin', () => ({ getMember: vi.fn(), changeUserRole: vi.fn(), suspendUser: vi.fn(), reactivateUser: vi.fn() }));
const api = await import('../../api/admin');
const { default: AdminMember } = await import('./AdminMember');

const MEMBER = {
  id: 'u1', name: 'سامي عودة', email: 's@x.ps', region: 'GAZA', role: 'MEMBER', isActive: true, twoFactor: false, points: 40,
  createdAt: '2026-10-01T10:00:00Z', lastActiveAt: '2026-11-12T10:00:00Z', canManage: true,
  activity: { workspaces: 2, comments: 7, groupPosts: 3, ideas: 1, reportsAgainst: 1, reportsMade: 0, active30: 9 },
  history: [{ action: 'user.role_change', actor: 'هلا', reason: 'يتولى الإشراف', changes: { role: 'MODERATOR' }, at: '2026-11-10T10:00:00Z' }],
};
const renderPage = () => render(
  <MemoryRouter initialEntries={['/admin/users/u1']}><LanguageProvider initialLang="ar">
    <Routes><Route path="/admin/users/:id" element={<AdminMember />} /></Routes>
  </LanguageProvider></MemoryRouter>,
);

describe('AdminMember', () => {
  beforeEach(() => { Object.values(api).forEach((f) => f.mockReset()); api.getMember.mockResolvedValue(MEMBER); });
  afterEach(cleanup);

  it('shows facts, activity and the staff history with its reason', async () => {
    renderPage();
    expect(await screen.findByRole('heading', { name: 'سامي عودة' })).toBeTruthy();
    expect(screen.getByText('تعليقات في المساحات')).toBeTruthy();
    expect(screen.getByText('«يتولى الإشراف»')).toBeTruthy();
  });

  it('asks for a reason, and a two-factor code for an admin role', async () => {
    const user = userEvent.setup();
    api.changeUserRole.mockResolvedValue({});
    renderPage();
    await user.click(await screen.findByRole('button', { name: /تغيير الدور/ }));
    const dialog = screen.getByRole('dialog');
    const confirm = within(dialog).getByRole('button', { name: 'تغيير الدور' });
    expect(confirm.disabled).toBe(true);
    await user.selectOptions(within(dialog).getByRole('combobox'), 'ADMIN');
    await user.type(within(dialog).getByRole('textbox', { name: /السبب/ }), 'مديرة البرنامج الجديدة');
    expect(confirm.disabled).toBe(true);
    await user.type(within(dialog).getByRole('textbox', { name: /رمز المصادقة/ }), '123456');
    await user.click(confirm);
    expect(api.changeUserRole).toHaveBeenCalledWith('u1', { role: 'ADMIN', reason: 'مديرة البرنامج الجديدة', code: '123456' });
  });

  it('suspends with a written reason', async () => {
    const user = userEvent.setup();
    api.suspendUser.mockResolvedValue({});
    renderPage();
    await user.click(await screen.findByRole('button', { name: /إيقاف الحساب/ }));
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByRole('textbox'), 'إساءة متكررة بعد تحذيرين');
    await user.click(within(dialog).getByRole('button', { name: 'إيقاف الحساب' }));
    expect(api.suspendUser).toHaveBeenCalledWith('u1', 'إساءة متكررة بعد تحذيرين');
  });
});
