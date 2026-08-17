// نظام الصلاحيات المتدرّج للأدوار

export type Role =
  | "central" | "principal" | "coordinator" | "activity_supervisor" | "teacher" | "student" | "demo";

// صفحات/قدرات المدرسة
export type Cap =
  | "dashboard" | "missions" | "students" | "school" | "questions"
  | "reports" | "quota" | "governance" | "settings" | "accounts";

export const CAP_LABEL: Record<Cap, string> = {
  dashboard: "لوحة المدرسة", missions: "المهام القيادية", students: "الطلاب",
  school: "إدارة المدرسة", questions: "مستودع الأسئلة", reports: "التقارير",
  quota: "الحصص", governance: "الحوكمة والتظلّمات", settings: "الإعدادات",
  accounts: "إدارة الحسابات",
};

export const ROLE_LABEL: Record<Role, string> = {
  central: "مدير النظام المركزي", principal: "مدير المدرسة",
  coordinator: "منسّق النظام", activity_supervisor: "مشرف نشاط",
  teacher: "معلم", student: "طالب", demo: "عرض تجريبي",
};

// صلاحيات كل دور (متدرّجة: كل دور أعلى يرث ما تحته)
const TEACHER: Cap[] = ["dashboard", "missions", "students", "reports"];
const ACTIVITY: Cap[] = [...TEACHER, "questions"];
const COORDINATOR: Cap[] = [...ACTIVITY, "quota", "school"];
const PRINCIPAL: Cap[] = [...COORDINATOR, "governance", "settings", "accounts"];

export const ROLE_CAPS: Record<Role, Cap[]> = {
  teacher: TEACHER,
  activity_supervisor: ACTIVITY,
  coordinator: COORDINATOR,
  principal: PRINCIPAL,
  demo: PRINCIPAL,      // العرض التجريبي يرى كل شيء
  central: PRINCIPAL,   // لا يُستخدم فعليًا (المركزي له لوحته)
  student: [],
};

export function can(role: Role | undefined, cap: Cap): boolean {
  if (!role) return false;
  return (ROLE_CAPS[role] || []).includes(cap);
}

// كل الأدوار المدرسية لعرض المصفوفة
export const MATRIX_ROLES: Role[] = ["teacher", "activity_supervisor", "coordinator", "principal"];
export const ALL_CAPS: Cap[] = ["dashboard", "missions", "students", "school", "questions", "reports", "quota", "governance", "settings", "accounts"];
