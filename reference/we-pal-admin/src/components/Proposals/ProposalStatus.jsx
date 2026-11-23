import { Badge } from '../common/Badge';
import { useLanguage } from '../../i18n/LanguageContext';

// حالة المقترح نصًا ولونًا معًا (لا تعتمد على اللون وحده).
const TONES = { PENDING: 'info', NEEDS_CHANGES: 'warning', APPROVED: 'success', DECLINED: 'neutral' };

export default function ProposalStatus({ status }) {
  const { t } = useLanguage();
  return <Badge tone={TONES[status]}>{t(`workspaceProposals.status.${status}`)}</Badge>;
}
