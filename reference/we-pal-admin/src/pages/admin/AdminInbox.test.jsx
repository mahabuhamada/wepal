import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../../i18n/LanguageContext';

vi.mock('../../config', () => ({ USE_API: true }));
vi.mock('../../components/Layout/TopBar', () => ({ default: () => null }));
vi.mock('../../api/admin', () => ({ listContactMessages: vi.fn(), listNewsletterSubscribers: vi.fn() }));
const api = await import('../../api/admin');
const { default: AdminInbox } = await import('./AdminInbox');

const paged = (data, total = data.length) => ({ data, meta: { page: 1, perPage: 20, total, lastPage: 1 } });
const renderInbox = () => render(<MemoryRouter><LanguageProvider initialLang="ar"><AdminInbox /></LanguageProvider></MemoryRouter>);

describe('AdminInbox (B7.2)', () => {
  beforeEach(() => {
    api.listContactMessages.mockReset();
    api.listNewsletterSubscribers.mockReset();
  });
  afterEach(cleanup);

  it('رسائل التواصل: الموضوع والمرسل والنص', async () => {
    api.listContactMessages.mockResolvedValue(paged([{ id: 1, name: 'ليلى', email: 'l@x.ps', subject: 'شراكة', message: 'سطر أول\nسطر ثانٍ', createdAt: '2026-09-30T10:00:00Z' }]));
    renderInbox();
    const list = await screen.findByRole('list', { name: 'رسائل التواصل' });
    expect(within(list).getByText('شراكة')).toBeTruthy();
    expect(within(list).getByRole('link', { name: 'l@x.ps' }).getAttribute('href')).toBe('mailto:l@x.ps');
    expect(within(list).getByText(/سطر أول/).textContent).toBe('سطر أول\nسطر ثانٍ');
    expect(api.listNewsletterSubscribers).not.toHaveBeenCalled();
  });

  it('بريد زائر فيه ?cc= لا يحقن معاملات في رابط mailto', async () => {
    const email = 'a@x.ps?cc=evil@x.ps&subject=x';
    api.listContactMessages.mockResolvedValue(paged([{ id: 2, name: 'زائر', email, subject: 'سؤال', message: 'نص الرسالة', createdAt: '2026-09-30T10:00:00Z' }]));
    renderInbox();
    const link = await screen.findByRole('link', { name: email });
    const href = link.getAttribute('href');
    expect(href).toBe('mailto:a@x.ps%3Fcc%3Devil@x.ps%26subject%3Dx');
    expect(new URL(href).search).toBe('');
  });

  it('تبويب المشتركين: العدد والبريد', async () => {
    const user = userEvent.setup();
    api.listContactMessages.mockResolvedValue(paged([]));
    api.listNewsletterSubscribers.mockResolvedValue(paged([{ id: 1, email: 'a@x.ps', subscribedAt: '2026-09-30T10:00:00Z' }], 42));
    renderInbox();
    expect(await screen.findByText('لا رسائل بعد.')).toBeTruthy();

    await user.click(screen.getByRole('tab', { name: 'مشتركو النشرة' }));
    expect(await screen.findByText('a@x.ps')).toBeTruthy();
    expect(screen.getByText('42 مشترك')).toBeTruthy();
  });
});
