import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type { Best } from '@/lib/workouts';

/** Heaviest set ever per exercise (most reps at that weight breaks ties). */
export async function bestSets(userId: string, ids: string[], excludeSessionId?: string): Promise<Record<string, Best>> {
  if (ids.length === 0) return {};
  const rows = await prisma.$queryRaw<{ exercise_id: string; weight: Prisma.Decimal; reps: number }[]>(Prisma.sql`
    SELECT DISTINCT ON (exercise_id) exercise_id, weight, reps
    FROM workout_sets
    WHERE user_id = ${userId} AND exercise_id = ANY(${ids})
      ${excludeSessionId ? Prisma.sql`AND session_id <> ${excludeSessionId}::uuid` : Prisma.empty}
    ORDER BY exercise_id, weight DESC, reps DESC`);
  const out: Record<string, Best> = {};
  for (const r of rows) out[r.exercise_id] = { weight: Number(r.weight), reps: Number(r.reps) };
  return out;
}

/** The sets done for each exercise the last time it was trained. */
export async function lastSets(userId: string, ids: string[]): Promise<Record<string, Best[]>> {
  if (ids.length === 0) return {};
  const rows = await prisma.$queryRaw<{ exercise_id: string; weight: Prisma.Decimal; reps: number }[]>(Prisma.sql`
    WITH latest AS (
      SELECT DISTINCT ON (exercise_id) exercise_id, session_id
      FROM workout_sets
      WHERE user_id = ${userId} AND exercise_id = ANY(${ids})
      ORDER BY exercise_id, created_at DESC
    )
    SELECT ws.exercise_id, ws.weight, ws.reps
    FROM workout_sets ws
    JOIN latest l ON ws.session_id = l.session_id AND ws.exercise_id = l.exercise_id
    ORDER BY ws.position`);
  const out: Record<string, Best[]> = {};
  for (const r of rows) (out[r.exercise_id] ??= []).push({ weight: Number(r.weight), reps: Number(r.reps) });
  return out;
}
