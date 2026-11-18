"use client";

import { type FormEvent, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, ArrowRight, BookHeart, BookOpen, CalendarDays, ChevronDown,
  CircleHelp, Clock, Download, Eye, FileText, Info, Layers3, Library,
  Lightbulb, EyeOff, LockKeyhole, Mail, Map, MapPin, MessageCircle, Newspaper,
  PenLine, Phone, Search, Send, ShieldCheck, Sparkles, Target,
  UserRound, Users,
} from "lucide-react";
import { useReveal } from "./use-reveal";
import { SiteFooter, SiteHeader, useLang } from "./site-chrome";
import { Logo } from "./identity";
import type { Lang } from "./content";

export type PortalPageType = "news" | "library" | "blog" | "outputs" | "stories" | "about" | "help" | "contact" | "login" | "map";
type Language = Lang;

const pageCopy = {
  news: {
    icon: Newspaper, ar: { kicker: "الأخبار", title: "الخبر في سياقه، لا في عزلته.", text: "متابعة مسؤولة للشأن العام الفلسطيني، تربط الحدث بخلفيته وتضع أمامك مصادر يمكن الرجوع إليها." }, en: { kicker: "News", title: "News in context, never in isolation.", text: "Responsible coverage of Palestinian public affairs, connecting events to context and sources you can trace." },
  },
  library: {
    icon: Library, ar: { kicker: "مكتبة ويبال", title: "المعرفة التي تحتاجها، في مكان واحد.", text: "دراسات وأدلة ووثائق وفيديوهات مرتبة لتصل إلى المعلومة بسرعة وتفهم الصورة بعمق." }, en: { kicker: "Wepal library", title: "The knowledge you need, in one place.", text: "Studies, guides, documents and videos organized to help you find information and see the wider picture." },
  },
  blog: {
    icon: PenLine, ar: { kicker: "رأي وتحليل", title: "مساحة للفهم، ووجهات نظر تتسع للاختلاف.", text: "تحليلات تقرأ ما وراء الحدث وتفتح نقاشًا مسؤولًا حول السياسة والمجتمع والمصالحة." }, en: { kicker: "Opinion & analysis", title: "Room to understand, and perspectives that welcome difference.", text: "Analysis that looks beyond events and opens responsible discussion on politics, society and reconciliation." },
  },
  outputs: {
    icon: Layers3, ar: { kicker: "المخرجات", title: "من النقاش إلى معرفة قابلة للاستخدام.", text: "تقارير وأوراق سياسات وأدلة عملية تلخص العمل الميداني وتحوله إلى موارد واضحة ومفتوحة." }, en: { kicker: "Outputs", title: "From dialogue to knowledge you can use.", text: "Reports, policy papers and practical guides that turn field experience into clear, open resources." },
  },
  stories: {
    icon: BookHeart, ar: { kicker: "القصص", title: "الناس هم بداية الحكاية ومعناها.", text: "أصوات وتجارب فلسطينية تروي التغيير كما عاشه أصحابه، بعيدًا عن الاختزال والأرقام المجردة." }, en: { kicker: "Stories", title: "People are where every story begins.", text: "Palestinian voices and experiences telling change as it was lived, beyond reduction and abstract numbers." },
  },
  about: {
    icon: Info, ar: { kicker: "عن ويبال", title: "منصة فلسطينية تجعل المعرفة بدايةً للحوار.", text: "نجمع الخبر والمصدر والتحليل والقصة داخل مساحة عامة تحترم الاختلاف وتقرّب الشأن العام من الناس." }, en: { kicker: "About Wepal", title: "A Palestinian platform where knowledge starts dialogue.", text: "We bring news, sources, analysis and stories into a public space that respects difference and brings public affairs closer." },
  },
  help: {
    icon: CircleHelp, ar: { kicker: "المساعدة", title: "نساعدك على الوصول لما تحتاجه بسرعة.", text: "إجابات واضحة حول استخدام المنصة، الحساب، المحتوى، الخصوصية، والمشاركة في مجتمع ويبال." }, en: { kicker: "Help center", title: "Find what you need, quickly.", text: "Clear answers about using the platform, accounts, content, privacy and participating in the Wepal community." },
  },
  contact: {
    icon: Mail, ar: { kicker: "تواصل معنا", title: "فكرتك أو سؤالك يمكن أن يبدأ حوارًا جديدًا.", text: "أرسل لنا استفسارك، اقتراحك، أو رغبتك في التعاون، وسيتواصل معك الفريق المختص." }, en: { kicker: "Contact us", title: "Your question or idea can start a new dialogue.", text: "Send an inquiry, suggestion or collaboration request, and the right team member will get back to you." },
  },
  login: {
    icon: UserRound, ar: { kicker: "دخول الأعضاء", title: "مرحبًا بعودتك إلى مجتمع ويبال.", text: "ادخل إلى حسابك لمتابعة النقاشات، المجموعات، والمواد التي حفظتها." }, en: { kicker: "Member login", title: "Welcome back to the Wepal community.", text: "Sign in to continue discussions, groups and resources you have saved." },
  },
  map: {
    icon: Map, ar: { kicker: "عالم المنتدى", title: "شبكة واسعة، يجمعها أثر واحد.", text: "تعرّف إلى المبادرات والشركاء والمساحات التي تصنع معًا منظومة العمل الشبابي والمجتمعي." }, en: { kicker: "Forum ecosystem", title: "A wide network, connected by shared impact.", text: "Discover the initiatives, partners and spaces shaping a youth and community action ecosystem." },
  },
} as const;

