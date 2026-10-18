// Built-in exercise catalog for the training tab. Ids are stored by the
// backend (workout_sets.exercise_id, workout_plans.days), so never rename one;
// add new ids instead.

export type MuscleGroup = 'legs' | 'chest' | 'back' | 'shoulders' | 'arms' | 'core';
export type Equipment = 'barbell' | 'dumbbell' | 'machine' | 'cable' | 'bodyweight';
export type Muscle =
  | 'quads' | 'hamstrings' | 'glutes' | 'calves'
  | 'chest' | 'upperChest'
  | 'lats' | 'upperBack' | 'lowerBack' | 'traps'
  | 'frontDelts' | 'sideDelts' | 'rearDelts'
  | 'biceps' | 'triceps' | 'forearms'
  | 'abs' | 'obliques';

type Names = { en: string; zh: string; tw: string; ja: string; ko: string };

export interface Exercise {
  id: string;
  group: MuscleGroup;
  equipment: Equipment;
  muscles: Muscle[];
  name: Names;
}

export const MUSCLE_GROUPS: MuscleGroup[] = ['legs', 'chest', 'back', 'shoulders', 'arms', 'core'];

const x = (id: string, group: MuscleGroup, equipment: Equipment, muscles: Muscle[], en: string, zh: string, tw: string, ja: string, ko: string): Exercise =>
  ({ id, group, equipment, muscles, name: { en, zh, tw, ja, ko } });

