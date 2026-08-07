import { Pill, Meter, En } from "@/components/common";
import { AXES, STATUS_META, type Mission, type Candidate } from "@/data/mock";
import { leadershipStyle } from "@/lib/scoring";
import { useSlis } from "@/store";
import { matchTone, type Tone } from "@/lib/tone";
import { cn } from "@/lib/utils";
import { BarChart3, PieChart, Target, FileText, Layers, TrendingUp } from "lucide-react";

const STYLE_COLORS = ["hsl(191 72% 30%)", "hsl(36 55% 47%)", "hsl(152 46% 40%)", "hsl(205 70% 45%)", "hsl(280 40% 55%)", "hsl(15 65% 55%)"];

function candidateStyle(c: Candidate) {
  const top = [...AXES].sort((a, b) => c.axes[b.key] - c.axes[a.key]).slice(0, 2).map((a) => a.key);
  return leadershipStyle(top).name;
}

export function Reports() {
  const { toast, missions, students, rankMission } = useSlis();
  const assessed = students.filter((c) => c.assessed);

  const missionReadiness = (m: Mission) => {
    const r = rankMission(m);
    const avg = r.length ? Math.round(r.reduce((s, c) => s + c.match, 0) / r.length) : 0;
    const filled = Math.min(m.seats, r.length);
    return { avg, filled, count: r.length };
  };

  // توزيع الأنماط
  const styleCount: Record<string, number> = {};
  assessed.forEach((c) => { const s = candidateStyle(c); styleCount[s] = (styleCount[s] || 0) + 1; });
  const styles = Object.entries(styleCount).sort((a, b) => b[1] - a[1]);
  const total = assessed.length || 1;
  // conic gradient
  let acc = 0;
  const segments = styles.map(([name, n], i) => {
    const start = (acc / total) * 360; acc += n;
    const end = (acc / total) * 360;
    return `${STYLE_COLORS[i % STYLE_COLORS.length]} ${start}deg ${end}deg`;
  }).join(", ");

  // توزيع الفرص بالنطاق
  const scopeCount = { school: 0, grade: 0, stage: 0 } as Record<string, number>;
  missions.forEach((m) => scopeCount[m.scopeType]++);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-extrabold">التقارير والتحليل</h1>
        <p className="text-sm text-muted-foreground">
          تحليلات على مستوى المدرسة — أنماط القيادة، جاهزية المهام، وتوزيع الفرص.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* توزيع الأنماط */}
        <div className="rounded-xl border bg-card p-5">
          <div className="mb-4 flex items-center gap-2"><PieChart className="h-[18px] w-[18px] text-brand" />
            <h2 className="font-display font-bold">توزيع أنماط القيادة</h2></div>
          <div className="flex items-center gap-4">
            <div className="relative h-32 w-32 shrink-0 rounded-full" style={{ background: `conic-gradient(${segments})` }}>
              <div className="absolute inset-[22%] grid place-items-center rounded-full bg-card">
                <div className="text-center"><div className="font-display text-xl font-extrabold"><En>{total}</En></div>
                  <div className="text-[10px] text-muted-foreground">طالب</div></div>
              </div>
            </div>
            <div className="flex-1 space-y-1.5">
              {styles.map(([name, n], i) => (
                <div key={name} className="flex items-center gap-2 text-[13px]">
                  <span className="h-3 w-3 rounded-sm" style={{ background: STYLE_COLORS[i % STYLE_COLORS.length] }} />
                  <span className="flex-1 truncate">{name}</span>
                  <span className="font-bold"><En>{n}</En></span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* متوسط المحاور */}
        <div className="rounded-xl border bg-card p-5">
          <div className="mb-4 flex items-center gap-2"><TrendingUp className="h-[18px] w-[18px] text-brand" />
            <h2 className="font-display font-bold">متوسط الكفايات</h2></div>
          <div className="space-y-2.5">
            {AXES.map((a) => {
              const v = Math.round(assessed.reduce((s, c) => s + c.axes[a.key], 0) / total);
              return (
                <div key={a.key} className="grid grid-cols-[95px_1fr_34px] items-center gap-2">
                  <span className="text-[13px] text-foreground/80">{a.label}</span>
                  <Meter value={v} tone={v >= 82 ? "success" : v >= 72 ? "brand" : "warning"} />
                  <span className="text-left text-xs font-bold"><En>{v}</En></span>
                </div>
              );
            })}
          </div>
        </div>

        {/* توزيع الفرص */}
        <div className="rounded-xl border bg-card p-5">
          <div className="mb-4 flex items-center gap-2"><Layers className="h-[18px] w-[18px] text-brand" />
            <h2 className="font-display font-bold">توزيع الفرص بالنطاق</h2></div>
          <div className="space-y-3">
            {[
              { k: "school", l: "مستوى المدرسة" },
              { k: "stage", l: "مستوى المرحلة" },
              { k: "grade", l: "مستوى الصف/الفصل" },
            ].map((s) => (
              <div key={s.k} className="grid grid-cols-[110px_1fr_28px] items-center gap-2">
                <span className="text-[13px] text-foreground/80">{s.l}</span>
                <Meter value={(scopeCount[s.k] / (missions.length || 1)) * 100} tone="brand" />
                <span className="text-left text-xs font-bold"><En>{scopeCount[s.k]}</En></span>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-lg bg-muted/40 p-3 text-[12px] text-muted-foreground">
            إجمالي المهام: <En>{missions.length}</En> · لا مقارنة بين طلاب من نطاقات مختلفة لنفس المهمة.
          </div>
        </div>
      </div>

      {/* جاهزية المهام */}
      <div className="rounded-xl border bg-card p-5">
        <div className="mb-3 flex items-center gap-2"><Target className="h-[18px] w-[18px] text-brand" />
          <h2 className="font-display font-bold">جاهزية المهام للإسناد</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground">
                <th className="border-b p-2.5 text-right font-semibold">المهمة</th>
                <th className="border-b p-2.5 text-center font-semibold">الحالة</th>
                <th className="border-b p-2.5 text-center font-semibold">المرشّحون</th>
                <th className="border-b p-2.5 text-center font-semibold">المقاعد المُغطّاة</th>
                <th className="border-b p-2.5 text-right font-semibold">متوسط المواءمة</th>
              </tr>
            </thead>
            <tbody>
              {missions.map((m) => {
                const r = missionReadiness(m);
                const st = STATUS_META[m.status];
                return (
                  <tr key={m.id} className="hover:bg-accent/30">
                    <td className="border-b p-2.5 font-medium">{m.title}</td>
                    <td className="border-b p-2.5 text-center"><Pill tone={st.tone as Tone}>{st.label}</Pill></td>
                    <td className="border-b p-2.5 text-center tabular-nums"><En>{r.count}</En></td>
                    <td className="border-b p-2.5 text-center tabular-nums"><En>{r.filled}/{m.seats}</En></td>
                    <td className="border-b p-2.5">
                      <div className="flex items-center gap-2">
                        <Meter value={r.avg} tone={matchTone(r.avg)} className="w-24" />
                        <span className="text-xs font-bold w-9"><En>{r.avg || "—"}%</En></span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* التقارير الدورية */}
      <div className="rounded-xl border bg-card p-5">
        <div className="mb-3 flex items-center gap-2"><FileText className="h-[18px] w-[18px] text-gold" />
          <h2 className="font-display font-bold">التقارير الدورية القابلة للتصدير</h2></div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { c: "T1", t: "تقرير أسبوعي", d: "المتقدمون · المهام المفتوحة · تنبيهات حرجة", to: "مدير المدرسة" },
            { c: "T2", t: "تقرير شهري", d: "أداء المهام · مؤشرات المواءمة · إعادة التوجيه", to: "منسّق + مدير" },
            { c: "T3", t: "تقرير فصلي", d: "النشاط · النزاعات · سلامة البيانات", to: "النظام المركزي" },
            { c: "T4", t: "تقرير سنوي", d: "الأثر · النجاح · الخطة · التقرير المالي", to: "الجهات الإشرافية" },
          ].map((r) => (
            <div key={r.c} className="rounded-xl border p-4">
              <div className="flex items-center justify-between">
                <Pill tone="brand"><En>{r.c}</En></Pill>
                <button onClick={() => toast(`جارِ تجهيز ${r.t} (${r.c}) للتصدير`, "info")}
                  className="text-xs font-semibold text-brand hover:underline">تصدير</button>
              </div>
              <div className="mt-2 font-display font-bold">{r.t}</div>
              <p className="mt-1 text-[11px] leading-5 text-muted-foreground">{r.d}</p>
              <div className="mt-2 text-[11px] text-muted-foreground">المُستلِم: {r.to}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
