import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // 获取用户 ID
    const userId = request.headers.get('x-user-id') || 'default-user-id';

    // 获取过去7天的开始时间
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // 查询过去7天的餐食
    const { data: meals, error } = await supabaseAdmin
      .from('meals')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: '获取周数据失败' },
        { status: 500 }
      );
    }

    // 按日期分组并计算每日数据
    const dailyData: Record<string, { calories: number; protein: number; carbs: number; fat: number }> = {};

    meals?.forEach((meal) => {
      const date = new Date(meal.created_at).toISOString().split('T')[0];
      if (!dailyData[date]) {
        dailyData[date] = { calories: 0, protein: 0, carbs: 0, fat: 0 };
      }
      dailyData[date].calories += meal.calories || 0;
      dailyData[date].protein += meal.protein || 0;
      dailyData[date].carbs += meal.carbs || 0;
      dailyData[date].fat += meal.fat || 0;
    });

    // 转换为数组格式
    const weeklyData = {
      calories: Object.values(dailyData).map((d) => d.calories),
      protein: Object.values(dailyData).map((d) => d.protein),
      carbs: Object.values(dailyData).map((d) => d.carbs),
      fat: Object.values(dailyData).map((d) => d.fat),
    };

    return NextResponse.json(weeklyData);
  } catch (error: any) {
    console.error('Weekly API error:', error);
    return NextResponse.json(
      { error: error.message || '获取周数据失败' },
      { status: 500 }
    );
  }
}