const pageTags: Record<PortalPageType, { ar: string[]; en: string[] }> = {
  news:{ar:["تغطية موثوقة","سياق واضح","مصادر مفتوحة"],en:["Trusted coverage","Clear context","Open sources"]},
  library:{ar:["دراسات","أدلة عملية","وثائق وفيديو"],en:["Studies","Practical guides","Documents & video"]},
  blog:{ar:["رأي مسؤول","قراءات معمقة","وجهات نظر"],en:["Responsible opinion","In-depth reading","Perspectives"]},
  outputs:{ar:["تقارير","أوراق سياسات","مواد قابلة للتحميل"],en:["Reports","Policy papers","Downloadable resources"]},
  stories:{ar:["أصوات حقيقية","تجارب فلسطينية","قصص تغيير"],en:["Real voices","Palestinian experiences","Stories of change"]},
  about:{ar:["معرفة","حوار","مشاركة"],en:["Knowledge","Dialogue","Participation"]},
  help:{ar:["إجابات واضحة","خصوصية وأمان","دعم الأعضاء"],en:["Clear answers","Privacy & safety","Member support"]},
  contact:{ar:["استفسارات","شراكات","ملاحظات المحتوى"],en:["Inquiries","Partnerships","Content feedback"]},
  login:{ar:["النقاشات","المجموعات","المواد المحفوظة"],en:["Discussions","Groups","Saved resources"]},
  map:{ar:["مبادرات","شركاء","مجتمعات"],en:["Initiatives","Partners","Communities"]},
};

const newsItems = [
  { image: "/images/nablus.webp", tag: "شأن عام", enTag: "Public affairs", title: "كيف نصنع مساحة عامة تسمح بالسؤال قبل الحكم؟", enTitle: "How do we make room for questions before judgment?", date: "ملف متجدد" },
  { image: "/images/library.webp", tag: "ثقافة ومعرفة", enTag: "Culture", title: "المكتبة الوطنية: ذاكرة حيّة تتسع للأجيال", enTitle: "The national library: a living memory", date: "قراءة" },
  { image: "/images/facilitators.webp", tag: "مشاركة شبابية", enTag: "Youth", title: "من الحضور إلى التأثير: كيف يشارك الشباب؟", enTitle: "From presence to influence: youth participation", date: "تقرير" },
  { image: "/images/gaza.webp", tag: "فلسطين", enTag: "Palestine", title: "غزة التي نعرفها: المدينة والناس وما يبقى", enTitle: "The Gaza we know: city, people and memory", date: "قصة بصرية" },
  { image: "/images/nablus.webp", tag: "حوار", enTag: "Dialogue", title: "الاستماع بوصفه أداةً لبناء الثقة", enTitle: "Listening as a tool for building trust", date: "تحليل" },
  { image: "/images/library.webp", tag: "مصادر", enTag: "Resources", title: "خمسة مداخل لفهم الشأن العام", enTitle: "Five ways into understanding public affairs", date: "مختارات" },
];

