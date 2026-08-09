import { supabase } from "./supabase";
import { computeMatch, type Mission, type Candidate, type AxisScores, type OperatingMode, type ScopeLevel } from "@/data/mock";
import type { AppSettings } from "@/store";

// ============ الكتابة إلى قاعدة البيانات ============
// كل الدوال تُنفَّذ بصلاحيات المستخدم المصادَق (تحترم RLS: مدرسته فقط).

export async function saveSchoolSettings(schoolId: string, mode: OperatingMode, hybrid: boolean, settings: AppSettings) {
  const { error } = await supabase.from("schools")
    .update({ operating_mode: mode, hybrid, settings })
    .eq("id", schoolId);
  if (error) throw error;
}

export async function dbAddStudent(schoolId: string, s: { name: string; grade: string; className: string }) {
  // إيجاد class_id من الاسم (اختياري)
  const { data: cls } = await supabase.from("classes").select("id").eq("school_id", schoolId).eq("name", s.className).maybeSingle();
  const { data, error } = await supabase.from("students")
    .insert({ school_id: schoolId, name: s.name, grade: s.grade, class_id: cls?.id ?? null, assessed: false })
    .select().single();
  if (error) throw error;
  return data;
}

export async function dbAddTeacher(schoolId: string, t: { name: string; role: string }) {
  const { data, error } = await supabase.from("teachers")
    .insert({ school_id: schoolId, name: t.name, role: t.role }).select().single();
  if (error) throw error;
  return data;
}

export async function dbAddClass(schoolId: string, c: { name: string; grade: string; homeroom: string }) {
  const { data: t } = await supabase.from("teachers").select("id").eq("school_id", schoolId).eq("name", c.homeroom).maybeSingle();
  const { data, error } = await supabase.from("classes")
    .insert({ school_id: schoolId, name: c.name, grade: c.grade, homeroom_teacher_id: t?.id ?? null }).select().single();
  if (error) throw error;
  return data;
}

export async function dbAddMission(schoolId: string, m: {
  title: string; scopeType: ScopeLevel; seats: number; mode: OperatingMode;
}) {
  const scopeLabel = m.scopeType === "school" ? "كامل المدرسة"
    : m.scopeType === "stage" ? "المرحلة الثانوية" : "صف/فصل محدّد";
  const { data, error } = await supabase.from("missions").insert({
    school_id: schoolId, title: m.title, scope_type: m.scopeType, scope_label: scopeLabel,
    operating_mode: m.mode, seats: m.seats, status: "open",
    weights: { org: 20, lead: 20, comm: 20, firm: 20, init: 20 },
  }).select().single();
  if (error) throw error;
  return data;
}

// ترشيح طالب لمهمة (يحسب المواءمة ويحفظها)
export async function dbApply(schoolId: string, mission: Mission, student: Candidate, auto: boolean) {
  const match = computeMatch(student, mission);
  const { error } = await supabase.from("mission_applications").upsert({
    school_id: schoolId, mission_id: mission.id, student_id: student.id,
    status: "nominated", match_score: match, wish_rank: student.wishRank, auto,
  }, { onConflict: "mission_id,student_id" });
  if (error) throw error;
  return match;
}

// اعتماد طالب للتكليف التجريبي
export async function dbAssign(schoolId: string, missionId: string, studentId: string) {
  const a = await supabase.from("mission_applications")
    .update({ status: "assigned" }).eq("mission_id", missionId).eq("student_id", studentId);
  if (a.error) throw a.error;
  const b = await supabase.from("missions").update({ status: "trial" }).eq("id", missionId);
  if (b.error) throw b.error;
}

// خصم وحدة من حصة المدرسة (mission | individual | buffer) عبر دالة ذرّية
export async function consumeQuota(schoolId: string, kind: "mission" | "individual" | "buffer") {
  const { error } = await supabase.rpc("consume_quota", { p_school: schoolId, p_kind: kind });
  if (error) throw error;
}

export async function dbResolveIndReq(id: string, approved: boolean, schoolId?: string) {
  const { error } = await supabase.from("individual_requests")
    .update({ status: approved ? "approved" : "denied" }).eq("id", id);
  if (error) throw error;
  // الموافقة تمنح اختبارًا فرديًا → تُخصم وحدة من الحصة الفردية
  if (approved && schoolId) {
    try { await consumeQuota(schoolId, "individual"); } catch { /* لا تُفشل الموافقة إن تعذّر الخصم */ }
  }
}

// حسم تظلّم (للمدير المركزي/المدرسة) — يُعلّم كمحسوم ويعيّن المُقرِّر
export async function dbResolveAppeal(id: string, decider: string) {
  const { error } = await supabase.from("appeals")
    .update({ status: "resolved", decider }).eq("id", id);
  if (error) throw error;
}

// استلام تظلّم للمراجعة
export async function dbReviewAppeal(id: string, decider: string) {
  const { error } = await supabase.from("appeals")
    .update({ status: "review", decider }).eq("id", id);
  if (error) throw error;
}

// حفظ محاولة قياس الطالب + وسمه كمُقيَّم
export async function dbSaveAssessment(schoolId: string, studentId: string, r: {
  axes: AxisScores; competency: number; behavior: number; integrity: number; emotional: number;
  contradiction: number; socialDesirability: number; trust: string;
}, answers: Record<string, unknown>) {
  const ins = await supabase.from("assessments").insert({
    school_id: schoolId, student_id: studentId, kind: "individual",
    answers, axes: r.axes, competency: r.competency, behavior: r.behavior,
    integrity: r.integrity, emotional: r.emotional,
    contradiction: r.contradiction, social_desirability: r.socialDesirability, trust: r.trust,
  });
  if (ins.error) throw ins.error;
  const upd = await supabase.from("students").update({ assessed: true }).eq("id", studentId);
  if (upd.error) throw upd.error;
  // كل مقياس مكتمل يخصم وحدة من حصة المهام
  try { await consumeQuota(schoolId, "mission"); } catch { /* لا تُفشل حفظ المقياس إن تعذّر الخصم */ }
}

// ============ مستودع الأسئلة (كتابة) ============
export async function dbAddQuestion(schoolId: string, q: {
  type: string; axis: string | null; section: number | null; role: string | null;
  text: string; options: { text: string; score: number }[];
}) {
  // seq تالٍ ضمن أسئلة هذه المدرسة (يبدأ بعد ١٠٠٠ لتمييزها عن الأساسية)
  const { data: last } = await supabase.from("question_items")
    .select("seq").eq("school_id", schoolId).order("seq", { ascending: false }).limit(1).maybeSingle();
  const nextSeq = Math.max(1000, (last?.seq ?? 999) + 1);
  const { data, error } = await supabase.from("question_items").insert({
    school_id: schoolId, seq: nextSeq, type: q.type, axis: q.axis,
    section: q.section, role: q.role, text: q.text, options: q.options, active: true,
  }).select().single();
  if (error) throw error;
  return data;
}

export async function dbSetQuestionActive(id: string, active: boolean) {
  const { error } = await supabase.from("question_items").update({ active }).eq("id", id);
  if (error) throw error;
}

export async function dbDeleteQuestion(id: string) {
  const { error } = await supabase.from("question_items").delete().eq("id", id);
  if (error) throw error;
}
