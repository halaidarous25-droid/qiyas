import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { registerSchool, registerStudent } from "@/lib/api";
import { GraduationCap, LogIn, Loader2, PlayCircle, AlertCircle, School, UserPlus, ArrowRight, CheckCircle2 } from "lucide-react";

const DEMO = [
  { label: "المشرف (منسّق النظام)", email: "supervisor@slis.demo" },
  { label: "مدير النظام المركزي", email: "central@slis.demo" },
  { label: "الطالب", email: "student@slis.demo" },
];

type Screen = "login" | "school" | "student";
const inp = "w-full rounded-lg border bg-background px-3 h-11 text-sm outline-none focus:border-brand";

export function Login() {
  const [screen, setScreen] = useState<Screen>("login");
  if (screen === "school") return <Shell><SchoolRegister onBack={() => setScreen("login")} /></Shell>;
  if (screen === "student") return <Shell><StudentRegister onBack={() => setScreen("login")} /></Shell>;
  return <Shell><LoginForm onRegister={setScreen} /></Shell>;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="hidden lg:flex flex-col justify-between bg-gradient-to-tl from-brand to-brand-soft p-10 text-white">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-white/15"><GraduationCap className="h-6 w-6" /></div>
          <div><div className="font-display text-lg font-extrabold">منظومة SLIS</div>
            <div className="text-xs text-white/75">القيادات الطلابية الذكية</div></div>
        </div>
        <div>
          <h1 className="font-display text-3xl font-extrabold leading-tight">اكتشف القيادات الطلابية<br />بالقياس لا بالانطباع</h1>
          <p className="mt-3 max-w-md text-white/85 text-sm leading-7">
            منصة تربط كل طالب بالدور القيادي الأنسب له عبر قياس علمي للكفايات والسلوك، مع عزل كامل لبيانات كل مدرسة.
          </p>
        </div>
        <div className="text-xs text-white/60">متصل بقاعدة بيانات حيّة · الإصدار v1.0</div>
      </div>
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}

function LoginForm({ onRegister }: { onRegister: (s: Screen) => void }) {
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
    <>
      <div className="lg:hidden mb-6 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand text-white"><GraduationCap className="h-5 w-5" /></div>
        <div className="font-display font-extrabold text-brand">منظومة SLIS</div>
      </div>

      <h2 className="font-display text-2xl font-extrabold">تسجيل الدخول</h2>
      <p className="mt-1 text-sm text-muted-foreground">ادخل ببياناتك للوصول إلى منصتك.</p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-semibold mb-1">البريد الإلكتروني</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" className={inp} />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">كلمة المرور</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} dir="ltr" className={inp} />
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

      {/* روابط التسجيل */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button onClick={() => onRegister("school")}
          className="flex items-center justify-center gap-1.5 rounded-lg border h-11 text-sm font-semibold hover:bg-accent">
          <School className="h-4 w-4 text-brand" /> تسجيل مدرسة
        </button>
        <button onClick={() => onRegister("student")}
          className="flex items-center justify-center gap-1.5 rounded-lg border h-11 text-sm font-semibold hover:bg-accent">
          <UserPlus className="h-4 w-4 text-brand" /> تسجيل طالب
        </button>
      </div>

      <button onClick={enterDemo}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border h-11 text-sm font-semibold hover:bg-accent">
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
    </>
  );
}

