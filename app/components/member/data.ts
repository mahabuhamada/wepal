// Sample data for the members area. Everything here is illustrative (no real people or accounts);
// it lets the interface run without a server until it is connected to the platform API.
import { L, type T } from "../content";

export type Track = "research" | "initiative" | "digital";
export type Stage = "idea" | "active" | "review" | "done";

export const ME = {
  id: "me",
  name: L("ليان أحمد", "Layan Ahmad"),
  initials: L("ل", "L"),
  city: L("رام الله", "Ramallah"),
  role: L("عضو المنصة", "Platform member"),
  bio: L(
    "مهتمة بالحوار المجتمعي وصناعة المحتوى الذي يقرّب الشأن العام من الناس.",
    "Interested in community dialogue and content that brings public affairs closer to people.",
  ),
  joined: L("انضمت في آذار 2026", "Joined March 2026"),
  points: 340,
  interests: [L("الحوار", "Dialogue"), L("الشأن العام", "Public affairs"), L("محتوى رقمي", "Digital content")],
};

export const TRACKS: Record<Track, T> = {
  research: L("بحثي", "Research"),
  initiative: L("مبادرات", "Initiatives"),
  digital: L("محتوى رقمي", "Digital content"),
};

export const STAGES: Record<Stage, T> = {
  idea: L("فكرة", "Idea"),
  active: L("قيد العمل", "In progress"),
  review: L("مراجعة", "In review"),
  done: L("منجزة", "Done"),
};

export type Member = { id: string; name: T; initials: T; city: T; track: Track; bio: T; groups: string[]; tone: number };
export const MEMBERS: Member[] = [
  { id: "m1", name: L("أحمد خليل", "Ahmad Khalil"), initials: L("أ", "A"), city: L("نابلس", "Nablus"), track: "research", bio: L("يدرس تجارب المصالحة المحلية.", "Studies local reconciliation experiences."), groups: ["g1", "g3"], tone: 1 },
  { id: "m2", name: L("سارة يوسف", "Sara Yousef"), initials: L("س", "S"), city: L("غزة", "Gaza"), track: "digital", bio: L("تصنع فيديوهات قصيرة عن الشأن العام.", "Makes short videos on public affairs."), groups: ["g2"], tone: 2 },
  { id: "m3", name: L("محمد عودة", "Mohammad Odeh"), initials: L("م", "M"), city: L("الخليل", "Hebron"), track: "initiative", bio: L("ينسّق جلسات حوار في الجامعات.", "Coordinates dialogue sessions at universities."), groups: ["g1", "g4"], tone: 3 },
  { id: "m4", name: L("نور حمدان", "Noor Hamdan"), initials: L("ن", "N"), city: L("جنين", "Jenin"), track: "research", bio: L("مهتمة بمشاركة الشباب في الانتخابات المحلية.", "Focused on youth participation in local elections."), groups: ["g3"], tone: 4 },
  { id: "m5", name: L("يزن سلامة", "Yazan Salameh"), initials: L("ي", "Y"), city: L("بيت لحم", "Bethlehem"), track: "digital", bio: L("مصمم ورسام إنفوغرافيك.", "Designer and infographic illustrator."), groups: ["g2", "g4"], tone: 5 },
  { id: "m6", name: L("رهف ناصر", "Rahaf Nasser"), initials: L("ر", "R"), city: L("طولكرم", "Tulkarm"), track: "initiative", bio: L("تعمل على مبادرة مكتبات الأحياء.", "Works on a neighbourhood libraries initiative."), groups: ["g1"], tone: 6 },
  { id: "m7", name: L("عمر بركات", "Omar Barakat"), initials: L("ع", "O"), city: L("رام الله", "Ramallah"), track: "research", bio: L("يكتب أوراق سياسات قصيرة.", "Writes short policy papers."), groups: ["g3", "g4"], tone: 1 },
  { id: "m8", name: L("هبة عيسى", "Heba Issa"), initials: L("ه", "H"), city: L("أريحا", "Jericho"), track: "initiative", bio: L("تيسّر لقاءات مجتمعية.", "Facilitates community meetings."), groups: ["g2"], tone: 2 },
];
export const memberById = (id: string) => MEMBERS.find((m) => m.id === id);

