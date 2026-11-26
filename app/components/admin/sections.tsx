"use client";

import { useRef, useState } from "react";
import {
  Archive, BadgeCheck, Ban, CheckCircle2, CircleSlash, Clock, Download, Eye, EyeOff, FileUp, HelpCircle, Lock, MessageSquareReply,
  PauseCircle, PlayCircle, RotateCcw, Send, Trash2, Unlock, Upload,
} from "lucide-react";
import { ACard } from "./shell";
import { biText, Collection, type CollectionConfig, type Item, type StatusDef } from "./collection";
import { ArticlePreview, FaqPreview, LibraryPreview, SurveyPreview, TeamPreview, ThreadPreview } from "./previews";
import { logAction, nowIso, readState, toast, uid, writeState } from "./store";
import type { T } from "../content";

const L = (ar: string, en: string): T => ({ ar, en });
const B = (ar: string, en = "") => ({ ar, en });
const it = (id: string, status: string, created: string, rest: Record<string, unknown>): Item => ({ id, status, created, history: [], ...rest });
const opt = (pairs: [string, string, string][]) => pairs.map(([value, ar, en]) => ({ value, label: L(ar, en) }));

/* Common status sets */
const PUBLISHING: StatusDef[] = [
  { key: "draft", label: L("مسودة", "Draft"), tone: "mute" },
  { key: "review", label: L("قيد المراجعة", "In review"), tone: "warn" },
  { key: "published", label: L("منشور", "Published"), tone: "ok" },
  { key: "archived", label: L("مؤرشف", "Archived"), tone: "mute" },
];
const publishingActions = (what: string, whatEn: string) => [
  { key: "review", label: L("أرسل للمراجعة", "Send to review"), icon: Clock, to: "review", from: ["draft"], done: L("أُرسل للمراجعة", "Sent to review") },
  { key: "publish", label: L("انشر", "Publish"), icon: Send, to: "published", from: ["draft", "review", "archived"], tone: "primary" as const, done: L(`نُشر ${what}`, `${whatEn} published`) },
  { key: "back", label: L("أعِد للكاتب بملاحظات", "Return with notes"), icon: MessageSquareReply, to: "draft", from: ["review"], done: L("أُعيد للكاتب", "Returned to the author"),
    message: { label: L("ملاحظاتك للكاتب", "Your notes for the author"), template: L("شكرًا على «{title}». قبل النشر نحتاج: ", "Thanks for “{title}”. Before publishing we need: "), notifyLabel: L("إشعار الكاتب", "Notify the author") } },
  { key: "unpublish", label: L("أوقف النشر", "Unpublish"), icon: EyeOff, to: "draft", from: ["published"], done: L("أُوقف النشر", "Unpublished") },
  { key: "archive", label: L("أرشِف", "Archive"), icon: Archive, to: "archived", from: ["published", "draft"], done: L("أُرشف", "Archived") },
];

const PLACES = opt([["public", "المنصة العامة", "Public site"], ["hub", "منطقة الأعضاء", "Members' hub"], ["workspace", "مساحة عمل", "Workspace"], ["group", "مجموعة", "Group"], ["proposal", "مقترح", "Proposal"]]);
const WORKSPACES = opt([["map", "خريطة مساحات الحوار المحلية", "Local dialogue spaces map"], ["news", "سلسلة «اقرأ الخبر»", "“Read the news” series"], ["schools", "دليل الحوار للمدارس", "Dialogue guide for schools"], ["podcast", "بودكاست الأجيال", "Generations podcast"], ["archive", "أرشيف المبادرات الشبابية", "Youth initiatives archive"]]);
const GROUPS = opt([["g1", "حوار الضفة الشمالية", "Northern West Bank dialogue"], ["g2", "صنّاع المحتوى", "Content makers"], ["g3", "باحثو المصالحة", "Reconciliation researchers"], ["g4", "مبادرو الجامعات", "University initiators"]]);
const YT = "https://www.youtube.com/watch?v=aqz-KE-bpKQ";

/* ── Moderation: hidden content ── */
export const HIDDEN: CollectionConfig = {
  section: "hidden", titleKey: "excerpt", auditCat: "moderation", noCreate: true,
  lead: L("ما أخفاه الإشراف، مع سببه وصاحبه. أرجِع ما أُخفي خطأً، أو احذفه نهائيًا.", "What moderation hid, with the reason and the author. Restore mistakes or delete for good."),
  subtitle: (i, tx) => `${tx(GROUPS.find((g) => g.value === i.where)?.label ?? L("", ""))} · ${tx((i.reason as T) ?? L("", ""))}`,
  fields: [
    { key: "excerpt", label: L("المحتوى", "Content"), type: "text", bi: true, required: "ar" },
    { key: "kind", label: L("النوع", "Type"), type: "select", list: true, filter: true, options: opt([["post", "منشور", "Post"], ["comment", "تعليق", "Comment"], ["message", "رسالة", "Message"]]) },
    { key: "author", label: L("صاحبه", "Author"), type: "member", list: true, filter: true },
    { key: "where", label: L("المكان", "Where"), type: "select", filter: true, options: GROUPS },
    { key: "reason", label: L("سبب الإخفاء", "Reason"), type: "text", bi: true },
  ],
  statuses: [{ key: "hidden", label: L("مخفي", "Hidden"), tone: "warn" }, { key: "restored", label: L("أُعيد", "Restored"), tone: "ok" }, { key: "deleted", label: L("محذوف نهائيًا", "Deleted"), tone: "bad" }],
  actions: [
    { key: "restore", label: L("أعِده للظهور", "Restore"), icon: RotateCcw, to: "restored", from: ["hidden"], tone: "primary", done: L("أُعيد المحتوى", "Content restored"),
      message: { label: L("رسالة لصاحبه", "Message to the author"), template: L("راجعنا {title} وأعدناه للظهور. نعتذر عن الإزعاج.", "We reviewed your content and restored it. Sorry for the trouble."), notifyLabel: L("إشعار صاحبه", "Notify the author") } },
    { key: "delete", label: L("احذفه نهائيًا", "Delete for good"), icon: Trash2, to: "deleted", from: ["hidden"], tone: "danger", done: L("حُذف المحتوى نهائيًا", "Content deleted") },
    { key: "hide", label: L("أخفِه مجددًا", "Hide again"), icon: EyeOff, to: "hidden", from: ["restored"], done: L("أُخفي المحتوى", "Content hidden") },
  ],
  seed: [
    it("h1", "hidden", "2026-11-22", { excerpt: B("هذا الكلام لا يقوله إلا من لا يفهم شيئًا…", "Only someone who understands nothing would say this…"), kind: "comment", author: "m3", where: "g1", reason: B("إساءة لعضو", "Insulting a member") }),
    it("h2", "hidden", "2026-11-21", { excerpt: B("رابط ترويجي لمتجر إلكتروني", "A promotional shop link"), kind: "message", author: "m7", where: "g2", reason: B("ترويج تجاري", "Commercial promotion") }),
    it("h3", "restored", "2026-11-18", { excerpt: B("صورة من جلسة الحوار في نابلس", "A photo from the Nablus session"), kind: "post", author: "m1", where: "g1", reason: B("بلاغ خاطئ", "Mistaken report") }),
  ],
};

