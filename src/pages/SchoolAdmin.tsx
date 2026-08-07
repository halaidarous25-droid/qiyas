import { useState } from "react";
import { Pill, Avatar, En } from "@/components/common";
import { useSlis } from "@/store";
import { SCHOOL, TEACHER_ROLES, type SchoolClass } from "@/data/mock";
import { cn } from "@/lib/utils";
import {
  Building2, Users2, Layers, GraduationCap, Plus, School,
  MapPin, Clock, UploadCloud, Check,
} from "lucide-react";

type Tab = "info" | "classes" | "teachers" | "students";
const TABS: { k: Tab; l: string; icon: any }[] = [
  { k: "info", l: "بيانات المدرسة", icon: Building2 },
  { k: "classes", l: "الفصول", icon: Layers },
  { k: "teachers", l: "المعلمون", icon: Users2 },
  { k: "students", l: "الطلاب", icon: GraduationCap },
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
  const { students, teachers, classes, addStudent, addTeacher, addClass, mode } = useSlis();
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

      {tab === "info" && <SchoolInfo studentsN={students.length} classesN={classes.length} teachersN={teachers.length} mode={mode} />}
      {tab === "classes" && <ClassesTab classes={classes} teachers={teachers} onAdd={addClass} />}
      {tab === "teachers" && <TeachersTab teachers={teachers} onAdd={addTeacher} />}
      {tab === "students" && <StudentsTab students={students} classes={classes} onAdd={addStudent} />}
    </div>
  );
}

function SchoolInfo({ studentsN, classesN, teachersN, mode }:
  { studentsN: number; classesN: number; teachersN: number; mode: string }) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2 rounded-xl border bg-card p-5">
        <div className="mb-4 flex items-center gap-2"><School className="h-[18px] w-[18px] text-brand" />
          <h2 className="font-display font-bold">بيانات المدرسة</h2></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="اسم المدرسة"><input className={inputCls} defaultValue={SCHOOL.name} /></Field>
          <Field label="المدينة"><input className={inputCls} defaultValue="الرياض" /></Field>
          <Field label="المرحلة"><input className={inputCls} defaultValue="الثانوية" /></Field>
          <Field label="مُعرّف المدرسة (Tenant)"><input className={inputCls} defaultValue={SCHOOL.tenant} disabled /></Field>
        </div>
        <button className="mt-4 rounded-lg bg-brand px-5 h-10 text-sm font-semibold text-white hover:bg-brand/90">حفظ البيانات</button>
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
  const submit = () => { if (name.trim().length < 2) return; onAdd({ name: name.trim(), role }); setName(""); };
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <div className="lg:col-span-2 rounded-xl border bg-card overflow-hidden">
        <div className="border-b px-5 py-3 font-display font-bold">المعلمون والإداريون (<En>{teachers.length}</En>)</div>
        <div className="divide-y">
          {teachers.map((t) => (
            <div key={t.id} className="flex items-center gap-3 px-5 py-3">
              <Avatar name={t.name} color="#0f5c66" size={36} />
              <div className="flex-1 font-semibold text-sm">{t.name}</div>
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
          <button onClick={submit} className="w-full rounded-lg bg-brand h-10 text-sm font-semibold text-white hover:bg-brand/90">إضافة المعلّم</button>
        </div>
      </div>
    </div>
  );
}

function StudentsTab({ students, classes, onAdd }:
  { students: any[]; classes: SchoolClass[]; onAdd: (s: any) => void }) {
  const [name, setName] = useState(""); const [grade, setGrade] = useState(GRADES[0]);
  const [className, setClassName] = useState(classes[0]?.name || "");
  const submit = () => { if (name.trim().length < 2) return; onAdd({ name: name.trim(), grade, className }); setName(""); };
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <div className="lg:col-span-2 rounded-xl border bg-card overflow-hidden">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <span className="font-display font-bold">الطلاب (<En>{students.length}</En>)</span>
          <span className="text-xs text-muted-foreground"><En>{students.filter((s) => s.assessed).length}</En> أدّوا المقياس</span>
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
          <button onClick={submit} className="w-full rounded-lg bg-brand h-10 text-sm font-semibold text-white hover:bg-brand/90">إضافة الطالب</button>
          <p className="text-[11px] text-muted-foreground">يُضاف الطالب بحالة «بانتظار المقياس» حتى يؤدّيه من بوابته.</p>
        </div>
      </div>
    </div>
  );
}
