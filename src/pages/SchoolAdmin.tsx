import { useState, useRef } from "react";
import { Pill, Avatar, En } from "@/components/common";
import { useSlis } from "@/store";
import { SCHOOL, TEACHER_ROLES, type SchoolClass } from "@/data/mock";
import { parseStudentsCsv, STUDENTS_CSV_TEMPLATE } from "@/lib/csv";
import { cn } from "@/lib/utils";
import {
  Building2, Users2, Layers, GraduationCap, Plus, School,
  MapPin, Clock, UploadCloud, Check, FileDown, FileUp, KeyRound, UserPlus, Copy, Loader2, Eye, EyeOff, Link as LinkIcon, Download,
} from "lucide-react";
import { useEffect } from "react";
import { createStudentAccount, inviteMember, fetchCredentials, type AccountCred } from "@/lib/api";

type Tab = "info" | "classes" | "teachers" | "students" | "accounts";
const TABS: { k: Tab; l: string; icon: any }[] = [
  { k: "info", l: "بيانات المدرسة", icon: Building2 },
  { k: "classes", l: "الفصول", icon: Layers },
  { k: "teachers", l: "المعلمون", icon: Users2 },
  { k: "students", l: "الطلاب", icon: GraduationCap },
  { k: "accounts", l: "الحسابات والصلاحيات", icon: KeyRound },
];

const GRADES = ["الأول الثانوي", "الثاني الثانوي", "الثالث الثانوي"];

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
  const { students, teachers, classes, addStudent, bulkAddStudents, addTeacher, addClass, mode, live, schoolId } = useSlis();
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

      {tab === "info" && <SchoolInfo studentsN={students.length} classesN={classes.length} teachersN={teachers.length} mode={mode} live={live} />}
      {tab === "classes" && <ClassesTab classes={classes} teachers={teachers} onAdd={addClass} />}
      {tab === "teachers" && <TeachersTab teachers={teachers} onAdd={addTeacher} />}
      {tab === "students" && <StudentsTab students={students} classes={classes} onAdd={addStudent} onBulk={bulkAddStudents} />}
      {tab === "accounts" && <AccountsTab students={students} live={live} schoolId={schoolId} />}
    </div>
  );
}

function SchoolInfo({ studentsN, classesN, teachersN, mode, live }:
  { studentsN: number; classesN: number; teachersN: number; mode: string; live: boolean }) {
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
          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>وضع التشغيل</span><Pill tone="brand">الوضع {mode === "A" ? "أ" : "ب"}</Pill>
          </div>
        </div>
        <div className="rounded-xl border border-dashed bg-card p-4 text-center">
          <UploadCloud className="mx-auto h-7 w-7 text-brand" />
          <div className="mt-1 text-sm font-semibold">استيراد من ملف</div>
          <p className="text-[11px] text-muted-foreground">رفع الطلاب والفصول دفعةً واحدة عبر ملف <span className="en">CSV</span> (يُفعّل مع قاعدة البيانات).</p>
        </div>
      </div>
    </div>
  );
}

function ClassesTab({ classes, teachers, onAdd }:
  { classes: SchoolClass[]; teachers: any[]; onAdd: (c: any) => void }) {
  const [name, setName] = useState(""); const [grade, setGrade] = useState(GRADES[0]);
  const [homeroom, setHomeroom] = useState(teachers[0]?.name || "");
  const submit = () => { if (name.trim().length < 1) return; onAdd({ name: name.trim(), grade, homeroom }); setName(""); };
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <div className="lg:col-span-2 rounded-xl border bg-card overflow-hidden">
        <div className="border-b px-5 py-3 font-display font-bold">الفصول (<En>{classes.length}</En>)</div>
        <div className="divide-y">
          {classes.map((c) => (
            <div key={c.id} className="flex items-center gap-3 px-5 py-3">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand/8 font-bold text-brand">{c.name}</div>
              <div className="flex-1"><div className="font-semibold text-sm">{c.grade}</div>
                <div className="text-xs text-muted-foreground">رائد الفصل: {c.homeroom}</div></div>
              <Pill tone="muted"><En>{c.students}</En> طالب</Pill>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-xl border bg-card p-5 h-fit">
        <div className="mb-3 flex items-center gap-2"><Plus className="h-4 w-4 text-brand" />
          <h3 className="font-display font-bold">إضافة فصل</h3></div>
        <div className="space-y-3">
          <Field label="اسم الفصل"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: ٣/ب" /></Field>
          <Field label="الصف"><select className={inputCls} value={grade} onChange={(e) => setGrade(e.target.value)}>{GRADES.map((g) => <option key={g}>{g}</option>)}</select></Field>
          <Field label="رائد الفصل"><select className={inputCls} value={homeroom} onChange={(e) => setHomeroom(e.target.value)}>{teachers.map((t) => <option key={t.id}>{t.name}</option>)}</select></Field>
          <button onClick={submit} className="w-full rounded-lg bg-brand h-10 text-sm font-semibold text-white hover:bg-brand/90">إضافة الفصل</button>
        </div>
      </div>
    </div>
  );
}

function TeachersTab({ teachers, onAdd }: { teachers: any[]; onAdd: (t: any) => void }) {
  const [name, setName] = useState(""); const [role, setRole] = useState(TEACHER_ROLES[0]);
  const [natId, setNatId] = useState(""); const [email, setEmail] = useState(""); const [phone, setPhone] = useState("");
  const submit = () => {
    if (name.trim().length < 2) return;
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
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-xl border bg-card p-5 h-fit">
        <div className="mb-3 flex items-center gap-2"><Plus className="h-4 w-4 text-brand" />
          <h3 className="font-display font-bold">إضافة معلّم</h3></div>
        <div className="space-y-3">
          <Field label="الاسم"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: أ. تركي القحطاني" /></Field>
          <Field label="الدور"><select className={inputCls} value={role} onChange={(e) => setRole(e.target.value)}>{TEACHER_ROLES.map((r) => <option key={r}>{r}</option>)}</select></Field>
          <Field label="رقم الهوية (اختياري)"><input className={inputCls} dir="ltr" inputMode="numeric" value={natId} onChange={(e) => setNatId(e.target.value.replace(/[^0-9]/g, ""))} placeholder="١٠xxxxxxxx" /></Field>
          <Field label="رقم الجوال (اختياري)"><input className={inputCls} dir="ltr" inputMode="numeric" value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ""))} placeholder="05xxxxxxxx" /></Field>
          <Field label="البريد الإلكتروني (اختياري)"><input className={inputCls} dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" /></Field>
          <button onClick={submit} className="w-full rounded-lg bg-brand h-10 text-sm font-semibold text-white hover:bg-brand/90">إضافة المعلّم</button>
        </div>
      </div>
    </div>
  );
}

