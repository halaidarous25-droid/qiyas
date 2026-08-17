import { supabase } from "./supabase";
import { classifyTrust, type Candidate, type Attempt, type Mission, type Teacher, type SchoolClass, type IndReq, type OperatingMode, type AxisScores, type PlatformSchool, type Appeal, type AppealTrack, type AppealStatus } from "@/data/mock";

// اشتراك المدرسة بالشكل الذي تستهلكه شاشة الحصص
export interface LiveSubscription {
  plan: string;
  planQuota: number;
  priceSAR: number;
  renewsAt: string;
  daysLeft: number | null;
  overagePriceSAR: number;
  rolloverPct: number;
  alertAt: number;
  buckets: {
    mission: { alloc: number; used: number };
    individual: { alloc: number; used: number };
    buffer: { alloc: number; used: number };
  };
  weekly: number[];
}

export interface Seed {
  schoolId: string;
  schoolName: string;
  schoolCity: string;
  schoolStage: string;
  schoolAddress: string;
  schoolEmail: string;
  schoolPhone: string;
  tenantCode: string | null;
  mode: OperatingMode;
  hybrid: boolean;
  settings: Record<string, unknown> | null;
  subscription: LiveSubscription | null;
  students: Candidate[];
  teachers: Teacher[];
  classes: SchoolClass[];
  missions: Mission[];
  assigned: Record<string, string[]>;
  indReqs: IndReq[];
  devPlans: Record<string, DevPlan>;   // key: `${missionId}:${studentId}`
}

export interface DevPlan {
  trialStart?: string;
  trialEnd?: string;
  status?: "trial" | "confirmed" | "unfit";
  performance?: number;
  goals?: { text: string; done: boolean }[];
  notes?: string;
}

function mapSubscription(row: any): LiveSubscription | null {
  if (!row) return null;
  let daysLeft: number | null = null;
  let renewsAt = "—";
  if (row.renews_at) {
    renewsAt = String(row.renews_at);
    const ms = new Date(row.renews_at).getTime() - Date.now();
    daysLeft = Math.max(0, Math.ceil(ms / 86400000));
  }
  return {
    plan: row.plan || "—",
    planQuota: row.plan_quota ?? 0,
    priceSAR: row.price_sar ?? 0,
    renewsAt,
    daysLeft,
    overagePriceSAR: row.overage_price ?? 0,
    rolloverPct: row.rollover_pct ?? 0,
    alertAt: row.alert_pct ?? 25,
    buckets: {
      mission: { alloc: row.mission_quota ?? 0, used: row.mission_used ?? 0 },
      individual: { alloc: row.individual_quota ?? 0, used: row.individual_used ?? 0 },
      buffer: { alloc: row.buffer_quota ?? 0, used: row.buffer_used ?? 0 },
    },
    weekly: [],
  };
}

const scopeLabel = (t: string) =>
  t === "school" ? "كامل المدرسة" : t === "stage" ? "المرحلة الثانوية" : "صف/فصل محدّد";

