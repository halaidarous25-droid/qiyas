import { Pill, Avatar, Meter, En } from "@/components/common";
import { APPEALS, APPEAL_TRACK, RACI, GOV_LEVELS, type Appeal } from "@/data/mock";
import { useSlis } from "@/store";
import { type Tone } from "@/lib/tone";
import { cn } from "@/lib/utils";
import { ShieldCheck, Scale, Clock, Layers, ArrowUpRight, Gavel } from "lucide-react";

function AppealCard({ a }: { a: Appeal }) {
  const { toast } = useSlis();
  const t = APPEAL_TRACK[a.track];
  const pct = (a.daysElapsed / a.slaMax) * 100;
  const late = pct >= 80;
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-start gap-3">
        <Avatar name={a.student} color={a.color} size={40} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{a.student}</span>
            <Pill tone={t.tone as Tone}>المسار {a.track} · {t.label}</Pill>
            {a.status === "new" && <Pill tone="danger">جديد</Pill>}
          </div>
          <p className="mt-1 text-sm text-foreground/85">{a.subject}</p>
          <div className="mt-2 grid grid-cols-[1fr_auto] items-center gap-2">
            <Meter value={pct} tone={late ? "danger" : pct >= 50 ? "warning" : "success"} />
            <span className={cn("flex items-center gap-1 text-xs font-semibold", late ? "text-danger" : "text-muted-foreground")}>
              <Clock className="h-3.5 w-3.5" /> <En>{a.daysElapsed}/{a.slaMax}</En> يوم
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>الجهة الفاصلة: {a.decider}</span>
            <button onClick={() => toast(`فُتح ملف تظلّم ${a.student}`, "info")}
              className="font-semibold text-brand hover:underline">فتح الملف</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Governance() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-extrabold">الحوكمة والتظلّمات</h1>
        <p className="text-sm text-muted-foreground">
          كل قرار يمسّ فرص الطالب له حق اعتراض رسمي — نظام التظلّم ضرورة إدارية وقانونية لا خيار.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* صندوق التظلّمات */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center gap-2">
            <Scale className="h-[18px] w-[18px] text-brand" />
            <h2 className="font-display font-bold">صندوق التظلّمات</h2>
            <Pill tone="warning" className="mr-auto"><En>{APPEALS.length}</En> نشطة</Pill>
          </div>
          {APPEALS.map((a) => <AppealCard key={a.id} a={a} />)}

          {/* مسارات التظلّم */}
          <div className="rounded-xl border bg-card p-4">
            <div className="mb-3 flex items-center gap-2"><Gavel className="h-[18px] w-[18px] text-brand" />
              <h3 className="font-display font-bold">مسارات التظلّم الثلاثة</h3></div>
            <div className="grid gap-2 sm:grid-cols-3">
              {(["A","B","C"] as const).map((k) => {
                const t = APPEAL_TRACK[k];
                return (
                  <div key={k} className="rounded-lg border p-3">
                    <Pill tone={t.tone as Tone}>المسار {k}</Pill>
                    <div className="mt-1.5 text-sm font-semibold">{t.label}</div>
                    <div className="text-[11px] text-muted-foreground">{t.decider}</div>
                    <div className="mt-1 text-[11px] text-muted-foreground">المهلة: <En>{t.sla}</En> أيام</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* الجانب المرجعي */}
        <div className="space-y-5">
          {/* مستويات الحوكمة */}
          <div className="rounded-xl border bg-card p-5">
            <div className="mb-3 flex items-center gap-2"><Layers className="h-[18px] w-[18px] text-brand" />
              <h3 className="font-display font-bold">مستويات الحوكمة</h3></div>
            <div className="space-y-2.5">
              {GOV_LEVELS.map((l, i) => (
                <div key={i} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-brand">{l.level}</span>
                    <span className="text-[11px] text-muted-foreground">{l.scope}</span>
                  </div>
                  <p className="mt-1 text-[11px] leading-5 text-muted-foreground">{l.resp}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-brand/25 bg-brand/5 p-4">
            <div className="flex items-center gap-2 text-brand"><ShieldCheck className="h-[18px] w-[18px]" />
              <span className="font-display font-bold">قاعدة إلزامية</span></div>
            <p className="mt-1 text-[13px] text-foreground/85">
              لا يُحرَم طالب من فرصة قيادية دون نتيجة اختبار معتمدة، وكل قرار رفض يحمل مسوّغًا موثّقًا.
            </p>
          </div>
        </div>
      </div>

      {/* مصفوفة RACI */}
      <div className="rounded-xl border bg-card p-5">
        <div className="mb-3 flex items-center gap-2"><ArrowUpRight className="h-[18px] w-[18px] text-brand" />
          <h2 className="font-display font-bold">مصفوفة المساءلة (RACI)</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="border bg-muted/40 p-2.5 text-right font-semibold">العملية</th>
                {RACI.cols.map((c) => <th key={c} className="border bg-muted/40 p-2.5 text-center font-semibold text-xs">{c}</th>)}
              </tr>
            </thead>
            <tbody>
              {RACI.rows.map((r) => (
                <tr key={r.p}>
                  <td className="border p-2.5 font-medium">{r.p}</td>
                  {r.v.map((v, i) => (
                    <td key={i} className="border p-2 text-center">
                      {v === "م" ? <Pill tone="success">م</Pill> :
                       v === "ر" ? <Pill tone="info">ر</Pill> :
                       v === "–" ? <span className="text-muted-foreground">–</span> :
                       <span className="text-xs text-muted-foreground">{v}</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-2 flex gap-3 text-[11px] text-muted-foreground">
          <span><Pill tone="success">م</Pill> مسؤول مباشر</span>
          <span><Pill tone="info">ر</Pill> راجع ومعتمد</span>
          <span>– غير مُشارك</span>
        </div>
      </div>
    </div>
  );
}
