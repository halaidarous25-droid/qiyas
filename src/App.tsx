import { useEffect, useState } from "react";
import { Sidebar, type PageKey } from "@/components/layout/Sidebar";
import { Topbar, type Role } from "@/components/layout/Topbar";
import { BrandBanner } from "@/components/layout/BrandBanner";
import { Dashboard } from "@/pages/Dashboard";
import { Missions } from "@/pages/Missions";
import { MissionDetail } from "@/pages/MissionDetail";
import { StudentApp } from "@/pages/student/StudentApp";
import { Students } from "@/pages/Students";
import { SchoolAdmin } from "@/pages/SchoolAdmin";
import { Quota } from "@/pages/Quota";
import { Governance } from "@/pages/Governance";
import { Reports } from "@/pages/Reports";
import { Settings as SettingsPage } from "@/pages/Settings";
import { Profile } from "@/pages/Profile";
import { PublicAssessment } from "@/pages/PublicAssessment";
import { CentralApp } from "@/pages/central/CentralApp";
import { Login } from "@/pages/Login";
import { SlisProvider, type StoreSeed } from "@/store";
import { Toaster } from "@/components/Toaster";
import { AuthProvider, useAuth, type LiveRole } from "@/lib/auth";
import { fetchSchoolSeed, fetchCentralSeed, type CentralSeed } from "@/lib/live";
import { dbResolveAppeal, dbReviewAppeal, dbSetSchoolStatus, fetchRoleCaps, dbUpdateSchool, completeFirstLoginChange } from "@/lib/api";
import { useSlis } from "@/store";
import { Loader2, LogOut, AlertCircle, KeyRound } from "lucide-react";

const CRUMBS: Record<PageKey, string> = {
  dashboard: "لوحة المدرسة", missions: "المهام القيادية", students: "الطلاب",
  school: "إدارة المدرسة", questions: "مستودع الأسئلة", reports: "التقارير", quota: "الحصص",
  governance: "الحوكمة", settings: "الإعدادات", profile: "ملفي الشخصي",
};