const resources = [
  ["دراسة", "الحوار المجتمعي وبناء الثقة", "ملف مرجعي · PDF", "Study", "Community dialogue and building trust", "Reference file · PDF"],
  ["دليل", "أدوات تيسير النقاش العام", "دليل عملي · 24 صفحة", "Guide", "Tools for facilitating public discussion", "Practical guide · 24 pages"],
  ["ورقة سياسات", "الشباب والمشاركة في الشأن العام", "قراءة تحليلية", "Policy paper", "Youth and public participation", "Analytical reading"],
  ["فيديو", "مساحة عرض: مشاركة الشباب في الانتخابات المحلية", "فيديو · 18 دقيقة", "Video", "Youth participation in local elections", "Video · 18 minutes"],
  ["تقرير", "تجارب المصالحة والحوار: دروس ومقاربات", "تقرير موضوعي", "Report", "Dialogue and reconciliation: lessons and approaches", "Thematic report"],
  ["أداة", "بطاقات أسئلة لفتح نقاش مجتمعي", "أداة قابلة للطباعة", "Toolkit", "Question cards for community dialogue", "Printable resource"],
];

export default function PortalPage({ page }: { page: PortalPageType }) {
  const [language, switchLanguage] = useLang();
  const rtl = language === "ar";
  const Arrow = rtl ? ArrowLeft : ArrowRight;
  const config = pageCopy[page];
  const text = config[language];
  const Icon = config.icon;

  useReveal(".portal-body > *:not(.mega-search):not(.help-search), .page-cta .shell", [language, page]);

  return (
    <main className={`home portal-site portal-v3 portal-${page}`} dir={rtl ? "rtl" : "ltr"} lang={language}>
      <SiteHeader lang={language} onLang={switchLanguage} current={`/${page}`} />

      {page !== "login" && (
      <section className="portal-hero">
        <div className="portal-hero-pattern" />
        <div className="shell portal-hero-inner">
          <div className="portal-hero-copy">
            <div className="portal-breadcrumb"><Link href="/">{rtl ? "الرئيسية" : "Home"}</Link><Arrow size={13} /><span>{text.kicker}</span></div>
            <div className="portal-kicker"><Icon size={16} />{text.kicker}</div>
            <h1>{text.title}</h1><p>{text.text}</p><div className="portal-hero-pills">{pageTags[page][language].map((tag,index)=><span key={tag}><i>{String(index+1).padStart(2,"0")}</i>{tag}</span>)}</div>
          </div>
          <div className="portal-hero-art" aria-hidden="true"><div className="art-ring ring-one" /><div className="art-ring ring-two" /><div className="art-icon"><Icon /></div><span className="art-dot dot-one" /><span className="art-dot dot-two" /></div>
        </div>
      </section>
      )}

      {page === "news" && <NewsPage language={language} Arrow={Arrow} />}
      {page === "library" && <LibraryPage language={language} Arrow={Arrow} />}
      {page === "blog" && <BlogPage language={language} Arrow={Arrow} />}
      {page === "outputs" && <OutputsPage language={language} />}
      {page === "stories" && <StoriesPage language={language} Arrow={Arrow} />}
      {page === "about" && <AboutPage language={language} />}
      {page === "help" && <HelpPage language={language} />}
      {page === "contact" && <ContactPage language={language} />}
      {page === "login" && <LoginPage language={language} />}
      {page === "map" && <MapPage language={language} />}

      {page !== "login" && <PageCta language={language} Arrow={Arrow} />}
      <SiteFooter lang={language} onLang={switchLanguage} />
    </main>
  );
}

