import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';

// POST /api/push-token — 保存或更新设备推送令牌
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  try {
    const { token } = await request.json();

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Invalid push token' }, { status: 400 });
    }

    // Expo push token 格式校验
    if (!token.startsWith('ExponentPushToken[') && !token.startsWith('ExpoPushToken[')) {
      return NextResponse.json({ error: 'Invalid push token format' }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { pushToken: token },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to save push token' }, { status: 500 });
  }
}
