// عميل fetch الموحّد للـ API: عنوان أساسي واحد، وإرفاق توكن Sanctum (إلا للطلبات العامة)،
// وصيغة أخطاء واحدة (ApiError) لكل الطلبات: JSON، رفع multipart، وتنزيل الملفات.

// على الخادم (العرض SSR والـ loaders) نصل الـ API بعنوان داخلي إن ضُبط API_INTERNAL_URL
// (مثل http://127.0.0.1:8000/api على الـ VPS) بدل الخروج إلى الإنترنت والعودة؛ وفي المتصفح العنوان العام.
export function resolveApiBase({ isServer, internalUrl, publicUrl }) {
  if (isServer && internalUrl) return internalUrl.replace(/\/+$/, '');
  return publicUrl ?? 'http://localhost:8010/api';
}

// على الخادم فقط: سر العرض (INTERNAL_RENDER_TOKEN) يعفي طلبات الصفحات من حدّ القراءة العامة،
// لأنها كلها تأتي من عنوان الخادم نفسه. لا يُرسل من المتصفح أبدًا.
export const internalRenderHeader = (isServer, token) => (isServer && token ? { 'X-Internal-Render': token } : {});

// البناء المسبق (SPA_BUILD) على الخادم: ردّ 429 أو 5xx يعني أن صفحة ستُخبز بحالة خطأ بدل محتواها.
// البناء يكمل لكن يخرج برمز فشل، فلا يُنشر موقع فيه صفحات مكسورة بصمت.
export const prerenderShouldFail = ({ isServer, staticBuild, status }) => Boolean(isServer && staticBuild && (status === 429 || status >= 500));

const IS_SERVER = typeof window === 'undefined';
export const API_BASE_URL = resolveApiBase({
  isServer: IS_SERVER,
  internalUrl: IS_SERVER && typeof process !== 'undefined' ? process.env.API_INTERNAL_URL : undefined,
  publicUrl: import.meta.env.VITE_API_URL,
});
const TOKEN_KEY = 'wepal-token';
const EXPIRES_KEY = 'wepal-token-expires';

// رسائل الأخطاء التي تصنعها الواجهة نفسها (لا رد من الخادم)، بلغة الطلب.
const CLIENT_ERRORS = {
  network: {
    ar: 'تعذّر الاتصال بالخادم. تحقّق من اتصالك وحاول مجددًا.',
    en: "Couldn't reach the server. Check your connection and try again.",
  },
  unknown: {
    ar: 'حدث خطأ غير متوقع. حاول مرة أخرى.',
    en: 'Something went wrong. Please try again.',
  },
};
export const clientErrorMessage = (kind, locale) => CLIENT_ERRORS[kind][locale === 'en' ? 'en' : 'ar'];

// URL كامل لنقطة نهاية (يُستخدم أيضًا لفتح روابط 302 عبر window.open).
export const apiUrl = (path) => `${API_BASE_URL}${path}`;

// «تذكّرني»: التوكن في localStorage (يبقى بعد إغلاق المتصفح)، وإلا sessionStorage
// (ينتهي بإغلاق التبويب/المتصفح). القراءة من أيهما وُجد.
const stores = () => [globalThis.localStorage, globalThis.sessionStorage].filter(Boolean);
const readKey = (key) => stores().map((s) => s.getItem(key)).find((v) => v != null) ?? null;
const persistentStore = () => (globalThis.sessionStorage?.getItem(TOKEN_KEY) ? globalThis.sessionStorage : globalThis.localStorage);

export function getToken() {
  return readKey(TOKEN_KEY);
}

// expiresAt (ISO) من ردود الدخول/التجديد — التوكنات تنتهي بعد 30 يومًا (العقد §3).
// remember: true (افتراضيًا) ← localStorage، false ← sessionStorage. غير المحدد عند التجديد
// يُبقي التوكن في المخزن الذي كان فيه.
export function setToken(token, expiresAt, { remember } = {}) {
  if (!token) return;
  const target = remember === undefined ? persistentStore() : remember ? globalThis.localStorage : globalThis.sessionStorage;
  clearToken();
  target.setItem(TOKEN_KEY, token);
  if (expiresAt) target.setItem(EXPIRES_KEY, expiresAt);
}

