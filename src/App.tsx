import { useEffect, useState } from "react";
import { Sidebar, type PageKey } from "@/components/layout/Sidebar";
import { Topbar, type Role } from "@/components/layout/Topbar";
import { Dashboard } from "@/pages/Dashboard";
import { Missions } from "@/pages/Missions";
import { MissionDetail } from "@/pages/MissionDetail";
import { StudentApp } from "@/pages/student/StudentApp";
import { Students } from "@/pages/Students";
import { SchoolAdmin } from "@/pages/SchoolAdmin";
import { QuestionsBank } from "@/pages/QuestionsBank";
import { Quota } from "@/pages/Quota";
import { Governance } from "@/pages/Governance";
import { Reports } from "@/pages/Reports";
import { Settings as SettingsPage } from "@/pages/Settings";
import { CentralApp } from "@/pages/central/CentralApp";
import { Login } from "@/pages/Login";
import { SlisProvider, type StoreSeed } from "@/store";
import { Toaster } from "@/components/Toaster";
import { AuthProvider, useAuth, type LiveRole } from "@/lib/auth";
import { fetchSchoolSeed, fetchCentralSeed, type CentralSeed } from "@/lib/live";
import { dbResolveAppeal, dbReviewAppeal } from "@/lib/api";
import { useSlis } from "@/store";
import { Loader2, LogOut, AlertCircle } from "lucide-react";

const CRUMBS: Record<PageKey, string> = {
  dashboard: "لوحة المدرسة", missions: "المهام القيادية", students: "الطلاب",
  school: "إدارة المدرسة", questions: "مستودع الأسئلة", reports: "التقارير", quota: "الحصص",
  governance: "الحوكمة", settings: "الإعدادات",
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

  return <CentralApp data={data} userName={userName} onResolveAppeal={onResolveAppeal} onReviewAppeal={onReviewAppeal} />;
}

// ===== الهيكل الرئيسي (يعمل في وضع تجريبي أو حيّ) =====
function Shell({ initialRole, locked, onSignOut, userName }:
  { initialRole: Role; locked: boolean; onSignOut?: () => void; userName?: string }) {
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
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar page={page} onNavigate={goto} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar role={role} onRole={setRole} crumb={crumb} locked={locked} onSignOut={onSignOut} userName={userName} />
        <main className="flex-1 p-4 md:p-6 soft-grid">
          <div className="mx-auto max-w-6xl">
            {page === "dashboard" && <Dashboard onOpenMissions={() => setPage("missions")} />}
            {page === "missions" && !missionId && <Missions onOpenMission={openMission} />}
            {page === "missions" && missionId && (
              <MissionDetail missionId={missionId} onBack={() => setMissionId(null)} onOpenStudent={openStudent} />
            )}
            {page === "students" && <Students initialStudentId={studentId} onConsumed={() => setStudentId(null)} />}
            {page === "school" && <SchoolAdmin />}
            {page === "questions" && <QuestionsBank />}
            {page === "quota" && <Quota />}
            {page === "governance" && <Governance />}
            {page === "reports" && <Reports />}
            {page === "settings" && <SettingsPage />}
          </div>
        </main>
      </div>
      <Toaster />
    </div>
  );
}

const ROLE_MAP: Record<LiveRole, Role> = { central: "central", supervisor: "supervisor", student: "student" };

function LiveApp() {
  const { identity, signOut, email } = useAuth();
  const [seed, setSeed] = useState<StoreSeed | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        if (identity?.schoolId) setSeed(await fetchSchoolSeed(identity.schoolId));
        else setSeed({});
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
    <SlisProvider seed={seed} live meStudentId={identity?.studentId}>
      <Shell initialRole={ROLE_MAP[identity!.role]} locked onSignOut={signOut} userName={identity?.name || email || ""} />
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
  return <LiveApp />;
}

export default function App() {
  return (
    <AuthProvider>
      <Root />
    </AuthProvider>
  );
}
