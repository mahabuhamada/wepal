import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../../i18n/LanguageContext';

vi.mock('../../config', () => ({ USE_API: true }));
vi.mock('../../components/Layout/TopBar', () => ({ default: () => null }));
vi.mock('../../api/proposals', () => ({
  listAdminProposals: vi.fn(), decideProposal: vi.fn(),
  listAdminChallenges: vi.fn(), createChallenge: vi.fn(), updateChallenge: vi.fn(), launchChallenge: vi.fn(), closeChallenge: vi.fn(),
}));
const api = await import('../../api/proposals');
const { default: AdminProposals } = await import('./AdminProposals');

const proposal = {
  id: 'x1', title: 'قاعدة بيانات القوائم', track: 'RESEARCH', description: 'نجمع القوائم الشبابية.', expectedOutput: 'ورقة',
  status: 'PENDING', proposer: { id: 'u1', name: 'سارة أحمد' }, createdAt: '2026-11-01T10:00:00Z',
};
const challenge = {
  id: 'c1', title: 'المعلومة الموثوقة', track: 'RESEARCH', description: 'كيف يصل الشباب في الشتات إلى المعلومة الموثوقة؟',
  minMembers: 3, maxMembers: 6, closesAt: '2026-11-15', status: 'OPEN', participantsCount: 2, projectId: null,
  participants: [{ id: 'u1', name: 'سارة أحمد' }, { id: 'u2', name: 'ليث' }],
};

const renderPage = (entry = '/admin/proposals') =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      <LanguageProvider initialLang="ar">
        <AdminProposals />
      </LanguageProvider>
    </MemoryRouter>,
  );

describe('AdminProposals', () => {
  afterEach(cleanup);

  it('المقترحات بانتظار القرار أولًا، مع العدد في المرشّح', async () => {
    api.listAdminProposals.mockResolvedValue({ data: [proposal], meta: { counts: { PENDING: 1, APPROVED: 4 } } });
    renderPage();
    expect(await screen.findByText('قاعدة بيانات القوائم')).toBeTruthy();
    expect(api.listAdminProposals).toHaveBeenCalledWith({ status: 'PENDING' });
    expect(screen.getByRole('button', { name: 'بانتظار المراجعة (1)' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'معتمد (4)' })).toBeTruthy();
  });

  it('الاعتذار يحتاج سببًا، ثم يُرسل القرار', async () => {
    api.listAdminProposals.mockResolvedValue({ data: [proposal], meta: { counts: { PENDING: 1 } } });
    api.decideProposal.mockResolvedValue({ ...proposal, status: 'DECLINED' });
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /اعتذار/ }));
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'أرسل القرار' }));
    expect(within(dialog).getByRole('alert').textContent).toBe('اكتب الملاحظة أو السبب.');
    expect(api.decideProposal).not.toHaveBeenCalled();

    fireEvent.change(within(dialog).getByRole('textbox'), { target: { value: 'تكرر مساحة جارية' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'أرسل القرار' }));
    await vi.waitFor(() => expect(api.decideProposal).toHaveBeenCalledWith('x1', 'decline', 'تكرر مساحة جارية'));
  });

  it('الموافقة بلا ملاحظة', async () => {
    api.listAdminProposals.mockResolvedValue({ data: [proposal], meta: { counts: {} } });
    api.decideProposal.mockResolvedValue({ ...proposal, status: 'APPROVED', projectId: 'p1' });
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /موافقة/ }));
    expect(screen.getByText(/ويصير سارة أحمد قائدها/)).toBeTruthy();
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'أرسل القرار' }));
    await vi.waitFor(() => expect(api.decideProposal).toHaveBeenCalledWith('x1', 'approve', ''));
  });

  it('درج المراجعة: المقترح كاملًا، والقرار من داخله', async () => {
    api.listAdminProposals.mockResolvedValue({ data: [proposal], meta: { counts: { PENDING: 1 } } });
    api.decideProposal.mockResolvedValue({ ...proposal, status: 'APPROVED', projectId: 'p1' });
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'عرض المقترح' }));
    const drawer = screen.getByRole('complementary', { name: 'مراجعة المقترح' });
    expect(within(drawer).getByText(proposal.description)).toBeTruthy();
    fireEvent.click(within(drawer).getByRole('button', { name: /موافقة/ }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'أرسل القرار' }));
    await vi.waitFor(() => expect(api.decideProposal).toHaveBeenCalledWith('x1', 'approve', ''));
  });

  it('تبويب التحديات: المنضمون، والفتح باختيار القائد', async () => {
    api.listAdminChallenges.mockResolvedValue({ data: [challenge] });
    api.launchChallenge.mockResolvedValue({ ...challenge, status: 'LAUNCHED', projectId: 'p2' });
    renderPage('/admin/proposals?tab=challenges');
    expect(await screen.findByText('المعلومة الموثوقة')).toBeTruthy();
    expect(screen.getByText('سارة أحمد، ليث')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /افتح المساحة الآن/ }));
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByRole('combobox'), { target: { value: 'u2' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'افتح المساحة' }));
    await vi.waitFor(() => expect(api.launchChallenge).toHaveBeenCalledWith('c1', 'u2'));
    expect(await screen.findByText('فُتحت مساحته')).toBeTruthy();
  });

  it('طرح تحدٍّ: التحقق قبل الإرسال', async () => {
    api.listAdminChallenges.mockResolvedValue({ data: [] });
    renderPage('/admin/proposals?tab=challenges');
    fireEvent.click(await screen.findByRole('button', { name: /اطرح تحديًا/ }));
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'اطرح التحدي' }));
    expect(within(dialog).getAllByRole('alert').length).toBeGreaterThan(0);
    expect(api.createChallenge).not.toHaveBeenCalled();
  });
});
