// ============================================================
// SLIS — النموذج المجالي والبيانات الوهمية
// مبني على اتفاقات المستشارين (v1.3): محاور هيرمان الخمسة،
// معادلة المواءمة، تصنيف موثوقية الملف، وضعا التشغيل، النطاق.
// ============================================================

export type Trust = "trusted" | "reserved" | "interview";
export type MissionStatus = "draft" | "open" | "screening" | "closed";
export type ScopeLevel = "school" | "grade" | "stage" | "class";
export type OperatingMode = "A" | "B";

// المحاور الخمسة (نموذج هيرمان) — كما وثّقها المستشار النفسي
export const AXES = [
  { key: "org", label: "التنظيم والانضباط", short: "تنظيم" },
  { key: "lead", label: "القيادة وتحمّل المسؤولية", short: "قيادة" },
  { key: "comm", label: "التواصل والعمل الجماعي", short: "تواصل" },
  { key: "firm", label: "الحزم والنزاهة", short: "حزم" },
  { key: "init", label: "المبادرة والمرونة", short: "مبادرة" },
] as const;
export type AxisKey = (typeof AXES)[number]["key"];

export type AxisScores = Record<AxisKey, number>; // 0..100

// محاولة اختبار واحدة (لعرض تاريخ المحاولات والفروقات)
export interface Attempt {
  id: string;
  date: string;            // YYYY-MM-DD
  competency: number;
  behavior: number;
  axes: AxisScores;
  contradiction: number;
  socialDesirability: number;
  trust: Trust;
  composite: number;       // مؤشر مركّب = (الكفاية+السلوك)/2
  best: boolean;           // هل هي الأفضل؟
}

export interface Candidate {
  id: string;
  name: string;
  grade: string;
  className: string;
  avatarColor: string;
  axes: AxisScores;
  competency: number;   // نتيجة الكفايات القيادية (70%)
  behavior: number;     // نتيجة المواقف السلوكية (30%)
  match: number;        // نسبة المواءمة النهائية للمهمة
  wishRank: number | null; // ترتيب رغبة الطالب
  contradiction: number;   // 0..10 درجة التناقض
  socialDesirability: number; // 0..5 فخاخ الكمال
  trust: Trust;
  interviewDone: boolean;
  assessed: boolean;   // هل أدّى المقياس؟ (المضافون حديثًا: false)
  hasAccount?: boolean; // هل يملك حساب دخول مرتبط؟
  note?: string;
  attempts?: Attempt[];   // كل محاولات الطالب (الأحدث أولًا)
  assessedAt?: string;    // تاريخ المحاولة الأفضل
  nationalId?: string;    // رقم الهوية
  email?: string;
  phone?: string;
  supervisorNotes?: string; // تقييم وملاحظات المشرف/المدرسة عن الطالب (مرجع دائم)
  experience?: number;    // 0..3 مؤشر الخبرة القيادية (السؤال ٣٦)
}

export interface Mission {
  id: string;
  title: string;
  scopeType: ScopeLevel;
  scopeLabel: string;
  scopeRef?: string;   // مرجع النطاق: اسم الفصل/الصف عند نطاق «صف/فصل»
  mode: OperatingMode;
  seats: number;
  supervisor: string;
  status: MissionStatus;
  applicants: number;
  eligible: number;
  createdAt: string;
  // أوزان المحاور لهذه المهمة (تجمع 100) — مثال مسؤول النظام في الوثيقة
  weights: Record<AxisKey, number>;
  candidateIds: string[];
  hasConflict?: boolean;
}

// ---- تصنيف الموثوقية وفق معادلة المستشار النفسي ----
export function classifyTrust(contradiction: number, social: number): Trust {
  if (contradiction >= 6 || social >= 4) return "interview";
  if (contradiction >= 3 || social >= 2) return "reserved";
  return "trusted";
}

export const TRUST_META: Record<Trust, { label: string; tone: string; desc: string }> = {
  trusted:  { label: "ملف موثوق",     tone: "success", desc: "إجابات تلقائية صادقة نسبيًا" },
  reserved: { label: "يستوجب تحفّظًا", tone: "warning", desc: "تأثّر ملحوظ بالمقبولية الاجتماعية" },
  interview:{ label: "يُنصح بمقابلة",  tone: "danger",  desc: "الملف لا يُعبّر عن السلوك بموثوقية كافية" },
};

