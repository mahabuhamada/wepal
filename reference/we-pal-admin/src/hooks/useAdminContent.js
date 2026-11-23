import { unwrapList } from '../api/client';
import useInfiniteList from './useInfiniteList';

// قائمة محتوى الإدارة (منشورات/قصص/موارد) مقسّمة ومرشّحة بالحالة (العقد §5).
// fetcher({ status, page, ...filters }) مثل adminApi.listPostsForAdmin؛ filters: { type, missing, origin } من عنوان الصفحة.
export default function useAdminContent(fetcher, status, filters = {}) {
  const { type = null, missing = null, origin = null } = filters;
  return useInfiniteList(
    async (page) => unwrapList(await fetcher({ status, page, ...(type && { type }), ...(missing && { missing }), ...(origin && { origin }) })),
    [status, type, missing, origin],
  );
}
