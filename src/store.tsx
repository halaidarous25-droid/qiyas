import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import {
  MISSIONS, IND_REQUESTS, ME_ID, CANDIDATES, TEACHERS, CLASSES,
  computeMatch, newStudent,
  type Mission, type OperatingMode, type ScopeLevel, type IndReq, type AxisKey, type AxisScores,
  type Candidate, type Teacher, type SchoolClass,
} from "@/data/mock";
import { fetchSchoolSeed, type LiveSubscription, type DevPlan } from "@/lib/live";
import * as api from "@/lib/api";
import { scoreAssessment } from "@/lib/scoring";
import { can as canDo, type Role, type Cap } from "@/lib/perms";

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

export interface WeightPreset { name: string; weights: AxisScores }
// مسمّى قيادي في «قائمة المهام القيادية» — يغذّي إنشاء المهمة والمواءمة الذكية
export interface MissionRole {
  id: string;
  title: string;          // المسمّى (مثال: عريف فصل)
  description: string;    // وصف المهمة
  skills: string;         // المهارات المطلوبة
  duties: string;         // المهام المطلوبة
  weights: AxisScores;    // أوزان المحاور للمواءمة مع نتائج الطالب
  active?: boolean;       // مُفعّل؟ (المسمّيات غير المفعّلة لا تظهر في إنشاء المهام ولا رابط الطالب)
}

export interface Toast { id: number; text: string; tone: "success" | "info" | "danger" }

interface Store {
  // الحالة
  live: boolean;
  schoolId: string | null;
  tenantCode: string | null;
  role: Role;
  can: (cap: Cap) => boolean;
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
    title: string; scopeType: ScopeLevel; seats: number; mode: OperatingMode; weights?: AxisScores; scopeRef?: string; autoNominate?: boolean; nominationMode?: "scope" | "preference";
  }) => void;
  autoNominate: (missionId: string) => void;
  assignCandidate: (missionId: string, candId: string, name: string) => void;
  unassignCandidate: (missionId: string, candId: string, name: string) => void;
  nominateStudent: (missionId: string, candId: string, name: string) => void;
  removeCandidate: (missionId: string, candId: string, name: string) => void;
  setCandidateStatus: (missionId: string, candId: string, status: string) => void;
  updateMission: (missionId: string, patch: { title?: string; scopeType?: ScopeLevel; seats?: number; mode?: OperatingMode; weights?: AxisScores; status?: string; scopeRef?: string }) => void;
  requestRetake: () => void;
  devPlans: Record<string, DevPlan>;
  saveDevPlan: (missionId: string, studentId: string, plan: DevPlan) => void;
  resolveIndReq: (id: string, approved: boolean, name: string) => void;
  saveSettings: (s: { mode: OperatingMode; hybrid: boolean; settings: AppSettings }) => void;
  schoolInfo: { name: string; city: string; stage: string; address: string; email: string; phone: string };
  updateSchoolInfo: (patch: Partial<{ name: string; city: string; stage: string; address: string; email: string; phone: string }>) => void;
  presets: WeightPreset[];
  savePreset: (name: string, weights: AxisScores) => void;
  deletePreset: (name: string) => void;
  roles: MissionRole[];
  saveRole: (r: MissionRole) => void;
  deleteRole: (id: string) => void;
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
  addStudent: (s: { name: string; grade: string; className: string; nationalId?: string; email?: string; phone?: string }) => void;
  updateStudent: (id: string, patch: { name?: string; grade?: string; className?: string; nationalId?: string; email?: string; phone?: string }) => void;
  removeStudent: (id: string) => void;
  saveStudentNotes: (id: string, notes: string) => void;
  seenStudents: string[];                 // طلاب اطُّلع على ملفاتهم (لإنهاء تنبيه «اختبر حديثًا»)
  markStudentSeen: (id: string) => void;
  updateTeacher: (id: string, patch: { name?: string; role?: string; nationalId?: string; email?: string; phone?: string }) => void;
  removeTeacher: (id: string) => void;
  deleteMission: (id: string) => void;
  bulkAddStudents: (rows: { name: string; grade: string; className: string; nationalId?: string; email?: string; phone?: string }[]) => Promise<number>;
  addTeacher: (t: { name: string; role: string; nationalId?: string; email?: string; phone?: string }) => void;
  reload: () => void;   // إعادة تحميل بيانات المدرسة من قاعدة البيانات
  addClass: (c: { name: string; grade: string; homeroom: string }) => void;
  bulkCreateHomeroomMissions: () => void;   // إنشاء «عريف فصل» لكل فصل (مقعد واحد، بالرغبة، بأوزان المسمّى)
  updateClass: (id: string, patch: { name?: string; grade?: string; homeroom?: string }) => void;
  removeClass: (id: string) => void;
  rankMission: (m: Mission) => Candidate[];
  studentMissionsFor: (studentId: string) => { mission: Mission; rank: number; match: number; seat: boolean }[];
  studentMissionStats: (studentId: string) => { nominated: number; notNominated: number; assigned: number };
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
  schoolName?: string;
  schoolCity?: string;
  schoolStage?: string;
  schoolAddress?: string;
  schoolEmail?: string;
  schoolPhone?: string;
  tenantCode?: string | null;
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

