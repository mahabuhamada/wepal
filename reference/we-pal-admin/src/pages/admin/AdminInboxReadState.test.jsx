import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../../i18n/LanguageContext';

// حالة القراءة في الوارد (PR 212): عدد غير المقروءة على التبويب وفي الشريط الجانبي (بالسمتين)،
// وترشيح الكل/غير المقروءة/المقروءة، وزر التعليم لكل رسالة وإعلان ناتجه — ولا شيء من ذلك مع خادم أقدم.
const theme = vi.hoisted(() => ({ current: 'classic' }));
vi.mock('../../theme/ThemeContext', () => ({ useTheme: () => ({ theme: theme.current, setTheme: () => {}, setHero: () => {} }) }));
vi.mock('../../config', () => ({ USE_API: true, FEATURES: {} }));
const auth = vi.hoisted(() => ({ user: { id: 'a1', name: 'مدير', role: 'ADMIN' } }));
vi.mock('../../auth/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('../../components/Layout/TopBar', () => ({ default: () => null }));
vi.mock('../../api/admin', () => ({ listContactMessages: vi.fn(), markContactMessage: vi.fn(), listNewsletterSubscribers: vi.fn(), getInboxUnreadCount: vi.fn() }));

const api = await import('../../api/admin');
const { setInboxUnread } = await import('../../hooks/useInboxUnread');
const { AdminNoticeProvider, AdminNoticeRegion } = await import('../../components/Admin/AdminNotice');
const { default: AdminInbox } = await import('./AdminInbox');
const { default: Sidebar } = await import('../../components/Layout/Sidebar');
const { default: AdminSidebarAzraq } = await import('../../components/Layout/AdminSidebarAzraq');

const MESSAGES = [
  { id: 'm1', name: 'ليلى', email: 'l@x.ps', subject: 'شراكة', message: 'نص', createdAt: '2026-10-20T10:00:00Z', readAt: null, readBy: null },
  { id: 'm2', name: 'سامر', email: 's@x.ps', subject: 'سؤال', message: 'نص آخر', createdAt: '2026-10-19T10:00:00Z', readAt: '2026-10-20T12:00:00Z', readBy: { id: 'a2', name: 'منى' } },
];
const paged = (data, extra = {}) => ({ data, meta: { page: 1, perPage: 20, total: data.length, lastPage: 1, ...extra } });

const renderInbox = (lang = 'ar') => render(
  <MemoryRouter>
    <LanguageProvider initialLang={lang}>
      <AdminNoticeProvider>
        <AdminInbox />
        <AdminNoticeRegion />
      </AdminNoticeProvider>
    </LanguageProvider>
  </MemoryRouter>,
);
const announced = () => document.querySelector('[role="status"][aria-live="polite"]')?.textContent ?? '';

beforeEach(() => {
  theme.current = 'classic';
  auth.user = { id: 'a1', name: 'مدير', role: 'ADMIN' };
  Object.values(api).forEach((fn) => fn.mockReset());
  setInboxUnread(null);
  localStorage.clear();
});
afterEach(cleanup);

describe('الوارد مع خادم قبل حالة القراءة', () => {
  it('لا عدد ولا ترشيح ولا أزرار تعليم', async () => {
    api.listContactMessages.mockResolvedValue(paged([{ id: 1, name: 'ليلى', email: 'l@x.ps', subject: 'شراكة', message: 'نص', createdAt: '2026-10-20T10:00:00Z' }]));
    renderInbox();
    await screen.findByText('شراكة');
    expect(screen.getByRole('tab', { name: 'رسائل التواصل' })).toBeTruthy();
    expect(screen.queryByRole('group', { name: 'ترشيح الرسائل حسب القراءة' })).toBeNull();
    expect(screen.queryByRole('button', { name: /تعليم/ })).toBeNull();
    expect(api.listContactMessages).toHaveBeenCalledWith(1, {});
  });
});

describe('الوارد بحالة القراءة', () => {
  it('العدد على التبويب، والحالة نصًا لكل رسالة، ومن قرأها ومتى', async () => {
    api.listContactMessages.mockResolvedValue(paged(MESSAGES, { unreadCount: 3 }));
    renderInbox();
    expect(await screen.findByRole('tab', { name: 'رسائل التواصل، 3 غير مقروءة' })).toBeTruthy();
    const items = within(screen.getByRole('list', { name: 'رسائل التواصل' })).getAllByRole('listitem');
    expect(items[0].getAttribute('data-unread')).toBe('true');
    expect(within(items[0]).getByText('غير مقروءة')).toBeTruthy();
    expect(within(items[0]).getByRole('button', { name: 'تعليم كمقروءة: شراكة' })).toBeTruthy();
    expect(items[1].getAttribute('data-unread')).toBe('false');
    expect(within(items[1]).getByText(/^مقروءة · .+ · منى$/)).toBeTruthy();
    expect(within(items[1]).getByRole('button', { name: 'تعليم كغير مقروءة: سؤال' })).toBeTruthy();
  });

  it('الترشيح: aria-pressed، ويطلب status من الخادم، ويبقى التركيز على الزر، وحالة فارغة خاصة', async () => {
    const user = userEvent.setup();
    api.listContactMessages
      .mockResolvedValueOnce(paged(MESSAGES, { unreadCount: 1 }))
      .mockResolvedValueOnce(paged([], { unreadCount: 0 }));
    renderInbox();
    const group = await screen.findByRole('group', { name: 'ترشيح الرسائل حسب القراءة' });
    expect(within(group).getByRole('button', { name: 'الكل' }).getAttribute('aria-pressed')).toBe('true');

    const unreadChip = within(group).getByRole('button', { name: 'غير المقروءة' });
    await user.click(unreadChip);
    expect(api.listContactMessages).toHaveBeenLastCalledWith(1, { status: 'unread' });
    expect(await screen.findByText('لا رسائل غير مقروءة.')).toBeTruthy();
    const chipAfter = screen.getByRole('button', { name: 'غير المقروءة' });
    expect(chipAfter.getAttribute('aria-pressed')).toBe('true');
    expect(document.activeElement).toBe(chipAfter);
    // العدد صفر: لا شارة
    expect(screen.getByRole('tab', { name: 'رسائل التواصل' })).toBeTruthy();
  });

  it('التعليم كمقروءة: يُستبدل العنصر في مكانه، وينقص العدد، ويُعلَن الناتج، ويعود الزر لعكسه', async () => {
    const user = userEvent.setup();
    api.listContactMessages.mockResolvedValue(paged(MESSAGES, { unreadCount: 3 }));
    api.markContactMessage.mockResolvedValue({ ...MESSAGES[0], readAt: '2026-10-21T09:00:00Z', readBy: { id: 'a1', name: 'مدير' } });
    renderInbox();

    const button = await screen.findByRole('button', { name: 'تعليم كمقروءة: شراكة' });
    await user.click(button);
    expect(api.markContactMessage).toHaveBeenCalledWith('m1', true);
    expect(await screen.findByRole('button', { name: 'تعليم كغير مقروءة: شراكة' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'رسائل التواصل، 2 غير مقروءة' })).toBeTruthy();
    expect(announced()).toBe('عُلّمت «شراكة» مقروءة.');
    const first = within(screen.getByRole('list', { name: 'رسائل التواصل' })).getAllByRole('listitem')[0];
    expect(first.getAttribute('data-unread')).toBe('false');
    expect(within(first).getByText(/^مقروءة · .+ · مدير$/)).toBeTruthy();
  });

  it('التعليم كغير مقروءة يزيد العدد؛ وتكرار الحالة نفسها لا يغيّره', async () => {
    const user = userEvent.setup();
    api.listContactMessages.mockResolvedValue(paged(MESSAGES, { unreadCount: 1 }));
    api.markContactMessage.mockResolvedValueOnce({ ...MESSAGES[1], readAt: null, readBy: null });
    renderInbox();
    await user.click(await screen.findByRole('button', { name: 'تعليم كغير مقروءة: سؤال' }));
    expect(await screen.findByRole('tab', { name: 'رسائل التواصل، 2 غير مقروءة' })).toBeTruthy();
    expect(announced()).toBe('عُلّمت «سؤال» غير مقروءة.');

    // الخادم يُرجع العنصر كما هو (مقروء أصلًا من جلسة أخرى): لا تغيير في العدد
    api.markContactMessage.mockResolvedValueOnce({ ...MESSAGES[0] });
    await user.click(screen.getByRole('button', { name: 'تعليم كمقروءة: شراكة' }));
    await waitFor(() => expect(api.markContactMessage).toHaveBeenCalledTimes(2));
    expect(screen.getByRole('tab', { name: 'رسائل التواصل، 2 غير مقروءة' })).toBeTruthy();
  });

  it('فشل التعليم: رسالة خطأ مرتبطة بالزر، والحالة لا تتغير', async () => {
    const user = userEvent.setup();
    api.listContactMessages.mockResolvedValue(paged(MESSAGES, { unreadCount: 1 }));
    api.markContactMessage.mockRejectedValue(new Error('الخادم مشغول.'));
    renderInbox();
    const button = await screen.findByRole('button', { name: 'تعليم كمقروءة: شراكة' });
    await user.click(button);
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toBe('تعذّر تحديث حالة «شراكة». الخادم مشغول.');
    expect(button.getAttribute('aria-describedby')).toBe(alert.id);
    expect(screen.getByRole('tab', { name: 'رسائل التواصل، 1 غير مقروءة' })).toBeTruthy();
    expect(document.activeElement).toBe(button);
  });

  it('بالإنجليزية', async () => {
    api.listContactMessages.mockResolvedValue(paged(MESSAGES, { unreadCount: 120 }));
    renderInbox('en');
    const tab = await screen.findByRole('tab', { name: 'Contact messages, 120 unread' });
    expect(within(tab).getByText('99+')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Mark as read: شراكة' })).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Filter messages by read state' })).toBeTruthy();
  });
});

