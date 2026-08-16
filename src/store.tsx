import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import {
  MISSIONS, IND_REQUESTS, ME_ID, CANDIDATES, TEACHERS, CLASSES,
  computeMatch, newStudent,
  type Mission, type OperatingMode, type ScopeLevel, type IndReq, type AxisKey, type AxisScores,
  type Candidate, type Teacher, type SchoolClass,
} from "@/data/mock";
import { fetchSchoolSeed, type LiveSubscription, type DevPlan } from "@/lib/live";
import * as api from "@/lib/api";
import { scoreAssessment } from "@/lib/scoring";

export interface AppSettings {
  scope: ScopeLevel;
  lang: "ar" | "en";
  maxTasks: number;
  autoApprove: boolean;
  alertPct: number;
}

const DEFAULT_SETTINGS: AppSettings = {
  scope: "school", lang: "ar", maxTasks: 3, autoApprove: true, alertPct: 25,
};

export interface Toast { id: number; text: string; tone: "success" | "info" | "danger" }

interface Store {
  // الحالة
  live: boolean;
  schoolId: string | null;
  mode: OperatingMode;
  hybrid: boolean;
  settings: AppSettings;
  subscription: LiveSubscription | null;
  missions: Mission[];
  assigned: Record<string, string[]>;   // missionId -> [candidateId]
  indReqs: IndReq[];
  toasts: Toast[];
  // الإجراءات
  toast: (text: string, tone?: Toast["tone"]) => void;
  dismissToast: (id: number) => void;
  addMission: (m: {
    title: string; scopeType: ScopeLevel; seats: number; mode: OperatingMode; weights?: AxisScores;
  }) => void;
  assignCandidate: (missionId: string, candId: string, name: string) => void;
  unassignCandidate: (missionId: string, candId: string, name: string) => void;
  nominateStudent: (missionId: string, candId: string, name: string) => void;
  updateMission: (missionId: string, patch: { title?: string; scopeType?: ScopeLevel; seats?: number; mode?: OperatingMode; weights?: AxisScores; status?: string }) => void;
  requestRetake: () => void;
  devPlans: Record<string, DevPlan>;
  saveDevPlan: (missionId: string, studentId: string, plan: DevPlan) => void;
  resolveIndReq: (id: string, approved: boolean, name: string) => void;
  saveSettings: (s: { mode: OperatingMode; hybrid: boolean; settings: AppSettings }) => void;
  // دورة الطالب المُسجَّل (me)
  me: Candidate | null;
  meAssessed: boolean;
  applyToMission: (missionId: string) => void;
  completeAssessment: (answers?: Record<string, number | boolean>) => number;   // يُرجع عدد المهام التي رُشِّح لها تلقائيًا (الوضع ب)
  isMeIn: (missionId: string) => boolean;
  isMeAssigned: (missionId: string) => boolean;
  // إدارة المدرسة
  students: Candidate[];
  teachers: Teacher[];
  classes: SchoolClass[];
  addStudent: (s: { name: string; grade: string; className: string }) => void;
  bulkAddStudents: (rows: { name: string; grade: string; className: string }[]) => Promise<number>;
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
  schoolId?: string;
  mode?: OperatingMode;
  hybrid?: boolean;
  settings?: Record<string, unknown> | null;
  subscription?: LiveSubscription | null;
  missions?: Mission[];
  assigned?: Record<string, string[]>;
  devPlans?: Record<string, DevPlan>;
  indReqs?: IndReq[];
  students?: Candidate[];
  teachers?: Teacher[];
  classes?: SchoolClass[];
}

