import { useEffect, useState } from "react";
import { Assessment } from "./student/Assessment";
import { scoreAssessment, leadershipStyle, type Answers, type AssessmentResult } from "@/lib/scoring";
import { publicGetSchool, publicSubmitAssessment } from "@/lib/api";
import { AXES } from "@/data/mock";
import { En, Meter } from "@/components/common";
import { GraduationCap, Loader2, AlertCircle, CheckCircle2, Play, Award } from "lucide-react";

type Step = "loading" | "invalid" | "intro" | "form" | "test" | "done";
const inp = "w-full rounded-lg border bg-background px-3 h-11 text-sm outline-none focus:border-brand";

export function PublicAssessment({ code }: { code: string }) {
  const [step, setStep] = useState<Step>("loading");
  const [err, setErr] = useState<string | null>(null);
  const [schoolName, setSchoolName] = useState("");
  const [classes, setClasses] = useState<{ id: string; name: string; grade: string }[]>([]);
  const [name, setName] = useState("");
  const [grade, setGrade] = useState("");
  const [className, setClassName] = useState("");
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [busy, setBusy] = useState(false);

  const FALLBACK_GRADES = ["الأول الثانوي", "الثاني الثانوي", "الثالث الثانوي", "الأول المتوسط", "الثاني المتوسط", "الثالث المتوسط"];
  // الصفوف: من فصول المدرسة إن وُجدت، وإلا قائمة افتراضية
  const grades = Array.from(new Set([
    ...classes.map((c) => c.grade).filter(Boolean),
    ...FALLBACK_GRADES,
  ]));
  // الفصول ضمن الصف المختار (أو كلها إن لم يتطابق)
  const classOptions = grade
    ? (classes.filter((c) => c.grade === grade).length ? classes.filter((c) => c.grade === grade) : classes)
    : classes;

  useEffect(() => {
    publicGetSchool(code)
      .then((r) => { setSchoolName(r.schoolName); setClasses(r.classes); setStep("intro"); })
      .catch((e) => { setErr(e.message || "رمز غير صحيح"); setStep("invalid"); });
  }, [code]);

  const finish = async (a: Answers) => {
    const r = scoreAssessment(a);
    setResult(r);
    setBusy(true);
    try {
      await publicSubmitAssessment({ code, name: name.trim(), grade, className, result: r, answers: a });
      setStep("done");
    } catch (e: any) { setErr(e.message || "تعذّر الإرسال"); setStep("done"); }
    finally { setBusy(false); }
  };

  const Header = () => (
    <div className="mb-6 flex items-center gap-3">
      <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand text-white"><GraduationCap className="h-6 w-6" /></div>
      <div><div className="font-display font-extrabold text-brand">منظومة SLIS</div>
        <div className="text-xs text-muted-foreground">{schoolName || "مقياس القيادة"}</div></div>
    </div>
  );

  if (step === "loading") return <Center><Loader2 className="h-8 w-8 animate-spin text-brand" /></Center>;

  if (step === "invalid") return (
    <Center>
      <div className="max-w-sm text-center">
        <AlertCircle className="mx-auto h-10 w-10 text-danger" />
        <div className="mt-3 font-semibold">رابط غير صالح</div>
        <div className="mt-1 text-sm text-muted-foreground">{err}</div>
      </div>
    </Center>
  );

  if (step === "test") return (
    <div className="min-h-screen bg-background soft-grid p-4 md:p-8">
      <Assessment onFinish={finish} onExit={() => setStep("form")} />
      {busy && <div className="fixed inset-0 grid place-items-center bg-black/30"><Loader2 className="h-8 w-8 animate-spin text-white" /></div>}
    </div>
  );

  if (step === "done") return (
    <Center>
      <div className="w-full max-w-md text-center">
        <CheckCircle2 className="mx-auto h-14 w-14 text-success" />
        <h1 className="mt-3 font-display text-2xl font-extrabold">شكرًا لك، {name}! 🎉</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {err ? "أُكمل المقياس لكن تعذّر إرسال النتيجة — أبلغ معلمك." : "أُرسلت نتيجتك إلى مدرستك بنجاح."}
        </p>
        {result && (
          <div className="mt-5 rounded-2xl border bg-card p-5 text-right">
            <div className="mb-3 flex items-center gap-2"><Award className="h-[18px] w-[18px] text-gold" />
              <h2 className="font-display font-bold">نتيجتك القيادية</h2></div>
            <div className="mb-3 rounded-lg bg-brand/5 border border-brand/20 p-3 text-center">
              <div className="text-sm text-muted-foreground">نمطك القيادي</div>
              <div className="font-display text-lg font-extrabold text-brand">{leadershipStyle(result.strengths).name}</div>
            </div>
            <div className="space-y-1.5">
              {AXES.map((a) => (
                <div key={a.key} className="grid grid-cols-[80px_1fr_32px] items-center gap-2">
                  <span className="text-[12px] text-foreground/80">{a.label}</span>
                  <Meter value={result.axes[a.key]} tone="brand" />
                  <span className="text-left text-[11px] font-bold"><En>{result.axes[a.key]}</En></span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Center>
  );

  // intro + form
  return (
    <Center>
      <div className="w-full max-w-sm">
        <Header />
        {step === "intro" ? (
          <div className="rounded-2xl border bg-gradient-to-tl from-brand to-brand-soft p-6 text-white">
            <h1 className="font-display text-2xl font-extrabold">مقياس القيادة والسلوك</h1>
            <p className="mt-2 text-sm text-white/85">٣٥ موقفًا (~١٢ دقيقة) لاكتشاف ملفك القيادي. أدخل بياناتك ثم ابدأ.</p>
            <button onClick={() => setStep("form")}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-6 h-12 font-bold text-brand hover:bg-white/90">
              <Play className="h-5 w-5" /> المتابعة
            </button>
          </div>
        ) : (
          <div className="rounded-2xl border bg-card p-5">
            <h2 className="font-display text-lg font-extrabold">بياناتك</h2>
            <p className="mt-1 text-sm text-muted-foreground">تظهر هذه البيانات لمعلمك مع نتيجتك.</p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">الاسم الكامل</label>
                <input className={inp} placeholder="اكتب اسمك" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">الصف</label>
                <select className={inp} value={grade} onChange={(e) => { setGrade(e.target.value); setClassName(""); }}>
                  <option value="">اختر الصف…</option>
                  {grades.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">الفصل</label>
                <select className={inp} value={className} onChange={(e) => setClassName(e.target.value)}>
                  <option value="">اختر الفصل…</option>
                  {classOptions.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <button disabled={name.trim().length < 2 || !grade} onClick={() => setStep("test")}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-brand h-11 font-semibold text-white hover:bg-brand/90 disabled:opacity-50">
                <Play className="h-4 w-4" /> ابدأ المقياس
              </button>
              <p className="text-[11px] text-muted-foreground text-center">اختر بياناتك من القوائم لتظهر نتيجتك لمعلمك بشكل صحيح.</p>
            </div>
          </div>
        )}
      </div>
    </Center>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen grid place-items-center bg-background p-6">{children}</div>;
}