function StudentsTab({ students, classes, onAdd, onBulk }:
  { students: any[]; classes: SchoolClass[]; onAdd: (s: any) => void; onBulk: (rows: any[]) => Promise<number> }) {
  const [name, setName] = useState(""); const [grade, setGrade] = useState(GRADES[0]);
  const [className, setClassName] = useState(classes[0]?.name || "");
  const [natId, setNatId] = useState(""); const [sEmail, setSEmail] = useState(""); const [sPhone, setSPhone] = useState("");
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const submit = () => {
    if (name.trim().length < 2) return;
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

  const { tenantCode, toast: t2, schoolInfo } = useSlis();
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
        <div className="max-h-[460px] divide-y overflow-y-auto">
          {students.map((s) => (
            <div key={s.id} className="flex items-center gap-3 px-5 py-2.5">
              <Avatar name={s.name} color={s.avatarColor} size={34} />
              <div className="flex-1"><div className="font-semibold text-sm">{s.name}</div>
                <div className="text-xs text-muted-foreground">{s.grade} · {s.className}</div></div>
              {s.assessed
                ? <Pill tone="success"><Check className="h-3 w-3" /> مُقيَّم</Pill>
                : <Pill tone="warning"><Clock className="h-3 w-3" /> بانتظار المقياس</Pill>}
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-xl border bg-card p-5 h-fit">
        <div className="mb-3 flex items-center gap-2"><Plus className="h-4 w-4 text-brand" />
          <h3 className="font-display font-bold">إضافة طالب</h3></div>
        <div className="space-y-3">
          <Field label="الاسم"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="الاسم الكامل" /></Field>
          <Field label="الصف"><select className={inputCls} value={grade} onChange={(e) => setGrade(e.target.value)}>{GRADES.map((g) => <option key={g}>{g}</option>)}</select></Field>
          <Field label="الفصل"><select className={inputCls} value={className} onChange={(e) => setClassName(e.target.value)}>{classes.map((c) => <option key={c.id}>{c.name}</option>)}</select></Field>
          <Field label="رقم الهوية (اختياري)"><input className={inputCls} dir="ltr" inputMode="numeric" value={natId} onChange={(e) => setNatId(e.target.value.replace(/[^0-9]/g, ""))} placeholder="١٠xxxxxxxx" /></Field>
          <Field label="البريد الإلكتروني (اختياري)"><input className={inputCls} dir="ltr" value={sEmail} onChange={(e) => setSEmail(e.target.value)} placeholder="name@example.com" /></Field>
          <Field label="رقم الجوال (اختياري)"><input className={inputCls} dir="ltr" inputMode="numeric" value={sPhone} onChange={(e) => setSPhone(e.target.value.replace(/[^0-9]/g, ""))} placeholder="05xxxxxxxx" /></Field>
          <button onClick={submit} className="w-full rounded-lg bg-brand h-10 text-sm font-semibold text-white hover:bg-brand/90">إضافة الطالب</button>
          <p className="text-[11px] text-muted-foreground">يُضاف الطالب بحالة «بانتظار المقياس» حتى يؤدّيه من بوابته. رقم الهوية يربط نتائج الرابط العام تلقائيًا.</p>
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
