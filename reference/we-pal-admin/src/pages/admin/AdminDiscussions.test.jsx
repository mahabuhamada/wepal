import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../../i18n/LanguageContext';

vi.mock('../../config', () => ({ USE_API: true }));
vi.mock('../../components/Layout/TopBar', () => ({ default: () => null }));
vi.mock('../../api/admin', () => ({ listDiscussions: vi.fn(), getDiscussion: vi.fn() }));
const api = await import('../../api/admin');
const { default: AdminDiscussions } = await import('./AdminDiscussions');

const renderPage = (url = '/admin/discussions') => render(<MemoryRouter initialEntries={[url]}><LanguageProvider initialLang="ar"><AdminDiscussions /></LanguageProvider></MemoryRouter>);

describe('AdminDiscussions', () => {
  beforeEach(() => { api.listDiscussions.mockReset(); api.getDiscussion.mockReset(); });
  afterEach(cleanup);

  it('lists workspaces without text, and the drawer reads the discussion with the audit note', async () => {
    const user = userEvent.setup();
    api.listDiscussions.mockResolvedValue({
      data: [{ kind: 'workspace', id: 'p1', name: 'مساحة المياه', membersCount: 5, messagesCount: 12, messagesWeek: 3, lastMessageAt: '2026-11-12T10:00:00Z', private: true }],
      meta: { page: 1, lastPage: 1, total: 1, counts: { workspace: 4, group: 7 } },
    });
    api.getDiscussion.mockResolvedValue({ messages: [{ id: 'm1', body: 'نقترح خطة التوزيع', author: { name: 'سامي' }, authorId: 'u1', hidden: false, createdAt: '2026-11-12T10:00:00Z' }] });
    renderPage();

    expect(await screen.findByText('12 رسالة')).toBeTruthy();
    expect(screen.getByRole('tab', { name: /المجموعات/ }).textContent).toContain('7');
    expect(api.listDiscussions).toHaveBeenCalledWith({ kind: 'workspace', q: '', page: 1 });

    await user.click(screen.getByRole('button', { name: 'مساحة المياه' }));
    const drawer = await screen.findByRole('dialog', { name: 'مساحة المياه' });
    expect(await within(drawer).findByText('نقترح خطة التوزيع')).toBeTruthy();
    expect(within(drawer).getByText(/يُسجَّل في سجل التدقيق/)).toBeTruthy();
    expect(api.getDiscussion).toHaveBeenCalledWith('workspace', 'p1');
  });

  it('switches to groups from the url', async () => {
    api.listDiscussions.mockResolvedValue({ data: [], meta: { page: 1, lastPage: 1, total: 0 } });
    renderPage('/admin/discussions?kind=group');
    expect(await screen.findByText('لا نتائج.')).toBeTruthy();
    expect(api.listDiscussions).toHaveBeenCalledWith({ kind: 'group', q: '', page: 1 });
  });
});
