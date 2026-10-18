// Classic weekly plans used when the AI can't produce one (empty answer,
// timeout, unusable JSON), so "AI 推荐训练" always gives the user something
// sound to start with: full body for 2–3 days, upper/lower for 4, then
// push/pull/legs splits.

import type { PlanDays, PlanExercise } from '@/lib/workouts';
import { CATALOG } from '@/lib/exercise-catalog';

type Location = 'gym' | 'home' | 'bodyweight';
type Role =
  | 'squat' | 'hinge' | 'legAcc' | 'ham' | 'glute'
  | 'hPush' | 'vPush' | 'incline' | 'lateral'
  | 'hPull' | 'vPull' | 'rear'
  | 'curl' | 'tri' | 'core';

const ROLES: Record<Location, Record<Role, string>> = {
  gym: {
    squat: 'barbell_squat', hinge: 'romanian_deadlift', legAcc: 'leg_press', ham: 'leg_curl', glute: 'hip_thrust',
    hPush: 'bench_press', vPush: 'overhead_press', incline: 'incline_db_press', lateral: 'lateral_raise',
    hPull: 'barbell_row', vPull: 'lat_pulldown', rear: 'face_pull',
    curl: 'db_curl', tri: 'triceps_pushdown', core: 'hanging_leg_raise',
  },
  home: {
    squat: 'goblet_squat', hinge: 'db_romanian_deadlift', legAcc: 'bulgarian_split_squat', ham: 'glute_bridge', glute: 'walking_lunge',
    hPush: 'db_bench_press', vPush: 'db_shoulder_press', incline: 'push_up', lateral: 'lateral_raise',
    hPull: 'db_row', vPull: 'inverted_row', rear: 'rear_delt_fly',
    curl: 'db_curl', tri: 'overhead_triceps_extension', core: 'crunch',
  },
  bodyweight: {
    squat: 'bodyweight_squat', hinge: 'glute_bridge', legAcc: 'bodyweight_lunge', ham: 'back_extension', glute: 'glute_bridge',
    hPush: 'push_up', vPush: 'pike_push_up', incline: 'dips', lateral: 'pike_push_up',
    hPull: 'inverted_row', vPull: 'pull_up', rear: 'inverted_row',
    curl: 'chin_up', tri: 'dips', core: 'hanging_leg_raise',
  },
};

type DayKind = 'fullA' | 'fullB' | 'upper' | 'lower' | 'push' | 'pull' | 'legs';

/** Main lifts first; the rest are accessories. */
const DAYS: Record<DayKind, { main: Role[]; acc: Role[] }> = {
  fullA: { main: ['squat', 'hPush', 'hPull'], acc: ['lateral', 'core'] },
  fullB: { main: ['hinge', 'vPush', 'vPull'], acc: ['legAcc', 'curl'] },
  upper: { main: ['hPush', 'hPull', 'vPush'], acc: ['vPull', 'curl', 'tri'] },
  lower: { main: ['squat', 'hinge'], acc: ['legAcc', 'ham', 'core'] },
  push: { main: ['hPush', 'vPush'], acc: ['incline', 'lateral', 'tri'] },
  pull: { main: ['hPull', 'vPull'], acc: ['rear', 'curl', 'core'] },
  legs: { main: ['squat', 'hinge'], acc: ['legAcc', 'glute', 'core'] },
};

/** JS weekdays (0 = Sunday), spread with rest days in between. */
const WEEKDAYS: Record<number, number[]> = {
  2: [1, 4], 3: [1, 3, 5], 4: [1, 2, 4, 5], 5: [1, 2, 3, 5, 6], 6: [1, 2, 3, 4, 5, 6],
};

function kinds(days: number, level: string): DayKind[] {
  if (days <= 3) return ['fullA', 'fullB', 'fullA'].slice(0, days) as DayKind[];
  if (days === 4) return ['upper', 'lower', 'upper', 'lower'];
  if (days === 5) return level === 'beginner' ? ['upper', 'lower', 'push', 'pull', 'legs'] : ['push', 'pull', 'legs', 'upper', 'lower'];
  return ['push', 'pull', 'legs', 'push', 'pull', 'legs'];
}

const NAMES: Record<string, Record<DayKind, string>> = {
  'zh-CN': { fullA: '全身 A', fullB: '全身 B', upper: '上肢', lower: '下肢', push: '推（胸肩三头）', pull: '拉（背二头）', legs: '腿 + 核心' },
  'zh-TW': { fullA: '全身 A', fullB: '全身 B', upper: '上肢', lower: '下肢', push: '推（胸肩三頭）', pull: '拉（背二頭）', legs: '腿 + 核心' },
  'en-US': { fullA: 'Full body A', fullB: 'Full body B', upper: 'Upper', lower: 'Lower', push: 'Push', pull: 'Pull', legs: 'Legs + core' },
  'ja-JP': { fullA: '全身 A', fullB: '全身 B', upper: '上半身', lower: '下半身', push: 'プッシュ', pull: 'プル', legs: '脚 + 体幹' },
  'ko-KR': { fullA: '전신 A', fullB: '전신 B', upper: '상체', lower: '하체', push: '푸시', pull: '풀', legs: '하체 + 코어' },
};

