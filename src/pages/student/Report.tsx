import { Pill, Meter, En } from "@/components/common";
import { AXES, TRUST_META } from "@/data/mock";
import { type AssessmentResult, leadershipStyle } from "@/lib/scoring";
import { type Tone } from "@/lib/tone";
import {
  Sparkles, TrendingUp, GraduationCap, Compass, RotateCcw,
  Download, ShieldCheck, Award,
} from "lucide-react";

// رادار خماسي للمحاور
function Radar({ result }: { result: AssessmentResult }) {
  const size = 240, cx = size / 2, cy = size / 2, r = 92;
  const pts = AXES.map((a, i) => {
    const ang = (Math.PI * 2 * i) / AXES.length - Math.PI / 2;
    const v = result.axes[a.key] / 100;
    return {
      x: cx + Math.cos(ang) * r * v, y: cy + Math.sin(ang) * r * v,
      lx: cx + Math.cos(ang) * (r + 20), ly: cy + Math.sin(ang) * (r + 20),
      ax: cx + Math.cos(ang) * r, ay: cy + Math.sin(ang) * r, label: a.short,
    };
  });
  const poly = pts.map((p) => `${p.x},${p.y}`).join(" ");
  const grid = [0.25, 0.5, 0.75, 1].map((g) =>
    AXES.map((_, i) => {
      const ang = (Math.PI * 2 * i) / AXES.length - Math.PI / 2;
      return `${cx + Math.cos(ang) * r * g},${cy + Math.sin(ang) * r * g}`;
    }).join(" ")
  );
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[280px] mx-auto">
      {grid.map((g, i) => (
        <polygon key={i} points={g} fill="none" stroke="hsl(var(--border))" strokeWidth="1" />
      ))}
      {pts.map((p, i) => (
        <line key={i} x1={cx} y1={cy} x2={p.ax} y2={p.ay} stroke="hsl(var(--border))" strokeWidth="1" />
      ))}
      <polygon points={poly} fill="hsl(var(--brand) / 0.22)" stroke="hsl(var(--brand))" strokeWidth="2" />
      {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="hsl(var(--brand))" />)}
      {pts.map((p, i) => (
        <text key={i} x={p.lx} y={p.ly} textAnchor="middle" dominantBaseline="middle"
          fontSize="12" fontWeight="700" fill="hsl(var(--foreground))">{p.label}</text>
      ))}
    </svg>
  );
}

const LEARNING: Record<string, string[]> = {
  org: ["ورشة إدارة الوقت والأولويات", "نظام تتبّع المهام الأسبوعي"],
  lead: ["دورة إدارة الفريق", "نشاط مجلس الطلاب"],
  comm: ["ورشة فن الإلقاء والإقناع", "نادي المناظرات"],
  firm: ["ورشة اتخاذ القرار الأخلاقي", "برنامج النزاهة الطلابية"],
  init: ["حاضنة المبادرات الطلابية", "تحدّي حل المشكلات"],
};

