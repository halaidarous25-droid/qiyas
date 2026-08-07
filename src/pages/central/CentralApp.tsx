import { Pill, Meter, En } from "@/components/common";
import {
  PLATFORM_SCHOOLS, SCHOOL_STATUS, PLATFORM_KPI as K, ONBOARDING_STEPS,
  APPEALS, APPEAL_TRACK,
} from "@/data/mock";
import { badgeTone, type Tone } from "@/lib/tone";
import { cn } from "@/lib/utils";
import { useSlis } from "@/store";
import {
  Building2, ShieldCheck, Scale, TrendingUp, School, CheckCircle2,
  Server, ListChecks, Globe,
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

export function CentralApp() {
  const { toast } = useSlis();
  const escalated = APPEALS.filter((a) => a.track !== "A");
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-brand text-white">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 h-16">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/15"><Server className="h-5 w-5" /></div>
          <div className="leading-tight">
            <div className="font-display font-extrabold text-[15px]">لوحة النظام المركزي — SLIS</div>
            <div className="text-[11px] text-white/75">مزوّد الخدمة · حوكمة المنصة بالكامل</div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-5 p-4 md:p-8 soft-grid">
        {/* مؤشرات المنصة */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi icon={School} tone="brand" label="المدارس المشتركة" value={String(K.schools)} sub={`${K.active} نشطة`} />
          <Kpi icon={Scale} tone="warning" label="نزاعات مُصعّدة" value={String(K.disputesOpen)} sub="مسارات ب/ج" />
          <Kpi icon={ShieldCheck} tone="success" label="الامتثال للبيانات" value={`${K.dataCompliance}%`} sub="مراجعة فصلية" />
          <Kpi icon={TrendingUp} tone="info" label="معدّل التجديد" value={`${K.renewalRate}%`} sub="سنوي" />
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {/* المدارس */}
          <div className="lg:col-span-2 rounded-xl border bg-card">
            <div className="flex items-center justify-between border-b px-5 py-3.5">
              <div className="flex items-center gap-2"><Building2 className="h-[18px] w-[18px] text-brand" />
                <h2 className="font-display font-bold">المدارس على المنصة</h2></div>
              <button onClick={() => toast("فُتح نموذج طلب انضمام مدرسة جديدة", "info")}
                className="rounded-lg bg-brand px-3 h-9 text-sm font-semibold text-white hover:bg-brand/90">+ قبول مدرسة</button>
            </div>
            <div className="divide-y">
              {PLATFORM_SCHOOLS.map((s) => {
                const st = SCHOOL_STATUS[s.status];
                return (
                  <div key={s.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="grid h-10 w-10 place-items-center rounded-lg bg-brand/8 text-brand"><School className="h-5 w-5" /></div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-[15px]">{s.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {s.city} · <En>{s.students}</En> طالب · خطة {s.plan}
                      </div>
                    </div>
                    <div className="text-left">
                      <Pill tone={st.tone as Tone}>{st.label}</Pill>
                      <div className="mt-1 text-[11px] text-muted-foreground">{s.note}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* النزاعات المصعّدة */}
          <div className="rounded-xl border bg-card">
            <div className="border-b px-5 py-3.5">
              <div className="flex items-center gap-2"><Scale className="h-[18px] w-[18px] text-brand" />
                <h2 className="font-display font-bold text-[15px]">نزاعات مُصعّدة إليك</h2></div>
            </div>
            <div className="space-y-2 p-3">
              {escalated.map((a) => {
                const t = APPEAL_TRACK[a.track];
                return (
                  <div key={a.id} className="rounded-lg border p-3">
                    <Pill tone={t.tone as Tone}>المسار {a.track}</Pill>
                    <p className="mt-1.5 text-[13px] font-medium">{a.subject}</p>
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      <En>{a.daysElapsed}/{a.slaMax}</En> يوم · {t.decider}
                    </div>
                  </div>
                );
              })}
              {escalated.length === 0 && <p className="p-3 text-sm text-muted-foreground">لا نزاعات مُصعّدة حاليًا.</p>}
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
            <h2 className="font-display font-bold">مؤشرات أداء المنصة (مستقلة عن الطلاب)</h2></div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { l:"الامتثال لسياسة البيانات", v:K.dataCompliance, target:"≥ ٩٠٪", tone:"success" as Tone },
              { l:"رضا المدارس", v:K.satisfaction, target:"≥ ٨٠٪", tone:"brand" as Tone },
              { l:"معدّل تجديد الاشتراك", v:K.renewalRate, target:"≥ ٧٠٪", tone:"info" as Tone },
            ].map((m) => (
              <div key={m.l} className="rounded-lg border p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-foreground/80">{m.l}</span>
                  <CheckCircle2 className="h-4 w-4 text-success" />
                </div>
                <div className="mt-1 font-display text-2xl font-extrabold"><En>{m.v}%</En></div>
                <Meter value={m.v} tone={m.tone} className="mt-1.5" />
                <div className="mt-1 text-[11px] text-muted-foreground">الهدف: {m.target}</div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
