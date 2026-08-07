import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import {
  MISSIONS, IND_REQUESTS, ME_ID, CANDIDATES, TEACHERS, CLASSES,
  computeMatch, newStudent,
  type Mission, type OperatingMode, type ScopeLevel, type IndReq, type AxisKey,
  type Candidate, type Teacher, type SchoolClass,
} from "@/data/mock";

export interface AppSettings {
  scope: ScopeLevel;
  lang: "ar" | "en";
  maxTasks: number;
  autoApprove: boolean;
  alertPct: number;
}

export interface Toast { id: number; text: string; tone: "success" | "info" | "danger" }

interface Store {
  // الحالة
  mode: OperatingMode;
  hybrid: boolean;
  settings: AppSettings;
  missions: Mission[];
  assigned: Record<string, string[]>;   // missionId -> [candidateId]
  indReqs: IndReq[];
  toasts: Toast[];
  // الإجراءات
  toast: (text: string, tone?: Toast["tone"]) => void;
  dismissToast: (id: number) => void;
  addMission: (m: {
    title: string; scopeType: ScopeLevel; seats: number; mode: OperatingMode;
  }) => void;
  assignCandidate: (missionId: string, candId: string, name: string) => void;
  resolveIndReq: (id: string, approved: boolean, name: string) => void;
  saveSettings: (s: { mode: OperatingMode; hybrid: boolean; settings: AppSettings }) => void;
  // دورة الطالب المُسجَّل (me)
  meAssessed: boolean;
  applyToMission: (missionId: string) => void;
  completeAssessment: () => number;   // يُرجع عدد المهام التي رُشِّح لها تلقائيًا (الوضع ب)
  isMeIn: (missionId: string) => boolean;
  isMeAssigned: (missionId: string) => boolean;
  // إدارة المدرسة
  students: Candidate[];
  teachers: Teacher[];
  classes: SchoolClass[];
  addStudent: (s: { name: string; grade: string; className: string }) => void;
  addTeacher: (t: { name: string; role: string }) => void;
  addClass: (c: { name: string; grade: string; homeroom: string }) => void;
  rankMission: (m: Mission) => Candidate[];
  studentMissionsFor: (studentId: string) => { mission: Mission; rank: number; match: number; seat: boolean }[];
}

const Ctx = createContext<Store | null>(null);
export const useSlis = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useSlis must be used within SlisProvider");
  return c;
};

const EVEN: Record<AxisKey, number> = { org: 20, lead: 20, comm: 20, firm: 20, init: 20 };
let mid = 100;
let tid = 1;

export interface StoreSeed {
  mode?: OperatingMode;
  missions?: Mission[];
  assigned?: Record<string, string[]>;
  indReqs?: IndReq[];
  students?: Candidate[];
  teachers?: Teacher[];
  classes?: SchoolClass[];
}

