import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';
import { requestTimeZone } from '@/lib/ai-rate-limit';
import { DAY_KEY, normalizePlan, normalizeSets, beats, roundKg, type Best, type PlanDays } from '@/lib/workouts';
import { bestSets } from '@/lib/workout-history';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function localDayKey(d: Date, timeZone: string | null): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: timeZone || 'UTC', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

// POST /api/workouts/sessions — save a finished workout.
// Body: { id (client uuid, makes retries safe), startedAt, finishedAt, dayKey,
//         planDay?, title?, sets: [{ exerciseId, weight, reps }] }
// Returns the records it set and the plan weights it raised.
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });

  const sets = normalizeSets(body.sets);
  if (sets.length === 0) return NextResponse.json({ error: 'No completed sets' }, { status: 400 });

  const id = typeof body.id === 'string' && UUID.test(body.id) ? body.id.toLowerCase() : undefined;
  const now = new Date();
  const finishedAt = new Date(body.finishedAt ?? now);
  const startedAt = new Date(body.startedAt ?? finishedAt);
  const end = isNaN(finishedAt.getTime()) || finishedAt > now ? now : finishedAt;
  const start = isNaN(startedAt.getTime()) || startedAt > end ? end : startedAt;
  const durationSec = Math.min(Math.round((end.getTime() - start.getTime()) / 1000), 6 * 3600);
  const dayKey = typeof body.dayKey === 'string' && DAY_KEY.test(body.dayKey) ? body.dayKey : localDayKey(end, requestTimeZone(request));
  const planDay = Number.isInteger(body.planDay) && body.planDay >= 0 && body.planDay <= 6 ? (body.planDay as number) : null;
  const title = typeof body.title === 'string' ? body.title.trim().slice(0, 40) || null : null;

  try {
    if (id) {
      // A retry of a save that already went through.
      const existing = await prisma.workoutSession.findFirst({
        where: { id, userId },
        include: { sets: { where: { isPr: true }, select: { exerciseId: true, weight: true, reps: true } } },
      });
      if (existing) {
        return NextResponse.json({
          session: { id: existing.id, dayKey: existing.dayKey, durationSec: existing.durationSec, volume: Number(existing.volume), setCount: existing.setCount, prCount: existing.prCount },
          prs: existing.sets.map((s) => ({ exerciseId: s.exerciseId, weight: Number(s.weight), reps: s.reps, previous: null })),
          bumps: [],
        });
      }
    }

    // Records: compare each exercise's best set today with its best before.
    const ids = [...new Set(sets.map((s) => s.exerciseId))];
    const before = await bestSets(userId, ids);
    const todayBest: Record<string, { set: Best; index: number }> = {};
    sets.forEach((s, index) => {
      const cur = todayBest[s.exerciseId];
      if (!cur || beats(s, cur.set)) {
        todayBest[s.exerciseId] = { set: { weight: s.weight, reps: s.reps }, index };
      }
    });
    const prIndexes = new Set<number>();
    const prs: { exerciseId: string; weight: number; reps: number; previous: Best | null }[] = [];
    for (const exerciseId of ids) {
      const t = todayBest[exerciseId];
      if (t && beats(t.set, before[exerciseId])) {
        prIndexes.add(t.index);
        prs.push({ exerciseId, ...t.set, previous: before[exerciseId] ?? null });
      }
    }

    const volume = sets.reduce((sum, s) => sum + s.weight * s.reps, 0);
    const session = await prisma.workoutSession.create({
      data: {
        ...(id ? { id } : {}),
        userId, dayKey, planDay, title,
        startedAt: start, finishedAt: end, durationSec,
        volume: Math.min(volume, 99_999_999),
        setCount: sets.length,
        prCount: prs.length,
        sets: {
          create: sets.map((s, position) => ({
            userId, exerciseId: s.exerciseId, position, weight: s.weight, reps: s.reps, isPr: prIndexes.has(position),
          })),
        },
      },
      select: { id: true, dayKey: true, durationSec: true, volume: true, setCount: true, prCount: true },
    });

    // Progression: raise the plan weight when every planned set was done at
    // (at least) the planned weight and reps.
    const bumps: { exerciseId: string; from: number; to: number }[] = [];
    if (planDay !== null) {
      const plan = await prisma.workoutPlan.findUnique({ where: { userId } });
      const days: PlanDays = normalizePlan(plan?.days) ?? {};
      const day = days[String(planDay)];
      if (day) {
        for (const ex of day.exercises) {
          if (ex.progress !== 'weight' || ex.weight <= 0) continue;
          const hit = sets.filter((s) => s.exerciseId === ex.id && s.weight >= ex.weight && s.reps >= ex.reps).length;
          if (hit >= ex.sets) {
            const to = roundKg(ex.weight + ex.step);
            bumps.push({ exerciseId: ex.id, from: ex.weight, to });
            ex.weight = to;
          }
        }
        if (bumps.length) await prisma.workoutPlan.update({ where: { userId }, data: { days: days as any } });
      }
    }

    return NextResponse.json({ session: { ...session, volume: Number(session.volume) }, prs, bumps }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/workouts/sessions]', error);
    return NextResponse.json({ error: 'Failed to save workout' }, { status: 500 });
  }
}

// DELETE /api/workouts/sessions?id=xxx — remove a workout logged by mistake.
export async function DELETE(request: NextRequest) {
  const auth = await authenticateRequest();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const id = request.nextUrl.searchParams.get('id');
  if (!id || !UUID.test(id)) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  try {
    await prisma.workoutSession.deleteMany({ where: { id, userId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/workouts/sessions]', error);
    return NextResponse.json({ error: 'Failed to delete workout' }, { status: 500 });
  }
}
