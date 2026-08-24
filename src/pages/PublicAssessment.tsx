import { useEffect, useState } from "react";
import { Assessment } from "./student/Assessment";
import { scoreAssessment, leadershipStyle, type Answers, type AssessmentResult } from "@/lib/scoring";
import { publicGetSchool, publicSubmitAssessment, publicCheckEligibility, publicRequestRetake } from "@/lib/api";
import { AXES, classifyTrust } from "@/data/mock";
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
  // أهلية كل اختبار على حدة (تُفحص عند اختيار الاختبار)
  type Elig = { eligible: boolean; lastDate?: string; nextDate?: string; pending?: boolean };
  const [examElig, setExamElig] = useState<Record<string, Elig>>({});
  const [eligLoading, setEligLoading] = useState(false);
  const [reqExam, setReqExam] = useState<Record<string, boolean>>({});
  // تعدّد الاختبارات ورغبات المسمّيات
  const [examTypes, setExamTypes] = useState<{ key: string; name: string; description?: string; state?: "active" | "later" | "off"; questions?: { id: string; text: string; options: { text: string; score: number }[] }[] }[]>([]);
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
        const firstActive = (r.examTypes || []).find((e) => (e.state ?? "active") === "active");
        if (firstActive) setSelectedExam(firstActive.key);
        setStep("intro");
      })
      .catch((e) => { setErr(e.message || "رمز غير صحيح"); setStep("invalid"); });
  }, [code]);

  // بعد بيانات الطالب: ننتقل لاختيار الاختبار ونفحص أهلية كل اختبار على حدة
  const startTest = async () => {
    setChecking(true); setErr(null);
    setStep("exam");
    setEligLoading(true);
    try {
      const list = (examTypes.length ? examTypes : [{ key: "leadership", name: "اختبار القيادات الطلابية", state: "active" as const }])
        .filter((e) => (e.state ?? "active") === "active"); // «لاحقًا» لا يحتاج فحص أهلية
      const results = await Promise.all(list.map((e) =>
        publicCheckEligibility({ code, nationalId: nationalId.trim(), name: name.trim(), grade, phone: phone.trim(), examType: e.key })
          .then((r) => [e.key, { eligible: r.eligible, lastDate: r.lastDate, nextDate: r.nextDate, pending: r.pending }] as [string, Elig])
          .catch(() => [e.key, { eligible: true }] as [string, Elig])));
      const map: Record<string, Elig> = {}; results.forEach(([k, v]) => (map[k] = v));
      setExamElig(map);
    } catch (e: any) { setErr(e.message || "تعذّر التحقق"); }
    finally { setEligLoading(false); setChecking(false); }
  };

  const requestRetakeFor = async (key: string) => {
    try {
      await publicRequestRetake({ code, nationalId: nationalId.trim(), name: name.trim(), grade, className, examType: key });
      setReqExam((m) => ({ ...m, [key]: true }));
    } catch (e: any) { setErr(e.message || "تعذّر إرسال الطلب"); }
  };

  // اختيار نوع الاختبار → القيادات تعرض المسمّيات، غيرها يذهب للأسئلة مباشرة (بشرط الأهلية)
  const chooseExam = (key: string) => {
    const exObj = examTypes.find((e) => e.key === key);
    if (exObj && (exObj.state ?? "active") !== "active") return; // «لاحقًا/غير نشط» — ممنوع الدخول للأسئلة
    if (examElig[key] && !examElig[key].eligible) return; // غير مؤهّل الآن
    setSelectedExam(key);
    if (key === "leadership" && roles.length > 0) setStep("roles");
    else setStep("test");
  };

  const proceedFromRoles = () => setStep("test");

  // إنهاء اختبار عام (غير القيادات) — تقييم مبدئي مؤقت حتى تُعتمد معايير الاختبار
  const finishGeneric = async (scores: number[]) => {
    const avg = scores.length ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length) : 0;
    const r: any = {
      axes: { org: avg, lead: avg, comm: avg, firm: avg, init: avg },
      competency: avg, behavior: avg, contradiction: 0, socialDesirability: 0,
      integrity: 0, emotional: 0, trust: classifyTrust(0, 0), experience: 0,
    };
    setResult(r);
    setBusy(true);
    try {
      await publicSubmitAssessment({ code, name: name.trim(), grade, className, nationalId: nationalId.trim(), phone: phone.trim(), email: email.trim(), examType: selectedExam, rolePrefs: [], result: r, answers: {} });
      setStep("done");
    } catch (e: any) { setErr(e.message || "تعذّر الإرسال"); setStep("done"); }
    finally { setBusy(false); }
  };

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
        <p className="mt-1 text-sm text-muted-foreground">حدّد الاختبار الذي تريد الدخول إليه. الاختبارات التي سبق أداؤها مؤخّرًا تظهر مدّة إعادتها.</p>
        {eligLoading && <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> جارٍ التحقق من سجلّك…</div>}
        <div className="mt-4 space-y-2.5">
          {(examTypes.length ? examTypes : [{ key: "leadership", name: "اختبار القيادات الطلابية", description: "", state: "active" as const }]).map((e) => {
            const el = examElig[e.key];
            const later = (e.state ?? "active") !== "active"; // «لاحقًا» — يظهر دون السماح بالدخول
            const blocked = !later && !!el && !el.eligible;
            const disabled = later || blocked;
            const sentReq = reqExam[e.key] || el?.pending;
            return (
              <div key={e.key} className={`rounded-xl border p-4 ${disabled ? "opacity-90" : ""}`}>
                <button onClick={() => chooseExam(e.key)} disabled={disabled}
                  className={`flex w-full items-center gap-3 text-right ${disabled ? "cursor-not-allowed" : "hover:opacity-90"}`}>
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand/8 text-brand"><Target className="h-5 w-5" /></div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{e.name}</span>
                      {later && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">لاحقًا</span>}
                    </div>
                    {e.description && <div className="text-[11px] text-muted-foreground">{e.description}</div>}
                  </div>
                  {!disabled && <ArrowLeft className="h-4 w-4 text-brand" />}
                </button>
                {later && (
                  <div className="mt-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
                    <div className="flex items-center gap-1.5"><CalendarClock className="h-4 w-4" /> هذا الاختبار سيكون متاحًا لاحقًا — لم تُفعّله مدرستك بعد.</div>
                  </div>
                )}
                {blocked && (
                  <div className="mt-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
                    <div className="flex items-center gap-1.5"><CalendarClock className="h-4 w-4" /> سبق أداؤك لهذا الاختبار{el?.lastDate ? ` بتاريخ ${el.lastDate}` : ""}.</div>
                    <div className="mt-0.5">يمكنك إعادته بعد <b>{el?.nextDate || "٣ أشهر"}</b>، أو رفع طلب لإعادته الآن بموافقة المدرسة.</div>
                    {sentReq ? (
                      <div className="mt-2 inline-flex items-center gap-1.5 font-semibold text-success"><CheckCircle2 className="h-4 w-4" /> تم إرسال طلب الإعادة — بانتظار الموافقة.</div>
                    ) : (
                      <button onClick={() => requestRetakeFor(e.key)}
                        className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 h-8 text-xs font-semibold text-white hover:bg-brand/90">
                        <BellRing className="h-3.5 w-3.5" /> طلب إعادة الاختبار
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
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

  if (step === "test") {
    const backTo = selectedExam === "leadership" && roles.length > 0 ? "roles" : "exam";
    if (selectedExam !== "leadership") {
      const examObj = examTypes.find((e) => e.key === selectedExam);
      return (
        <div className="min-h-screen bg-background soft-grid p-4 md:p-8">
          <GenericExam title={examObj?.name || "اختبار"} questions={examObj?.questions || []} onFinish={finishGeneric} onExit={() => setStep(backTo)} />
          {busy && <div className="fixed inset-0 grid place-items-center bg-black/30"><Loader2 className="h-8 w-8 animate-spin text-white" /></div>}
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-background soft-grid p-4 md:p-8">
        <Assessment onFinish={finish} onExit={() => setStep(backTo)} />
        {busy && <div className="fixed inset-0 grid place-items-center bg-black/30"><Loader2 className="h-8 w-8 animate-spin text-white" /></div>}
      </div>
    );
  }

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
          <h2 className="font-display text-xl font-extrabold text-slate-800">مقياس المهارات الطلابية والقيادية</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
            مرحبًا بك! هذا اختبار لقياس قدراتك القيادية لتولّي بعض المهام داخل المدرسة مثل: عريف فصل، مشرف نظام، طالب نظام. وهناك أيضًا اختبارات لقياس مهاراتك الطلابية الأكاديمية.
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

// عارض عام لاختبارات الكتالوج (غير القيادات) — يعرض الأسئلة ويجمع درجات الخيارات المختارة
function GenericExam({ title, questions, onFinish, onExit }:
  { title: string; questions: { id: string; text: string; options: { text: string; score: number }[] }[];
    onFinish: (scores: number[]) => void; onExit: () => void }) {
  const [picks, setPicks] = useState<Record<string, number>>({});
  const answered = questions.filter((q) => picks[q.id] !== undefined).length;
  const allDone = questions.length > 0 && answered === questions.length;
  const submit = () => {
    if (!allDone) return;
    onFinish(questions.map((q) => q.options[picks[q.id]]?.score ?? 0));
  };
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <button onClick={onExit} className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline">
          <ArrowRight className="h-4 w-4" /> رجوع
        </button>
        <span className="text-xs text-muted-foreground"><En>{answered}</En> / <En>{questions.length}</En></span>
      </div>
      <div className="rounded-2xl border bg-card p-5">
        <h1 className="font-display text-xl font-extrabold">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">اختر الإجابة الأقرب إليك في كل سؤال.</p>
        {questions.length === 0 && <p className="mt-4 text-sm text-muted-foreground">لا توجد أسئلة معرّفة لهذا الاختبار بعد.</p>}
        <div className="mt-4 space-y-4">
          {questions.map((q, qi) => (
            <div key={q.id} className="rounded-xl border p-4">
              <div className="mb-2 font-semibold text-sm"><En>{qi + 1}</En>. {q.text}</div>
              <div className="grid gap-2">
                {q.options.map((o, oi) => {
                  const on = picks[q.id] === oi;
                  return (
                    <button key={oi} onClick={() => setPicks((p) => ({ ...p, [q.id]: oi }))}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-right text-sm ${on ? "border-brand bg-brand/5 font-semibold" : "hover:bg-accent"}`}>
                      <span className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border ${on ? "border-brand" : ""}`}>
                        {on && <span className="h-2 w-2 rounded-full bg-brand" />}
                      </span>
                      <span className="flex-1">{o.text}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <button onClick={submit} disabled={!allDone}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand h-11 font-semibold text-white hover:bg-brand/90 disabled:opacity-50">
          <CheckCircle2 className="h-4 w-4" /> إنهاء وإرسال
        </button>
      </div>
    </div>
  );
}
