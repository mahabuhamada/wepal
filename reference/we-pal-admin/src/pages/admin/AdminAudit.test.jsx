import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../../i18n/LanguageContext';

vi.mock('../../config', () => ({ USE_API: true }));
vi.mock('../../components/Layout/TopBar', () => ({ default: () => null }));
vi.mock('../../auth/AuthContext', () => ({ useAuth: () => ({ user: { id: 's1', role: 'SUPER_ADMIN', permissions: ['audit.view', 'audit.export'] } }) }));
vi.mock('../../api/admin', () => ({ listAuditFiltered: vi.fn(), exportAuditCsv: vi.fn() }));
const api = await import('../../api/admin');
const { default: AdminAudit } = await import('./AdminAudit');

describe('AdminAudit', () => {
  afterEach(cleanup);

  it('reads filters from the url, shows the reason, and exports with the same filters', async () => {
    const user = userEvent.setup();
    api.listAuditFiltered.mockResolvedValue({
      data: [{ id: 1, action: 'user.suspend', category: 'admin', outcome: 'success', actor: { id: 'a1', name: 'هلا', role: 'ADMIN' }, meta: { reason: 'إساءة متكررة' }, createdAt: '2026-11-12T10:00:00Z' }],
      meta: { page: 1, lastPage: 1, total: 1 },
    });
    api.exportAuditCsv.mockResolvedValue(10);
    render(<MemoryRouter initialEntries={['/admin/audit?category=admin&action=user.*']}><LanguageProvider initialLang="ar"><AdminAudit /></LanguageProvider></MemoryRouter>);

    expect(await screen.findByText('«إساءة متكررة»')).toBeTruthy();
    expect(api.listAuditFiltered).toHaveBeenCalledWith({ category: 'admin', outcome: '', action: 'user.*', from: '', to: '' }, 1);
    await user.click(screen.getByRole('button', { name: /تصدير CSV/ }));
    expect(api.exportAuditCsv).toHaveBeenCalledWith({ category: 'admin', outcome: '', action: 'user.*', from: '', to: '' });
  });
});