// جلب بيانات مدرسة كاملة من قاعدة البيانات وتحويلها لأشكال الواجهة
export async function fetchSchoolSeed(schoolId: string): Promise<Seed> {
  const [schoolRes, studentsRes, assessRes, teachersRes, classesRes, missionsRes, appsRes, indRes, subRes] =
    await Promise.all([
      supabase.from("schools").select("name,city,stage,address,email,phone,operating_mode,hybrid,settings,tenant_code").eq("id", schoolId).single(),
      supabase.from("students").select("*").eq("school_id", schoolId),
      supabase.from("assessments").select("*").eq("school_id", schoolId).order("completed_at", { ascending: false }),
      supabase.from("teachers").select("*").eq("school_id", schoolId),
      supabase.from("classes").select("*").eq("school_id", schoolId),
      supabase.from("missions").select("*").eq("school_id", schoolId),
      supabase.from("mission_applications").select("*").eq("school_id", schoolId),
      supabase.from("individual_requests").select("*").eq("school_id", schoolId).eq("status", "pending"),
      supabase.from("subscriptions").select("*").eq("school_id", schoolId).maybeSingle(),
    ]);

  const classById: Record<string, string> = {};
  (classesRes.data || []).forEach((c: any) => (classById[c.id] = c.name));

  // أحدث تقييم لكل طالب
  // كل المحاولات لكل طالب (assessRes مُرتّب تنازليًا حسب completed_at)
  const attemptsByStudent: Record<string, any[]> = {};
  (assessRes.data || []).forEach((a: any) => {
    (attemptsByStudent[a.student_id] ||= []).push(a);
  });

  const students: Candidate[] = (studentsRes.data || []).map((s: any) => {
    const raw = attemptsByStudent[s.id] || [];
    // المؤشر المركّب لكل محاولة + تحديد الأفضل (الأعلى مركّبًا، وعند التساوي الأحدث)
    const composite = (a: any) => Math.round(((a.competency ?? 0) + (a.behavior ?? 0)) / 2);
    let bestIdx = -1, bestScore = -1;
    raw.forEach((a, i) => { const c = composite(a); if (c > bestScore) { bestScore = c; bestIdx = i; } });
    const attempts: Attempt[] = raw.map((a, i) => ({
      id: a.id, date: (a.completed_at || "").slice(0, 10),
      competency: a.competency ?? 0, behavior: a.behavior ?? 0,
      axes: a.axes || { org: 0, lead: 0, comm: 0, firm: 0, init: 0 },
      contradiction: a.contradiction ?? 0, socialDesirability: a.social_desirability ?? 0,
      trust: a.trust ?? classifyTrust(0, 0), composite: composite(a), best: i === bestIdx,
    }));
    const best = bestIdx >= 0 ? raw[bestIdx] : undefined;
    const axes: AxisScores = best?.axes || { org: 0, lead: 0, comm: 0, firm: 0, init: 0 };
    return {
      id: s.id, name: s.name, grade: s.grade,
      className: s.class_id ? classById[s.class_id] || "" : "",
      avatarColor: s.avatar_color || "#0f5c66",
      axes,
      competency: best?.competency ?? 0, behavior: best?.behavior ?? 0, match: 0,
      wishRank: null,
      contradiction: best?.contradiction ?? 0, socialDesirability: best?.social_desirability ?? 0,
      trust: best?.trust ?? classifyTrust(0, 0),
      interviewDone: false, assessed: !!s.assessed, hasAccount: !!s.user_id,
      attempts, assessedAt: best ? (best.completed_at || "").slice(0, 10) : undefined,
      nationalId: s.national_id || "", email: s.email || "", phone: s.phone || "",
    };
  });

  const teacherById: Record<string, string> = {};
  const teachers: Teacher[] = (teachersRes.data || []).map((t: any) => {
    teacherById[t.id] = t.name;
    return { id: t.id, name: t.name, role: t.role, nationalId: t.national_id || "", email: t.email || "", phone: t.phone || "" };
  });

  const classes: SchoolClass[] = (classesRes.data || []).map((c: any) => ({
    id: c.id, name: c.name, grade: c.grade,
    homeroom: c.homeroom_teacher_id ? teacherById[c.homeroom_teacher_id] || "" : "",
    students: (studentsRes.data || []).filter((s: any) => s.class_id === c.id).length,
  }));

  // ترشيحات كل مهمة + الإسنادات
  const appsByMission: Record<string, any[]> = {};
  const assigned: Record<string, string[]> = {};
  const devPlans: Record<string, DevPlan> = {};
  (appsRes.data || []).forEach((ap: any) => {
    (appsByMission[ap.mission_id] ||= []).push(ap);
    if (ap.status === "assigned") (assigned[ap.mission_id] ||= []).push(ap.student_id);
    if (ap.development_plan && Object.keys(ap.development_plan).length)
      devPlans[`${ap.mission_id}:${ap.student_id}`] = ap.development_plan as DevPlan;
  });

  const missions: Mission[] = (missionsRes.data || []).map((m: any) => {
    const apps = appsByMission[m.id] || [];
    return {
      id: m.id, title: m.title, scopeType: m.scope_type,
      scopeLabel: m.scope_label || scopeLabel(m.scope_type),
      scopeRef: m.scope_ref || undefined,
      mode: m.operating_mode, seats: m.seats,
      supervisor: m.supervisor_id ? teacherById[m.supervisor_id] || "—" : "—",
      status: m.status, applicants: apps.length, eligible: 214,
      createdAt: (m.created_at || "").slice(0, 10),
      weights: m.weights, candidateIds: apps.map((a) => a.student_id),
      hasConflict: false,
    };
  });

  const indReqs: IndReq[] = (indRes.data || []).map((r: any) => {
    const st = (studentsRes.data || []).find((s: any) => s.id === r.student_id);
    return { id: r.id, student: st?.name || "طالب", grade: st?.class_id ? classById[st.class_id] || "" : "",
      color: st?.avatar_color || "#0f5c66", purpose: r.purpose || "", date: "" };
  });

  return {
    schoolId,
    schoolName: (schoolRes.data?.name as string) ?? "",
    schoolCity: (schoolRes.data?.city as string) ?? "",
    schoolStage: (schoolRes.data?.stage as string) ?? "الثانوية",
    schoolAddress: (schoolRes.data?.address as string) ?? "",
    schoolEmail: (schoolRes.data?.email as string) ?? "",
    schoolPhone: (schoolRes.data?.phone as string) ?? "",
    tenantCode: (schoolRes.data?.tenant_code as string) ?? null,
    mode: (schoolRes.data?.operating_mode as OperatingMode) || "B",
    hybrid: !!schoolRes.data?.hybrid,
    settings: (schoolRes.data?.settings as Record<string, unknown>) ?? null,
    subscription: mapSubscription(subRes.data),
    students, teachers, classes, missions, assigned, indReqs, devPlans,
  };
}

// ============ طبقة القراءة المركزية (كل المدارس) ============
export interface CentralKpi {
  schools: number;
  active: number;
  openAppeals: number;      // تظلّمات غير محسومة
  escalated: number;        // تظلّمات مُصعّدة (مسار ب/ج غير محسومة)
  renewalRate: number | null;      // نسبة الاشتراكات النشطة
  assessmentRate: number | null;   // نسبة الطلاب الذين أكملوا المقياس عبر المنصة
  activeRate: number | null;       // نسبة المدارس النشطة
}
export interface CentralSeed {
  schools: PlatformSchool[];
  appeals: Appeal[];
  kpi: CentralKpi;
}