/* ── Moderation: discussions (every opening is logged) ── */
const msg = (from: string, ar: string, en: string, at: string, flagged = false) => ({ from, text: L(ar, en), at, flagged });
export const DISCUSSIONS: CollectionConfig = {
  section: "discussions", titleKey: "title", auditCat: "access", noCreate: true,
  lead: L("اطّلاع كامل على نقاشات المساحات والمجموعات لتجنّب المشاكل مبكرًا. كل فتح لنقاش يُسجَّل في سجل التدقيق.", "Full view of workspace and group discussions to catch problems early. Every opening is logged."),
  onView: (i) => logAction("access", { ar: `فتح نقاش «${biText(i.title, "ar")}»`, en: `Opened the discussion “${biText(i.title, "en")}”` }, `/admin/discussions#v=${i.id}`),
  subtitle: (i, tx) => `${tx(PLACES.find((p) => p.value === i.placeType)?.label ?? L("", ""))} · ${String(i.place ?? "")}`,
  fields: [
    { key: "title", label: L("النقاش", "Discussion"), type: "text", bi: true, required: "ar" },
    { key: "placeType", label: L("المكان", "Place"), type: "select", list: true, filter: true, options: PLACES.filter((p) => p.value === "workspace" || p.value === "group") },
    { key: "place", label: L("اسم المساحة أو المجموعة", "Workspace or group"), type: "text", list: true },
    { key: "count", label: L("الرسائل", "Messages"), type: "number", list: true },
    { key: "flags", label: L("بلاغات", "Reports"), type: "number", list: true },
  ],
  statuses: [{ key: "open", label: L("مفتوح", "Open"), tone: "ok" }, { key: "watched", label: L("تحت المتابعة", "Watched"), tone: "warn" }, { key: "locked", label: L("مقفل", "Locked"), tone: "bad" }],
  actions: [
    { key: "watch", label: L("ضعه تحت المتابعة", "Watch"), icon: Eye, to: "watched", from: ["open"], done: L("وُضع تحت المتابعة", "Now watched") },
    { key: "lock", label: L("أقفل النقاش", "Lock"), icon: Lock, to: "locked", from: ["open", "watched"], tone: "danger", done: L("أُقفل النقاش", "Discussion locked"),
      message: { label: L("رسالة تظهر للأعضاء في النقاش", "Message shown to members in the discussion"), template: L("أُقفل هذا النقاش مؤقتًا لتهدئة الحوار. نرجو العودة إلى قواعد الحوار المحترم.", "This discussion is locked for now to calm things down. Please return to the rules of respectful dialogue."), notifyLabel: L("إشعار المشاركين", "Notify participants") } },
    { key: "unlock", label: L("افتحه", "Unlock"), icon: Unlock, to: "open", from: ["locked", "watched"], done: L("فُتح النقاش", "Discussion reopened") },
  ],
  preview: ThreadPreview,
  seed: [
    it("d1", "watched", "2026-11-22", { title: B("هل نؤجل جلسة جنين؟", "Should we postpone the Jenin session?"), placeType: "group", place: "حوار الضفة الشمالية", count: 42, flags: 3,
      messages: [msg("m4", "الوضع في جنين صعب هذا الأسبوع، أقترح التأجيل.", "Things are hard in Jenin this week; I suggest postponing.", "09:10"), msg("m3", "التأجيل هروب، يجب أن نكمل مهما حصل!", "Postponing is running away; we must go on whatever happens!", "09:24"), msg("m1", "هذا الكلام لا يقوله إلا من لا يفهم شيئًا…", "Only someone who understands nothing would say this…", "09:31", true), msg("m6", "لنهدأ قليلًا ونصوّت على الموعد.", "Let's calm down and vote on the date.", "09:40")] }),
    it("d2", "open", "2026-11-21", { title: B("توزيع حلقات «اقرأ الخبر»", "Splitting “Read the news” episodes"), placeType: "workspace", place: "سلسلة «اقرأ الخبر»", count: 18, flags: 0,
      messages: [msg("m2", "سأكتب الحلقة الثالثة عن الأخبار المضلّلة.", "I'll write episode three on misleading news.", "11:02"), msg("m5", "وأنا أصوّر وأمنتج.", "I'll film and edit.", "11:15")] }),
    it("d3", "open", "2026-11-19", { title: B("أفكار لدليل المدارس", "Ideas for the schools guide"), placeType: "workspace", place: "دليل الحوار للمدارس", count: 27, flags: 0,
      messages: [msg("m8", "نبدأ بتمارين الاستماع.", "Let's start with listening exercises.", "14:20"), msg("m6", "ونضيف قصصًا من الطلاب.", "And add stories from students.", "14:33")] }),
  ],
};

/* ── Work: proposals & challenges ── */
export const PROPOSALS: CollectionConfig = {
  section: "proposals", titleKey: "title", createLabel: L("مقترح جديد", "New proposal"),
  lead: L("مقترحات المساحات والتحديات من الأعضاء. افتح أي مقترح في صفحته، وقرّر: قبول، أو طلب تعديل، أو رفض مع رسالة.", "Workspace proposals and challenges from members. Open any one on its own page and decide: accept, ask for changes, or decline with a message."),
  subtitle: (i, tx) => tx(i.kind === "challenge" ? L("تحدٍّ", "Challenge") : L("مقترح مساحة", "Workspace proposal")),
  fields: [
    { key: "title", label: L("العنوان", "Title"), type: "text", bi: true, required: "ar" },
    { key: "kind", label: L("النوع", "Type"), type: "select", list: true, filter: true, options: opt([["proposal", "مقترح مساحة", "Workspace proposal"], ["challenge", "تحدٍّ", "Challenge"]]) },
    { key: "author", label: L("صاحبه", "Author"), type: "member", list: true, filter: true, required: true },
    { key: "team", label: L("الفريق المقترح", "Proposed team"), type: "members", list: true },
    { key: "summary", label: L("الفكرة", "The idea"), type: "textarea", bi: true, required: "ar" },
    { key: "needs", label: L("ما يحتاجه", "What it needs"), type: "textarea", bi: true },
  ],
  statuses: [{ key: "new", label: L("جديد", "New"), tone: "new" }, { key: "review", label: L("قيد المراجعة", "In review"), tone: "warn" }, { key: "changes", label: L("بانتظار تعديل", "Changes asked"), tone: "warn" }, { key: "accepted", label: L("مقبول", "Accepted"), tone: "ok" }, { key: "declined", label: L("مرفوض", "Declined"), tone: "bad" }],
  actions: [
    { key: "review", label: L("ابدأ المراجعة", "Start review"), icon: Clock, to: "review", from: ["new"], done: L("بدأت المراجعة", "Review started") },
    { key: "accept", label: L("اقبل وأنشئ مساحة", "Accept and open a workspace"), icon: CheckCircle2, to: "accepted", from: ["new", "review", "changes"], tone: "primary", done: L("قُبل المقترح", "Proposal accepted"),
      message: { label: L("رسالة لصاحب المقترح", "Message to the author"), template: L("مبروك! قبلنا مقترحك «{title}» وفتحنا له مساحة عمل. سنتواصل معك لترتيب الفريق.", "Congratulations! We accepted “{title}” and opened a workspace for it. We'll be in touch about the team."), notifyLabel: L("إشعار صاحبه وفريقه", "Notify the author and team") } },
    { key: "changes", label: L("اطلب تعديلًا", "Ask for changes"), icon: MessageSquareReply, to: "changes", from: ["new", "review"], done: L("طُلب تعديل", "Changes requested"),
      message: { label: L("ما المطلوب تعديله", "What should change"), template: L("فكرة «{title}» جميلة. قبل القبول نحتاج: ", "“{title}” is a good idea. Before accepting we need: "), notifyLabel: L("إشعار صاحبه", "Notify the author") } },
    { key: "decline", label: L("ارفض", "Decline"), icon: CircleSlash, to: "declined", from: ["new", "review", "changes"], tone: "danger", done: L("رُفض المقترح", "Proposal declined"),
      message: { label: L("سبب الرفض (يصل لصاحبه)", "Reason (sent to the author)"), template: L("شكرًا على «{title}». لن نستطيع تبنّيه الآن لأن ", "Thanks for “{title}”. We can't take it on now because "), notifyLabel: L("إشعار صاحبه", "Notify the author") } },
  ],
  preview: (i) => TeamPreview({ ...i, summary: i.summary }),
  seed: [
    it("p1", "new", "2026-11-22", { title: B("دليل الحوار للمدارس", "A dialogue guide for schools"), kind: "proposal", author: "m2", team: ["m2", "m6", "m8"], summary: B("دليل عملي للمعلمين لإدارة نقاشات صفية حول القضايا العامة، مع تمارين استماع وقصص من الطلاب.", "A practical guide for teachers to run classroom discussions on public issues, with listening exercises and student stories."), needs: B("مصمم، ومعلّمان للمراجعة، وتمويل للطباعة.", "A designer, two teachers to review, and printing funds.") }),
    it("p2", "review", "2026-11-20", { title: B("جلسات استماع في المخيمات", "Listening sessions in camps"), kind: "proposal", author: "m4", team: ["m4", "m1"], summary: B("سلسلة جلسات صغيرة في ثلاثة مخيمات لسماع أولويات الشباب.", "Small sessions in three camps to hear young people's priorities."), needs: B("ميسّرون ومكان.", "Facilitators and a venue.") }),
    it("p3", "new", "2026-11-19", { title: B("تحدّي: خبر واحد بثلاث روايات", "Challenge: one story, three versions"), kind: "challenge", author: "m5", team: ["m5"], summary: B("تحدٍّ أسبوعي: يقارن الأعضاء تغطية ثلاث وسائل إعلام لخبر واحد.", "A weekly challenge comparing three outlets' coverage of one story."), needs: B("", "") }),
    it("p4", "accepted", "2026-10-30", { title: B("أرشيف المبادرات الشبابية", "Youth initiatives archive"), kind: "proposal", author: "m6", team: ["m6", "m7"], summary: B("أرشيف مفتوح لمبادرات الشباب منذ 2000.", "An open archive of youth initiatives since 2000."), needs: B("", "") }),
  ],
};

