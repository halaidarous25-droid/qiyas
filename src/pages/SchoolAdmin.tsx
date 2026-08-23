import { useState, useRef } from "react";
import { Pill, Avatar, En } from "@/components/common";
import { useSlis } from "@/store";
import { SCHOOL, TEACHER_ROLES, type SchoolClass } from "@/data/mock";
import { parseStudentsCsv, STUDENTS_CSV_TEMPLATE } from "@/lib/csv";
import { cn } from "@/lib/utils";
import {
  Building2, Users2, Layers, GraduationCap, Plus, School,
  Clock, Check, FileDown, FileUp, KeyRound, UserPlus, Copy, Loader2, Eye, EyeOff, Link as LinkIcon, Download,
  Target, Trash2, SlidersHorizontal, Pencil, ClipboardList, Search,
} from "lucide-react";
import { AXES, type AxisScores } from "@/data/mock";
import { type MissionRole } from "@/store";
import { useEffect } from "react";
import { createStudentAccount, inviteMember, fetchCredentials, changePassword, provisionTeacher, type AccountCred, fetchExamTypesBasic, fetchSchoolExamAccess, setSchoolExamActive } from "@/lib/api";

type Tab = "info" | "classes" | "teachers" | "students" | "roles" | "exams" | "accounts";
const TABS: { k: Tab; l: string; icon: any }[] = [
  { k: "info", l: "بيانات المدرسة", icon: Building2 },
  { k: "classes", l: "الفصول", icon: Layers },
  { k: "teachers", l: "المعلمون", icon: Users2 },
  { k: "students", l: "الطلاب", icon: GraduationCap },
  { k: "roles", l: "المهام القيادية", icon: Target },
  { k: "exams", l: "الاختبارات", icon: ClipboardList },
  { k: "accounts", l: "الحسابات والصلاحيات", icon: KeyRound },
];

// الصفوف الدراسية (من الثالث الثانوي إلى الأول المتوسط)
const GRADES = [
  "الثالث الثانوي", "الثاني الثانوي", "الأول الثانوي",
  "الثالث المتوسط", "الثاني المتوسط", "الأول المتوسط",
];
const CLASS_NUMS = Array.from({ length: 10 }, (_, i) => String(i + 1));

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-muted-foreground mb-1">{label}</label>
      {children}
    </div>
  );
}
const inputCls = "w-full rounded-lg border bg-background px-3 h-10 text-sm outline-none focus:border-brand";

export function SchoolAdmin() {
  const { students, teachers, classes, addStudent, bulkAddStudents, addTeacher, addClass, live, schoolId } = useSlis();
  const [tab, setTab] = useState<Tab>("info");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-extrabold">إدارة المدرسة</h1>
        <p className="text-sm text-muted-foreground">إعداد بيانات المدرسة والفصول والمعلمين والطلاب قبل إطلاق المهام.</p>
      </div>

      {/* التبويبات */}
      <div className="flex flex-wrap gap-2 border-b">
        {TABS.map((t) => (
          <button key={t.k} onClick={() => setTab(t.k)}
            className={cn("flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors",
              tab === t.k ? "border-brand text-brand" : "border-transparent text-muted-foreground hover:text-foreground")}>
            <t.icon className="h-4 w-4" /> {t.l}
          </button>
        ))}
      </div>

      {tab === "info" && <SchoolInfo studentsN={students.length} classesN={classes.length} teachersN={teachers.length} live={live} />}
      {tab === "classes" && <ClassesTab classes={classes} teachers={teachers} onAdd={addClass} />}
      {tab === "teachers" && <TeachersTab teachers={teachers} onAdd={addTeacher} live={live} schoolId={schoolId} />}
      {tab === "students" && <StudentsTab students={students} classes={classes} onAdd={addStudent} onBulk={bulkAddStudents} />}
      {tab === "roles" && <RolesTab />}
      {tab === "exams" && <ExamsTab live={live} schoolId={schoolId} />}
      {tab === "accounts" && <AccountsTab students={students} live={live} schoolId={schoolId} />}
    </div>
  );
}

