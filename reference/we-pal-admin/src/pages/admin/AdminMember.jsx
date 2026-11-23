import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, Ban, CheckCircle2, KeyRound, ShieldCheck, UserCog } from 'lucide-react';
import TopBar from '../../components/Layout/TopBar';
import ErrorState from '../../components/common/ErrorState';
import Modal from '../../components/common/Modal';
import Field from '../../components/ui/Field';
import { Input, Select } from '../../components/ui/Input';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../auth/AuthContext';
import { USE_API } from '../../config';
import * as adminApi from '../../api/admin';
import { useAdminNotice } from '../../components/Admin/adminNoticeContext';
import { assignableRoles, roleLabelKey } from '../../utils/roles';
import { formatShortDate, regionLabel, relativeTime } from '../../utils/apiMappers';

const ADMIN_LEVEL = ['ADMIN', 'SUPER_ADMIN'];
const ACTIVITY = ['workspaces', 'comments', 'groupPosts', 'ideas', 'reportsAgainst', 'reportsMade', 'active30'];

/**
 * صفحة العضو (360، خطة لوحة الإدارة 4.6 والمرحلة 4): البيانات، والنشاط، وما فعله الطاقم بحسابه،
 * و«تغيير الدور» بسبب ورمز تحقق، و«إيقاف» بسبب. فتح الصفحة يُسجَّل في التدقيق (الخادم).
 */
export default function AdminMember() {
  const { t } = useLanguage();
  if (!USE_API) {
    return <div><TopBar title={t('adminMembers.back')} /><div className="azq-list"><p className="azq-empty">—</p></div></div>;
  }
  return <ApiAdminMember />;
}