export function SlisProvider({ children, seed, live, meStudentId }:
  { children: ReactNode; seed?: StoreSeed; live?: boolean; meStudentId?: string | null }) {
  const isLive = !!live;
  const schoolId = seed?.schoolId ?? null;
  const meId = meStudentId ?? ME_ID;

  const [mode, setMode] = useState<OperatingMode>(seed?.mode ?? "B");
  const [hybrid, setHybrid] = useState(seed?.hybrid ?? false);
  const [settings, setSettings] = useState<AppSettings>({
    ...DEFAULT_SETTINGS,
    ...((seed?.settings as Partial<AppSettings>) ?? {}),
  });
  const [subscription, setSubscription] = useState<LiveSubscription | null>(seed?.subscription ?? null);
  const [missions, setMissions] = useState<Mission[]>(seed?.missions ?? MISSIONS);
  const [assigned, setAssigned] = useState<Record<string, string[]>>(seed?.assigned ?? {});
  const [devPlans, setDevPlans] = useState<Record<string, DevPlan>>(seed?.devPlans ?? {});
  const [indReqs, setIndReqs] = useState<IndReq[]>(seed?.indReqs ?? IND_REQUESTS);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [meAssessed, setMeAssessed] = useState(
    (seed?.students ?? CANDIDATES).find((s) => s.id === meId)?.assessed ?? false,
  );
  const [students, setStudents] = useState<Candidate[]>(seed?.students ?? CANDIDATES);
  const [teachers, setTeachers] = useState<Teacher[]>(seed?.teachers ?? TEACHERS);
  const [classes, setClasses] = useState<SchoolClass[]>(seed?.classes ?? CLASSES);

  const toast = useCallback((text: string, tone: Toast["tone"] = "success") => {
    const id = tid++;
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);
  const dismissToast = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  // إعادة مزامنة الحالة من قاعدة البيانات بعد أي كتابة (الوضع الحيّ فقط)
  const resync = useCallback(async () => {
    if (!isLive || !schoolId) return;
    const s = await fetchSchoolSeed(schoolId);
    setMode(s.mode); setHybrid(s.hybrid);
    setSettings({ ...DEFAULT_SETTINGS, ...((s.settings as Partial<AppSettings>) ?? {}) });
    setSubscription(s.subscription);
    setMissions(s.missions); setAssigned(s.assigned); setIndReqs(s.indReqs);
    setDevPlans(s.devPlans);
    setStudents(s.students); setTeachers(s.teachers); setClasses(s.classes);
    setMeAssessed(s.students.find((x) => x.id === meId)?.assessed ?? false);
  }, [isLive, schoolId, meId]);

  const addMission: Store["addMission"] = (m) => {
    if (isLive && schoolId) {
      api.dbAddMission(schoolId, m)
        .then(() => resync())
        .then(() => toast(`أُنشئت المهمة «${m.title}» بنجاح`))
        .catch((e) => toast(`تعذّر إنشاء المهمة: ${e.message || e}`, "danger"));
      return;
    }
    const scopeLabel = m.scopeType === "school" ? "كامل المدرسة"
      : m.scopeType === "stage" ? "المرحلة الثانوية" : "صف/فصل محدّد";
    const nm: Mission = {
      id: `m${mid++}`, title: m.title, scopeType: m.scopeType, scopeLabel,
      mode: m.mode, seats: m.seats, supervisor: "أ. سعد المالكي", status: "open",
      applicants: 0, eligible: 214, createdAt: "1446/03/01",
      weights: m.weights ?? { ...EVEN }, candidateIds: [],
    };
    setMissions((list) => [nm, ...list]);
    toast(`أُنشئت المهمة «${m.title}» بنجاح`);
  };

  const assignCandidate: Store["assignCandidate"] = (missionId, candId, name) => {
    if (isLive && schoolId) {
      api.dbAssign(schoolId, missionId, candId)
        .then(() => resync())
        .then(() => toast(`اعتُمد ${name} للتكليف التجريبي`))
        .catch((e) => toast(`تعذّر الاعتماد: ${e.message || e}`, "danger"));
      return;
    }
    setAssigned((a) => {
      const cur = a[missionId] || [];
      if (cur.includes(candId)) return a;
      return { ...a, [missionId]: [...cur, candId] };
    });
    setMissions((list) => list.map((m) => m.id === missionId ? { ...m, status: "trial" } : m));
    toast(`اعتُمد ${name} للتكليف التجريبي`);
  };

  const unassignCandidate: Store["unassignCandidate"] = (missionId, candId, name) => {
    if (isLive && schoolId) {
      api.dbUnassign(missionId, candId)
        .then(() => resync())
        .then(() => toast(`أُلغي اعتماد ${name}`, "info"))
        .catch((e) => toast(`تعذّر الإلغاء: ${e.message || e}`, "danger"));
      return;
    }
    setAssigned((a) => ({ ...a, [missionId]: (a[missionId] || []).filter((x) => x !== candId) }));
    toast(`أُلغي اعتماد ${name}`, "info");
  };

  const nominateStudent: Store["nominateStudent"] = (missionId, candId, name) => {
    if (isLive && schoolId) {
      const mission = missions.find((m) => m.id === missionId);
      const student = students.find((s) => s.id === candId);
      if (!mission || !student) { toast("تعذّر الترشيح", "danger"); return; }
      api.dbApply(schoolId, mission, student, false)
        .then(() => resync())
        .then(() => toast(`رُشِّح ${name} للمهمة`))
        .catch((e) => toast(`تعذّر الترشيح: ${e.message || e}`, "danger"));
      return;
    }
    setMissions((list) => list.map((m) => {
      if (m.id !== missionId || m.candidateIds.includes(candId)) return m;
      return { ...m, candidateIds: [...m.candidateIds, candId], applicants: m.applicants + 1 };
    }));
    toast(`رُشِّح ${name} للمهمة`);
  };

  const updateMission: Store["updateMission"] = (missionId, patch) => {
    if (isLive && schoolId) {
      api.dbUpdateMission(missionId, patch)
        .then(() => resync())
        .then(() => toast("حُفظت تعديلات المهمة"))
        .catch((e) => toast(`تعذّر الحفظ: ${e.message || e}`, "danger"));
      return;
    }
    setMissions((list) => list.map((m) => {
      if (m.id !== missionId) return m;
      const scopeLabel = patch.scopeType
        ? (patch.scopeType === "school" ? "كامل المدرسة" : patch.scopeType === "stage" ? "المرحلة الثانوية" : "صف/فصل محدّد")
        : m.scopeLabel;
      return { ...m, ...patch, scopeType: patch.scopeType ?? m.scopeType, scopeLabel, weights: patch.weights ?? m.weights } as Mission;
    }));
    toast("حُفظت تعديلات المهمة");
  };

  const requestRetake: Store["requestRetake"] = () => {
    if (isLive && schoolId) {
      api.dbRequestRetake(schoolId, meId)
        .then(() => resync())
        .then(() => toast("أُرسل طلب إعادة المقياس — بانتظار موافقة المدرسة", "info"))
        .catch((e) => toast(`تعذّر إرسال الطلب: ${e.message || e}`, "danger"));
      return;
    }
    toast("أُرسل طلب إعادة المقياس — بانتظار موافقة المدرسة", "info");
  };

  const saveDevPlan: Store["saveDevPlan"] = (missionId, studentId, plan) => {
    const key = `${missionId}:${studentId}`;
    if (isLive && schoolId) {
      api.dbSaveDevelopmentPlan(missionId, studentId, plan)
        .then(() => setDevPlans((d) => ({ ...d, [key]: plan })))
        .then(() => toast("حُفظت خطة التطوير"))
        .catch((e) => toast(`تعذّر الحفظ: ${e.message || e}`, "danger"));
      return;
    }
    setDevPlans((d) => ({ ...d, [key]: plan }));
    toast("حُفظت خطة التطوير");
  };

  const resolveIndReq: Store["resolveIndReq"] = (id, approved, name) => {
    if (isLive) {
      api.dbResolveIndReq(id, approved, schoolId ?? undefined)
        .then(() => resync())
        .then(() => toast(approved ? `تمت الموافقة على اختبار ${name}` : `رُفض طلب ${name}`,
          approved ? "success" : "danger"))
        .catch((e) => toast(`تعذّرت المعالجة: ${e.message || e}`, "danger"));
      return;
    }
    setIndReqs((r) => r.filter((x) => x.id !== id));
    toast(approved ? `تمت الموافقة على اختبار ${name}` : `رُفض طلب ${name}`,
      approved ? "success" : "danger");
  };

  const saveSettings: Store["saveSettings"] = ({ mode, hybrid, settings }) => {
    if (isLive && schoolId) {
      api.saveSchoolSettings(schoolId, mode, hybrid, settings)
        .then(() => { setMode(mode); setHybrid(hybrid); setSettings(settings); })
        .then(() => toast("حُفظت الإعدادات وطُبّقت على المدرسة"))
        .catch((e) => toast(`تعذّر حفظ الإعدادات: ${e.message || e}`, "danger"));
      return;
    }
    setMode(mode); setHybrid(hybrid); setSettings(settings);
    toast("حُفظت الإعدادات وطُبّقت على المدرسة");
  };

  // ===== دورة الطالب المُسجَّل =====
  const applyToMission: Store["applyToMission"] = (missionId) => {
    if (isLive && schoolId) {
      const mission = missions.find((m) => m.id === missionId);
      const me = students.find((s) => s.id === meId);
      if (!mission || !me) { toast("تعذّر التقديم", "danger"); return; }
      api.dbApply(schoolId, mission, me, false)
        .then(() => resync())
        .then(() => toast("تم تقديم ترشّحك للمهمة بنجاح"))
        .catch((e) => toast(`تعذّر التقديم: ${e.message || e}`, "danger"));
      return;
    }
    setMissions((list) => list.map((m) => {
      if (m.id !== missionId || m.candidateIds.includes(meId)) return m;
      return { ...m, candidateIds: [...m.candidateIds, meId], applicants: m.applicants + 1 };
    }));
    toast("تم تقديم ترشّحك للمهمة بنجاح");
  };

  const completeAssessment: Store["completeAssessment"] = (answers) => {
    setMeAssessed(true);
    if (isLive && schoolId) {
      // حفظ محاولة القياس في قاعدة البيانات ثم التوزيع التلقائي في الوضع (ب)
      (async () => {
        try {
          if (answers) {
            const r = scoreAssessment(answers);
            await api.dbSaveAssessment(schoolId, meId, {
              axes: r.axes, competency: r.competency, behavior: r.behavior,
              integrity: r.integrity ?? 0, emotional: r.emotional ?? 0,
              contradiction: r.contradiction, socialDesirability: r.socialDesirability,
              trust: r.trust,
            }, answers);
          }
          if (mode === "B") {
            const me = students.find((s) => s.id === meId);
            const open = missions.filter((m) => ["open", "screening"].includes(m.status) && !m.candidateIds.includes(meId));
            if (me) for (const m of open) await api.dbApply(schoolId, m, me, true);
          }
          await resync();
          toast("حُفظت نتيجة المقياس بنجاح");
        } catch (e: any) {
          toast(`تعذّر حفظ المقياس: ${e.message || e}`, "danger");
        }
      })();
      // العدد التقريبي للمهام المتاحة للتوزيع (تحديث فوري للواجهة)
      return mode === "B"
        ? missions.filter((m) => ["open", "screening"].includes(m.status) && !m.candidateIds.includes(meId)).length
        : 0;
    }
    let n = 0;
    if (mode === "B") {
      setMissions((list) => list.map((m) => {
        if (!["open", "screening"].includes(m.status) || m.candidateIds.includes(meId)) return m;
        n++;
        return { ...m, candidateIds: [...m.candidateIds, meId], applicants: m.applicants + 1 };
      }));
    }
    return n;
  };

  const isMeIn: Store["isMeIn"] = (missionId) =>
    !!missions.find((m) => m.id === missionId)?.candidateIds.includes(meId);
  const isMeAssigned: Store["isMeAssigned"] = (missionId) =>
    (assigned[missionId] || []).includes(meId);

  // ===== إدارة المدرسة =====
  let sid = students.length;
  const addStudent: Store["addStudent"] = ({ name, grade, className }) => {
    if (isLive && schoolId) {
      api.dbAddStudent(schoolId, { name, grade, className })
        .then(() => resync())
        .then(() => toast(`أُضيف الطالب ${name} — بانتظار أداء المقياس`))
        .catch((e) => toast(`تعذّرت الإضافة: ${e.message || e}`, "danger"));
      return;
    }
    const s = newStudent(`ns${sid++}`, name, grade, className);
    setStudents((list) => [s, ...list]);
    toast(`أُضيف الطالب ${name} — بانتظار أداء المقياس`);
  };
  const bulkAddStudents: Store["bulkAddStudents"] = async (rows) => {
    if (!rows.length) return 0;
    if (isLive && schoolId) {
      try {
        await api.dbBulkAddStudents(schoolId, rows);
        await resync();
        toast(`استُورد ${rows.length} طالبًا بنجاح`);
        return rows.length;
      } catch (e: any) { toast(`تعذّر الاستيراد: ${e.message || e}`, "danger"); return 0; }
    }
    let base = students.length;
    const added = rows.map((r) => newStudent(`ns${base++}`, r.name, r.grade, r.className));
    setStudents((list) => [...added, ...list]);
    toast(`استُورد ${rows.length} طالبًا بنجاح`);
    return rows.length;
  };

  const addTeacher: Store["addTeacher"] = ({ name, role }) => {
    if (isLive && schoolId) {
      api.dbAddTeacher(schoolId, { name, role })
        .then(() => resync())
        .then(() => toast(`أُضيف ${name} (${role})`))
        .catch((e) => toast(`تعذّرت الإضافة: ${e.message || e}`, "danger"));
      return;
    }
    setTeachers((list) => [{ id: `nt${list.length}`, name, role }, ...list]);
    toast(`أُضيف ${name} (${role})`);
  };
  const addClass: Store["addClass"] = ({ name, grade, homeroom }) => {
    if (isLive && schoolId) {
      api.dbAddClass(schoolId, { name, grade, homeroom })
        .then(() => resync())
        .then(() => toast(`أُضيف الفصل ${name}`))
        .catch((e) => toast(`تعذّرت الإضافة: ${e.message || e}`, "danger"));
      return;
    }
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
      live: isLive, schoolId,
      mode, hybrid, settings, subscription, missions, assigned, indReqs, toasts,
      toast, dismissToast, addMission, assignCandidate, unassignCandidate, nominateStudent, updateMission, requestRetake,
      devPlans, saveDevPlan, resolveIndReq, saveSettings,
      me: students.find((s) => s.id === meId) ?? null,
      meAssessed, applyToMission, completeAssessment, isMeIn, isMeAssigned,
      students, teachers, classes, addStudent, bulkAddStudents, addTeacher, addClass, rankMission, studentMissionsFor,
    }}>
      {children}
    </Ctx.Provider>
  );
}
