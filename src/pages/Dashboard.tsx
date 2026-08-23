import { Pill, Meter, En } from "@/components/common";
import { AXES, TRUST_META, type Trust } from "@/data/mock";
import { useSlis } from "@/store";
import { badgeTone, type Tone } from "@/lib/tone";
import { cn } from "@/lib/utils";
import {
  Users, Target, ClipboardList, AlertTriangle, Wallet,
  TrendingUp, ArrowLeft, Info,
} from "lucide-react";

function Kpi({ icon: Icon, label, value, sub, tone }:
  { icon: any; label: string; value: string; sub: string; tone: Tone }) {
  return (
    <div className="kpi-tile">
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

export function Dashboard({ onOpenMissions }: { onOpenMissions: () => void }) {
  const { missions, students, assigned, subscription } = useSlis();
  const activeMissions = missions.filter((m) => ["open", "screening"].includes(m.status)).length;
  const assessedStudents = students.filter((c) => c.assessed);
  const total = assessedStudents.length || 1;
  // متوسطات المدرسة على المحاور الخمسة (للمُقيَّمين فقط)
  const axisAvg = AXES.map((a) => ({
    ...a,
    val: Math.round(assessedStudents.reduce((s, c) => s + c.axes[a.key], 0) / total),
  }));
  const trustDist = (["trusted", "reserved", "interview"] as Trust[]).map((t) => ({
    t, n: assessedStudents.filter((c) => c.trust === t).length,
  }));

  // ===== بيانات حيّة للتنبيهات والمؤشرات =====
  // مرشّحون بانتظار قرار: مرشّح غير مكلّف في مهمة ما زالت مقاعدها متاحة
  const pendingDecisions = missions.reduce((n, m) => {
    const asg = assigned[m.id] || [];
    if (asg.length >= m.seats) return n;
    return n + m.candidateIds.filter((id) => !asg.includes(id)).length;
  }, 0);

  // تعارض: طالب مكلّف بأكثر من مهمة في آنٍ واحد
  const asgCount: Record<string, number> = {};
  Object.values(assigned).forEach((ids) => ids.forEach((id) => (asgCount[id] = (asgCount[id] || 0) + 1)));
  const conflictStudents = students.filter((s) => (asgCount[s.id] || 0) > 1);

  // مهام لم يكتمل اختبار مرشّحيها
  const incompleteMissions = missions
    .map((m) => ({ m, pending: m.candidateIds.filter((id) => { const st = students.find((x) => x.id === id); return st && !st.assessed; }).length }))
    .filter((x) => x.pending > 0);

  // ملفات تستوجب مقابلة
  const interviewStudents = assessedStudents.filter((c) => c.trust === "interview");

  // الحصص من الاشتراك الحيّ
  const b = subscription?.buckets;
  const qUsed = b ? b.mission.used + b.individual.used + b.buffer.used : 0;
  const qTotal = b ? b.mission.alloc + b.individual.alloc + b.buffer.alloc : 0;
  const qPct = qTotal > 0 ? Math.round((qUsed / qTotal) * 100) : 0;

  // بناء قائمة التنبيهات ديناميكيًا
  type DashAlert = { id: string; kind: "danger" | "warning" | "info"; text: string };
  const alerts: DashAlert[] = [];
  conflictStudents.forEach((s) => alerts.push({ id: `c${s.id}`, kind: "danger", text: `تعارض: «${s.name}» مكلّف بأكثر من مهمة في آنٍ واحد.` }));
  incompleteMissions.forEach(({ m, pending }) => alerts.push({ id: `m${m.id}`, kind: "warning", text: `مهمة «${m.title}»: لم يكتمل اختبار ${pending} مرشّح بعد.` }));
  interviewStudents.forEach((s) => alerts.push({ id: `i${s.id}`, kind: "warning", text: `ملف «${s.name}» يستوجب تحفّظًا — يُنصح بمقابلة قبل الاعتماد.` }));
  if (qTotal > 0) alerts.push({ id: "quota", kind: "info", text: `حصة الاختبارات بلغت ${qPct}٪ من المخصّص لها.` });
  const criticalCount = conflictStudents.length + interviewStudents.length;

  return (
    <div className="space-y-5">
      {/* ترويسة */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold">لوحة المدرسة</h1>
          <p className="text-sm text-muted-foreground">
            نظرة عامة على المهام القيادية وملفات الطلاب والتنبيهات الحرجة.
          </p>
        </div>
      </div>

      {/* مؤشرات */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={Users} tone="brand" label="إجمالي الطلاب" value={String(students.length)}
             sub={`${assessedStudents.length} أدّوا المقياس`} />
        <Kpi icon={Target} tone="info" label="المهام النشطة" value={String(activeMissions)}
             sub="مفتوحة / قيد الفرز" />
        <Kpi icon={ClipboardList} tone="warning" label="بانتظار الفرز" value={String(pendingDecisions)}
             sub="مرشّحون يحتاجون قرارًا" />
        <Kpi icon={AlertTriangle} tone="danger" label="تنبيهات حرجة" value={String(criticalCount)}
             sub="تعارض + ملف يستوجب مقابلة" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* المهام الأخيرة */}
        <div className="lg:col-span-2 rounded-xl border bg-card">
          <div className="flex items-center justify-between border-b px-5 py-3.5">
            <h2 className="font-display font-bold">أحدث المهام القيادية</h2>
            <button onClick={onOpenMissions}
              className="flex items-center gap-1 text-sm font-semibold text-brand hover:underline">
              عرض الكل <ArrowLeft className="h-4 w-4" />
            </button>
          </div>
          <div className="divide-y">
            {missions.slice(0, 4).map((m) => (
              <div key={m.id} className="flex items-center gap-3 px-5 py-3">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand/8 text-brand">
                  <Target className="h-[18px] w-[18px]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold text-[15px]">{m.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {m.scopeLabel} · <En>{m.applicants}</En> متقدّم
                  </div>
                </div>
                <Pill tone={m.hasConflict ? "danger" : "muted"}>
                  {m.hasConflict ? "تعارض" : `${m.seats} مقعد`}
                </Pill>
              </div>
            ))}
          </div>
        </div>

        {/* التنبيهات */}
        <div className="rounded-xl border bg-card">
          <div className="border-b px-5 py-3.5">
            <h2 className="font-display font-bold">التنبيهات</h2>
          </div>
          <div className="space-y-2.5 p-4">
            {alerts.length === 0 && (
              <div className="rounded-lg border border-dashed p-4 text-center text-[13px] text-muted-foreground">لا تنبيهات حالية — كل شيء على ما يُرام.</div>
            )}
            {alerts.map((a) => {
              const tone = (a.kind === "danger" ? "danger" : a.kind === "warning" ? "warning" : "info") as Tone;
              const Icon = a.kind === "info" ? Info : AlertTriangle;
              return (
                <div key={a.id} className={cn("flex gap-2.5 rounded-lg border p-2.5 text-[13px] leading-5", badgeTone[tone])}>
                  <Icon className="h-4 w-4 shrink-0 mt-0.5" />
                  <span className="text-foreground/90">{a.text}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* متوسط المحاور */}
        <div className="lg:col-span-2 rounded-xl border bg-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-[18px] w-[18px] text-brand" />
            <h2 className="font-display font-bold">متوسط الكفايات القيادية على مستوى المدرسة</h2>
          </div>
          <div className="space-y-3.5">
            {axisAvg.map((a) => (
              <div key={a.key} className="grid grid-cols-[110px_1fr_44px] items-center gap-3">
                <span className="text-sm text-foreground/80">{a.label}</span>
                <Meter value={a.val} tone={a.val >= 82 ? "success" : a.val >= 72 ? "brand" : "warning"} />
                <span className="text-sm font-bold tabular-nums text-left"><En>{a.val}%</En></span>
              </div>
            ))}
          </div>
        </div>

        {/* توزيع الموثوقية + الحصص */}
        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-5">
            <h2 className="mb-3 font-display font-bold">موثوقية الملفات</h2>
            <div className="space-y-2">
              {trustDist.map(({ t, n }) => {
                const meta = TRUST_META[t];
                return (
                  <div key={t} className="flex items-center gap-2">
                    <Pill tone={meta.tone as Tone} className="w-32 justify-center">{meta.label}</Pill>
                    <Meter value={(n / total) * 100} tone={meta.tone as Tone} />
                    <span className="w-6 text-left text-sm font-bold"><En>{n}</En></span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border bg-card p-5">
            <div className="mb-2 flex items-center gap-2">
              <Wallet className="h-[18px] w-[18px] text-gold" />
              <h2 className="font-display font-bold">حصة الاختبارات</h2>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="font-display text-2xl font-extrabold"><En>{qUsed}/{qTotal}</En></span>
              <span className="text-xs text-muted-foreground">مُستهلَك من الرصيد</span>
            </div>
            <Meter value={qPct} tone="gold" className="mt-2" />
            {b ? (
              <div className="mt-2 text-[11px] text-muted-foreground">
                مهمّية <En>{b.mission.used}/{b.mission.alloc}</En> · فردية <En>{b.individual.used}/{b.individual.alloc}</En>
              </div>
            ) : (
              <div className="mt-2 text-[11px] text-muted-foreground">لا توجد بيانات اشتراك بعد.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
