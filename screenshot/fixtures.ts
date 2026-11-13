/**
 * Screenshot builds only: the demo account's data. Everything is made up and
 * relative to "today", so the screens look like a normal good day whenever the
 * screenshots are taken. Text comes in Simplified Chinese and English.
 */
import { useStore, localDateKey } from '@/store/useStore';

export const DEMO_USER_ID = 'demo-user';

export const DEMO = {
  steps: 8412,
  activeEnergy: 412,
  waterMl: 1250,
  waterLog: [250, 500, 250, 250],
};

type L = { zh: string; en: string };
const zh = () => useStore.getState().language.startsWith('zh');
const tr = (s: L) => (zh() ? s.zh : s.en);

const DAY = 86_400_000;
const today = () => new Date();
/** Today's date at hh:mm (local). */
const at = (h: number, m: number, daysAgo = 0) => {
  const d = new Date(today().getTime() - daysAgo * DAY);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};
const dayKey = (daysAgo: number) => localDateKey(new Date(today().getTime() - daysAgo * DAY));

// ── profile ──

export const profile = () => ({
  id: DEMO_USER_ID,
  email: 'demo@kerolock.app',
  name: tr({ zh: '小林', en: 'Alex' }),
  username: 'alex',
  bio: null,
  avatarEmoji: '😎',
  avatarImage: null,
  showGender: false,
  height: 175,
  age: 27,
  weight: 72,
  gender: 'male',
  goal: 'lose_fat',
  exerciseFrequency: '3-4',
  expectedTimeframe: '2-3_months',
  plan: 'PRO',
  streak: 12,
  hasCompletedOnboarding: true,
  inviteCode: 'KEROLOCK',
  friendCode: '32450218',
  createdAt: new Date(today().getTime() - 64 * DAY).toISOString(),
  bonusAiCalls: 0,
  isAdmin: false,
});

// ── meals ──

const MEALS: { name: L; kcal: number; p: number; c: number; f: number; fiber: number; sodium: number; h: number; m: number }[] = [
  { name: { zh: '希腊酸奶配莓果和燕麦', en: 'Greek yogurt, berries & granola' }, kcal: 320, p: 18, c: 42, f: 9, fiber: 5, sodium: 85, h: 8, m: 20 },
  { name: { zh: '三文鱼牛油果波奇饭', en: 'Salmon avocado poke bowl' }, kcal: 612, p: 38, c: 64, f: 21, fiber: 7, sodium: 980, h: 12, m: 35 },
  { name: { zh: '燕麦拿铁', en: 'Oat latte' }, kcal: 140, p: 3, c: 18, f: 6, fiber: 1, sodium: 95, h: 15, m: 10 },
];

export const todayMeals = () =>
  MEALS.map((x, i) => ({
    id: `demo-meal-${i}`,
    food_name: tr(x.name),
    calories: x.kcal,
    protein: x.p,
    carbs: x.c,
    fat: x.f,
    fiber: x.fiber,
    sodium: x.sodium,
    image_url: '',
    created_at: at(x.h, x.m),
  }));

export const today_ = () => {
  const meals = todayMeals();
  return { totalCalories: meals.reduce((s, m) => s + m.calories, 0), meals };
};

export const weekly = () =>
  [6, 5, 4, 3, 2, 1, 0].map((ago) => {
    if (ago === 0) {
      const meals = todayMeals();
      const sum = (k: 'calories' | 'protein' | 'carbs' | 'fat' | 'fiber' | 'sodium') => meals.reduce((s, m) => s + (m[k] as number), 0);
      return { date: dayKey(0), calories: sum('calories'), protein: sum('protein'), carbs: sum('carbs'), fat: sum('fat'), fiber: sum('fiber'), sodium: sum('sodium'), fiberMeals: 3, sodiumMeals: 3, meals: 3 };
    }
    const cal = [1980, 2140, 1860, 2210, 2050, 1920][ago - 1];
    return { date: dayKey(ago), calories: cal, protein: Math.round(cal * 0.065), carbs: Math.round(cal * 0.11), fat: Math.round(cal * 0.032), fiber: 24, sodium: 2100, fiberMeals: 3, sodiumMeals: 3, meals: 3 };
  });

export const recentFoods = () => ({
  items: [
    { food: tr({ zh: '香煎鸡胸肉沙拉', en: 'Grilled chicken salad' }), calories: 420, protein: 42, carbs: 18, fat: 19, fiber: 6, sodium: 720, count: 6 },
    { food: tr({ zh: '番茄鸡蛋面', en: 'Tomato & egg noodles' }), calories: 520, protein: 21, carbs: 78, fat: 13, fiber: 4, sodium: 1150, count: 4 },
    { food: tr({ zh: '蛋白奶昔', en: 'Protein shake' }), calories: 180, protein: 30, carbs: 8, fat: 3, fiber: 1, sodium: 210, count: 9 },
    { food: tr({ zh: '苹果 · 1 个', en: 'Apple · 1 medium' }), calories: 94, protein: 1, carbs: 25, fat: 0, fiber: 4, sodium: 2, count: 5 },
  ].map((x, i) => ({ ...x, last_at: at(18, 0, i + 1), image_url: null, reuse_image: false })),
});