export function Report({ result, onRestart }:
  { result: AssessmentResult; onRestart: () => void }) {
  const style = leadershipStyle(result.strengths);
  const trust = TRUST_META[result.trust];
  const label = (k: string) => AXES.find((a) => a.key === k)!.label;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {/* رأس التقرير */}
      <div className="overflow-hidden rounded-2xl border bg-gradient-to-tl from-brand to-brand-soft text-white">
        <div className="p-6">
          <div className="flex items-center gap-2 text-sm text-white/80">
            <Sparkles className="h-4 w-4" /> تقريرك الشخصي — منظومة SLIS
          </div>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-white/70 text-sm">نمطك القيادي</div>
              <div className="font-display text-3xl font-extrabold">{style.name}</div>
              <p className="mt-1 max-w-md text-sm text-white/85">{style.desc}</p>
            </div>
            <div className="flex gap-3">
              <div className="rounded-xl bg-white/12 px-4 py-2 text-center backdrop-blur">
                <div className="font-display text-2xl font-extrabold"><En>{result.competency}%</En></div>
                <div className="text-[11px] text-white/75">الكفايات</div>
              </div>
              <div className="rounded-xl bg-white/12 px-4 py-2 text-center backdrop-blur">
                <div className="font-display text-2xl font-extrabold"><En>{result.behavior}%</En></div>
                <div className="text-[11px] text-white/75">السلوك</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {/* الرادار */}
        <div className="rounded-2xl border bg-card p-5">
          <h3 className="mb-2 font-display font-bold">ملفك على المحاور الخمسة</h3>
          <Radar result={result} />
          <div className="mt-3 space-y-1.5">
            {AXES.map((a) => (
              <div key={a.key} className="grid grid-cols-[100px_1fr_36px] items-center gap-2">
                <span className="text-[13px] text-foreground/80">{a.label}</span>
                <Meter value={result.axes[a.key]} tone={result.axes[a.key] >= 82 ? "success" : result.axes[a.key] >= 70 ? "brand" : "warning"} />
                <span className="text-left text-xs font-bold"><En>{result.axes[a.key]}</En></span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-5">
          {/* القوة والتطوير */}
          <div className="rounded-2xl border bg-card p-5">
            <div className="mb-2 flex items-center gap-2 text-success">
              <TrendingUp className="h-[18px] w-[18px]" /><h3 className="font-display font-bold text-foreground">نقاط قوّتك</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {result.strengths.map((k) => <Pill key={k} tone="success">{label(k)}</Pill>)}
            </div>
            <div className="mt-4 mb-2 flex items-center gap-2 text-warning">
              <Compass className="h-[18px] w-[18px]" /><h3 className="font-display font-bold text-foreground">فرص تطويرك</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {result.growth.map((k) => <Pill key={k} tone="warning">{label(k)}</Pill>)}
            </div>
          </div>

          {/* الموثوقية */}
          <div className="rounded-2xl border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2"><ShieldCheck className="h-[18px] w-[18px] text-brand" />
                <h3 className="font-display font-bold">مؤشرات الموثوقية</h3></div>
              <Pill tone={trust.tone as Tone}>{trust.label}</Pill>
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <div className="flex justify-between text-muted-foreground"><span>الاتساق</span><span><En>{result.contradiction}/10</En></span></div>
                <Meter value={result.contradiction * 10} tone={result.contradiction >= 6 ? "danger" : result.contradiction >= 3 ? "warning" : "success"} className="mt-1" />
              </div>
              <div>
                <div className="flex justify-between text-muted-foreground"><span>الكمال الاجتماعي</span><span><En>{result.socialDesirability}/5</En></span></div>
                <Meter value={result.socialDesirability * 20} tone={result.socialDesirability >= 4 ? "danger" : result.socialDesirability >= 2 ? "warning" : "success"} className="mt-1" />
              </div>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">{trust.desc}. التحيّز للمقبولية ميل إنساني طبيعي ولا يُعاقَب عليه.</p>
          </div>
        </div>
      </div>

      {/* المسار التعليمي */}
      <div className="rounded-2xl border bg-card p-5">
        <div className="mb-3 flex items-center gap-2">
          <GraduationCap className="h-[18px] w-[18px] text-gold" />
          <h3 className="font-display font-bold">مسارك التعليمي المقترح</h3>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {result.growth.flatMap((k) => LEARNING[k]).map((item, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2.5 text-sm">
              <Award className="h-4 w-4 text-gold shrink-0" /> {item}
            </div>
          ))}
        </div>
      </div>

      {/* التوجيه القيادي */}
      <div className="rounded-2xl border border-brand/25 bg-brand/5 p-5">
        <div className="mb-1 flex items-center gap-2">
          <Compass className="h-[18px] w-[18px] text-brand" />
          <h3 className="font-display font-bold text-brand">التوجيه القيادي</h3>
        </div>
        <p className="text-sm text-foreground/85">
          بناءً على نمط <strong>{style.name}</strong>، المهام الأنسب لك تتطلّب {label(result.strengths[0])} و{label(result.strengths[1])} — مثل:
          {result.strengths.includes("comm") ? " منظّم الفعاليات، ومقدّم الإذاعة." :
           result.strengths.includes("lead") ? " رئيس المجلس الطلابي، وقائد فريق." :
           result.strengths.includes("firm") ? " مسؤول جماعة النظام، ومشرف الانضباط." :
           " منسّق المبادرات، وعريف الفصل."}
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <button onClick={() => window.print()}
          className="flex items-center gap-2 rounded-lg bg-brand px-5 h-11 text-sm font-semibold text-white hover:bg-brand/90">
          <Download className="h-4 w-4" /> تصدير التقرير PDF
        </button>
        <button onClick={onRestart} className="flex items-center gap-2 rounded-lg border px-5 h-11 text-sm font-semibold hover:bg-accent">
          <RotateCcw className="h-4 w-4" /> إعادة الاختبار (تجربة)
        </button>
      </div>
    </div>
  );
}