const C = (
  id: string, name: string, grade: string, className: string, avatarColor: string,
  axes: AxisScores, wishRank: number | null, contradiction: number, social: number,
  interviewDone = false, note?: string
): Candidate => {
  const competency = Math.round((axes.org + axes.lead + axes.comm + axes.firm + axes.init) / 5);
  const behavior = Math.round(competency * 0.9 + (100 - social * 8) * 0.1);
  return {
    id, name, grade, className, avatarColor, axes,
    competency, behavior,
    match: 0, // يُحسب لكل مهمة بأوزانها
    wishRank, contradiction, socialDesirability: social,
    trust: classifyTrust(contradiction, social), interviewDone, assessed: true, note,
  };
};

// إنشاء طالب جديد لم يؤدِّ المقياس بعد
export function newStudent(id: string, name: string, grade: string, className: string): Candidate {
  const colors = ["#0f5c66","#7a5cc9","#c98a3b","#3b7ac9","#2f9e7d","#c95c7a","#5c8ac9","#8a7a3b"];
  const color = colors[Math.abs(hashStr(id)) % colors.length];
  return {
    id, name, grade, className, avatarColor: color,
    axes: { org: 0, lead: 0, comm: 0, firm: 0, init: 0 },
    competency: 0, behavior: 0, match: 0, wishRank: null,
    contradiction: 0, socialDesirability: 0, trust: "trusted",
    interviewDone: false, assessed: false,
  };
}
function hashStr(s: string) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; }

export const CANDIDATES: Candidate[] = [
  C("st1","أحمد محمد الغامدي","الثاني الثانوي","٢/أ","#0f5c66",{org:92,lead:88,comm:79,firm:91,init:84},1,1,0,true),
  C("st2","خالد علي الشهري","الثاني الثانوي","٢/أ","#7a5cc9",{org:80,lead:90,comm:87,firm:76,init:82},2,4,2,false,"تباين واضح بين الاتساق والسيناريو"),
  C("st3","يوسف سالم القحطاني","الأول الثانوي","١/ب","#c98a3b",{org:85,lead:82,comm:83,firm:88,init:70},1,2,1,false),
  C("st4","عمر حسن الزهراني","الثالث الثانوي","٣/أ","#3b7ac9",{org:74,lead:80,comm:78,firm:72,init:81},3,7,4,false,"يُنصح بمقابلة قبل الترشيح"),
  C("st5","سلطان فهد العتيبي","الثاني الثانوي","٢/ب","#2f9e7d",{org:88,lead:76,comm:72,firm:90,init:79},2,0,1,false),
  C("st6","ماجد ناصر الدوسري","الأول الثانوي","١/أ","#c95c7a",{org:70,lead:85,comm:90,firm:68,init:83},null,3,2,false),
  C("st7","بندر تركي المطيري","الثالث الثانوي","٣/ب","#5c8ac9",{org:83,lead:79,comm:81,firm:85,init:77},1,1,0,true),
  C("st8","فيصل عبدالله الحربي","الثاني الثانوي","٢/أ","#8a7a3b",{org:78,lead:83,comm:76,firm:80,init:88},4,2,3,false),
  // الطالب المُسجَّل في بوابة الطالب (غير مُرشَّح مسبقًا لأي مهمة — يبدأ الدورة من الصفر)
  C("me","ناصر سعد القحطاني","الثاني الثانوي","٢/ب","#0f766e",{org:86,lead:83,comm:88,firm:79,init:85},null,1,1,false),
];

export const ME_ID = "me";

const cand = (id: string) => CANDIDATES.find((c) => c.id === id)!;

// حساب المواءمة لمهمة بأوزانها (كفايات×سلوك×أولويات المهمة) — مبسّط للعرض
export function computeMatch(c: Candidate, m: Mission): number {
  const weighted =
    (c.axes.org * m.weights.org +
      c.axes.lead * m.weights.lead +
      c.axes.comm * m.weights.comm +
      c.axes.firm * m.weights.firm +
      c.axes.init * m.weights.init) / 100;
  // 85% نتيجة المحاور الموزونة + 10% رغبة الطالب + 5% إتمام المقابلة (نموذج مبسّط)
  const wish = c.wishRank ? Math.max(0, 100 - (c.wishRank - 1) * 12) : 60;
  const interview = c.interviewDone ? 100 : 70;
  // مؤشر الخبرة القيادية: أثر محدود جدًّا (حتى +٣ نقاط) كعلامة تمييز لا تُرجّح بقوة
  const expBonus = Math.min(3, (c.experience ?? 0));
  return Math.min(100, Math.round(weighted * 0.85 + wish * 0.1 + interview * 0.05) + expBonus);
}