const statusNote: Record<PlatformSchool["status"], string> = {
  active: "نشطة", onboarding: "قيد الانضمام", frozen: "مُجمّدة (معلّقة)", deleted: "محذوفة",
};

// جلب بيانات كل المنصة للمدير المركزي (يحترم RLS: is_central_admin)
export async function fetchCentralSeed(): Promise<CentralSeed> {
  const [schoolsRes, subsRes, studentsRes, appealsRes] = await Promise.all([
    supabase.from("schools").select("id,name,city,stage,address,email,phone,status").neq("status", "deleted"),
    supabase.from("subscriptions").select("school_id,plan,active"),
    supabase.from("students").select("id,school_id,assessed"),
    supabase.from("appeals").select("*").order("days_elapsed", { ascending: false }),
  ]);

  const subBySchool: Record<string, any> = {};
  (subsRes.data || []).forEach((s: any) => (subBySchool[s.school_id] = s));

  const countBySchool: Record<string, number> = {};
  let totalStudents = 0, assessedStudents = 0;
  (studentsRes.data || []).forEach((s: any) => {
    countBySchool[s.school_id] = (countBySchool[s.school_id] || 0) + 1;
    totalStudents++; if (s.assessed) assessedStudents++;
  });

  const schools: PlatformSchool[] = (schoolsRes.data || []).map((s: any) => {
    const st = (["active", "onboarding", "frozen"].includes(s.status) ? s.status : "active") as PlatformSchool["status"];
    return {
      id: s.id, name: s.name, city: s.city || "—",
      stage: s.stage || "الثانوية", address: s.address || "", email: s.email || "", phone: s.phone || "",
      students: countBySchool[s.id] || 0,
      plan: subBySchool[s.id]?.plan || "—",
      status: st, note: statusNote[st],
    };
  });

  const appeals: Appeal[] = (appealsRes.data || []).map((a: any) => ({
    id: a.id, student: a.student_name || "—", color: "#0f5c66",
    track: (a.track as AppealTrack), subject: a.subject || "",
    daysElapsed: a.days_elapsed ?? 0, slaMax: a.sla_max ?? 0,
    status: (a.status as AppealStatus), decider: a.decider || "—",
  }));

  const totalSchools = schools.length;
  const active = schools.filter((s) => s.status === "active").length;
  const openAppeals = appeals.filter((a) => a.status !== "resolved").length;
  const escalated = appeals.filter((a) => a.track !== "A" && a.status !== "resolved").length;
  const totalSubs = (subsRes.data || []).length;
  const activeSubs = (subsRes.data || []).filter((s: any) => s.active).length;

  const pct = (num: number, den: number) => (den > 0 ? Math.round((num / den) * 100) : null);

  return {
    schools, appeals,
    kpi: {
      schools: totalSchools, active, openAppeals, escalated,
      renewalRate: pct(activeSubs, totalSubs),
      assessmentRate: pct(assessedStudents, totalStudents),
      activeRate: pct(active, totalSchools),
    },
  };
}

// ============ مستودع الأسئلة ============
export interface QItem {
  id: string;
  schoolId: string | null;   // null = عنصر عام مشترك
  seq: number;
  type: string;              // scenario | situation | parallel | trap | indicator
  axis: string | null;
  section: number | null;
  role: string | null;
  text: string;
  options: { text: string; score: number }[];
  active: boolean;
}
export interface QuestionBank {
  global: QItem[];   // الأسئلة الأساسية المشتركة (٣٥)
  school: QItem[];   // أسئلة المدرسة الإضافية
}

function mapQItem(r: any): QItem {
  return {
    id: r.id, schoolId: r.school_id ?? null, seq: r.seq ?? 0,
    type: r.type, axis: r.axis ?? null, section: r.section ?? null,
    role: r.role ?? null, text: r.text || "",
    options: Array.isArray(r.options) ? r.options : [],
    active: r.active !== false,
  };
}

// جلب بنك الأسئلة: العام + الخاص بالمدرسة (يحترم RLS)
export async function fetchQuestionBank(schoolId: string): Promise<QuestionBank> {
  const { data, error } = await supabase.from("question_items")
    .select("*").or(`school_id.is.null,school_id.eq.${schoolId}`).order("seq", { ascending: true });
  if (error) throw error;
  const rows = (data || []).map(mapQItem);
  return {
    global: rows.filter((r) => r.schoolId === null),
    school: rows.filter((r) => r.schoolId !== null),
  };
}

// جلب الأسئلة العامة فقط (للحساب المركزي — إدارة البنك المحميّ)
export async function fetchGlobalQuestions(): Promise<QItem[]> {
  const { data, error } = await supabase.from("question_items")
    .select("*").is("school_id", null).order("seq", { ascending: true });
  if (error) throw error;
  return (data || []).map(mapQItem);
}
