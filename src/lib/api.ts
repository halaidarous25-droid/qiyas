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

// استيراد عدد من الطلاب دفعة واحدة
export async function dbBulkAddStudents(schoolId: string, rows: { name: string; grade: string; className: string }[]) {
  const { data: cls } = await supabase.from("classes").select("id,name").eq("school_id", schoolId);
  const byName: Record<string, string> = {};
  (cls || []).forEach((c: any) => (byName[c.name] = c.id));
  const payload = rows.map((r) => ({
    school_id: schoolId, name: r.name, grade: r.grade || null,
    class_id: r.className && byName[r.className] ? byName[r.className] : null, assessed: false,
  }));
  const { data, error } = await supabase.from("students").insert(payload).select();
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
  weights?: AxisScores;
}) {
  const scopeLabel = m.scopeType === "school" ? "كامل المدرسة"
    : m.scopeType === "stage" ? "المرحلة الثانوية" : "صف/فصل محدّد";
  const { data, error } = await supabase.from("missions").insert({
    school_id: schoolId, title: m.title, scope_type: m.scopeType, scope_label: scopeLabel,
    operating_mode: m.mode, seats: m.seats, status: "open",
    weights: m.weights ?? { org: 20, lead: 20, comm: 20, firm: 20, init: 20 },
  }).select().single();
  if (error) throw error;
  return data;
}

// تعديل مهمة قائمة
export async function dbUpdateMission(missionId: string, patch: {
  title?: string; scopeType?: ScopeLevel; seats?: number; mode?: OperatingMode;
  weights?: AxisScores; status?: string;
}) {
  const upd: Record<string, unknown> = {};
  if (patch.title !== undefined) upd.title = patch.title;
  if (patch.seats !== undefined) upd.seats = patch.seats;
  if (patch.mode !== undefined) upd.operating_mode = patch.mode;
  if (patch.weights !== undefined) upd.weights = patch.weights;
  if (patch.status !== undefined) upd.status = patch.status;
  if (patch.scopeType !== undefined) {
    upd.scope_type = patch.scopeType;
    upd.scope_label = patch.scopeType === "school" ? "كامل المدرسة"
      : patch.scopeType === "stage" ? "المرحلة الثانوية" : "صف/فصل محدّد";
  }
  const { error } = await supabase.from("missions").update(upd).eq("id", missionId);
  if (error) throw error;
}

// حذف مرشّح من المهمة نهائيًا
export async function dbRemoveApplication(missionId: string, studentId: string) {
  const { error } = await supabase.from("mission_applications")
    .delete().eq("mission_id", missionId).eq("student_id", studentId);
  if (error) throw error;
}

// تغيير حالة مرشّح (applied | nominated | assigned | rejected)
export async function dbSetApplicationStatus(missionId: string, studentId: string, status: string) {
  const { error } = await supabase.from("mission_applications")
    .update({ status }).eq("mission_id", missionId).eq("student_id", studentId);
  if (error) throw error;
}

// إلغاء اعتماد مرشّح (إرجاعه لحالة مُرشَّح)
export async function dbUnassign(missionId: string, studentId: string) {
  const a = await supabase.from("mission_applications")
    .update({ status: "nominated" }).eq("mission_id", missionId).eq("student_id", studentId);
  if (a.error) throw a.error;
  // إن لم يبقَ أي مُعتمَد، تُعاد المهمة إلى «مفتوحة»
  const { data: remaining } = await supabase.from("mission_applications")
    .select("id").eq("mission_id", missionId).eq("status", "assigned");
  if (!remaining || remaining.length === 0) {
    await supabase.from("missions").update({ status: "open" }).eq("id", missionId);
  }
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

// حفظ خطة التطوير/التكليف التجريبي لطالب في مهمة
export async function dbSaveDevelopmentPlan(missionId: string, studentId: string, plan: unknown) {
  const { error } = await supabase.from("mission_applications")
    .update({ development_plan: plan })
    .eq("mission_id", missionId).eq("student_id", studentId);
  if (error) throw error;
}

export async function dbResolveIndReq(id: string, approved: boolean, schoolId?: string) {
  // اقرأ الطلب أولًا لمعرفة الغرض والطالب
  const { data: reqRow } = await supabase.from("individual_requests")
    .select("purpose,student_id").eq("id", id).maybeSingle();
  const { error } = await supabase.from("individual_requests")
    .update({ status: approved ? "approved" : "denied" }).eq("id", id);
  if (error) throw error;
  if (approved) {
    const isRetake = (reqRow?.purpose || "").includes("إعادة") || (reqRow?.purpose || "").toLowerCase().includes("retake");
    // الموافقة على إعادة المقياس تُعيد تفعيل الاختبار للطالب
    if (isRetake && reqRow?.student_id) {
      await supabase.from("students").update({ assessed: false }).eq("id", reqRow.student_id);
    }
    // تُخصم وحدة من الحصة الفردية
    if (schoolId) {
      try { await consumeQuota(schoolId, "individual"); } catch { /* لا تُفشل الموافقة إن تعذّر الخصم */ }
    }
  }
}

// طلب إعادة المقياس من الطالب (ينشئ طلبًا فرديًا بانتظار موافقة المدرسة)
export async function dbRequestRetake(schoolId: string, studentId: string) {
  const { error } = await supabase.from("individual_requests")
    .insert({ school_id: schoolId, student_id: studentId, purpose: "إعادة المقياس", status: "pending" });
  if (error) throw error;
}

// ============ التسجيل الذاتي (عام) ============
export async function registerSchool(input: { schoolName: string; city: string; adminName: string; email: string; password: string }) {
  const { data, error } = await supabase.functions.invoke("public-signup", { body: { action: "register_school", ...input } });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data as { ok: boolean; email: string; tenantCode: string; schoolId: string };
}

export async function registerStudent(input: { tenantCode: string; name: string; grade: string; email: string; password: string }) {
  const { data, error } = await supabase.functions.invoke("public-signup", { body: { action: "register_student", ...input } });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data as { ok: boolean; email: string; schoolName: string };
}

// ============ إدارة الحسابات (عبر Edge Function بصلاحيات إدارية) ============
export async function createStudentAccount(studentId: string, email?: string) {
  const { data, error } = await supabase.functions.invoke("admin-users", {
    body: { action: "create_student_account", studentId, email },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data as { ok: boolean; email: string; password: string; name: string };
}

export async function inviteMember(schoolId: string, email: string, fullName: string, role: string) {
  const { data, error } = await supabase.functions.invoke("admin-users", {
    body: { action: "invite_member", schoolId, email, fullName, role },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data as { ok: boolean; email: string; password: string; role: string };
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

// تحديث أوزان خيارات سؤال (مفتاح التصحيح)
export async function dbUpdateQuestionOptions(id: string, options: { text: string; score: number }[]) {
  const { error } = await supabase.from("question_items").update({ options }).eq("id", id);
  if (error) throw error;
}

export async function dbSetQuestionActive(id: string, active: boolean) {
  const { error } = await supabase.from("question_items").update({ active }).eq("id", id);
  if (error) throw error;
}

export async function dbDeleteQuestion(id: string) {
  const { error } = await supabase.from("question_items").delete().eq("id", id);
  if (error) throw error;
}
