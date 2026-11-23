import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LanguageProvider } from '../../../i18n/LanguageContext';

vi.mock('../../../api/admin', () => ({ previewInvitationSheet: vi.fn(), importInvitationSheet: vi.fn() }));
const api = await import('../../../api/admin');
const { default: SheetInviteDialog } = await import('./SheetInviteDialog');

describe('SheetInviteDialog', () => {
  afterEach(cleanup);

  it('previews each row with its status, then creates the ready ones with SMS', async () => {
    const user = userEvent.setup();
    const onDone = vi.fn();
    api.previewInvitationSheet.mockResolvedValue({
      rows: [{ line: 2, name: 'سلمى', phoneMask: '+970 59 ••• •832', status: 'ok' }, { line: 3, name: 'خطأ', phoneMask: null, status: 'invalid_phone' }],
      counts: { ok: 1, invalid_phone: 1, total: 2 },
    });
    api.importInvitationSheet.mockResolvedValue({ created: 1, smsSent: 1, smsFailed: [], skipped: [] });
    render(<LanguageProvider initialLang="ar"><SheetInviteDialog cohorts={[{ key: '2026-fall', name: 'خريف 2026' }]} onClose={() => {}} onDone={onDone} /></LanguageProvider>);

    const dialog = screen.getByRole('dialog', { name: 'دعوات من ورقة' });
    const file = new File(['name,phone\nسلمى,0599123832'], 'a.csv', { type: 'text/csv' });
    await user.upload(dialog.querySelector('input[type="file"]'), file);
    await user.click(within(dialog).getByRole('button', { name: /معاينة/ }));

    expect(await within(dialog).findByText('رقم غير صالح')).toBeTruthy();
    expect(api.previewInvitationSheet).toHaveBeenCalledWith(file, { region: 'GAZA', cohort: '2026-fall', sendSms: true });
    await user.click(within(dialog).getByRole('button', { name: 'إنشاء 1 دعوة' }));
    expect(await within(dialog).findByText('أُنشئت 1 دعوة، وأُرسلت 1 رسالة.')).toBeTruthy();
    expect(onDone).toHaveBeenCalled();
  });
});
