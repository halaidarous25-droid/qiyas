import { useState } from "react";
import { Pill, Meter, En } from "@/components/common";
import {
  PLATFORM_SCHOOLS, SCHOOL_STATUS, PLATFORM_KPI, ONBOARDING_STEPS,
  APPEALS, APPEAL_TRACK, type PlatformSchool, type Appeal,
} from "@/data/mock";
import type { CentralSeed } from "@/lib/live";
import { CentralQuestions } from "./CentralQuestions";
import { CentralPermissions } from "./CentralPermissions";
import { badgeTone, type Tone } from "@/lib/tone";
import { cn } from "@/lib/utils";
import { useSlis } from "@/store";
import {
  Building2, ShieldCheck, Scale, TrendingUp, School, CheckCircle2,
  Server, ListChecks, Globe, ClipboardCheck, Gavel, Hourglass, Pencil, X,
} from "lucide-react";

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

export function CentralApp({ data, userName, onResolveAppeal, onReviewAppeal, onSetSchoolStatus, onUpdateSchool }: {
  data?: CentralSeed;
  userName?: string;
  onResolveAppeal?: (id: string) => void;
  onReviewAppeal?: (id: string) => void;
  onSetSchoolStatus?: (schoolId: string, status: string) => void;
  onUpdateSchool?: (schoolId: string, patch: { name?: string; city?: string }) => void;
} = {}) {
  const { toast } = useSlis();
  const live = !!data;
  const [view, setView] = useState<"dashboard" | "questions" | "permissions">("dashboard");
  const [editSchool, setEditSchool] = useState<PlatformSchool | null>(null);

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
            <button onClick={() => setView("permissions")}
              className={cn("rounded-lg px-3 h-9 text-xs font-semibold", view === "permissions" ? "bg-white text-brand" : "bg-white/15 text-white hover:bg-white/25")}>
              الصلاحيات
            </button>
          </div>
        </div>
      </header>

      {view === "questions" && <CentralQuestions />}
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
              <button onClick={() => toast("قبول مدرسة جديدة يتم عبر إنشاء حساب المدرسة وربطه بمشرف", "info")}
                className="rounded-lg bg-brand px-3 h-9 text-sm font-semibold text-white hover:bg-brand/90">+ قبول مدرسة</button>
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

      {editSchool && onUpdateSchool && (
        <SchoolEditModal
          school={editSchool}
          onClose={() => setEditSchool(null)}
          onSave={(patch) => { onUpdateSchool(editSchool.id, patch); setEditSchool(null); }}
        />
      )}
    </div>
  );
}

function SchoolEditModal({ school, onClose, onSave }: {
  school: PlatformSchool;
  onClose: () => void;
  onSave: (patch: { name?: string; city?: string }) => void;
}) {
  const [name, setName] = useState(school.name);
  const [city, setCity] = useState(school.city);
  const inp = "w-full rounded-lg border bg-background px-3 h-11 text-sm outline-none focus:border-brand";
  const changed = name.trim() !== school.name || city.trim() !== school.city;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border bg-card p-5 shadow-xl" onClick={(e) => e.stopPropagation()} dir="rtl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-extrabold">تعديل معلومات المدرسة</h3>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-accent"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">اسم المدرسة</label>
            <input className={inp} value={name} onChange={(e) => setName(e.target.value)} placeholder="اسم المدرسة" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">المدينة</label>
            <input className={inp} value={city} onChange={(e) => setCity(e.target.value)} placeholder="المدينة" />
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border px-4 h-10 text-sm font-semibold hover:bg-accent">إلغاء</button>
          <button
            disabled={!changed || name.trim().length < 2}
            onClick={() => onSave({ name: name.trim(), city: city.trim() })}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-5 h-10 text-sm font-semibold text-white hover:bg-brand/90 disabled:opacity-50">
            حفظ التعديلات
          </button>
        </div>
      </div>
    </div>
  );
}