/* ── Work: publishing outputs ── */
export const PUBLISH: CollectionConfig = {
  section: "publish", titleKey: "title", createLabel: L("مخرج جديد", "New output"),
  lead: L("مخرجات مساحات العمل قبل نشرها: افتحها، شاهد الفريق والمساحة، ثم انشر أو اطلب مراجعة أو ارفض.", "Workspace outputs before publishing: open them, see the team and workspace, then publish, ask for revision or decline."),
  subtitle: (i, tx) => tx(WORKSPACES.find((w) => w.value === i.workspace)?.label ?? L("", "")),
  fields: [
    { key: "title", label: L("المخرج", "Output"), type: "text", bi: true, required: "ar" },
    { key: "workspace", label: L("المساحة", "Workspace"), type: "select", list: true, filter: true, options: WORKSPACES },
    { key: "kind", label: L("النوع", "Type"), type: "select", list: true, filter: true, options: opt([["report", "تقرير", "Report"], ["video", "فيديو", "Video"], ["podcast", "بودكاست", "Podcast"], ["guide", "دليل", "Guide"]]) },
    { key: "team", label: L("الفريق", "Team"), type: "members", list: true },
    { key: "summary", label: L("الملخّص", "Summary"), type: "textarea", bi: true, required: "ar" },
    { key: "media", label: L("الملف أو الرابط", "File or link"), type: "url", bi: true, hint: L("لكل لغة ملفها", "Each language has its own file") },
  ],
  statuses: [{ key: "submitted", label: L("مُرسل", "Submitted"), tone: "new" }, { key: "review", label: L("قيد المراجعة", "In review"), tone: "warn" }, { key: "changes", label: L("بانتظار تعديل", "Changes asked"), tone: "warn" }, { key: "published", label: L("منشور", "Published"), tone: "ok" }, { key: "declined", label: L("مرفوض", "Declined"), tone: "bad" }],
  actions: [
    { key: "review", label: L("ابدأ المراجعة", "Start review"), icon: Clock, to: "review", from: ["submitted"], done: L("بدأت المراجعة", "Review started") },
    { key: "publish", label: L("انشر في المكتبة", "Publish to the library"), icon: Send, to: "published", from: ["submitted", "review", "changes"], tone: "primary", done: L("نُشر المخرج", "Output published"),
      message: { label: L("رسالة للفريق", "Message to the team"), template: L("نُشر «{title}» في مكتبة ويبال. شكرًا لجهدكم!", "“{title}” is now in the WePal library. Thank you!"), notifyLabel: L("إشعار الفريق", "Notify the team") } },
    { key: "changes", label: L("اطلب مراجعة", "Ask for revision"), icon: MessageSquareReply, to: "changes", from: ["submitted", "review"], done: L("طُلبت مراجعة", "Revision requested"),
      message: { label: L("ما المطلوب", "What's needed"), template: L("قبل نشر «{title}» نحتاج: ", "Before publishing “{title}” we need: "), notifyLabel: L("إشعار الفريق", "Notify the team") } },
    { key: "decline", label: L("ارفض", "Decline"), icon: CircleSlash, to: "declined", from: ["submitted", "review", "changes"], tone: "danger", done: L("رُفض المخرج", "Output declined"),
      message: { label: L("السبب", "Reason"), template: L("لن ننشر «{title}» لأن ", "We won't publish “{title}” because "), notifyLabel: L("إشعار الفريق", "Notify the team") } },
  ],
  preview: TeamPreview,
  seed: [
    it("o1", "submitted", "2026-11-21", { title: B("خريطة مساحات الحوار المحلية", "Local dialogue spaces map"), workspace: "map", kind: "report", team: ["m1", "m4", "m6"], summary: B("خريطة تفاعلية بـ 64 مكانًا للحوار في الضفة وغزة.", "An interactive map of 64 dialogue spaces in the West Bank and Gaza."), media: B("/images/nablus.webp", "") }),
    it("o2", "review", "2026-11-18", { title: B("الحلقة الثالثة: الخبر المضلّل", "Episode 3: misleading news"), workspace: "news", kind: "video", team: ["m2", "m5"], summary: B("فيديو قصير عن كشف الأخبار المضلّلة.", "A short video on spotting misleading news."), media: B(YT, YT) }),
    it("o3", "published", "2026-10-12", { title: B("بودكاست الأجيال: الحلقة الأولى", "Generations podcast: episode 1"), workspace: "podcast", kind: "podcast", team: ["m7", "m8"], summary: B("حوار بين جدّة وحفيدها عن الثقة.", "A grandmother and grandson talk about trust."), media: B("", "") }),
  ],
};

/* ── Dialogue: groups ── */
export const GROUPS_C: CollectionConfig = {
  section: "groups", titleKey: "name", createLabel: L("مجموعة جديدة", "New group"), auditCat: "members",
  lead: L("مجموعات المناطق والمسارات: أنشئ، وعدّل، وعيّن المشرفين، وأرشِف.", "Region and track groups: create, edit, set moderators, archive."),
  fields: [
    { key: "name", label: L("الاسم", "Name"), type: "text", bi: true, required: true },
    { key: "kind", label: L("النوع", "Type"), type: "select", list: true, filter: true, options: opt([["region", "منطقة", "Region"], ["track", "مسار", "Track"]]) },
    { key: "privacy", label: L("الانضمام", "Joining"), type: "select", list: true, options: opt([["open", "مفتوح", "Open"], ["request", "بطلب", "On request"]]) },
    { key: "members", label: L("الأعضاء", "Members"), type: "number", list: true },
    { key: "mods", label: L("المشرفون", "Moderators"), type: "members", list: true },
    { key: "about", label: L("الوصف", "About"), type: "textarea", bi: true },
    { key: "cover", label: L("صورة الغلاف", "Cover"), type: "image" },
  ],
  statuses: [{ key: "active", label: L("نشطة", "Active"), tone: "ok" }, { key: "archived", label: L("مؤرشفة", "Archived"), tone: "mute" }],
  actions: [
    { key: "archive", label: L("أرشِف", "Archive"), icon: Archive, to: "archived", from: ["active"], done: L("أُرشفت المجموعة", "Group archived") },
    { key: "restore", label: L("أعِد تفعيلها", "Reactivate"), icon: RotateCcw, to: "active", from: ["archived"], done: L("أُعيد تفعيل المجموعة", "Group reactivated") },
  ],
  seed: [
    it("g1", "active", "2026-02-01", { name: B("حوار الضفة الشمالية", "Northern West Bank dialogue"), kind: "region", privacy: "open", members: 86, mods: ["m1"], about: B("لأعضاء نابلس وجنين وطولكرم.", "For members in Nablus, Jenin and Tulkarm."), cover: "/images/nablus.webp" }),
    it("g2", "active", "2026-02-03", { name: B("صنّاع المحتوى", "Content makers"), kind: "track", privacy: "open", members: 124, mods: ["m2", "m5"], about: B("فيديو وبودكاست وكتابة.", "Video, podcasts and writing."), cover: "" }),
    it("g3", "active", "2026-03-11", { name: B("باحثو المصالحة", "Reconciliation researchers"), kind: "track", privacy: "request", members: 41, mods: ["m3"], about: B("قراءات وأوراق بحثية.", "Readings and papers."), cover: "" }),
    it("g4", "archived", "2026-01-15", { name: B("مبادرو الجامعات 2025", "University initiators 2025"), kind: "track", privacy: "request", members: 58, mods: [], about: B("دورة العام الماضي.", "Last year's cohort."), cover: "" }),
  ],
};

