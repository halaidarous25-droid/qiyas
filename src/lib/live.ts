import { supabase } from "./supabase";
import { classifyTrust, type Candidate, type Mission, type Teacher, type SchoolClass, type IndReq, type OperatingMode, type AxisScores } from "@/data/mock";

export interface Seed {
  schoolId: string;
  mode: OperatingMode;
  hybrid: boolean;
  settings: Record<string, unknown> | null;
  students: Candidate[];
  teachers: Teacher[];
  classes: SchoolClass[];
  missions: Mission[];
  assigned: Record<string, string[]>;
  indReqs: IndReq[];
}

const scopeLabel = (t: string) =>
  t === "school" ? "كامل المدرسة" : t === "stage" ? "المرحلة الثانوية" : "صف/فصل محدّد";

// جلب بيانات مدرسة كاملة من قاعدة البيانات وتحويلها لأشكال الواجهة
export async function fetchSchoolSeed(schoolId: string): Promise<Seed> {
  const [schoolRes, studentsRes, assessRes, teachersRes, classesRes, missionsRes, appsRes, indRes] =
    await Promise.all([
      supabase.from("schools").select("operating_mode,hybrid,settings").eq("id", schoolId).single(),
      supabase.from("students").select("*").eq("school_id", schoolId),
      supabase.from("assessments").select("*").eq("school_id", schoolId).order("completed_at", { ascending: false }),
      supabase.from("teachers").select("*").eq("school_id", schoolId),
      supabase.from("classes").select("*").eq("school_id", schoolId),
      supabase.from("missions").select("*").eq("school_id", schoolId),
      supabase.from("mission_applications").select("*").eq("school_id", schoolId),
      supabase.from("individual_requests").select("*").eq("school_id", schoolId).eq("status", "pending"),
    ]);

  const classById: Record<string, string> = {};
  (classesRes.data || []).forEach((c: any) => (classById[c.id] = c.name));

  // أحدث تقييم لكل طالب
  const latestByStudent: Record<string, any> = {};
  (assessRes.data || []).forEach((a: any) => {
    if (!latestByStudent[a.student_id]) latestByStudent[a.student_id] = a;
  });

  const students: Candidate[] = (studentsRes.data || []).map((s: any) => {
    const a = latestByStudent[s.id];
    const axes: AxisScores = a?.axes || { org: 0, lead: 0, comm: 0, firm: 0, init: 0 };
    return {
      id: s.id, name: s.name, grade: s.grade,
      className: s.class_id ? classById[s.class_id] || "" : "",
      avatarColor: s.avatar_color || "#0f5c66",
      axes,
      competency: a?.competency ?? 0, behavior: a?.behavior ?? 0, match: 0,
      wishRank: null,
      contradiction: a?.contradiction ?? 0, socialDesirability: a?.social_desirability ?? 0,
      trust: a?.trust ?? classifyTrust(0, 0),
      interviewDone: false, assessed: !!s.assessed,
    };
  });

  const teacherById: Record<string, string> = {};
  const teachers: Teacher[] = (teachersRes.data || []).map((t: any) => {
    teacherById[t.id] = t.name;
    return { id: t.id, name: t.name, role: t.role };
  });

  const classes: SchoolClass[] = (classesRes.data || []).map((c: any) => ({
    id: c.id, name: c.name, grade: c.grade,
    homeroom: c.homeroom_teacher_id ? teacherById[c.homeroom_teacher_id] || "" : "",
    students: (studentsRes.data || []).filter((s: any) => s.class_id === c.id).length,
  }));

  // ترشيحات كل مهمة + الإسنادات
  const appsByMission: Record<string, any[]> = {};
  const assigned: Record<string, string[]> = {};
  (appsRes.data || []).forEach((ap: any) => {
    (appsByMission[ap.mission_id] ||= []).push(ap);
    if (ap.status === "assigned") (assigned[ap.mission_id] ||= []).push(ap.student_id);
  });

  const missions: Mission[] = (missionsRes.data || []).map((m: any) => {
    const apps = appsByMission[m.id] || [];
    return {
      id: m.id, title: m.title, scopeType: m.scope_type,
      scopeLabel: m.scope_label || scopeLabel(m.scope_type),
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
    mode: (schoolRes.data?.operating_mode as OperatingMode) || "B",
    hybrid: !!schoolRes.data?.hybrid,
    settings: (schoolRes.data?.settings as Record<string, unknown>) ?? null,
    students, teachers, classes, missions, assigned, indReqs,
  };
}