function NewsPage({ language, Arrow }: { language: Language; Arrow: typeof ArrowLeft }) {
  const rtl = language === "ar";
  return <div className="portal-body shell"><div className="filter-bar"><div className="filter-tabs">{[rtl ? "الكل" : "All", rtl ? "الشأن العام" : "Public affairs", rtl ? "الحوار" : "Dialogue", rtl ? "الثقافة" : "Culture"].map((x,i)=><button className={i===0?"active":""} key={x}>{x}</button>)}</div><button className="sort-button">{rtl ? "الأحدث أولًا" : "Newest first"}<ChevronDown size={15}/></button></div><section className="portal-feature-grid"><article className="portal-feature"><img src={newsItems[0].image} alt=""/><div><span>{rtl ? newsItems[0].tag : newsItems[0].enTag}</span><h2>{rtl ? newsItems[0].title : newsItems[0].enTitle}</h2><p>{rtl ? "قراءة تضع القضية في سياقها وتجمع أبرز الأسئلة والمصادر المرتبطة بها." : "A contextual reading bringing together key questions and related sources."}</p><a href="#">{rtl ? "اقرأ القصة" : "Read story"}<Arrow /></a></div></article><div className="portal-briefs">{newsItems.slice(1,3).map((n)=><article key={n.title}><img src={n.image} alt=""/><div><span>{rtl?n.tag:n.enTag}</span><h3>{rtl?n.title:n.enTitle}</h3><small><Clock size={13}/>{rtl?n.date:"Latest"}</small></div></article>)}</div></section><div className="portal-section-head"><div><span>{rtl ? "آخر التحديثات" : "Latest updates"}</span><h2>{rtl ? "الأخبار والتقارير" : "News & reports"}</h2></div><p>{rtl ? "تغطية مختارة، مرتبة لتقرأ المهم أولًا." : "Selected coverage, organized so you read what matters first."}</p></div><div className="article-grid">{newsItems.slice(1).map((n)=><article className="article-card" key={n.title}><img src={n.image} alt=""/><div><span>{rtl?n.tag:n.enTag}</span><h3>{rtl?n.title:n.enTitle}</h3><div><small><CalendarDays size={13}/>{rtl?n.date:"Latest"}</small><a href="#"><Arrow/></a></div></div></article>)}</div></div>;
}

function LibraryPage({ language, Arrow }: { language: Language; Arrow: typeof ArrowLeft }) {
  const rtl = language === "ar";
  return <div className="portal-body shell"><div className="mega-search"><Search/><input placeholder={rtl?"ابحث باسم المادة، الموضوع، أو نوع المصدر":"Search by title, topic or resource type"}/><button>{rtl?"بحث":"Search"}<Arrow/></button></div><div className="library-page-layout"><aside className="library-sidebar"><h3>{rtl?"تصفية النتائج":"Filter results"}</h3>{[rtl?"نوع المادة":"Resource type",rtl?"الموضوع":"Topic",rtl?"سنة النشر":"Publication year"].map((g,i)=><div className="filter-group" key={g}><button>{g}<ChevronDown/></button>{i===0&&<div>{[rtl?"دراسة":"Study",rtl?"دليل":"Guide",rtl?"فيديو":"Video",rtl?"ورقة سياسات":"Policy paper"].map(x=><label key={x}><input type="checkbox"/>{x}</label>)}</div>}</div>)}</aside><section><div className="results-head"><strong>{rtl?"المواد المتاحة":"Available resources"}</strong><span>{resources.length} {rtl?"مواد":"items"}</span></div><div className="resource-page-grid">{resources.map((r,i)=><article key={r[1]}><div className={`resource-cover cover-${i%3}`}><FileText/><span>{rtl?r[0]:r[3]}</span></div><div><span>{rtl?r[0]:r[3]}</span><h3>{rtl?r[1]:r[4]}</h3><p>{rtl?r[2]:r[5]}</p><div><a href="#">{rtl?"عرض المادة":"View resource"}<Arrow/></a><button aria-label="download"><Download/></button></div></div></article>)}</div></section></div></div>;
}