/* ── Dialogue: surveys ── */
export const SURVEYS: CollectionConfig = {
  section: "surveys", titleKey: "question", createLabel: L("استطلاع جديد", "New survey"),
  lead: L("كل استطلاع: من نشره، وأين (عام، منطقة الأعضاء، مساحة، مجموعة، مقترح)، ومتى، وكم إجابة. الاستطلاع الموجّه للمنصة العامة يُراجَع هنا قبل نشره.", "Every survey: who posted it, where (public, hub, workspace, group, proposal), when, and how many answered. Public surveys are reviewed here before going live."),
  subtitle: (i, tx) => `${tx(PLACES.find((p) => p.value === i.place)?.label ?? L("", ""))}${i.placeName ? ` · ${i.placeName}` : ""}`,
  dateKey: "published",
  stats: (items, rtl) => [
    { value: items.filter((i) => i.place === "public").length, label: rtl ? "عام" : "public" },
    { value: items.filter((i) => i.place !== "public").length, label: rtl ? "في المنصة" : "in the platform" },
    { value: items.filter((i) => i.status === "pending").length, label: rtl ? "بانتظار مراجعة" : "awaiting review" },
    { value: items.reduce((n, i) => n + ((i.results as number[]) ?? []).reduce((a, b) => a + b, 0), 0), label: rtl ? "إجابة" : "responses" },
  ],
  fields: [
    { key: "question", label: L("السؤال", "Question"), type: "text", bi: true, required: "ar" },
    { key: "options", label: L("الخيارات (كل خيار في سطر)", "Options (one per line)"), type: "textarea", bi: true, required: "ar", rows: 4, hideInView: true },
    { key: "place", label: L("أين يُنشر", "Where"), type: "select", list: true, filter: true, options: PLACES },
    { key: "placeName", label: L("اسم المساحة/المجموعة/المقترح", "Workspace/group/proposal name"), type: "text" },
    { key: "author", label: L("نشره", "Posted by"), type: "member", list: true, filter: true },
    { key: "published", label: L("تاريخ النشر", "Published"), type: "date" },
  ],
  statuses: [{ key: "draft", label: L("مسودة", "Draft"), tone: "mute" }, { key: "pending", label: L("بانتظار مراجعة", "Awaiting review"), tone: "warn" }, { key: "live", label: L("مفتوح", "Live"), tone: "ok" }, { key: "closed", label: L("مغلق", "Closed"), tone: "mute" }],
  actions: [
    { key: "approve", label: L("وافق وانشر للعامة", "Approve and publish"), icon: BadgeCheck, to: "live", from: ["pending"], tone: "primary", done: L("اعتُمد الاستطلاع ونُشر", "Survey approved and live") },
    { key: "send", label: L("أرسل للمراجعة", "Send to review"), icon: Clock, to: "pending", from: ["draft"], done: L("أُرسل للمراجعة", "Sent to review") },
    { key: "back", label: L("أعِده بملاحظات", "Return with notes"), icon: MessageSquareReply, to: "draft", from: ["pending"], done: L("أُعيد بملاحظات", "Returned with notes"),
      message: { label: L("ملاحظاتك", "Your notes"), template: L("قبل نشر الاستطلاع للعامة نحتاج: ", "Before publishing to the public we need: "), notifyLabel: L("إشعار صاحبه", "Notify the author") } },
    { key: "close", label: L("أغلق الاستطلاع", "Close"), icon: PauseCircle, to: "closed", from: ["live"], done: L("أُغلق الاستطلاع", "Survey closed") },
    { key: "reopen", label: L("أعِد فتحه", "Reopen"), icon: PlayCircle, to: "live", from: ["closed"], done: L("أُعيد فتح الاستطلاع", "Survey reopened") },
  ],
  preview: SurveyPreview,
  seed: [
    it("s1", "live", "2026-11-10", { question: B("كيف تتابع الأخبار؟", "How do you follow the news?"), options: B("وسائل التواصل\nالتلفزيون\nالمواقع الإخبارية\nمن الأصدقاء", "Social media\nTV\nNews sites\nFrom friends"), place: "public", placeName: "", author: "m6", published: "2026-11-10", results: [212, 48, 97, 31] }),
    it("s2", "pending", "2026-11-21", { question: B("ما أولويتك للعام 2027؟", "Your priority for 2027?"), options: B("العمل\nالتعليم\nالمشاركة السياسية", "Jobs\nEducation\nPolitical participation"), place: "public", placeName: "", author: "m1", published: "", results: [0, 0, 0] }),
    it("s3", "live", "2026-11-15", { question: B("أي موعد يناسب جلسة جنين؟", "Which date suits the Jenin session?"), options: B("السبت\nالإثنين\nالأربعاء", "Saturday\nMonday\nWednesday"), place: "group", placeName: "حوار الضفة الشمالية", author: "m4", published: "2026-11-15", results: [14, 6, 9] }),
    it("s4", "closed", "2026-10-02", { question: B("هل نكمل الحلقة الثالثة بصيغة فيديو؟", "Should episode 3 be a video?"), options: B("نعم\nلا، صوت فقط", "Yes\nNo, audio only"), place: "workspace", placeName: "سلسلة «اقرأ الخبر»", author: "m2", published: "2026-10-02", results: [11, 3] }),
    it("s5", "live", "2026-11-05", { question: B("ما الذي ينقص منطقة الأعضاء؟", "What's missing in the members' hub?"), options: B("تطبيق جوال\nفعاليات أكثر\nتدريبات", "A mobile app\nMore events\nTrainings"), place: "hub", placeName: "", author: "m8", published: "2026-11-05", results: [64, 41, 58] }),
  ],
};

/* ── Dialogue: consultations & outcomes ── */
export const CONSULTATIONS: CollectionConfig = {
  section: "consultations", titleKey: "title", createLabel: L("مشاورة جديدة", "New consultation"),
  lead: L("المشاورات المفتوحة والمغلقة: السؤال، والخيارات، والموعد، والتصويت.", "Open and closed consultations: the question, options, deadline and votes."),
  fields: [
    { key: "title", label: L("العنوان", "Title"), type: "text", bi: true, required: "ar" },
    { key: "question", label: L("السؤال", "Question"), type: "textarea", bi: true, required: "ar", rows: 2 },
    { key: "options", label: L("الخيارات (كل خيار في سطر)", "Options (one per line)"), type: "textarea", bi: true, rows: 4, hideInView: true },
    { key: "deadline", label: L("آخر موعد", "Deadline"), type: "date", list: true },
    { key: "votes", label: L("الأصوات", "Votes"), type: "number", list: true },
  ],
  statuses: [{ key: "draft", label: L("مسودة", "Draft"), tone: "mute" }, { key: "open", label: L("مفتوحة", "Open"), tone: "ok" }, { key: "closed", label: L("مغلقة", "Closed"), tone: "mute" }],
  actions: [
    { key: "open", label: L("افتح للتصويت", "Open for votes"), icon: PlayCircle, to: "open", from: ["draft", "closed"], tone: "primary", done: L("فُتحت المشاورة", "Consultation opened") },
    { key: "close", label: L("أغلق واكتب الخلاصة", "Close and summarise"), icon: PauseCircle, to: "closed", from: ["open"], done: L("أُغلقت المشاورة", "Consultation closed") },
  ],
  preview: (i) => SurveyPreview({ ...i, question: i.title, results: i.results ?? [] }),
  seed: [
    it("c1", "open", "2026-11-12", { title: B("أولويات الشأن العام 2027", "2027 public priorities"), question: B("ما القضية التي يجب أن تتصدر عمل المنصة؟", "Which issue should lead the platform's work?"), options: B("البطالة\nالتعليم\nالمشاركة السياسية\nالصحة النفسية", "Unemployment\nEducation\nPolitical participation\nMental health"), deadline: "2026-11-29", votes: 214, results: [81, 52, 47, 34] }),
    it("c2", "closed", "2026-09-01", { title: B("قواعد الحوار في المجموعات", "Group dialogue rules"), question: B("أي القواعد نعتمد؟", "Which rules do we adopt?"), options: B("الصيغة القصيرة\nالصيغة المفصّلة", "Short version\nDetailed version"), deadline: "2026-09-20", votes: 167, results: [98, 69] }),
    it("c3", "draft", "2026-11-22", { title: B("مكان اللقاء السنوي", "Annual meetup venue"), question: B("أين نعقد اللقاء السنوي؟", "Where should the annual meetup be?"), options: B("رام الله\nنابلس\nأونلاين", "Ramallah\nNablus\nOnline"), deadline: "2026-12-15", votes: 0, results: [0, 0, 0] }),
  ],
};

export const OUTCOMES: CollectionConfig = {
  section: "outcomes", titleKey: "title", createLabel: L("خلاصة جديدة", "New outcome"),
  lead: L("خلاصات الحوارات والمشاورات: تُكتب، وتُعتمد، ثم تُنشر.", "Summaries of dialogues and consultations: written, approved, then published."),
  fields: [
    { key: "title", label: L("العنوان", "Title"), type: "text", bi: true, required: "ar" },
    { key: "source", label: L("المصدر", "Source"), type: "text", list: true },
    { key: "author", label: L("كتبها", "Written by"), type: "member", list: true },
    { key: "summary", label: L("الخلاصة", "Summary"), type: "textarea", bi: true, required: "ar", rows: 6 },
  ],
  statuses: [{ key: "draft", label: L("مسودة", "Draft"), tone: "mute" }, { key: "pending", label: L("بانتظار الاعتماد", "Awaiting approval"), tone: "warn" }, { key: "approved", label: L("معتمدة", "Approved"), tone: "new" }, { key: "published", label: L("منشورة", "Published"), tone: "ok" }],
  actions: [
    { key: "approve", label: L("اعتمد", "Approve"), icon: BadgeCheck, to: "approved", from: ["pending", "draft"], tone: "primary", done: L("اعتُمدت الخلاصة", "Outcome approved") },
    { key: "publish", label: L("انشر", "Publish"), icon: Send, to: "published", from: ["approved"], tone: "primary", done: L("نُشرت الخلاصة", "Outcome published") },
    { key: "back", label: L("أعِد بملاحظات", "Return with notes"), icon: MessageSquareReply, to: "draft", from: ["pending"], done: L("أُعيدت بملاحظات", "Returned with notes"),
      message: { label: L("ملاحظاتك", "Your notes"), template: L("قبل اعتماد «{title}»: ", "Before approving “{title}”: "), notifyLabel: L("إشعار الكاتب", "Notify the writer") } },
  ],
  seed: [
    it("u1", "pending", "2026-11-20", { title: B("خلاصة مشاورة قواعد الحوار", "Dialogue rules consultation: outcome"), source: "قواعد الحوار في المجموعات", author: "m3", summary: B("اختار 59% من المشاركين الصيغة القصيرة، مع إضافة بند عن احترام الاختلاف.", "59% chose the short version, adding a clause on respecting difference.") }),
    it("u2", "published", "2026-10-02", { title: B("ما تعلّمناه من جلسات الجامعات", "What we learned from university sessions"), source: "جلسات الجامعات", author: "m1", summary: B("خمس جامعات، 180 طالبًا، وثلاث توصيات.", "Five universities, 180 students and three recommendations.") }),
  ],
};