export function SlisProvider({ children, seed }: { children: ReactNode; seed?: StoreSeed }) {
  const [mode, setMode] = useState<OperatingMode>(seed?.mode ?? "B");
  const [hybrid, setHybrid] = useState(false);
  const [settings, setSettings] = useState<AppSettings>({
    scope: "school", lang: "ar", maxTasks: 3, autoApprove: true, alertPct: 25,
  });
  const [missions, setMissions] = useState<Mission[]>(seed?.missions ?? MISSIONS);
  const [assigned, setAssigned] = useState<Record<string, string[]>>(seed?.assigned ?? {});
  const [indReqs, setIndReqs] = useState<IndReq[]>(seed?.indReqs ?? IND_REQUESTS);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [meAssessed, setMeAssessed] = useState(false);
  const [students, setStudents] = useState<Candidate[]>(seed?.students ?? CANDIDATES);
  const [teachers, setTeachers] = useState<Teacher[]>(seed?.teachers ?? TEACHERS);
  const [classes, setClasses] = useState<SchoolClass[]>(seed?.classes ?? CLASSES);

  const toast = useCallback((text: string, tone: Toast["tone"] = "success") => {
    const id = tid++;
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);
  const dismissToast = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const addMission: Store["addMission"] = (m) => {
    const scopeLabel = m.scopeType === "school" ? "كامل المدرسة"
      : m.scopeType === "stage" ? "المرحلة الثانوية" : "صف/فصل محدّد";
    const nm: Mission = {
      id: `m${mid++}`, title: m.title, scopeType: m.scopeType, scopeLabel,
      mode: m.mode, seats: m.seats, supervisor: "أ. سعد المالكي", status: "open",
      applicants: 0, eligible: 214, createdAt: "1446/03/01",
      weights: { ...EVEN }, candidateIds: [],
    };
    setMissions((list) => [nm, ...list]);
    toast(`أُنشئت المهمة «${m.title}» بنجاح`);
  };

  const assignCandidate: Store["assignCandidate"] = (missionId, candId, name) => {
    setAssigned((a) => {
      const cur = a[missionId] || [];
      if (cur.includes(candId)) return a;
      return { ...a, [missionId]: [...cur, candId] };
    });
    setMissions((list) => list.map((m) => m.id === missionId ? { ...m, status: "trial" } : m));
    toast(`اعتُمد ${name} للتكليف التجريبي`);
  };

  const resolveIndReq: Store["resolveIndReq"] = (id, approved, name) => {
    setIndReqs((r) => r.filter((x) => x.id !== id));
    toast(approved ? `تمت الموافقة على اختبار ${name}` : `رُفض طلب ${name}`,
      approved ? "success" : "danger");
  };

  const saveSettings: Store["saveSettings"] = ({ mode, hybrid, settings }) => {
    setMode(mode); setHybrid(hybrid); setSettings(settings);
    toast("حُفظت الإعدادات وطُبّقت على المدرسة");
  };

  // ===== دورة الطالب المُسجَّل =====
  const applyToMission: Store["applyToMission"] = (missionId) => {
    setMissions((list) => list.map((m) => {
      if (m.id !== missionId || m.candidateIds.includes(ME_ID)) return m;
      return { ...m, candidateIds: [...m.candidateIds, ME_ID], applicants: m.applicants + 1 };
    }));
    toast("تم تقديم ترشّحك للمهمة بنجاح");
  };

  const completeAssessment: Store["completeAssessment"] = () => {
    setMeAssessed(true);
    let n = 0;
    if (mode === "B") {
      // الوضع (ب): توزيع تلقائي على المهام المتاحة
      setMissions((list) => list.map((m) => {
        if (!["open", "screening"].includes(m.status) || m.candidateIds.includes(ME_ID)) return m;
        n++;
        return { ...m, candidateIds: [...m.candidateIds, ME_ID], applicants: m.applicants + 1 };
      }));
    }
    return n;
  };

  const isMeIn: Store["isMeIn"] = (missionId) =>
    !!missions.find((m) => m.id === missionId)?.candidateIds.includes(ME_ID);
  const isMeAssigned: Store["isMeAssigned"] = (missionId) =>
    (assigned[missionId] || []).includes(ME_ID);

  // ===== إدارة المدرسة =====
  let sid = students.length;
  const addStudent: Store["addStudent"] = ({ name, grade, className }) => {
    const s = newStudent(`ns${sid++}`, name, grade, className);
    setStudents((list) => [s, ...list]);
    toast(`أُضيف الطالب ${name} — بانتظار أداء المقياس`);
  };
  const addTeacher: Store["addTeacher"] = ({ name, role }) => {
    setTeachers((list) => [{ id: `nt${list.length}`, name, role }, ...list]);
    toast(`أُضيف ${name} (${role})`);
  };
  const addClass: Store["addClass"] = ({ name, grade, homeroom }) => {
    setClasses((list) => [{ id: `nc${list.length}`, name, grade, homeroom, students: 0 }, ...list]);
    toast(`أُضيف الفصل ${name}`);
  };

  const rankMission: Store["rankMission"] = (m) =>
    m.candidateIds
      .map((id) => students.find((c) => c.id === id))
      .filter((c): c is Candidate => !!c)
      .map((c) => ({ ...c, match: computeMatch(c, m) }))
      .sort((a, b) => b.match - a.match);

  const studentMissionsFor: Store["studentMissionsFor"] = (studentId) => {
    const out: { mission: Mission; rank: number; match: number; seat: boolean }[] = [];
    missions.forEach((m) => {
      if (!m.candidateIds.includes(studentId)) return;
      const r = rankMission(m);
      const idx = r.findIndex((c) => c.id === studentId);
      if (idx >= 0) out.push({ mission: m, rank: idx + 1, match: r[idx].match, seat: idx < m.seats });
    });
    return out.sort((a, b) => b.match - a.match);
  };

  return (
    <Ctx.Provider value={{
      mode, hybrid, settings, missions, assigned, indReqs, toasts,
      toast, dismissToast, addMission, assignCandidate, resolveIndReq, saveSettings,
      meAssessed, applyToMission, completeAssessment, isMeIn, isMeAssigned,
      students, teachers, classes, addStudent, addTeacher, addClass, rankMission, studentMissionsFor,
    }}>
      {children}
    </Ctx.Provider>
  );
}