function BlogPage({ language, Arrow }: { language: Language; Arrow: typeof ArrowLeft }) {
  const rtl = language === "ar";
  const posts = [["حين تصبح المعرفة مدخلًا للمشاركة لا مجرد أرشيف","When knowledge becomes a gateway to participation"],["مساحة الاختلاف: ما الذي يجعل الحوار منتجًا؟","A space for difference: what makes dialogue productive?"],["دروس من تجارب المصالحة الدولية","Lessons from international reconciliation experiences"],["كيف يغيّر الحوار المجتمعي نظرتنا للمصالحة؟","How community dialogue changes our view of reconciliation"]];
  return <div className="portal-body shell"><article className="blog-lead"><img src="/images/facilitators.webp" alt=""/><div><span>{rtl?"اختيار المحرر":"Editor’s pick"}</span><h2>{rtl?posts[0][0]:posts[0][1]}</h2><p>{rtl?"المكتبة ليست نهاية رحلة المعرفة؛ بل بداية نقاش يمكن أن يغيّر طريقة فهمنا للقضايا العامة.":"A library is not the end of a knowledge journey, but the beginning of a conversation that can change how we understand public issues."}</p><div className="writer"><span>و</span><div><strong>{rtl?"فريق تحرير ويبال":"Wepal editorial team"}</strong><small>{rtl?"8 دقائق قراءة":"8 min read"}</small></div></div><a href="#">{rtl?"اقرأ التحليل":"Read analysis"}<Arrow/></a></div></article><div className="portal-section-head"><div><span>{rtl?"أفكار ووجهات نظر":"Ideas & perspectives"}</span><h2>{rtl?"أحدث التحليلات":"Latest analysis"}</h2></div></div><div className="blog-grid">{posts.slice(1).map((p,i)=><article key={p[0]}><div className="blog-card-number">0{i+1}</div><span>{rtl?"تحليل":"Analysis"}</span><h3>{rtl?p[0]:p[1]}</h3><p>{rtl?"قراءة معمقة تربط السؤال بالسياق وتفتح مساحة لفهم أكثر اتزانًا.":"An in-depth reading that connects questions to context and opens space for a balanced view."}</p><a href="#">{rtl?"متابعة القراءة":"Continue reading"}<Arrow/></a></article>)}</div></div>;
}

function OutputsPage({ language }: { language: Language }) {
  const rtl=language==="ar";
  return <div className="portal-body shell"><div className="output-summary"><div><Layers3/><strong>{rtl?"مخرجات مفتوحة":"Open outputs"}</strong><p>{rtl?"مواد قابلة للقراءة والتحميل والمشاركة.":"Resources ready to read, download and share."}</p></div>{[rtl?"تقارير":"Reports",rtl?"أوراق سياسات":"Policy papers",rtl?"أدلة عملية":"Practical guides"].map((x,i)=><div key={x}><strong>0{i+1}</strong><span>{x}</span></div>)}</div><div className="portal-section-head"><div><span>{rtl?"نتاج العمل":"Our work"}</span><h2>{rtl?"تقارير وأدلة مختارة":"Selected reports & guides"}</h2></div></div><div className="outputs-grid">{resources.slice(0,5).map((r,i)=><article key={r[1]}><div className={`output-cover output-${i%3}`}><span>WEPAL</span><FileText/><small>{rtl?r[0]:r[3]}</small></div><div><span>{rtl?r[0]:r[3]}</span><h3>{rtl?r[1]:r[4]}</h3><p>{rtl?"ملخص موجز للمادة يساعدك على تحديد ما إذا كانت تناسب بحثك أو عملك.":"A concise summary to help you decide whether this resource fits your work."}</p><button><Download/>{rtl?"تحميل الملف":"Download file"}</button></div></article>)}</div></div>;
}

function StoriesPage({ language, Arrow }: { language: Language; Arrow: typeof ArrowLeft }) {
  const rtl=language==="ar";
  const stories=[{image:"/images/facilitators.webp",name:"لينا عمر",en:"Lina Omar",title:"كيف غيّر الحوار المجتمعي نظرتي للمصالحة؟",enTitle:"How community dialogue changed my view of reconciliation"},{image:"/images/gaza.webp",name:"أحمد سعيد",en:"Ahmad Saeed",title:"المدينة كما يرويها أهلها",enTitle:"The city, as told by its people"},{image:"/images/nablus.webp",name:"نور حسن",en:"Nour Hassan",title:"من سؤال صغير بدأت مبادرة كاملة",enTitle:"A whole initiative began with one question"}];
  return <div className="portal-body shell"><div className="stories-mosaic">{stories.map((s,i)=><article className={i===0?"story-featured":""} key={s.name}><img src={s.image} alt=""/><div><span>{rtl?s.name:s.en}</span><h2>{rtl?s.title:s.enTitle}</h2><a href="#">{rtl?"اقرأ القصة":"Read story"}<Arrow/></a></div></article>)}</div><div className="story-quote"><MessageCircle/><blockquote>{rtl?"حين يجد الإنسان مساحةً آمنة ليروي تجربته، تتحول القصة من ذكرى شخصية إلى معرفة مشتركة.":"When people find a safe space to tell their experience, a personal memory becomes shared knowledge."}</blockquote><span>{rtl?"من مجتمع ويبال":"From the Wepal community"}</span></div></div>;
}