/* ── Content: news, stories, library, FAQ ── */
const ARTICLE_FIELDS = (labelHint?: T) => [
  { key: "title", label: L("العنوان", "Title"), type: "text" as const, bi: true, required: "ar" as const },
  { key: "summary", label: L("الملخّص", "Summary"), type: "textarea" as const, bi: true, rows: 2 },
  { key: "body", label: L("النص", "Body"), type: "textarea" as const, bi: true, rows: 8 },
  { key: "author", label: L("الكاتب", "Author"), type: "member" as const, list: true, filter: true },
  { key: "cover", label: L("صورة الغلاف", "Cover image"), type: "image" as const, hint: labelHint },
  { key: "gallery", label: L("صور إضافية", "More images"), type: "images" as const },
];
export const NEWS: CollectionConfig = {
  section: "news", titleKey: "title", createLabel: L("خبر جديد", "New article"),
  lead: L("أخبار المنصة: اكتب، وراجع، وانشر. كل لغة لها نصّها، وزر العين يعرض الخبر كما يظهر في الموقع.", "Platform news: write, review, publish. Each language has its own text; the eye shows it as on the site."),
  fields: ARTICLE_FIELDS(), statuses: PUBLISHING, actions: publishingActions("الخبر", "Article"), preview: ArticlePreview,
  seed: [
    it("n1", "published", "2026-11-20", { title: B("انطلاق دورة الحوار في خمس جامعات", "Dialogue course launches in five universities"), summary: B("180 طالبًا في دورة من ست جلسات.", "180 students in a six-session course."), body: B("انطلقت هذا الأسبوع دورة الحوار في خمس جامعات فلسطينية.\nتمتد الدورة ستة أسابيع، وتنتهي بلقاء مشترك.", "This week the dialogue course started in five Palestinian universities.\nIt runs for six weeks and ends with a joint meetup."), author: "m1", cover: "/images/facilitators.webp", gallery: [] }),
    it("n2", "review", "2026-11-22", { title: B("ويبال تطلق خريطة مساحات الحوار", "WePal launches the dialogue spaces map"), summary: B("64 مكانًا في الضفة وغزة.", "64 places in the West Bank and Gaza."), body: B("أطلقت ويبال خريطة تفاعلية…", ""), author: "m6", cover: "/images/nablus.webp", gallery: [] }),
    it("n3", "draft", "2026-11-23", { title: B("لقاء الشركاء السنوي", ""), summary: B("", ""), body: B("", ""), author: "m8", cover: "", gallery: [] }),
  ],
};

export const STORIES: CollectionConfig = {
  section: "stories", titleKey: "title", createLabel: L("قصة جديدة", "New story"),
  lead: L("قصص النجاح والأثر. الإنجليزية إلزامية في القصص. «الوسم» هو الكلمة الصغيرة فوق عنوان القصة في الموقع (مثل: قصة أثر).", "Success and impact stories. English is required for stories. The “label” is the small word above the title on the site (e.g. Impact story)."),
  fields: [
    { key: "title", label: L("العنوان", "Title"), type: "text", bi: true, required: true },
    { key: "label", label: L("الوسم فوق العنوان", "Label above the title"), type: "text", bi: true, hint: L("مثل: قصة أثر، من الميدان", "e.g. Impact story, From the field") },
    { key: "summary", label: L("الملخّص", "Summary"), type: "textarea", bi: true, required: true, rows: 2 },
    { key: "body", label: L("القصة", "The story"), type: "textarea", bi: true, required: true, rows: 8 },
    { key: "author", label: L("صاحب القصة", "Whose story"), type: "member", list: true, filter: true },
    { key: "cover", label: L("صورة الغلاف", "Cover image"), type: "image" },
    { key: "gallery", label: L("صور القصة", "Story images"), type: "images" },
  ],
  statuses: PUBLISHING, actions: publishingActions("القصة", "Story"), preview: ArticlePreview,
  seed: [
    it("t1", "published", "2026-11-02", { title: B("من غرفة صفّ إلى مساحة حوار", "From a classroom to a dialogue space"), label: B("قصة أثر", "Impact story"), summary: B("كيف حوّلت هبة صفّها إلى مساحة نقاش أسبوعية.", "How Heba turned her classroom into a weekly discussion space."), body: B("بدأت هبة بخمسة طلاب…\nاليوم يحضر الجلسة أربعون.", "Heba started with five students…\nToday forty attend."), author: "m8", cover: "/images/facilitators.webp", gallery: ["/images/nablus.webp", "/images/library.webp"] }),
    it("t2", "review", "2026-11-21", { title: B("بودكاست من غزة", "A podcast from Gaza"), label: B("من الميدان", "From the field"), summary: B("سارة تسجّل الحلقات رغم انقطاع الكهرباء.", "Sara records episodes despite power cuts."), body: B("تسجّل سارة في ساعات الكهرباء القليلة…", "Sara records in the few hours of electricity…"), author: "m2", cover: "/images/gaza.webp", gallery: [] }),
  ],
};

const LIB_KINDS = opt([["video", "فيديو", "Video"], ["podcast", "بودكاست", "Podcast"], ["guide", "دليل", "Guide"], ["factsheet", "ورقة حقائق", "Fact sheet"], ["analysis", "تحليل", "Analysis"], ["report", "تقرير", "Report"], ["gallery", "معرض صور", "Gallery"]]);
export const LIBRARY: CollectionConfig = {
  section: "library", titleKey: "title", createLabel: L("إضافة للمكتبة", "Add to library"), chipsBy: "kind",
  lead: L("كل ما يُنشر في المكتبة، والتحليلات صارت نوعًا منها. لكل لغة ملفها أو رابطها الخاص: رابط يوتيوب يُعرض كفيديو داخل الموقع، والصوت بمشغّل، ويمكن رفع عدة صور.", "Everything in the library; analyses are now one of its types. Each language has its own file or link: YouTube plays in the site, audio gets a player, and you can add several images."),
  fields: [
    { key: "title", label: L("العنوان", "Title"), type: "text", bi: true, required: "ar" },
    { key: "kind", label: L("النوع", "Type"), type: "select", list: true, filter: true, options: LIB_KINDS },
    { key: "summary", label: L("الوصف", "Description"), type: "textarea", bi: true, rows: 3 },
    { key: "media", label: L("الملف أو الرابط", "File or link"), type: "url", bi: true, hint: L("العربي والإنجليزي منفصلان: تغيير أحدهما لا يغيّر الآخر", "Arabic and English are separate: changing one doesn't change the other"), placeholder: "https://…" },
    { key: "cover", label: L("الغلاف", "Cover"), type: "image", list: true, coverMaker: true, hint: L("ارفع صورة، أو صمّم غلافًا موحّدًا بهوية ويبال", "Upload an image, or design a unified WePal cover") },
    { key: "gallery", label: L("صور", "Images"), type: "images" },
    { key: "tags", label: L("الوسوم", "Tags"), type: "tags" },
    { key: "author", label: L("أضافه", "Added by"), type: "member", list: true },
  ],
  statuses: [{ key: "draft", label: L("مسودة", "Draft"), tone: "mute" }, { key: "published", label: L("منشور", "Published"), tone: "ok" }, { key: "archived", label: L("مؤرشف", "Archived"), tone: "mute" }],
  actions: publishingActions("في المكتبة", "In the library").filter((a) => a.key !== "review" && a.key !== "back"),
  preview: LibraryPreview,
  seed: [
    it("l1", "published", "2026-11-14", { title: B("كيف تكشف الخبر المضلّل؟", "How to spot misleading news"), kind: "video", summary: B("فيديو من سلسلة «اقرأ الخبر».", "A video from the “Read the news” series."), media: B(YT, YT), cover: "/images/library.webp", gallery: [], tags: ["إعلام", "تحقق"], author: "m2" }),
    it("l2", "published", "2026-10-28", { title: B("بودكاست الأجيال: الثقة", "Generations podcast: trust"), kind: "podcast", summary: B("حوار بين جدّة وحفيدها.", "A grandmother and grandson talk."), media: B("https://cdn.pixabay.com/audio/2022/03/15/audio_c8c8a73467.mp3", ""), cover: "/images/facilitators.webp", gallery: [], tags: ["بودكاست"], author: "m7" }),
    it("l3", "published", "2026-09-12", { title: B("دليل تيسير الجلسات", "Session facilitation guide"), kind: "guide", summary: B("خطوات عملية لإدارة جلسة حوار.", "Practical steps to run a dialogue session."), media: B("https://wepal.ps/files/facilitation-guide-ar.pdf", "https://wepal.ps/files/facilitation-guide-en.pdf"), cover: "/images/nablus.webp", gallery: [], tags: ["تيسير"], author: "m1" }),
    it("l4", "published", "2026-08-30", { title: B("ورقة حقائق: الوصول إلى التعليم", "Fact sheet: access to education"), kind: "factsheet", summary: B("أرقام وتحديات الوصول إلى التعليم.", "Numbers and challenges in access to education."), media: B("https://wepal.ps/files/education-factsheet.pdf", ""), cover: "", gallery: ["/images/gaza.webp", "/images/library.webp", "/images/nablus.webp"], tags: ["تعليم"], author: "m3" }),
    it("l5", "draft", "2026-11-22", { title: B("تحليل: الشباب والانتخابات المحلية", "Analysis: youth and local elections"), kind: "analysis", summary: B("قراءة في نسب المشاركة.", ""), media: B("", ""), cover: "", gallery: [], tags: ["انتخابات"], author: "m4" }),
    it("l6", "published", "2026-11-01", { title: B("صور: لقاء نابلس", "Photos: the Nablus meetup"), kind: "gallery", summary: B("من لقاء الحوار في نابلس.", "From the Nablus dialogue meetup."), media: B("", ""), cover: "/images/nablus.webp", gallery: ["/images/facilitators.webp", "/images/nablus.webp", "/images/library.webp", "/images/gaza.webp"], tags: [], author: "m6" }),
  ],
};

