import { useState } from "react";
import { useSlis } from "@/store";
import { En } from "@/components/common";
import { cn } from "@/lib/utils";
import { type ScopeLevel, type OperatingMode } from "@/data/mock";
import { X, Target, Plus } from "lucide-react";

const SCOPES: { k: ScopeLevel; l: string }[] = [
  { k: "school", l: "المدرسة" }, { k: "stage", l: "المرحلة" }, { k: "grade", l: "الصف/الفصل" },
];

export function CreateMissionModal({ onClose }: { onClose: () => void }) {
  const { addMission, mode, hybrid } = useSlis();
  const [title, setTitle] = useState("");
  const [scopeType, setScopeType] = useState<ScopeLevel>("school");
  const [seats, setSeats] = useState(1);
  const [mMode, setMMode] = useState<OperatingMode>(mode);
  const valid = title.trim().length >= 3;

  const submit = () => {
    if (!valid) return;
    addMission({ title: title.trim(), scopeType, seats, mode: hybrid ? mMode : mode });
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