function AboutPage({ language }: { language: Language }) {
  const rtl=language==="ar";
  return <div className="portal-body shell"><section className="mission-panel"><div><span>{rtl?"رسالتنا":"Our mission"}</span><h2>{rtl?"معرفة موثوقة، وحوار يحترم الإنسان.":"Trusted knowledge and dialogue that respects people."}</h2><p>{rtl?"تعمل ويبال على جعل القضايا العامة أكثر وضوحًا وقربًا، وتوفير بيئة رقمية يمكن للناس أن يقرأوا فيها، يفهموا، ثم يشاركوا بوعي.":"Wepal makes public issues clearer and more accessible, creating a digital environment where people can read, understand and participate thoughtfully."}</p></div><div className="mission-symbol"><Sparkles/></div></section><div className="values-grid">{[[Target,rtl?"وضوح الهدف":"Clarity",rtl?"محتوى منظم يقود إلى فهم أفضل.":"Organized content that leads to better understanding."],[ShieldCheck,rtl?"الثقة والمسؤولية":"Trust",rtl?"مصادر واضحة ومعايير تحرير مسؤولة.":"Clear sources and responsible editorial standards."],[Users,rtl?"اتساع المشاركة":"Participation",rtl?"مساحة ترحب بالاختلاف وتحمي الاحترام.":"A space that welcomes difference and protects respect."],[Lightbulb,rtl?"معرفة قابلة للعمل":"Useful knowledge",rtl?"موارد تساعد الأفراد والمؤسسات على الفعل.":"Resources that help people and organizations act."]].map(([I,t,d])=>{const Ic=I as typeof Target;return <article key={t as string}><Ic/><h3>{t as string}</h3><p>{d as string}</p></article>})}</div><section className="sdf-relationship"><div className="partnership-mark"><Logo /><span>×</span><img className="sdf-logo-img" src="/brand/sdf-logo-trim.webp" alt={rtl?"المنتدى الاجتماعي التنموي":"Social Developmental Forum"}/></div><div><span>{rtl?"الجذور المؤسسية":"Institutional roots"}</span><h2>{rtl?"خبرة ميدانية تمتد إلى الفضاء الرقمي.":"Field experience extending into the digital space."}</h2><p>{rtl?"تستفيد ويبال من خبرة المنتدى الاجتماعي التنموي في العمل الشبابي والمجتمعي، لتبني منصة تربط المعرفة بالمشاركة.":"Wepal builds on Social Developmental Forum’s youth and community experience to connect knowledge with participation."}</p><a href="https://sdf-pal.org">sdf-pal.org</a></div></section></div>;
}