/** What the AI "sees" in screenshot/assets/sushi.jpg. */
export const visionResult = () => ({
  food: tr({ zh: '刺身拼盘（三文鱼、金枪鱼、鰤鱼、鲷鱼）', en: 'Sashimi platter (salmon, tuna, yellowtail, sea bream)' }),
  calories: 319,
  protein: 40,
  carbs: 2,
  fat: 16,
  fiber: 0.2,
  sodium: 299,
  confidence: 0.92,
});

// ── training ──

type Ex = [id: string, sets: number, reps: number, kg: number];
const DAYS: { kind: 'legs' | 'push' | 'pull' | 'upper'; ex: Ex[] }[] = [
  { kind: 'legs', ex: [['barbell_squat', 4, 8, 80], ['romanian_deadlift', 3, 10, 60], ['leg_press', 3, 12, 140], ['leg_curl', 3, 12, 40], ['calf_raise', 4, 15, 60]] },
  { kind: 'push', ex: [['bench_press', 4, 8, 70], ['incline_db_press', 3, 10, 26], ['overhead_press', 3, 8, 42.5], ['lateral_raise', 3, 15, 10], ['triceps_pushdown', 3, 12, 30]] },
  { kind: 'pull', ex: [['pull_up', 4, 8, 0], ['barbell_row', 4, 8, 60], ['lat_pulldown', 3, 12, 55], ['face_pull', 3, 15, 20], ['db_curl', 3, 12, 14]] },
  { kind: 'upper', ex: [['incline_bench_press', 4, 8, 60], ['seated_cable_row', 3, 10, 55], ['db_shoulder_press', 3, 10, 22], ['hammer_curl', 3, 12, 14]] },
];

const planDay = (d: (typeof DAYS)[number]) => ({
  kind: d.kind,
  exercises: d.ex.map(([id, sets, reps, weight]) => ({ id, sets, reps, weight, progress: 'weight' as const, step: 2.5 })),
});

/** Today is legs; the rest of the week is push / pull / upper with rest days between. */
export const workouts = () => {
  const dow = today().getDay();
  const order: (number | null)[] = [0, null, 1, 2, null, 3, null]; // offset from today → DAYS index
  const plan: Record<string, ReturnType<typeof planDay>> = {};
  order.forEach((di, offset) => {
    if (di !== null) plan[String((dow + offset) % 7)] = planDay(DAYS[di]);
  });
  const sessions = [3, 5].map((ago, i) => ({
    id: `demo-session-${i}`,
    dayKey: dayKey(ago),
    planDay: (dow - ago + 7) % 7,
    title: null,
    startedAt: at(18, 30, ago),
    finishedAt: at(19, 25, ago),
    durationSec: 3300,
    volume: 8650 + i * 900,
    setCount: 17,
    prCount: i,
  }));
  return { plan, sessions };
};

export const exerciseHistory = (ids: string[]) => {
  const last: Record<string, { weight: number; reps: number }[]> = {};
  const best: Record<string, { weight: number; reps: number }> = {};
  for (const d of DAYS) {
    for (const [id, sets, reps, kg] of d.ex) {
      if (!ids.includes(id)) continue;
      const prev = Math.max(0, kg - 2.5);
      last[id] = Array.from({ length: sets }, () => ({ weight: prev, reps }));
      best[id] = { weight: prev, reps: reps + 1 };
    }
  }
  return { last, best };
};

export const weightRecords = () =>
  Array.from({ length: 30 }, (_, i) => ({
    id: `demo-weight-${i}`,
    weight: Math.round((74.6 - i * 0.09 + Math.sin(i / 2) * 0.25) * 10) / 10,
    recordedAt: at(7, 30, 29 - i),
  })).reverse();

// ── buddy ──

export const pet = () => ({
  today: dayKey(0),
  profile: {
    coachName: tr({ zh: '豆豆', en: 'Doudou' }),
    buddyKind: 'cat',
    buddyName: tr({ zh: '圆圆', en: 'Mochi' }),
    buddyDay: 25,
  },
  xp: 236,
  stage: 2,
  nextAt: 400,
  canGraduate: false,
  todayFacts: { xp: 45, trained: true, steps: DEMO.steps, meals: 3, protein: 59, proteinTarget: 140, pats: 2 },
  recent: [6, 5, 4, 3, 2, 1].map((ago, i) => ({ dayKey: dayKey(ago), xp: [35, 50, 25, 65, 40, 55][i] })),
  collection: [],
});

