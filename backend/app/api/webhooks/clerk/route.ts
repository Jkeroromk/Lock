import { NextRequest, NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

type ClerkUserData = {
  id: string;
  email_addresses?: Array<{ email_address: string; id: string }>;
  primary_email_address_id?: string;
  first_name?: string | null;
  last_name?: string | null;
  username?: string | null;
  deleted?: boolean;
};

type ClerkWebhookEvent =
  | { type: 'user.created'; data: ClerkUserData }
  | { type: 'user.updated'; data: ClerkUserData }
  | { type: 'user.deleted'; data: { id: string; deleted: boolean } }
  | { type: string; data: unknown };

export async function POST(request: NextRequest) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  const svixId = request.headers.get('svix-id');
  const svixTimestamp = request.headers.get('svix-timestamp');
  const svixSignature = request.headers.get('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: 'Missing svix headers' }, { status: 400 });
  }

  const body = await request.text();

  let event: ClerkWebhookEvent;
  try {
    const wh = new Webhook(secret);
    event = wh.verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as ClerkWebhookEvent;
  } catch {
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
  }

  try {
    if (event.type === 'user.created') {
      const { id, email_addresses, primary_email_address_id, first_name, last_name, username } = event.data as ClerkUserData;
      const primaryEmail = email_addresses?.find((e) => e.id === primary_email_address_id)?.email_address;
      const name = [first_name, last_name].filter(Boolean).join(' ') || null;

      await prisma.user.upsert({
        where: { id },
        create: {
          id,
          email: primaryEmail ?? null,
          name,
          username: username ?? null,
        },
        update: {},
      });
    }

    if (event.type === 'user.deleted') {
      const { id } = event.data as { id: string; deleted: boolean };
      if (id) {
        await prisma.user.deleteMany({ where: { id } });
      }
    }
  } catch (error) {
    console.error('[Clerk Webhook]', event.type, error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