const FAQ_CATS = opt([["general", "عام", "General"], ["membership", "العضوية", "Membership"], ["workspaces", "المساحات", "Workspaces"], ["privacy", "الخصوصية", "Privacy"]]);
export const FAQ: CollectionConfig = {
  section: "faq", titleKey: "question", createLabel: L("سؤال جديد", "New question"), chipsBy: "category",
  lead: L("الأسئلة الشائعة كما تظهر في الموقع، مفلترة حسب النوع.", "FAQs as they appear on the site, filtered by type."),
  fields: [
    { key: "question", label: L("السؤال", "Question"), type: "text", bi: true, required: "ar" },
    { key: "answer", label: L("الجواب", "Answer"), type: "textarea", bi: true, required: "ar", rows: 5 },
    { key: "category", label: L("التصنيف", "Category"), type: "select", list: true, filter: true, options: FAQ_CATS },
    { key: "audience", label: L("يظهر في", "Shown on"), type: "select", list: true, options: opt([["public", "الموقع العام", "Public site"], ["members", "منطقة الأعضاء", "Members' hub"], ["both", "الاثنين", "Both"]]) },
  ],
  statuses: [{ key: "draft", label: L("مسودة", "Draft"), tone: "mute" }, { key: "published", label: L("منشور", "Published"), tone: "ok" }],
  actions: [
    { key: "publish", label: L("انشر", "Publish"), icon: Send, to: "published", from: ["draft"], tone: "primary", done: L("نُشر السؤال", "Question published") },
    { key: "unpublish", label: L("أوقف النشر", "Unpublish"), icon: EyeOff, to: "draft", from: ["published"], done: L("أُوقف النشر", "Unpublished") },
  ],
  preview: FaqPreview,
  seed: [
    it("f1", "published", "2026-06-01", { question: B("كيف أنضم إلى ويبال؟", "How do I join WePal?"), answer: B("بدعوة من فريق المنصة أو من شريك، ثم تُكمل ملفك في دقيقة.", "Through an invitation from the team or a partner; then you complete your profile in a minute."), category: "membership", audience: "public" }),
    it("f2", "published", "2026-06-01", { question: B("ما هي مساحة العمل؟", "What is a workspace?"), answer: B("فريق صغير يعمل على مخرج محدد: دليل، فيديو، أو تقرير.", "A small team working on one output: a guide, a video or a report."), category: "workspaces", audience: "both" }),
    it("f3", "published", "2026-07-10", { question: B("من يرى بياناتي؟", "Who sees my data?"), answer: B("اسمك ومدينتك يظهران للأعضاء فقط، ولا نشارك بريدك أو رقمك.", "Your name and city are visible to members only; we never share your email or number."), category: "privacy", audience: "both" }),
    it("f4", "draft", "2026-11-22", { question: B("هل يمكنني اقتراح مساحة؟", "Can I propose a workspace?"), answer: B("نعم، من «مساحات العمل» ثم «اقترح مساحة».", ""), category: "workspaces", audience: "members" }),
  ],
};

/* ── Content: assistant knowledge ── */
export const ASSISTANT: CollectionConfig = {
  section: "assistant", titleKey: "title", createLabel: L("مصدر جديد", "New source"),
  lead: L("ما يعرفه المساعد: كل مصدر مع تغطيته وحالته. حدّث المصدر حين تتغيّر المعلومة، أو أوقفه إن صار قديمًا.", "What the assistant knows: each source with its coverage and state. Refresh a source when facts change, or pause it if outdated."),
  fields: [
    { key: "title", label: L("المصدر", "Source"), type: "text", bi: true, required: "ar" },
    { key: "kind", label: L("النوع", "Type"), type: "select", list: true, filter: true, options: opt([["faq", "أسئلة شائعة", "FAQ"], ["library", "مكتبة", "Library"], ["page", "صفحة من الموقع", "Site page"], ["policy", "سياسة", "Policy"]]) },
    { key: "coverage", label: L("التغطية %", "Coverage %"), type: "number", list: true },
    { key: "updated", label: L("آخر تحديث", "Last refreshed"), type: "date", list: true },
    { key: "notes", label: L("ما يغطيه", "What it covers"), type: "textarea", bi: true },
  ],
  statuses: [{ key: "active", label: L("فعّال", "Active"), tone: "ok" }, { key: "stale", label: L("يحتاج تحديثًا", "Needs refresh"), tone: "warn" }, { key: "paused", label: L("موقوف", "Paused"), tone: "mute" }],
  actions: [
    { key: "refresh", label: L("حدّث الآن", "Refresh now"), icon: RotateCcw, to: "active", from: ["stale", "paused"], tone: "primary", done: L("حُدّث المصدر", "Source refreshed"), run: () => ({ updated: nowIso().slice(0, 10) }) },
    { key: "pause", label: L("أوقفه", "Pause"), icon: PauseCircle, to: "paused", from: ["active", "stale"], done: L("أُوقف المصدر", "Source paused") },
  ],
  seed: [
    it("a1", "active", "2026-06-01", { title: B("الأسئلة الشائعة", "FAQ"), kind: "faq", coverage: 92, updated: "2026-11-20", notes: B("العضوية والمساحات والخصوصية.", "Membership, workspaces, privacy.") }),
    it("a2", "stale", "2026-05-12", { title: B("دليل تيسير الجلسات", "Facilitation guide"), kind: "library", coverage: 61, updated: "2026-07-02", notes: B("خطوات الجلسة؛ الطبعة الجديدة لم تُضف بعد.", "Session steps; the new edition isn't in yet.") }),
    it("a3", "active", "2026-04-01", { title: B("صفحة «عن المنصة»", "About page"), kind: "page", coverage: 88, updated: "2026-11-02", notes: B("الرؤية والشركاء.", "Vision and partners.") }),
    it("a4", "paused", "2026-03-10", { title: B("سياسة الخصوصية 2025", "Privacy policy 2025"), kind: "policy", coverage: 40, updated: "2026-03-10", notes: B("نسخة قديمة.", "Old version.") }),
  ],
};

