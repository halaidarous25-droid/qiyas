import { useState } from "react";
import { useSlis } from "@/store";
import { En } from "@/components/common";
import { cn } from "@/lib/utils";
import { AXES, type ScopeLevel, type OperatingMode, type AxisScores, type AxisKey } from "@/data/mock";
import { X, Target, Plus, SlidersHorizontal } from "lucide-react";

const SCOPES: { k: ScopeLevel; l: string }[] = [
  { k: "school", l: "المدرسة" }, { k: "stage", l: "المرحلة" }, { k: "grade", l: "الصف/الفصل" },
];

const EVEN_W: AxisScores = { org: 20, lead: 20, comm: 20, firm: 20, init: 20 };
const PRESETS: { l: string; w: AxisScores }[] = [
  { l: "متوازن", w: { org: 20, lead: 20, comm: 20, firm: 20, init: 20 } },
  { l: "قيادي", w: { org: 15, lead: 35, comm: 15, firm: 20, init: 15 } },
  { l: "تنظيمي", w: { org: 35, lead: 15, comm: 15, firm: 20, init: 15 } },
  { l: "تواصلي", w: { org: 15, lead: 20, comm: 35, firm: 10, init: 20 } },
];

export function CreateMissionModal({ onClose }: { onClose: () => void }) {
  const { addMission, mode, hybrid } = useSlis();
  const [title, setTitle] = useState("");
  const [scopeType, setScopeType] = useState<ScopeLevel>("school");
  const [seats, setSeats] = useState(1);
  const [mMode, setMMode] = useState<OperatingMode>(mode);
  const [showPriorities, setShowPriorities] = useState(false);
  const [weights, setWeights] = useState<AxisScores>({ ...EVEN_W });
  const valid = title.trim().length >= 3;

  const wSum = AXES.reduce((s, a) => s + weights[a.key], 0);
  // تطبيع الأوزان إلى مجموع ١٠٠
  const normalize = (w: AxisScores): AxisScores => {
    const sum = AXES.reduce((s, a) => s + w[a.key], 0);
    if (sum <= 0) return { ...EVEN_W };
    const out = {} as AxisScores;
    AXES.forEach((a) => (out[a.key] = Math.round((w[a.key] / sum) * 100)));
    return out;
  };

  const submit = () => {
    if (!valid) return;
    addMission({ title: title.trim(), scopeType, seats, mode: hybrid ? mMode : mode, weights: normalize(weights) });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border bg-card p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand text-white"><Target className="h-5 w-5" /></div>
            <h2 className="font-display text-lg font-extrabold">إنشاء مهمة قيادية</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
        </div>

        <label className="block text-sm font-semibold">عنوان المهمة</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus
          placeholder="مثال: مسؤول جماعة النشاط العلمي"
          className="mt-1 w-full rounded-lg border bg-background px-3 h-11 text-sm outline-none focus:border-brand" />

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold">النطاق</label>
            <div className="mt-1 flex rounded-lg border p-0.5">
              {SCOPES.map((s) => (
                <button key={s.k} onClick={() => setScopeType(s.k)}
                  className={cn("flex-1 rounded-md py-1.5 text-xs font-semibold", scopeType === s.k ? "bg-brand text-white" : "text-muted-foreground")}>
                  {s.l}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold">عدد المقاعد</label>
            <div className="mt-1 flex items-center gap-2">
              <input type="range" min={1} max={5} value={seats} onChange={(e) => setSeats(+e.target.value)}
                className="flex-1 accent-[hsl(191_72%_30%)]" />
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand/10 font-bold text-brand"><En>{seats}</En></span>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-semibold">وضع التشغيل</label>
          {hybrid ? (
            <div className="mt-1 flex rounded-lg border p-0.5">
              {(["A", "B"] as const).map((k) => (
                <button key={k} onClick={() => setMMode(k)}
                  className={cn("flex-1 rounded-md py-1.5 text-xs font-semibold", mMode === k ? "bg-brand text-white" : "text-muted-foreground")}>
                  الوضع {k === "A" ? "أ — الإعلان أولًا" : "ب — القياس أولًا"}
                </button>
              ))}
            </div>
          ) : (
            <div className="mt-1 rounded-lg border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              موحّد على المدرسة: الوضع {mode === "A" ? "أ — الإعلان أولًا" : "ب — القياس أولًا"} · فعّل «التشغيل الهجين» من الإعدادات لاختيار الوضع لكل مهمة.
            </div>
          )}
        </div>

        {/* أولويات المهمة (أوزان المحاور) */}
        <div className="mt-4">
          <button onClick={() => setShowPriorities((v) => !v)}
            className="flex w-full items-center justify-between rounded-lg border px-3 h-10 text-sm font-semibold hover:bg-accent">
            <span className="flex items-center gap-2"><SlidersHorizontal className="h-4 w-4 text-brand" /> أولويات المهمة (أوزان المحاور)</span>
            <span className="text-xs text-muted-foreground">{showPriorities ? "إخفاء" : "تخصيص"}</span>
          </button>
          {showPriorities && (
            <div className="mt-2 rounded-lg border p-3">
              <div className="mb-2 flex flex-wrap gap-1.5">
                {PRESETS.map((p) => (
                  <button key={p.l} onClick={() => setWeights({ ...p.w })}
                    className="rounded-md border px-2.5 h-7 text-[11px] font-semibold hover:bg-accent">{p.l}</button>
                ))}
              </div>
              <div className="space-y-2">
                {AXES.map((a) => (
                  <div key={a.key} className="grid grid-cols-[70px_1fr_36px] items-center gap-2">
                    <span className="text-xs text-foreground/80">{a.label}</span>
                    <input type="range" min={0} max={100} value={weights[a.key as AxisKey]}
                      onChange={(e) => setWeights((w) => ({ ...w, [a.key]: Number(e.target.value) }))}
                      className="accent-[hsl(191_72%_30%)]" />
                    <span className="text-left text-xs font-bold text-brand"><En>{Math.round((weights[a.key as AxisKey] / (wSum || 1)) * 100)}</En>%</span>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[10px] text-muted-foreground">تُطبَّع الأوزان تلقائيًا إلى مجموع ١٠٠٪ وتُحدِّد كيفية حساب مواءمة الطلاب لهذه المهمة.</p>
            </div>
          )}
        </div>

        <div className="mt-5 flex gap-2">
          <button onClick={submit} disabled={!valid}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand h-11 text-sm font-semibold text-white disabled:opacity-40 hover:bg-brand/90">
            <Plus className="h-4 w-4" /> إنشاء المهمة
          </button>
          <button onClick={onClose} className="rounded-lg border px-5 h-11 text-sm font-semibold hover:bg-accent">إلغاء</button>
        </div>
      </div>
    </div>
  );
}