export function getTokenExpiry() {
  return readKey(EXPIRES_KEY);
}

export function clearToken() {
  for (const store of stores()) {
    store.removeItem(TOKEN_KEY);
    store.removeItem(EXPIRES_KEY);
  }
}

// يضبطه api/realtime.js حين يتصل (null عند الخروج): يُرجع socket id الحالي أو undefined.
let socketIdProvider = null;
export function setSocketIdProvider(provider) {
  socketIdProvider = provider;
}

// يُستدعى عند 401 لطلب أُرسل بتوكن (جلسة منتهية أو مُبطلة) — يسجّله AuthContext.
let unauthorizedHandler = null;
export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

// يُستدعى عند 403 بكود PhoneVerificationRequired (العقد §4) — يسجّله AuthContext فتحوّل
// القشرات إلى /verify-phone. لا أثر له ما دام الإلزام معطّلًا في الخادم.
export const PHONE_VERIFICATION_REQUIRED = 'PhoneVerificationRequired';
let phoneRequiredHandler = null;
export function setPhoneRequiredHandler(handler) {
  phoneRequiredHandler = handler;
}

// لغة الواجهة لطلبات المتصفح (ترويسة X-Locale): الخادم يترجم بها رسائله و«عضو المنصة» (#111).
// تضبطها LanguageProvider في المتصفح فقط. على الخادم (SSR) لا تُستخدم أبدًا — الـ loaders تمرّر
// lang صراحةً، لأن متغيّرًا عامًّا هناك يتسرّب بين طلبات متزامنة لمستخدمين مختلفين.
let browserLocale = null;
export function setRequestLocale(lang) {
  browserLocale = lang || null;
}

// خطأ يحمل حالة الاستجابة ورسالة الخادم (بلغة الطلب)، و code من حقل error
// في رد الخادم (مثل 'TwoFactorRequired') للحالات التي تتعامل معها الواجهة بشكل خاص.
// retryAfter: الثواني المتبقية في ردود 429 الموحّدة (العقد §0، #93) — null لغيرها.
// errors: أخطاء الحقول في ردود 422 ({ field: [رسائل] }) لعرضها بجانب الحقل — null لغيرها.
// field: حقل الطلب الذي يخصه الخطأ (العقد §0) لعرض الرسالة بجانبه — null إن كان للنموذج كله.
export class ApiError extends Error {
  // body: الرد كاملًا لما يحمل بيانات فوق الرسالة (409 EditConflict ومعه نسخة الآخر، و422 NotReady ومعه الجاهزية)
  constructor(status, message, code = null, retryAfter = null, errors = null, field = null, body = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.message = message;
    this.code = code;
    this.retryAfter = retryAfter;
    this.errors = errors;
    this.field = field;
    this.body = body;
  }
}

// حقل الخطأ من رد الخادم: field في أخطاء النطاق (400/409، مثل EmailTaken ← email)،
// وفي 422 أول مفاتيح errors (وهو حقل message نفسه). غير ذلك null.
export function errorField(status, data) {
  if (typeof data?.field === 'string' && data.field) return data.field;
  if (status === 422 && data?.errors && typeof data.errors === 'object' && !Array.isArray(data.errors)) {
    return Object.keys(data.errors)[0] ?? null;
  }
  return null;
}

