import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@clerk/backend';

export async function authenticateRequest(
  request: NextRequest
): Promise<{ userId: string } | NextResponse> {
  const authHeader = request.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: '未提供认证令牌' }, { status: 401 });
  }

  const token = authHeader.substring(7);

  try {
    const payload = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY! });
    return { userId: payload.sub };
  } catch {
    return NextResponse.json({ error: '认证令牌无效或已过期' }, { status: 401 });
  }
}
