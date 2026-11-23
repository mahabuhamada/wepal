import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../../i18n/LanguageContext';

vi.mock('../../config', () => ({ USE_API: true }));
vi.mock('../../components/Layout/TopBar', () => ({ default: () => null }));
vi.mock('../../api/distribution', async (importOriginal) => ({
  ...(await importOriginal()),
  listDistributionMembers: vi.fn(),
  listDistributionWorkspaces: vi.fn(),
  assignToWorkspace: vi.fn(),
  removeFromWorkspace: vi.fn(),
  previewDistributionSheet: vi.fn(),
  importDistributionSheet: vi.fn(),
}));
const api = await import('../../api/distribution');
const { default: AdminDistribution } = await import('./AdminDistribution');

const MEMBERS = {
  data: [
    { id: 'u1', name: 'آمنة الرجبي', region: 'WEST_BANK', track: 'INITIATIVES', isActive: true, workspaces: [] },
    { id: 'u2', name: 'محمد القواسمي', region: 'WEST_BANK', track: 'INITIATIVES', isActive: true, workspaces: [] },
    { id: 'u3', name: 'دانة سلهب', region: 'GAZA', track: 'RESEARCH', isActive: false, workspaces: [] },
  ],
  meta: { page: 1, lastPage: 1, counts: { all: 20, unassigned: 3 } },
};
const SPACES = [
  { id: 'p1', title: 'مساحات آمنة للحوار', membersCount: 5, min: 3, max: 8, leaders: ['خالد العارضة'] },
  { id: 'p2', title: 'بودكاست البلدة القديمة', membersCount: 2, min: 3, max: 8, leaders: [] },
];

const renderPage = () => render(<MemoryRouter><LanguageProvider initialLang="ar"><AdminDistribution /></LanguageProvider></MemoryRouter>);