async function readJson(res) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// ينفّذ fetch ويرمي ApiError عند فشل الشبكة أو رد غير ناجح؛ يُرجع الاستجابة الخام عند النجاح.
// options:
//   json: جسم يُرسل كـ JSON • form: FormData جاهز (لا نضبط Content-Type كي يضيف المتصفح boundary)
//   auth: إرفاق التوكن (افتراضيًا نعم؛ البوابة العامة تمرّر false)
//   lang: ترويسة X-Locale — الـ loaders (على الخادم) تمرّرها صراحةً؛ وفي المتصفح إن غابت
//         تُؤخذ من setRequestLocale (لغة الواجهة الحالية).
//         ومتغيّر عام هناك يتسرّب بين طلبات متزامنة لمستخدمين مختلفين.
//   accept: ترويسة Accept (التنزيل لا يرسلها)
function requestHeaders({ json, auth = true, lang, accept = 'application/json' } = {}) {
  const headers = {};
  if (accept) headers.Accept = accept;
  if (json !== undefined) headers['Content-Type'] = 'application/json';
  const locale = lang ?? (typeof window !== 'undefined' ? browserLocale : null);
  if (locale) headers['X-Locale'] = locale;
  const token = auth ? getToken() : null;
  if (token) headers.Authorization = `Bearer ${token}`;
  // الوقت الحقيقي: معرّف اتصال websocket هذا التبويب، فلا يعود إليه بثّ فعله هو (toOthers في الخادم)
  const socketId = token ? socketIdProvider?.() : null;
  if (socketId) headers['X-Socket-ID'] = socketId;
  Object.assign(headers, internalRenderHeader(IS_SERVER, IS_SERVER && typeof process !== 'undefined' ? process.env.INTERNAL_RENDER_TOKEN : undefined));
  return { headers, locale, token };
}

// يرمي ApiError لرد غير ناجح (برسالة الخادم وحقوله)، ويستدعي معالجات 401 و403 الخاصة.
async function ensureOk(res, method, path, token, locale) {
  if (res.ok) return;
  if (prerenderShouldFail({ isServer: IS_SERVER, staticBuild: import.meta.env.SPA_BUILD, status: res.status })) {
    console.error(`[prerender] ${method} ${path} → ${res.status}: الصفحة ستُبنى بحالة خطأ`);
    process.exitCode = 1;
  }
  const data = await readJson(res);
  const message = (data && (data.message || data.error)) || clientErrorMessage('unknown', locale);
  // 401 لطلب يحمل توكنًا = الجلسة لم تعد صالحة (انتهت أو أُبطلت) — لا لخطأ كلمة مرور بلا توكن.
  if (res.status === 401 && token) unauthorizedHandler?.();
  if (res.status === 403 && data?.error === PHONE_VERIFICATION_REQUIRED) phoneRequiredHandler?.();
  const retryAfter = Number.isFinite(Number(data?.retryAfter)) && data?.retryAfter != null ? Number(data.retryAfter) : null;
  const fieldErrors = res.status === 422 && data?.errors && typeof data.errors === 'object' ? data.errors : null;
  throw new ApiError(res.status, message, data?.error ?? null, retryAfter, fieldErrors, errorField(res.status, data), data ?? null);
}

async function send(method, path, { json, form, auth = true, lang, accept = 'application/json' } = {}) {
  const { headers, locale, token } = requestHeaders({ json, auth, lang, accept });

  let res;
  try {
    res = await fetch(apiUrl(path), {
      method,
      headers,
      body: json !== undefined ? JSON.stringify(json) : form,
    });
  } catch {
    throw new ApiError(0, clientErrorMessage('network', locale));
  }

  await ensureOk(res, method, path, token, locale);
  return res;
}

// طلب يُرجع جسم الرد بعد تحويله من JSON (أو null إن كان فارغًا/غير JSON).
export async function request(method, path, options) {
  const res = await send(method, path, options);
  return readJson(res);
}

