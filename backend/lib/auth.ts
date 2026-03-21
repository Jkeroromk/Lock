import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET || '';

interface JWTPayload {
  sub: string; // user id
  email?: string;
  role?: string;
  aud?: string;
  exp?: number;
  iat?: number;
  is_anonymous?: boolean;
}

/**
 * 解析并验证 Supabase JWT token
 * Supabase JWT 使用 HS256 算法，密钥是项目的 JWT Secret
 */
async function verifySupabaseToken(token: string): Promise<JWTPayload | null> {
  try {
    // 解码 JWT（Base64URL 解码）
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payloadBase64 = parts[1]
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    const payloadStr = Buffer.from(payloadBase64, 'base64').toString('utf-8');
    const payload: JWTPayload = JSON.parse(payloadStr);

    // 检查 token 是否过期
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      return null;
    }

    // 如果配置了 JWT_SECRET，使用 HMAC-SHA256 验证签名
    if (SUPABASE_JWT_SECRET) {
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(SUPABASE_JWT_SECRET),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['verify']
      );

      const signatureBase64 = parts[2]
        .replace(/-/g, '+')
        .replace(/_/g, '/');
      // 补齐 padding
      const padded = signatureBase64 + '='.repeat((4 - signatureBase64.length % 4) % 4);
      const signature = Uint8Array.from(Buffer.from(padded, 'base64'));
      const data = encoder.encode(`${parts[0]}.${parts[1]}`);

      const valid = await crypto.subtle.verify('HMAC', key, signature, data);
      if (!valid) return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * 从请求中提取并验证用户身份
 * 返回用户 ID 或 401 响应
 */
export async function authenticateRequest(
  request: NextRequest
): Promise<{ userId: string; payload: JWTPayload } | NextResponse> {
  const authHeader = request.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: '未提供认证令牌' },
      { status: 401 }
    );
  }

  const token = authHeader.substring(7);
  const payload = await verifySupabaseToken(token);

  if (!payload || !payload.sub) {
    return NextResponse.json(
      { error: '认证令牌无效或已过期' },
      { status: 401 }
    );
  }

  return { userId: payload.sub, payload };
}