export const EXERCISES: Exercise[] = [
  // Legs
  x('barbell_squat', 'legs', 'barbell', ['quads', 'glutes', 'hamstrings'], 'Barbell Squat', '杠铃深蹲', '槓鈴深蹲', 'バーベルスクワット', '바벨 스쿼트'),
  x('front_squat', 'legs', 'barbell', ['quads', 'glutes'], 'Front Squat', '杠铃前蹲', '槓鈴前蹲', 'フロントスクワット', '프론트 스쿼트'),
  x('deadlift', 'legs', 'barbell', ['hamstrings', 'glutes', 'lowerBack'], 'Deadlift', '硬拉', '硬舉', 'デッドリフト', '데드리프트'),
  x('romanian_deadlift', 'legs', 'barbell', ['hamstrings', 'glutes'], 'Romanian Deadlift', '罗马尼亚硬拉', '羅馬尼亞硬舉', 'ルーマニアンデッドリフト', '루마니안 데드리프트'),
  x('leg_press', 'legs', 'machine', ['quads', 'glutes'], 'Leg Press', '腿举', '腿推', 'レッグプレス', '레그 프레스'),
  x('hack_squat', 'legs', 'machine', ['quads'], 'Hack Squat', '哈克深蹲', '哈克深蹲', 'ハックスクワット', '핵 스쿼트'),
  x('bulgarian_split_squat', 'legs', 'dumbbell', ['quads', 'glutes'], 'Bulgarian Split Squat', '哑铃保加利亚分腿蹲', '啞鈴保加利亞分腿蹲', 'ブルガリアンスクワット', '불가리안 스플릿 스쿼트'),
  x('walking_lunge', 'legs', 'dumbbell', ['quads', 'glutes'], 'Walking Lunge', '哑铃箭步走', '啞鈴弓步走', 'ウォーキングランジ', '워킹 런지'),
  x('goblet_squat', 'legs', 'dumbbell', ['quads', 'glutes'], 'Goblet Squat', '高脚杯深蹲', '高腳杯深蹲', 'ゴブレットスクワット', '고블릿 스쿼트'),
  x('leg_curl', 'legs', 'machine', ['hamstrings'], 'Lying Leg Curl', '俯卧腿弯举', '俯臥腿彎舉', 'ライイングレッグカール', '라잉 레그 컬'),
  x('leg_extension', 'legs', 'machine', ['quads'], 'Leg Extension', '腿屈伸', '腿伸展', 'レッグエクステンション', '레그 익스텐션'),
  x('hip_thrust', 'legs', 'barbell', ['glutes', 'hamstrings'], 'Hip Thrust', '杠铃臀推', '槓鈴臀推', 'ヒップスラスト', '힙 스러스트'),
  x('calf_raise', 'legs', 'machine', ['calves'], 'Standing Calf Raise', '站姿提踵', '站姿提踵', 'カーフレイズ', '스탠딩 카프 레이즈'),

  // Chest
  x('bench_press', 'chest', 'barbell', ['chest', 'triceps', 'frontDelts'], 'Bench Press', '杠铃卧推', '槓鈴臥推', 'ベンチプレス', '벤치프레스'),
  x('incline_bench_press', 'chest', 'barbell', ['upperChest', 'frontDelts', 'triceps'], 'Incline Bench Press', '上斜杠铃卧推', '上斜槓鈴臥推', 'インクラインベンチプレス', '인클라인 벤치프레스'),
  x('db_bench_press', 'chest', 'dumbbell', ['chest', 'triceps'], 'Dumbbell Bench Press', '哑铃卧推', '啞鈴臥推', 'ダンベルベンチプレス', '덤벨 벤치프레스'),
  x('incline_db_press', 'chest', 'dumbbell', ['upperChest', 'frontDelts'], 'Incline Dumbbell Press', '上斜哑铃卧推', '上斜啞鈴臥推', 'インクラインダンベルプレス', '인클라인 덤벨 프레스'),
  x('db_fly', 'chest', 'dumbbell', ['chest'], 'Dumbbell Fly', '哑铃飞鸟', '啞鈴飛鳥', 'ダンベルフライ', '덤벨 플라이'),
  x('cable_crossover', 'chest', 'cable', ['chest'], 'Cable Crossover', '龙门架夹胸', '龍門架夾胸', 'ケーブルクロスオーバー', '케이블 크로스오버'),
  x('machine_chest_press', 'chest', 'machine', ['chest', 'triceps'], 'Machine Chest Press', '器械推胸', '器械推胸', 'チェストプレス', '머신 체스트 프레스'),
  x('push_up', 'chest', 'bodyweight', ['chest', 'triceps', 'frontDelts'], 'Push-up', '俯卧撑', '伏地挺身', '腕立て伏せ', '푸시업'),
  x('dips', 'chest', 'bodyweight', ['chest', 'triceps'], 'Dips', '双杠臂屈伸', '雙槓撐體', 'ディップス', '딥스'),

  // Back
  x('pull_up', 'back', 'bodyweight', ['lats', 'biceps'], 'Pull-up', '引体向上', '引體向上', '懸垂', '풀업'),
  x('chin_up', 'back', 'bodyweight', ['lats', 'biceps'], 'Chin-up', '反手引体向上', '反手引體向上', 'チンアップ', '친업'),
  x('lat_pulldown', 'back', 'cable', ['lats', 'biceps'], 'Lat Pulldown', '高位下拉', '滑輪下拉', 'ラットプルダウン', '랫 풀다운'),
  x('barbell_row', 'back', 'barbell', ['upperBack', 'lats', 'biceps'], 'Barbell Row', '杠铃划船', '槓鈴划船', 'ベントオーバーロウ', '바벨 로우'),
  x('db_row', 'back', 'dumbbell', ['lats', 'upperBack'], 'One-arm Dumbbell Row', '单臂哑铃划船', '單臂啞鈴划船', 'ワンハンドダンベルロウ', '원암 덤벨 로우'),
  x('seated_cable_row', 'back', 'cable', ['upperBack', 'lats'], 'Seated Cable Row', '坐姿绳索划船', '坐姿滑輪划船', 'シーテッドロウ', '시티드 케이블 로우'),
  x('t_bar_row', 'back', 'barbell', ['upperBack', 'lats'], 'T-Bar Row', 'T 杠划船', 'T 槓划船', 'Tバーロウ', '티바 로우'),
  x('straight_arm_pulldown', 'back', 'cable', ['lats'], 'Straight-arm Pulldown', '直臂下压', '直臂下壓', 'ストレートアームプルダウン', '스트레이트 암 풀다운'),
  x('back_extension', 'back', 'bodyweight', ['lowerBack', 'glutes'], 'Back Extension', '山羊挺身', '背部伸展', 'バックエクステンション', '백 익스텐션'),
  x('face_pull', 'back', 'cable', ['rearDelts', 'upperBack'], 'Face Pull', '绳索面拉', '繩索面拉', 'フェイスプル', '페이스 풀'),

  // Shoulders
  x('overhead_press', 'shoulders', 'barbell', ['frontDelts', 'triceps'], 'Overhead Press', '杠铃推举', '槓鈴肩推', 'オーバーヘッドプレス', '오버헤드 프레스'),
  x('db_shoulder_press', 'shoulders', 'dumbbell', ['frontDelts', 'sideDelts', 'triceps'], 'Dumbbell Shoulder Press', '哑铃推肩', '啞鈴肩推', 'ダンベルショルダープレス', '덤벨 숄더 프레스'),
  x('arnold_press', 'shoulders', 'dumbbell', ['frontDelts', 'sideDelts'], 'Arnold Press', '阿诺德推举', '阿諾推舉', 'アーノルドプレス', '아놀드 프레스'),
  x('lateral_raise', 'shoulders', 'dumbbell', ['sideDelts'], 'Lateral Raise', '哑铃侧平举', '啞鈴側平舉', 'サイドレイズ', '사이드 레터럴 레이즈'),
  x('cable_lateral_raise', 'shoulders', 'cable', ['sideDelts'], 'Cable Lateral Raise', '绳索侧平举', '繩索側平舉', 'ケーブルサイドレイズ', '케이블 레터럴 레이즈'),
  x('front_raise', 'shoulders', 'dumbbell', ['frontDelts'], 'Front Raise', '哑铃前平举', '啞鈴前平舉', 'フロントレイズ', '프론트 레이즈'),
  x('rear_delt_fly', 'shoulders', 'dumbbell', ['rearDelts'], 'Rear Delt Fly', '俯身反向飞鸟', '俯身反向飛鳥', 'リアレイズ', '리어 델트 플라이'),
  x('machine_shoulder_press', 'shoulders', 'machine', ['frontDelts', 'triceps'], 'Machine Shoulder Press', '器械推肩', '器械肩推', 'マシンショルダープレス', '머신 숄더 프레스'),
  x('shrug', 'shoulders', 'dumbbell', ['traps'], 'Dumbbell Shrug', '哑铃耸肩', '啞鈴聳肩', 'ダンベルシュラッグ', '덤벨 슈러그'),

  // Arms
  x('barbell_curl', 'arms', 'barbell', ['biceps'], 'Barbell Curl', '杠铃弯举', '槓鈴彎舉', 'バーベルカール', '바벨 컬'),
  x('db_curl', 'arms', 'dumbbell', ['biceps'], 'Dumbbell Curl', '哑铃弯举', '啞鈴彎舉', 'ダンベルカール', '덤벨 컬'),
  x('hammer_curl', 'arms', 'dumbbell', ['biceps', 'forearms'], 'Hammer Curl', '锤式弯举', '錘式彎舉', 'ハンマーカール', '해머 컬'),
  x('preacher_curl', 'arms', 'machine', ['biceps'], 'Preacher Curl', '牧师凳弯举', '牧師椅彎舉', 'プリーチャーカール', '프리처 컬'),
  x('cable_curl', 'arms', 'cable', ['biceps'], 'Cable Curl', '绳索弯举', '繩索彎舉', 'ケーブルカール', '케이블 컬'),
  x('triceps_pushdown', 'arms', 'cable', ['triceps'], 'Triceps Pushdown', '绳索下压', '繩索下壓', 'トライセプスプッシュダウン', '트라이셉스 푸시다운'),
  x('skull_crusher', 'arms', 'barbell', ['triceps'], 'Skull Crusher', '仰卧臂屈伸', '仰臥臂屈伸', 'スカルクラッシャー', '스컬 크러셔'),
  x('overhead_triceps_extension', 'arms', 'dumbbell', ['triceps'], 'Overhead Triceps Extension', '哑铃颈后臂屈伸', '啞鈴頸後臂屈伸', 'オーバーヘッドエクステンション', '오버헤드 트라이셉스 익스텐션'),
  x('close_grip_bench', 'arms', 'barbell', ['triceps', 'chest'], 'Close-grip Bench Press', '窄距卧推', '窄握臥推', 'ナローベンチプレス', '클로즈그립 벤치프레스'),

  // Core
  x('crunch', 'core', 'bodyweight', ['abs'], 'Crunch', '卷腹', '捲腹', 'クランチ', '크런치'),
  x('hanging_leg_raise', 'core', 'bodyweight', ['abs'], 'Hanging Leg Raise', '悬垂举腿', '懸垂舉腿', 'ハンギングレッグレイズ', '행잉 레그 레이즈'),
  x('cable_crunch', 'core', 'cable', ['abs'], 'Cable Crunch', '绳索卷腹', '繩索捲腹', 'ケーブルクランチ', '케이블 크런치'),
  x('ab_wheel', 'core', 'bodyweight', ['abs'], 'Ab Wheel Rollout', '健腹轮', '健腹輪', 'アブローラー', '복근 롤아웃'),
  x('russian_twist', 'core', 'bodyweight', ['obliques', 'abs'], 'Russian Twist', '俄罗斯转体', '俄羅斯轉體', 'ロシアンツイスト', '러시안 트위스트'),
  x('decline_sit_up', 'core', 'bodyweight', ['abs'], 'Decline Sit-up', '下斜仰卧起坐', '下斜仰臥起坐', 'デクラインシットアップ', '디클라인 싯업'),

  // Added Oct 2026 (bodyweight / home training)
  x('bodyweight_squat', 'legs', 'bodyweight', ['quads', 'glutes'], 'Bodyweight Squat', '徒手深蹲', '徒手深蹲', '自重スクワット', '맨몸 스쿼트'),
  x('bodyweight_lunge', 'legs', 'bodyweight', ['quads', 'glutes'], 'Bodyweight Lunge', '徒手弓步蹲', '徒手弓步蹲', '自重ランジ', '맨몸 런지'),
  x('glute_bridge', 'legs', 'bodyweight', ['glutes', 'hamstrings'], 'Glute Bridge', '臀桥', '臀橋', 'グルートブリッジ', '글루트 브릿지'),
  x('pike_push_up', 'shoulders', 'bodyweight', ['frontDelts', 'triceps'], 'Pike Push-up', '屈体俯卧撑', '屈體伏地挺身', 'パイクプッシュアップ', '파이크 푸시업'),
  x('inverted_row', 'back', 'bodyweight', ['upperBack', 'lats', 'biceps'], 'Inverted Row', '反向划船', '反向划船', 'インバーテッドロウ', '인버티드 로우'),
  x('db_romanian_deadlift', 'legs', 'dumbbell', ['hamstrings', 'glutes'], 'Dumbbell Romanian Deadlift', '哑铃罗马尼亚硬拉', '啞鈴羅馬尼亞硬舉', 'ダンベルルーマニアンデッドリフト', '덤벨 루마니안 데드리프트'),
];

