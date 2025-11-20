import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { steps, active_energy, heart_rate } = body;

    // 获取用户 ID
    const userId = request.headers.get('x-user-id') || 'default-user-id';

    // 获取今天的日期（只保存日期部分，不包含时间）
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 使用 upsert 来更新或插入健康数据
    const { data, error } = await supabaseAdmin
      .from('health_sync')
      .upsert(
        {
          user_id: userId,
          date: today.toISOString().split('T')[0],
          steps: Number(steps) || 0,
          active_energy: Number(active_energy) || 0,
          heart_rate: Number(heart_rate) || 0,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,date',
        }
      )
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: '同步健康数据失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Sync health error:', error);
    return NextResponse.json(
      { error: error.message || '同步健康数据失败' },
      { status: 500 }
    );
  }
}


