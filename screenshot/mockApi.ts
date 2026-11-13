/**
 * Screenshot builds only: answers the app's API calls from screenshot/fixtures.ts
 * instead of the network (an axios adapter on services/client.ts).
 */
import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import * as F from './fixtures';

type Handler = (q: URLSearchParams, body: any) => unknown;

const GET: Record<string, Handler> = {
  '/api/auth/profile': () => F.profile(),
  '/api/today': () => F.today_(),
  '/api/weekly': () => F.weekly(),
  '/api/monthly': () => Object.fromEntries(F.weekly().map((d) => [d.date, d])),
  '/api/meals/recent': () => F.recentFoods(),
  '/api/meals/export': () => [],
  '/api/food-search': () => ({ results: [] }),
  '/api/workouts': () => F.workouts(),
  '/api/workouts/history': (q) => F.exerciseHistory((q.get('ids') ?? '').split(',').filter(Boolean)),
  '/api/weight': () => F.weightRecords(),
  '/api/pet': () => F.pet(),
  '/api/social/leaderboard': () => F.leaderboard(),
  '/api/social/friends': () => F.leaderboard().filter((r) => !r.isMe),
  '/api/social/friends/requests': () => [],
  '/api/social/friends/sent': () => [],
  '/api/social/feed': () => [],
  '/api/social/challenges': () => [],
  '/api/social/blocks': () => [],
  '/api/social/invite-code': () => ({ inviteCode: F.profile().inviteCode }),
  '/api/couple': () => F.couple(),
  '/api/ai/diet-analysis': () => F.dietAnalysis(),
  '/api/user/recap': () => ({ meals: 21, photoMeals: 14, daysLogged: 7, workouts: 4, trialEndsAt: new Date().toISOString() }),
};

const WRITE: Record<string, Handler> = {
  '/api/vision': () => F.visionResult(),
  '/api/ai/describe-meal': () => F.visionResult(),
  '/api/pet/sync': () => F.pet(),
  '/api/pet/setup': () => F.pet(),
  '/api/pet/names': () => F.pet(),
  '/api/pet/pat': () => ({ ok: true, xp: 2, buddyName: F.pet().profile.buddyName }),
  '/api/auth/profile': () => F.profile(),
  '/api/subscription': () => ({ plan: 'PRO' }),
  '/api/workouts/plan': () => ({ plan: F.workouts().plan }),
  '/api/couple/home': () => ({ home: F.couple().couple.home }),
};

/** Small wait so loading states settle the way they do on a phone. */
const latency = (path: string) => (path === '/api/vision' ? 900 : 120);

export const mockAdapter: AxiosAdapter = async (config: InternalAxiosRequestConfig) => {
  const url = new URL(config.url ?? '/', 'https://screenshot.local');
  const params = new URLSearchParams(url.search);
  Object.entries(config.params ?? {}).forEach(([k, v]) => params.set(k, String(v)));
  const method = (config.method ?? 'get').toLowerCase();
  const path = url.pathname.replace(/\/$/, '');
  let body: any = config.data;
  try { body = typeof body === 'string' ? JSON.parse(body) : body; } catch {}

  const handler = method === 'get' ? GET[path] : WRITE[path];
  let data: unknown = handler ? handler(params, body) : method === 'get' ? null : { ok: true };
  if (!handler && method === 'get') {
    // Unknown read: an empty list is the safest shape for most screens.
    console.warn(`[screenshot] no fixture for GET ${path}`);
    data = [];
  }
  await new Promise((r) => setTimeout(r, latency(path)));
  const res: AxiosResponse = { data, status: 200, statusText: 'OK', headers: {}, config, request: null };
  return res;
};
