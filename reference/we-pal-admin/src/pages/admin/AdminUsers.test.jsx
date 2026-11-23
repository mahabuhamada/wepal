import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../../i18n/LanguageContext';

vi.mock('../../config', () => ({ USE_API: true }));
vi.mock('../../components/Layout/TopBar', () => ({ default: () => null }));
vi.mock('../../auth/AuthContext', () => ({ useAuth: () => ({ user: { id: 'a1', role: 'ADMIN' } }) }));
vi.mock('../../api/admin', () => ({
  listUsers: vi.fn(async () => ({ data: [], meta: { page: 1, perPage: 20, total: 0, lastPage: 1 } })),
  updateUser: vi.fn(),
  listInvitations: vi.fn(),
  generateInvitations: vi.fn(),
  revokeInvitation: vi.fn(),
}));
const api = await import('../../api/admin');
const { default: AdminUsers } = await import('./AdminUsers');

const renderPage = (url = '/admin/users') => render(<MemoryRouter initialEntries={[url]}><LanguageProvider initialLang="ar"><AdminUsers /></LanguageProvider></MemoryRouter>);

// أكواد الدعوة انتقلت إلى «الدعوات» (/admin/invitations، اختباراتها في AdminInvitations.test.jsx):
// صفحة المستخدمين فيها رابط إليها فقط، ولا تطلب الأكواد.
describe('AdminUsers — رابط دفعات الدعوة', () => {
  beforeEach(() => api.listInvitations.mockReset());
  afterEach(cleanup);

  it('يعرض رابطًا إلى /admin/invitations بدل قسم الدعوات القديم', async () => {
    renderPage();
    const link = await screen.findByRole('link', { name: 'افتح الدعوات' });
    expect(link.getAttribute('href')).toBe('/admin/invitations');
    expect(screen.getByRole('heading', { name: 'أكواد الدعوة صارت في صفحة «الدعوات»' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'توليد' })).toBeNull();
    expect(api.listInvitations).not.toHaveBeenCalled();
  });
});

// بطاقة «النشطون آخر 30 يومًا» (نظرة المستخدمين والرئيسية) تفتح القائمة مرشَّحة، والشريحة تزيل المرشّح
describe('AdminUsers — مرشّح النشاط من الرابط', () => {
  afterEach(cleanup);

  it('?seen=30 يصل إلى الطلب، وإزالة الشريحة تعيد القائمة كلها', async () => {
    renderPage('/admin/users?seen=30');
    const chip = await screen.findByRole('button', { name: 'إزالة المرشّح: نشطون آخر 30 يومًا' });
    expect(api.listUsers).toHaveBeenLastCalledWith(expect.objectContaining({ seen: '30', participated: '' }));
    await userEvent.setup().click(chip);
    expect(api.listUsers).toHaveBeenLastCalledWith(expect.objectContaining({ seen: '' }));
    expect(screen.queryByRole('button', { name: /إزالة المرشّح/ })).toBeNull();
  });
});