function ApiAdminMember() {
  const { id } = useParams();
  const { t, lang } = useLanguage();
  const { user: me } = useAuth();
  const notify = useAdminNotice();
  const [member, setMember] = useState(null);
  const [error, setError] = useState(null);
  const [dialog, setDialog] = useState(null); // 'role' | 'suspend'

  const load = useCallback(async () => {
    try {
      setMember(await adminApi.getMember(id));
      setError(null);
    } catch (err) {
      setError(err);
    }
  }, [id]);
  useEffect(() => {
    let live = true;
    adminApi.getMember(id).then((m) => { if (live) { setMember(m); setError(null); } }).catch((e) => live && setError(e));
    return () => { live = false; };
  }, [id]);

  const reactivate = async () => {
    await adminApi.reactivateUser(id);
    notify(t('adminMembers.notice.reactivated'));
    await load();
  };

  if (error) return <div><TopBar title={t('adminMembers.back')} /><div className="azq-list"><ErrorState error={error} onRetry={load} /></div></div>;
  if (!member) return <div><TopBar title={t('adminMembers.back')} /><div className="azq-list"><div className="azq-skel" role="status" aria-busy="true" /></div></div>;

  const facts = [
    ['email', <span dir="ltr">{member.email}</span>],
    ['region', regionLabel(member.region, lang)],
    ['role', t(roleLabelKey(member.role))],
    ['status', <span className={`azq-pill ${member.isActive ? 'is-ok' : 'is-danger'}`}>{t(member.isActive ? 'adminMembers.active' : 'adminMembers.suspended')}</span>],
    ['twoFactor', <span className={`azq-pill ${member.twoFactor ? 'is-ok' : 'is-warn'}`}>{t(member.twoFactor ? 'adminMembers.on' : 'adminMembers.off')}</span>],
    ['joined', formatShortDate(member.createdAt, lang)],
    ['lastActive', member.lastActiveAt ? relativeTime(member.lastActiveAt, lang, t) : t('adminMembers.never')],
    ['points', member.points],
  ];

  return (
    <div>
      <TopBar title={member.name} />
      <div className="azq-list">
        <Link to="/admin/users" className="azq-band-sc"><ArrowRight size={14} aria-hidden="true" style={{ display: 'inline', verticalAlign: '-2px' }} /> {t('adminMembers.back')}</Link>
        <header className="azq-list-head">
          <div>
            <h2>{member.name}</h2>
            <p>{t('adminMembers.lead')}</p>
          </div>
          {member.canManage ? (
            <div className="azq-toolbar">
              <Button variant="secondary" onClick={() => setDialog('role')}><UserCog aria-hidden="true" /> {t('adminMembers.changeRole')}</Button>
              {member.isActive
                ? <Button variant="danger" onClick={() => setDialog('suspend')}><Ban aria-hidden="true" /> {t('adminMembers.suspend')}</Button>
                : <Button onClick={reactivate}><CheckCircle2 aria-hidden="true" /> {t('adminMembers.reactivate')}</Button>}
              {member.canResetTwoFactor && <Button variant="secondary" onClick={() => setDialog('reset2fa')}><KeyRound aria-hidden="true" /> {t('adminMembers.reset2fa')}</Button>}
            </div>
          ) : <p className="azq-band-sc">{t('adminMembers.cannotManage')}</p>}
        </header>

        <section className="azq-band" style={{ padding: 16 }}>
          <dl className="azq-dl">
            {facts.map(([k, v]) => <FactRow key={k} label={t(`adminMembers.facts.${k}`)} value={v} />)}
          </dl>
        </section>

        <section aria-labelledby="mem-act">
          <h3 id="mem-act" className="azq-drawer-sec" style={{ fontWeight: 700, marginBottom: 8 }}>{t('adminMembers.activityTitle')}</h3>
          <div className="azq-band-k">
            {ACTIVITY.map((k) => (
              <div key={k} className="azq-kpi is-sm" data-path={k === 'reportsAgainst' && member.activity[k] > 0 ? 'vote' : 'none'}>
                <span className="azq-kpi-label">{t(`adminMembers.activity.${k}`)}</span>
                <span className="azq-kpi-value">{member.activity[k]}</span>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="mem-hist">
          <h3 id="mem-hist" style={{ fontWeight: 700, marginBottom: 8 }}><ShieldCheck size={16} aria-hidden="true" style={{ display: 'inline', verticalAlign: '-3px' }} /> {t('adminMembers.historyTitle')}</h3>
          {member.history.length === 0 ? <p className="azq-empty">{t('adminMembers.noHistory')}</p> : (
            <ul className="azq-lrows">
              {member.history.map((h, i) => (
                <li key={`${h.at}-${i}`} className="azq-lrow" style={{ gridTemplateColumns: '1fr' }}>
                  <div className="azq-lrow-main">
                    <span><b>{h.actor || '—'}</b> {t(`adminMembers.historyAction.${h.action}`)}{h.changes?.role ? ` ← ${t(roleLabelKey(Array.isArray(h.changes.role) ? h.changes.role[1] : h.changes.role))}` : ''}</span>
                    <span className="azq-lrow-meta">{h.reason && <span>«{h.reason}»</span>}<span>{relativeTime(h.at, lang, t)}</span></span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {dialog === 'role' && <RoleDialog member={member} roles={assignableRoles(me)} onClose={() => setDialog(null)} onDone={async () => { notify(t('adminMembers.notice.role')); await load(); }} />}
      {dialog === 'reset2fa' && <ResetTwoFactorDialog member={member} onClose={() => setDialog(null)} onDone={async () => { notify(t('adminMembers.notice.reset2fa')); await load(); }} />}
      {dialog === 'suspend' && <SuspendDialog member={member} onClose={() => setDialog(null)} onDone={async () => { notify(t('adminMembers.notice.suspended')); await load(); }} />}
    </div>
  );
}

function FactRow({ label, value }) {
  return <><dt>{label}</dt><dd>{value}</dd></>;
}

const REASON_MIN = 10;

function RoleDialog({ member, roles, onClose, onDone }) {
  const { t } = useLanguage();
  const cancelRef = useRef(null);
  const options = roles.filter((r) => r !== member.role);
  const [role, setRole] = useState(options[0] ?? '');
  const [reason, setReason] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const needsCode = ADMIN_LEVEL.includes(role);

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      await adminApi.changeUserRole(member.id, { role, reason: reason.trim(), code: needsCode ? code.trim() : '' });
      onClose();
      await onDone();
    } catch (err) {
      setError(err?.errors?.code?.[0] || err?.errors?.reason?.[0] || err?.message || t('common.loadError'));
      setBusy(false);
    }
  };

  return (
    <Modal title={t('adminMembers.roleDialog.title', { name: member.name })} onClose={busy ? undefined : onClose} initialFocusRef={cancelRef} size="sm">
      <div className="space-y-4">
        <Field label={t('adminMembers.roleDialog.role')}>
          <Select value={role} onChange={(e) => setRole(e.target.value)}>
            {options.map((r) => <option key={r} value={r}>{t(roleLabelKey(r))}</option>)}
          </Select>
        </Field>
        <Field label={t('adminMembers.roleDialog.reason')} hint={t('adminMembers.roleDialog.reasonHint')}>
          <textarea rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} className="wp-input w-full px-3 py-2 text-sm" />
        </Field>
        {needsCode && (
          <Field label={t('adminMembers.roleDialog.code')} hint={t('adminMembers.roleDialog.codeHint')}>
            <Input inputMode="numeric" autoComplete="one-time-code" dir="ltr" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} />
          </Field>
        )}
        {error && <Alert size="sm">{error}</Alert>}
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Button ref={cancelRef} variant="ghost" size="sm" onClick={onClose} disabled={busy}>{t('common.cancel')}</Button>
        <Button size="sm" onClick={submit} loading={busy} disabled={!role || reason.trim().length < REASON_MIN || (needsCode && code.trim().length !== 6)}>{t('adminMembers.roleDialog.confirm')}</Button>
      </div>
    </Modal>
  );
}

function SuspendDialog({ member, onClose, onDone }) {
  const { t } = useLanguage();
  const cancelRef = useRef(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      await adminApi.suspendUser(member.id, reason.trim());
      onClose();
      await onDone();
    } catch (err) {
      setError(err?.errors?.reason?.[0] || err?.message || t('common.loadError'));
      setBusy(false);
    }
  };

  return (
    <Modal title={t('adminMembers.suspendDialog.title', { name: member.name })} onClose={busy ? undefined : onClose} initialFocusRef={cancelRef} size="sm">
      <p className="text-sm text-[var(--wp-text-2)]">{t('adminMembers.suspendDialog.body')}</p>
      <div className="mt-4">
        <Field label={t('adminMembers.suspendDialog.reason')} hint={t('adminMembers.roleDialog.reasonHint')}>
          <textarea rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} className="wp-input w-full px-3 py-2 text-sm" />
        </Field>
      </div>
      {error && <Alert size="sm" className="mt-3">{error}</Alert>}
      <div className="mt-5 flex justify-end gap-2">
        <Button ref={cancelRef} variant="ghost" size="sm" onClick={onClose} disabled={busy}>{t('common.cancel')}</Button>
        <Button variant="danger" size="sm" onClick={submit} loading={busy} disabled={reason.trim().length < REASON_MIN}>{t('adminMembers.suspendDialog.confirm')}</Button>
      </div>
    </Modal>
  );
}

function ResetTwoFactorDialog({ member, onClose, onDone }) {
  const { t } = useLanguage();
  const cancelRef = useRef(null);
  const [reason, setReason] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      await adminApi.resetMemberTwoFactor(member.id, { reason: reason.trim(), code: code.trim() });
      onClose();
      await onDone();
    } catch (err) {
      setError(err?.errors?.code?.[0] || err?.errors?.reason?.[0] || err?.message || t('common.loadError'));
      setBusy(false);
    }
  };

  return (
    <Modal title={t('adminMembers.resetDialog.title', { name: member.name })} onClose={busy ? undefined : onClose} initialFocusRef={cancelRef} size="sm">
      <p className="text-sm text-[var(--wp-text-2)]">{t('adminMembers.resetDialog.body')}</p>
      <div className="mt-4 space-y-4">
        <Field label={t('adminMembers.suspendDialog.reason')} hint={t('adminMembers.roleDialog.reasonHint')}>
          <textarea rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} className="wp-input w-full px-3 py-2 text-sm" />
        </Field>
        <Field label={t('adminMembers.roleDialog.code')}>
          <Input inputMode="numeric" autoComplete="one-time-code" dir="ltr" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} />
        </Field>
        {error && <Alert size="sm">{error}</Alert>}
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Button ref={cancelRef} variant="ghost" size="sm" onClick={onClose} disabled={busy}>{t('common.cancel')}</Button>
        <Button variant="danger" size="sm" onClick={submit} loading={busy} disabled={reason.trim().length < REASON_MIN || code.trim().length !== 6}>{t('adminMembers.resetDialog.confirm')}</Button>
      </div>
    </Modal>
  );
}