// ===== تبويب الاختبارات (تفعيل داخلي للمدرسة) =====
function ExamsTab({ live, schoolId }: { live: boolean; schoolId: string | null }) {
  const { toast } = useSlis();
  const [exams, setExams] = useState<{ key: string; name: string; active: boolean }[]>([]);
  const [access, setAccess] = useState<Record<string, { enabled: boolean; school_active: boolean }>>({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!live || !schoolId) { setLoading(false); return; }
    try {
      const [ex, acc] = await Promise.all([fetchExamTypesBasic(), fetchSchoolExamAccess(schoolId)]);
      setExams(ex);
      const map: Record<string, { enabled: boolean; school_active: boolean }> = {};
      acc.forEach((a) => (map[a.exam_key] = { enabled: a.enabled, school_active: a.school_active }));
      setAccess(map);
    } catch (e: any) { toast(`تعذّر تحميل الاختبارات: ${e.message || e}`, "danger"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [live, schoolId]);

  const toggle = async (key: string, next: boolean) => {
    if (!schoolId) return;
    try {
      await setSchoolExamActive(schoolId, key, next);
      setAccess((m) => ({ ...m, [key]: { ...(m[key] || { enabled: true }), school_active: next } }));
      toast(next ? "فُعّل الاختبار لطلاب مدرستك" : "أُوقف الاختبار مؤقتًا");
    } catch (e: any) { toast(`تعذّر التحديث: ${e.message || e}`, "danger"); }
  };

  if (!live) return <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">إدارة الاختبارات متاحة عند الدخول بحساب مدرسة حقيقي.</div>;
  if (loading) return <div className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground"><Loader2 className="mx-auto h-6 w-6 animate-spin text-brand" /></div>;

  // القيادات متاح دائمًا؛ نعرضه كصف ثابت + الاختبارات التي فعّلها المركز لهذه المدرسة
  const centralEnabled = exams.filter((e) => e.key !== "leadership" && access[e.key]?.enabled && e.active);

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="border-b px-5 py-3 font-display font-bold">الاختبارات المتاحة لمدرستك</div>
      <div className="divide-y">
        <div className="flex items-center gap-3 px-5 py-3">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand/8 text-brand"><ClipboardList className="h-4 w-4" /></div>
          <div className="flex-1"><div className="font-semibold text-sm">اختبار القيادات الطلابية</div>
            <div className="text-[11px] text-muted-foreground">أساسي — متاح دائمًا لكل المدارس.</div></div>
          <Pill tone="success">مُفعّل دائمًا</Pill>
        </div>
        {centralEnabled.map((e) => {
          const on = access[e.key]?.school_active !== false;
          return (
            <div key={e.key} className="flex items-center gap-3 px-5 py-3">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand/8 text-brand"><ClipboardList className="h-4 w-4" /></div>
              <div className="flex-1"><div className="font-semibold text-sm">{e.name}</div>
                <div className="text-[11px] text-muted-foreground">فعّله الحساب المركزي لمدرستك — يمكنك تنشيطه أو إيقافه مؤقتًا.</div></div>
              <Pill tone={on ? "success" : "muted"}>{on ? "ظاهر للطلاب" : "موقوف مؤقتًا"}</Pill>
              <button onClick={() => toggle(e.key, !on)}
                className={cn("rounded-lg border px-3 h-9 text-sm font-semibold", on ? "text-danger hover:bg-danger/10" : "text-success hover:bg-success/10")}>
                {on ? "إيقاف مؤقت" : "تنشيط"}
              </button>
            </div>
          );
        })}
        {centralEnabled.length === 0 && (
          <div className="px-5 py-6 text-center text-sm text-muted-foreground">لا اختبارات إضافية مفعّلة لمدرستك من الحساب المركزي بعد.</div>
        )}
      </div>
      <div className="border-t bg-muted/20 px-5 py-3 text-[11px] text-muted-foreground">
        تُضاف الاختبارات وتُفعّل لمدرستك من الحساب المركزي، وأنت تتحكم بإظهارها أو إيقافها مؤقتًا في رابط الطالب.
      </div>
    </div>
  );
}

function SchoolInfo({ studentsN, classesN, teachersN, live }:
  { studentsN: number; classesN: number; teachersN: number; live: boolean }) {
  const { schoolInfo, updateSchoolInfo, tenantCode } = useSlis();
  const [name, setName] = useState(schoolInfo.name || (live ? "" : SCHOOL.name));
  const [city, setCity] = useState(schoolInfo.city || (live ? "" : "الرياض"));
  const [stage, setStage] = useState(schoolInfo.stage || "الثانوية");
  const [address, setAddress] = useState(schoolInfo.address || "");
  const [email, setEmail] = useState(schoolInfo.email || "");
  const [phone, setPhone] = useState(schoolInfo.phone || "");
  const STAGES = ["الابتدائية", "المتوسطة", "الثانوية"];
  const dirty = name.trim() !== schoolInfo.name || city.trim() !== schoolInfo.city || stage !== schoolInfo.stage
    || address.trim() !== schoolInfo.address || email.trim() !== schoolInfo.email || phone.trim() !== schoolInfo.phone;
  const save = () => updateSchoolInfo({ name: name.trim(), city: city.trim(), stage, address: address.trim(), email: email.trim(), phone: phone.trim() });
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2 rounded-xl border bg-card p-5">
        <div className="mb-4 flex items-center gap-2"><School className="h-[18px] w-[18px] text-brand" />
          <h2 className="font-display font-bold">بيانات المدرسة</h2></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="اسم المدرسة"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="المدينة"><input className={inputCls} value={city} onChange={(e) => setCity(e.target.value)} /></Field>
          <Field label="المرحلة">
            <select className={inputCls} value={stage} onChange={(e) => setStage(e.target.value)}>
              {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="مُعرّف المدرسة (Tenant)"><input className={inputCls} value={tenantCode || SCHOOL.tenant} disabled /></Field>
          <Field label="البريد الإلكتروني"><input className={inputCls} dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="school@example.com" /></Field>
          <Field label="رقم التواصل"><input className={inputCls} dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="05xxxxxxxx" /></Field>
          <div className="sm:col-span-2">
            <Field label="العنوان التفصيلي"><input className={inputCls} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="الحي، الشارع…" /></Field>
          </div>
        </div>
        <button onClick={save} disabled={!live || !dirty || name.trim().length < 2}
          className="mt-4 rounded-lg bg-brand px-5 h-10 text-sm font-semibold text-white hover:bg-brand/90 disabled:opacity-50">حفظ البيانات</button>
        {!live && <p className="mt-2 text-[11px] text-muted-foreground">حفظ البيانات متاح عند الدخول بحساب مدرسة حقيقي.</p>}
      </div>
      <div className="space-y-4">
        <div className="rounded-xl border bg-card p-5">
          <h3 className="mb-3 font-display font-bold">ملخّص</h3>
          {[
            { l: "الطلاب", v: studentsN, icon: GraduationCap },
            { l: "الفصول", v: classesN, icon: Layers },
            { l: "المعلمون", v: teachersN, icon: Users2 },
          ].map((r) => (
            <div key={r.l} className="flex items-center gap-3 border-b py-2.5 last:border-0">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-brand/8 text-brand"><r.icon className="h-4 w-4" /></div>
              <span className="flex-1 text-sm">{r.l}</span>
              <span className="font-display text-lg font-extrabold"><En>{r.v}</En></span>
            </div>
          ))}
        </div>
        {live && <ChangePassword />}
      </div>
    </div>
  );
}

function ChangePassword() {
  const { toast } = useSlis();
  const [p1, setP1] = useState(""); const [p2, setP2] = useState("");
  const [busy, setBusy] = useState(false);
  const ok = p1.length >= 6 && p1 === p2;
  const save = async () => {
    setBusy(true);
    try { await changePassword(p1); setP1(""); setP2(""); toast("تم تغيير كلمة المرور بنجاح"); }
    catch (e: any) { toast(`تعذّر التغيير: ${e.message || e}`, "danger"); }
    finally { setBusy(false); }
  };
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="mb-3 flex items-center gap-2"><KeyRound className="h-[18px] w-[18px] text-brand" />
        <h3 className="font-display font-bold">تغيير كلمة المرور</h3></div>
      <div className="space-y-3">
        <Field label="كلمة المرور الجديدة"><input type="password" className={inputCls} value={p1} onChange={(e) => setP1(e.target.value)} placeholder="٦ أحرف على الأقل" autoComplete="new-password" /></Field>
        <Field label="تأكيد كلمة المرور"><input type="password" className={inputCls} value={p2} onChange={(e) => setP2(e.target.value)} placeholder="أعد كتابتها" autoComplete="new-password" /></Field>
        {p2.length > 0 && p1 !== p2 && <p className="text-[11px] text-danger">كلمتا المرور غير متطابقتين.</p>}
        <button onClick={save} disabled={!ok || busy}
          className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand h-10 text-sm font-semibold text-white hover:bg-brand/90 disabled:opacity-50">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />} حفظ كلمة المرور
        </button>
      </div>
    </div>
  );
}

