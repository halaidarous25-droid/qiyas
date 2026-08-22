import { useState } from "react";
import { Pill, Meter, En } from "@/components/common";
import {
  PLATFORM_SCHOOLS, SCHOOL_STATUS, PLATFORM_KPI, ONBOARDING_STEPS,
  APPEALS, APPEAL_TRACK, type PlatformSchool, type Appeal,
} from "@/data/mock";
import type { CentralSeed } from "@/lib/live";
import { CentralQuestions } from "./CentralQuestions";
import { CentralPermissions } from "./CentralPermissions";
import { CentralExams } from "./CentralExams";
import { badgeTone, type Tone } from "@/lib/tone";
import { cn } from "@/lib/utils";
import { useSlis } from "@/store";
import {
  Building2, ShieldCheck, Scale, TrendingUp, School, CheckCircle2,
  Server, ListChecks, Globe, ClipboardCheck, Gavel, Hourglass, Pencil, X,
  PauseCircle, Trash2, AlertTriangle, Plus, KeyRound, Copy, Loader2,
} from "lucide-react";
import { useEffect } from "react";
import { provisionSchool, resetAccountPassword, fetchResetRequests, fetchSchoolAccount, setSchoolCredentials, type ResetRequest } from "@/lib/api";

// قائمة المدن (قابلة للتوسعة)
const CITIES = [
  "الرياض", "جدة", "مكة المكرمة", "المدينة المنورة", "الدمام", "الخبر", "الظهران", "الطائف",
  "بريدة", "عنيزة", "تبوك", "حائل", "أبها", "خميس مشيط", "نجران", "جازان", "الباحة",
  "عرعر", "سكاكا", "القطيف", "الأحساء", "الجبيل", "ينبع", "الخرج", "حفر الباطن", "الزلفي",
];
const STAGES = ["الابتدائية", "المتوسطة", "الثانوية"];

