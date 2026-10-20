import { getExercise, type MuscleGroup } from '@/constants/exercises';
import type { PlanDay, DayKind } from '@/services/workouts';

/**
 * Day names older AI/template plans stored as plain text, per language, so a
 * plan made in Chinese still reads in English after switching languages.
 */
const LEGACY_NAMES: Record<string, DayKind> = {};
const NAME_TABLE: Record<DayKind, string[]> = {
  fullA: ['全身 A', '전신 A', 'Full body A'],
  fullB: ['全身 B', '전신 B', 'Full body B'],
  upper: ['上肢', '上半身', '상체', 'Upper'],
  lower: ['下肢', '下半身', '하체', 'Lower'],
  push: ['推（胸肩三头）', '推（胸肩三頭）', 'プッシュ', '푸시', 'Push'],
  pull: ['拉（背二头）', '拉（背二頭）', 'プル', '풀', 'Pull'],
  legs: ['腿 + 核心', '脚 + 体幹', '하체 + 코어', 'Legs + core'],
};
for (const [kind, names] of Object.entries(NAME_TABLE)) for (const n of names) LEGACY_NAMES[n] = kind as DayKind;

/** The day's language-neutral type, from `kind` or from a recognised stored name. */
export function dayKind(day: PlanDay): DayKind | undefined {
  return day.kind ?? LEGACY_NAMES[day.name?.trim() ?? ''];
}

/**
 * A plan day's display name: what the user called it, or else the muscle
 * groups it trains ("腿 + 背"). `short` gives one word for the week strip.
 */
export function dayTitle(day: PlanDay, weekday: number, t: (key: string, p?: Record<string, any>) => string, short = false): string {
  const kind = dayKind(day);
  if (kind) {
    const localized = t(`train.kind.${kind}`);
    return short ? shortName(localized) : localized;
  }
  const name = day.name?.trim();
  if (name) return short ? shortName(name) : name;
  const groups: MuscleGroup[] = [];
  for (const e of day.exercises) {
    const g = getExercise(e.id)?.group;
    if (g && !groups.includes(g)) groups.push(g);
  }
  if (!groups.length) return t(`train.wdl.d${weekday}`);
  return groups.slice(0, short ? 1 : 2).map((g) => t(`train.group.${g}`)).join(' + ');
}

/**
 * One word that fits a week-strip cell: the part before any bracket or
 * separator, at most 2 CJK characters ("推（胸肩三头）" → "推", "上肢综合" → "上肢")
 * or 5 Latin letters.
 */
export function shortName(name: string): string {
  const first = name.split(/[\s+·/,，、（(：:\-]+/).find(Boolean) ?? name;
  return /[\u3000-\u9fff\uac00-\ud7af]/.test(first) ? first.slice(0, 2) : first.slice(0, 5);
}