describe('عدد غير المقروءة في الشريط الجانبي', () => {
  const renderSide = (element, path = '/admin/library') => render(
    <MemoryRouter initialEntries={[path]}><LanguageProvider initialLang="ar">{element}</LanguageProvider></MemoryRouter>,
  );

  // الاسم في «أزرق هادئ»: «الوارد» (أسماء أقسام اللوحة الجديدة)، وفي التصميم الحالي «صندوق الوارد»
  it.each([
    ['التصميم الحالي', 'classic', <Sidebar key="c" />, 'صندوق الوارد'],
    ['أزرق هادئ', 'azraq', <AdminSidebarAzraq key="a" />, 'الوارد'],
  ])('%s: يجلب العدد وحده (بلا رسالة) ويعرضه ضمن اسم رابط الوارد', async (_name, themeName, element, label) => {
    theme.current = themeName;
    localStorage.setItem('wepal-token', 'test-token');
    api.getInboxUnreadCount.mockResolvedValue({ unreadCount: 4 });
    renderSide(element);
    expect(await screen.findByRole('link', { name: `${label}، 4 غير مقروءة` })).toBeTruthy();
    expect(api.getInboxUnreadCount).toHaveBeenCalled();
    expect(api.listContactMessages).not.toHaveBeenCalled();

    // التعليم في الصفحة يحدّث الشريط فورًا (مصدر واحد)
    act(() => setInboxUnread(3));
    expect(screen.getByRole('link', { name: `${label}، 3 غير مقروءة` })).toBeTruthy();
  });

  it('خادم قبل حالة القراءة، أو صفر: لا شارة', async () => {
    localStorage.setItem('wepal-token', 'test-token');
    api.getInboxUnreadCount.mockResolvedValue({});
    renderSide(<Sidebar />);
    await waitFor(() => expect(api.getInboxUnreadCount).toHaveBeenCalled());
    expect(screen.getByRole('link', { name: 'صندوق الوارد' })).toBeTruthy();
    act(() => setInboxUnread(0));
    expect(screen.getByRole('link', { name: 'صندوق الوارد' })).toBeTruthy();
  });

  it('المشرف (بلا وصول للوارد) وبلا توكن: لا طلب', async () => {
    auth.user = { id: 'm1', name: 'مشرف', role: 'MODERATOR' };
    localStorage.setItem('wepal-token', 'test-token');
    renderSide(<Sidebar />, '/admin/reports');
    cleanup();
    auth.user = { id: 'a1', name: 'مدير', role: 'ADMIN' };
    localStorage.clear();
    renderSide(<AdminSidebarAzraq />);
    await new Promise((r) => setTimeout(r, 0));
    expect(api.getInboxUnreadCount).not.toHaveBeenCalled();
  });
});