function HelpPage({ language }: { language: Language }) {
  const rtl=language==="ar";
  const qs=rtl?["كيف أبحث عن مادة داخل المكتبة؟","هل أحتاج إلى حساب لقراءة المحتوى؟","كيف أنضم إلى مجموعة أو نقاش؟","كيف أحفظ مادة للعودة إليها لاحقًا؟","كيف أبلغ عن محتوى غير مناسب؟","كيف تتحكم ويبال في الخصوصية؟"]:["How do I search the library?","Do I need an account to read content?","How do I join a group or discussion?","How can I save a resource?","How do I report inappropriate content?","How does Wepal handle privacy?"];
  return <div className="portal-body shell"><div className="help-search"><Search/><input placeholder={rtl?"اكتب سؤالك هنا":"Type your question here"}/></div><div className="help-layout"><aside><h3>{rtl?"موضوعات المساعدة":"Help topics"}</h3>{[[BookOpen,rtl?"استخدام المنصة":"Using the platform"],[UserRound,rtl?"الحساب والعضوية":"Account & membership"],[Users,rtl?"المجموعات والنقاشات":"Groups & discussions"],[ShieldCheck,rtl?"الأمان والخصوصية":"Safety & privacy"]].map(([I,t])=>{const Ic=I as typeof BookOpen;return <a href="#" key={t as string}><Ic/>{t as string}</a>})}</aside><section className="faq-list"><h2>{rtl?"الأسئلة الأكثر شيوعًا":"Frequently asked questions"}</h2>{qs.map((q,i)=><details key={q} open={i===0}><summary>{q}<ChevronDown/></summary><p>{rtl?"ستجد داخل كل صفحة أدوات واضحة للبحث والتصفية والتنقل. وإذا احتجت إلى مساعدة إضافية، يمكنك التواصل مباشرة مع فريق ويبال.":"Every page includes clear tools for search, filtering and navigation. If you need more help, contact the Wepal team directly."}</p></details>)}</section></div></div>;
}

function ContactPage({ language }: { language: Language }) {
  const rtl=language==="ar";
  const submit=(e:FormEvent)=>e.preventDefault();
  return <div className="portal-body shell"><div className="contact-layout"><aside><h2>{rtl?"اختر الطريقة الأنسب لك":"Choose what works for you"}</h2><p>{rtl?"نقرأ كل رسالة، ونوجّهها إلى الشخص الأنسب داخل الفريق.":"We read every message and route it to the right person."}</p>{[[Mail,"info@wepal.ps",rtl?"البريد الإلكتروني":"Email"],[Phone,"+970 2 000 0000",rtl?"الهاتف":"Phone"],[MapPin,rtl?"فلسطين":"Palestine",rtl?"الموقع":"Location"]].map(([I,v,l])=>{const Ic=I as typeof Mail;return <div className="contact-method" key={v as string}><Ic/><div><span>{l as string}</span><strong>{v as string}</strong></div></div>})}</aside><form className="contact-form" onSubmit={submit}><div className="form-head"><span>{rtl?"اكتب لنا":"Write to us"}</span><h2>{rtl?"كيف يمكننا مساعدتك؟":"How can we help?"}</h2></div><div className="form-row"><label>{rtl?"الاسم":"Name"}<input required/></label><label>{rtl?"البريد الإلكتروني":"Email"}<input type="email" required/></label></div><label>{rtl?"موضوع الرسالة":"Subject"}<select><option>{rtl?"استفسار عام":"General inquiry"}</option><option>{rtl?"تعاون وشراكات":"Partnership"}</option><option>{rtl?"ملاحظة على المحتوى":"Content feedback"}</option></select></label><label>{rtl?"الرسالة":"Message"}<textarea rows={6} required/></label><button type="submit"><Send/>{rtl?"إرسال الرسالة":"Send message"}</button></form></div></div>;
}

