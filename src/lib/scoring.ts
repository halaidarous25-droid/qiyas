// محرك التقييم — يحوّل إجابات الطالب إلى المؤشرات التي تستهلكها المنصة
// (الكفايات ٧٠٪ + السلوك ٣٠٪ + مؤشرات الموثوقية) وفق معادلات المستشار النفسي.
import { QUESTIONS, type Item } from "@/data/questions";
import { BANK_B } from "@/data/questionBankB";
import { AXES, classifyTrust, type AxisKey, type AxisScores, type Trust } from "@/data/mock";

// سجل موحّد لكل الأسئلة (النموذج أ + النموذج ب) — يسمح بتقييم أي مجموعة معروضة
const ALL: Item[] = [...QUESTIONS, ...BANK_B];

export type Answers = Record<string, number | boolean>;

export interface AssessmentResult {
  axes: AxisScores;          // متوسط كل محور 0..100
  competency: number;        // متوسط المحاور (الكفايات)
  behavior: number;          // متوسط المواقف السلوكية
  integrity: number;         // مؤشر النزاهة (من المؤشرات المساندة)
  emotional: number;         // الاستقرار الانفعالي
  contradiction: number;     // 0..10
  socialDesirability: number;// 0..5
  trust: Trust;
  experience: number;        // 0..3 مؤشر الخبرة القيادية (السؤال ٣٦) — أثر محدود
  strengths: AxisKey[];      // أعلى محورين
  growth: AxisKey[];         // أدنى محورين
  answeredAll: boolean;
}

const byId = (id: string) => ALL.find((q) => q.id === id)!;
const optScore = (it: Item, idx: number | boolean) =>
  typeof idx === "number" && it.options[idx] ? it.options[idx].score : 0;

export function scoreAssessment(answers: Answers): AssessmentResult {
  // 1) الكفايات لكل محور
  const axes = {} as AxisScores;
  AXES.forEach((a) => {
    const items = ALL.filter((q) => q.type === "scenario" && q.axis === a.key);
    const answered = items.filter((it) => answers[it.id] !== undefined);
    axes[a.key] = answered.length
      ? Math.round(answered.reduce((s, it) => s + optScore(it, answers[it.id]), 0) / answered.length)
      : 0;
  });
  const competency = Math.round(AXES.reduce((s, a) => s + axes[a.key], 0) / AXES.length);

  // 2) السلوك (المواقف)
  const sit = ALL.filter((q) => q.type === "situation" && answers[q.id] !== undefined);
  const behavior = sit.length
    ? Math.round(sit.reduce((s, it) => s + optScore(it, answers[it.id]), 0) / sit.length)
    : 0;

  // 3) المؤشرات المساندة
  const ind = (kind: "integrity" | "emotional") => {
    const items = ALL.filter((q) => q.type === "indicator" && q.indicator === kind && answers[q.id] !== undefined);
    return items.length ? Math.round(items.reduce((s, it) => s + optScore(it, answers[it.id]), 0) / items.length) : 0;
  };
  const integrity = ind("integrity");
  const emotional = ind("emotional");

  // 4) درجة التناقض (البنود الموازية مقابل متوسط محورها) — يعمل مع أي مجموعة معروضة
  let contradiction = 0;
  ALL.filter((q) => q.type === "parallel").forEach((p) => {
    const aP = answers[p.id];
    if (typeof aP !== "number" || !p.freqLevels) return;
    const axisKey = (p.axis ?? byId(p.parallelTo!)?.axis) as AxisKey | undefined;
    if (!axisKey) return;
    const level = p.freqLevels[aP];
    const gap = Math.abs(level - axes[axisKey]);
    contradiction += gap <= 20 ? 0 : gap <= 45 ? 1 : 2;
  });

  // 5) الكمال الاجتماعي (فخاخ صحيح/خطأ) — "صحيح" = نقطة
  const socialDesirability = ALL.filter(
    (q) => q.type === "trap" && answers[q.id] === true
  ).length;

  // 6) نقاط القوة/التطوير
  const sorted = [...AXES].sort((a, b) => axes[b.key] - axes[a.key]);
  const strengths = sorted.slice(0, 2).map((a) => a.key);
  const growth = sorted.slice(-2).map((a) => a.key);

  // مؤشر الخبرة القيادية (السؤال ٣٦) — 0..3، لا يدخل في الكفايات/السلوك
  const expAns = answers["exp1"];
  const experience = typeof expAns === "number" ? Math.max(0, Math.min(3, expAns)) : 0;

  const answeredAll = Object.keys(answers).length >= 30;

  return {
    axes, competency, behavior, integrity, emotional,
    contradiction, socialDesirability, experience,
    trust: classifyTrust(contradiction, socialDesirability),
    strengths, growth, answeredAll,
  };
}

// النمط القيادي من أعلى محورين
export function leadershipStyle(strengths: AxisKey[]): { name: string; desc: string } {
  const set = new Set(strengths);
  if (set.has("org") && set.has("firm")) return { name:"مُنظِّم حازم", desc:"تتميّز في الانضباط واتخاذ القرار العادل تحت الضغط." };
  if (set.has("lead") && set.has("comm")) return { name:"قائد تواصلي", desc:"تتميّز في توجيه الفريق وبناء العلاقات والإقناع." };
  if (set.has("init") && set.has("comm")) return { name:"مُبادر مُلهِم", desc:"تتميّز في طرح الحلول وتحريك من حولك نحوها." };
  if (set.has("org") && set.has("lead")) return { name:"مُنظِّم استراتيجي", desc:"تتميّز في التخطيط والتحليل المنطقي وإدارة المهام." };
  if (set.has("firm") && set.has("init")) return { name:"مِقدام مبدئي", desc:"تتميّز في الثبات على المبدأ مع مرونة في الحلول." };
  return { name:"قائد متوازن", desc:"ملف متوازن عبر المحاور دون تطرّف في جانب." };
}