const SUMMARY: Record<string, (days: number) => string> = {
  'zh-CN': (d) => d <= 3 ? '经典全身训练，每次把大肌群都练到，最适合打基础。' : d === 4 ? '上下肢分化，每个部位一周练两次。' : '推 / 拉 / 腿分化，训练量更高，适合有基础的人。',
  'zh-TW': (d) => d <= 3 ? '經典全身訓練，每次把大肌群都練到，最適合打基礎。' : d === 4 ? '上下肢分化，每個部位一週練兩次。' : '推 / 拉 / 腿分化，訓練量更高，適合有基礎的人。',
  'en-US': (d) => d <= 3 ? 'Classic full-body training: every big muscle group each session, ideal for building a base.' : d === 4 ? 'Upper / lower split: each area twice a week.' : 'Push / pull / legs split with more volume, for people with some training behind them.',
  'ja-JP': (d) => d <= 3 ? '毎回大きな筋肉をすべて鍛える定番の全身メニュー。基礎づくりに最適です。' : d === 4 ? '上半身 / 下半身の分割で、各部位を週2回。' : 'プッシュ / プル / 脚の分割。ボリューム多めで経験者向け。',
  'ko-KR': (d) => d <= 3 ? '매번 큰 근육을 모두 쓰는 기본 전신 운동이에요. 기초를 다지기에 좋아요.' : d === 4 ? '상체 / 하체 분할로 부위마다 주 2회씩.' : '푸시 / 풀 / 하체 분할로 볼륨이 더 많아요. 경험자에게 맞아요.',
};

const TIPS: Record<string, string[]> = {
  'zh-CN': ['先用能轻松做完所有组的重量，动作做标准比重量重要。', '组间休息 1.5–2 分钟，主项可以休息 3 分钟。'],
  'zh-TW': ['先用能輕鬆做完所有組的重量，動作做標準比重量重要。', '組間休息 1.5–2 分鐘，主項可以休息 3 分鐘。'],
  'en-US': ['Start with a weight you can finish every set with; good form beats heavy weight.', 'Rest 1.5–2 min between sets, up to 3 min on the main lifts.'],
  'ja-JP': ['まずは全セットを楽にこなせる重さで。重さよりフォームが大事です。', 'セット間の休憩は1.5〜2分、メイン種目は3分まで。'],
  'ko-KR': ['처음엔 모든 세트를 여유 있게 할 수 있는 무게로. 무게보다 자세가 중요해요.', '세트 사이 1.5~2분, 메인 운동은 3분까지 쉬어요.'],
};

const EQUIPMENT = new Map(CATALOG.map((e) => [e.id, e.equipment]));
const LB = 2.20462;

function step(id: string, unit: string): number {
  const eq = EQUIPMENT.get(id);
  if (unit === 'lb') return Math.round(((eq === 'machine' ? 10 : 5) / LB) * 100) / 100;
  return eq === 'dumbbell' ? 2 : eq === 'machine' ? 5 : 2.5;
}

export function templatePlan(opts: { days: number; weekdays?: number[]; location: string; level: string; unit: string; lang: string }) {
  const location = (opts.location in ROLES ? opts.location : 'gym') as Location;
  const roles = ROLES[location];
  const names = NAMES[opts.lang] ?? NAMES['en-US'];
  const experienced = opts.level === 'experienced';
  const plan: PlanDays = {};

  const list = kinds(opts.days, opts.level);
  const weekdays = opts.weekdays?.length === opts.days ? opts.weekdays : WEEKDAYS[opts.days];
  weekdays.forEach((wd, i) => {
    const kind = list[i];
    const seen = new Set<string>();
    const exercises: PlanExercise[] = [];
    const add = (role: Role, main: boolean) => {
      const id = roles[role];
      if (seen.has(id)) return;
      seen.add(id);
      const bodyweight = EQUIPMENT.get(id) === 'bodyweight';
      exercises.push({
        id,
        sets: main && experienced ? 4 : 3,
        reps: bodyweight ? (main ? 10 : 12) : main ? (experienced ? 6 : 8) : 12,
        weight: 0,
        progress: bodyweight ? 'none' : 'weight',
        step: step(id, opts.unit),
      });
    };
    DAYS[kind].main.forEach((r) => add(r, true));
    DAYS[kind].acc.forEach((r) => add(r, false));
    plan[String(wd)] = { name: names[kind], exercises };
  });

  return {
    summary: (SUMMARY[opts.lang] ?? SUMMARY['en-US'])(opts.days),
    tips: TIPS[opts.lang] ?? TIPS['en-US'],
    plan,
  };
}
