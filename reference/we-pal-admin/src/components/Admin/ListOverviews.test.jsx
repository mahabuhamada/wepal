import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../../i18n/LanguageContext';

vi.mock('../../config', () => ({ USE_API: true }));
const theme = vi.hoisted(() => ({ current: 'azraq' }));
vi.mock('../../theme/ThemeContext', () => ({ useTheme: () => ({ theme: theme.current }) }));
vi.mock('../../api/admin', () => ({ getLibrarySummary: vi.fn(), getProposalsSummary: vi.fn(), getSearchQueriesSummary: vi.fn() }));
const api = await import('../../api/admin');
const { LibraryOverview, ProposalsOverview, SearchQueriesOverview } = await import('./ListOverviews');

const wrap = (ui) => render(<MemoryRouter><LanguageProvider initialLang="ar">{ui}</LanguageProvider></MemoryRouter>);

describe('ListOverviews', () => {
  afterEach(() => { cleanup(); theme.current = 'azraq'; });

  it('shows the library band with readable type labels', async () => {
    api.getLibrarySummary.mockResolvedValue({
      tiles: [{ key: 'downloads', value: 15, scope: 'total', source: 'x', to: '/admin/library' }],
      charts: [{ key: 'byType', kind: 'bars', items: [{ key: 'GUIDE', value: 2 }] }],
      empty: false,
    });
    wrap(<LibraryOverview status="published" />);
    expect(await screen.findByText('التنزيلات')).toBeTruthy();
    expect(api.getLibrarySummary).toHaveBeenCalledWith({ status: 'published' });
  });

  it('shows the search questions band with the filters in its scope and «unknown» askers', async () => {
    api.getSearchQueriesSummary.mockResolvedValue({
      tiles: [
        { key: 'unanswered', value: 4, scope: 'filters', source: 'x', to: '/admin/search-queries?status=unanswered' },
        { key: 'askers', value: null, scope: 'filters', source: 'y', to: '/admin/search-queries' },
      ],
      charts: [
        { key: 'bySource', kind: 'bars', items: [{ key: 'library', value: 3 }] },
        { key: 'topQuestions', kind: 'bars', items: [{ key: 'الدستور', label: 'الدستور', value: 2 }] },
      ],
      empty: false,
    });
    wrap(<SearchQueriesOverview month="2026-11" source="library" area="public" status="unanswered" />);
    expect(await screen.findByText('أسئلة بلا جواب')).toBeTruthy();
    expect(screen.getByText('غير معروف')).toBeTruthy();
    expect(screen.getByText('بلا جواب · بحث المكتبة · زائر')).toBeTruthy();
    expect(screen.getByText('الدستور')).toBeTruthy();
    expect(api.getSearchQueriesSummary).toHaveBeenCalledWith({ month: '2026-11', source: 'library', area: 'public', status: 'unanswered' });
  });

  it('renders nothing in the classic design', () => {
    theme.current = 'classic';
    const { container } = wrap(<ProposalsOverview status="PENDING" />);
    expect(container.textContent).toBe('');
  });
});
