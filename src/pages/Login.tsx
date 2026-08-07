import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { GraduationCap, LogIn, Loader2, PlayCircle, AlertCircle } from "lucide-react";

const DEMO = [
  { label: "المشرف (منسّق النظام)", email: "supervisor@slis.demo" },
  { label: "مدير النظام المركزي", email: "central@slis.demo" },
  { label: "الطالب", email: "student@slis.demo" },
];

export function Login() {
  const { signIn, enterDemo } = useAuth();
  const [email, setEmail] = useState("supervisor@slis.demo");
  const [password, setPassword] = useState("Slis12345!");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    const msg = await signIn(email.trim(), password);
    setBusy(false);
    if (msg) setErr(msg);
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* الجانب التعريفي */}
      <div className="hidden lg:flex flex-col justify-between bg-gradient-to-tl from-brand to-brand-soft p-10 text-white">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-white/15"><GraduationCap className="h-6 w-6" /></div>
          <div><div className="font-display text-lg font-extrabold">منظومة SLIS</div>
            <div className="text-xs text-white/75">القيادات الطلابية الذكية</div></div>
        </div>
        <div>
          <h1 className="font-display text-3xl font-extrabold leading-tight">اكتشف القيادات الطلابية<br />بالقياس لا بالانطباع</h1>
          <p className="mt-3 max-w-md text-white/85 text-sm leading-7">
            منصة تربط كل طالب بالدور القيادي الأنسب له عبر قياس علمي للكفايات والسلوك،
            مع عزل كامل لبيانات كل مدرسة.
          </p>
        </div>
        <div className="text-xs text-white/60">متصل بقاعدة بيانات حيّة · الإصدار v1.0</div>
      </div>

      {/* نموذج الدخول */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-6 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand text-white"><GraduationCap className="h-5 w-5" /></div>
            <div className="font-display font-extrabold text-brand">منظومة SLIS</div>
          </div>

          <h2 className="font-display text-2xl font-extrabold">تسجيل الدخول</h2>
          <p className="mt-1 text-sm text-muted-foreground">ادخل ببياناتك للوصول إلى منصتك.</p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-1">البريد الإلكتروني</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr"
                className="w-full rounded-lg border bg-background px-3 h-11 text-sm outline-none focus:border-brand" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">كلمة المرور</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} dir="ltr"
                className="w-full rounded-lg border bg-background px-3 h-11 text-sm outline-none focus:border-brand" />
            </div>
            {err && (
              <div className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
                <AlertCircle className="h-4 w-4 shrink-0" /> {err}
              </div>
            )}
            <button type="submit" disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand h-11 font-semibold text-white hover:bg-brand/90 disabled:opacity-60">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
              {busy ? "جارٍ الدخول…" : "دخول"}
            </button>
          </form>

          <button onClick={enterDemo}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border h-11 text-sm font-semibold hover:bg-accent">
            <PlayCircle className="h-4 w-4 text-brand" /> استعراض تجريبي (بيانات وهمية)
          </button>

          <div className="mt-6 rounded-lg border bg-muted/40 p-3">
            <div className="mb-2 text-xs font-semibold text-muted-foreground">حسابات تجريبية (كلمة المرور: Slis12345!)</div>
            <div className="space-y-1.5">
              {DEMO.map((d) => (
                <button key={d.email} onClick={() => { setEmail(d.email); setPassword("Slis12345!"); }}
                  className={cn("flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-xs hover:bg-accent",
                    email === d.email && "bg-accent")}>
                  <span className="font-medium">{d.label}</span>
                  <span dir="ltr" className="en text-muted-foreground">{d.email}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
