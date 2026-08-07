import { Pill, Meter, Avatar, En } from "@/components/common";
import { SUBSCRIPTION as S, INST_PLANS } from "@/data/mock";
import { useSlis } from "@/store";
import { type Tone } from "@/lib/tone";
import { cn } from "@/lib/utils";
import {
  Wallet, CalendarClock, TrendingUp, AlertTriangle, Check, X,
  Sparkles, ArrowUpRight, RefreshCw, Package,
} from "lucide-react";

const totalAlloc = S.buckets.mission.alloc + S.buckets.individual.alloc + S.buckets.buffer.alloc;
const totalUsed = S.buckets.mission.used + S.buckets.individual.used + S.buckets.buffer.used;

// توقّع تاريخ النفاد من متوسط آخر أسبوعين
function forecastWeeks() {
  const last = S.weekly.slice(-2);
  const rate = last.reduce((a, b) => a + b, 0) / last.length;
  const remaining = totalAlloc - totalUsed;
  return rate > 0 ? Math.max(1, Math.round(remaining / rate)) : 99;
}

function Bucket({ label, used, alloc, tone, protectedNote }:
  { label: string; used: number; alloc: number; tone: Tone; protectedNote?: string }) {
  const remainingPct = alloc ? ((alloc - used) / alloc) * 100 : 100;
  const low = remainingPct <= S.alertAt;
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-sm">{label}</span>
        {low && <Pill tone="warning"><AlertTriangle className="h-3 w-3" /> منخفض</Pill>}
        {protectedNote && !low && <Pill tone="muted">{protectedNote}</Pill>}
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="font-display text-2xl font-extrabold"><En>{used}</En></span>
        <span className="text-sm text-muted-foreground">/ <En>{alloc}</En> مُستهلَك</span>
      </div>
      <Meter value={alloc ? (used / alloc) * 100 : 0} tone={low ? "warning" : tone} className="mt-2" />
      <div className="mt-1.5 text-[11px] text-muted-foreground">
        المتبقّي <En>{alloc - used}</En> اختبار
      </div>
    </div>
  );
}

