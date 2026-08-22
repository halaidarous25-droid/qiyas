import { useEffect, useState } from "react";
import { Assessment } from "./student/Assessment";
import { scoreAssessment, leadershipStyle, type Answers, type AssessmentResult } from "@/lib/scoring";
import { publicGetSchool, publicSubmitAssessment, publicCheckEligibility, publicRequestRetake } from "@/lib/api";
import { AXES } from "@/data/mock";
import { En, Meter } from "@/components/common";
import { Gauge, Loader2, AlertCircle, CheckCircle2, Play, Award, School, CalendarClock, BellRing, Target, ClipboardList, ArrowRight, ArrowLeft } from "lucide-react";

type Step = "loading" | "invalid" | "intro" | "form" | "exam" | "roles" | "blocked" | "test" | "done";
const inp = "w-full rounded-lg border bg-background px-3 h-11 text-sm outline-none focus:border-brand";

export function PublicAssessment({ code }: { code: string }) {
  const [step, setStep] = useState<Step>("loading");
  const [err, setErr] = useState<string | null>(null);
  const [schoolName, setSchoolName] = useState("");
  const [classes, setClasses] = useState<{ id: string; name: string; grade: string }[]>([]);
  const [name, setName] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [grade, setGrade] = useState("");
  const [classNum, setClassNum] = useState("");
  const className = grade && classNum ? `${grade}/${classNum}` : "";
  const CLASS_NUMS = Array.from({ length: 10 }, (_, i) => String(i + 1));
  const classMissing = !!(grade && classNum && classes.length > 0 && !classes.some((c) => c.name === className));
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const [block, setBlock] = useState<{ lastDate?: string; pending?: boolean }>({});
  const [reqSent, setReqSent] = useState(false);
  // تعدّد الاختبارات ورغبات المسمّيات
  const [examTypes, setExamTypes] = useState<{ key: string; name: string; description?: string }[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [selectedExam, setSelectedExam] = useState<string>("leadership");
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [priorMap, setPriorMap] = useState<Record<string, boolean>>({});
  const toggleRole = (t: string) => setSelectedRoles((cur) => cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]);

  const FALLBACK_GRADES = ["الأول الثانوي", "الثاني الثانوي", "الثالث الثانوي", "الأول المتوسط", "الثاني المتوسط", "الثالث المتوسط"];
  // الصفوف: من فصول المدرسة إن وُجدت، وإلا قائمة افتراضية
  const grades = Array.from(new Set([
    ...classes.map((c) => c.grade).filter(Boolean),
    ...FALLBACK_GRADES,
  ]));

  useEffect(() => {
    publicGetSchool(code)
      .then((r) => {
        setSchoolName(r.schoolName); setClasses(r.classes);
        setExamTypes(r.examTypes || []); setRoles(r.roles || []);
        if (r.examTypes && r.examTypes.length) setSelectedExam(r.examTypes[0].key);
        setStep("intro");
      })
      .catch((e) => { setErr(e.message || "رمز غير صحيح"); setStep("invalid"); });
  }, [code]);

  // بعد بيانات الطالب: فحص الأهلية ثم اختيار نوع الاختبار
  const startTest = async () => {
    setChecking(true); setErr(null);
    try {
      const el = await publicCheckEligibility({ code, nationalId: nationalId.trim(), name: name.trim(), grade, phone: phone.trim() });
      if (el.eligible) { setStep(examTypes.length > 1 ? "exam" : "exam"); }
      else { setBlock({ lastDate: el.lastDate, pending: el.pending }); setReqSent(!!el.pending); setStep("blocked"); }
    } catch (e: any) { setErr(e.message || "تعذّر التحقق"); }
    finally { setChecking(false); }
  };

  // اختيار نوع الاختبار → القيادات تعرض المسمّيات، غيرها يذهب للأسئلة مباشرة
  const chooseExam = (key: string) => {
    setSelectedExam(key);
    if (key === "leadership" && roles.length > 0) setStep("roles");
    else setStep("test");
  };

  const proceedFromRoles = () => setStep("test");

  const requestRetake = async () => {
    setChecking(true);
    try {
      await publicRequestRetake({ code, nationalId: nationalId.trim(), name: name.trim(), grade, className });
      setReqSent(true);
    } catch (e: any) { setErr(e.message || "تعذّر إرسال الطلب"); }
    finally { setChecking(false); }
  };

  const finish = async (a: Answers) => {
    const r = scoreAssessment(a);
    setResult(r);
    setBusy(true);
    const rolePrefs = selectedRoles.map((t) => ({ role_title: t, prior_assigned: !!priorMap[t] }));
    // مؤشر الخبرة القيادية = عدد المسمّيات التي سبق تكليفه بها (بحد أقصى 3) بدل السؤال القديم
    const experience = Math.min(3, rolePrefs.filter((p) => p.prior_assigned).length);
    try {
      await publicSubmitAssessment({ code, name: name.trim(), grade, className, nationalId: nationalId.trim(), phone: phone.trim(), email: email.trim(), experience, examType: selectedExam, rolePrefs, result: r, answers: a });
      setStep("done");
    } catch (e: any) { setErr(e.message || "تعذّر الإرسال"); setStep("done"); }
    finally { setBusy(false); }
  };

  const Header = () => (
    <div className="mb-6 flex items-center gap-3">
      <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand text-white"><Gauge className="h-6 w-6" /></div>
      <div><div className="font-display font-extrabold text-brand">مؤشر</div>
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

  // اختيار نوع الاختبار
  if (step === "exam") return (
    <Center>
      <div className="w-full max-w-md">
        <Header />
        <h2 className="font-display text-xl font-extrabold">اختر نوع الاختبار</h2>
        <p className="mt-1 text-sm text-muted-foreground">حدّد الاختبار الذي تريد الدخول إليه.</p>
        <div className="mt-4 space-y-2.5">
          {examTypes.length === 0 && (
            <button onClick={() => chooseExam("leadership")} className="w-full rounded-xl border p-4 text-right hover:border-brand hover:bg-accent">
              <div className="flex items-center gap-2 font-semibold"><Target className="h-4 w-4 text-brand" /> اختبار القيادات الطلابية</div>
            </button>
          )}
          {examTypes.map((e) => (
            <button key={e.key} onClick={() => chooseExam(e.key)}
              className="flex w-full items-center gap-3 rounded-xl border p-4 text-right hover:border-brand hover:bg-accent">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand/8 text-brand"><Target className="h-5 w-5" /></div>
              <div className="flex-1">
                <div className="font-semibold">{e.name}</div>
                {e.description && <div className="text-[11px] text-muted-foreground">{e.description}</div>}
              </div>
              <ArrowLeft className="h-4 w-4 text-brand" />
            </button>
          ))}
        </div>
        <button onClick={() => setStep("form")} className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline">
          <ArrowRight className="h-4 w-4" /> رجوع للبيانات
        </button>
      </div>
    </Center>
  );

  // اختيار المسمّيات المرغوبة + هل سبق التكليف (لاختبار القيادات)
  if (step === "roles") return (
    <Center>
      <div className="w-full max-w-md">
        <Header />
        <h2 className="font-display text-xl font-extrabold">المهام التي ترغب أن تُكلّف بها</h2>
        <p className="mt-1 text-sm text-muted-foreground">اختر المسمّيات التي تودّ الترشّح لها. لن تُرشَّح لأي مهمة لم تخترها.</p>
        <div className="mt-4 space-y-2">
          {roles.map((t) => {
            const on = selectedRoles.includes(t);
            return (
              <div key={t} className={`rounded-xl border p-3 ${on ? "border-brand bg-brand/5" : ""}`}>
                <button onClick={() => toggleRole(t)} className="flex w-full items-center gap-2 text-right">
                  <span className={`grid h-5 w-5 place-items-center rounded border ${on ? "bg-brand text-white border-brand" : "bg-background"}`}>
                    {on && <CheckCircle2 className="h-3.5 w-3.5" />}
                  </span>
                  <span className="flex-1 font-semibold text-sm">{t}</span>
                </button>
                {on && (
                  <div className="mt-2 flex items-center gap-2 pr-7 text-[12px]">
                    <span className="text-muted-foreground">هل سبق أن كُلّفت بها؟</span>
                    <button onClick={() => setPriorMap((m) => ({ ...m, [t]: true }))}
                      className={`rounded-lg border px-3 h-8 font-semibold ${priorMap[t] === true ? "bg-brand text-white border-brand" : "hover:bg-accent"}`}>نعم</button>
                    <button onClick={() => setPriorMap((m) => ({ ...m, [t]: false }))}
                      className={`rounded-lg border px-3 h-8 font-semibold ${priorMap[t] === false ? "bg-brand text-white border-brand" : "hover:bg-accent"}`}>لا</button>
                  </div>
                )}
              </div>
            );
          })}
          {roles.length === 0 && <p className="text-sm text-muted-foreground">لا توجد مسمّيات معرّفة لهذه المدرسة بعد.</p>}
        </div>
        <div className="mt-5 flex items-center gap-2">
          <button onClick={proceedFromRoles}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-brand h-11 font-semibold text-white hover:bg-brand/90">
            <Play className="h-4 w-4" /> متابعة إلى الأسئلة
          </button>
          <button onClick={() => setStep("exam")} className="rounded-lg border px-4 h-11 text-sm font-semibold hover:bg-accent">رجوع</button>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">يمكنك المتابعة دون اختيار مسمّى، لكنك حينها لن تُرشَّح تلقائيًا لأي مهمة.</p>
      </div>
    </Center>
  );

  if (step === "test") return (
    <div className="min-h-screen bg-background soft-grid p-4 md:p-8">
      <Assessment onFinish={finish} onExit={() => setStep(selectedExam === "leadership" && roles.length > 0 ? "roles" : "exam")} />
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

  // مُنع من إعادة الاختبار خلال المدة — يطلب الإذن من المدرسة
  if (step === "blocked") return (
    <Center>
      <div className="w-full max-w-md text-center">
        <Header />
        <div className="rounded-2xl border bg-card p-6">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-amber-100 text-amber-700"><CalendarClock className="h-7 w-7" /></div>
          <h1 className="mt-3 font-display text-xl font-extrabold">سبق أن أدّيت الاختبار</h1>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
            {block.lastDate
              ? <>تظهر سجلاتنا أنك أدّيت الاختبار بتاريخ <span className="font-semibold text-foreground"><En>{block.lastDate}</En></span>. لا يمكن إعادة الاختبار خلال ثلاثة أشهر إلا بموافقة مدرستك.</>
              : "لا يمكن إعادة الاختبار خلال ثلاثة أشهر إلا بموافقة مدرستك."}
          </p>
          {reqSent ? (
            <div className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-success/10 px-4 py-3 text-sm font-semibold text-success">
              <CheckCircle2 className="h-4 w-4" /> تم إرسال طلبك — بانتظار موافقة المدرسة.
            </div>
          ) : (
            <button onClick={requestRetake} disabled={checking}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand px-6 h-11 font-semibold text-white hover:bg-brand/90 disabled:opacity-50">
              {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellRing className="h-4 w-4" />} طلب إعادة الاختبار من المدرسة
            </button>
          )}
          {err && <p className="mt-2 text-[12px] text-danger">{err}</p>}
          <button onClick={() => { setStep("form"); setErr(null); }} className="mt-3 block w-full text-xs text-muted-foreground hover:text-foreground">→ رجوع</button>
        </div>
      </div>
    </Center>
  );

  // صفحة الترحيب (جذّابة) قبل الدخول للاختبار
  if (step === "intro") return (
    <div className="min-h-screen bg-background soft-grid grid place-items-center p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-3xl border bg-white shadow-xl">
        {/* رأس بالهوية */}
        <div className="relative bg-gradient-to-tl from-brand to-brand-soft p-8 text-center text-white">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-2xl bg-white/15 ring-4 ring-white/10">
            <Gauge className="h-11 w-11" />
          </div>
          <h1 className="mt-4 font-display text-2xl font-extrabold">نظام مؤشر</h1>
          <div className="text-sm text-white/85">لقياس المهارات الطلابية</div>
          <div className="mx-auto mt-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-sm font-semibold">
            <School className="h-4 w-4" /> {schoolName}
          </div>
          <div className="mt-2 text-xs font-semibold text-white/80">مركز التدريب والتطوير</div>
        </div>

        {/* محتوى */}
        <div className="p-6 text-center">
          <h2 className="font-display text-xl font-extrabold text-slate-800">مقياس القيادة والسلوك</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
            مرحبًا بك! هذا المقياس يساعد مدرستك على اكتشاف مهاراتك القيادية وترشيحك للأدوار الأنسب لك بالقياس العلمي لا بالانطباع.
          </p>
          <div className="mx-auto mt-4 grid max-w-md gap-2 sm:grid-cols-3">
            {[
              { n: "٣٥", l: "موقفًا واقعيًا" },
              { n: "٥", l: "محاور قيادية" },
              { n: "~١٢", l: "دقيقة" },
            ].map((c) => (
              <div key={c.l} className="rounded-xl border bg-slate-50 p-3">
                <div className="font-display text-xl font-extrabold text-brand">{c.n}</div>
                <div className="text-[11px] text-slate-500">{c.l}</div>
              </div>
            ))}
          </div>
          <div className="mx-auto mt-3 flex max-w-md items-center justify-center gap-1.5 rounded-lg bg-brand/5 px-3 py-2 text-[12px] text-brand">
            <Award className="h-3.5 w-3.5" /> لا توجد إجابة صحيحة أو خاطئة — اختر الأقرب إليك بصدق.
          </div>
          <button onClick={() => setStep("form")}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand px-8 h-12 font-bold text-white shadow-sm hover:bg-brand/90">
            <Play className="h-5 w-5" /> المتابعة
          </button>
        </div>
      </div>
    </div>
  );

  // نموذج البيانات
  return (
    <Center>
      <div className="w-full max-w-sm">
        <Header />
        {step === "form" && (
          <div className="rounded-2xl border bg-card p-5">
            <h2 className="font-display text-lg font-extrabold">بياناتك</h2>
            <p className="mt-1 text-sm text-muted-foreground">تظهر هذه البيانات لمعلمك مع نتيجتك.</p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">الاسم الرباعي</label>
                <input className={inp} placeholder="الاسم الأول واسم الأب والجد والعائلة" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">الصف</label>
                  <select className={inp} value={grade} onChange={(e) => { setGrade(e.target.value); setClassNum(""); }}>
                    <option value="">اختر الصف…</option>
                    {grades.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">الفصل</label>
                  <select className={inp} value={classNum} onChange={(e) => setClassNum(e.target.value)}>
                    <option value="">اختر الفصل…</option>
                    {CLASS_NUMS.map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              </div>
              {classMissing && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>لا يوجد فصل باسم «{className}» مسجّل في مدرستك. تأكّد من اختيار الصف والفصل الصحيحين قبل المتابعة.</span>
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">رقم الهوية <span className="font-normal text-muted-foreground/70">(اختياري)</span></label>
                <input className={inp} dir="ltr" inputMode="numeric" placeholder="رقم الهوية الوطنية / الإقامة"
                  value={nationalId} onChange={(e) => setNationalId(e.target.value.replace(/[^0-9]/g, ""))} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">رقم الجوال <span className="font-normal text-muted-foreground/70">(اختياري)</span></label>
                <input className={inp} dir="ltr" inputMode="numeric" placeholder="05xxxxxxxx"
                  value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ""))} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">البريد الإلكتروني <span className="font-normal text-muted-foreground/70">(اختياري)</span></label>
                <input className={inp} dir="ltr" type="email" placeholder="name@example.com"
                  value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              {err && <p className="text-[12px] text-danger text-center">{err}</p>}
              <button disabled={name.trim().split(/\s+/).filter(Boolean).length < 3 || checking} onClick={startTest}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-brand h-11 font-semibold text-white hover:bg-brand/90 disabled:opacity-50">
                {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} ابدأ المقياس
              </button>
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
