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
      return NextResponse.json({ error: '无效的推送令牌' }, { status: 400 });
    }

    // Expo push token 格式校验
    if (!token.startsWith('ExponentPushToken[') && !token.startsWith('ExpoPushToken[')) {
      return NextResponse.json({ error: '无效的推送令牌格式' }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { pushToken: token },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Save push token error:', error);
    return NextResponse.json({ error: '保存推送令牌失败' }, { status: 500 });
  }
}
