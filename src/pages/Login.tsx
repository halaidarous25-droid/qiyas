import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { requestPasswordReset } from "@/lib/api";
import { Gauge, LogIn, Loader2, PlayCircle, AlertCircle, ArrowRight, CheckCircle2, KeyRound } from "lucide-react";

const DEMO = [
  { label: "المشرف (منسّق النظام)", email: "supervisor@slis.demo" },
  { label: "مدير النظام المركزي", email: "central@slis.demo" },
  { label: "الطالب", email: "student@slis.demo" },
];

type Screen = "login" | "forgot";
const inp = "w-full rounded-lg border bg-background px-3 h-11 text-sm outline-none focus:border-brand";

export function Login() {
  const [screen, setScreen] = useState<Screen>("login");
  if (screen === "forgot") return <Shell><ForgotPassword onBack={() => setScreen("login")} /></Shell>;
  return <Shell><LoginForm onForgot={() => setScreen("forgot")} /></Shell>;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="hidden lg:flex flex-col justify-between bg-gradient-to-tl from-brand to-brand-soft p-10 text-white">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-white/15"><Gauge className="h-6 w-6" /></div>
          <div><div className="font-display text-lg font-extrabold">نظام مؤشر</div>
            <div className="text-xs text-white/75">لقياس المهارات الطلابية</div></div>
        </div>
        <div>
          <h1 className="font-display text-3xl font-extrabold leading-tight">اكتشف القيادات الطلابية<br />بالقياس لا بالانطباع</h1>
          <p className="mt-3 max-w-md text-white/85 text-sm leading-7">
            منصة تربط كل طالب بالدور القيادي الأنسب له عبر قياس علمي للكفايات والسلوك، مع عزل كامل لبيانات كل مدرسة.
          </p>
        </div>
        <div className="text-xs text-white/60">مركز التدريب والتطوير · الإصدار v1.0</div>
      </div>
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}

function LoginForm({ onForgot }: { onForgot: () => void }) {
  const { signIn, enterDemo } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    const msg = await signIn(username.trim(), password);
    setBusy(false);
    if (msg) setErr(msg);
  };

  return (
    <>
      <div className="lg:hidden mb-6 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand text-white"><Gauge className="h-5 w-5" /></div>
        <div className="font-display font-extrabold text-brand">نظام مؤشر</div>
      </div>

      <h2 className="font-display text-2xl font-extrabold">تسجيل الدخول</h2>
      <p className="mt-1 text-sm text-muted-foreground">ادخل باسم المستخدم وكلمة المرور.</p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-semibold mb-1">اسم المستخدم</label>
          <input value={username} onChange={(e) => setUsername(e.target.value)} dir="ltr" autoComplete="username"
            placeholder="اسم المستخدم" className={inp} />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">كلمة المرور</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} dir="ltr" autoComplete="current-password" className={inp} />
        </div>
        {err && (
          <div className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
            <AlertCircle className="h-4 w-4 shrink-0" /> {err}
          </div>
        )}
        <button type="submit" disabled={busy || !username.trim() || !password}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand h-11 font-semibold text-white hover:bg-brand/90 disabled:opacity-60">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
          {busy ? "جارٍ الدخول…" : "دخول"}
        </button>
      </form>

      <button onClick={onForgot} className="mt-3 flex w-full items-center justify-center gap-1.5 text-sm font-semibold text-brand hover:underline">
        <KeyRound className="h-4 w-4" /> نسيت كلمة المرور؟
      </button>

      <button onClick={enterDemo}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border h-11 text-sm font-semibold hover:bg-accent">
        <PlayCircle className="h-4 w-4 text-brand" /> استعراض تجريبي (بيانات وهمية)
      </button>

      <div className="mt-4 rounded-lg border bg-muted/40 p-3">
        <div className="mb-2 text-xs font-semibold text-muted-foreground">حسابات تجريبية (كلمة المرور: Slis12345!)</div>
        <div className="space-y-1.5">
          {DEMO.map((d) => (
            <button key={d.email} onClick={() => { setUsername(d.email); setPassword("Slis12345!"); }}
              className={cn("flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-xs hover:bg-accent",
                username === d.email && "bg-accent")}>
              <span className="font-medium">{d.label}</span>
              <span dir="ltr" className="en text-muted-foreground">{d.email}</span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-[10px] text-muted-foreground">تُسجَّل المدارس من الحساب المركزي، وتُسلَّم بيانات الدخول لمسؤول المدرسة.</p>
      </div>
    </>
  );
}

// ===== نسيت كلمة المرور =====
function ForgotPassword({ onBack }: { onBack: () => void }) {
  const [schoolName, setSchoolName] = useState("");
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr(null);
    try {
      await requestPasswordReset(schoolName.trim(), username.trim());
      setDone(true);
    } catch (e: any) { setErr(e.message || "تعذّر إرسال الطلب"); }
    finally { setBusy(false); }
  };

  if (done) return (
    <div className="text-center">
      <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
      <h2 className="mt-3 font-display text-xl font-extrabold">تم إرسال طلبك</h2>
      <p className="mt-1 text-sm text-muted-foreground">وصل طلبك إلى مدير النظام المركزي، وسيتواصل معك لإعادة تعيين كلمة المرور.</p>
      <button onClick={onBack} className="mt-4 inline-flex items-center gap-1.5 rounded-lg border px-4 h-10 text-sm font-semibold hover:bg-accent"><ArrowRight className="h-4 w-4" /> رجوع للدخول</button>
    </div>
  );

  return (
    <>
      <button onClick={onBack} className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline"><ArrowRight className="h-4 w-4" /> رجوع للدخول</button>
      <h2 className="font-display text-2xl font-extrabold">نسيت كلمة المرور</h2>
      <p className="mt-1 text-sm text-muted-foreground">أدخل اسم المدرسة واسم المستخدم بشكل صحيح، وسيصل الطلب لمدير النظام لإعادة التعيين.</p>
      <form onSubmit={submit} className="mt-5 space-y-3">
        <div><label className="block text-sm font-semibold mb-1">اسم المدرسة</label>
          <input value={schoolName} onChange={(e) => setSchoolName(e.target.value)} placeholder="اسم المدرسة كما هو مسجّل" className={inp} /></div>
        <div><label className="block text-sm font-semibold mb-1">اسم المستخدم</label>
          <input value={username} onChange={(e) => setUsername(e.target.value)} dir="ltr" placeholder="اسم المستخدم" className={inp} /></div>
        {err && <div className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger"><AlertCircle className="h-4 w-4 shrink-0" /> {err}</div>}
        <button type="submit" disabled={busy || schoolName.trim().length < 2 || username.trim().length < 2}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand h-11 font-semibold text-white hover:bg-brand/90 disabled:opacity-50">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />} إرسال الطلب
        </button>
      </form>
    </>
  );
}
