import { useState } from "react";
import { Pill, En } from "@/components/common";
import { type Tone } from "@/lib/tone";
import { cn } from "@/lib/utils";
import { useSlis } from "@/store";
import { PermissionsMatrix } from "@/components/PermissionsMatrix";
import {
  SlidersHorizontal, Check, Globe, Users2, Wallet, Shuffle, Info,
} from "lucide-react";

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange}
      className={cn("relative h-6 w-11 rounded-full transition-colors", on ? "bg-brand" : "bg-muted")}>
      <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
        on ? "left-0.5" : "left-[22px]")} />
    </button>
  );
}

function Row({ icon: Icon, title, desc, children }:
  { icon: any; title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b py-4 last:border-0">
      <div className="flex items-start gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand/8 text-brand"><Icon className="h-[18px] w-[18px]" /></div>
        <div>
          <div className="font-semibold text-sm">{title}</div>
          <div className="text-xs text-muted-foreground">{desc}</div>
        </div>
      </div>
      {children}
    </div>
  );
}

const DEFAULTS = { mode: "B" as const, hybrid: false, scope: "school", lang: "ar", maxTasks: 3, autoApprove: true, alertPct: 25 };

export function Settings() {
  const store = useSlis();
  const [mode, setMode] = useState<"A" | "B">(store.mode);
  const [hybrid, setHybrid] = useState(store.hybrid);
  const [scope, setScope] = useState(store.settings.scope);
  const [lang, setLang] = useState(store.settings.lang);
  const [maxTasks, setMaxTasks] = useState(store.settings.maxTasks);
  const [autoApprove, setAutoApprove] = useState(store.settings.autoApprove);
  const [alertPct, setAlertPct] = useState(store.settings.alertPct);

  const save = () => store.saveSettings({
    mode, hybrid, settings: { scope, lang, maxTasks, autoApprove, alertPct },
  });
  const reset = () => {
    setMode(DEFAULTS.mode); setHybrid(DEFAULTS.hybrid); setScope(DEFAULTS.scope);
    setLang(DEFAULTS.lang); setMaxTasks(DEFAULTS.maxTasks);
    setAutoApprove(DEFAULTS.autoApprove); setAlertPct(DEFAULTS.alertPct);
  };

  const MODES = [
    { k: "A", t: "الوضع (أ) — الإعلان أولًا", d: "المدرسة تُعلن المهمة ويتقدّم الطالب. مناسب للمدارس الصغيرة أو التي تفضّل دور الطالب في الاختيار.", tag: "أساسي", tone: "success" as Tone },
    { k: "B", t: "الوضع (ب) — القياس أولًا", d: "الطالب يؤدي الاختبارات ويُوزّعه النظام تلقائيًا على المهام الأنسب. مناسب للمدارس الكبيرة.", tag: "موصى به", tone: "brand" as Tone },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-extrabold">الإعدادات</h1>
        <p className="text-sm text-muted-foreground">تُطبَّق هذه الإعدادات على مستوى المدرسة، ولا تؤثّر على البيانات التاريخية.</p>
      </div>

      {/* وضع التشغيل */}
      <div className="rounded-xl border bg-card p-5">
        <div className="mb-4 flex items-center gap-2"><Shuffle className="h-[18px] w-[18px] text-brand" />
          <h2 className="font-display font-bold">وضع التشغيل</h2></div>
        <div className="grid gap-3 sm:grid-cols-2">
          {MODES.map((m) => (
            <button key={m.k} onClick={() => setMode(m.k as "A" | "B")}
              className={cn("rounded-xl border p-4 text-right transition-all",
                mode === m.k ? "border-brand ring-1 ring-brand bg-brand/5" : "hover:border-brand/40")}>
              <div className="flex items-center justify-between">
                <Pill tone={m.tone}>{m.tag}</Pill>
                {mode === m.k && <span className="grid h-6 w-6 place-items-center rounded-full bg-brand text-white"><Check className="h-4 w-4" /></span>}
              </div>
              <div className="mt-2 font-display font-bold">{m.t}</div>
              <p className="mt-1 text-[12px] leading-5 text-muted-foreground">{m.d}</p>
            </button>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border p-3">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 shrink-0 mt-0.5 text-brand" />
            <div>
              <div className="text-sm font-semibold">التشغيل الهجين (متقدّم)</div>
              <div className="text-[12px] text-muted-foreground">
                عند تفعيله: يختار المشرف الوضع (أ/ب) <strong>لكل مهمة على حدة</strong> عند إنشائها، بدل الوضع الموحّد.
              </div>
            </div>
          </div>
          <Toggle on={hybrid} onChange={() => setHybrid(!hybrid)} />
        </div>
      </div>

      {/* إعدادات عامة */}
      <div className="rounded-xl border bg-card p-5">
        <div className="mb-1 flex items-center gap-2"><SlidersHorizontal className="h-[18px] w-[18px] text-brand" />
          <h2 className="font-display font-bold">ضوابط عامة</h2></div>

        <Row icon={Globe} title="لغة الواجهة" desc="عربي (RTL) — الإنجليزية ضمن الخطة القادمة">
          <div className="flex rounded-lg border p-0.5">
            {[{ k: "ar", l: "عربي" }, { k: "en", l: "English" }].map((o) => (
              <button key={o.k} onClick={() => setLang(o.k)}
                className={cn("rounded-md px-3 py-1 text-sm font-semibold", lang === o.k ? "bg-brand text-white" : "text-muted-foreground")}>
                {o.l}
              </button>
            ))}
          </div>
        </Row>

        <Row icon={Users2} title="النطاق الافتراضي للمهام الجديدة" desc="يُحدَّد عند إنشاء المهمة ولا يتغيّر بعد بدء التقديم">
          <div className="flex rounded-lg border p-0.5">
            {[{ k: "school", l: "المدرسة" }, { k: "stage", l: "المرحلة" }, { k: "grade", l: "الصف" }].map((o) => (
              <button key={o.k} onClick={() => setScope(o.k)}
                className={cn("rounded-md px-3 py-1 text-sm font-semibold", scope === o.k ? "bg-brand text-white" : "text-muted-foreground")}>
                {o.l}
              </button>
            ))}
          </div>
        </Row>

        <Row icon={Shuffle} title="الحد الأقصى لمهام الطالب (الوضع ب)" desc="أقصى عدد مهام يُرشَّح لها الطالب الواحد في الدورة">
          <div className="flex items-center gap-3">
            <input type="range" min={1} max={6} value={maxTasks} onChange={(e) => setMaxTasks(+e.target.value)}
              className="w-32 accent-[hsl(191_72%_30%)]" />
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand/10 font-bold text-brand"><En>{maxTasks}</En></span>
          </div>
        </Row>

        <Row icon={Wallet} title="الموافقة التلقائية للاختبار الفردي" desc="عند توفّر الحصة وبقاء الطالب ضمن الحد المسموح">
          <Toggle on={autoApprove} onChange={() => setAutoApprove(!autoApprove)} />
        </Row>

        <Row icon={Wallet} title="تنبيه الحصة المتبقية" desc="إشعار عند بلوغ هذه النسبة من الرصيد المتبقّي">
          <div className="flex items-center gap-3">
            <input type="range" min={10} max={50} step={5} value={alertPct} onChange={(e) => setAlertPct(+e.target.value)}
              className="w-32 accent-[hsl(191_72%_30%)]" />
            <span className="grid h-8 w-12 place-items-center rounded-lg bg-brand/10 font-bold text-brand"><En>{alertPct}%</En></span>
          </div>
        </Row>
      </div>

      <div className="flex justify-start gap-3">
        <button onClick={save} className="rounded-lg bg-brand px-6 h-11 text-sm font-semibold text-white hover:bg-brand/90">حفظ الإعدادات</button>
        <button onClick={reset} className="rounded-lg border px-6 h-11 text-sm font-semibold hover:bg-accent">استعادة الافتراضي</button>
      </div>

      <PermissionsMatrix />
    </div>
  );
}
