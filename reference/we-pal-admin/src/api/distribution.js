// توزيع الأعضاء على مساحات العمل (لوحة الإدارة، /admin/distribution — القرار 3، 16 نوفمبر 2026).
// المسارات خلف workspaces.manage؛ العقد في docs/API-CONTRACT.md («توزيع الأعضاء على مساحات العمل»).
import { get, post, uploadForm } from './client';

// filters: {q, region, track, filter: all|unassigned, projectId, page} — الفارغ لا يُرسل.
// → {data:[{id,name,region,track,isActive,workspaces:[{id,title,role}]}], meta:{page,perPage,total,lastPage,counts:{all,unassigned}}}
export function listDistributionMembers(filters = {}) {
  const qs = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    const value = typeof v === 'string' ? v.trim() : v;
    if (value !== undefined && value !== null && value !== '') qs.set(k, String(value));
  });
  const query = qs.toString();
  return get(`/admin/distribution/members${query ? `?${query}` : ''}`);
}

// → [{id,title,track,stage,membersCount,min,max,leaders:[name]}]
export async function listDistributionWorkspaces() {
  const res = await get('/admin/distribution/workspaces');
  return res?.data ?? [];
}

// إضافة أو نقل (fromProjectId) — {userIds, projectId, role?, fromProjectId?}. dryRun: معاينة بلا كتابة.
// → Plan {applied, rows:[{userId,name,action,role,workspace,from,status}], counts, workspaces:[{id,title,before,after,max,full}]}
export function assignToWorkspace({ userIds, projectId, role = 'MEMBER', fromProjectId = null }, { dryRun = false } = {}) {
  return post('/admin/distribution/assign', { userIds, projectId, role, ...(fromProjectId ? { fromProjectId } : {}), dryRun });
}

export function removeFromWorkspace({ userIds, projectId }, { dryRun = false } = {}) {
  return post('/admin/distribution/remove', { userIds, projectId, dryRun });
}

// ورقة توزيع CSV/XLSX (البريد أو الجوال، المساحة، الدور): معاينة بلا كتابة، ثم حفظ الصفوف الجاهزة.
export function previewDistributionSheet(file) {
  return uploadForm('/admin/distribution/sheet/preview', { file });
}

export function importDistributionSheet(file) {
  return uploadForm('/admin/distribution/sheet', { file });
}

// يُحفظ؟ صف جاهز واحد على الأقل، ولا مساحة تتجاوز حدها.
export function canApplyPlan(plan) {
  return (plan?.counts?.ok ?? 0) > 0 && !(plan?.workspaces ?? []).some((w) => w.full);
}