const BY_ID = new Map(EXERCISES.map((e) => [e.id, e]));

export function getExercise(id: string): Exercise | undefined {
  return BY_ID.get(id);
}

const NAME_KEY: Record<string, keyof Names> = { 'zh-CN': 'zh', 'zh-TW': 'tw', 'ja-JP': 'ja', 'ko-KR': 'ko' };

/** The exercise's name in the app language; unknown ids show the raw id. */
export function exerciseName(id: string, language: string): string {
  const e = BY_ID.get(id);
  if (!e) return id.replace(/_/g, ' ');
  return e.name[NAME_KEY[language] ?? 'en'];
}

/** Matches any of the five names, so a search works in every language. */
export function matchesSearch(e: Exercise, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return Object.values(e.name).some((n) => n.toLowerCase().includes(q));
}

/**
 * Default kg added by "+ weight each time" progression: round plate steps in
 * the user's unit (2.5 kg / 5 lb for barbells, 5 kg / 10 lb on machines).
 */
export function defaultStep(id: string, unit: 'kg' | 'lb' = 'kg'): number {
  const eq = BY_ID.get(id)?.equipment;
  if (unit === 'lb') return Math.round(((eq === 'machine' ? 10 : 5) / 2.20462) * 100) / 100;
  if (eq === 'dumbbell') return 2;
  if (eq === 'machine') return 5;
  return 2.5;
}

export function isBodyweight(id: string): boolean {
  return BY_ID.get(id)?.equipment === 'bodyweight';
}
