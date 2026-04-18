import { NextRequest, NextResponse } from 'next/server';

/**
 * IP 级请求频率限制（内存存储，单实例有效）
 *
 * 规则：
 * - 所有 /api/ai/* 和 /api/vision 接口：每 IP 每分钟最多 20 次请求
 * - 其他 /api/* 接口：每 IP 每分钟最多 120 次请求
 *
 * 注意：此实现适用于单实例部署。如需多实例/边缘部署，
 * 请替换为 Upstash Redis + @upstash/ratelimit。
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const ipStore = new Map<string, RateLimitEntry>();

// 每 5 分钟清理过期条目，防止内存泄漏
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of ipStore.entries()) {
    if (now > entry.resetAt) ipStore.delete(key);
  }
}, CLEANUP_INTERVAL_MS);

function getRateLimitConfig(pathname: string): { limit: number; windowMs: number } {
  const isAiRoute =
    pathname.startsWith('/api/ai/') || pathname === '/api/vision';
  return isAiRoute
    // AI 接口：每 IP 每分钟 60 次（兼顾共享 WiFi/CGNAT 场景）
    // 真正的每用户限制由 DB 配额层保障（FREE: 3次/天）
    ? { limit: 60, windowMs: 60_000 }
    // 普通接口：每 IP 每分钟 300 次（约 5次/秒，足以支撑多用户共享 IP）
    : { limit: 300, windowMs: 60_000 };
}

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 仅对 API 路由启用限流
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  const ip = getClientIp(request);
  const { limit, windowMs } = getRateLimitConfig(pathname);
  const key = `${ip}:${pathname.split('/').slice(0, 4).join('/')}`;
  const now = Date.now();

  let entry = ipStore.get(key);
  if (!entry || now > entry.resetAt) {
    entry = { count: 1, resetAt: now + windowMs };
    ipStore.set(key, entry);
  } else {
    entry.count += 1;
  }

  const remaining = Math.max(0, limit - entry.count);
  const retryAfter = Math.ceil((entry.resetAt - now) / 1000);

  const response =
    entry.count > limit
      ? NextResponse.json(
          { error: 'TOO_MANY_REQUESTS', message: '请求过于频繁，请稍后再试' },
          {
            status: 429,
            headers: {
              'Retry-After': String(retryAfter),
              'X-RateLimit-Limit': String(limit),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': String(Math.ceil(entry.resetAt / 1000)),
            },
          }
        )
      : NextResponse.next();

  // 在正常响应中也附加限流头，方便客户端感知
  if (entry.count <= limit) {
    response.headers.set('X-RateLimit-Limit', String(limit));
    response.headers.set('X-RateLimit-Remaining', String(remaining));
    response.headers.set('X-RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)));
  }

  return response;
}

export const config = {
  matcher: '/api/:path*',
};
