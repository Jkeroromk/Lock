import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export async function authenticateRequest(): Promise<{ userId: string } | NextResponse> {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: '未提供认证令牌' }, { status: 401 });
  }
  return { userId };
}