// ── friends ──

const FRIENDS: { name: L; username: string; avatar: string; calories: number; streak: number; pet: { kind: string; name: L; stage: number } }[] = [
  { name: { zh: '阿杰', en: 'Jordan' }, username: 'jordan', avatar: '🦊', calories: 2140, streak: 21, pet: { kind: 'corgi', name: { zh: '团子', en: 'Biscuit' }, stage: 3 } },
  { name: { zh: '小美', en: 'Sam' }, username: 'sam', avatar: '🌸', calories: 1560, streak: 9, pet: { kind: 'penguin', name: { zh: '波波', en: 'Pip' }, stage: 2 } },
  { name: { zh: '大卫', en: 'David' }, username: 'david', avatar: '🏀', calories: 1380, streak: 6, pet: { kind: 'cat', name: { zh: '奶茶', en: 'Latte' }, stage: 1 } },
  { name: { zh: '琳琳', en: 'Lina' }, username: 'lina', avatar: '🍑', calories: 1240, streak: 4, pet: { kind: 'corgi', name: { zh: '可乐', en: 'Cola' }, stage: 1 } },
];

export const leaderboard = () => {
  const me = profile();
  const rows = [
    ...FRIENDS.map((f, i) => ({
      id: `demo-friend-${i}`,
      name: tr(f.name),
      username: f.username,
      avatar: f.avatar,
      calories: f.calories,
      streak: f.streak,
      friendshipId: `demo-friendship-${i}`,
      pet: { kind: f.pet.kind, name: tr(f.pet.name), stage: f.pet.stage },
      patted: i === 1,
      isMe: false,
    })),
    {
      id: me.id, name: me.name, username: me.username, avatar: me.avatarEmoji, calories: today_().totalCalories,
      streak: me.streak, isMe: true, pet: { kind: 'cat', name: pet().profile.buddyName, stage: 2 }, patsReceived: 2,
    },
  ];
  // Ranked by streak, like the app's weekly board.
  return rows.sort((a, b) => b.streak - a.streak).map((r, i) => ({ ...r, rank: i + 1, status: null, avatarImage: null }));
};

// ── couple ──

export const couple = () => {
  const me = profile();
  const partner = FRIENDS[1];
  const since = dayKey(431);
  return {
    couple: {
      id: 'demo-couple',
      status: 'ACCEPTED',
      iInvited: true,
      me: { id: me.id, name: me.name, avatarEmoji: me.avatarEmoji, avatarImage: null, gender: 'male' },
      partner: { id: 'demo-friend-1', name: tr(partner.name), avatarEmoji: partner.avatar, avatarImage: null, gender: 'female' },
      since,
      petOwnerId: me.id,
      streak: 18,
      today: {
        me: { calories: today_().totalCalories, calorieGoal: 2150, protein: 59, waterMl: DEMO.waterMl, waterGoalMl: 2000, steps: DEMO.steps, trained: true, logged: true },
        partner: { calories: 1560, calorieGoal: 1700, protein: 72, waterMl: 1500, waterGoalMl: 2000, steps: 9630, trained: true, logged: true },
      },
      anniversaries: [
        { id: 'demo-ann-0', title: tr({ zh: '在一起', en: 'Together' }), date: since, yearly: true, emoji: '❤️', builtIn: true },
        { id: 'demo-ann-1', title: tr({ zh: '她的生日', en: "Sam's birthday" }), date: dayKey(-23), yearly: true, emoji: '🎂' },
        { id: 'demo-ann-2', title: tr({ zh: '一起去东京', en: 'Tokyo trip' }), date: dayKey(-61), yearly: false, emoji: '✈️' },
      ],
      home: { earned: 1280, spent: 900, balance: 380, owned: [], equipped: {} },
    },
  };
};

// ── AI ──

export const dietAnalysis = () => ({
  summary: tr({
    zh: '这周热量控制得很稳，训练日蛋白质也基本达标。晚餐的钠偏高，可以少放点酱。',
    en: 'Calories were steady all week and protein mostly hit target on training days. Dinners ran high in sodium; go lighter on sauces.',
  }),
  suggestions: [
    tr({ zh: '早餐加一个鸡蛋，蛋白质更容易达标', en: 'Add an egg at breakfast to reach protein more easily' }),
    tr({ zh: '每天多吃一份蔬菜，补足膳食纤维', en: 'One more serving of vegetables a day for fiber' }),
  ],
  exercise: tr({ zh: '下周保持 4 练，腿日深蹲可以加到 82.5 kg', en: 'Keep 4 sessions next week; squats can go up to 82.5 kg' }),
  score: 86,
});