export const MISSIONS: Mission[] = [
  {
    id: "m1", title: "مسؤول جماعة النظام الطلابي", scopeType: "school",
    scopeLabel: "كامل المدرسة", mode: "B", seats: 1, supervisor: "أ. سعد المالكي",
    status: "screening", applicants: 6, eligible: 214, createdAt: "1446/02/12",
    weights: { org: 25, lead: 20, comm: 10, firm: 25, init: 20 },
    candidateIds: ["st1","st5","st3","st7","st2","st8"], hasConflict: true,
  },
  {
    id: "m2", title: "قائد فريق الفعاليات", scopeType: "stage",
    scopeLabel: "المرحلة الثانوية", mode: "A", seats: 2, supervisor: "أ. ماجد الأحمدي",
    status: "open", applicants: 5, eligible: 214, createdAt: "1446/02/15",
    weights: { org: 15, lead: 25, comm: 30, firm: 10, init: 20 },
    candidateIds: ["st6","st2","st8","st3","st7"],
  },
  {
    id: "m3", title: "عريف الفصل ٢/أ", scopeType: "grade",
    scopeLabel: "الصف الثاني الثانوي — فصل أ", mode: "A", seats: 1, supervisor: "أ. فهد العنزي",
    status: "screening", applicants: 3, eligible: 28, createdAt: "1446/01/28",
    weights: { org: 30, lead: 20, comm: 20, firm: 20, init: 10 },
    candidateIds: ["st1","st5","st8"],
  },
  {
    id: "m4", title: "منظّم الإذاعة المدرسية", scopeType: "school",
    scopeLabel: "كامل المدرسة", mode: "B", seats: 2, supervisor: "أ. سعد المالكي",
    status: "open", applicants: 4, eligible: 214, createdAt: "1446/02/20",
    weights: { org: 15, lead: 15, comm: 35, firm: 10, init: 25 },
    candidateIds: ["st6","st2","st7","st3"],
  },
  {
    id: "m5", title: "ممثل المجلس الطلابي", scopeType: "stage",
    scopeLabel: "المرحلة الثانوية", mode: "A", seats: 1, supervisor: "أ. ماجد الأحمدي",
    status: "draft", applicants: 0, eligible: 214, createdAt: "1446/02/22",
    weights: { org: 20, lead: 30, comm: 20, firm: 20, init: 10 },
    candidateIds: [],
  },
];

// ترتيب مرشّحي مهمة حسب المواءمة
export function rankedCandidates(m: Mission): Candidate[] {
  return m.candidateIds
    .map((id) => {
      const c = { ...cand(id) };
      c.match = computeMatch(c, m);
      return c;
    })
    .sort((a, b) => b.match - a.match);
}

// المهام التي رُشّح لها الطالب مع ترتيبه ونسبته
export function studentMissions(studentId: string) {
  const out: { mission: Mission; rank: number; match: number; seat: boolean }[] = [];
  MISSIONS.forEach((m) => {
    if (!m.candidateIds.includes(studentId)) return;
    const ranked = rankedCandidates(m);
    const idx = ranked.findIndex((c) => c.id === studentId);
    if (idx >= 0) out.push({ mission: m, rank: idx + 1, match: ranked[idx].match, seat: idx < m.seats });
  });
  return out.sort((a, b) => b.match - a.match);
}

export interface Teacher { id: string; name: string; role: string; nationalId?: string; email?: string; phone?: string }
export const TEACHER_ROLES = ["منسّق النظام", "وكيل المدرسة", "مرشد طلابي", "رائد فصل", "مشرف مهمة"];
export const TEACHERS: Teacher[] = [
  { id: "t1", name: "أ. سعد المالكي", role: "منسّق النظام" },
  { id: "t2", name: "أ. ماجد الأحمدي", role: "رائد فصل" },
  { id: "t3", name: "أ. فهد العنزي", role: "مشرف مهمة" },
  { id: "t4", name: "أ. عبدالله الشمري", role: "مرشد طلابي" },
];

export interface SchoolClass { id: string; name: string; grade: string; homeroom: string; students: number }
export const CLASSES: SchoolClass[] = [
  { id: "c1", name: "٢/أ", grade: "الثاني الثانوي", homeroom: "أ. فهد العنزي", students: 28 },
  { id: "c2", name: "٢/ب", grade: "الثاني الثانوي", homeroom: "أ. ماجد الأحمدي", students: 26 },
  { id: "c3", name: "١/أ", grade: "الأول الثانوي", homeroom: "أ. سعد المالكي", students: 30 },
  { id: "c4", name: "١/ب", grade: "الأول الثانوي", homeroom: "أ. عبدالله الشمري", students: 27 },
  { id: "c5", name: "٣/أ", grade: "الثالث الثانوي", homeroom: "أ. فهد العنزي", students: 25 },
];

