/**
 * Expo Push Notification 发送工具
 * 使用 Expo 的免费推送服务，无需 APNs / FCM 直接配置。
 * 文档：https://docs.expo.dev/push-notifications/sending-notifications/
 */

import { prisma } from '@/lib/prisma';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

/**
 * 向指定用户发送推送通知（静默失败，不影响主流程）
 */
export async function sendPushToUser(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { pushToken: true },
    });

    if (!user?.pushToken) return;

    await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        to: user.pushToken,
        title,
        body,
        data: data ?? {},
        sound: 'default',
        priority: 'high',
      }),
      signal: AbortSignal.timeout(5_000),
    });

  } catch {
    // push failures are non-critical
  }
}

/**
 * 批量发送推送（同一消息发给多个用户）
 */
export async function sendPushToUsers(
  userIds: string[],
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> {
  await Promise.all(userIds.map((uid) => sendPushToUser(uid, title, body, data)));
}
