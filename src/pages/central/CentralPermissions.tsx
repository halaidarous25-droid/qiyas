import { useEffect, useState } from "react";
import { ROLE_CAPS, MATRIX_ROLES, ALL_CAPS, CAP_LABEL, ROLE_LABEL, type Role, type Cap } from "@/lib/perms";
import { fetchRoleCaps, saveRoleCaps } from "@/lib/api";
import { useSlis } from "@/store";
import { ShieldCheck, Save, RotateCcw, Loader2, Check } from "lucide-react";

// المصفوفة الافتراضية (من نموذج الصلاحيات المتدرّج)
function defaultMatrix(): Record<string, string[]> {
  const m: Record<string, string[]> = {};
  for (const r of MATRIX_ROLES) m[r] = [...(ROLE_CAPS[r] || [])];
  return m;
}

export function CentralPermissions() {
  const { toast } = useSlis();
  const [matrix, setMatrix] = useState<Record<string, string[]>>(defaultMatrix());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedTick, setSavedTick] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const saved = await fetchRoleCaps();
        if (saved) {
          // دمج المحفوظ فوق الافتراضي (لضمان وجود كل الأدوار)
          const base = defaultMatrix();
          for (const r of MATRIX_ROLES) if (saved[r]) base[r] = [...saved[r]];
          setMatrix(base);
        }
      } catch { /* نبقى على الافتراضي */ }
      finally { setLoading(false); }
    })();
  }, []);

  const has = (role: Role, cap: Cap) => (matrix[role] || []).includes(cap);
  const toggle = (role: Role, cap: Cap) => {
    setMatrix((m) => {
      const cur = new Set(m[role] || []);
      if (cur.has(cap)) cur.delete(cap); else cur.add(cap);
      return { ...m, [role]: ALL_CAPS.filter((c) => cur.has(c)) };
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      await saveRoleCaps(matrix);
      toast("حُفظت مصفوفة الصلاحيات — تُطبَّق على حسابات المدارس عند تحديث الصفحة");
      setSavedTick(true); setTimeout(() => setSavedTick(false), 1800);
    } catch (e: any) { toast(`تعذّر الحفظ: ${e.message || e}`, "danger"); }
    finally { setSaving(false); }
  };

  const reset = () => { setMatrix(defaultMatrix()); toast("أُعيدت المصفوفة إلى الافتراضي — احفظ لتطبيقها", "info"); };

  if (loading) return (
    <div className="grid place-items-center py-16 text-muted-foreground">
      <Loader2 className="h-7 w-7 animate-spin text-brand" />
    </div>
  );

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4 md:p-8 soft-grid">
      <div className="rounded-xl border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3.5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-[18px] w-[18px] text-brand" />
            <div>
              <h2 className="font-display font-bold">مصفوفة صلاحيات المدارس</h2>
              <p className="text-xs text-muted-foreground">تحكّم مركزي بما يراه كل دور في حسابات المدارس</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={reset}
              className="inline-flex items-center gap-1.5 rounded-lg border px-3 h-9 text-sm font-semibold hover:bg-accent">
              <RotateCcw className="h-4 w-4" /> الافتراضي
            </button>
            <button onClick={save} disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 h-9 text-sm font-semibold text-white hover:bg-brand/90 disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : savedTick ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
              {savedTick ? "حُفظت" : "حفظ المصفوفة"}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto p-2">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="sticky right-0 bg-card p-2.5 text-right font-semibold text-muted-foreground">الصلاحية \ الدور</th>
                {MATRIX_ROLES.map((r) => (
                  <th key={r} className="p-2.5 text-center font-semibold">{ROLE_LABEL[r]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ALL_CAPS.map((cap) => (
                <tr key={cap} className="border-t">
                  <td className="sticky right-0 bg-card p-2.5 text-right font-medium">{CAP_LABEL[cap]}</td>
                  {MATRIX_ROLES.map((r) => (
                    <td key={r} className="p-2.5 text-center">
                      <button
                        onClick={() => toggle(r, cap)}
                        role="checkbox"
                        aria-checked={has(r, cap)}
                        aria-label={`${CAP_LABEL[cap]} — ${ROLE_LABEL[r]}`}
                        className={
                          "mx-auto grid h-7 w-7 place-items-center rounded-md border transition " +
                          (has(r, cap)
                            ? "border-brand bg-brand text-white"
                            : "border-slate-300 bg-white text-transparent hover:border-brand/50")
                        }>
                        <Check className="h-4 w-4" />
                      </button>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        ملاحظة: مستودع الأسئلة غير مُدرَج هنا لأنه محميّ ويُدار من الحساب المركزي فقط، ولا يُتاح لأي حساب مدرسي مهما كانت صلاحيته.
      </p>
    </div>
  );
}