export type Group = { id: string; name: T; about: T; kind: T; members: number; joined: boolean; posts: Post[] };
export type Post = { id: string; author: string; text: T; time: T; replies: number };
export const GROUPS: Group[] = [
  {
    id: "g1", name: L("حوار الضفة الشمالية", "Northern West Bank dialogue"), kind: L("منطقة", "Region"), members: 86, joined: true,
    about: L("مساحة لأعضاء نابلس وجنين وطولكرم لتنسيق جلسات الحوار المحلية.", "A space for members in Nablus, Jenin and Tulkarm to coordinate local dialogue sessions."),
    posts: [
      { id: "p1", author: "m1", text: L("أرفقت ملخص جلسة الأمس عن الثقة بين الأجيال. ما الذي فاتني؟", "I attached the summary of yesterday's session on trust between generations. What did I miss?"), time: L("قبل ساعتين", "2 hours ago"), replies: 6 },
      { id: "p2", author: "m6", text: L("نبحث عن مكان لجلسة الشهر القادم في طولكرم، أي اقتراحات؟", "Looking for a venue for next month's session in Tulkarm, any ideas?"), time: L("أمس", "Yesterday"), replies: 3 },
    ],
  },
  {
    id: "g2", name: L("صنّاع المحتوى", "Content makers"), kind: L("مسار", "Track"), members: 124, joined: true,
    about: L("نتبادل الأفكار والأدوات لصناعة محتوى رقمي واضح ومسؤول.", "Sharing ideas and tools for clear, responsible digital content."),
    posts: [
      { id: "p3", author: "m2", text: L("مسودة فيديو «كيف نقرأ الخبر؟» جاهزة للتعليق.", "Draft video \"How do we read the news?\" is ready for feedback."), time: L("قبل 3 ساعات", "3 hours ago"), replies: 9 },
      { id: "p4", author: "m5", text: L("شاركت قالب إنفوغرافيك جديدًا.", "Shared a new infographic template."), time: L("قبل يومين", "2 days ago"), replies: 4 },
    ],
  },
  {
    id: "g3", name: L("باحثو الشأن العام", "Public affairs researchers"), kind: L("مسار", "Track"), members: 58, joined: false,
    about: L("قراءات ومراجعات لأوراق السياسات والدراسات.", "Reading and reviewing policy papers and studies."),
    posts: [{ id: "p5", author: "m7", text: L("من يراجع معي ورقة المشاركة المحلية قبل الخميس؟", "Who can review the local participation paper with me before Thursday?"), time: L("اليوم", "Today"), replies: 2 }],
  },
  {
    id: "g4", name: L("حوار الجامعات", "Campus dialogue"), kind: L("مبادرة", "Initiative"), members: 41, joined: false,
    about: L("تنسيق جلسات حوار طلابية في خمس جامعات.", "Coordinating student dialogue sessions across five universities."),
    posts: [{ id: "p6", author: "m3", text: L("جدول جلسات الفصل الثاني منشور في الملفات.", "Second-semester session schedule is in the files."), time: L("قبل 4 أيام", "4 days ago"), replies: 5 }],
  },
];
export const groupById = (id: string) => GROUPS.find((g) => g.id === id);

