import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { refreshUserPlan } from '@/lib/revenuecat';

export const dynamic = 'force-dynamic';

// POST /api/webhooks/revenuecat
//
// Configure in RevenueCat → Project → Integrations → Webhooks:
//   URL:                  https://api.jkeroro.com/api/webhooks/revenuecat
//   Authorization header: the value of REVENUECAT_WEBHOOK_AUTH
//
// We don't trust the event payload for the plan itself. Each event just tells
// us which users changed; we then re-read their entitlements from the
// RevenueCat REST API (RevenueCat's recommended pattern). This keeps
// renewals, cancellations, expirations, refunds and transfers all correct.

interface RcWebhookEvent {
  type?: string;
  app_user_id?: string;
  original_app_user_id?: string;
  aliases?: string[];
  transferred_from?: string[];
  transferred_to?: string[];
}

function authorized(request: NextRequest): boolean {
  const expected = process.env.REVENUECAT_WEBHOOK_AUTH?.trim();
  const got = request.headers.get('authorization')?.trim();
  if (!expected || !got) return false;
  const a = Buffer.from(got);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  if (!process.env.REVENUECAT_WEBHOOK_AUTH) {
    return NextResponse.json({ error: 'Webhook auth not configured' }, { status: 500 });
  }
  if (!authorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let event: RcWebhookEvent;
  try {
    const body = await request.json();
    event = body?.event ?? {};
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Collect every user id this event touches. Our app user ids are Clerk ids
  // (set via Purchases.logIn); anonymous RevenueCat ids are skipped.
  const ids = new Set<string>(
    [
      event.app_user_id,
      event.original_app_user_id,
      ...(event.aliases ?? []),
      ...(event.transferred_from ?? []),
      ...(event.transferred_to ?? []),
    ].filter((id): id is string => !!id && !id.startsWith('$RCAnonymousID'))
  );

  try {
    await Promise.all(Array.from(ids).map((id) => refreshUserPlan(id)));
  } catch (error) {
    // Non-2xx makes RevenueCat retry the delivery later.
    console.error('[RevenueCat Webhook]', event.type, error);
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