function Kpi({ icon: Icon, label, value, sub, tone }:
  { icon: any; label: string; value: string; sub: string; tone: Tone }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-muted-foreground">{label}</div>
          <div className="mt-1 font-display text-3xl font-extrabold">{value}</div>
          <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
        </div>
        <div className={cn("grid h-11 w-11 place-items-center rounded-xl border", badgeTone[tone])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

const pctText = (v: number | null) => (v === null ? "—" : `${v}%`);

export function CentralApp({ data, userName, onResolveAppeal, onReviewAppeal, onSetSchoolStatus, onUpdateSchool, onDeleteSchool, onReload }: {
  data?: CentralSeed;
  userName?: string;
  onResolveAppeal?: (id: string) => void;
  onReviewAppeal?: (id: string) => void;
  onSetSchoolStatus?: (schoolId: string, status: string) => void;
  onUpdateSchool?: (schoolId: string, patch: { name?: string; city?: string; address?: string; email?: string; phone?: string; stage?: string }) => void;
  onDeleteSchool?: (schoolId: string) => void;
  onReload?: () => void;
} = {}) {
  const { toast } = useSlis();
  const live = !!data;
  const [view, setView] = useState<"dashboard" | "questions" | "exams" | "permissions">("dashboard");
  const [editSchool, setEditSchool] = useState<PlatformSchool | null>(null);
  const [confirmDel, setConfirmDel] = useState<PlatformSchool | null>(null);
  const [showRegister, setShowRegister] = useState(false);

  // البيانات: حيّة إن توفّرت، وإلا الوضع التجريبي
  const schools: PlatformSchool[] = live ? data!.schools : PLATFORM_SCHOOLS;
  const appeals: Appeal[] = live ? data!.appeals : APPEALS;
  const kpi = live ? data!.kpi : {
    schools: PLATFORM_KPI.schools, active: PLATFORM_KPI.active,
    openAppeals: APPEALS.filter((a) => a.status !== "resolved").length,
    escalated: APPEALS.filter((a) => a.track !== "A" && a.status !== "resolved").length,
    renewalRate: PLATFORM_KPI.renewalRate, assessmentRate: null as number | null,
    activeRate: Math.round((PLATFORM_KPI.active / PLATFORM_KPI.schools) * 100),
  };

  const openAppeals = appeals.filter((a) => a.status !== "resolved");

  const meters = [
    { l: "نسبة إكمال المقياس", v: kpi.assessmentRate, target: "عبر كل المدارس", tone: "brand" as Tone },
    { l: "المدارس النشطة", v: kpi.activeRate, target: "من إجمالي المدارس", tone: "success" as Tone },
    { l: "معدّل تجديد الاشتراك", v: kpi.renewalRate, target: "الاشتراكات النشطة", tone: "info" as Tone },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-brand text-white">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 h-16">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/15"><Server className="h-5 w-5" /></div>
          <div className="leading-tight">
            <div className="font-display font-extrabold text-[15px]">لوحة النظام المركزي — مؤشر</div>
            <div className="text-[11px] text-white/75">
              {userName ? userName : "مزوّد الخدمة"} · حوكمة المنصة بالكامل{live ? " · بيانات حيّة" : ""}
            </div>
          </div>
          <div className="mr-auto flex gap-1.5">
            <button onClick={() => setView("dashboard")}
              className={cn("rounded-lg px-3 h-9 text-xs font-semibold", view === "dashboard" ? "bg-white text-brand" : "bg-white/15 text-white hover:bg-white/25")}>
              لوحة المنصة
            </button>
            <button onClick={() => setView("questions")}
              className={cn("rounded-lg px-3 h-9 text-xs font-semibold", view === "questions" ? "bg-white text-brand" : "bg-white/15 text-white hover:bg-white/25")}>
              مستودع الأسئلة
            </button>
            <button onClick={() => setView("exams")}
              className={cn("rounded-lg px-3 h-9 text-xs font-semibold", view === "exams" ? "bg-white text-brand" : "bg-white/15 text-white hover:bg-white/25")}>
              الاختبارات
            </button>
            <button onClick={() => setView("permissions")}
              className={cn("rounded-lg px-3 h-9 text-xs font-semibold", view === "permissions" ? "bg-white text-brand" : "bg-white/15 text-white hover:bg-white/25")}>
              الصلاحيات
            </button>
          </div>
        </div>
      </header>

      {view === "questions" && <CentralQuestions />}
      {view === "exams" && <CentralExams schools={data?.schools || []} />}
      {view === "permissions" && <CentralPermissions />}
      {view === "dashboard" && (
      <main className="mx-auto max-w-5xl space-y-5 p-4 md:p-8 soft-grid">
        {/* مؤشرات المنصة (محسوبة من البيانات الحيّة) */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi icon={School} tone="brand" label="المدارس المشتركة" value={String(kpi.schools)} sub={`${kpi.active} نشطة`} />
          <Kpi icon={Scale} tone="warning" label="تظلّمات مفتوحة" value={String(kpi.openAppeals)} sub={`${kpi.escalated} مُصعّدة`} />
          <Kpi icon={ClipboardCheck} tone="success" label="إكمال المقياس" value={pctText(kpi.assessmentRate)} sub="عبر المنصة" />
          <Kpi icon={TrendingUp} tone="info" label="معدّل التجديد" value={pctText(kpi.renewalRate)} sub="سنوي" />
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {/* المدارس */}
          <div className="lg:col-span-2 rounded-xl border bg-card">
            <div className="flex items-center justify-between border-b px-5 py-3.5">
              <div className="flex items-center gap-2"><Building2 className="h-[18px] w-[18px] text-brand" />
                <h2 className="font-display font-bold">المدارس على المنصة</h2></div>
              <button onClick={() => live ? setShowRegister(true) : toast("تسجيل المدارس متاح في اللوحة الحيّة فقط", "info")}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 h-9 text-sm font-semibold text-white hover:bg-brand/90">
                <Plus className="h-4 w-4" /> تسجيل مدرسة</button>
            </div>
            <div className="divide-y">
              {schools.map((s) => {
                const st = SCHOOL_STATUS[s.status];
                return (
                  <div key={s.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="grid h-10 w-10 place-items-center rounded-lg bg-brand/8 text-brand"><School className="h-5 w-5" /></div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <div className="font-semibold text-[15px]">{s.name}</div>
                        {onUpdateSchool && (
                          <button onClick={() => setEditSchool(s)} title="تعديل معلومات المدرسة"
                            className="grid h-6 w-6 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-brand">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {s.city} · <En>{s.students}</En> طالب · خطة {s.plan}
                      </div>
                    </div>
                    <div className="text-left">
                      <Pill tone={st.tone as Tone}>{st.label}</Pill>
                      {s.status === "onboarding" && onSetSchoolStatus ? (
                        <div className="mt-1.5 flex gap-1.5">
                          <button onClick={() => onSetSchoolStatus(s.id, "active")}
                            className="inline-flex items-center gap-1 rounded-md bg-success px-2.5 h-7 text-[11px] font-semibold text-white hover:opacity-90">
                            <CheckCircle2 className="h-3 w-3" /> اعتماد
                          </button>
                          <button onClick={() => onSetSchoolStatus(s.id, "frozen")}
                            className="inline-flex items-center gap-1 rounded-md border border-danger/40 text-danger px-2.5 h-7 text-[11px] font-semibold hover:bg-danger/10">
                            رفض
                          </button>
                        </div>
                      ) : (onSetSchoolStatus || onDeleteSchool) ? (
                        <div className="mt-1.5 flex justify-end gap-1.5">
                          {onSetSchoolStatus && (s.status === "frozen" ? (
                            <button onClick={() => onSetSchoolStatus(s.id, "active")}
                              className="inline-flex items-center gap-1 rounded-md bg-success px-2.5 h-7 text-[11px] font-semibold text-white hover:opacity-90">
                              <CheckCircle2 className="h-3 w-3" /> تفعيل
                            </button>
                          ) : (
                            <button onClick={() => onSetSchoolStatus(s.id, "frozen")}
                              title="تعليق حساب المدرسة مؤقتًا"
                              className="inline-flex items-center gap-1 rounded-md border px-2.5 h-7 text-[11px] font-semibold text-amber-700 border-amber-300 hover:bg-amber-50">
                              <PauseCircle className="h-3 w-3" /> تعليق
                            </button>
                          ))}
                          {onDeleteSchool && (
                            <button onClick={() => setConfirmDel(s)} title="حذف المدرسة"
                              className="inline-flex items-center gap-1 rounded-md border border-danger/40 text-danger px-2.5 h-7 text-[11px] font-semibold hover:bg-danger/10">
                              <Trash2 className="h-3 w-3" /> حذف
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="mt-1 text-[11px] text-muted-foreground">{s.note}</div>
                      )}
                    </div>
                  </div>
                );
              })}
              {schools.length === 0 && <p className="px-5 py-4 text-sm text-muted-foreground">لا توجد مدارس بعد.</p>}
            </div>
          </div>

          {/* التظلّمات */}
          <div className="rounded-xl border bg-card">
            <div className="border-b px-5 py-3.5">
              <div className="flex items-center gap-2"><Scale className="h-[18px] w-[18px] text-brand" />
                <h2 className="font-display font-bold text-[15px]">التظلّمات المفتوحة</h2></div>
            </div>
            <div className="space-y-2 p-3">
              {openAppeals.map((a) => {
                const t = APPEAL_TRACK[a.track];
                return (
                  <div key={a.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between">
                      <Pill tone={t.tone as Tone}>المسار {a.track}</Pill>
                      {a.status === "review"
                        ? <Pill tone="info"><Hourglass className="h-3 w-3" /> قيد المراجعة</Pill>
                        : <Pill tone="warning">جديد</Pill>}
                    </div>
                    <p className="mt-1.5 text-[13px] font-medium">{a.subject}</p>
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      {a.student} · <En>{a.daysElapsed}/{a.slaMax}</En> يوم · {a.decider}
                    </div>
                    <div className="mt-2 flex gap-2">
                      {a.status === "new" && (
                        <button
                          onClick={() => onReviewAppeal ? onReviewAppeal(a.id) : toast("استُلم التظلّم للمراجعة", "info")}
                          className="rounded-md border px-2.5 h-8 text-xs font-semibold hover:bg-accent">
                          استلام
                        </button>
                      )}
                      <button
                        onClick={() => onResolveAppeal ? onResolveAppeal(a.id) : toast("حُسم التظلّم")}
                        className="inline-flex items-center gap-1 rounded-md bg-brand px-2.5 h-8 text-xs font-semibold text-white hover:bg-brand/90">
                        <Gavel className="h-3.5 w-3.5" /> حسم
                      </button>
                    </div>
                  </div>
                );
              })}
              {openAppeals.length === 0 && <p className="p-3 text-sm text-muted-foreground">لا تظلّمات مفتوحة حاليًا.</p>}
            </div>
          </div>
        </div>

        {/* طلبات إعادة تعيين كلمة المرور */}
        {live && <ResetRequestsPanel />}

        {/* دورة انضمام المدارس */}
        <div className="rounded-xl border bg-card p-5">
          <div className="mb-4 flex items-center gap-2"><ListChecks className="h-[18px] w-[18px] text-brand" />
            <h2 className="font-display font-bold">دورة انضمام المدرسة</h2></div>
          <div className="flex flex-wrap items-center gap-2">
            {ONBOARDING_STEPS.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-[13px]">
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-brand text-[11px] font-bold text-white"><En>{i + 1}</En></span>
                  {s}
                </div>
                {i < ONBOARDING_STEPS.length - 1 && <span className="text-brand">←</span>}
              </div>
            ))}
          </div>
        </div>

        {/* مؤشرات أداء المنصة */}
        <div className="rounded-xl border bg-card p-5">
          <div className="mb-3 flex items-center gap-2"><Globe className="h-[18px] w-[18px] text-brand" />
            <h2 className="font-display font-bold">مؤشرات أداء المنصة</h2>
            {live && <Pill tone="success" className="mr-auto"><ShieldCheck className="h-3 w-3" /> محسوبة آنيًا</Pill>}
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {meters.map((m) => (
              <div key={m.l} className="rounded-lg border p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-foreground/80">{m.l}</span>
                  <CheckCircle2 className="h-4 w-4 text-success" />
                </div>
                <div className="mt-1 font-display text-2xl font-extrabold">
                  {m.v === null ? "—" : <En>{m.v}%</En>}
                </div>
                <Meter value={m.v ?? 0} tone={m.tone} className="mt-1.5" />
                <div className="mt-1 text-[11px] text-muted-foreground">{m.target}</div>
              </div>
            ))}
          </div>
        </div>
      </main>
      )}

      {showRegister && (
        <RegisterSchoolModal onClose={() => setShowRegister(false)} onDone={() => { setShowRegister(false); onReload?.(); }} />
      )}

      {editSchool && onUpdateSchool && (
        <SchoolEditModal
          school={editSchool}
          onClose={() => setEditSchool(null)}
          onSave={(patch) => { onUpdateSchool(editSchool.id, patch); setEditSchool(null); }}
        />
      )}

      {confirmDel && onDeleteSchool && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={() => setConfirmDel(null)}>
          <div className="w-full max-w-sm rounded-2xl border bg-card p-5 text-center shadow-xl" onClick={(e) => e.stopPropagation()} dir="rtl">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-danger/10 text-danger"><AlertTriangle className="h-6 w-6" /></div>
            <h3 className="mt-3 font-display text-lg font-extrabold">حذف المدرسة</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              سيتم حذف «{confirmDel.name}» وإخفاؤها من المنصة. لن يستطيع منسوبوها الدخول. يمكن استرجاعها لاحقًا من قاعدة البيانات.
            </p>
            <div className="mt-5 flex justify-center gap-2">
              <button onClick={() => setConfirmDel(null)} className="rounded-lg border px-4 h-10 text-sm font-semibold hover:bg-accent">إلغاء</button>
              <button onClick={() => { onDeleteSchool(confirmDel.id); setConfirmDel(null); }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-danger px-5 h-10 text-sm font-semibold text-white hover:opacity-90">
                <Trash2 className="h-4 w-4" /> تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== تسجيل مدرسة جديدة (مركزي) =====
function RegisterSchoolModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const { toast } = useSlis();
  const [f, setF] = useState({ schoolName: "", stage: "الثانوية", city: CITIES[0], phone: "", email: "", principalName: "", username: "", password: "" });
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<{ tenant: string; username: string; password: string } | null>(null);
  const inp = "w-full rounded-lg border bg-background px-3 h-11 text-sm outline-none focus:border-brand";
  const valid = f.schoolName.trim().length >= 2 && f.username.trim().length >= 3 && f.password.length >= 6;
  const copy = (t: string) => { navigator.clipboard?.writeText(t); toast("نُسِخ", "info"); };

  const submit = async () => {
    setBusy(true); setErr(null);
    try {
      const r = await provisionSchool({
        schoolName: f.schoolName.trim(), stage: f.stage, city: f.city, phone: f.phone.trim(),
        email: f.email.trim(), principalName: f.principalName.trim(), username: f.username.trim(), password: f.password,
      });
      setResult({ tenant: r.tenant, username: r.username, password: r.password });
    } catch (e: any) { setErr(e.message || "تعذّر التسجيل"); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[95] grid place-items-center overflow-auto bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl border bg-card p-5 shadow-xl" onClick={(e) => e.stopPropagation()} dir="rtl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-extrabold">تسجيل مدرسة جديدة</h3>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-accent"><X className="h-4 w-4" /></button>
        </div>

        {result ? (
          <div className="text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
            <h4 className="mt-2 font-display text-lg font-extrabold">تم تسجيل المدرسة 🎉</h4>
            <p className="mt-1 text-sm text-muted-foreground">سلّم بيانات الدخول لمسؤول المدرسة. سيُطلب منه تغيير كلمة المرور عند أول دخول.</p>
            <div className="mt-4 space-y-2 text-right">
              {[{ l: "اسم المستخدم", v: result.username }, { l: "كلمة المرور", v: result.password }, { l: "رمز المدرسة (للرابط)", v: result.tenant }].map((r) => (
                <div key={r.l} className="flex items-center justify-between gap-2 rounded-lg border bg-muted/30 px-3 py-2">
                  <span className="text-xs text-muted-foreground">{r.l}</span>
                  <span className="flex items-center gap-1.5 font-mono text-sm font-bold" dir="ltr">{r.v}
                    <button onClick={() => copy(r.v)}><Copy className="h-3.5 w-3.5 text-brand" /></button></span>
                </div>
              ))}
            </div>
            <button onClick={onDone} className="mt-4 w-full rounded-lg bg-brand h-10 text-sm font-semibold text-white hover:bg-brand/90">تم</button>
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2"><label className="mb-1 block text-xs font-semibold text-muted-foreground">اسم المدرسة</label>
                <input className={inp} value={f.schoolName} onChange={(e) => set("schoolName", e.target.value)} /></div>
              <div><label className="mb-1 block text-xs font-semibold text-muted-foreground">المرحلة الدراسية</label>
                <select className={inp} value={f.stage} onChange={(e) => set("stage", e.target.value)}>{STAGES.map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
              <div><label className="mb-1 block text-xs font-semibold text-muted-foreground">المدينة</label>
                <select className={inp} value={f.city} onChange={(e) => set("city", e.target.value)}>{CITIES.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
              <div><label className="mb-1 block text-xs font-semibold text-muted-foreground">رقم الجوال</label>
                <input className={inp} dir="ltr" inputMode="numeric" value={f.phone} onChange={(e) => set("phone", e.target.value.replace(/[^0-9]/g, ""))} placeholder="05xxxxxxxx" /></div>
              <div><label className="mb-1 block text-xs font-semibold text-muted-foreground">البريد الإلكتروني</label>
                <input className={inp} dir="ltr" value={f.email} onChange={(e) => set("email", e.target.value)} placeholder="school@example.com" /></div>
              <div className="sm:col-span-2"><label className="mb-1 block text-xs font-semibold text-muted-foreground">اسم مدير المدرسة</label>
                <input className={inp} value={f.principalName} onChange={(e) => set("principalName", e.target.value)} /></div>
              <div><label className="mb-1 block text-xs font-semibold text-muted-foreground">اسم المستخدم (للدخول)</label>
                <input className={inp} dir="ltr" value={f.username} onChange={(e) => set("username", e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ""))} placeholder="username" /></div>
              <div><label className="mb-1 block text-xs font-semibold text-muted-foreground">كلمة المرور المبدئية</label>
                <input className={inp} dir="ltr" value={f.password} onChange={(e) => set("password", e.target.value)} placeholder="٦ أحرف فأكثر" /></div>
            </div>
            {err && <p className="mt-3 text-[12px] text-danger">{err}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={onClose} className="rounded-lg border px-4 h-10 text-sm font-semibold hover:bg-accent">إلغاء</button>
              <button onClick={submit} disabled={!valid || busy}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-5 h-10 text-sm font-semibold text-white hover:bg-brand/90 disabled:opacity-50">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} تسجيل المدرسة
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ===== طلبات إعادة تعيين كلمة المرور =====
function ResetRequestsPanel() {
  const { toast } = useSlis();
  const [reqs, setReqs] = useState<ResetRequest[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [pwd, setPwd] = useState<Record<string, string>>({});
  const load = () => fetchResetRequests().then(setReqs).catch(() => {});
  useEffect(() => { load(); }, []);
  const copy = (t: string) => { navigator.clipboard?.writeText(t); toast("نُسِخ", "info"); };
  const doReset = async (r: ResetRequest) => {
    setBusy(r.id);
    try {
      const res = await resetAccountPassword(r.username, undefined, r.id);
      setPwd((p) => ({ ...p, [r.username]: res.password }));
      toast("أُعيد تعيين كلمة المرور — سلّمها للمستخدم");
      load();
    } catch (e: any) { toast(`تعذّر: ${e.message || e}`, "danger"); }
    finally { setBusy(null); }
  };
  if (reqs.length === 0 && Object.keys(pwd).length === 0) return null;
  return (
    <div className="rounded-xl border bg-card">
      <div className="flex items-center gap-2 border-b px-5 py-3.5">
        <KeyRound className="h-[18px] w-[18px] text-brand" />
        <h2 className="font-display font-bold">طلبات إعادة تعيين كلمة المرور</h2>
        {reqs.length > 0 && <Pill tone="warning" className="mr-auto"><En>{reqs.length}</En></Pill>}
      </div>
      <div className="divide-y">
        {reqs.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold">{r.school_name || "—"}</div>
              <div className="text-xs text-muted-foreground" dir="ltr">اسم المستخدم: {r.username}</div>
            </div>
            {pwd[r.username] ? (
              <span className="flex items-center gap-1.5 rounded-lg border bg-success/5 px-3 py-1.5 font-mono text-sm font-bold text-success" dir="ltr">
                {pwd[r.username]} <button onClick={() => copy(pwd[r.username])}><Copy className="h-3.5 w-3.5" /></button>
              </span>
            ) : (
              <button onClick={() => doReset(r)} disabled={busy === r.id}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 h-9 text-sm font-semibold text-white hover:bg-brand/90 disabled:opacity-50">
                {busy === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />} إعادة تعيين
              </button>
            )}
          </div>
        ))}
        {Object.entries(pwd).filter(([u]) => !reqs.some((r) => r.username === u)).map(([u, p]) => (
          <div key={u} className="flex flex-wrap items-center gap-3 px-5 py-3">
            <div className="min-w-0 flex-1 text-xs text-muted-foreground" dir="ltr">تمت إعادة التعيين: {u}</div>
            <span className="flex items-center gap-1.5 rounded-lg border bg-success/5 px-3 py-1.5 font-mono text-sm font-bold text-success" dir="ltr">{p}
              <button onClick={() => copy(p)}><Copy className="h-3.5 w-3.5" /></button></span>
          </div>
        ))}
      </div>
      <p className="px-5 py-2 text-[11px] text-muted-foreground">تُعيَّن كلمة مرور مؤقتة تُسلَّم للمستخدم، ويُطلب منه تغييرها عند أول دخول.</p>
    </div>
  );
}

function SchoolEditModal({ school, onClose, onSave }: {
  school: PlatformSchool;
  onClose: () => void;
  onSave: (patch: { name?: string; city?: string; address?: string; email?: string; phone?: string; stage?: string }) => void;
}) {
  const [name, setName] = useState(school.name);
  const [city, setCity] = useState(school.city === "—" ? "" : school.city);
  const [stage, setStage] = useState(school.stage || "الثانوية");
  const [address, setAddress] = useState(school.address || "");
  const [email, setEmail] = useState(school.email || "");
  const [phone, setPhone] = useState(school.phone || "");
  const inp = "w-full rounded-lg border bg-background px-3 h-11 text-sm outline-none focus:border-brand";
  // بيانات دخول مدير المدرسة (اسم مستخدم/كلمة مرور — تعديل مرة واحدة)
  const { toast } = useSlis();
  const [acc, setAcc] = useState<{ username: string; username_locked: boolean } | null>(null);
  const [newUser, setNewUser] = useState(""); const [newPass, setNewPass] = useState("");
  const [savingCred, setSavingCred] = useState(false);
  useEffect(() => { fetchSchoolAccount(school.id).then(setAcc).catch(() => {}); }, [school.id]);
  const saveCred = async () => {
    if (newUser.trim().length < 3 || newPass.length < 6) { toast("اسم المستخدم (٣ أحرف) وكلمة المرور (٦ أحرف) مطلوبة", "danger"); return; }
    setSavingCred(true);
    try {
      await setSchoolCredentials(school.id, newUser.trim(), newPass);
      toast("حُفظت بيانات الدخول — تُسلَّم للمدرسة (لا يمكن تعديلها مجددًا)");
      setAcc({ username: newUser.trim().toLowerCase(), username_locked: true });
      setNewUser(""); setNewPass("");
    } catch (e: any) { toast(`تعذّر: ${e.message || e}`, "danger"); }
    finally { setSavingCred(false); }
  };
  const STAGES = ["الابتدائية", "المتوسطة", "الثانوية"];
  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-auto bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl border bg-card p-5 shadow-xl" onClick={(e) => e.stopPropagation()} dir="rtl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-extrabold">تعديل معلومات المدرسة</h3>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-accent"><X className="h-4 w-4" /></button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">اسم المدرسة</label>
            <input className={inp} value={name} onChange={(e) => setName(e.target.value)} placeholder="اسم المدرسة" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">المدينة</label>
            <input className={inp} value={city} onChange={(e) => setCity(e.target.value)} placeholder="المدينة" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">المرحلة</label>
            <select className={inp} value={stage} onChange={(e) => setStage(e.target.value)}>
              {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">العنوان التفصيلي</label>
            <input className={inp} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="الحي، الشارع…" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">البريد الإلكتروني</label>
            <input className={inp} dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="school@example.com" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">رقم التواصل</label>
            <input className={inp} dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="05xxxxxxxx" />
          </div>
        </div>

        {/* بيانات الدخول: تعديل اسم المستخدم/كلمة المرور مرة واحدة */}
        <div className="mt-4 rounded-xl border bg-muted/20 p-3">
          <div className="mb-2 flex items-center gap-2 text-sm font-bold"><KeyRound className="h-4 w-4 text-brand" /> بيانات دخول مدير المدرسة</div>
          <div className="mb-2 text-xs text-muted-foreground">اسم المستخدم الحالي: <span className="font-mono font-semibold text-foreground" dir="ltr">{acc?.username || "…"}</span></div>
          {acc?.username_locked ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2 text-[12px] text-amber-800">تم تعديل بيانات الدخول مسبقًا (مرة واحدة فقط). لإعادة تعيين كلمة المرور فقط استخدم قسم «طلبات إعادة التعيين».</div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              <div><label className="mb-1 block text-xs font-semibold text-muted-foreground">اسم المستخدم الجديد</label>
                <input className={inp} dir="ltr" value={newUser} onChange={(e) => setNewUser(e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ""))} placeholder="username" /></div>
              <div><label className="mb-1 block text-xs font-semibold text-muted-foreground">كلمة المرور الجديدة</label>
                <input className={inp} dir="ltr" value={newPass} onChange={(e) => setNewPass(e.target.value)} placeholder="٦ أحرف فأكثر" /></div>
              <div className="sm:col-span-2 flex items-center justify-between gap-2">
                <p className="text-[11px] text-muted-foreground">يُلغى استخدام البريد كاسم مستخدم. لا يمكن التعديل إلا مرة واحدة.</p>
                <button onClick={saveCred} disabled={savingCred || newUser.trim().length < 3 || newPass.length < 6}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-brand px-4 h-9 text-sm font-semibold text-white hover:bg-brand/90 disabled:opacity-50">
                  {savingCred ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />} حفظ بيانات الدخول
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border px-4 h-10 text-sm font-semibold hover:bg-accent">إلغاء</button>
          <button
            disabled={name.trim().length < 2}
            onClick={() => onSave({ name: name.trim(), city: city.trim(), stage, address: address.trim(), email: email.trim(), phone: phone.trim() })}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-5 h-10 text-sm font-semibold text-white hover:bg-brand/90 disabled:opacity-50">
            حفظ التعديلات
          </button>
        </div>
      </div>
    </div>
  );
}