export function Quota() {
  const { indReqs, resolveIndReq, toast } = useSlis();
  const weeksLeft = forecastWeeks();
  const maxW = Math.max(...S.weekly);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-extrabold">حصص الاختبارات والاشتراك</h1>
        <p className="text-sm text-muted-foreground">
          كل اختبار مكتمل يخصم وحدة من رصيده. الحصة المهمّية محميّة ولا تُستهلك من الطلبات الفردية.
        </p>
      </div>

      {/* بطاقة الخطة */}
      <div className="overflow-hidden rounded-2xl border bg-gradient-to-tl from-brand to-brand-soft text-white">
        <div className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <div className="flex items-center gap-2 text-sm text-white/80"><Package className="h-4 w-4" /> الخطة الحالية</div>
            <div className="mt-1 font-display text-2xl font-extrabold">خطة {S.plan}</div>
            <div className="text-sm text-white/85"><En>{S.planQuota}</En> اختبار/سنة · <En>{S.priceSAR.toLocaleString()}</En> ريال</div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="flex items-center gap-1 text-white/80 text-xs"><CalendarClock className="h-3.5 w-3.5" /> يتجدّد خلال</div>
              <div className="font-display text-2xl font-extrabold"><En>{S.daysLeft}</En> يوم</div>
              <div className="text-[11px] text-white/70"><En>{S.renewsAt}</En></div>
            </div>
            <button onClick={() => toast("فُتحت خيارات ترقية الخطة", "info")}
              className="flex items-center gap-1.5 rounded-xl bg-white px-4 h-11 font-bold text-brand hover:bg-white/90">
              <ArrowUpRight className="h-4 w-4" /> ترقية الخطة
            </button>
          </div>
        </div>
        <div className="border-t border-white/15 px-5 py-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/85">إجمالي الاستهلاك</span>
            <span className="font-bold"><En>{totalUsed}/{totalAlloc}</En></span>
          </div>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/20">
            <div className="h-full rounded-full bg-white" style={{ width: `${(totalUsed / totalAlloc) * 100}%` }} />
          </div>
        </div>
      </div>

      {/* تقسيم الرصيد */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Bucket label="حصة المهام" used={S.buckets.mission.used} alloc={S.buckets.mission.alloc} tone="brand" protectedNote="محميّة" />
        <Bucket label="الاختبارات الفردية" used={S.buckets.individual.used} alloc={S.buckets.individual.alloc} tone="gold" />
        <Bucket label="الرصيد المرن (بوفر)" used={S.buckets.buffer.used} alloc={S.buckets.buffer.alloc} tone="info" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* الاستهلاك الأسبوعي + التوقع */}
        <div className="lg:col-span-2 rounded-xl border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2"><TrendingUp className="h-[18px] w-[18px] text-brand" />
              <h2 className="font-display font-bold">الاستهلاك الأسبوعي</h2></div>
            <Pill tone={weeksLeft <= 3 ? "danger" : "muted"}>
              <CalendarClock className="h-3 w-3" /> يكفي ~<En>{weeksLeft}</En> أسابيع بالمعدّل الحالي
            </Pill>
          </div>
          <div className="flex items-end justify-between gap-2 h-40 border-b border-border pb-0">
            {S.weekly.map((v, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                <span className="text-xs font-bold text-brand"><En>{v}</En></span>
                <div className="w-full rounded-t-md bg-gradient-to-t from-brand to-brand-soft transition-all"
                  style={{ height: `${(v / maxW) * 120}px` }} />
                <span className="text-[11px] text-muted-foreground">أ<En>{i + 1}</En></span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            ارتفاع الاستهلاك مؤشر إيجابي على استخدام فعلي للبرنامج — ويرفع احتمال التجديد بخطة أعلى.
          </p>
        </div>

        {/* طلبات الاختبار الفردي */}
        <div className="rounded-xl border bg-card">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="font-display font-bold text-[15px]">طلبات فردية معلّقة</h2>
            <Pill tone="warning"><En>{indReqs.length}</En></Pill>
          </div>
          {indReqs.length === 0 && (
            <div className="p-6 text-center text-sm text-muted-foreground">لا طلبات معلّقة حاليًا ✓</div>
          )}
          <div className="divide-y">
            {indReqs.map((r) => (
              <div key={r.id} className="p-3">
                <div className="flex items-center gap-2.5">
                  <Avatar name={r.student} color={r.color} size={34} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{r.student}</div>
                    <div className="text-[11px] text-muted-foreground">{r.grade} · {r.purpose}</div>
                  </div>
                </div>
                <div className="mt-2 flex gap-2">
                  <button onClick={() => resolveIndReq(r.id, true, r.student)}
                    className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-success/12 text-success border border-success/30 h-8 text-xs font-semibold hover:bg-success/20">
                    <Check className="h-3.5 w-3.5" /> موافقة
                  </button>
                  <button onClick={() => resolveIndReq(r.id, false, r.student)}
                    className="flex flex-1 items-center justify-center gap-1 rounded-lg border h-8 text-xs font-semibold text-muted-foreground hover:bg-accent">
                    <X className="h-3.5 w-3.5" /> رفض
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* مرجع الخطط + خيارات */}
      <div className="rounded-xl border bg-card p-5">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-[18px] w-[18px] text-gold" />
          <h2 className="font-display font-bold">خطط الجهات (بعدد الاختبارات)</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {INST_PLANS.map((p) => (
            <div key={p.name} className={cn("rounded-xl border p-4",
              p.current ? "border-brand ring-1 ring-brand bg-brand/5" : "")}>
              <div className="flex items-center justify-between">
                <span className="font-display font-bold">{p.name}</span>
                {p.current && <Pill tone="brand">الحالية</Pill>}
              </div>
              <div className="mt-2 font-display text-2xl font-extrabold text-brand">
                <En>{p.price.toLocaleString()}</En> <span className="text-sm font-normal text-muted-foreground">ريال</span>
              </div>
              <div className="text-sm text-foreground/80">{p.tests ? <><En>{p.tests}</En> اختبار/سنة</> : "غير محدود"}</div>
              <div className="mt-1 text-[11px] text-muted-foreground">{p.note}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-[12px]">
          <span className="flex items-center gap-1.5 rounded-lg border bg-muted/40 px-3 py-1.5">
            <ArrowUpRight className="h-3.5 w-3.5 text-brand" /> الاختبار الإضافي (Overage): <En>{S.overagePriceSAR}</En> ريال
          </span>
          <span className="flex items-center gap-1.5 rounded-lg border bg-muted/40 px-3 py-1.5">
            <RefreshCw className="h-3.5 w-3.5 text-brand" /> ترحيل حتى <En>{S.rolloverPct}%</En> للسنة التالية
          </span>
          <span className="flex items-center gap-1.5 rounded-lg border bg-muted/40 px-3 py-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-warning" /> تنبيه عند <En>{S.alertAt}%</En> متبقٍّ لكل حصة
          </span>
        </div>
      </div>
    </div>
  );
}