export type Task = { id: string; title: T; due: T; done: boolean; owner: string };
export type Workspace = { id: string; title: T; summary: T; track: Track; stage: Stage; progress: number; due: T; team: string[]; mine: boolean; tasks: Task[]; updates: { who: string; text: T; time: T }[] };
export const WORKSPACES: Workspace[] = [
  {
    id: "w1", title: L("خريطة مساحات الحوار المحلية", "Map of local dialogue spaces"), track: "research", stage: "active", progress: 62, due: L("30 تشرين الثاني", "30 November"), team: ["me", "m1", "m4"], mine: true,
    summary: L("نوثّق الأماكن التي يلتقي فيها الناس للنقاش العام، ونقارن ما ينجح فيها.", "Documenting where people meet for public discussion and comparing what works."),
    tasks: [
      { id: "t1", title: L("مقابلة منسّقي نابلس", "Interview Nablus coordinators"), due: L("الأحد", "Sunday"), done: true, owner: "m1" },
      { id: "t2", title: L("تفريغ مقابلات جنين", "Transcribe Jenin interviews"), due: L("الثلاثاء", "Tuesday"), done: false, owner: "me" },
      { id: "t3", title: L("مسودة الفصل الأول", "Draft chapter one"), due: L("25 تشرين الثاني", "25 November"), done: false, owner: "m4" },
    ],
    updates: [
      { who: "m1", text: L("رفع ثلاث مقابلات جديدة.", "Uploaded three new interviews."), time: L("اليوم", "Today") },
      { who: "m4", text: L("أضافت إطارًا للمقارنة.", "Added a comparison framework."), time: L("أمس", "Yesterday") },
    ],
  },
  {
    id: "w2", title: L("سلسلة «اقرأ الخبر»", "\"Read the news\" series"), track: "digital", stage: "review", progress: 85, due: L("5 كانون الأول", "5 December"), team: ["me", "m2", "m5"], mine: true,
    summary: L("خمسة فيديوهات قصيرة تعلّم كيف نتحقق من الخبر ونقرأ سياقه.", "Five short videos on checking a story and reading its context."),
    tasks: [
      { id: "t4", title: L("مراجعة نص الحلقة الثالثة", "Review episode three script"), due: L("اليوم", "Today"), done: false, owner: "me" },
      { id: "t5", title: L("تصميم الغلاف", "Design the cover"), due: L("الخميس", "Thursday"), done: true, owner: "m5" },
    ],
    updates: [{ who: "m2", text: L("الحلقة الثالثة جاهزة للمراجعة.", "Episode three is ready for review."), time: L("قبل ساعة", "1 hour ago") }],
  },
  {
    id: "w3", title: L("مكتبات الأحياء", "Neighbourhood libraries"), track: "initiative", stage: "active", progress: 40, due: L("كانون الثاني", "January"), team: ["m6", "m8"], mine: false,
    summary: L("زوايا قراءة صغيرة في ثلاثة أحياء، يديرها متطوعون من المنطقة.", "Small reading corners in three neighbourhoods, run by local volunteers."),
    tasks: [{ id: "t6", title: L("حصر الكتب المتبرع بها", "Count donated books"), due: L("الأسبوع القادم", "Next week"), done: false, owner: "m6" }],
    updates: [{ who: "m8", text: L("وافقت بلدية أريحا على الزاوية الأولى.", "Jericho municipality approved the first corner."), time: L("قبل 3 أيام", "3 days ago") }],
  },
  {
    id: "w4", title: L("ورقة: الشباب والمجالس المحلية", "Paper: youth and local councils"), track: "research", stage: "idea", progress: 10, due: L("شباط", "February"), team: ["m7", "m4"], mine: false,
    summary: L("ورقة سياسات قصيرة عن تمثيل الشباب في المجالس المحلية.", "A short policy paper on youth representation in local councils."),
    tasks: [], updates: [],
  },
  {
    id: "w5", title: L("دليل تيسير الجلسات", "Session facilitation guide"), track: "initiative", stage: "done", progress: 100, due: L("أُنجز في تشرين الأول", "Finished in October"), team: ["me", "m3"], mine: true,
    summary: L("دليل عملي من 24 صفحة لتيسير النقاش العام.", "A 24-page practical guide to facilitating public discussion."),
    tasks: [], updates: [],
  },
];
export const workspaceById = (id: string) => WORKSPACES.find((w) => w.id === id);

export type Notice = { id: string; kind: "reply" | "task" | "decision" | "info"; text: T; where: T; time: T; href: string; unread: boolean };
export const NOTICES: Notice[] = [
  { id: "n1", kind: "task", text: L("مهمة «مراجعة نص الحلقة الثالثة» مستحقة اليوم", "Task \"Review episode three script\" is due today"), where: L("سلسلة «اقرأ الخبر»", "\"Read the news\" series"), time: L("قبل ساعة", "1 hour ago"), href: "/projects/w2", unread: true },
  { id: "n2", kind: "reply", text: L("ردّ أحمد خليل على منشورك", "Ahmad Khalil replied to your post"), where: L("حوار الضفة الشمالية", "Northern West Bank dialogue"), time: L("قبل ساعتين", "2 hours ago"), href: "/community/g1", unread: true },
  { id: "n3", kind: "decision", text: L("استشارة «أولويات الشأن العام» تحتاج مشاركتك", "Consultation \"Public affairs priorities\" needs your input"), where: L("المشاورات", "Consultations"), time: L("اليوم", "Today"), href: "/consultations", unread: true },
  { id: "n4", kind: "info", text: L("نُشرت نتائج استبيان «الثقة في مصادر الأخبار»", "Results published for \"Trust in news sources\""), where: L("الاستبيانات", "Surveys"), time: L("أمس", "Yesterday"), href: "/surveys", unread: false },
  { id: "n5", kind: "info", text: L("انضمت هبة عيسى إلى صنّاع المحتوى", "Heba Issa joined Content makers"), where: L("المجتمع", "Community"), time: L("قبل يومين", "2 days ago"), href: "/community/g2", unread: false },
];