/* ── Content: search queries (what people ask, and whether they got an answer) ── */
export const SEARCH: CollectionConfig = {
  section: "search-queries", titleKey: "query", noCreate: true, dateKey: "last",
  lead: L("ما يسأله الناس في «اسأل» (المساعد) وفي بحث المكتبة: هل وجدوا جوابًا، وكم شخصًا سأل، ومن أين. السؤال المتكرر يُضاف للأسئلة الشائعة بضغطة.", "What people ask in “Ask” (the assistant) and in library search: did they find an answer, how many asked, and where from. Add a frequent question to the FAQ in one click."),
  subtitle: (i, tx) => `${tx(i.area === "assistant" ? L("«اسأل» · المساعد", "“Ask” · assistant") : L("بحث المكتبة", "Library search"))} · ${tx(i.where === "public" ? L("المنصة العامة", "Public site") : L("منطقة الأعضاء", "Members' hub"))}`,
  stats: (items, rtl) => [
    { value: items.reduce((n, i) => n + Number(i.times ?? 0), 0), label: rtl ? "مرة سُئلت" : "times asked" },
    { value: items.filter((i) => i.answered === "no").length, label: rtl ? "بلا جواب" : "unanswered" },
    { value: items.filter((i) => i.where === "public").length, label: rtl ? "من العامة" : "from the public" },
    { value: items.filter((i) => i.where === "hub").length, label: rtl ? "من الأعضاء" : "from members" },
  ],
  fields: [
    { key: "query", label: L("السؤال", "Question"), type: "text", bi: true },
    { key: "area", label: L("أين سُئل", "Asked in"), type: "select", list: true, filter: true, options: opt([["assistant", "«اسأل» (المساعد)", "“Ask” (assistant)"], ["library", "بحث المكتبة", "Library search"]]) },
    { key: "where", label: L("المنصة", "Platform"), type: "select", list: true, filter: true, options: opt([["public", "العامة", "Public"], ["hub", "الأعضاء", "Members"]]) },
    { key: "answered", label: L("له جواب؟", "Answered?"), type: "select", list: true, filter: true, options: opt([["yes", "نعم", "Yes"], ["no", "لا", "No"]]) },
    { key: "times", label: L("مرات السؤال", "Times asked"), type: "number", list: true },
    { key: "people", label: L("أشخاص", "People"), type: "number", list: true },
    { key: "last", label: L("آخر مرة", "Last asked"), type: "date" },
  ],
  statuses: [{ key: "new", label: L("جديد", "New"), tone: "new" }, { key: "faq", label: L("أُضيف للأسئلة الشائعة", "Added to FAQ"), tone: "ok" }, { key: "ignored", label: L("مُتجاهَل", "Ignored"), tone: "mute" }],
  actions: [
    { key: "faq", label: L("أضِفه للأسئلة الشائعة", "Add to the FAQ"), icon: HelpCircle, to: "faq", from: ["new", "ignored"], tone: "primary", done: L("أُضيف للأسئلة الشائعة كمسودة", "Added to the FAQ as a draft"),
      run: (i) => {
        const list = readState<Item[]>("c:faq", FAQ.seed);
        writeState("c:faq", [{ id: uid(), status: "draft", created: nowIso(), history: [], question: i.query, answer: { ar: "", en: "" }, category: "general", audience: i.where === "public" ? "public" : "members" }, ...list]);
        return { answered: "yes" };
      } },
    { key: "ignore", label: L("تجاهل", "Ignore"), icon: Ban, to: "ignored", from: ["new"], done: L("تُجوهل السؤال", "Question ignored") },
  ],
  preview: (i) => (
    <ACard title={biText(i.query, "ar")}>
      <div className="a-preview">
        <p className="a-muted">{i.answered === "no" ? "لم يجد السائلون جوابًا. ابحث في المكتبة وفي المساعد:" : "وجد السائلون جوابًا. للمراجعة:"}</p>
        <div className="a-actions-row">
          <a className="a-btn is-sm" href={`/library?q=${encodeURIComponent(biText(i.query, "ar"))}`} target="_blank" rel="noopener">ابحث في المكتبة</a>
          <a className="a-btn is-sm" href="/admin/assistant">مصادر المساعد</a>
          <a className="a-btn is-sm" href="/admin/faq">الأسئلة الشائعة</a>
        </div>
      </div>
    </ACard>
  ),
  seed: [
    it("q1", "new", "2026-11-23", { query: B("كيف أقترح مساحة عمل؟", "How do I propose a workspace?"), area: "assistant", where: "hub", answered: "no", times: 23, people: 17, last: "2026-11-23" }),
    it("q2", "new", "2026-11-22", { query: B("مواعيد دورة الحوار", "Dialogue course dates"), area: "assistant", where: "public", answered: "no", times: 41, people: 36, last: "2026-11-22" }),
    it("q3", "new", "2026-11-21", { query: B("دليل التيسير بالإنجليزية", "Facilitation guide in English"), area: "library", where: "public", answered: "yes", times: 12, people: 11, last: "2026-11-21" }),
    it("q4", "faq", "2026-11-10", { query: B("من يرى بياناتي؟", "Who sees my data?"), area: "assistant", where: "hub", answered: "yes", times: 19, people: 15, last: "2026-11-18" }),
    it("q5", "new", "2026-11-20", { query: B("بودكاست عن الانتخابات", "Podcast about elections"), area: "library", where: "hub", answered: "no", times: 7, people: 6, last: "2026-11-20" }),
  ],
};

/* ── Platform: inbox ── */
export const INBOX: CollectionConfig = {
  section: "inbox", titleKey: "subject", noCreate: true, auditCat: "members",
  lead: L("رسائل التواصل والشركاء والاشتراكات. ردّ من هنا، أو أرشِف.", "Contact, partner and subscription messages. Reply from here, or archive."),
  subtitle: (i) => `${String(i.from ?? "")} · ${String(i.email ?? "")}`,
  fields: [
    { key: "subject", label: L("الموضوع", "Subject"), type: "text", bi: true },
    { key: "kind", label: L("النوع", "Type"), type: "select", list: true, filter: true, options: opt([["contact", "تواصل", "Contact"], ["partner", "شريك", "Partner"], ["subscribe", "اشتراك", "Subscription"]]) },
    { key: "from", label: L("المرسل", "From"), type: "text", list: true },
    { key: "email", label: L("البريد", "Email"), type: "text" },
    { key: "body", label: L("الرسالة", "Message"), type: "textarea", bi: true },
  ],
  statuses: [{ key: "new", label: L("جديد", "New"), tone: "new" }, { key: "replied", label: L("تم الرد", "Replied"), tone: "ok" }, { key: "archived", label: L("مؤرشف", "Archived"), tone: "mute" }],
  actions: [
    { key: "reply", label: L("ردّ", "Reply"), icon: MessageSquareReply, to: "replied", from: ["new"], tone: "primary", done: L("أُرسل الرد", "Reply sent"),
      message: { label: L("ردّك (يصل لبريد المرسل)", "Your reply (sent to their email)"), template: L("مرحبًا، شكرًا لتواصلك مع ويبال. ", "Hello, thank you for contacting WePal. ") } },
    { key: "archive", label: L("أرشِف", "Archive"), icon: Archive, to: "archived", from: ["new", "replied"], done: L("أُرشفت الرسالة", "Message archived") },
  ],
  seed: [
    it("i1", "new", "2026-11-23", { subject: B("شراكة مع جامعة بيرزيت", ""), kind: "partner", from: "مكتب شؤون الطلبة", email: "students@example.edu", body: B("نرغب بتنظيم جلسات حوار مشتركة في الفصل القادم.", "") }),
    it("i2", "new", "2026-11-22", { subject: B("سؤال عن العضوية", ""), kind: "contact", from: "ريم", email: "reem@example.com", body: B("كيف أحصل على دعوة للانضمام؟", "") }),
    it("i3", "replied", "2026-11-18", { subject: B("اشتراك في النشرة", "Newsletter subscription"), kind: "subscribe", from: "Lina", email: "lina@example.com", body: B("", "Please add me to the newsletter.") }),
  ],
};

