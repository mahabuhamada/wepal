import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../../i18n/LanguageContext';

vi.mock('../../config', () => ({ USE_API: true }));
vi.mock('../../components/Layout/TopBar', () => ({ default: () => null }));
vi.mock('../../api/platform', () => ({ listGroups: vi.fn(), createGroup: vi.fn(), getGroupForEdit: vi.fn(), updateGroup: vi.fn() }));
const api = await import('../../api/platform');
const { default: AdminGroups } = await import('./AdminGroups');

describe('AdminGroups', () => {
  afterEach(cleanup);

  it('lists groups and creates a new one with the shared editor', async () => {
    const user = userEvent.setup();
    api.listGroups.mockResolvedValue([{ id: 'g1', name: { ar: 'مجموعة غزة' }, kind: 'REGION', color: '#2563EB', membersCount: 12, postsCount: 4 }]);
    api.createGroup.mockResolvedValue({ id: 'g2' });
    render(<MemoryRouter><LanguageProvider initialLang="ar"><AdminGroups /></LanguageProvider></MemoryRouter>);

    expect(await screen.findByRole('link', { name: 'مجموعة غزة' })).toBeTruthy();
    expect(screen.getByText('12 عضو')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /مجموعة جديدة/ }));
    const dialog = await screen.findByRole('dialog', { name: 'مجموعة جديدة' });
    await user.type(within(dialog).getByLabelText('الاسم بالعربية'), 'مجموعة الإعلام');
    await user.type(within(dialog).getByLabelText(/المعرّف في الرابط/), 'media');
    // لا مجموعات اهتمام (قرار 17 نوفمبر): الجديدة مسار افتراضيًا، والمسار إلزامي
    await user.selectOptions(within(dialog).getByLabelText('المسار'), 'DIGITAL_CONTENT');
    await user.click([...dialog.querySelectorAll('button')].find((b) => b.type === 'submit'));
    expect(api.createGroup).toHaveBeenCalled();
    expect(api.createGroup.mock.calls[0][0]).toMatchObject({ name: { ar: 'مجموعة الإعلام' }, kind: 'TRACK', track: 'DIGITAL_CONTENT', color: '#2563EB' });
  });
});
