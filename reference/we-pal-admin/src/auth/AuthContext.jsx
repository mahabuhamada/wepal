import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import * as authApi from '../api/auth';
import { completeTwoFactorChallenge } from '../api/twoFactor';
import { setAnalyticsAudience } from '../utils/analytics';
import { getToken, getTokenExpiry, setToken, clearToken, setUnauthorizedHandler, setPhoneRequiredHandler } from '../api/client';
import { isExpired, shouldRefresh } from '../utils/session';
import { disconnectRealtime } from '../api/realtime';
import { disablePushOnThisDevice } from '../hooks/usePushDevice';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // التحليلات: نوع الزائر (زائر/عضو/طاقم) لمشاهدات البوابة العامة — الطاقم يُستبعد من التقارير
  useEffect(() => setAnalyticsAudience(user), [user]);
  // الوقت الحقيقي: لا اتصال websocket بلا جلسة (خروج أو 401)؛ الدخول التالي يتصل بتوكنه الجديد.
  useEffect(() => {
    if (!user) disconnectRealtime();
  }, [user]);

  // انتهت الجلسة أثناء الاستخدام (401 على طلب بتوكن) — تعرض صفحة الدخول سبب الخروج.
  const [sessionExpired, setSessionExpired] = useState(false);

  // خطأ عابر عند الإقلاع (شبكة، 5xx، طلب متعثّر) — التوكن باقٍ والقشرات تعرض «إعادة المحاولة».
  const [bootError, setBootError] = useState(null);

  // أي 401 لطلب بتوكن: نمسح الجلسة، فتحوّل القشرات (MemberLayout/Layout) إلى /login.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      // الجلسة انتهت: تنبيهات هذا الجهاز تُلغى في المتصفح (الخادم حذفها مع التوكن، أو يحذفها حين يُنظَّف)
      disablePushOnThisDevice({ server: false });
      clearToken();
      setUser(null);
      setBootError(null);
      setSessionExpired(true);
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  // 403 PhoneVerificationRequired (العقد §4): الخادم يُلزم بتوثيق الجوال — تحوّل القشرات
  // إلى /verify-phone حتى يُوثَّق الرقم. معطّل في الخادم ما دام PHONE_REQUIRED_FROM فارغًا.
  const [phoneFlag, setPhoneFlag] = useState(false);
  useEffect(() => {
    setPhoneRequiredHandler(() => setPhoneFlag(true));
    return () => setPhoneRequiredHandler(null);
  }, []);
  const phoneRequired = phoneFlag && Boolean(user) && !user.phoneVerified;

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // عند الإقلاع: توكن منتهٍ يُمسح دون طلب؛ الصالح نجلب به الملف الشخصي،
  // ثم نجدّده إن بقي له أقل من 7 أيام (أو لا نعرف تاريخ انتهائه) — العقد §3.
  // لا نمسح الجلسة إلا إذا قال الخادم إن التوكن غير صالح (401، ويتولاه المعالج أعلاه)؛
  // أي فشل آخر لا يُخرج المستخدم ولا يضيّع توكنًا صالحًا.
  const bootstrap = useCallback(async () => {
    const active = () => mountedRef.current;
    setBootError(null);
    if (!getToken() || isExpired(getTokenExpiry())) {
      clearToken();
      if (active()) setLoading(false);
      return;
    }
    if (active()) setLoading(true);
    try {
      const me = await authApi.me();
      if (active()) setUser(me);
      if (shouldRefresh(getTokenExpiry())) {
        try {
          const fresh = await authApi.refresh();
          if (active() && fresh?.token) setToken(fresh.token, fresh.expiresAt);
        } catch {
          // فشل التجديد لا يُخرج المستخدم؛ التوكن الحالي ما زال صالحًا (و 401 يعالجه المعالج أعلاه).
        }
      }
    } catch (err) {
      if (!active()) return;
      setUser(null);
      if (err?.status === 401) clearToken();
      else setBootError(err);
    } finally {
      if (active()) setLoading(false);
    }
  }, []);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  // مع المصادقة الثنائية يرجع الخادم { twoFactorRequired, challengeToken } بلا توكن؛
  // نعيدها للصفحة لتطلب الرمز ثم تستدعي completeTwoFactor.
  // remember: «تذكّرني» (افتراضيًا نعم). يُحفظ لخطوة 2FA التالية إن طُلبت.
  const rememberRef = useRef(true);
  const login = useCallback(async (payload, { remember = true } = {}) => {
    rememberRef.current = remember;
    const data = await authApi.login(payload);
    if (data.twoFactorRequired) return data;
    setToken(data.token, data.expiresAt, { remember });
    setSessionExpired(false);
    setBootError(null);
    setUser(data.user);
    return data;
  }, []);

  const completeTwoFactor = useCallback(async (challengeToken, answer) => {
    const data = await completeTwoFactorChallenge(challengeToken, answer);
    setToken(data.token, data.expiresAt, { remember: rememberRef.current });
    setSessionExpired(false);
    setBootError(null);
    setUser(data.user);
    return data;
  }, []);

  // إعادة قراءة المستخدم من /me (مثلًا بعد تفعيل المصادقة الثنائية).
  const refreshUser = useCallback(async () => {
    const me = await authApi.me();
    setUser(me);
    return me;
  }, []);

  const register = useCallback(async (payload) => {
    const data = await authApi.register(payload);
    setToken(data.token, data.expiresAt);
    setSessionExpired(false);
    setBootError(null);
    setUser(data.user);
    return data;
  }, []);

  const logout = useCallback(async () => {
    // Web Push (طلب أمجد): الخروج يدمّر اشتراك هذا الجهاز — من الخادم بالتوكن قبل مسحه، ومن المتصفح.
    await disablePushOnThisDevice({ server: true });
    try {
      await authApi.logout();
    } catch {
      // نتجاهل فشل إبطال التوكن على الخادم؛ ننظّف محليًا على أي حال.
    }
    clearToken();
    setUser(null);
    setPhoneFlag(false);
    setBootError(null);
    // خروج مقصود — حتى لو ردّ الخادم 401 على توكن منتهٍ، لا نعرض «انتهت الجلسة».
    setSessionExpired(false);
  }, []);

  /**
   * يحدّث المستخدم المحفوظ من استجابة /me (أو من PATCH /me و/me/privacy
   * اللذين يُرجعان البروفايل الكامل)، فتنعكس التعديلات فوراً على القشرة
   * والملف الشخصي دون إعادة تحميل الصفحة.
   */
  const applyUser = useCallback((profile) => {
    setUser(profile);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, sessionExpired, bootError, retryBootstrap: bootstrap, phoneRequired, login, completeTwoFactor, refreshUser, register, logout, applyUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

// مثل useAuth لكن بلا خطأ خارج المزوّد (null): للـ hooks المشتركة في القشرات (عدّاد الإشعارات)، واختباراتها بلا مزوّد.
export function useOptionalAuth() {
  return useContext(AuthContext) ?? null;
}