function ClassesTab({ classes, teachers, onAdd }:
  { classes: SchoolClass[]; teachers: any[]; onAdd: (c: any) => void }) {
  const { updateClass, removeClass } = useSlis();
  const [editC, setEditC] = useState<SchoolClass | null>(null);
  const [delC, setDelC] = useState<SchoolClass | null>(null);
  const [fGrade, setFGrade] = useState(""); const [fClass, setFClass] = useState("");
  const fGradeOptions = Array.from(new Set(classes.map((c) => c.grade).filter(Boolean)));
  const fClassOptions = classes.filter((c) => !fGrade || c.grade === fGrade);
  const shownClasses = classes.filter((c) => (!fGrade || c.grade === fGrade) && (!fClass || c.name === fClass));
  const [grade, setGrade] = useState(GRADES[0]);
  const [num, setNum] = useState(CLASS_NUMS[0]);
  const [homeroom, setHomeroom] = useState(teachers[0]?.name || "");
  const className = `${grade}/${num}`;
  const exists = classes.some((c) => c.name === className);
  const submit = () => {
    if (exists) return;
    onAdd({ name: className, grade, homeroom: homeroom || (teachers[0]?.name || "") });
  };
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <div className="lg:col-span-2 rounded-xl border bg-card overflow-hidden">
        <div className="border-b px-5 py-3 font-display font-bold">الفصول (<En>{classes.length}</En>)</div>
        <div className="flex flex-wrap items-center gap-2 border-b bg-muted/20 px-5 py-2">
          <span className="text-xs font-semibold text-muted-foreground">تصفية:</span>
          <select value={fGrade} onChange={(e) => { setFGrade(e.target.value); setFClass(""); }}
            className="rounded-lg border bg-card px-2.5 h-8 text-xs outline-none focus:border-brand">
            <option value="">كل الصفوف</option>
            {fGradeOptions.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
          <select value={fClass} onChange={(e) => setFClass(e.target.value)}
            className="rounded-lg border bg-card px-2.5 h-8 text-xs outline-none focus:border-brand">
            <option value="">كل الفصول</option>
            {fClassOptions.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
          {(fGrade || fClass) && (
            <button onClick={() => { setFGrade(""); setFClass(""); }} className="rounded-lg border px-2.5 h-8 text-xs font-medium hover:bg-accent">إلغاء</button>
          )}
          <span className="text-[11px] text-muted-foreground">المعروض: <En>{shownClasses.length}</En></span>
        </div>
        <div className="divide-y">
          {shownClasses.map((c) => (
            <div key={c.id} className="flex items-center gap-3 px-5 py-3">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand/8 text-[11px] font-bold text-brand">
                {c.name.includes("/") ? c.name.split("/")[1] : c.name}
              </div>
              <div className="flex-1"><div className="font-semibold text-sm">{c.name}</div>
                <div className="text-xs text-muted-foreground">رائد الفصل: {c.homeroom || "—"}</div></div>
              <Pill tone="muted"><En>{c.students}</En> طالب</Pill>
              <button onClick={() => setEditC(c)} className="grid h-8 w-8 place-items-center rounded-md border hover:bg-accent"><Pencil className="h-3.5 w-3.5" /></button>
              <button onClick={() => setDelC(c)} className="grid h-8 w-8 place-items-center rounded-md border text-danger hover:bg-danger/10"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          ))}
          {shownClasses.length === 0 && <div className="px-5 py-4 text-sm text-muted-foreground">{classes.length === 0 ? "لا فصول بعد." : "لا فصول مطابقة للتصفية."}</div>}
        </div>
      </div>
      <div className="rounded-xl border bg-card p-5 h-fit">
        <div className="mb-3 flex items-center gap-2"><Plus className="h-4 w-4 text-brand" />
          <h3 className="font-display font-bold">إضافة فصل</h3></div>
        <div className="space-y-3">
          <Field label="الصف الدراسي"><select className={inputCls} value={grade} onChange={(e) => setGrade(e.target.value)}>{GRADES.map((g) => <option key={g} value={g}>{g}</option>)}</select></Field>
          <Field label="رقم الفصل"><select className={inputCls} value={num} onChange={(e) => setNum(e.target.value)}>{CLASS_NUMS.map((n) => <option key={n} value={n}>{n}</option>)}</select></Field>
          <Field label="رائد الفصل">
            <select className={inputCls} value={homeroom} onChange={(e) => setHomeroom(e.target.value)}>
              {teachers.length === 0 && <option value="">لا يوجد معلمون بعد</option>}
              {teachers.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
            </select>
          </Field>
          <div className="rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">اسم الفصل: <span className="font-semibold text-foreground">{className}</span></div>
          <button onClick={submit} disabled={exists} className="w-full rounded-lg bg-brand h-10 text-sm font-semibold text-white hover:bg-brand/90 disabled:opacity-50">
            {exists ? "هذا الفصل موجود مسبقًا" : "إضافة الفصل"}
          </button>
        </div>
      </div>

      {editC && <EditClassModal c={editC} classes={classes} teachers={teachers} onClose={() => setEditC(null)}
        onSave={(patch) => { updateClass(editC.id, patch); setEditC(null); }} />}
      {delC && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-black/40 p-4" onClick={() => setDelC(null)}>
          <div className="w-full max-w-sm rounded-2xl border bg-card p-5 text-center shadow-xl" onClick={(e) => e.stopPropagation()} dir="rtl">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-danger/10 text-danger"><Trash2 className="h-6 w-6" /></div>
            <h3 className="mt-3 font-display text-lg font-extrabold">حذف الفصل</h3>
            <p className="mt-1 text-sm text-muted-foreground">سيتم حذف الفصل «{delC.name}» وفكّ ارتباط طلابه به.</p>
            <div className="mt-5 flex justify-center gap-2">
              <button onClick={() => setDelC(null)} className="rounded-lg border px-4 h-10 text-sm font-semibold hover:bg-accent">إلغاء</button>
              <button onClick={() => { removeClass(delC.id); setDelC(null); }} className="inline-flex items-center gap-1.5 rounded-lg bg-danger px-5 h-10 text-sm font-semibold text-white hover:opacity-90"><Trash2 className="h-4 w-4" /> تأكيد الحذف</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EditClassModal({ c, classes, teachers, onClose, onSave }:
  { c: SchoolClass; classes: SchoolClass[]; teachers: any[]; onClose: () => void; onSave: (patch: any) => void }) {
  const currentNum = c.name.includes("/") ? c.name.split("/")[1] : CLASS_NUMS[0];
  const [grade, setGrade] = useState(c.grade || GRADES[0]);
  const [num, setNum] = useState(currentNum);
  const [homeroom, setHomeroom] = useState(c.homeroom || teachers[0]?.name || "");
  const numOptions = Array.from(new Set([currentNum, ...CLASS_NUMS])).filter(Boolean);
  const className = `${grade}/${num}`;
  const exists = classes.some((x) => x.id !== c.id && x.name === className);
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border bg-card p-5 shadow-xl" onClick={(e) => e.stopPropagation()} dir="rtl">
        <div className="mb-4 flex items-center justify-between"><h3 className="font-display text-lg font-extrabold">تعديل بيانات الفصل</h3>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-accent"><span className="text-lg">×</span></button></div>
        <div className="space-y-3">
          <Field label="الصف الدراسي"><select className={inputCls} value={grade} onChange={(e) => setGrade(e.target.value)}>{GRADES.map((g) => <option key={g} value={g}>{g}</option>)}</select></Field>
          <Field label="رقم الفصل"><select className={inputCls} value={num} onChange={(e) => setNum(e.target.value)}>{numOptions.map((n) => <option key={n} value={n}>{n}</option>)}</select></Field>
          <Field label="رائد الفصل">
            <select className={inputCls} value={homeroom} onChange={(e) => setHomeroom(e.target.value)}>
              {teachers.length === 0 && <option value="">لا يوجد معلمون بعد</option>}
              {teachers.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
            </select>
          </Field>
          <div className="rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">اسم الفصل: <span className="font-semibold text-foreground">{className}</span></div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border px-4 h-10 text-sm font-semibold hover:bg-accent">إلغاء</button>
          <button disabled={exists} onClick={() => onSave({ name: className, grade, homeroom })}
            className="rounded-lg bg-brand px-5 h-10 text-sm font-semibold text-white hover:bg-brand/90 disabled:opacity-50">{exists ? "الفصل موجود مسبقًا" : "حفظ التعديلات"}</button>
        </div>
      </div>
    </div>
  );
}

function TeachersTab({ teachers, onAdd, live, schoolId }: { teachers: any[]; onAdd: (t: any) => void; live: boolean; schoolId: string | null }) {
  const { toast, reload, updateTeacher, removeTeacher } = useSlis();
  const [editT, setEditT] = useState<any | null>(null);
  const [delT, setDelT] = useState<any | null>(null);
  const [name, setName] = useState(""); const [role, setRole] = useState(TEACHER_ROLES[0]);
  const [natId, setNatId] = useState(""); const [email, setEmail] = useState(""); const [phone, setPhone] = useState("");
  const [username, setUsername] = useState(""); const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [cred, setCred] = useState<{ username: string; password: string } | null>(null);
  const genPass = () => setPassword("T" + Math.random().toString(36).slice(2, 8) + Math.floor(Math.random() * 90 + 10));
  const submit = async () => {
    if (name.trim().length < 2) return;
    if (live && schoolId) {
      if (username.trim().length < 3 || password.length < 6) { toast("اسم المستخدم (٣ أحرف) وكلمة المرور (٦ أحرف) مطلوبة للمعلّم", "danger"); return; }
      setBusy(true);
      try {
        const r = await provisionTeacher({ schoolId, name: name.trim(), role, username: username.trim(), password, nationalId: natId.trim(), email: email.trim(), phone: phone.trim() });
        setCred({ username: r.username, password: r.password });
        reload();
        setName(""); setNatId(""); setEmail(""); setPhone(""); setUsername(""); setPassword("");
        toast("أُنشئ حساب المعلّم — سيغيّر كلمة المرور عند أول دخول");
      } catch (e: any) { toast(`تعذّر الإنشاء: ${e.message || e}`, "danger"); }
      finally { setBusy(false); }
      return;
    }
    onAdd({ name: name.trim(), role, nationalId: natId.trim(), email: email.trim(), phone: phone.trim() });
    setName(""); setNatId(""); setEmail(""); setPhone("");
  };
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <div className="lg:col-span-2 rounded-xl border bg-card overflow-hidden">
        <div className="border-b px-5 py-3 font-display font-bold">المعلمون والإداريون (<En>{teachers.length}</En>)</div>
        <div className="divide-y">
          {teachers.map((t) => (
            <div key={t.id} className="flex items-center gap-3 px-5 py-3">
              <Avatar name={t.name} color="#0f5c66" size={36} />
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-sm">{t.name}</div>
                {(t.nationalId || t.phone || t.email) && (
                  <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                    {t.nationalId && <span dir="ltr">هوية: {t.nationalId}</span>}
                    {t.phone && <span dir="ltr">جوال: {t.phone}</span>}
                    {t.email && <span dir="ltr">{t.email}</span>}
                  </div>
                )}
              </div>
              <Pill tone="brand">{t.role}</Pill>
              <button onClick={() => setEditT(t)} className="grid h-8 w-8 place-items-center rounded-md border hover:bg-accent"><Pencil className="h-3.5 w-3.5" /></button>
              <button onClick={() => setDelT(t)} className="grid h-8 w-8 place-items-center rounded-md border text-danger hover:bg-danger/10"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          ))}
          {teachers.length === 0 && <div className="px-5 py-4 text-sm text-muted-foreground">لا معلمون بعد.</div>}
        </div>
      </div>
      <div className="rounded-xl border bg-card p-5 h-fit">
        <div className="mb-3 flex items-center gap-2"><Plus className="h-4 w-4 text-brand" />
          <h3 className="font-display font-bold">إضافة معلّم</h3></div>
        <div className="space-y-3">
          <Field label="الاسم"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: أ. تركي القحطاني" /></Field>
          <Field label="الدور"><select className={inputCls} value={role} onChange={(e) => setRole(e.target.value)}>{TEACHER_ROLES.map((r) => <option key={r}>{r}</option>)}</select></Field>
          {live && (
            <>
              <Field label="اسم المستخدم (للدخول)"><input className={inputCls} dir="ltr" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ""))} placeholder="username" /></Field>
              <Field label="كلمة المرور المبدئية">
                <div className="flex gap-1.5">
                  <input className={inputCls} dir="ltr" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="٦ أحرف فأكثر" />
                  <button type="button" onClick={genPass} className="shrink-0 rounded-lg border px-2.5 h-10 text-xs font-semibold hover:bg-accent">توليد</button>
                </div>
              </Field>
            </>
          )}
          <Field label="رقم الهوية (اختياري)"><input className={inputCls} dir="ltr" inputMode="numeric" value={natId} onChange={(e) => setNatId(e.target.value.replace(/[^0-9]/g, ""))} placeholder="١٠xxxxxxxx" /></Field>
          <Field label="رقم الجوال (اختياري)"><input className={inputCls} dir="ltr" inputMode="numeric" value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ""))} placeholder="05xxxxxxxx" /></Field>
          <Field label="البريد الإلكتروني (اختياري)"><input className={inputCls} dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" /></Field>
          <button onClick={submit} disabled={busy} className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand h-10 text-sm font-semibold text-white hover:bg-brand/90 disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} إضافة المعلّم
          </button>
          {live && <p className="text-[11px] text-muted-foreground">يُنشأ للمعلّم حساب دخول باسم المستخدم وكلمة المرور، ويُطلب منه تغييرها عند أول دخول.</p>}
          {cred && (
            <div className="rounded-lg border border-brand/30 bg-brand/5 p-3 text-[12px]">
              <div className="mb-1 font-semibold text-brand">بيانات دخول المعلّم (سلّمها له):</div>
              <div className="flex items-center justify-between"><span className="text-muted-foreground">اسم المستخدم</span><span className="font-mono font-bold" dir="ltr">{cred.username}</span></div>
              <div className="flex items-center justify-between"><span className="text-muted-foreground">كلمة المرور</span><span className="font-mono font-bold" dir="ltr">{cred.password}</span></div>
            </div>
          )}
        </div>
      </div>

      {editT && <EditTeacherModal t={editT} onClose={() => setEditT(null)} onSave={(patch) => { updateTeacher(editT.id, patch); setEditT(null); }} />}
      {delT && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-black/40 p-4" onClick={() => setDelT(null)}>
          <div className="w-full max-w-sm rounded-2xl border bg-card p-5 text-center shadow-xl" onClick={(e) => e.stopPropagation()} dir="rtl">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-danger/10 text-danger"><Trash2 className="h-6 w-6" /></div>
            <h3 className="mt-3 font-display text-lg font-extrabold">حذف المعلّم</h3>
            <p className="mt-1 text-sm text-muted-foreground">سيتم حذف «{delT.name}» وفكّ ارتباطه من الفصول والمهام.</p>
            <div className="mt-5 flex justify-center gap-2">
              <button onClick={() => setDelT(null)} className="rounded-lg border px-4 h-10 text-sm font-semibold hover:bg-accent">إلغاء</button>
              <button onClick={() => { removeTeacher(delT.id); setDelT(null); }} className="inline-flex items-center gap-1.5 rounded-lg bg-danger px-5 h-10 text-sm font-semibold text-white hover:opacity-90"><Trash2 className="h-4 w-4" /> تأكيد الحذف</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EditTeacherModal({ t, onClose, onSave }: { t: any; onClose: () => void; onSave: (patch: any) => void }) {
  const [name, setName] = useState(t.name || "");
  const [role, setRole] = useState(t.role || TEACHER_ROLES[0]);
  const [natId, setNatId] = useState(t.nationalId || "");
  const [email, setEmail] = useState(t.email || "");
  const [phone, setPhone] = useState(t.phone || "");
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border bg-card p-5 shadow-xl" onClick={(e) => e.stopPropagation()} dir="rtl">
        <div className="mb-4 flex items-center justify-between"><h3 className="font-display text-lg font-extrabold">تعديل بيانات المعلّم</h3>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-accent"><span className="text-lg">×</span></button></div>
        <div className="space-y-3">
          <Field label="الاسم"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="الدور"><select className={inputCls} value={role} onChange={(e) => setRole(e.target.value)}>{TEACHER_ROLES.map((r) => <option key={r}>{r}</option>)}</select></Field>
          <Field label="رقم الهوية"><input className={inputCls} dir="ltr" value={natId} onChange={(e) => setNatId(e.target.value.replace(/[^0-9]/g, ""))} /></Field>
          <Field label="رقم الجوال"><input className={inputCls} dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ""))} /></Field>
          <Field label="البريد الإلكتروني"><input className={inputCls} dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border px-4 h-10 text-sm font-semibold hover:bg-accent">إلغاء</button>
          <button disabled={name.trim().length < 2} onClick={() => onSave({ name: name.trim(), role, nationalId: natId.trim(), email: email.trim(), phone: phone.trim() })}
            className="rounded-lg bg-brand px-5 h-10 text-sm font-semibold text-white hover:bg-brand/90 disabled:opacity-50">حفظ</button>
        </div>
      </div>
    </div>
  );
}