export const SCHOOL = {
  name: "ثانوية الملك عبدالعزيز",
  tenant: "sch_1043",
  students: 214,
  classes: 9,
  activeMissions: MISSIONS.filter((m) => ["open","screening"].includes(m.status)).length,
  mode: "B" as OperatingMode,
  quota: { total: 200, used: 128, missionQuota: 150, missionUsed: 104, individual: 50, individualUsed: 24 },
};

// ===== الاشتراك والحصص (المستشار التسويقي + الفريق التقني) =====
export const SUBSCRIPTION = {
  plan: "المتوسطة",
  planQuota: 200,
  priceSAR: 2499,
  renewsAt: "1446/06/15",
  daysLeft: 82,
  overagePriceSAR: 15,      // سعر الاختبار الإضافي
  rolloverPct: 25,          // نسبة الترحيل المسموحة
  alertAt: 25,              // تنبيه عند 25% متبقٍّ
  buckets: {
    mission:    { alloc: 150, used: 104 },
    individual: { alloc: 40,  used: 24 },
    buffer:     { alloc: 10,  used: 0 },
  },
  // استهلاك آخر 6 أسابيع
  weekly: [8, 12, 15, 22, 31, 40],
};

export interface IndReq {
  id: string; student: string; grade: string; color: string;
  purpose: string; date: string;
}
export const IND_REQUESTS: IndReq[] = [
  { id:"r1", student:"ماجد ناصر الدوسري", grade:"١/أ", color:"#c95c7a", purpose:"تطوير ذاتي", date:"اليوم" },
  { id:"r2", student:"فيصل عبدالله الحربي", grade:"٢/أ", color:"#8a7a3b", purpose:"استعداد لمهمة مقبلة", date:"أمس" },
  { id:"r3", student:"عمر حسن الزهراني", grade:"٣/أ", color:"#3b7ac9", purpose:"معرفة الملف القيادي", date:"قبل يومين" },
];

// خطط الجهات المؤسسية (بعدد الاختبارات)
export const INST_PLANS = [
  { name:"الناشئة", tests:50,  price:999,  note:"مدارس حتى ٢٠٠ طالب" },
  { name:"المتوسطة", tests:200, price:2499, note:"مدارس حتى ٨٠٠ طالب", current:true },
  { name:"الكبيرة", tests:500, price:4999, note:"مدارس حتى ١٨٠٠ طالب" },
  { name:"المؤسسي", tests:0,   price:9999, note:"مجموعات مدارس — غير محدود" },
];

export const STATUS_META: Record<MissionStatus, { label: string; tone: string }> = {
  draft:     { label: "مسودة",       tone: "muted" },
  open:      { label: "تقديم مفتوح", tone: "info" },
  screening: { label: "قيد الفرز",   tone: "warning" },
  closed:    { label: "مكتملة التكليف", tone: "success" },
};

export const SCOPE_META: Record<ScopeLevel, string> = {
  school: "المدرسة", grade: "الصف الدراسي", stage: "مرحلة", class: "الفصل",
};

// ===== الحوكمة والتظلّمات (المستشار الإداري) =====
export type AppealTrack = "A" | "B" | "C";
export type AppealStatus = "new" | "review" | "resolved";
export interface Appeal {
  id: string; student: string; color: string; track: AppealTrack;
  subject: string; daysElapsed: number; slaMax: number;
  status: AppealStatus; decider: string;
}
export const APPEAL_TRACK: Record<AppealTrack, { label: string; decider: string; sla: number; tone: string }> = {
  A: { label: "تظلّم الطالب",  decider: "مدير المدرسة / منسّق النظام", sla: 5,  tone: "info" },
  B: { label: "نزاع مؤسسي",    decider: "مدير النظام المركزي",         sla: 10, tone: "warning" },
  C: { label: "تظلّم قانوني",  decider: "لجنة تحكيم مستقلة (٣)",        sla: 21, tone: "danger" },
};
export const APPEALS: Appeal[] = [
  { id:"ap1", student:"خالد علي الشهري", color:"#7a5cc9", track:"A", subject:"اعتراض على نتيجة اختبار المواءمة", daysElapsed:2, slaMax:5, status:"review", decider:"أ. سعد المالكي" },
  { id:"ap2", student:"عمر حسن الزهراني", color:"#3b7ac9", track:"A", subject:"طلب إعادة تقييم بعد المقابلة", daysElapsed:4, slaMax:5, status:"new", decider:"—" },
  { id:"ap3", student:"— (ولي أمر)", color:"#2f9e7d", track:"C", subject:"شكوى بخصوص سياسة البيانات", daysElapsed:9, slaMax:21, status:"review", decider:"لجنة التحكيم" },
];

