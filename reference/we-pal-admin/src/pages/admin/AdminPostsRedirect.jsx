import { Navigate } from 'react-router-dom';

// /admin/posts القديم («الأخبار والتحليلات» صفحة واحدة) صار قائمتين: يحوّل إلى «الأخبار».
export default function AdminPostsRedirect() {
  return <Navigate to="/admin/news" replace />;
}
