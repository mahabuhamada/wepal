import { index, layout, route } from '@react-router/dev/routes';

/**
 * خريطة المسارات — تحلّ محل <Routes> في App.jsx.
 * الترتيب والتداخل مطابقان للسابق حتى لا يتغيّر أي رابط قائم.
 */
export default [
  // ===== البوابة العامة — الجذر (تُعرض من الخادم) =====
  layout('components/PublicLayout/PublicLayout.jsx', [
    // PublicPages: حدّ خطأ داخل القشرة (صفحات الأخطاء)، بلا مسار فلا يتغيّر أي رابط.
    layout('routes/PublicPages.jsx', [
    index('pages/public/PublicHome.jsx'),
    route('library', 'pages/public/Library.jsx'),
    route('library/:id', 'pages/public/ResourceDetail.jsx'),
    route('outputs', 'pages/public/Outputs.jsx'),
    route('help', 'pages/public/Help.jsx'),
    route('ask', 'pages/public/Ask.jsx'),
    route('blog', 'pages/public/Blog.jsx'),
    route('blog/:id', 'pages/public/BlogPost.jsx'),
    route('about', 'pages/public/About.jsx'),
    route('stories', 'pages/public/Stories.jsx'),
    route('stories/:id', 'pages/public/StoryDetail.jsx'),
    route('news', 'pages/public/News.jsx'),
    route('news/:id', 'pages/public/NewsDetail.jsx'),
    route('polls', 'pages/public/Polls.jsx'),
    route('contact', 'pages/public/Contact.jsx'),
    route('join', 'pages/public/Join.jsx'),
    route('login', 'pages/public/Login.jsx'),
    // عامّان (لا حارس دخول) و noIndex — B5.1
    route('forgot-password', 'pages/public/ForgotPassword.jsx'),
    route('reset-password', 'pages/public/ResetPassword.jsx'),
    route('map', 'pages/public/SiteMap.jsx'),
    // رابط غير معروف: «الصفحة غير موجودة» داخل القشرة (آخر الاحتمالات؛ المسارات الأدق تغلب).
    route('*', 'pages/public/NotFound.jsx'),
    ]),
  ]),

  // مسارات تحتاج خادم Node — لا وجود لها في بناء SPA_BUILD=1
  // (التحويل هناك في .htaccess، و robots.txt ملف ثابت يمنع أرشفة نسخة التجربة).
  ...(process.env.SPA_BUILD === '1'
    ? []
    : [
        // توافق خلفي: المسارات القديمة /public/* تتحوّل للجذر
        route('public/*', 'routes/LegacyPublicRedirect.jsx'),

        // robots.txt يُولَّد من الخادم لا من ملف ثابت
        route('robots.txt', 'routes/robots.js'),
      ]),

  // خريطة الموقع من الـ API: على الخادم عند كل طلب، وفي البناء الثابت تُبنى مسبقًا ملفًا (prerender).
  route('sitemap.xml', 'routes/sitemap.js'),

  // ===== منطقة الأعضاء — داخل قشرة الموقع نفسها =====
  // MemberArea: عنوان احتياطي و noindex في HTML الخادم لكل صفحات الأعضاء (seo.js).
  layout('routes/MemberArea.jsx', [
  layout('components/PublicLayout/MemberLayout.jsx', [
    route('dashboard', 'pages/Dashboard.jsx'),
    route('projects', 'pages/Projects.jsx'),
    route('projects/new', 'pages/NewProject.jsx'),
    // مقترح مساحة عمل عند صاحبه (الحزمة 3أ): حالته وقرار الإدارة والتعديل
    route('projects/proposals/:id', 'pages/ProposalDetail.jsx'),
    route('projects/:id', 'pages/ProjectDetail.jsx'),
    route('community', 'pages/Community.jsx'),
    route('community/:id', 'pages/CommunityGroup.jsx'),
    route('consultations', 'pages/Consultations.jsx'),
    route('consultations/:id', 'pages/ConsultationReport.jsx'),
    route('assistant', 'pages/Assistant.jsx'),
    route('surveys', 'pages/Surveys.jsx'),
    route('surveys/:id', 'pages/SurveyDetail.jsx'),
    route('profile', 'pages/Profile.jsx'),
    // «اعرض ملفي كما يراه الآخرون» من إعدادات الخصوصية (الخادم يطبّق الإخفاء بـ view=public).
    route('profile/preview', 'pages/ProfilePreview.jsx'),
    // ملف عضو آخر (يحترم خصوصيته): الاسم والمشاريع والإنجازات.
    route('members', 'pages/Members.jsx'),
    route('members/:id', 'pages/MemberProfile.jsx'),
    route('messages', 'pages/Messages.jsx'),
    route('notifications', 'pages/Notifications.jsx'),
    route('settings', 'pages/Settings.jsx'),
    // التحقق بالجوال (B6): تحوّل إليه القشرات عند 403 PhoneVerificationRequired.
    route('verify-phone', 'pages/VerifyPhone.jsx'),
  ]),
  // الإعداد الأولي (القرار 1): أربع شاشات بلا شريط تنقّل. تحوّل إليها MemberArea.
  layout('routes/OnboardingLayout.jsx', [
    route('welcome', 'pages/Welcome.jsx'),
  ]),
  ]),

  // ورقة أكواد دفعة للطباعة: خارج قشرة الإدارة (لا يُطبع الشريط الجانبي)، بالحارس نفسه.
  layout('routes/AdminGuard.jsx', { id: 'admin-guard-print' }, [
    route('admin/invitations/:id/print', 'pages/admin/AdminInvitationPrint.jsx'),
  ]),

  // نظام التصميم: السمتان جنبًا إلى جنب (مرجع للصفحات الجديدة؛ noindex، بلا قشرة).
  route('styleguide', 'pages/Styleguide.jsx'),

  // ===== منطقة الإدارة — شِل الشريط الجانبي + حارس ADMIN =====
  layout('components/Layout/Layout.jsx', [
    layout('routes/AdminGuard.jsx', [
      route('admin', 'pages/Admin.jsx'),
      route('admin/users', 'pages/admin/AdminUsers.jsx'),
      route('admin/users/:id', 'pages/admin/AdminMember.jsx'),
      route('admin/roles', 'pages/admin/AdminRoles.jsx'),
      route('admin/settings', 'pages/admin/AdminSettings.jsx'),
      route('admin/audit', 'pages/admin/AdminAudit.jsx'),
      route('admin/groups', 'pages/admin/AdminGroups.jsx'),
      route('admin/distribution', 'pages/admin/AdminDistribution.jsx'),
      // دفعات الدعوة: إنشاء دفعة، وأكوادها ومن استعمل كلًّا منها، والتصدير والإلغاء
      route('admin/invitations', 'pages/admin/AdminInvitations.jsx'),
      route('admin/invitations/:id', 'pages/admin/AdminInvitationBatch.jsx'),
      route('admin/activities', 'pages/admin/AdminActivities.jsx'),
      route('admin/reports', 'pages/admin/AdminReports.jsx'),
      // «المحتوى المخفي»: سلة الإشراف (القرار 10)
      route('admin/hidden', 'pages/admin/AdminHiddenContent.jsx'),
      route('admin/discussions', 'pages/admin/AdminDiscussions.jsx'),
      route('admin/library', 'pages/admin/AdminLibrary.jsx'),
      // «مركز المساعد» (المرحلة 1 من خطة المساعد): مسار المساعد من المكتبة إلى الإجابة، والنشاط بلا هوية
      route('admin/assistant', 'pages/admin/AdminAssistant.jsx'),
      // «الأخبار» و«التحليلات» قائمتان (خطة لوحة الإدارة، المرحلة 3): الصفحة نفسها بنوعها من المسار، و/admin/posts القديم يحوّل إلى الأخبار
      route('admin/news', 'pages/admin/AdminPosts.jsx', { id: 'admin-news' }),
      route('admin/analyses', 'pages/admin/AdminPosts.jsx', { id: 'admin-analyses' }),
      route('admin/posts', 'pages/admin/AdminPostsRedirect.jsx'),
      route('admin/stories', 'pages/admin/AdminStories.jsx'),
      // المحرّر الجديد (المرحلة 3): صفحة كتابة بمحرّر الكتل كالمنتدى، للأخبار والتحليلات والقصص
      route('admin/editor/:type/:id', 'pages/admin/AdminEditor.jsx'),
      // الأسئلة الشائعة (المرحلة 1 من خطة المساعد): ما تعرضه صفحة المساعدة
      route('admin/faq', 'pages/admin/AdminFaq.jsx'),
      route('admin/surveys', 'pages/admin/AdminSurveys.jsx'),
      route('admin/publish', 'pages/admin/AdminPublish.jsx'),
      // مقترحات مساحات العمل والتحديات (الحزمة 3أ، وعد للمانح «approve proposals»)
      route('admin/proposals', 'pages/admin/AdminProposals.jsx'),
      route('admin/analytics', 'pages/admin/AdminAnalytics.jsx'),
      // رسائل التواصل ومشتركو النشرة (B7.2، للمدير)
      route('admin/inbox', 'pages/admin/AdminInbox.jsx'),
      // تقارير الاستشارات (B7.4، للمدير)
      route('admin/consultations', 'pages/admin/AdminConsultations.jsx'),
      // «ينتظر خلاصة»: كتابة خلاصة «سألنا / قلتم / فعلنا» ونشرها لمن شارك (الحزمة 6أ)
      route('admin/outcomes', 'pages/admin/AdminOutcomes.jsx'),
      // «أسئلة لم تجد نتيجة»: سجل البحث بلا هوية (المرحلة 1 من خطة المساعد، للمدير)
      route('admin/search-queries', 'pages/admin/AdminSearchQueries.jsx'),
      // إعدادات الواجهة: التصميم الحالي/الجديد وهيرو الرئيسية (إعادة التصميم، المرحلة أ)
      route('admin/appearance', 'pages/admin/AdminAppearance.jsx'),
      // «الأمان»: الصيانة والحذف الطارئ، للمدير العام (القرار 12). مؤقتة حتى صفحة «إعدادات المنصة» (المرحلة 4)
      route('admin/security', 'pages/admin/AdminSecurity.jsx'),
    ]),
  ]),
];
