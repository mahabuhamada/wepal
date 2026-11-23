import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../../i18n/LanguageContext';

vi.mock('../../config', () => ({ USE_API: true }));
vi.mock('../../components/Layout/TopBar', () => ({ default: () => null }));
vi.mock('../../api/admin', () => ({ getAppearance: vi.fn(), updateAppearance: vi.fn() }));
const setTheme = vi.fn();
const setHero = vi.fn();
vi.mock('../../theme/ThemeContext', () => ({ useTheme: () => ({ setTheme, setHero }) }));

const api = await import('../../api/admin');
const { default: AdminAppearance } = await import('./AdminAppearance');

const STATE = { design: 'classic', hero: { mode: 'slider', newsCount: 3, interval: 7 }, updatedAt: '2026-10-20T10:00:00Z' };
const renderPage = () => render(<MemoryRouter><LanguageProvider initialLang="ar"><AdminAppearance /></LanguageProvider></MemoryRouter>);

describe('AdminAppearance', () => {
  beforeEach(() => {
    api.getAppearance.mockReset();
    api.updateAppearance.mockReset();
    setTheme.mockReset();
    setHero.mockReset();
  });
  afterEach(() => {
    cleanup();
  });

  it('يعرض القيم المحفوظة، وزر الحفظ معطّل حتى يتغيّر شيء', async () => {
    api.getAppearance.mockResolvedValue(STATE);
    renderPage();

    const current = await screen.findByRole('radio', { name: /التصميم الحالي/ });
    expect(current.checked).toBe(true);
    expect(screen.getByRole('radio', { name: /سلايدر/ }).checked).toBe(true);
    expect(screen.getByRole('button', { name: 'حفظ الإعدادات' }).disabled).toBe(true);
  });

  it('اختيار التصميم الجديد يرسل التغيير وحده ويطبّق السمة فورًا', async () => {
    api.getAppearance.mockResolvedValue(STATE);
    api.updateAppearance.mockResolvedValue({ ...STATE, design: 'azraq' });
    renderPage();

    fireEvent.click(await screen.findByRole('radio', { name: /أزرق هادئ/ }));
    fireEvent.click(screen.getByRole('button', { name: 'حفظ الإعدادات' }));

    await waitFor(() => expect(api.updateAppearance).toHaveBeenCalledWith({ design: 'azraq' }));
    expect(await screen.findByText('حُفظت الإعدادات.')).toBeTruthy();
    expect(setTheme).toHaveBeenCalledWith('azraq');
    expect(setHero).toHaveBeenCalledWith(STATE.hero);
  });

  it('إعدادات الهيرو: الشكل والعدد والمدة', async () => {
    api.getAppearance.mockResolvedValue(STATE);
    api.updateAppearance.mockResolvedValue({ ...STATE, hero: { mode: 'bento', newsCount: 5, interval: 10 } });
    renderPage();

    fireEvent.click(await screen.findByRole('radio', { name: /شبكة/ }));
    fireEvent.change(screen.getByLabelText('عدد الأخبار في السلايدر'), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText('مدة الشريحة'), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: 'حفظ الإعدادات' }));

    await waitFor(() => expect(api.updateAppearance).toHaveBeenCalledWith({ hero: { mode: 'bento', newsCount: 5, interval: 10 } }));
  });

  it('فشل الحفظ يعرض رسالة الخادم ولا يغيّر السمة', async () => {
    api.getAppearance.mockResolvedValue(STATE);
    api.updateAppearance.mockRejectedValue(new Error('قيمة غير مسموحة'));
    renderPage();

    fireEvent.click(await screen.findByRole('radio', { name: /أزرق هادئ/ }));
    fireEvent.click(screen.getByRole('button', { name: 'حفظ الإعدادات' }));

    expect(await screen.findByText('قيمة غير مسموحة')).toBeTruthy();
    expect(setTheme).not.toHaveBeenCalled();
  });
});