describe('AdminDistribution', () => {
  beforeEach(() => {
    api.listDistributionMembers.mockResolvedValue(MEMBERS);
    api.listDistributionWorkspaces.mockResolvedValue(SPACES);
  });
  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  it('starts with members who have no workspace and shows each workspace capacity', async () => {
    renderPage();
    expect(await screen.findByText('آمنة الرجبي')).toBeTruthy();
    expect(api.listDistributionMembers).toHaveBeenCalledWith(expect.objectContaining({ filter: 'unassigned', page: 1 }));
    expect(screen.getByRole('button', { name: 'بلا مساحة عمل · 3' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByText('5 من 8')).toBeTruthy();
    expect(screen.getByText('تحتاج أعضاء لتصل الحد الأدنى (3)')).toBeTruthy();
  });

  it('adds the selected members to a workspace after a server preview', async () => {
    const user = userEvent.setup();
    const plan = {
      applied: false,
      rows: [{ userId: 'u1', name: 'آمنة الرجبي', status: 'ok' }, { userId: 'u2', name: 'محمد القواسمي', status: 'ok' }],
      counts: { ok: 2, total: 2 },
      workspaces: [{ id: 'p1', title: 'مساحات آمنة للحوار', before: 5, after: 7, max: 8, full: false }],
    };
    api.assignToWorkspace.mockImplementation(async (_p, { dryRun }) => ({ ...plan, applied: !dryRun }));
    renderPage();

    await user.click(await screen.findByRole('checkbox', { name: 'تحديد آمنة الرجبي' }));
    await user.click(screen.getByRole('checkbox', { name: 'تحديد محمد القواسمي' }));
    const bar = screen.getByRole('toolbar', { name: 'إجراءات جماعية' });
    expect(within(bar).getByText('2 محدَّدون')).toBeTruthy();
    await user.click(within(bar).getByRole('button', { name: /أضف إلى مساحة/ }));

    const dialog = await screen.findByRole('dialog', { name: 'أضف إلى مساحة' });
    await user.selectOptions(within(dialog).getByLabelText('المساحة'), 'p1');
    await user.click(within(dialog).getByRole('radio', { name: 'قائد' }));
    await user.click(within(dialog).getByRole('button', { name: 'معاينة' }));

    expect(api.assignToWorkspace).toHaveBeenCalledWith({ userIds: ['u1', 'u2'], projectId: 'p1', role: 'LEADER', fromProjectId: null }, { dryRun: true });
    expect(await within(dialog).findByText('«مساحات آمنة للحوار»: 5 ← 7 من 8')).toBeTruthy();
    await user.click(within(dialog).getByRole('button', { name: 'تأكيد التوزيع' }));

    expect(api.assignToWorkspace).toHaveBeenLastCalledWith(expect.objectContaining({ projectId: 'p1' }), { dryRun: false });
    expect(api.listDistributionMembers).toHaveBeenCalledTimes(2);
  });

  it('blocks saving when the preview takes a team past its limit', async () => {
    const user = userEvent.setup();
    api.assignToWorkspace.mockResolvedValue({
      applied: false,
      rows: [{ userId: 'u1', name: 'آمنة الرجبي', status: 'ok' }],
      counts: { ok: 1, total: 1 },
      workspaces: [{ id: 'p1', title: 'مساحات آمنة للحوار', before: 8, after: 9, max: 8, full: true }],
    });
    renderPage();

    await user.click(await screen.findByRole('checkbox', { name: 'تحديد آمنة الرجبي' }));
    await user.click(screen.getByRole('button', { name: /أضف إلى مساحة/ }));
    const dialog = await screen.findByRole('dialog', { name: 'أضف إلى مساحة' });
    await user.selectOptions(within(dialog).getByLabelText('المساحة'), 'p1');
    await user.click(within(dialog).getByRole('button', { name: 'معاينة' }));

    expect(await within(dialog).findByText(/يتجاوز الحد/)).toBeTruthy();
    expect(within(dialog).getByRole('button', { name: 'تأكيد التوزيع' }).disabled).toBe(true);
  });

  it('offers move and remove only when a workspace is shown', async () => {
    const user = userEvent.setup();
    api.removeFromWorkspace.mockResolvedValue({ applied: false, rows: [{ userId: 'u1', name: 'آمنة الرجبي', status: 'last_leader' }], counts: { last_leader: 1, total: 1 }, workspaces: [] });
    renderPage();

    await user.click(await screen.findByRole('checkbox', { name: 'تحديد آمنة الرجبي' }));
    expect(screen.queryByRole('button', { name: /أزل من المساحة/ })).toBeNull();

    await user.selectOptions(screen.getByLabelText('في مساحة'), 'p1');
    expect(api.listDistributionMembers).toHaveBeenLastCalledWith(expect.objectContaining({ projectId: 'p1', filter: 'all' }));
    await user.click(await screen.findByRole('checkbox', { name: 'تحديد آمنة الرجبي' }));
    await user.click(screen.getByRole('button', { name: /أزل من المساحة/ }));
    const dialog = await screen.findByRole('dialog', { name: 'أزل من المساحة' });
    await user.click(within(dialog).getByRole('button', { name: 'معاينة' }));

    expect(api.removeFromWorkspace).toHaveBeenCalledWith({ userIds: ['u1'], projectId: 'p1' }, { dryRun: true });
    expect(await within(dialog).findByText('القائد الوحيد')).toBeTruthy();
    expect(within(dialog).getByRole('button', { name: 'تأكيد الإزالة' }).disabled).toBe(true);
  });

  it('previews a CSV file row by row and imports only the ready rows', async () => {
    const user = userEvent.setup();
    const preview = {
      rows: [
        { line: 2, identifier: 'amna@example.org', name: 'آمنة الرجبي', workspace: { id: 'p1', title: 'مساحات آمنة للحوار' }, role: 'MEMBER', status: 'ok' },
        { line: 3, identifier: 'ghost@example.org', name: null, workspace: { id: 'p1', title: 'مساحات آمنة للحوار' }, role: 'MEMBER', status: 'unknown_member' },
      ],
      counts: { ok: 1, unknown_member: 1, total: 2 },
      workspaces: [{ id: 'p1', title: 'مساحات آمنة للحوار', before: 5, after: 6, max: 8, full: false }],
    };
    api.previewDistributionSheet.mockResolvedValue(preview);
    api.importDistributionSheet.mockResolvedValue(preview);
    renderPage();

    await user.click(await screen.findByRole('button', { name: /استيراد من ملف CSV/ }));
    const dialog = await screen.findByRole('dialog', { name: 'استيراد توزيع من ملف' });
    const file = new File(['email,workspace\n'], 'd.csv', { type: 'text/csv' });
    await user.upload(within(dialog).getByLabelText('الملف'), file);
    await user.click(within(dialog).getByRole('button', { name: /معاينة/ }));

    expect(await within(dialog).findByText('عضو غير معروف')).toBeTruthy();
    expect(within(dialog).getByText('1 جاهز للحفظ من 2')).toBeTruthy();
    await user.click(within(dialog).getByRole('button', { name: 'وزّع 1' }));
    expect(api.importDistributionSheet).toHaveBeenCalledWith(file);
  });
});