// ===== لوحة الإدارة المركزية الحيّة (كل المدارس) =====
function LiveCentral({ userName }: { userName?: string }) {
  const { toast } = useSlis();
  const [data, setData] = useState<CentralSeed | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    try { setData(await fetchCentralSeed()); setErr(null); }
    catch (e: any) { setErr(e?.message || "تعذّر تحميل بيانات المنصة"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const decider = userName || "مدير النظام المركزي";
  const onResolveAppeal = async (id: string) => {
    try { await dbResolveAppeal(id, decider); await load(); toast("حُسم التظلّم وسُجّل المُقرِّر"); }
    catch (e: any) { toast(`تعذّر حسم التظلّم: ${e.message || e}`, "danger"); }
  };
  const onReviewAppeal = async (id: string) => {
    try { await dbReviewAppeal(id, decider); await load(); toast("استُلم التظلّم للمراجعة", "info"); }
    catch (e: any) { toast(`تعذّرت المعالجة: ${e.message || e}`, "danger"); }
  };
  const onSetSchoolStatus = async (schoolId: string, status: string) => {
    try { await dbSetSchoolStatus(schoolId, status); await load(); toast(status === "active" ? "اعتُمدت المدرسة" : "حُدّثت حالة المدرسة"); }
    catch (e: any) { toast(`تعذّر التحديث: ${e.message || e}`, "danger"); }
  };
  const onUpdateSchool = async (schoolId: string, patch: { name?: string; city?: string; address?: string; email?: string; phone?: string; stage?: string }) => {
    try { await dbUpdateSchool(schoolId, patch); await load(); toast("حُدّثت معلومات المدرسة"); }
    catch (e: any) { toast(`تعذّر التحديث: ${e.message || e}`, "danger"); }
  };
  const onDeleteSchool = async (schoolId: string) => {
    try { await dbSetSchoolStatus(schoolId, "deleted"); await load(); toast("حُذفت المدرسة (يمكن استرجاعها من قاعدة البيانات)"); }
    catch (e: any) { toast(`تعذّر الحذف: ${e.message || e}`, "danger"); }
  };

  if (loading) return (
    <div className="grid min-h-screen place-items-center bg-background">
      <div className="text-center text-muted-foreground">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-brand" />
        <div className="mt-3 text-sm">جارٍ تحميل بيانات المنصة…</div>
      </div>
    </div>
  );
  if (err) return (
    <div className="grid min-h-screen place-items-center bg-background p-6">
      <div className="max-w-sm text-center">
        <AlertCircle className="mx-auto h-10 w-10 text-danger" />
        <div className="mt-3 font-semibold">تعذّر تحميل بيانات المنصة</div>
        <div className="mt-1 text-sm text-muted-foreground">{err}</div>
      </div>
    </div>
  );

  return <CentralApp data={data} userName={userName} onResolveAppeal={onResolveAppeal} onReviewAppeal={onReviewAppeal} onSetSchoolStatus={onSetSchoolStatus} onUpdateSchool={onUpdateSchool} onDeleteSchool={onDeleteSchool} onReload={load} />;
}

// ===== الهيكل الرئيسي (يعمل في وضع تجريبي أو حيّ) =====
function Shell({ initialRole, locked, onSignOut, userName, avatarUrl }:
  { initialRole: Role; locked: boolean; onSignOut?: () => void; userName?: string; avatarUrl?: string | null }) {
  const { schoolInfo } = useSlis();
  const [page, setPage] = useState<PageKey>("dashboard");
  const [role, setRole] = useState<Role>(initialRole);
  const [missionId, setMissionId] = useState<string | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);

  const openMission = (id: string) => { setMissionId(id); setPage("missions"); };
  const openStudent = (id: string) => { setStudentId(id); setMissionId(null); setPage("students"); };
  const goto = (p: PageKey) => { setPage(p); setMissionId(null); setStudentId(null); };
  const crumb = missionId && page === "missions" ? "تفاصيل المهمة" : CRUMBS[page];

  if (role === "student" || role === "central") {
    return (
      <div>
        <BrandBanner schoolName={role === "student" ? (schoolInfo.name || undefined) : undefined} />
        <div className="fixed left-3 top-3 z-50">
          {locked
            ? <button onClick={onSignOut} className="flex items-center gap-1.5 rounded-lg border bg-card/90 px-3 h-9 text-xs font-semibold shadow-sm backdrop-blur hover:bg-accent"><LogOut className="h-3.5 w-3.5" /> خروج</button>
            : <button onClick={() => setRole("supervisor")} className="rounded-lg border bg-card/90 px-3 h-9 text-xs font-semibold shadow-sm backdrop-blur hover:bg-accent">← العودة لعرض المشرف</button>}
        </div>
        {role === "student"
          ? <StudentApp />
          : (locked ? <LiveCentral userName={userName} /> : <CentralApp />)}
        <Toaster />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <BrandBanner schoolName={schoolInfo.name || undefined} />
      <div className="flex">
      <Sidebar page={page} onNavigate={goto} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar role={role} onRole={setRole} crumb={crumb} locked={locked} onSignOut={onSignOut} userName={userName} avatarUrl={avatarUrl} onProfile={() => goto("profile")} schoolName={schoolInfo.name} />
        <main className="flex-1 p-4 md:p-6 soft-grid">
          <div className="mx-auto max-w-6xl">
            {page === "dashboard" && <Dashboard onOpenMissions={() => setPage("missions")} />}
            {page === "missions" && !missionId && <Missions onOpenMission={openMission} />}
            {page === "missions" && missionId && (
              <MissionDetail missionId={missionId} onBack={() => setMissionId(null)} onOpenStudent={openStudent} />
            )}
            {page === "students" && <Students initialStudentId={studentId} onConsumed={() => setStudentId(null)} />}
            {page === "school" && <SchoolAdmin />}
            {page === "quota" && <Quota />}
            {page === "governance" && <Governance />}
            {page === "reports" && <Reports />}
            {page === "settings" && <SettingsPage />}
            {page === "profile" && <Profile />}
          </div>
        </main>
      </div>
      </div>
      <Toaster />
    </div>
  );
}

const ROLE_MAP: Record<LiveRole, Role> = { central: "central", supervisor: "supervisor", student: "student" };

function LiveApp() {
  const { identity, signOut, email } = useAuth();
  const [seed, setSeed] = useState<StoreSeed | undefined>(undefined);
  const [caps, setCaps] = useState<Record<string, string[]> | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        if (identity?.schoolId) setSeed(await fetchSchoolSeed(identity.schoolId));
        else setSeed({});
        // مصفوفة الصلاحيات التي يضبطها المركزي (تُجاوز الافتراضية عند وجودها)
        try { setCaps(await fetchRoleCaps()); } catch { /* الافتراضي عند التعذّر */ }
      } catch (e: any) { setErr(e?.message || "تعذّر تحميل البيانات"); }
      finally { setLoading(false); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return (
    <div className="grid min-h-screen place-items-center bg-background">
      <div className="text-center text-muted-foreground">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-brand" />
        <div className="mt-3 text-sm">جارٍ تحميل بيانات منصتك…</div>
      </div>
    </div>
  );
  if (err) return (
    <div className="grid min-h-screen place-items-center bg-background p-6">
      <div className="max-w-sm text-center">
        <AlertCircle className="mx-auto h-10 w-10 text-danger" />
        <div className="mt-3 font-semibold">تعذّر تحميل البيانات</div>
        <div className="mt-1 text-sm text-muted-foreground">{err}</div>
        <button onClick={signOut} className="mt-4 rounded-lg border px-4 h-10 text-sm font-semibold hover:bg-accent">تسجيل الخروج</button>
      </div>
    </div>
  );

  return (
    <SlisProvider seed={seed} live meStudentId={identity?.studentId} role={(identity?.memberRole as any) || undefined} capsOverride={caps}>
      <Shell initialRole={ROLE_MAP[identity!.role]} locked onSignOut={signOut} userName={identity?.name || email || ""} avatarUrl={identity?.avatarUrl} />
    </SlisProvider>
  );
}

function Root() {
  const { ready, demo, identity } = useAuth();
  if (!ready) return (
    <div className="grid min-h-screen place-items-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-brand" />
    </div>
  );
  if (demo) return <SlisProvider><Shell initialRole="supervisor" locked={false} /></SlisProvider>;
  if (!identity) return <Login />;
  if (identity.mustChange) return <FirstLoginChange />;
  return <LiveApp />;
}

// شاشة إلزامية لتغيير كلمة المرور عند أول دخول
function FirstLoginChange() {
  const { signOut, clearMustChange } = useAuth();
  const [p1, setP1] = useState(""); const [p2, setP2] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const ok = p1.length >= 6 && p1 === p2;
  const inp = "w-full rounded-lg border bg-background px-3 h-11 text-sm outline-none focus:border-brand";
  const save = async () => {
    setBusy(true); setErr(null);
    try { await completeFirstLoginChange(p1); clearMustChange(); }
    catch (e: any) { setErr(e?.message || "تعذّر تغيير كلمة المرور"); }
    finally { setBusy(false); }
  };
  return (
    <div className="grid min-h-screen place-items-center bg-background p-6">
      <div className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-xl">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-brand text-white"><KeyRound className="h-6 w-6" /></div>
        <h1 className="mt-3 text-center font-display text-xl font-extrabold">تغيير كلمة المرور</h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">لأول دخول، يجب تعيين كلمة مرور جديدة خاصة بك.</p>
        <div className="mt-5 space-y-3">
          <div><label className="mb-1 block text-xs font-semibold text-muted-foreground">كلمة المرور الجديدة</label>
            <input type="password" className={inp} value={p1} onChange={(e) => setP1(e.target.value)} placeholder="٦ أحرف على الأقل" autoComplete="new-password" /></div>
          <div><label className="mb-1 block text-xs font-semibold text-muted-foreground">تأكيد كلمة المرور</label>
            <input type="password" className={inp} value={p2} onChange={(e) => setP2(e.target.value)} placeholder="أعد كتابتها" autoComplete="new-password" /></div>
          {p2.length > 0 && p1 !== p2 && <p className="text-[11px] text-danger">كلمتا المرور غير متطابقتين.</p>}
          {err && <p className="text-[12px] text-danger">{err}</p>}
          <button onClick={save} disabled={!ok || busy}
            className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand h-11 text-sm font-semibold text-white hover:bg-brand/90 disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />} حفظ ومتابعة
          </button>
          <button onClick={signOut} className="w-full text-xs text-muted-foreground hover:text-foreground">تسجيل الخروج</button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  // رابط اختبار عام: ?assess=CODE — يُفتح بلا تسجيل دخول
  const params = new URLSearchParams(window.location.search);
  const assessCode = params.get("assess");
  if (assessCode) return <PublicAssessment code={assessCode} />;

  return (
    <AuthProvider>
      <Root />
    </AuthProvider>
  );
}
