import { Navigate, useLocation } from 'react-router-dom';
import { loginPathFor } from '../../utils/authRedirect';

// تحويل الزائر إلى الدخول مع الصفحة التي طلبها (‎?next=‎)، فيعود إليها بعد الدخول (pages/public/Login.jsx).
export default function LoginRedirect() {
  const { pathname, search } = useLocation();
  return <Navigate to={loginPathFor(`${pathname}${search}`)} replace />;
}