// مصفوفة المساءلة RACI
export const RACI = {
  cols: ["الطالب/الولي", "منسّق النظام", "مدير المدرسة", "مدير النظام المركزي"],
  rows: [
    { p:"قبول مدرسة جديدة",      v:["–","تنفيذ","م","م"] },
    { p:"إنشاء مهمة قيادية",     v:["–","م","م","–"] },
    { p:"إجراء اختبار المواءمة", v:["تنفيذ","م","ر","–"] },
    { p:"اعتماد التكليف التجريبي",v:["إشعار","تنفيذ","م","–"] },
    { p:"الفصل في تظلّم (ب/ج)",  v:["تقديم","ر","ر","م"] },
    { p:"تحديث سياسة الحوكمة",   v:["–","تنفيذ","ر","م"] },
  ],
};

export const GOV_LEVELS = [
  { level:"مدير النظام المركزي", scope:"المنصة بالكامل", resp:"قبول المدارس · السياسات المركزية · النزاعات المُصعّدة · تقارير المنصة" },
  { level:"إدارة المدرسة",        scope:"مدرسة واحدة",   resp:"إدارة المستخدمين · المهام · تقارير المدرسة · تنظيم الاختبارات" },
  { level:"الطالب",              scope:"حساب شخصي",     resp:"استعراض الفرص · الاختبارات · متابعة التكليف · التظلّم" },
];

// ===== طبقة المنصة المركزية =====
export interface PlatformSchool {
  id: string; name: string; city: string; students: number;
  plan: string; status: "active" | "frozen" | "onboarding" | "deleted"; note: string;
  stage?: string; address?: string; email?: string; phone?: string;
}
export const PLATFORM_SCHOOLS: PlatformSchool[] = [
  { id:"s1", name:"ثانوية الملك عبدالعزيز", city:"الرياض", students:214, plan:"المتوسطة", status:"active", note:"نشطة" },
  { id:"s2", name:"ثانوية الأمير سلطان",    city:"جدة",    students:640, plan:"الكبيرة",  status:"active", note:"نشطة" },
  { id:"s3", name:"متوسطة الفيصل",          city:"الدمام", students:180, plan:"الناشئة",  status:"onboarding", note:"مراجعة تشغيلية ٣٠ يومًا" },
  { id:"s4", name:"ثانوية اليرموك",         city:"الرياض", students:410, plan:"المتوسطة", status:"frozen", note:"انتهى العقد — احتفاظ ٩٠ يومًا" },
];
export const SCHOOL_STATUS: Record<PlatformSchool["status"], { label: string; tone: string }> = {
  active: { label:"نشطة", tone:"success" },
  onboarding: { label:"قيد الانضمام", tone:"info" },
  frozen: { label:"مُعلّقة", tone:"warning" },
  deleted: { label:"محذوفة", tone:"danger" },
};
export const PLATFORM_KPI = {
  schools: 4, active: 2, disputesOpen: 3,
  dataCompliance: 94, renewalRate: 72, satisfaction: 86,
};
export const ONBOARDING_STEPS = [
  "طلب الانضمام عبر البوابة",
  "مراجعة مركزية (٥ أيام)",
  "توقيع العقد وسداد الرسوم",
  "تفعيل الحساب والصلاحيات",
  "دورة التأهيل وإعداد البيانات",
  "مراجعة تشغيلية بعد ٣٠ يومًا",
];

export interface AlertItem { id: string; kind: "danger"|"warning"|"info"; text: string; }
export const ALERTS: AlertItem[] = [
  { id: "a1", kind: "danger",  text: "تعارض زمني: أحمد الغامدي مرشّح لمهمتين متزامنتين (النظام + عريف الفصل)." },
  { id: "a2", kind: "warning", text: "مهمة «قائد فريق الفعاليات» لم يكتمل اختبار مرشّحَين اثنين بعد." },
  { id: "a3", kind: "warning", text: "خالد الشهري: ملف يستوجب تحفّظًا — يُنصح بمقابلة قبل الاعتماد." },
  { id: "a4", kind: "info",    text: "حصة الاختبارات المهمّية بلغت ٦٩٪ من المخصّص لها." },
];