// ===== تسجيل مدرسة جديدة =====
function SchoolRegister({ onBack }: { onBack: () => void }) {
  const { signIn } = useAuth();
  const [f, setF] = useState({ schoolName: "", city: "", adminName: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<{ tenantCode: string } | null>(null);
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));
  const valid = f.schoolName.trim().length >= 2 && f.email.includes("@") && f.password.length >= 6;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr(null);
    try {
      const r = await registerSchool({ ...f, schoolName: f.schoolName.trim(), email: f.email.trim() });
      setDone({ tenantCode: r.tenantCode });
      await signIn(f.email.trim(), f.password);
    } catch (e: any) { setErr(e.message || "تعذّر التسجيل"); }
    finally { setBusy(false); }
  };

  if (done) return (
    <div className="text-center">
      <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
      <h2 className="mt-3 font-display text-xl font-extrabold">تم تسجيل مدرستك 🎉</h2>
      <p className="mt-1 text-sm text-muted-foreground">رمز مدرستك (شاركه مع طلابك للتسجيل):</p>
      <div dir="ltr" className="mt-2 inline-block rounded-lg border-2 border-brand bg-brand/5 px-6 py-2 font-mono text-2xl font-extrabold text-brand">{done.tenantCode}</div>
      <p className="mt-3 text-sm text-muted-foreground">جارٍ تحويلك إلى لوحة مدرستك…</p>
    </div>
  );

  return (
    <>
      <button onClick={onBack} className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline"><ArrowRight className="h-4 w-4" /> رجوع للدخول</button>
      <h2 className="font-display text-2xl font-extrabold">تسجيل مدرسة جديدة</h2>
      <p className="mt-1 text-sm text-muted-foreground">أنشئ حساب مدرستك وحساب مديرها.</p>
      <form onSubmit={submit} className="mt-5 space-y-3">
        <input placeholder="اسم المدرسة" value={f.schoolName} onChange={(e) => set("schoolName", e.target.value)} className={inp} />
        <input placeholder="المدينة" value={f.city} onChange={(e) => set("city", e.target.value)} className={inp} />
        <input placeholder="اسم المدير" value={f.adminName} onChange={(e) => set("adminName", e.target.value)} className={inp} />
        <input type="email" dir="ltr" placeholder="البريد الإلكتروني للمدير" value={f.email} onChange={(e) => set("email", e.target.value)} className={inp} />
        <input type="password" dir="ltr" placeholder="كلمة المرور (٦ أحرف فأكثر)" value={f.password} onChange={(e) => set("password", e.target.value)} className={inp} />
        {err && <div className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger"><AlertCircle className="h-4 w-4 shrink-0" /> {err}</div>}
        <button type="submit" disabled={!valid || busy}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand h-11 font-semibold text-white hover:bg-brand/90 disabled:opacity-50">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <School className="h-4 w-4" />} إنشاء المدرسة
        </button>
      </form>
    </>
  );
}

// ===== تسجيل طالب جديد =====
function StudentRegister({ onBack }: { onBack: () => void }) {
  const { signIn } = useAuth();
  const [f, setF] = useState({ tenantCode: "", name: "", grade: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));
  const valid = f.tenantCode.trim().length >= 4 && f.name.trim().length >= 2 && f.email.includes("@") && f.password.length >= 6;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr(null);
    try {
      await registerStudent({ ...f, tenantCode: f.tenantCode.trim().toUpperCase(), name: f.name.trim(), email: f.email.trim() });
      await signIn(f.email.trim(), f.password);
    } catch (e: any) { setErr(e.message || "تعذّر التسجيل"); setBusy(false); }
  };

  return (
    <>
      <button onClick={onBack} className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline"><ArrowRight className="h-4 w-4" /> رجوع للدخول</button>
      <h2 className="font-display text-2xl font-extrabold">تسجيل طالب جديد</h2>
      <p className="mt-1 text-sm text-muted-foreground">سجّل باستخدام رمز مدرستك.</p>
      <form onSubmit={submit} className="mt-5 space-y-3">
        <input dir="ltr" placeholder="رمز المدرسة (مثال: ABC123)" value={f.tenantCode} onChange={(e) => set("tenantCode", e.target.value)} className={cn(inp, "uppercase")} />
        <input placeholder="الاسم الكامل" value={f.name} onChange={(e) => set("name", e.target.value)} className={inp} />
        <input placeholder="الصف (اختياري)" value={f.grade} onChange={(e) => set("grade", e.target.value)} className={inp} />
        <input type="email" dir="ltr" placeholder="البريد الإلكتروني" value={f.email} onChange={(e) => set("email", e.target.value)} className={inp} />
        <input type="password" dir="ltr" placeholder="كلمة المرور (٦ أحرف فأكثر)" value={f.password} onChange={(e) => set("password", e.target.value)} className={inp} />
        {err && <div className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger"><AlertCircle className="h-4 w-4 shrink-0" /> {err}</div>}
        <button type="submit" disabled={!valid || busy}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand h-11 font-semibold text-white hover:bg-brand/90 disabled:opacity-50">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />} تسجيل الطالب
        </button>
      </form>
    </>
  );
}
