import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../../i18n/LanguageContext';

// القرار 1 (docs/ROLES.md): اختيار الدور يعرض ما يحق للمدير تعيينه فقط (assignableRoles من /me)،
// وصفوف «مدير» و«مدير عام» مقفلة لمن لا يعيّن المدراء. الخادم يفرض القاعدة نفسها.
vi.mock('../../config', () => ({ USE_API: true }));
vi.mock('../../components/Layout/TopBar', () => ({ default: () => null }));
const auth = vi.hoisted(() => ({ user: null }));
vi.mock('../../auth/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('../../api/admin', () => ({
  listUsers: vi.fn(), updateUser: vi.fn(), listInvitations: vi.fn(async () => ({ data: [], meta: {}, summary: {} })),
  generateInvitations: vi.fn(), revokeInvitation: vi.fn(),
}));
const api = await import('../../api/admin');
const { default: AdminUsers } = await import('./AdminUsers');

const ROWS = [
  { id: 'u1', name: 'سارة', email: 's@x.dev', region: 'GAZA', role: 'MEMBER', isActive: true, createdAt: '2026-09-01T10:00:00Z' },
  { id: 'u2', name: 'خالد', email: 'k@x.dev', region: 'GAZA', role: 'ADMIN', isActive: true, createdAt: '2026-09-01T10:00:00Z' },
];
const PROGRAM_MANAGER = { id: 'a1', role: 'ADMIN', permissions: ['users.view', 'users.manage'], assignableRoles: ['MEMBER', 'MODERATOR', 'FACILITATOR', 'EDITOR'] };
const SUPER = { id: 's1', role: 'SUPER_ADMIN', permissions: ['users.view', 'users.manage', 'roles.assign_admins'], assignableRoles: ['MEMBER', 'MODERATOR', 'FACILITATOR', 'EDITOR', 'ADMIN', 'SUPER_ADMIN'] };

const values = (select) => within(select).getAllByRole('option').map((o) => o.value);

async function renderAs(me) {
  auth.user = me;
  api.listUsers.mockResolvedValue({ data: ROWS, meta: { total: 2, page: 1, perPage: 25 } });
  render(<MemoryRouter><LanguageProvider initialLang="ar"><AdminUsers /></LanguageProvider></MemoryRouter>);
  return [await screen.findByRole('combobox', { name: 'دور سارة' }), screen.getByRole('combobox', { name: 'دور خالد' })];
}

afterEach(cleanup);

describe('AdminUsers — اختيار الدور حسب الصلاحية', () => {
  it('مدير البرنامج: أدوار ما تحت «مدير» فقط، وصف المدير مقفل', async () => {
    const [member, admin] = await renderAs(PROGRAM_MANAGER);

    expect(values(member)).toEqual(['MEMBER', 'MODERATOR', 'FACILITATOR', 'EDITOR']);
    expect(member.disabled).toBe(false);
    expect(within(member).getByRole('option', { name: 'محرر' })).toBeTruthy();
    expect(within(member).getByRole('option', { name: 'ميسّر' })).toBeTruthy();

    expect(values(admin)).toEqual(['ADMIN']);
    expect(admin.disabled).toBe(true);
    const adminRow = admin.closest('tr');
    expect(within(adminRow).getByRole('button', { name: /خالد/ }).disabled).toBe(true);
  });

  it('المدير العام: كل الأدوار، ويعدّل صف المدير', async () => {
    const [member, admin] = await renderAs(SUPER);

    expect(values(member)).toEqual(['MEMBER', 'MODERATOR', 'FACILITATOR', 'EDITOR', 'ADMIN', 'SUPER_ADMIN']);
    expect(within(member).getByRole('option', { name: 'مدير عام' })).toBeTruthy();
    expect(admin.disabled).toBe(false);
  });

  it('مرشّح الدور يعرض الأدوار الستة', async () => {
    await renderAs(SUPER);
    expect(values(screen.getByRole('combobox', { name: 'تصفية حسب الدور' })))
      .toEqual(['', 'MEMBER', 'MODERATOR', 'FACILITATOR', 'EDITOR', 'ADMIN', 'SUPER_ADMIN']);
  });
});