// رفع FormData مع تقدّم الرفع (fetch لا يكشفه): XMLHttpRequest بالترويسات والأخطاء نفسها.
// onProgress(نسبة من 0 إلى 1). بلا XMLHttpRequest (على الخادم) أو بلا onProgress ← request العادي.
export function requestWithProgress(method, path, { form, onProgress, auth = true, lang } = {}) {
  if (typeof XMLHttpRequest === 'undefined' || typeof onProgress !== 'function') return request(method, path, { form, auth, lang });
  const { headers, locale, token } = requestHeaders({ auth, lang });
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, apiUrl(path));
    Object.entries(headers).forEach(([name, value]) => xhr.setRequestHeader(name, value));
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && e.total > 0) onProgress(Math.min(1, e.loaded / e.total));
    };
    xhr.onerror = () => reject(new ApiError(0, clientErrorMessage('network', locale)));
    xhr.onload = async () => {
      try {
        const empty = [204, 205, 304].includes(xhr.status);
        const res = new Response(empty ? null : xhr.responseText, { status: xhr.status });
        await ensureOk(res, method, path, token, locale);
        resolve(await readJson(res));
      } catch (err) {
        reject(err instanceof ApiError ? err : new ApiError(0, clientErrorMessage('network', locale)));
      }
    };
    xhr.send(form);
  });
}

export const get = (path, options) => request('GET', path, options);
export const post = (path, body) => request('POST', path, { json: body ?? {} });
export const patch = (path, body) => request('PATCH', path, { json: body ?? {} });
export const put = (path, body) => request('PUT', path, { json: body ?? {} });
// body اختياري (الحذف النهائي من السلة يحمل السبب)
export const del = (path, body) => request('DELETE', path, body === undefined ? undefined : { json: body });

// GET عام بلا Authorization (البوابة العامة).
export const publicGet = (path, lang) => request('GET', path, { auth: false, lang });

// رفع multipart: حقول نصية اختيارية (تُتجاهل الفارغة) + ملف اختياري في الحقل fileField.
export function uploadForm(path, { fields, file, fileField = 'file', method = 'POST' } = {}) {
  const form = new FormData();
  Object.entries(fields || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') form.append(k, v);
  });
  if (file) form.append(fileField, file);
  return request(method, path, { form });
}

export function uploadFile(path, file, field = 'file') {
  return uploadForm(path, { file, fileField: field });
}

// تنزيل ملف/قالب (تدفّق ثنائي) وتشغيل تنزيل المتصفح عبر Blob + object URL.
// يُرجع حجم الـ Blob بالبايت (مفيد للتحقق في الاختبارات).
export async function downloadBlob(path, fallbackName = 'download', { auth = true } = {}) {
  const res = await send('GET', path, { auth, accept: null });

  // نحاول استخراج اسم الملف من ترويسة Content-Disposition عند توفّرها.
  let filename = fallbackName;
  const disposition = res.headers.get('Content-Disposition');
  if (disposition) {
    const match = /filename\*?=(?:UTF-8'')?["']?([^"';]+)/i.exec(disposition);
    if (match) filename = decodeURIComponent(match[1]);
  }

  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);

  return blob.size;
}

// يوحّد شكلي القوائم خلال الانتقال إلى التقسيم (العقد §0):
//   مصفوفة مباشرة [...]            ← { items: [...], meta: null }
//   { data: [...], meta: {...} }   ← { items: data, meta }
// أي شكل آخر (null، كائن بلا data) ← { items: [], meta: null }.
export function unwrapList(res) {
  if (Array.isArray(res)) return { items: res, meta: null };
  if (res && Array.isArray(res.data)) return { items: res.data, meta: res.meta ?? null };
  return { items: [], meta: null };
}

// يجمع كل صفحات قائمة مقسّمة (مثل sitemap الذي يحتاج كل العناصر، العقد §0).
// fetchPage(page) يرجع الرد الخام؛ نتوقف عند آخر صفحة أو إن كان الرد غير مقسّم (meta = null).
export async function fetchAllPages(fetchPage, { maxPages = 50 } = {}) {
  const all = [];
  for (let page = 1; page <= maxPages; page += 1) {
    const { items, meta } = unwrapList(await fetchPage(page));
    all.push(...items);
    if (!meta || page >= (meta.lastPage ?? page)) break;
  }
  return all;
}