function LoginPage({ language }: { language: Language }) {
  const rtl = language === "ar";
  const [showPassword, setShowPassword] = useState(false);
  const benefits: [typeof MessageCircle, string, string][] = [
    [MessageCircle, rtl ? "نقاشات أعمق" : "Deeper discussions", rtl ? "تابع الحوارات التي تهمك وشارك برأيك." : "Follow the conversations you care about and add your voice."],
    [Users, rtl ? "مجموعات اهتمام" : "Interest groups", rtl ? "انضم إلى من يشاركونك الأسئلة نفسها." : "Join people asking the same questions as you."],
    [BookOpen, rtl ? "مكتبتك الخاصة" : "Your own library", rtl ? "كل ما حفظته من مواد في مكان واحد." : "Everything you saved, in one place."],
  ];
  return (
    <section className="login-screen">
      <div className="login-shell">
        <aside className="login-panel">
          <img className="login-panel-photo" src="/images/facilitators.webp" alt="" />
          <div className="login-panel-inner">
            <Logo />
            <div className="login-panel-copy">
              <span className="wp-dots"><i /><i /><i /></span>
              <h2>{rtl ? "مكان واحد لمتابعة ما يهمك والمشاركة فيما تؤمن به." : "One place to follow what matters and take part in what you believe in."}</h2>
            </div>
            <ul>
              {benefits.map(([Ic, title, desc]) => (
                <li key={title}><Ic aria-hidden="true" /><div><strong>{title}</strong><span>{desc}</span></div></li>
              ))}
            </ul>
          </div>
        </aside>

        <form className="login-form" onSubmit={(e) => e.preventDefault()}>
          <div className="login-form-head">
            <span className="login-eyebrow"><UserRound aria-hidden="true" />{rtl ? "دخول الأعضاء" : "Member login"}</span>
            <h1>{rtl ? "أهلًا بعودتك" : "Welcome back"}</h1>
            <p>{rtl ? "سجّل دخولك لمتابعة النقاشات والمجموعات والمواد التي حفظتها." : "Sign in to continue your discussions, groups and saved resources."}</p>
          </div>

          <div className="login-field">
            <label htmlFor="login-email">{rtl ? "البريد الإلكتروني" : "Email"}</label>
            <div className="login-input"><Mail aria-hidden="true" /><input id="login-email" type="email" autoComplete="email" placeholder="name@example.com" dir="ltr" required /></div>
          </div>

          <div className="login-field">
            <div className="login-field-row">
              <label htmlFor="login-password">{rtl ? "كلمة المرور" : "Password"}</label>
              <a href="#">{rtl ? "نسيت كلمة المرور؟" : "Forgot password?"}</a>
            </div>
            <div className="login-input">
              <LockKeyhole aria-hidden="true" />
              <input id="login-password" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="••••••••" dir="ltr" required />
              <button type="button" className="login-eye" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? (rtl ? "إخفاء كلمة المرور" : "Hide password") : (rtl ? "إظهار كلمة المرور" : "Show password")}>
                {showPassword ? <EyeOff /> : <Eye />}
              </button>
            </div>
          </div>

          <label className="login-remember"><input type="checkbox" /><span>{rtl ? "تذكرني على هذا الجهاز" : "Keep me signed in"}</span></label>

          <button type="submit" className="login-submit">{rtl ? "تسجيل الدخول" : "Sign in"}</button>

          <p className="login-signup">{rtl ? "ليس لديك حساب؟" : "New to WePal?"} <a href="#">{rtl ? "أنشئ حسابًا مجانيًا" : "Create a free account"}</a></p>
          <p className="login-secure"><ShieldCheck aria-hidden="true" />{rtl ? "بياناتك محمية ولن نشاركها مع أي جهة." : "Your data is protected and never shared."}</p>
        </form>
      </div>
    </section>
  );
}

function MapPage({ language }: { language: Language }) {
  const rtl=language==="ar";
  return <div className="portal-body shell"><div className="ecosystem"><div className="eco-center"><Logo /><span>{rtl?"المعرفة والحوار":"Knowledge & dialogue"}</span></div>{[rtl?"الشباب":"Youth",rtl?"المؤسسات":"Organizations",rtl?"الباحثون":"Researchers",rtl?"المبادرات":"Initiatives",rtl?"المجتمعات":"Communities",rtl?"الشركاء":"Partners"].map((x,i)=><div className={`eco-node node-${i}`} key={x}><span>{x}</span></div>)}</div><div className="map-list">{[rtl?"المعرفة المفتوحة":"Open knowledge",rtl?"الحوار المجتمعي":"Community dialogue",rtl?"المشاركة الشبابية":"Youth participation"].map((x,i)=><article key={x}><strong>0{i+1}</strong><h3>{x}</h3><p>{rtl?"مسار يجمع المبادرات والمواد والجهات ذات الصلة ضمن صورة واحدة واضحة.":"A path connecting related initiatives, resources and organizations in one clear view."}</p></article>)}</div></div>;
}

function PageCta({ language, Arrow }: { language: Language; Arrow: typeof ArrowLeft }) { const rtl=language==="ar"; return <section className="page-cta"><div className="shell"><div><span>{rtl?"خطوتك التالية":"Your next step"}</span><h2>{rtl?"استكشف المعرفة، ثم شارك في الحوار.":"Explore the knowledge, then join the dialogue."}</h2></div><a href="/login">{rtl?"دخول الأعضاء":"Member login"}<Arrow/></a></div></section>; }


