import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../../i18n/LanguageContext';

vi.mock('../../config', () => ({ USE_API: true }));
vi.mock('../../components/Layout/TopBar', () => ({ default: () => null }));
vi.mock('../../components/Admin/KillSwitchPanel', () => ({ default: () => <p>لوحة الصيانة</p> }));
vi.mock('../../auth/AuthContext', () => ({ useAuth: () => ({ user: { id: 's1', role: 'SUPER_ADMIN', permissions: ['settings.appearance', 'settings.notifications', 'system.maintenance'] } }) }));
vi.mock('../../api/admin', () => ({ getStaffNotifications: vi.fn(), updateStaffNotifications: vi.fn() }));
const api = await import('../../api/admin');
const { default: AdminSettings } = await import('./AdminSettings');

describe('AdminSettings', () => {
  afterEach(cleanup);

  it('shows appearance, staff notifications and security, and saves the chosen roles', async () => {
    const user = userEvent.setup();
    const kinds = { reports: { permission: 'reports.moderate', allowed: ['ADMIN', 'MODERATOR'], roles: ['ADMIN', 'MODERATOR'] } };
    api.getStaffNotifications.mockResolvedValue({ kinds });
    api.updateStaffNotifications.mockResolvedValue({ kinds: { reports: { ...kinds.reports, roles: ['ADMIN'] } } });
    render(<MemoryRouter><LanguageProvider initialLang="ar"><AdminSettings /></LanguageProvider></MemoryRouter>);

    expect(screen.getByRole('link', { name: 'فتح' }).getAttribute('href')).toBe('/admin/appearance');
    expect(screen.getByText('لوحة الصيانة')).toBeTruthy();
    const group = await screen.findByRole('group', { name: 'بلاغ جديد' });
    await user.click(within(group).getAllByRole('checkbox')[1]);
    await user.click(screen.getByRole('button', { name: 'حفظ الإشعارات' }));
    expect(api.updateStaffNotifications).toHaveBeenCalledWith({ reports: ['ADMIN'] });
  });
});