/* ── Members: invitations (with a sheet upload) ── */
type Row = { name: string; phone: string; code: string };
const makeCode = () => `WP-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
export const INVITATIONS: CollectionConfig = {
  section: "invitations", titleKey: "name", createLabel: L("دفعة يدوية", "Manual batch"), auditCat: "members",
  lead: L("دفعات الدعوات: ارفع ملف شيت (CSV) فيه الأسماء والأرقام، فيُولَّد لكل رقم كود دعوة ويُرسل مع رسالة ثابتة.", "Invitation batches: upload a sheet (CSV) of names and numbers; each number gets an invitation code sent with a fixed message."),
  subtitle: (i) => `${(i.rows as Row[] | undefined)?.length ?? Number(i.count ?? 0)} ${"·"} ${String(i.region ?? "")}`,
  fields: [
    { key: "name", label: L("اسم الدفعة", "Batch name"), type: "text", bi: true, required: "ar" },
    { key: "region", label: L("المنطقة", "Region"), type: "text", list: true },
    { key: "count", label: L("عدد الدعوات", "Invitations"), type: "number", list: true },
    { key: "used", label: L("استُخدم", "Used"), type: "number", list: true },
    { key: "message", label: L("الرسالة الثابتة", "Fixed message"), type: "textarea", bi: true, hint: L("{name} و{code} تُستبدلان تلقائيًا", "{name} and {code} are filled in") },
  ],
  statuses: [{ key: "draft", label: L("جاهزة للإرسال", "Ready"), tone: "new" }, { key: "sent", label: L("أُرسلت", "Sent"), tone: "ok" }, { key: "expired", label: L("منتهية", "Expired"), tone: "mute" }],
  actions: [
    { key: "send", label: L("أرسل للجميع", "Send to everyone"), icon: Send, to: "sent", from: ["draft"], tone: "primary", done: L("أُرسلت الدعوات", "Invitations sent") },
    { key: "expire", label: L("أنهِ صلاحيتها", "Expire"), icon: CircleSlash, to: "expired", from: ["sent", "draft"], tone: "danger", done: L("انتهت صلاحية الدفعة", "Batch expired") },
  ],
  preview: (i) => <InviteRows it={i} />,
  extra: (ctx) => <InviteUpload {...ctx} />,
  seed: [
    it("v1", "sent", "2026-11-12", { name: B("طلاب جامعة النجاح", "An-Najah students"), region: "نابلس", count: 24, used: 17, message: B("مرحبًا {name}، أنت مدعو لمنصة ويبال. كود دعوتك: {code}", "Hi {name}, you're invited to WePal. Your code: {code}"), rows: [{ name: "سامي", phone: "0599000001", code: "WP-7KQ2" }, { name: "دينا", phone: "0599000002", code: "WP-M3XA" }] }),
    it("v2", "draft", "2026-11-22", { name: B("مبادرو طولكرم", "Tulkarm initiators"), region: "طولكرم", count: 12, used: 0, message: B("مرحبًا {name}، كود دعوتك لويبال: {code}", ""), rows: [] }),
    it("v3", "expired", "2026-06-01", { name: B("دورة 2025", "2025 cohort"), region: "عدة مناطق", count: 60, used: 52, message: B("", ""), rows: [] }),
  ],
};

function InviteRows({ it: i }: { it: Item }) {
  const rows = (i.rows as Row[]) ?? [];
  const msgAr = (i.message as { ar: string })?.ar ?? "";
  const csv = () => {
    const text = "name,phone,code\n" + rows.map((r) => `${r.name},${r.phone},${r.code}`).join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["﻿" + text], { type: "text/csv" })); a.download = `invitations-${i.id}.csv`; a.click();
  };
  return (
    <ACard title="الدعوات والأكواد" sub={`${rows.length} دعوة`} end={rows.length ? <button type="button" className="a-btn is-sm" onClick={csv}><Download aria-hidden="true" />نزّل الأكواد</button> : undefined}>
      {rows.length ? (
        <>
          <p className="a-muted">مثال على الرسالة: «{msgAr.replace("{name}", rows[0].name).replace("{code}", rows[0].code)}»</p>
          <div className="a-table-wrap"><table className="a-table"><thead><tr><th>الاسم</th><th>الرقم</th><th>الكود</th></tr></thead>
            <tbody>{rows.map((r, k) => <tr key={k}><td>{r.name}</td><td dir="ltr">{r.phone}</td><td><code>{r.code}</code></td></tr>)}</tbody></table></div>
        </>
      ) : <p className="a-muted">لا أسماء في هذه الدفعة. ارفع ملفًا من صفحة الدعوات.</p>}
    </ACard>
  );
}

function InviteUpload({ rtl, setItems }: { rtl: boolean; setItems: (f: (v: Item[]) => Item[]) => void }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [name, setName] = useState("");
  const [message, setMessage] = useState(rtl ? "مرحبًا {name}، أنت مدعو للانضمام إلى منصة ويبال. كود دعوتك: {code}" : "Hi {name}, you're invited to join WePal. Your code: {code}");
  const [err, setErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const parse = async (f: File | undefined) => {
    if (!f) return;
    setErr("");
    const text = await f.text();
    const lines = text.replace(/^﻿/, "").split(/\r?\n/).map((l) => l.split(/[,;\t]/).map((c) => c.trim())).filter((c) => c.some(Boolean));
    if (lines.length && !/\d{6,}/.test(lines[0].join(""))) lines.shift(); // header row
    const parsed = lines.map((c) => { const phone = c.find((x) => /\d{6,}/.test(x.replace(/\D/g, ""))) ?? ""; const nm = c.find((x) => x && x !== phone) ?? ""; return { name: nm, phone, code: makeCode() }; }).filter((r) => r.phone);
    if (!parsed.length) { setErr(rtl ? "لم أجد أرقامًا في الملف. المطلوب عمودان: الاسم والرقم." : "No numbers found. The sheet needs two columns: name and number."); return; }
    setRows(parsed); if (!name) setName(f.name.replace(/\.[^.]+$/, ""));
  };
  const sample = () => {
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["﻿الاسم,الرقم\nسامي خالد,0599123456\nدينا عمر,0569123456\n"], { type: "text/csv" })); a.download = "invitations-sample.csv"; a.click();
  };
  const create = (send: boolean) => {
    const item: Item = { id: uid(), status: send ? "sent" : "draft", created: nowIso(), history: send ? [{ at: nowIso(), text: { ar: "أُرسلت الدعوات", en: "Invitations sent" } }] : [], name: { ar: name || (rtl ? "دفعة جديدة" : "New batch"), en: "" }, region: "", count: rows.length, used: 0, message: { ar: message, en: "" }, rows };
    setItems((v) => [item, ...v]);
    logAction("members", { ar: `${send ? "أرسل" : "جهّز"} دفعة دعوات (${rows.length})`, en: `${send ? "Sent" : "Prepared"} an invitation batch (${rows.length})` }, `/admin/invitations#v=${item.id}`);
    toast(send ? (rtl ? `أُرسلت ${rows.length} دعوة` : `${rows.length} invitations sent`) : (rtl ? "حُفظت الدفعة" : "Batch saved"));
    setRows([]); setName("");
  };
  return (
    <ACard title={rtl ? "دفعة من ملف" : "Batch from a sheet"} sub={rtl ? "CSV بعمودين: الاسم والرقم (يُصدَّر من Excel أو Google Sheets)" : "CSV with two columns: name and number (export from Excel or Google Sheets)"}
      end={<button type="button" className="a-btn is-sm" onClick={sample}><Download aria-hidden="true" />{rtl ? "ملف مثال" : "Sample file"}</button>}>
      {!rows.length ? (
        <label className="a-drop" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); void parse(e.dataTransfer.files[0]); }}>
          <FileUp aria-hidden="true" /><b>{rtl ? "اسحب الملف هنا أو اضغط للاختيار" : "Drop the file here or click to choose"}</b><small>.csv</small>
          <input ref={fileRef} type="file" accept=".csv,text/csv,.txt" onChange={(e) => { void parse(e.target.files?.[0]); e.target.value = ""; }} />
        </label>
      ) : (
        <div className="a-form">
          <label className="a-fgroup"><span className="a-flabel">{rtl ? "اسم الدفعة" : "Batch name"}</span><input value={name} onChange={(e) => setName(e.target.value)} /></label>
          <label className="a-fgroup"><span className="a-flabel">{rtl ? "الرسالة الثابتة" : "Fixed message"}<small>{"{name} {code}"}</small></span><textarea rows={2} value={message} onChange={(e) => setMessage(e.target.value)} /></label>
          <p className="a-muted">{rtl ? "معاينة:" : "Preview:"} «{message.replace("{name}", rows[0].name).replace("{code}", rows[0].code)}»</p>
          <div className="a-table-wrap a-table-short"><table className="a-table"><thead><tr><th>{rtl ? "الاسم" : "Name"}</th><th>{rtl ? "الرقم" : "Number"}</th><th>{rtl ? "الكود" : "Code"}</th></tr></thead>
            <tbody>{rows.slice(0, 8).map((r, k) => <tr key={k}><td>{r.name}</td><td dir="ltr">{r.phone}</td><td><code>{r.code}</code></td></tr>)}</tbody></table>
            {rows.length > 8 && <p className="a-empty-line">+{rows.length - 8}</p>}</div>
          <div className="a-modal-f">
            <button type="button" className="a-btn" onClick={() => setRows([])}>{rtl ? "إلغاء" : "Cancel"}</button>
            <button type="button" className="a-btn" onClick={() => create(false)}>{rtl ? "احفظ دون إرسال" : "Save without sending"}</button>
            <button type="button" className="a-btn is-primary" onClick={() => create(true)}><Upload aria-hidden="true" />{rtl ? `أرسل ${rows.length} دعوة` : `Send ${rows.length} invitations`}</button>
          </div>
        </div>
      )}
      {err && <p className="a-err" role="alert">{err}</p>}
    </ACard>
  );
}

export const CONFIGS: Record<string, CollectionConfig> = {
  hidden: HIDDEN, discussions: DISCUSSIONS, proposals: PROPOSALS, publish: PUBLISH, groups: GROUPS_C, surveys: SURVEYS,
  consultations: CONSULTATIONS, outcomes: OUTCOMES, news: NEWS, stories: STORIES, library: LIBRARY, faq: FAQ,
  assistant: ASSISTANT, "search-queries": SEARCH, inbox: INBOX, invitations: INVITATIONS,
};
export function CollectionSection({ k }: { k: string }) { return <Collection key={k} config={CONFIGS[k]} />; }