function StudentsTab({ students, classes, onAdd, onBulk }:
  { students: any[]; classes: SchoolClass[]; onAdd: (s: any) => void; onBulk: (rows: any[]) => Promise<number> }) {
  const [editS, setEditS] = useState<any | null>(null);
  const [delS, setDelS] = useState<any | null>(null);
  const [fGrade, setFGrade] = useState(""); const [fClass, setFClass] = useState(""); const [fQ, setFQ] = useState("");
  const gradeOptions = Array.from(new Set(classes.map((c) => c.grade).filter(Boolean)));
  const fClassOptions = Array.from(new Set(students.filter((s: any) => !fGrade || s.grade === fGrade).map((s: any) => s.className).filter(Boolean)));
  const fGradeOptions = Array.from(new Set(students.map((s: any) => s.grade).filter(Boolean)));
  const fQt = fQ.trim();
  const shownStudents = students.filter((s: any) => (!fGrade || s.grade === fGrade) && (!fClass || s.className === fClass) && (!fQt || String(s.name || "").includes(fQt)));
  const [name, setName] = useState(""); const [grade, setGrade] = useState("");
  const gradeClasses = classes.filter((c) => c.grade === grade);
  const [className, setClassName] = useState("");
  const [natId, setNatId] = useState(""); const [sEmail, setSEmail] = useState(""); const [sPhone, setSPhone] = useState("");
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const nameOk = name.trim().split(/\s+/).filter(Boolean).length >= 3; // الاسم الرباعي (ثلاثة أجزاء فأكثر)
  const submit = () => {
    if (!nameOk || !className) return;
    onAdd({ name: name.trim(), grade, className, nationalId: natId.trim(), email: sEmail.trim(), phone: sPhone.trim() });
    setName(""); setNatId(""); setSEmail(""); setSPhone("");
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setImporting(true);
    try {
      const text = await f.text();
      const { rows } = parseStudentsCsv(text);
      if (!rows.length) { alert("لم يُعثر على صفوف صالحة. تأكد من وجود عمود «الاسم»."); return; }
      await onBulk(rows);
    } finally { setImporting(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  const downloadTemplate = () => {
    const blob = new Blob(["﻿" + STUDENTS_CSV_TEMPLATE], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "students_template.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const { tenantCode, toast: t2, schoolInfo, updateStudent, removeStudent } = useSlis();
  const assessLink = tenantCode ? `${window.location.origin}/?assess=${tenantCode}` : "";

  // تصدير أسماء الطلاب
  const [exportOpen, setExportOpen] = useState(false);
  const [exOpts, setExOpts] = useState({ email: false, phone: false, natId: true });
  const csvCell = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const exportStudents = () => {
    const head = ["اسم الطالب", "الصف", "الفصل", "المدرسة"];
    if (exOpts.natId) head.push("رقم الهوية");
    if (exOpts.email) head.push("البريد الإلكتروني");
    if (exOpts.phone) head.push("رقم الجوال");
    const lines = [head.map(csvCell).join(",")];
    students.forEach((s: any) => {
      const row = [s.name, s.grade || "", s.className || "", schoolInfo.name || ""];
      if (exOpts.natId) row.push(s.nationalId || "");
      if (exOpts.email) row.push(s.email || "");
      if (exOpts.phone) row.push(s.phone || "");
      lines.push(row.map(csvCell).join(","));
    });
    const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `طلاب_${schoolInfo.name || "المدرسة"}.csv`; a.click();
    URL.revokeObjectURL(url);
    setExportOpen(false);
    t2("تم تنزيل ملف الطلاب", "info");
  };

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      {/* رابط الاختبار العام (بلا حساب طالب) */}
      {tenantCode && (
        <div className="lg:col-span-3 rounded-xl border border-brand/30 bg-brand/5 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-brand"><LinkIcon className="h-4 w-4" /> رابط اختبار الطلاب (بلا حساب)</div>
          <p className="mt-1 text-xs text-muted-foreground">أرسل هذا الرابط للطلاب — يفتحونه، يعبّئون بياناتهم، يؤدّون الاختبار، وتظهر نتائجهم هنا في قائمة الطلاب.</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input readOnly value={assessLink} dir="ltr" className="flex-1 min-w-[240px] rounded-lg border bg-background px-3 h-9 text-xs font-mono" />
            <button onClick={() => { navigator.clipboard?.writeText(assessLink); t2("نُسِخ الرابط", "info"); }}
              className="inline-flex items-center gap-1 rounded-lg bg-brand px-3 h-9 text-sm font-semibold text-white hover:bg-brand/90">
              <Copy className="h-4 w-4" /> نسخ الرابط
            </button>
          </div>
        </div>
      )}

      <div className="lg:col-span-2 rounded-xl border bg-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b px-5 py-3">
          <span className="font-display font-bold">الطلاب (<En>{students.length}</En>)</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground"><En>{students.filter((s) => s.assessed).length}</En> أدّوا المقياس</span>
            <div className="relative">
              <button onClick={() => setExportOpen((o) => !o)}
                className="inline-flex items-center gap-1 rounded-md border px-2.5 h-8 text-xs font-semibold hover:bg-accent">
                <Download className="h-3.5 w-3.5" /> تصدير
              </button>
              {exportOpen && (
                <div className="absolute left-0 top-9 z-30 w-60 rounded-lg border bg-popover p-3 shadow-lg text-right">
                  <div className="mb-2 text-xs font-semibold text-muted-foreground">حقول ثابتة: الاسم، الصف، الفصل، المدرسة</div>
                  <div className="space-y-1.5 text-[13px]">
                    <label className="flex items-center gap-2"><input type="checkbox" checked={exOpts.natId} onChange={(e) => setExOpts((o) => ({ ...o, natId: e.target.checked }))} /> رقم الهوية</label>
                    <label className="flex items-center gap-2"><input type="checkbox" checked={exOpts.email} onChange={(e) => setExOpts((o) => ({ ...o, email: e.target.checked }))} /> البريد الإلكتروني</label>
                    <label className="flex items-center gap-2"><input type="checkbox" checked={exOpts.phone} onChange={(e) => setExOpts((o) => ({ ...o, phone: e.target.checked }))} /> رقم الجوال</label>
                  </div>
                  <button onClick={exportStudents}
                    className="mt-3 w-full inline-flex items-center justify-center gap-1.5 rounded-md bg-brand h-8 text-xs font-semibold text-white hover:bg-brand/90">
                    <Download className="h-3.5 w-3.5" /> تنزيل ملف CSV
                  </button>
                </div>
              )}
            </div>
            <button onClick={downloadTemplate} className="inline-flex items-center gap-1 rounded-md border px-2.5 h-8 text-xs font-semibold hover:bg-accent">
              <FileDown className="h-3.5 w-3.5" /> قالب
            </button>
            <button onClick={() => fileRef.current?.click()} disabled={importing}
              className="inline-flex items-center gap-1 rounded-md bg-brand px-2.5 h-8 text-xs font-semibold text-white hover:bg-brand/90 disabled:opacity-50">
              <FileUp className="h-3.5 w-3.5" /> {importing ? "جارٍ الاستيراد…" : "استيراد CSV"}
            </button>
            <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={onFile} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-b bg-muted/20 px-5 py-2">
          <div className="flex items-center gap-1.5 rounded-lg border bg-card px-2.5 h-8 text-xs w-48">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <input value={fQ} onChange={(e) => setFQ(e.target.value)} placeholder="بحث باسم الطالب…" className="bg-transparent outline-none flex-1" />
          </div>
          <span className="text-xs font-semibold text-muted-foreground">تصفية:</span>
          <select value={fGrade} onChange={(e) => { setFGrade(e.target.value); setFClass(""); }}
            className="rounded-lg border bg-card px-2.5 h-8 text-xs outline-none focus:border-brand">
            <option value="">كل الصفوف</option>
            {fGradeOptions.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
          <select value={fClass} onChange={(e) => setFClass(e.target.value)}
            className="rounded-lg border bg-card px-2.5 h-8 text-xs outline-none focus:border-brand">
            <option value="">كل الفصول</option>
            {fClassOptions.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          {(fGrade || fClass || fQ) && (
            <button onClick={() => { setFGrade(""); setFClass(""); setFQ(""); }} className="rounded-lg border px-2.5 h-8 text-xs font-medium hover:bg-accent">إلغاء</button>
          )}
          <span className="text-[11px] text-muted-foreground">المعروض: <En>{shownStudents.length}</En></span>
        </div>
        <div className="max-h-[460px] divide-y overflow-y-auto">
          {shownStudents.map((s) => (
            <div key={s.id} className="flex items-center gap-3 px-5 py-2.5">
              <Avatar name={s.name} color={s.avatarColor} size={34} />
              <div className="flex-1"><div className="font-semibold text-sm">{s.name}</div>
                <div className="text-xs text-muted-foreground">{s.grade} · {s.className}</div></div>
              {s.assessed
                ? <Pill tone="success"><Check className="h-3 w-3" /> مُقيَّم</Pill>
                : <Pill tone="warning"><Clock className="h-3 w-3" /> بانتظار المقياس</Pill>}
              <button onClick={() => setEditS(s)} className="grid h-8 w-8 place-items-center rounded-md border hover:bg-accent"><Pencil className="h-3.5 w-3.5" /></button>
              <button onClick={() => setDelS(s)} className="grid h-8 w-8 place-items-center rounded-md border text-danger hover:bg-danger/10"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-xl border bg-card p-5 h-fit">
        <div className="mb-3 flex items-center gap-2"><Plus className="h-4 w-4 text-brand" />
          <h3 className="font-display font-bold">إضافة طالب</h3></div>
        <div className="space-y-3">
          <Field label="الاسم الرباعي"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="الاسم الأول واسم الأب والجد والعائلة" /></Field>
          <Field label="الصف الدراسي"><select className={inputCls} value={grade} onChange={(e) => { setGrade(e.target.value); setClassName(""); }}>
            <option value="">{gradeOptions.length ? "اختر الصف…" : "أضف فصلًا في صفحة الفصول أولًا"}</option>
            {gradeOptions.map((g) => <option key={g} value={g}>{g}</option>)}
          </select></Field>
          <Field label="الفصل">
            <select className={inputCls} value={className} onChange={(e) => setClassName(e.target.value)}>
              <option value="">{!grade ? "اختر الصف أولًا" : gradeClasses.length ? "اختر الفصل…" : "لا فصول لهذا الصف"}</option>
              {gradeClasses.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="رقم الهوية (اختياري)"><input className={inputCls} dir="ltr" inputMode="numeric" value={natId} onChange={(e) => setNatId(e.target.value.replace(/[^0-9]/g, ""))} placeholder="١٠xxxxxxxx" /></Field>
          <Field label="رقم الجوال (اختياري)"><input className={inputCls} dir="ltr" inputMode="numeric" value={sPhone} onChange={(e) => setSPhone(e.target.value.replace(/[^0-9]/g, ""))} placeholder="05xxxxxxxx" /></Field>
          <Field label="البريد الإلكتروني (اختياري)"><input className={inputCls} dir="ltr" value={sEmail} onChange={(e) => setSEmail(e.target.value)} placeholder="name@example.com" /></Field>
          <button onClick={submit} disabled={!nameOk || !className} className="w-full rounded-lg bg-brand h-10 text-sm font-semibold text-white hover:bg-brand/90 disabled:opacity-50">إضافة الطالب</button>
          <p className="text-[11px] text-muted-foreground">الاسم الرباعي إلزامي. يُضاف الطالب بحالة «بانتظار المقياس». رقم الهوية يربط نتائج الرابط العام تلقائيًا.</p>
        </div>
      </div>

      {editS && <EditStudentModal s={editS} classes={classes} onClose={() => setEditS(null)}
        onSave={(patch) => { updateStudent(editS.id, patch); setEditS(null); }} />}
      {delS && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-black/40 p-4" onClick={() => setDelS(null)}>
          <div className="w-full max-w-sm rounded-2xl border bg-card p-5 text-center shadow-xl" onClick={(e) => e.stopPropagation()} dir="rtl">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-danger/10 text-danger"><Trash2 className="h-6 w-6" /></div>
            <h3 className="mt-3 font-display text-lg font-extrabold">حذف الطالب</h3>
            <p className="mt-1 text-sm text-muted-foreground">سيتم حذف «{delS.name}» وكل نتائجه وترشيحاته نهائيًا.</p>
            <div className="mt-5 flex justify-center gap-2">
              <button onClick={() => setDelS(null)} className="rounded-lg border px-4 h-10 text-sm font-semibold hover:bg-accent">إلغاء</button>
              <button onClick={() => { removeStudent(delS.id); setDelS(null); }} className="inline-flex items-center gap-1.5 rounded-lg bg-danger px-5 h-10 text-sm font-semibold text-white hover:opacity-90"><Trash2 className="h-4 w-4" /> تأكيد الحذف</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EditStudentModal({ s, classes, onClose, onSave }:
  { s: any; classes: SchoolClass[]; onClose: () => void; onSave: (patch: any) => void }) {
  const [name, setName] = useState(s.name || "");
  const [grade, setGrade] = useState(s.grade || "");
  const [className, setClassName] = useState(s.className || "");
  const [natId, setNatId] = useState(s.nationalId || "");
  const [phone, setPhone] = useState(s.phone || "");
  const [email, setEmail] = useState(s.email || "");
  // الصفوف المسجّلة في صفحة الفصول (مع الإبقاء على صف الطالب الحالي إن اختلف)
  const gradeOptions = Array.from(new Set([s.grade, ...classes.map((c) => c.grade)].filter(Boolean)));
  const gradeClasses = classes.filter((c) => c.grade === grade);
  const nameOk = name.trim().split(/\s+/).filter(Boolean).length >= 3;
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center overflow-auto bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border bg-card p-5 shadow-xl" onClick={(e) => e.stopPropagation()} dir="rtl">
        <div className="mb-4 flex items-center justify-between"><h3 className="font-display text-lg font-extrabold">تعديل بيانات الطالب</h3>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-accent"><span className="text-lg">×</span></button></div>
        <div className="space-y-3">
          <Field label="الاسم الرباعي"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="الاسم الأول واسم الأب والجد والعائلة" /></Field>
          <Field label="الصف الدراسي"><select className={inputCls} value={grade} onChange={(e) => { setGrade(e.target.value); setClassName(""); }}>
            <option value="">{gradeOptions.length ? "اختر الصف…" : "أضف فصلًا في صفحة الفصول أولًا"}</option>
            {gradeOptions.map((g) => <option key={g} value={g}>{g}</option>)}
          </select></Field>
          <Field label="الفصل">
            <select className={inputCls} value={className} onChange={(e) => setClassName(e.target.value)}>
              <option value="">{!grade ? "اختر الصف أولًا" : gradeClasses.length ? "اختر الفصل…" : "لا فصول لهذا الصف"}</option>
              {className && !gradeClasses.some((c) => c.name === className) && <option value={className}>{className}</option>}
              {gradeClasses.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="رقم الهوية (اختياري)"><input className={inputCls} dir="ltr" inputMode="numeric" value={natId} onChange={(e) => setNatId(e.target.value.replace(/[^0-9]/g, ""))} placeholder="١٠xxxxxxxx" /></Field>
          <Field label="رقم الجوال (اختياري)"><input className={inputCls} dir="ltr" inputMode="numeric" value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ""))} placeholder="05xxxxxxxx" /></Field>
          <Field label="البريد الإلكتروني (اختياري)"><input className={inputCls} dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" /></Field>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border px-4 h-10 text-sm font-semibold hover:bg-accent">إلغاء</button>
          <button disabled={!nameOk} onClick={() => onSave({ name: name.trim(), grade, className, nationalId: natId.trim(), email: email.trim(), phone: phone.trim() })}
            className="rounded-lg bg-brand px-5 h-10 text-sm font-semibold text-white hover:bg-brand/90 disabled:opacity-50">حفظ التعديلات</button>
        </div>
      </div>
    </div>
  );
}

// ===== تبويب المهام القيادية (المسمّيات) =====
const EVEN_W: AxisScores = { org: 20, lead: 20, comm: 20, firm: 20, init: 20 };
function RolesTab() {
  const { roles, saveRole, deleteRole } = useSlis();
  const [editing, setEditing] = useState<MissionRole | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [skills, setSkills] = useState("");
  const [duties, setDuties] = useState("");
  const [weights, setWeights] = useState<AxisScores>({ ...EVEN_W });
  const wSum = AXES.reduce((s, a) => s + weights[a.key], 0) || 1;
  const reset = () => { setEditing(null); setTitle(""); setDescription(""); setSkills(""); setDuties(""); setWeights({ ...EVEN_W }); };
  const load = (r: MissionRole) => { setEditing(r); setTitle(r.title); setDescription(r.description); setSkills(r.skills); setDuties(r.duties); setWeights({ ...r.weights }); };
  const submit = () => {
    if (title.trim().length < 2) return;
    const norm = {} as AxisScores; AXES.forEach((a) => (norm[a.key] = Math.round((weights[a.key] / wSum) * 100)));
    saveRole({ id: editing?.id || `role_${Date.now()}`, title: title.trim(), description: description.trim(), skills: skills.trim(), duties: duties.trim(), weights: norm, active: editing?.active ?? true });
    reset();
  };
  const toggleActive = (r: MissionRole) => saveRole({ ...r, active: r.active === false ? true : false });
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <div className="lg:col-span-2 rounded-xl border bg-card overflow-hidden">
        <div className="border-b px-5 py-3 font-display font-bold">المسمّيات القيادية (<En>{roles.length}</En>)</div>
        <div className="divide-y">
          {roles.map((r) => (
            <div key={r.id} className="px-5 py-3">
              <div className="flex items-start gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand/8 text-brand"><Target className="h-4.5 w-4.5" /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2"><span className="font-semibold text-sm">{r.title}</span>
                    {r.active === false
                      ? <Pill tone="muted">موقوف</Pill>
                      : <Pill tone="success">مُفعّل</Pill>}</div>
                  {r.description && <div className="mt-0.5 text-xs text-muted-foreground">{r.description}</div>}
                  <div className="mt-1 flex flex-wrap gap-1">
                    {AXES.map((a) => r.weights[a.key] >= 25 && (
                      <Pill key={a.key} tone="info">{a.label} <En>{r.weights[a.key]}</En>٪</Pill>
                    ))}
                  </div>
                  {(r.skills || r.duties) && (
                    <div className="mt-1.5 space-y-0.5 text-[11px] text-muted-foreground">
                      {r.skills && <div><span className="font-semibold text-foreground/70">المهارات:</span> {r.skills}</div>}
                      {r.duties && <div><span className="font-semibold text-foreground/70">المهام:</span> {r.duties}</div>}
                    </div>
                  )}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => toggleActive(r)} title={r.active === false ? "تفعيل" : "إيقاف"}
                    className={cn("rounded-md border px-2 h-8 text-xs font-semibold", r.active === false ? "text-success hover:bg-success/10" : "text-muted-foreground hover:bg-accent")}>
                    {r.active === false ? "تفعيل" : "إيقاف"}
                  </button>
                  <button onClick={() => load(r)} className="grid h-8 w-8 place-items-center rounded-md border hover:bg-accent"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => deleteRole(r.id)} className="grid h-8 w-8 place-items-center rounded-md border text-danger hover:bg-danger/10"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            </div>
          ))}
          {roles.length === 0 && <div className="px-5 py-6 text-center text-sm text-muted-foreground">لا مسمّيات بعد — أضف أول مسمّى قيادي ليظهر عند إنشاء المهام.</div>}
        </div>
      </div>
      <div className="rounded-xl border bg-card p-5 h-fit">
        <div className="mb-3 flex items-center gap-2"><Plus className="h-4 w-4 text-brand" />
          <h3 className="font-display font-bold">{editing ? "تعديل مسمّى" : "إضافة مسمّى قيادي"}</h3></div>
        <div className="space-y-3">
          <Field label="المسمّى"><input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثال: عريف فصل، مشرف نظام" /></Field>
          <Field label="وصف المهمة"><textarea className={cn(inputCls, "h-auto py-2")} rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="نبذة عن دور هذا المسمّى" /></Field>
          <Field label="المهارات المطلوبة"><textarea className={cn(inputCls, "h-auto py-2")} rows={2} value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="مثال: تنظيم، تواصل، حزم" /></Field>
          <Field label="المهام المطلوبة"><textarea className={cn(inputCls, "h-auto py-2")} rows={2} value={duties} onChange={(e) => setDuties(e.target.value)} placeholder="مثال: متابعة الحضور، تنظيم الطابور" /></Field>
          <div>
            <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"><SlidersHorizontal className="h-3.5 w-3.5 text-brand" /> أوزان المحاور للمواءمة</div>
            <div className="space-y-1.5">
              {AXES.map((a) => (
                <div key={a.key} className="grid grid-cols-[68px_1fr_34px] items-center gap-2">
                  <span className="text-[11px] text-foreground/80">{a.label}</span>
                  <input type="range" min={0} max={100} value={weights[a.key]} onChange={(e) => setWeights((w) => ({ ...w, [a.key]: Number(e.target.value) }))} className="accent-[hsl(191_72%_30%)]" />
                  <span className="text-left text-[11px] font-bold text-brand"><En>{Math.round((weights[a.key] / wSum) * 100)}</En>٪</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={submit} disabled={title.trim().length < 2} className="flex-1 rounded-lg bg-brand h-10 text-sm font-semibold text-white hover:bg-brand/90 disabled:opacity-50">{editing ? "حفظ التعديلات" : "إضافة المسمّى"}</button>
            {editing && <button onClick={reset} className="rounded-lg border px-4 h-10 text-sm font-semibold hover:bg-accent">إلغاء</button>}
          </div>
          <p className="text-[11px] text-muted-foreground">تظهر هذه المسمّيات في قائمة «عنوان المهمة» عند إنشاء مهمة جديدة، وتُستخدم أوزانها في مواءمة الطلاب.</p>
        </div>
      </div>
    </div>
  );
}

// ===== تبويب الحسابات والصلاحيات =====
const MEMBER_ROLES = [
  { k: "principal", l: "مدير المدرسة" },
  { k: "coordinator", l: "منسّق النظام" },
  { k: "activity_supervisor", l: "مشرف نشاط" },
  { k: "teacher", l: "معلم" },
];
const ROLE_AR: Record<string, string> = {
  principal: "مدير المدرسة", coordinator: "منسّق النظام", activity_supervisor: "مشرف نشاط",
  teacher: "معلم", student: "طالب",
};

interface Cred { kind: "student" | "member"; label: string; email: string; password: string }

function AccountsTab({ students, live, schoolId }:
  { students: any[]; live: boolean; schoolId: string | null }) {
  const { toast } = useSlis();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState("coordinator");
  const [inviting, setInviting] = useState(false);
  const [creds, setCreds] = useState<Cred[]>([]);
  const [stored, setStored] = useState<AccountCred[]>([]);
  const [reveal, setReveal] = useState<Record<string, boolean>>({});
  const [q, setQ] = useState("");

  useEffect(() => {
    if (live && schoolId) fetchCredentials(schoolId).then(setStored).catch(() => {});
  }, [live, schoolId, creds.length]);

  const filteredStored = stored.filter((c) =>
    !q.trim() || (c.name || "").includes(q) || c.username.includes(q));

  const withAccount = students.filter((s) => s.hasAccount).length;
  const without = students.filter((s) => !s.hasAccount);

  const copy = (t: string) => { navigator.clipboard?.writeText(t); toast("نُسِخ", "info"); };

  const makeStudent = async (s: any) => {
    setBusyId(s.id);
    try {
      const r = await createStudentAccount(s.id);
      setCreds((c) => [{ kind: "student", label: s.name, email: r.email, password: r.password }, ...c]);
      toast(`أُنشئ حساب ${s.name}`);
      // ملاحظة: يظهر الحساب كمرتبط بعد إعادة تحميل البيانات
    } catch (e: any) { toast(`تعذّر إنشاء الحساب: ${e.message || e}`, "danger"); }
    finally { setBusyId(null); }
  };

  const invite = async () => {
    if (!schoolId || !inviteEmail.trim()) return;
    setInviting(true);
    try {
      const r = await inviteMember(schoolId, inviteEmail.trim(), inviteName.trim(), inviteRole);
      setCreds((c) => [{ kind: "member", label: inviteName.trim() || inviteEmail.trim(), email: r.email, password: r.password }, ...c]);
      setInviteEmail(""); setInviteName("");
      toast("أُنشئ حساب العضو");
    } catch (e: any) { toast(`تعذّرت الدعوة: ${e.message || e}`, "danger"); }
    finally { setInviting(false); }
  };

  if (!live) return (
    <div className="rounded-xl border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
      إدارة الحسابات متاحة عند الدخول بحساب مدرسة حقيقي (غير متاحة في العرض التجريبي).
    </div>
  );

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      {/* حسابات الطلاب */}
      <div className="lg:col-span-2 rounded-xl border bg-card overflow-hidden">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <span className="font-display font-bold">حسابات الطلاب</span>
          <span className="text-xs text-muted-foreground"><En>{withAccount}</En> مرتبط · <En>{without.length}</En> بلا حساب</span>
        </div>
        <div className="max-h-[440px] divide-y overflow-y-auto">
          {students.map((s) => (
            <div key={s.id} className="flex items-center gap-3 px-5 py-2.5">
              <Avatar name={s.name} color={s.avatarColor} size={32} />
              <div className="flex-1"><div className="font-semibold text-sm">{s.name}</div>
                <div className="text-xs text-muted-foreground">{s.className || s.grade}</div></div>
              {s.hasAccount
                ? <Pill tone="success"><Check className="h-3 w-3" /> له حساب</Pill>
                : <button onClick={() => makeStudent(s)} disabled={busyId === s.id}
                    className="inline-flex items-center gap-1 rounded-md bg-brand px-2.5 h-8 text-xs font-semibold text-white hover:bg-brand/90 disabled:opacity-50">
                    {busyId === s.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />} إنشاء حساب
                  </button>}
            </div>
          ))}
          {students.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">لا طلاب بعد.</div>}
        </div>
      </div>

      {/* دعوة عضو + بيانات الاعتماد */}
      <div className="space-y-4">
        <div className="rounded-xl border bg-card p-5">
          <div className="mb-3 flex items-center gap-2"><UserPlus className="h-4 w-4 text-brand" />
            <h3 className="font-display font-bold">دعوة عضو (مشرف/منسّق)</h3></div>
          <div className="space-y-3">
            <Field label="البريد الإلكتروني"><input className={inputCls} value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="name@example.com" type="email" /></Field>
            <Field label="الاسم"><input className={inputCls} value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="الاسم الكامل" /></Field>
            <Field label="الدور"><select className={inputCls} value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>{MEMBER_ROLES.map((r) => <option key={r.k} value={r.k}>{r.l}</option>)}</select></Field>
            <button onClick={invite} disabled={inviting || !inviteEmail.trim()}
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand h-10 text-sm font-semibold text-white hover:bg-brand/90 disabled:opacity-50">
              {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />} إنشاء الحساب
            </button>
          </div>
        </div>

        {creds.length > 0 && (
          <div className="rounded-xl border border-brand/30 bg-brand/5 p-4">
            <div className="mb-2 text-xs font-semibold text-brand">بيانات الدخول المُنشأة (انسخها وسلّمها للمستخدم — لن تظهر لاحقًا)</div>
            <div className="space-y-2">
              {creds.map((c, i) => (
                <div key={i} className="rounded-lg border bg-card p-2.5 text-[12px]">
                  <div className="font-semibold">{c.label} <span className="text-muted-foreground">({c.kind === "student" ? "طالب" : "عضو"})</span></div>
                  <div className="mt-1 flex items-center justify-between gap-2"><span className="text-muted-foreground">البريد</span>
                    <span className="flex items-center gap-1 font-mono ltr">{c.email}<button onClick={() => copy(c.email)}><Copy className="h-3 w-3 text-brand" /></button></span></div>
                  <div className="mt-0.5 flex items-center justify-between gap-2"><span className="text-muted-foreground">كلمة المرور</span>
                    <span className="flex items-center gap-1 font-mono ltr">{c.password}<button onClick={() => copy(c.password)}><Copy className="h-3 w-3 text-brand" /></button></span></div>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[10px] text-muted-foreground">لتفعيل الطلاب: يظهر «له حساب» بعد إعادة تحميل الصفحة.</p>
          </div>
        )}
      </div>

      {/* سجل بيانات الدخول (اسم المستخدم + كلمة السر مخفية) */}
      <div className="lg:col-span-3 rounded-xl border bg-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b px-5 py-3">
          <span className="font-display font-bold flex items-center gap-2"><KeyRound className="h-4 w-4 text-brand" /> بيانات دخول الحسابات (<En>{stored.length}</En>)</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث بالاسم أو البريد…"
            className="rounded-lg border bg-background px-3 h-9 text-sm min-w-[200px]" />
        </div>
        <div className="max-h-[420px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card">
              <tr className="text-xs text-muted-foreground">
                <th className="border-b p-2.5 text-right font-semibold">الاسم</th>
                <th className="border-b p-2.5 text-right font-semibold">الدور</th>
                <th className="border-b p-2.5 text-right font-semibold">اسم المستخدم</th>
                <th className="border-b p-2.5 text-right font-semibold">كلمة المرور</th>
              </tr>
            </thead>
            <tbody>
              {filteredStored.map((c) => (
                <tr key={c.id} className="hover:bg-accent/30">
                  <td className="border-b p-2.5 font-medium">{c.name || "—"}</td>
                  <td className="border-b p-2.5"><Pill tone="muted">{ROLE_AR[c.role] || c.role}</Pill></td>
                  <td className="border-b p-2.5"><span dir="ltr" className="font-mono text-xs flex items-center gap-1">{c.username}<button onClick={() => copy(c.username)}><Copy className="h-3 w-3 text-brand" /></button></span></td>
                  <td className="border-b p-2.5">
                    <span dir="ltr" className="font-mono text-xs flex items-center gap-1.5">
                      {reveal[c.id] ? c.password : "••••••••"}
                      <button onClick={() => setReveal((r) => ({ ...r, [c.id]: !r[c.id] }))} title={reveal[c.id] ? "إخفاء" : "إظهار"}>
                        {reveal[c.id] ? <EyeOff className="h-3.5 w-3.5 text-muted-foreground" /> : <Eye className="h-3.5 w-3.5 text-brand" />}
                      </button>
                      {reveal[c.id] && <button onClick={() => copy(c.password)}><Copy className="h-3 w-3 text-brand" /></button>}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredStored.length === 0 && (
                <tr><td colSpan={4} className="p-6 text-center text-sm text-muted-foreground">
                  لا بيانات دخول مخزّنة بعد. تُحفظ تلقائيًا عند إنشاء حسابات جديدة من هنا أو عبر التسجيل الذاتي.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