export type Consultation = { id: string; title: T; question: T; status: "open" | "past"; participants: number; target: number; ends: T; statements: { text: T; agree: number; disagree: number }[] };
export const CONSULTATIONS: Consultation[] = [
  {
    id: "c1", status: "open", title: L("أولويات الشأن العام 2027", "Public affairs priorities 2027"), question: L("ما القضايا التي يجب أن تتصدّر نقاشنا العام هذا العام؟", "Which issues should lead our public discussion this year?"),
    participants: 214, target: 400, ends: L("تنتهي بعد 6 أيام", "Ends in 6 days"),
    statements: [
      { text: L("البطالة بين الخريجين أولوية لا تحتمل التأجيل.", "Graduate unemployment cannot wait."), agree: 81, disagree: 9 },
      { text: L("المجالس المحلية يجب أن تخصص مقاعد للشباب.", "Local councils should reserve seats for youth."), agree: 64, disagree: 22 },
      { text: L("الإعلام المحلي يحتاج قواعد تحقق مشتركة.", "Local media needs shared verification rules."), agree: 58, disagree: 15 },
    ],
  },
  { id: "c2", status: "past", title: L("الحوار بين الأجيال", "Dialogue between generations"), question: L("كيف نبني الثقة بين الأجيال في النقاش العام؟", "How do we build trust between generations?"), participants: 356, target: 350, ends: L("انتهت في أيلول", "Ended in September"), statements: [] },
  { id: "c3", status: "past", title: L("المساحات العامة الآمنة", "Safe public spaces"), question: L("ما الذي يجعل المساحة العامة آمنة للنقاش؟", "What makes a public space safe for discussion?"), participants: 289, target: 300, ends: L("انتهت في تموز", "Ended in July"), statements: [] },
];

export type Survey = { id: string; title: T; about: T; questions: number; minutes: number; responses: number; target: number; status: "open" | "done"; answered: boolean };
export const SURVEYS: Survey[] = [
  { id: "s1", title: L("كيف تتابع الأخبار؟", "How do you follow the news?"), about: L("عاداتك في متابعة الأخبار ومصادرك المفضلة.", "Your news habits and favourite sources."), questions: 8, minutes: 4, responses: 312, target: 500, status: "open", answered: false },
  { id: "s2", title: L("المشاركة في الانتخابات المحلية", "Taking part in local elections"), about: L("ما الذي يشجعك على المشاركة أو يمنعك منها.", "What encourages or stops your participation."), questions: 12, minutes: 6, responses: 188, target: 400, status: "open", answered: true },
  { id: "s3", title: L("الثقة في مصادر الأخبار", "Trust in news sources"), about: L("قراءة في ثقة الأعضاء بالمصادر المختلفة.", "How members trust different sources."), questions: 10, minutes: 5, responses: 420, target: 400, status: "done", answered: true },
];

export type Thread = { id: string; with: string; last: T; time: T; unread: number; messages: { from: "me" | string; text: T; time: T }[] };
export const THREADS: Thread[] = [
  {
    id: "th1", with: "m2", last: L("تمام، أرسل لي الملاحظات قبل المساء", "Great, send me notes before the evening"), time: L("10:42", "10:42"), unread: 2,
    messages: [
      { from: "m2", text: L("مرحبًا ليان، هل اطلعتِ على نص الحلقة الثالثة؟", "Hi Layan, did you see the episode three script?"), time: L("10:30", "10:30") },
      { from: "me", text: L("أهلًا سارة، نعم. عندي ملاحظتان على المقدمة.", "Hi Sara, yes. I have two notes on the intro."), time: L("10:38", "10:38") },
      { from: "m2", text: L("تمام، أرسل لي الملاحظات قبل المساء", "Great, send me notes before the evening"), time: L("10:42", "10:42") },
    ],
  },
  {
    id: "th2", with: "m1", last: L("رفعت المقابلات على المساحة", "I uploaded the interviews to the workspace"), time: L("أمس", "Yesterday"), unread: 0,
    messages: [{ from: "m1", text: L("رفعت المقابلات على المساحة", "I uploaded the interviews to the workspace"), time: L("أمس", "Yesterday") }],
  },
  {
    id: "th3", with: "m3", last: L("شكرًا على الدليل، كان مفيدًا جدًا", "Thanks for the guide, very useful"), time: L("الإثنين", "Monday"), unread: 0,
    messages: [{ from: "m3", text: L("شكرًا على الدليل، كان مفيدًا جدًا", "Thanks for the guide, very useful"), time: L("الإثنين", "Monday") }],
  },
];

export const BADGES = [
  { id: "b1", title: L("أول مساهمة", "First contribution"), earned: true },
  { id: "b2", title: L("ميسّر حوار", "Dialogue facilitator"), earned: true },
  { id: "b3", title: L("مشارك في 3 استشارات", "3 consultations"), earned: true },
  { id: "b4", title: L("كاتب محتوى", "Content writer"), earned: false },
  { id: "b5", title: L("قائد مساحة عمل", "Workspace lead"), earned: false },
];

export const ASK_SUGGESTIONS = [
  L("ما تجارب المصالحة التي درستها المنصة؟", "Which reconciliation experiences has the platform studied?"),
  L("كيف أيسّر جلسة حوار في حيّي؟", "How do I facilitate a dialogue session in my neighbourhood?"),
  L("أين أجد أوراق السياسات عن الشباب؟", "Where can I find policy papers on youth?"),
];