export function SlisProvider({ children, seed, live, meStudentId, role, capsOverride }:
  { children: ReactNode; seed?: StoreSeed; live?: boolean; meStudentId?: string | null; role?: Role; capsOverride?: Record<string, string[]> | null }) {
  const isLive = !!live;
  const schoolId = seed?.schoolId ?? null;
  const meId = meStudentId ?? ME_ID;
  const effRole: Role = role ?? (isLive ? "teacher" : "demo");
  // تطبيق تجاوز الصلاحيات المركزي إن وُجد لهذا الدور، وإلا الافتراضي
  const can = (cap: Cap) =>
    capsOverride && capsOverride[effRole]
      ? capsOverride[effRole].includes(cap)
      : canDo(effRole, cap);

  const [mode, setMode] = useState<OperatingMode>(seed?.mode ?? "B");
  const [hybrid, setHybrid] = useState(seed?.hybrid ?? false);
  const [schoolInfo, setSchoolInfo] = useState({
    name: seed?.schoolName ?? "", city: seed?.schoolCity ?? "",
    stage: seed?.schoolStage ?? "الثانوية", address: seed?.schoolAddress ?? "",
    email: seed?.schoolEmail ?? "", phone: seed?.schoolPhone ?? "",
  });
  const [settings, setSettings] = useState<AppSettings>({
    ...DEFAULT_SETTINGS,
    ...((seed?.settings as Partial<AppSettings>) ?? {}),
  });
  const [presets, setPresets] = useState<WeightPreset[]>(
    ((seed?.settings as any)?.presets as WeightPreset[]) ?? [],
  );
  const [roles, setRoles] = useState<MissionRole[]>(
    ((seed?.settings as any)?.roles as MissionRole[]) ?? [],
  );
  const [subscription, setSubscription] = useState<LiveSubscription | null>(seed?.subscription ?? null);
  // طلاب اطُّلع على ملفاتهم — يُحفظ محليًا لكل مستخدم لإنهاء تنبيه «اختبر حديثًا»
  const SEEN_KEY = "qiyas_seen_students";
  const [seenStudents, setSeenStudents] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(SEEN_KEY) || "[]"); } catch { return []; }
  });
  const persistSeen = (arr: string[]) => { try { localStorage.setItem(SEEN_KEY, JSON.stringify(arr)); } catch { /* تجاهل */ } };
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
    setPresets(((s.settings as any)?.presets as WeightPreset[]) ?? []);
    setRoles(((s.settings as any)?.roles as MissionRole[]) ?? []);
    setSubscription(s.subscription);
    setMissions(s.missions); setAssigned(s.assigned); setIndReqs(s.indReqs);
    setDevPlans(s.devPlans);
    setStudents(s.students); setTeachers(s.teachers); setClasses(s.classes);
    setMeAssessed(s.students.find((x) => x.id === meId)?.assessed ?? false);
  }, [isLive, schoolId, meId]);

  // الطلاب المؤهّلون (أدّوا المقياس) ضمن نطاق معيّن
  // school = كل المدرسة · grade = صف دراسي (حسب grade) · class = فصل محدّد (حسب className)
  const inScope = (s: Candidate, scopeType: ScopeLevel, scopeRef?: string) =>
    scopeType === "school" || scopeType === "stage" ? true
      : scopeType === "grade" ? (scopeRef ? s.grade === scopeRef : true)
      : /* class */ (scopeRef ? s.className === scopeRef : true);
  const eligibleByScope = (scopeType: ScopeLevel, scopeRef?: string) =>
    students.filter((s) => s.assessed && inScope(s, scopeType, scopeRef));
  // هل رغب الطالب بهذا المسمّى؟
  const wantsRole = (s: Candidate, title: string) =>
    (s.rolePrefs || []).some((p) => p.role_title === title);
  // الطلاب المؤهّلون لمهمة حسب آلية ترشيحها: بالنطاق (الجميع) أو بالرغبة (من اختار المسمّى)
  const eligibleForMission = (title: string, scopeType: ScopeLevel, scopeRef: string | undefined, mode: "scope" | "preference") => {
    const base = eligibleByScope(scopeType, scopeRef);
    return mode === "preference" ? base.filter((s) => wantsRole(s, title)) : base;
  };

  const addMission: Store["addMission"] = (m) => {
    if (isLive && schoolId) {
      api.dbAddMission(schoolId, m)
        .then(async (created: any) => {
          let count = 0;
          if (m.autoNominate && created) {
            const missionObj = { id: created.id, weights: created.weights } as Mission;
            const elig = eligibleForMission(m.title, m.scopeType, m.scopeRef, m.nominationMode || "scope");
            for (const s of elig) { await api.dbApply(schoolId, missionObj, s, true); count++; }
          }
          await resync();
          toast(count > 0 ? `أُنشئت المهمة ورُشِّح ${count} طالبًا تلقائيًا` : `أُنشئت المهمة «${m.title}» بنجاح`);
        })
        .catch((e) => toast(`تعذّر إنشاء المهمة: ${e.message || e}`, "danger"));
      return;
    }
    const scopeLabel = m.scopeType === "school" ? "كامل المدرسة"
      : m.scopeType === "grade" ? (m.scopeRef ? `صف: ${m.scopeRef}` : "صف دراسي")
      : m.scopeType === "class" ? (m.scopeRef ? `فصل: ${m.scopeRef}` : "فصل محدّد")
      : "المرحلة الثانوية";
    const elig = m.autoNominate ? eligibleForMission(m.title, m.scopeType, m.scopeRef, m.nominationMode || "scope") : [];
    const nm: Mission = {
      id: `m${mid++}`, title: m.title, scopeType: m.scopeType, scopeLabel, scopeRef: m.scopeRef,
      mode: m.mode, seats: m.seats, supervisor: "أ. سعد المالكي", status: "open",
      applicants: elig.length, eligible: 214, createdAt: "1446/03/01",
      weights: m.weights ?? { ...EVEN }, candidateIds: elig.map((s) => s.id),
      nominationMode: m.nominationMode || "scope",
    };
    setMissions((list) => [nm, ...list]);
    toast(elig.length > 0 ? `أُنشئت المهمة ورُشِّح ${elig.length} طالبًا تلقائيًا` : `أُنشئت المهمة «${m.title}» بنجاح`);
  };

  const HOMEROOM_TITLE = "عريف فصل";
  const bulkCreateHomeroomMissions: Store["bulkCreateHomeroomMissions"] = () => {
    const role = roles.find((r) => r.title === HOMEROOM_TITLE && r.active !== false)
      || roles.find((r) => r.title === HOMEROOM_TITLE);
    if (!role) { toast("أضِف مسمّى «عريف فصل» في «المهام القيادية» أولًا لضبط أوزانه", "danger"); return; }
    if (classes.length === 0) { toast("لا توجد فصول مسجّلة لإنشاء المهام لها", "info"); return; }
    const weights = role.weights;
    const targets = classes.filter((c) => !missions.some((m) => m.title === HOMEROOM_TITLE && m.scopeType === "class" && m.scopeRef === c.name));
    const skipped = classes.length - targets.length;
    if (targets.length === 0) { toast(`جميع الفصول لديها مهمة «عريف فصل» مسبقًا (${skipped}) — لم يُنشأ شيء`, "info"); return; }

    if (isLive && schoolId) {
      (async () => {
        let created = 0;
        try {
          for (const c of targets) {
            const cm: any = await api.dbAddMission(schoolId, { title: HOMEROOM_TITLE, scopeType: "class", scopeRef: c.name, seats: 1, mode, weights, nominationMode: "preference" });
            const elig = eligibleForMission(HOMEROOM_TITLE, "class", c.name, "preference");
            for (const s of elig) await api.dbApply(schoolId, { id: cm.id, weights: cm.weights } as Mission, s, true);
            created++;
          }
          await resync();
          toast(`أُنشئت ${created} مهمة «عريف فصل»${skipped ? ` وتُخطّي ${skipped} موجودة مسبقًا` : ""}`);
        } catch (e: any) { toast(`تعذّر الإنشاء: ${e.message || e}`, "danger"); }
      })();
      return;
    }
    // وضع تجريبي
    const nm: Mission[] = targets.map((c, i) => {
      const elig = eligibleForMission(HOMEROOM_TITLE, "class", c.name, "preference");
      return {
        id: `mh${mid++}_${i}`, title: HOMEROOM_TITLE, scopeType: "class", scopeLabel: `فصل: ${c.name}`, scopeRef: c.name,
        mode, seats: 1, supervisor: "أ. سعد المالكي", status: "open", applicants: elig.length, eligible: 214,
        createdAt: "1446/03/01", weights, candidateIds: elig.map((s) => s.id), nominationMode: "preference",
      } as Mission;
    });
    setMissions((list) => [...nm, ...list]);
    toast(`أُنشئت ${nm.length} مهمة «عريف فصل»${skipped ? ` وتُخطّي ${skipped} موجودة مسبقًا` : ""}`);
  };

  const assignCandidate: Store["assignCandidate"] = (missionId, candId, name) => {
    const m = missions.find((x) => x.id === missionId);
    const cur = assigned[missionId] || [];
    // لا يُسمح بالتكليف إلا بعدد المقاعد
    if (m && !cur.includes(candId) && cur.length >= m.seats) {
      toast(`اكتمل عدد المقاعد (${m.seats}) لهذه المهمة — لا يمكن تكليف طالب إضافي`, "danger");
      return;
    }
    if (isLive && schoolId) {
      api.dbAssign(schoolId, missionId, candId)
        .then(() => resync())
        .then(() => toast(`كُلِّف ${name} بالمهمة`))
        .catch((e) => toast(`تعذّر التكليف: ${e.message || e}`, "danger"));
      return;
    }
    const nextCount = cur.includes(candId) ? cur.length : cur.length + 1;
    setAssigned((a) => {
      const c2 = a[missionId] || [];
      if (c2.includes(candId)) return a;
      return { ...a, [missionId]: [...c2, candId] };
    });
    setMissions((list) => list.map((x) => x.id === missionId
      ? { ...x, status: (m && nextCount >= m.seats ? "closed" : "screening") } : x));
    toast(`كُلِّف ${name} بالمهمة`);
  };

  const unassignCandidate: Store["unassignCandidate"] = (missionId, candId, name) => {
    if (isLive && schoolId) {
      api.dbUnassign(missionId, candId)
        .then(() => resync())
        .then(() => toast(`أُلغي اعتماد ${name}`, "info"))
        .catch((e) => toast(`تعذّر الإلغاء: ${e.message || e}`, "danger"));
      return;
    }
    setAssigned((a) => {
      const remaining = (a[missionId] || []).filter((x) => x !== candId);
      setMissions((list) => list.map((x) => x.id === missionId
        ? { ...x, status: (remaining.length === 0 ? "open" : "screening") } : x));
      return { ...a, [missionId]: remaining };
    });
    toast(`أُلغي تكليف ${name}`, "info");
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

  // الطلاب المؤهّلون ضمن نطاق المهمة (والذين أدّوا المقياس)
  const eligibleFor = (m: Mission) =>
    eligibleForMission(m.title, m.scopeType, m.scopeRef, m.nominationMode || "scope");

  const autoNominate: Store["autoNominate"] = (missionId) => {
    const m = missions.find((x) => x.id === missionId);
    if (!m) return;
    const byPref = (m.nominationMode || "scope") === "preference";
    const eligible = eligibleFor(m).filter((s) => !m.candidateIds.includes(s.id));
    if (eligible.length === 0) {
      toast(byPref
        ? "لا طلاب اختاروا هذا المسمّى ضمن النطاق (الترشيح بالرغبة يعتمد على اختيار الطالب في الرابط)"
        : "لا طلاب مؤهّلين للترشيح ضمن هذا النطاق (تأكد من أداء الطلاب للمقياس)", "info");
      return;
    }
    const doneMsg = byPref ? `رُشِّح ${eligible.length} طالبًا ممن اختاروا هذا المسمّى` : `رُشِّح ${eligible.length} طالبًا تلقائيًا حسب النطاق`;
    if (isLive && schoolId) {
      (async () => {
        try {
          for (const s of eligible) await api.dbApply(schoolId, m, s, true);
          await resync();
          toast(doneMsg);
        } catch (e: any) { toast(`تعذّر الترشيح التلقائي: ${e.message || e}`, "danger"); }
      })();
      return;
    }
    setMissions((list) => list.map((x) => x.id === missionId
      ? { ...x, candidateIds: [...new Set([...x.candidateIds, ...eligible.map((s) => s.id)])], applicants: x.applicants + eligible.length }
      : x));
    toast(doneMsg);
  };

  const removeCandidate: Store["removeCandidate"] = (missionId, candId, name) => {
    if (isLive && schoolId) {
      api.dbRemoveApplication(missionId, candId)
        .then(() => resync())
        .then(() => toast(`حُذف ${name} من المهمة`, "info"))
        .catch((e) => toast(`تعذّر الحذف: ${e.message || e}`, "danger"));
      return;
    }
    setMissions((list) => list.map((m) => m.id === missionId
      ? { ...m, candidateIds: m.candidateIds.filter((x) => x !== candId), applicants: Math.max(0, m.applicants - 1) } : m));
    setAssigned((a) => ({ ...a, [missionId]: (a[missionId] || []).filter((x) => x !== candId) }));
    toast(`حُذف ${name} من المهمة`, "info");
  };

  const setCandidateStatus: Store["setCandidateStatus"] = (missionId, candId, status) => {
    if (isLive && schoolId) {
      api.dbSetApplicationStatus(missionId, candId, status)
        .then(() => resync())
        .then(() => toast("حُدّثت حالة المرشّح"))
        .catch((e) => toast(`تعذّر التحديث: ${e.message || e}`, "danger"));
      return;
    }
    if (status === "assigned") setAssigned((a) => ({ ...a, [missionId]: [...new Set([...(a[missionId] || []), candId])] }));
    else setAssigned((a) => ({ ...a, [missionId]: (a[missionId] || []).filter((x) => x !== candId) }));
    toast("حُدّثت حالة المرشّح");
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
        ? (patch.scopeType === "school" ? "كامل المدرسة" : patch.scopeType === "grade" ? (patch.scopeRef ? `صف: ${patch.scopeRef}` : "صف دراسي") : patch.scopeType === "class" ? (patch.scopeRef ? `فصل: ${patch.scopeRef}` : "فصل محدّد") : "المرحلة الثانوية")
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
      api.saveSchoolSettings(schoolId, mode, hybrid, { ...settings, presets })
        .then(() => { setMode(mode); setHybrid(hybrid); setSettings(settings); })
        .then(() => toast("حُفظت الإعدادات وطُبّقت على المدرسة"))
        .catch((e) => toast(`تعذّر حفظ الإعدادات: ${e.message || e}`, "danger"));
      return;
    }
    setMode(mode); setHybrid(hybrid); setSettings(settings);
    toast("حُفظت الإعدادات وطُبّقت على المدرسة");
  };

  const updateSchoolInfo: Store["updateSchoolInfo"] = (patch) => {
    const next = { ...schoolInfo, ...patch };
    setSchoolInfo(next);
    if (isLive && schoolId) {
      api.dbUpdateSchool(schoolId, patch)
        .then(() => toast("حُفظت بيانات المدرسة"))
        .catch((e) => toast(`تعذّر حفظ البيانات: ${e.message || e}`, "danger"));
      return;
    }
    toast("حُفظت بيانات المدرسة");
  };

  // يحفظ الإعدادات مع المعايير والمسمّيات معًا (jsonb واحد يُستبدَل بالكامل)
  const persistExtras = (p: WeightPreset[], r: MissionRole[]) =>
    isLive && schoolId
      ? api.saveSchoolSettings(schoolId, mode, hybrid, { ...settings, presets: p, roles: r })
      : Promise.resolve();

  const savePreset: Store["savePreset"] = (name, weights) => {
    const np = [...presets.filter((p) => p.name !== name), { name, weights }];
    setPresets(np);
    persistExtras(np, roles)
      .then(() => toast(`حُفظ المعيار «${name}»`))
      .catch((e) => toast(`تعذّر حفظ المعيار: ${e.message || e}`, "danger"));
  };

  const deletePreset: Store["deletePreset"] = (name) => {
    const np = presets.filter((p) => p.name !== name);
    setPresets(np);
    persistExtras(np, roles).catch(() => {});
    toast(`حُذف المعيار «${name}»`, "info");
  };

  const saveRole: Store["saveRole"] = (r) => {
    const nr = [...roles.filter((x) => x.id !== r.id), r];
    setRoles(nr);
    persistExtras(presets, nr)
      .then(() => toast(`حُفظ المسمّى القيادي «${r.title}»`))
      .catch((e) => toast(`تعذّر الحفظ: ${e.message || e}`, "danger"));
  };

  const deleteRole: Store["deleteRole"] = (id) => {
    const nr = roles.filter((x) => x.id !== id);
    setRoles(nr);
    persistExtras(presets, nr).catch(() => {});
    toast("حُذف المسمّى القيادي", "info");
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
              trust: r.trust, experience: r.experience,
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
  const addStudent: Store["addStudent"] = ({ name, grade, className, nationalId, email, phone }) => {
    if (isLive && schoolId) {
      api.dbAddStudent(schoolId, { name, grade, className, nationalId, email, phone })
        .then(() => resync())
        .then(() => toast(`أُضيف الطالب ${name} — بانتظار أداء المقياس`))
        .catch((e) => toast(`تعذّرت الإضافة: ${e.message || e}`, "danger"));
      return;
    }
    const s = { ...newStudent(`ns${sid++}`, name, grade, className), nationalId, email, phone };
    setStudents((list) => [s, ...list]);
    toast(`أُضيف الطالب ${name} — بانتظار أداء المقياس`);
  };
  const updateStudent: Store["updateStudent"] = (id, patch) => {
    if (isLive && schoolId) {
      api.dbUpdateStudent(schoolId, id, patch)
        .then(() => resync())
        .then(() => toast("حُدّثت بيانات الطالب"))
        .catch((e) => toast(`تعذّر التحديث: ${e.message || e}`, "danger"));
      return;
    }
    setStudents((list) => list.map((s) => s.id === id ? { ...s, ...patch } as Candidate : s));
    toast("حُدّثت بيانات الطالب");
  };

  const removeStudent: Store["removeStudent"] = (id) => {
    if (isLive && schoolId) {
      api.dbDeleteStudent(id)
        .then(() => resync())
        .then(() => toast("حُذف الطالب وبياناته"))
        .catch((e) => toast(`تعذّر الحذف: ${e.message || e}`, "danger"));
      return;
    }
    setStudents((list) => list.filter((s) => s.id !== id));
    toast("حُذف الطالب");
  };

  const markStudentSeen: Store["markStudentSeen"] = (id) => {
    setSeenStudents((cur) => { if (cur.includes(id)) return cur; const n = [...cur, id]; persistSeen(n); return n; });
  };
  // أول تشغيل: اعتبر الطلاب المُقيَّمين حاليًا «مُطّلَعًا عليهم» حتى لا تفيض التنبيهات — وتظهر لاحقًا الاختبارات الجديدة فقط
  useEffect(() => {
    try {
      if (!localStorage.getItem("qiyas_seen_seeded") && students.length) {
        const ids = students.filter((s) => s.assessed).map((s) => s.id);
        setSeenStudents((cur) => { const merged = Array.from(new Set([...cur, ...ids])); persistSeen(merged); return merged; });
        localStorage.setItem("qiyas_seen_seeded", "1");
      }
    } catch { /* تجاهل */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [students.length]);

  const saveStudentNotes: Store["saveStudentNotes"] = (id, notes) => {
    if (isLive && schoolId) {
      api.dbUpdateStudentNotes(id, notes)
        .then(() => resync())
        .then(() => toast("حُفظت ملاحظات الطالب"))
        .catch((e) => toast(`تعذّر الحفظ: ${e.message || e}`, "danger"));
      return;
    }
    setStudents((list) => list.map((s) => s.id === id ? { ...s, supervisorNotes: notes } as Candidate : s));
    toast("حُفظت ملاحظات الطالب");
  };

  const updateTeacher: Store["updateTeacher"] = (id, patch) => {
    if (isLive && schoolId) {
      api.dbUpdateTeacher(id, patch)
        .then(() => resync())
        .then(() => toast("حُدّثت بيانات المعلّم"))
        .catch((e) => toast(`تعذّر التحديث: ${e.message || e}`, "danger"));
      return;
    }
    setTeachers((list) => list.map((t) => t.id === id ? { ...t, ...patch } as Teacher : t));
    toast("حُدّثت بيانات المعلّم");
  };

  const removeTeacher: Store["removeTeacher"] = (id) => {
    if (isLive && schoolId) {
      api.dbDeleteTeacher(id)
        .then(() => resync())
        .then(() => toast("حُذف المعلّم"))
        .catch((e) => toast(`تعذّر الحذف: ${e.message || e}`, "danger"));
      return;
    }
    setTeachers((list) => list.filter((t) => t.id !== id));
    toast("حُذف المعلّم");
  };

  const deleteMission: Store["deleteMission"] = (id) => {
    if (isLive && schoolId) {
      api.dbDeleteMission(id)
        .then(() => resync())
        .then(() => toast("حُذفت المهمة"))
        .catch((e) => toast(`تعذّر الحذف: ${e.message || e}`, "danger"));
      return;
    }
    setMissions((list) => list.filter((m) => m.id !== id));
    toast("حُذفت المهمة");
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

  const addTeacher: Store["addTeacher"] = ({ name, role, nationalId, email, phone }) => {
    if (isLive && schoolId) {
      api.dbAddTeacher(schoolId, { name, role, nationalId, email, phone })
        .then(() => resync())
        .then(() => toast(`أُضيف ${name} (${role})`))
        .catch((e) => toast(`تعذّرت الإضافة: ${e.message || e}`, "danger"));
      return;
    }
    setTeachers((list) => [{ id: `nt${list.length}`, name, role, nationalId, email, phone }, ...list]);
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
  const updateClass: Store["updateClass"] = (id, patch) => {
    if (isLive && schoolId) {
      api.dbUpdateClass(schoolId, id, patch)
        .then(() => resync())
        .then(() => toast("حُدّثت بيانات الفصل"))
        .catch((e) => toast(`تعذّر التعديل: ${e.message || e}`, "danger"));
      return;
    }
    setClasses((list) => list.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    toast("حُدّثت بيانات الفصل");
  };
  const removeClass: Store["removeClass"] = (id) => {
    if (isLive && schoolId) {
      api.dbDeleteClass(id)
        .then(() => resync())
        .then(() => toast("حُذف الفصل"))
        .catch((e) => toast(`تعذّر الحذف: ${e.message || e}`, "danger"));
      return;
    }
    setClasses((list) => list.filter((c) => c.id !== id));
    toast("حُذف الفصل");
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

  // إحصاء حالات الطالب عبر جميع المهام: مرشّح / غير مرشّح / مكلّف
  const studentMissionStats: Store["studentMissionStats"] = (studentId) => {
    let nominated = 0, notNominated = 0, assignedC = 0;
    missions.forEach((m) => {
      const asg = assigned[m.id] || [];
      if (asg.includes(studentId)) { assignedC++; return; }
      if (!m.candidateIds.includes(studentId)) return;
      const seatsLeft = m.seats - asg.length;
      if (seatsLeft > 0) nominated++; else notNominated++;
    });
    return { nominated, notNominated, assigned: assignedC };
  };

  return (
    <Ctx.Provider value={{
      live: isLive, schoolId, tenantCode: seed?.tenantCode ?? null, role: effRole, can,
      mode, hybrid, settings, subscription, missions, assigned, indReqs, toasts,
      toast, dismissToast, addMission, autoNominate, assignCandidate, unassignCandidate, nominateStudent,
      removeCandidate, setCandidateStatus, updateMission, requestRetake,
      devPlans, saveDevPlan, resolveIndReq, saveSettings, schoolInfo, updateSchoolInfo, presets, savePreset, deletePreset, roles, saveRole, deleteRole,
      me: students.find((s) => s.id === meId) ?? null,
      meAssessed, applyToMission, completeAssessment, isMeIn, isMeAssigned,
      students, teachers, classes, addStudent, updateStudent, removeStudent, saveStudentNotes, seenStudents, markStudentSeen, bulkAddStudents, addTeacher, updateTeacher, removeTeacher, deleteMission, reload: resync, addClass, updateClass, removeClass, bulkCreateHomeroomMissions, rankMission, studentMissionsFor, studentMissionStats,
    }}>
      {children}
    </Ctx.Provider>
  );
}
